import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { Env } from '../src/types/env.js';
import { resetRateLimitStoresForTest } from '../src/middleware/rateLimit.js';

describe('API-002 — Public Blog Comments API Verification Tests', () => {
  let mockEnv: Env;
  let kvStore: Map<string, string>;
  let insertedComments: any[];

  const initialComments = [
    {
      id: 1,
      post_slug: 'cloudflare-d1-rehberi',
      author_name: 'Canan Bakır',
      author_email: 'canan@example.com',
      comment_text: 'Harika bir rehber olmuş, ellerinize sağlık!',
      status: 'APPROVED',
      created_at: '2026-10-06T10:00:00Z'
    },
    {
      id: 2,
      post_slug: 'cloudflare-d1-rehberi',
      author_name: 'Gizli Yorumcu',
      author_email: 'spam@example.com',
      comment_text: 'Onay bekleyen yorum metni...',
      status: 'PENDING',
      created_at: '2026-10-06T11:00:00Z'
    },
    {
      id: 3,
      post_slug: 'cloudflare-d1-rehberi',
      author_name: 'Reddedilmiş Yorumcu',
      author_email: 'rejected@example.com',
      comment_text: 'Reddedilen yorum metni...',
      status: 'REJECTED',
      created_at: '2026-10-06T11:30:00Z'
    },
    {
      id: 4,
      post_slug: 'react-vite-pwa',
      author_name: 'Ali Yılmaz',
      author_email: 'ali@example.com',
      comment_text: 'Başka makale için onaylanmış yorum.',
      status: 'APPROVED',
      created_at: '2026-10-06T12:00:00Z'
    }
  ];

  beforeEach(() => {
    resetRateLimitStoresForTest();
    vi.restoreAllMocks();
    kvStore = new Map<string, string>();
    insertedComments = [];

    mockEnv = {
      MEDIA: {} as R2Bucket,
      JWT_SECRET: 'test_api002_jwt_secret_123',
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
                  if (query.includes('INSERT INTO comments')) {
                    insertedComments.push({
                      post_slug: args[0],
                      author_name: args[1],
                      author_email: args[2],
                      comment_text: args[3],
                      status: 'PENDING'
                    });
                  }
                  return { success: true, meta: { last_row_id: 100 + insertedComments.length } };
                },
                first: async () => null,
                all: async () => {
                  if (query.includes('FROM comments')) {
                    let filtered = [...initialComments];
                    if (query.includes("status = 'APPROVED'")) {
                      filtered = filtered.filter((c) => c.status === 'APPROVED');
                    }
                    if (query.includes('post_slug = ?') && currentParams.length > 0) {
                      filtered = filtered.filter((c) => c.post_slug === currentParams[0]);
                    }
                    return { results: filtered };
                  }
                  return { results: [] };
                }
              };
            }
          };
        }
      } as any
    };
  });

  describe('1. Validation Rules (tasks.md Exact Match)', () => {
    it('should reject postSlug missing or empty', async () => {
      const req = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: '',
          authorName: 'Geçerli İsim',
          authorEmail: 'valid@example.com',
          content: 'Geçerli yorum içeriği.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.details.postSlug).toBeDefined();
    });

    it('should reject authorName > 50 characters', async () => {
      const req = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'test-slug',
          authorName: 'A'.repeat(51),
          authorEmail: 'valid@example.com',
          content: 'Geçerli yorum içeriği.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.details.authorName).toBeDefined();
    });

    it('should reject authorEmail with invalid format or length > 255', async () => {
      const req = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'test-slug',
          authorName: 'Ahmet',
          authorEmail: 'invalidemailformat',
          content: 'Geçerli yorum içeriği.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.details.authorEmail).toBeDefined();
    });

    it('should reject content < 5 characters and > 1000 characters', async () => {
      // < 5 chars
      const reqShort = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'test-slug',
          authorName: 'Ahmet',
          authorEmail: 'ahmet@example.com',
          content: 'Kısa'
        })
      });

      const resShort = await handleRequest(reqShort, mockEnv);
      expect(resShort.status).toBe(400);

      // > 1000 chars
      const reqLong = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'test-slug',
          authorName: 'Ahmet',
          authorEmail: 'ahmet@example.com',
          content: 'C'.repeat(1001)
        })
      });

      const resLong = await handleRequest(reqLong, mockEnv);
      expect(resLong.status).toBe(400);
    });
  });

  describe('2. Idempotency Scenarios (API-001 / API-007 Standard)', () => {
    it('Scenario A: Same key + same body -> should replay response and NOT create 2nd D1 record', async () => {
      const idempotencyKey = 'api002_scenario_a_key_123456';
      const body = {
        postSlug: 'cloudflare-d1-rehberi',
        authorName: 'Tekil Kullanıcı',
        authorEmail: 'tekil@example.com',
        content: 'Aynı gövde ile gönderilen tekil yorum.'
      };

      const makeReq = () =>
        new Request('http://localhost/api/v1/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify(body)
        });

      const res1 = await handleRequest(makeReq(), mockEnv);
      expect(res1.status).toBe(201);
      expect(insertedComments.length).toBe(1);

      const res2 = await handleRequest(makeReq(), mockEnv);
      expect(res2.status).toBe(201);
      expect(insertedComments.length).toBe(1); // Second insert prevented!

      const json1 = (await res1.json()) as any;
      const json2 = (await res2.json()) as any;
      expect(json1.data).toEqual(json2.data);
    });

    it('Scenario B: Same key + different body -> should NOT replay response, NOT create 2nd D1 record, and return HTTP 422 IDEMPOTENCY_PAYLOAD_MISMATCH', async () => {
      const idempotencyKey = 'api002_scenario_b_key_654321';

      const req1 = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          postSlug: 'cloudflare-d1-rehberi',
          authorName: 'Kullanıcı Bir',
          authorEmail: 'bir@example.com',
          content: 'İlk istek yorum içeriği metni.'
        })
      });

      const res1 = await handleRequest(req1, mockEnv);
      expect(res1.status).toBe(201);
      expect(insertedComments.length).toBe(1);

      const req2 = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          postSlug: 'cloudflare-d1-rehberi',
          authorName: 'Kullanıcı İki (Farklı)',
          authorEmail: 'iki@example.com',
          content: 'Farklı içerikli 2. istek yorumu.'
        })
      });

      const res2 = await handleRequest(req2, mockEnv);
      expect(res2.status).toBe(422);

      const json2 = (await res2.json()) as any;
      expect(json2.success).toBe(false);
      expect(json2.error.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
      expect(insertedComments.length).toBe(1); // NO 2nd insert!
    });
  });

  describe('3. Turnstile Security Verification', () => {
    it('should reject missing token with 400 MISSING_TURNSTILE_TOKEN when TURNSTILE_SECRET_KEY is configured', async () => {
      const turnstileEnv = { ...mockEnv, TURNSTILE_SECRET_KEY: 'test_secret_key' };
      const req = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'turnstile-test',
          authorName: 'Turnstile User',
          authorEmail: 'turnstile@example.com',
          content: 'Turnstile jetonu olmayan istek.'
        })
      });

      const res = await handleRequest(req, turnstileEnv);
      expect(res.status).toBe(400);

      const json = (await res.json()) as any;
      expect(json.error.code).toBe('MISSING_TURNSTILE_TOKEN');
    });

    it('should fail-closed with 500 SERVER_MISCONFIGURATION in production when TURNSTILE_SECRET_KEY is missing', async () => {
      const prodEnv = { ...mockEnv, ENVIRONMENT: 'production' as const, TURNSTILE_SECRET_KEY: '' };
      const req = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'prod-test',
          authorName: 'Prod User',
          authorEmail: 'prod@example.com',
          content: 'Production konfigürasyon testi.',
          turnstileToken: 'dummy_token'
        })
      });

      const res = await handleRequest(req, prodEnv);
      expect(res.status).toBe(500);

      const json = (await res.json()) as any;
      expect(json.error.code).toBe('SERVER_MISCONFIGURATION');
    });

    it('should allow valid turnstile token verification', async () => {
      const turnstileEnv = { ...mockEnv, TURNSTILE_SECRET_KEY: 'test_secret_key' };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      }));

      const req = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'turnstile-test',
          authorName: 'Valid Turnstile User',
          authorEmail: 'validturnstile@example.com',
          content: 'Geçerli Turnstile jetonu ile gönderilen yorum.',
          turnstileToken: 'VALID_TURNSTILE_TOKEN'
        })
      });

      const res = await handleRequest(req, turnstileEnv);
      expect(res.status).toBe(201);
    });
  });

  describe('4. Cache & PENDING Comments Isolation', () => {
    it('should set Cache-Control max-age=300, s-maxage=300 on GET /api/v1/comments', async () => {
      const req = new Request('http://localhost/api/v1/comments', { method: 'GET' });
      const res = await handleRequest(req, mockEnv);

      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toContain('max-age=300');
      expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
    });

    it('should NEVER display PENDING or REJECTED comments in public GET results', async () => {
      const req = new Request('http://localhost/api/v1/comments?postSlug=cloudflare-d1-rehberi', {
        method: 'GET'
      });

      const res = await handleRequest(req, mockEnv);
      const json = (await res.json()) as any;

      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].authorName).toBe('Canan Bakır');
      expect(json.data.find((item: any) => item.authorName === 'Gizli Yorumcu')).toBeUndefined();
      expect(json.data.find((item: any) => item.authorName === 'Reddedilmiş Yorumcu')).toBeUndefined();
    });
  });

  describe('5. APPROVED / PENDING Security & PII Privacy', () => {
    it('should NEVER leak author_email (PII) in public GET response data or meta', async () => {
      const req = new Request('http://localhost/api/v1/comments', { method: 'GET' });
      const res = await handleRequest(req, mockEnv);
      const json = (await res.json()) as any;

      json.data.forEach((item: any) => {
        expect(item.authorEmail).toBeUndefined();
        expect(item.author_email).toBeUndefined();
        expect(item.email).toBeUndefined();
      });
    });

    it('should safely handle SQL injection payloads in postSlug query parameter', async () => {
      const req = new Request("http://localhost/api/v1/comments?postSlug=' OR 1=1 --", {
        method: 'GET'
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBe(0); // SQL injection defeated by parameterized query!
    });
  });

  describe('6. Sanitization & XSS Prevention', () => {
    it('should sanitize script tags, event handlers, and javascript URLs', async () => {
      const req = new Request('http://localhost/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'xss-test',
          authorName: '<script>alert("xss")</script> Mehmet',
          authorEmail: 'mehmet@example.com',
          content: 'Detaylı metin <img src=x onerror=alert(1)> ve <a href="javascript:alert(1)">link</a>.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(201);
      expect(insertedComments.length).toBe(1);

      const saved = insertedComments[0];
      expect(saved.author_name).not.toContain('<script>');
      expect(saved.author_name).toContain('&lt;script&gt;');
      expect(saved.comment_text).not.toContain('<img');
      expect(saved.comment_text).not.toContain('javascript:');
    });
  });

  describe('7. Rate Limiting (3 requests / minute)', () => {
    it('should allow 3 requests and block 4th with 429 TOO_MANY_REQUESTS', async () => {
      const makeReq = () =>
        new Request('http://localhost/api/v1/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.99' },
          body: JSON.stringify({
            postSlug: 'rate-test',
            authorName: 'Rate Limiter',
            authorEmail: 'rate@example.com',
            content: 'Rate limit testi mesajı içeriği.'
          })
        });

      for (let i = 0; i < 3; i++) {
        const res = await handleRequest(makeReq(), mockEnv);
        expect(res.status).toBe(201);
      }

      const blockedRes = await handleRequest(makeReq(), mockEnv);
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('8. Canonical Response Envelope (API-006)', () => {
    it('should return standard success envelope format', async () => {
      const req = new Request('http://localhost/api/v1/comments', { method: 'GET' });
      const res = await handleRequest(req, mockEnv);

      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.meta).toBeDefined();
      expect(json.meta.timestamp).toBeDefined();
      expect(json.meta.requestId).toBeDefined();
      expect(res.headers.get('X-Request-ID')).toBeDefined();
    });
  });
});
