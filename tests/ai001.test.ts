import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAIClient,
  AIProviderError,
  sanitizePII,
  globalAIRateLimiter
} from '../backend/src/utils/ai';

describe('AI-001 — Gemini API İstemcisi ve Temel Entegrasyon Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalAIRateLimiter.reset();
  });

  describe('1. Configuration & Factory Abstraction', () => {
    it('should initialize client with default configuration (gemini-1.5-flash)', () => {
      const client = createAIClient({ apiKey: 'test-api-key' });
      expect(client).toBeDefined();
      expect(typeof client.generateText).toBe('function');
    });

    it('should read AI_MODEL, AI_TIMEOUT_MS, and AI_MAX_RETRIES from config or env', () => {
      process.env.GEMINI_API_KEY = 'env-api-key';
      process.env.AI_MODEL = 'gemini-1.5-pro';
      process.env.AI_TIMEOUT_MS = '5000';
      process.env.AI_MAX_RETRIES = '4';

      const client = createAIClient();
      expect(client).toBeDefined();

      // Reset env
      delete process.env.GEMINI_API_KEY;
      delete process.env.AI_MODEL;
      delete process.env.AI_TIMEOUT_MS;
      delete process.env.AI_MAX_RETRIES;
    });

    it('should throw INVALID_API_KEY error if API key is missing', async () => {
      const client = createAIClient({ apiKey: '' });
      await expect(client.generateText({ prompt: 'Hello' })).rejects.toThrowError(
        AIProviderError
      );

      try {
        await client.generateText({ prompt: 'Hello' });
      } catch (err: any) {
        expect(err.code).toBe('INVALID_API_KEY');
        expect(err.status).toBe(401);
        expect(err.isRetryable).toBe(false);
      }
    });
  });

  describe('2. Timeout & AbortSignal Handling', () => {
    it('should throw FETCH_TIMEOUT error when request exceeds timeoutMs', async () => {
      const mockFetch = vi.fn().mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          })
      );

      const client = createAIClient({
        apiKey: 'dummy-key',
        timeoutMs: 50,
        fetchFn: mockFetch as any
      });

      await expect(client.generateText({ prompt: 'Slow prompt' })).rejects.toThrowError(
        AIProviderError
      );

      try {
        await client.generateText({ prompt: 'Slow prompt' });
      } catch (err: any) {
        expect(err.code).toBe('FETCH_TIMEOUT');
        expect(err.status).toBe(504);
        expect(err.isRetryable).toBe(false);
      }
    });

    it('should abort request immediately if external AbortSignal is triggered', async () => {
      const mockFetch = vi.fn().mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const err = new Error('Parent aborted');
              err.name = 'AbortError';
              reject(err);
            });
          })
      );

      const parentController = new AbortController();
      const client = createAIClient({
        apiKey: 'dummy-key',
        fetchFn: mockFetch as any
      });

      const promise = client.generateText({
        prompt: 'Abort test',
        signal: parentController.signal
      });

      // Abort externally
      parentController.abort();

      try {
        await promise;
        expect.unreachable('Should have thrown FETCH_TIMEOUT');
      } catch (err: any) {
        expect(err.code).toBe('FETCH_TIMEOUT');
        expect(err.status).toBe(504);
      }
    });
  });

  describe('3. Authentication (401 / 403)', () => {
    it('should normalize 401 response to INVALID_API_KEY without retry', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        return new Response(JSON.stringify({ error: { message: 'API key not valid' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const client = createAIClient({
        apiKey: 'invalid-key',
        maxRetries: 3,
        fetchFn: mockFetch as any
      });

      try {
        await client.generateText({ prompt: 'Test auth' });
      } catch (err: any) {
        expect(err.code).toBe('INVALID_API_KEY');
        expect(err.status).toBe(401);
        expect(err.isRetryable).toBe(false);
      }

      // Fast-fail: Should not retry 401 error
      expect(callCount).toBe(1);
    });
  });

  describe('4. Rate Limit & Zero-Cost Quota Guard', () => {
    it('should enforce 2 AI calls/second limit and throw QUOTA_EXHAUSTED (503)', async () => {
      const createResponse = () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Response OK' }] } }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const mockFetch = vi.fn().mockImplementation(async () => createResponse());

      const client = createAIClient({
        apiKey: 'valid-key',
        fetchFn: mockFetch as any
      });

      // Call 1 & Call 2 succeed
      const res1 = await client.generateText({ prompt: 'Call 1' });
      const res2 = await client.generateText({ prompt: 'Call 2' });
      expect(res1.text).toBe('Response OK');
      expect(res2.text).toBe('Response OK');

      // Call 3 in same second exceeds rate limit and throws 503
      try {
        await client.generateText({ prompt: 'Call 3' });
        expect.unreachable('Should have thrown QUOTA_EXHAUSTED error');
      } catch (err: any) {
        expect(err.code).toBe('QUOTA_EXHAUSTED');
        expect(err.status).toBe(503);
        expect(err.message).toContain('AI Quota Reached');
      }

      // Verify no external paid fallback is attempted
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('5. Retry Logic with Exponential Backoff & Jitter', () => {
    it('should retry on 429 rate limit up to maxRetries and fail with RATE_LIMITED', async () => {
      let attempts = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempts++;
        return new Response(JSON.stringify({ error: { message: 'Rate limit' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const client = createAIClient({
        apiKey: 'valid-key',
        maxRetries: 2,
        fetchFn: mockFetch as any
      });

      try {
        await client.generateText({ prompt: 'Retry test' });
      } catch (err: any) {
        expect(err.code).toBe('RATE_LIMITED');
        expect(err.status).toBe(429);
      }

      // Initial attempt (0) + 2 retries = 3 calls total
      expect(attempts).toBe(3);
    });
  });

  describe('6. Safety Violation Handling', () => {
    it('should normalize SAFETY block to SAFETY_BLOCKED without retrying', async () => {
      let attempts = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempts++;
        return new Response(
          JSON.stringify({
            candidates: [{ finishReason: 'SAFETY' }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const client = createAIClient({
        apiKey: 'valid-key',
        maxRetries: 3,
        fetchFn: mockFetch as any
      });

      try {
        await client.generateText({ prompt: 'Unsafe content prompt' });
      } catch (err: any) {
        expect(err.code).toBe('SAFETY_BLOCKED');
        expect(err.status).toBe(400);
        expect(err.isRetryable).toBe(false);
      }

      expect(attempts).toBe(1);
    });
  });

  describe('7. PII Sanitization', () => {
    it('should sanitize email, phone, password, and secrets before sending to provider', async () => {
      let capturedBody: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = JSON.parse(options.body);
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Sanitized reply' }] } }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const client = createAIClient({
        apiKey: 'valid-key',
        fetchFn: mockFetch as any
      });

      const rawPrompt =
        'User info: email user@example.com, phone +90 (555) 123-4567, password: mySecretPassword123, token Bearer secret-token-xyz';

      await client.generateText({ prompt: rawPrompt });

      const sentText = capturedBody.contents[0].parts[0].text;
      expect(sentText).not.toContain('user@example.com');
      expect(sentText).not.toContain('123-4567');
      expect(sentText).not.toContain('mySecretPassword123');
      expect(sentText).not.toContain('secret-token-xyz');

      expect(sentText).toContain('[EMAIL_REDACTED]');
      expect(sentText).toContain('[PHONE_REDACTED]');
      expect(sentText).toContain('[PASSWORD_REDACTED]');
      expect(sentText).toContain('[SECRET_REDACTED]');
    });

    it('sanitizePII standalone utility function test', () => {
      const result = sanitizePII('Email test@domain.org and phone 555-0199 and password=secret');
      expect(result).toBe('Email [EMAIL_REDACTED] and phone [PHONE_REDACTED] and password=[PASSWORD_REDACTED]');
    });
  });

  describe('8. Security & Secret Isolation', () => {
    it('should not leak API key in error messages', () => {
      const secretKey = 'AIzaSySecretApiKey1234567890abcdefgh';
      const err = new AIProviderError(`Error with key ${secretKey}`, 'INVALID_API_KEY', 401, false);

      expect(err.message).not.toContain(secretKey);
      expect(err.message).toContain('[SECRET_REDACTED]');
    });
  });
});
