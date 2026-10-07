import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { Env } from '../src/types/env.js';
import { resetRateLimitStoresForTest } from '../src/middleware/rateLimit.js';

describe('API-003 — Newsletter API Double Opt-In & Security Verification Tests', () => {
  let mockEnv: Env;
  let kvStore: Map<string, string>;
  let subscribersDb: any[];

  beforeEach(() => {
    resetRateLimitStoresForTest();
    vi.restoreAllMocks();
    kvStore = new Map<string, string>();
    subscribersDb = [];

    mockEnv = {
      MEDIA: {} as R2Bucket,
      JWT_SECRET: 'test_api003_jwt_secret_123',
      ENVIRONMENT: 'development',
      ALLOWED_ORIGINS: 'http://localhost:5173,https://mskaymaz.com',
      IDEMPOTENCY_STORE: {
        get: async (key: string, type?: string) => {
          const val = kvStore.get(key);
          if (!val) return null;
          if (type === 'json') return JSON.parse(val);
          return val;
        },
        put: async (key: string, val: string) => {
          kvStore.set(key, val);
        },
        delete: async (key: string) => {
          kvStore.delete(key);
        }
      } as any,
      DB: {
        prepare: (query: string) => {
          let currentParams: any[] = [];
          return {
            bind: (...args: any[]) => {
              currentParams = args;
              return {
                run: async () => {
                  if (query.includes('INSERT INTO subscribers')) {
                    subscribersDb.push({
                      id: subscribersDb.length + 1,
                      email: args[0],
                      is_active: args[1], // 0 for unverified
                      unsubscribe_token: args[2],
                      verification_token: args[3],
                      verification_expires_at: args[4],
                      verified_at: null
                    });
                  } else if (query.includes('UPDATE subscribers') && query.includes('is_active = 1')) {
                    const found = subscribersDb.find(s => s.id === currentParams[0] || (currentParams[0] && s.verification_token === currentParams[0]));
                    if (found) {
                      found.is_active = 1;
                      found.verified_at = new Date().toISOString();
                      found.verification_token = null;
                      found.verification_expires_at = null;
                    }
                  } else if (query.includes('UPDATE subscribers') && query.includes('is_active = 0')) {
                    if (query.includes('verification_token = ?')) {
                      // Re-subscribe update
                      const found = subscribersDb.find(s => s.id === currentParams[3] || s.email === currentParams[0]);
                      if (found) {
                        found.is_active = 0;
                        found.verification_token = currentParams[0];
                        found.verification_expires_at = currentParams[1];
                        found.unsubscribe_token = currentParams[2];
                      }
                    } else {
                      // Unsubscribe update
                      const found = subscribersDb.find(s => s.id === currentParams[0]);
                      if (found) {
                        found.is_active = 0;
                      }
                    }
                  }
                  return { success: true, meta: { last_row_id: subscribersDb.length } };
                },
                first: async () => {
                  if (query.toLowerCase().includes('email =')) {
                    return subscribersDb.find(s => s.email === currentParams[0]) || null;
                  }
                  if (query.toLowerCase().includes('verification_token =')) {
                    return subscribersDb.find(s => s.verification_token === currentParams[0]) || null;
                  }
                  if (query.toLowerCase().includes('unsubscribe_token =')) {
                    return subscribersDb.find(s => s.unsubscribe_token === currentParams[0]) || null;
                  }
                  return null;
                },
                all: async () => ({ results: subscribersDb })
              };
            }
          };
        }
      } as any
    };
  });

  describe('1. Canonical & Legacy Alias Routing', () => {
    it('should process subscribe on canonical route /api/v1/subscribe', async () => {
      const req = new Request('http://localhost/api/v1/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'abone1@example.com', kvkkConsent: true })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('PENDING_VERIFICATION');
      expect(subscribersDb.length).toBe(1);
      expect(subscribersDb[0].is_active).toBe(0); // Unverified initially!
    });

    it('should process subscribe on legacy route /api/subscribe', async () => {
      const req = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'legacy@example.com', kvkkConsent: true })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(200);
      expect(subscribersDb.length).toBe(1);
    });
  });

  describe('2. KVKK Consent & Validation Rules', () => {
    it('should reject subscription with HTTP 400 when kvkkConsent is false or missing', async () => {
      const req = new Request('http://localhost/api/v1/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nokvkk@example.com', kvkkConsent: false })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);

      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.details.kvkkConsent).toBeDefined();
      expect(subscribersDb.length).toBe(0);
    });

    it('should reject subscription with HTTP 400 when email is invalid', async () => {
      const req = new Request('http://localhost/api/v1/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email-format', kvkkConsent: true })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);

      const json = (await res.json()) as any;
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.details.email).toBeDefined();
    });
  });

  describe('3. Double Opt-In Lifecycle & Verification Security', () => {
    it('should start with is_active = 0 and issue a 256-bit CSPRNG verification token', async () => {
      const req = new Request('http://localhost/api/v1/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'optin@example.com', kvkkConsent: true })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(200);
      expect(subscribersDb.length).toBe(1);

      const sub = subscribersDb[0];
      expect(sub.is_active).toBe(0); // MUST be unverified initially
      expect(sub.verification_token).toMatch(/^verify_[a-f0-9]{64}$/); // 256-bit CSPRNG hex (64 chars)
      expect(sub.verification_expires_at).toBeDefined();
    });

    it('should verify subscriber with valid verification token, set is_active = 1, and consume token (one-time use)', async () => {
      const token = 'verify_' + 'a'.repeat(64);
      subscribersDb.push({
        id: 10,
        email: 'unverified@example.com',
        is_active: 0,
        verification_token: token,
        verification_expires_at: new Date(Date.now() + 3600000).toISOString(),
        unsubscribe_token: 'unsub_token_10'
      });

      const reqVerify = new Request('http://localhost/api/v1/subscribe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const resVerify = await handleRequest(reqVerify, mockEnv);
      expect(resVerify.status).toBe(200);

      const json = (await resVerify.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('VERIFIED');
      expect(subscribersDb[0].is_active).toBe(1);
      expect(subscribersDb[0].verification_token).toBeNull(); // Consumed / One-Time Use!

      // Attempt second verification with same token MUST fail with 404 (One-Time Use Enforcement)
      const reqVerify2 = new Request('http://localhost/api/v1/subscribe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const resVerify2 = await handleRequest(reqVerify2, mockEnv);
      expect(resVerify2.status).toBe(404);
    });

    it('should reject expired verification token with HTTP 410 EXPIRED_VERIFICATION_TOKEN', async () => {
      const expiredToken = 'verify_' + 'b'.repeat(64);
      subscribersDb.push({
        id: 11,
        email: 'expired@example.com',
        is_active: 0,
        verification_token: expiredToken,
        verification_expires_at: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
        unsubscribe_token: 'unsub_token_11'
      });

      const req = new Request('http://localhost/api/v1/subscribe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: expiredToken })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(410);

      const json = (await res.json()) as any;
      expect(json.error.code).toBe('EXPIRED_VERIFICATION_TOKEN');
      expect(subscribersDb[0].is_active).toBe(0); // Remains unverified
    });
  });

  describe('4. Unsubscribe Lifecycle & Token Isolation', () => {
    it('should successfully unsubscribe given a valid 256-bit unsubscribe_token and set is_active = 0', async () => {
      const unsubToken = 'unsub_' + 'c'.repeat(64);
      subscribersDb.push({
        id: 20,
        email: 'activeuser@example.com',
        is_active: 1,
        verified_at: new Date().toISOString(),
        unsubscribe_token: unsubToken
      });

      const req = new Request('http://localhost/api/v1/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: unsubToken })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.data.message).toContain('sonlandırıldı');
      expect(subscribersDb[0].is_active).toBe(0);
    });

    it('should return HTTP 404 for non-existent unsubscribe token', async () => {
      const req = new Request('http://localhost/api/v1/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'unsub_' + 'f'.repeat(64) })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('INVALID_UNSUBSCRIBE_TOKEN');
    });
  });

  describe('5. PII & KVKK Masking', () => {
    it('should mask email address in response data (e.g. ah***@example.com) to prevent PII leakage', async () => {
      const req = new Request('http://localhost/api/v1/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ahmet.yilmaz@example.com', kvkkConsent: true })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.data.email).toBe('ah***@example.com');
      expect(json.data.email).not.toContain('ahmet.yilmaz@example.com');
    });
  });

  describe('6. Rate Limiting (5 requests / minute)', () => {
    it('should allow 5 subscribe requests and block 6th with HTTP 429 and Retry-After header', async () => {
      const makeReq = (i: number) =>
        new Request('http://localhost/api/v1/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.33' },
          body: JSON.stringify({ email: `rate${i}@example.com`, kvkkConsent: true })
        });

      for (let i = 0; i < 5; i++) {
        const res = await handleRequest(makeReq(i), mockEnv);
        expect(res.status).toBe(200);
      }

      const blockedRes = await handleRequest(makeReq(6), mockEnv);
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('7. Turnstile Security Verification', () => {
    it('should return HTTP 400 MISSING_TURNSTILE_TOKEN when TURNSTILE_SECRET_KEY is configured and token is missing', async () => {
      const turnstileEnv = { ...mockEnv, TURNSTILE_SECRET_KEY: 'test_secret_key' };
      const req = new Request('http://localhost/api/v1/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'turnstile@example.com', kvkkConsent: true })
      });

      const res = await handleRequest(req, turnstileEnv);
      expect(res.status).toBe(400);

      const json = (await res.json()) as any;
      expect(json.error.code).toBe('MISSING_TURNSTILE_TOKEN');
    });
  });

  describe('8. Idempotency & Replay (X-Idempotency-Key)', () => {
    it('should replay response for same key + same body', async () => {
      const idempotencyKey = 'api003_idempotency_key_999888';
      const makeReq = () =>
        new Request('http://localhost/api/v1/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({ email: 'idempotent@example.com', kvkkConsent: true })
        });

      const res1 = await handleRequest(makeReq(), mockEnv);
      expect(res1.status).toBe(200);
      expect(subscribersDb.length).toBe(1);

      const res2 = await handleRequest(makeReq(), mockEnv);
      expect(res2.status).toBe(200);
      expect(subscribersDb.length).toBe(1); // Replayed, no duplicate DB insert!

      const json1 = (await res1.json()) as any;
      const json2 = (await res2.json()) as any;
      expect(json1.data).toEqual(json2.data);
    });

    it('should return HTTP 422 IDEMPOTENCY_PAYLOAD_MISMATCH for same key + different body', async () => {
      const idempotencyKey = 'api003_mismatch_key_111222';

      const req1 = new Request('http://localhost/api/v1/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ email: 'user1@example.com', kvkkConsent: true })
      });

      const res1 = await handleRequest(req1, mockEnv);
      expect(res1.status).toBe(200);

      const req2 = new Request('http://localhost/api/v1/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ email: 'user2@example.com', kvkkConsent: true })
      });

      const res2 = await handleRequest(req2, mockEnv);
      expect(res2.status).toBe(422);

      const json2 = (await res2.json()) as any;
      expect(json2.error.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
    });
  });
});
