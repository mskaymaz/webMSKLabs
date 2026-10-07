import { describe, it, expect, beforeEach } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { Env } from '../src/types/env.js';
import { isValidIdempotencyKey, deriveIdempotencyStorageKey, withIdempotency } from '../src/middleware/idempotency.js';

describe('API-007 — Idempotency & Retry Strategy Tests', () => {
  let mockEnv: Env;
  let kvStore: Map<string, string>;
  let dbInsertCount = 0;

  beforeEach(() => {
    kvStore = new Map<string, string>();
    dbInsertCount = 0;

    mockEnv = {
      MEDIA: {} as R2Bucket,
      JWT_SECRET: 'test_api007_jwt_secret_123',
      ENVIRONMENT: 'development',
      ALLOWED_ORIGINS: 'http://localhost:5173,https://mskaymaz.com',
      IDEMPOTENCY_STORE: {
        get: async (key: string, type?: string) => {
          const val = kvStore.get(key);
          if (!val) return null;
          if (type === 'json') return JSON.parse(val);
          return val;
        },
        put: async (key: string, val: string, _opts?: any) => {
          kvStore.set(key, val);
        },
        delete: async (key: string) => {
          kvStore.delete(key);
        }
      } as any,
      DB: {
        prepare: (query: string) => {
          return {
            bind: (..._args: any[]) => {
              return {
                run: async () => {
                  if (query.includes('INSERT INTO messages')) {
                    dbInsertCount++;
                  }
                  return { success: true, meta: { last_row_id: dbInsertCount } };
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

  describe('1. Idempotency Key Format & Validation', () => {
    it('should validate valid 16-64 character alphanumeric keys', () => {
      expect(isValidIdempotencyKey('1234567890abcdef')).toBe(true);
      expect(isValidIdempotencyKey('idem_key_uuid_1234-5678_abcd')).toBe(true);
    });

    it('should reject invalid keys (<16 chars, >64 chars, or invalid characters)', () => {
      expect(isValidIdempotencyKey('short_key')).toBe(false);
      expect('a'.repeat(65).length).toBe(65);
      expect(isValidIdempotencyKey('a'.repeat(65))).toBe(false);
      expect(isValidIdempotencyKey('invalid_key_with_spaces!@#')).toBe(false);
    });

    it('should return HTTP 400 Bad Request with code INVALID_IDEMPOTENCY_KEY for invalid key header', async () => {
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': 'too_short'
        },
        body: JSON.stringify({
          name: 'Ahmet Yilmaz',
          email: 'ahmet@example.com',
          subject: 'Destek Talebi',
          message: 'Lutfen yardimci olun.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);

      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_IDEMPOTENCY_KEY');
    });
  });

  describe('2. Fail-Closed Fallback on Storage Failure', () => {
    it('should return HTTP 503 Service Unavailable when IDEMPOTENCY_STORE binding is missing and key is sent', async () => {
      const envWithoutKV: Env = { ...mockEnv, IDEMPOTENCY_STORE: undefined };
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': 'valid_idempotency_key_12345678'
        },
        body: JSON.stringify({
          name: 'Ahmet Yilmaz',
          email: 'ahmet@example.com',
          subject: 'Destek Talebi',
          message: 'Lutfen yardimci olun.'
        })
      });

      const res = await handleRequest(req, envWithoutKV);
      expect(res.status).toBe(503);

      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('IDEMPOTENCY_STORE_UNAVAILABLE');
    });

    it('should allow requests without X-Idempotency-Key to proceed normally', async () => {
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ahmet Yilmaz',
          email: 'ahmet@example.com',
          subject: 'Destek Talebi',
          message: 'Lutfen yardimci olun.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(201);
      expect(dbInsertCount).toBe(1);
    });
  });

  describe('3. Replay & Duplicate Side-Effect Prevention', () => {
    it('should execute DB insert on 1st request and replay cached response on 2nd request without duplicate DB insert', async () => {
      const idempotencyKey = 'valid_unique_key_987654321012';

      const createRequest = () => new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          name: 'Mehmet Demir',
          email: 'mehmet@example.com',
          subject: 'Bilet Sorunu',
          message: 'Bilet olusturulamadi.'
        })
      });

      // 1st Execution
      const res1 = await handleRequest(createRequest(), mockEnv);
      expect(res1.status).toBe(201);
      expect(dbInsertCount).toBe(1);
      const json1 = await res1.json() as any;

      // 2nd Execution with same key
      const res2 = await handleRequest(createRequest(), mockEnv);
      expect(res2.status).toBe(201);
      expect(dbInsertCount).toBe(1); // DB insert count MUST remain 1!
      const json2 = await res2.json() as any;

      expect(json2.data).toEqual(json1.data);
      expect(json2.success).toBe(true);
    });

    it('should return HTTP 409 Conflict when a second request arrives while state is IN_PROGRESS', async () => {
      const idempotencyKey = 'concurrent_key_123456789012';

      const ctxMock = {
        request: new Request('http://localhost/api/v1/support', { method: 'POST' }),
        url: new URL('http://localhost/api/v1/support'),
        clientIp: '127.0.0.1'
      } as any;
      const storageKey = await deriveIdempotencyStorageKey(ctxMock, idempotencyKey);
      
      kvStore.set(storageKey, JSON.stringify({ state: 'IN_PROGRESS', claimedAt: new Date().toISOString() }));

      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          name: 'Ayse Kaya',
          email: 'ayse@example.com',
          subject: 'Es zamanli istek',
          message: 'Mesaj metni buraya gelecek.'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(409);

      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('IDEMPOTENCY_IN_PROGRESS');
    });
  });

  describe('4. Namespace & User Identity Isolation', () => {
    it('should isolate storage keys between different routes and users', async () => {
      const rawKey = 'shared_key_1234567890123';

      const ctxUser1 = {
        request: new Request('http://localhost/api/v1/support', { method: 'POST' }),
        url: new URL('http://localhost/api/v1/support'),
        clientIp: '1.1.1.1',
        user: { id: 10, username: 'user10', role: 'ADMIN' }
      } as any;

      const ctxUser2 = {
        request: new Request('http://localhost/api/v1/support', { method: 'POST' }),
        url: new URL('http://localhost/api/v1/support'),
        clientIp: '2.2.2.2',
        user: { id: 20, username: 'user20', role: 'ADMIN' }
      } as any;

      const keyUser1 = await deriveIdempotencyStorageKey(ctxUser1, rawKey);
      const keyUser2 = await deriveIdempotencyStorageKey(ctxUser2, rawKey);

      expect(keyUser1).not.toEqual(keyUser2);
      expect(keyUser1).toContain('user_10');
      expect(keyUser2).toContain('user_20');
    });
  });

  describe('5. Concurrency Simulation', () => {
    it('should execute business side-effect exactly once when 10 requests hit concurrently', async () => {
      const idempotencyKey = 'concurrency_key_999988887777';

      const requests = Array.from({ length: 10 }).map(() => {
        return handleRequest(
          new Request('http://localhost/api/v1/support', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({
              name: 'Test Concurrency',
              email: 'conc@example.com',
              subject: 'Eszamanli Bilet',
              message: 'Mesaj metni test.'
            })
          }),
          mockEnv
        );
      });

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);

      // Exactly 1 request creates DB record
      expect(dbInsertCount).toBe(1);

      // Status codes must be a combination of 201 (created/replay) and 409 (conflict during in-progress)
      expect(statuses.every(s => s === 201 || s === 409)).toBe(true);
      expect(statuses.filter(s => s === 201).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('6. Performance Benchmark', () => {
    it('should process idempotency middleware in less than 15ms', async () => {
      const idempotencyKey = 'perf_benchmark_key_12345678';
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          name: 'Perf Test',
          email: 'perf@example.com',
          subject: 'Performans',
          message: 'Performans testi mesaj metni.'
        })
      });

      const iterations = 50;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await handleRequest(req, mockEnv);
      }
      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / iterations;

      expect(avgDuration).toBeLessThan(15.0); // Target < 15ms
    });
  });

  describe('7. Lock Expiry & Error Cleanup Behavior', () => {
    it('should release IN_PROGRESS lock automatically if handler throws an unhandled exception', async () => {
      const idempotencyKey = 'error_cleanup_key_12345678';
      const failingHandler = withIdempotency(async () => {
        throw new Error('Simulated Handler Panic');
      });

      const ctxMock = {
        request: new Request('http://localhost/api/v1/support', {
          method: 'POST',
          headers: { 'X-Idempotency-Key': idempotencyKey }
        }),
        url: new URL('http://localhost/api/v1/support'),
        clientIp: '127.0.0.1',
        corsHeaders: {},
        env: mockEnv
      } as any;

      await expect(failingHandler(ctxMock)).rejects.toThrow('Simulated Handler Panic');

      // Verify lock was deleted from KV so client can retry
      const storageKey = await deriveIdempotencyStorageKey(ctxMock, idempotencyKey);
      expect(kvStore.get(storageKey)).toBeUndefined();
    });
  });
});
