import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCorsHeaders } from '../src/middleware/cors.js';
import { resetRateLimitStoresForTest, checkRateLimit } from '../src/middleware/rateLimit.js';
import { verifyTurnstileToken } from '../src/utils/turnstile.js';
import { handleRequest } from '../src/routes/index.js';

describe('SEC-REQ-001 — CORS, Rate Limiting & Turnstile Tests', () => {
  beforeEach(() => {
    resetRateLimitStoresForTest();
    vi.restoreAllMocks();
  });

  describe('1. CORS Allowlist & Preflight Tests', () => {
    it('should return CORS headers matching request origin when origin is allowed', () => {
      const req = new Request('http://localhost/api/health', {
        headers: { Origin: 'http://localhost:5173' }
      });
      const env = { ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173,https://mskaymaz.com' } as any;

      const headers = getCorsHeaders(req, env);
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Vary']).toBe('Origin');
    });

    it('should omit Access-Control-Allow-Origin header when origin is disallowed', () => {
      const req = new Request('http://localhost/api/health', {
        headers: { Origin: 'https://malicious-attacker.com' }
      });
      const env = { ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173' } as any;

      const headers = getCorsHeaders(req, env);
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should handle OPTIONS preflight request with 204 status for allowed origin', async () => {
      const req = new Request('http://localhost/api/v1/health', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' }
      });
      const env = { ALLOWED_ORIGINS: 'http://localhost:5173' } as any;

      const response = await handleRequest(req, env);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    });

    it('should reject OPTIONS preflight with 403 FORBIDDEN for disallowed origin', async () => {
      const req = new Request('http://localhost/api/v1/health', {
        method: 'OPTIONS',
        headers: { Origin: 'https://disallowed-site.org' }
      });
      const env = { ALLOWED_ORIGINS: 'http://localhost:5173' } as any;

      const response = await handleRequest(req, env);
      expect(response.status).toBe(403);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should reject wildcard ALLOWED_ORIGINS when combined with credentials', () => {
      const req = new Request('http://localhost/api/health', {
        headers: { Origin: 'http://localhost:5173' }
      });
      const env = { ALLOWED_ORIGINS: '*' } as any;

      const headers = getCorsHeaders(req, env);
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('2. Rate Limiting Tests (IP + Route Isolation & Retry-After)', () => {
    it('should allow requests under the rate limit threshold', () => {
      const res = checkRateLimit('192.168.1.1', 'route:/api/v1/support', 5, 60000);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
    });

    it('should reject requests exceeding the rate limit threshold with Retry-After', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('192.168.1.1', 'route:/api/v1/support', 5, 60000);
      }

      const blockedRes = checkRateLimit('192.168.1.1', 'route:/api/v1/support', 5, 60000);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.retryAfter).toBeGreaterThan(0);
    });

    it('should isolate rate limit buckets by IP and Route independently', () => {
      // Exhaust IP A on route X
      for (let i = 0; i < 3; i++) {
        checkRateLimit('10.0.0.1', 'route:/api/v1/support', 3, 60000);
      }
      expect(checkRateLimit('10.0.0.1', 'route:/api/v1/support', 3, 60000).allowed).toBe(false);

      // IP A on route Y should still be allowed
      expect(checkRateLimit('10.0.0.1', 'route:/api/v1/health', 3, 60000).allowed).toBe(true);

      // IP B on route X should still be allowed
      expect(checkRateLimit('10.0.0.2', 'route:/api/v1/support', 3, 60000).allowed).toBe(true);
    });

    it('should return HTTP 429 and Retry-After header via API endpoint when rate limit exceeded', async () => {
      const env = { ALLOWED_ORIGINS: '*' } as any;

      // Make 10 requests to reach limit
      for (let i = 0; i < 10; i++) {
        const req = new Request('http://localhost/api/v1/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '1.1.1.1' },
          body: JSON.stringify({ name: 'Test', email: 'test@example.com', subject: 'Subj', message: 'Hello World' })
        });
        await handleRequest(req, env);
      }

      // 11th request -> 429 TOO_MANY_REQUESTS
      const reqBlocked = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '1.1.1.1' },
        body: JSON.stringify({ name: 'Test', email: 'test@example.com', subject: 'Subj', message: 'Hello World' })
      });
      const res = await handleRequest(reqBlocked, env);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).not.toBeNull();
    });
  });

  describe('3. Cloudflare Turnstile Verification Tests', () => {
    it('should reject submission with HTTP 400 when Turnstile token is missing in production environment', async () => {
      const ctx = {
        env: { TURNSTILE_SECRET_KEY: 'test_secret_key', ENVIRONMENT: 'production' },
        clientIp: '1.2.3.4'
      } as any;

      const res = await verifyTurnstileToken(ctx, undefined);
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.errorCode).toBe('MISSING_TURNSTILE_TOKEN');
    });

    it('should pass verification when Turnstile API returns success = true', async () => {
      const ctx = {
        env: { TURNSTILE_SECRET_KEY: 'valid_secret_key' },
        clientIp: '1.2.3.4'
      } as any;

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      }));

      const res = await verifyTurnstileToken(ctx, 'VALID_TOKEN');
      expect(res.success).toBe(true);
    });

    it('should return HTTP 422 when Turnstile API returns success = false', async () => {
      const ctx = {
        env: { TURNSTILE_SECRET_KEY: 'valid_secret_key' },
        clientIp: '1.2.3.4'
      } as any;

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] })
      }));

      const res = await verifyTurnstileToken(ctx, 'INVALID_TOKEN');
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(422);
      expect(res.errorCode).toBe('INVALID_TURNSTILE_TOKEN');
    });

    it('should fail-closed with HTTP 503 Service Unavailable when Turnstile API errors out or times out', async () => {
      const ctx = {
        env: { TURNSTILE_SECRET_KEY: 'valid_secret_key' },
        clientIp: '1.2.3.4'
      } as any;

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Turnstile API connection timeout')));

      const res = await verifyTurnstileToken(ctx, 'SOME_TOKEN');
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(503);
      expect(res.errorCode).toBe('TURNSTILE_SERVICE_UNAVAILABLE');
    });
  });
});
