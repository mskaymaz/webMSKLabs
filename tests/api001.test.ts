import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { Env } from '../src/types/env.js';
import { resetRateLimitStoresForTest } from '../src/middleware/rateLimit.js';

describe('API-001 — Public Support API Tests', () => {
  let mockEnv: Env;
  let kvStore: Map<string, string>;
  let insertedMessages: any[];

  beforeEach(() => {
    resetRateLimitStoresForTest();
    vi.restoreAllMocks();
    kvStore = new Map<string, string>();
    insertedMessages = [];

    mockEnv = {
      MEDIA: {} as R2Bucket,
      JWT_SECRET: 'test_api001_jwt_secret_123',
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
          return {
            bind: (...args: any[]) => {
              return {
                run: async () => {
                  if (query.includes('INSERT INTO messages')) {
                    insertedMessages.push({
                      id: args[0],
                      name: args[1],
                      email: args[2],
                      subject: args[3],
                      message: args[4],
                      category: args[5]
                    });
                  }
                  return { success: true, meta: { last_row_id: insertedMessages.length } };
                },
                first: async () => null,
                all: async () => ({ results: [] })
              };
            }
          };
        }
      } as any
    };
  });

  describe('1. Canonical & Legacy Alias Routing', () => {
    it('should process request on canonical route /api/v1/support', async () => {
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ahmet Yilmaz',
          email: 'ahmet@example.com',
          subject: 'Genel Sorun',
          message: 'Destek talebi detayli aciklama metni.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(201);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.data.ticketId).toMatch(/^MSK-2026-\d{5}$/);
      expect(insertedMessages.length).toBe(1);
    });

    it('should process request on legacy alias route /api/support', async () => {
      const req = new Request('http://localhost/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Mehmet Demir',
          email: 'mehmet@example.com',
          subject: 'Eski Endpoint',
          message: 'Eski endpoint uzerinden gonderilen destek talebi.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(201);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.data.ticketId).toMatch(/^MSK-2026-\d{5}$/);
      expect(insertedMessages.length).toBe(1);
    });
  });

  describe('2. Payload Validation & HTML Sanitization', () => {
    it('should return HTTP 400 with VALIDATION_ERROR when required fields are missing or invalid', async () => {
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'A', // too short (<2)
          email: 'invalid-email', // invalid format
          subject: 'Hi', // too short (<3)
          message: 'Short' // too short (<10)
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);

      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.details.name).toBeDefined();
      expect(json.error.details.email).toBeDefined();
      expect(json.error.details.subject).toBeDefined();
      expect(json.error.details.message).toBeDefined();
    });

    it('should reject message length > 3000 chars with HTTP 400', async () => {
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ayse Kaya',
          email: 'ayse@example.com',
          subject: 'Cok Uzun Mesaj',
          message: 'A'.repeat(3001)
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);

      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return HTTP 400 INVALID_JSON for malformed JSON body', async () => {
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ malformed json: true '
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);

      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_JSON');
    });

    it('should sanitize HTML / XSS tags in name, subject, and message before DB insert', async () => {
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '<script>alert("xss")</script> Can',
          email: 'can@example.com',
          subject: 'Güvenlik <img src=x onerror=alert(1)> Testi',
          message: 'Merhaba <iframe src="http://evil.com"></iframe> mesaj içeriği detaylı.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(201);
      expect(insertedMessages.length).toBe(1);

      const saved = insertedMessages[0];
      expect(saved.name).not.toContain('<script>');
      expect(saved.name).toContain('&lt;script&gt;');
      expect(saved.subject).not.toContain('<img');
      expect(saved.subject).toContain('&lt;img');
      expect(saved.message).not.toContain('<iframe');
    });
  });

  describe('3. Server-Side Turnstile Verification', () => {
    it('should return 400 MISSING_TURNSTILE_TOKEN when TURNSTILE_SECRET_KEY is configured and token is missing', async () => {
      const turnstileEnv = { ...mockEnv, TURNSTILE_SECRET_KEY: 'test_turnstile_secret_key' };
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ahmet Yilmaz',
          email: 'ahmet@example.com',
          subject: 'Turnstile Testi',
          message: 'Turnstile jetonu olmadan gonderilen istek.'
        })
      });

      const res = await handleRequest(req, turnstileEnv);
      expect(res.status).toBe(400);

      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('MISSING_TURNSTILE_TOKEN');
    });

    it('should accept valid turnstile token when Cloudflare Turnstile API responds with success=true', async () => {
      const turnstileEnv = { ...mockEnv, TURNSTILE_SECRET_KEY: 'test_turnstile_secret_key' };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      }));

      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ahmet Yilmaz',
          email: 'ahmet@example.com',
          subject: 'Turnstile Başarılı',
          message: 'Gecerli Turnstile jetonu ile gonderilen mesaj.',
          turnstile_token: 'VALID_TURNSTILE_TOKEN_123'
        })
      });

      const res = await handleRequest(req, turnstileEnv);
      expect(res.status).toBe(201);
    });
  });

  describe('4. Rate Limiting (5 requests / minute per IP + route)', () => {
    it('should allow 5 requests and block 6th request with HTTP 429 and Retry-After header', async () => {
      const makeReq = () =>
        new Request('http://localhost/api/v1/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.55' },
          body: JSON.stringify({
            name: 'Rate Limit Test',
            email: 'ratelimit@example.com',
            subject: 'Test Konu',
            message: 'Rate limit test mesaj metni detayli.'
          })
        });

      for (let i = 0; i < 5; i++) {
        const res = await handleRequest(makeReq(), mockEnv);
        expect(res.status).toBe(201);
      }

      // 6th request MUST be blocked
      const blockedRes = await handleRequest(makeReq(), mockEnv);
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get('Retry-After')).toBeDefined();

      const json = await blockedRes.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('5. Idempotency & Replay', () => {
    it('should prevent duplicate DB inserts on replayed idempotency key', async () => {
      const idempotencyKey = 'api001_idempotency_key_123456';

      const createReq = () =>
        new Request('http://localhost/api/v1/support', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            name: 'Tekil Kullanici',
            email: 'tekil@example.com',
            subject: 'Tekil Istek',
            message: 'Idempotency test mesaj metni.'
          })
        });

      const res1 = await handleRequest(createReq(), mockEnv);
      expect(res1.status).toBe(201);
      expect(insertedMessages.length).toBe(1);

      const res2 = await handleRequest(createReq(), mockEnv);
      expect(res2.status).toBe(201);
      expect(insertedMessages.length).toBe(1); // No new insert!

      const json1 = await res1.json() as any;
      const json2 = await res2.json() as any;
      expect(json1.data).toEqual(json2.data);
    });

    it('should return HTTP 422 IDEMPOTENCY_PAYLOAD_MISMATCH when same key is sent with different request payload', async () => {
      const idempotencyKey = 'api001_mismatch_key_999888777666';

      const req1 = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          name: 'Kullanici Bir',
          email: 'bir@example.com',
          subject: 'Konu Bir',
          message: 'İlk istek mesaj metni.'
        })
      });

      const res1 = await handleRequest(req1, mockEnv);
      expect(res1.status).toBe(201);
      expect(insertedMessages.length).toBe(1);

      const req2 = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          name: 'Kullanici Iki',
          email: 'iki@example.com',
          subject: 'Konu Iki (Farkli)',
          message: 'Farkli istek mesaj metni.'
        })
      });

      const res2 = await handleRequest(req2, mockEnv);
      expect(res2.status).toBe(422);

      const json2 = await res2.json() as any;
      expect(json2.success).toBe(false);
      expect(json2.error.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
      expect(insertedMessages.length).toBe(1); // Ensure NO duplicate DB insert!
    });
  });

  describe('6. Privacy & KVKK Compliance', () => {
    it('should not leak PII (email, message body) or internal secrets in response payload', async () => {
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Gizli Kullanici',
          email: 'gizli@example.com',
          subject: 'Gizli Konu',
          message: 'Bu mesaj icerigi yanitta yer almamalidir.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(201);

      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.data.ticketId).toBeDefined();
      expect(json.data.status).toBe('NEW');
      expect(json.data.message).toBe('Destek talebiniz alındı.');
      expect(json.data.email).toBeUndefined();
      expect(json.data.name).toBeUndefined();
      expect(json.data.subject).toBeUndefined();
    });
  });

  describe('7. DB Failure Handling', () => {
    it('should handle DB failure gracefully and return 500 error envelope without stack trace leak', async () => {
      const failingEnv: Env = {
        ...mockEnv,
        DB: {
          prepare: () => {
            throw new Error('D1 Storage Engine Fault');
          }
        } as any
      };

      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hata Test',
          email: 'hata@example.com',
          subject: 'Hata Konu',
          message: 'Hata testi icin olusturulan mesaj.'
        })
      });

      const res = await handleRequest(req, failingEnv);
      expect(res.status).toBe(500);

      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(json.error.message).not.toContain('D1 Storage Engine Fault');
    });
  });

  describe('8. Performance Benchmark', () => {
    it('should execute support request handler in less than 150ms p95', async () => {
      const times: number[] = [];
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const req = new Request('http://localhost/api/v1/support', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': `10.0.0.${i + 1}`
          },
          body: JSON.stringify({
            name: `Perf User ${i}`,
            email: `perf${i}@example.com`,
            subject: `Perf Subject ${i}`,
            message: `Performans testi detayli aciklama metni ${i}.`
          })
        });

        await handleRequest(req, mockEnv);
        times.push(performance.now() - start);
      }

      times.sort((a, b) => a - b);
      const p95 = times[Math.floor(iterations * 0.95)];
      expect(p95).toBeLessThan(150);
    });
  });
});
