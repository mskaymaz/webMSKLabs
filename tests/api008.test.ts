import { describe, it, expect, beforeEach } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { resetRateLimitStoresForTest } from '../src/middleware/rateLimit.js';
import { Env } from '../src/types/env.js';

class MockKV {
  private store = new Map<string, { value: string; expiration?: number }>();

  async get(key: string, type?: string) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiration && Date.now() > item.expiration) {
      this.store.delete(key);
      return null;
    }
    if (type === 'json') {
      try {
        return JSON.parse(item.value);
      } catch {
        return null;
      }
    }
    return item.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    const expiration = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined;
    this.store.set(key, { value, expiration });
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}

class MockD1Database {
  public shouldFail = false;
  public auditLogs: any[] = [];

  prepare(query: string) {
    const self = this;
    let boundParams: any[] = [];

    return {
      bind(...params: any[]) {
        boundParams = params;
        return this;
      },
      async first() {
        if (self.shouldFail) {
          throw new Error('D1 Connection Simulated Failure at /var/internal/sqlite.db');
        }
        if (query.includes('SELECT 1')) {
          return { ping: 1 };
        }
        return null;
      },
      async run() {
        if (query.includes('INSERT INTO admin_audit_logs')) {
          self.auditLogs.push({
            admin_id: boundParams[0],
            action: boundParams[1],
            resource: boundParams[2],
            details_json: boundParams[3],
            ip_address: boundParams[4]
          });
          return { meta: { last_row_id: self.auditLogs.length } };
        }
        return { meta: {} };
      }
    };
  }
}

describe('API-008 — Health & Readiness Checks Tests', () => {
  let mockDb: MockD1Database;
  let mockKv: MockKV;
  let r2ShouldFail: boolean;
  let env: Env;

  beforeEach(() => {
    resetRateLimitStoresForTest();
    mockDb = new MockD1Database();
    mockKv = new MockKV();
    r2ShouldFail = false;

    env = {
      DB: mockDb as any,
      MEDIA: {
        list: async (_opts?: any) => {
          if (r2ShouldFail) {
            throw new Error('R2 Storage Connection Failed');
          }
          return { objects: [] };
        }
      } as any,
      IDEMPOTENCY_STORE: mockKv as any,
      JWT_SECRET: 'test_jwt_secret_for_api008',
      ENVIRONMENT: 'development'
    };
  });

  describe('1. Narrowed Health Liveness Endpoint (/api/v1/health & /api/health)', () => {
    it('should respond with HTTP 200 and ONLY status UP and timestamp according to tasks.md contract', async () => {
      const req = new Request('http://localhost/api/v1/health');
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('UP');
      expect(typeof body.data.timestamp).toBe('number');

      // Verify narrowed payload: NO bindings, service, environment or internal architecture details!
      expect(body.data.bindings).toBeUndefined();
      expect(body.data.service).toBeUndefined();
      expect(body.data.environment).toBeUndefined();
    });

    it('should support legacy alias route /api/health identically', async () => {
      const req = new Request('http://localhost/api/health');
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('UP');
      expect(typeof body.data.timestamp).toBe('number');
    });

    it('should cache 200 health responses in KV for 10 seconds when available', async () => {
      const req1 = new Request('http://localhost/api/v1/health');
      const res1 = await handleRequest(req1, env);
      expect(res1.status).toBe(200);

      const cached = await mockKv.get('health:v1:liveness', 'json');
      expect(cached).toBeDefined();
      expect((cached as any).status).toBe('UP');

      // 2nd request reads from cache
      const req2 = new Request('http://localhost/api/v1/health');
      const res2 = await handleRequest(req2, env);
      expect(res2.status).toBe(200);
    });
  });

  describe('2. Readiness Endpoint (/api/v1/readiness & /api/readiness)', () => {
    it('should return HTTP 200 and status READY when D1 SELECT 1 and R2 list succeed', async () => {
      const req = new Request('http://localhost/api/v1/readiness');
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('READY');
      expect(body.data.checks.d1).toBe('UP');
      expect(body.data.checks.r2).toBe('UP');
    });

    it('should return HTTP 503 SERVICE_UNAVAILABLE when D1 query fails and mask internal errors safely', async () => {
      mockDb.shouldFail = true;

      const req = new Request('http://localhost/api/v1/readiness');
      const res = await handleRequest(req, env);
      expect(res.status).toBe(503);

      const body: any = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(body.error.details.status).toBe('DOWN');
      expect(body.error.details.checks.d1).toBe('DOWN');

      // Ensure NO sensitive SQL path or stack trace is leaked!
      const rawText = JSON.stringify(body);
      expect(rawText).not.includes('/var/internal/sqlite.db');
      expect(rawText).not.includes('Simulated Failure');
    });

    it('should return HTTP 503 when R2 list operation fails (read-only real R2 check)', async () => {
      r2ShouldFail = true;

      const req = new Request('http://localhost/api/v1/readiness');
      const res = await handleRequest(req, env);
      expect(res.status).toBe(503);

      const body: any = await res.json();
      expect(body.error.details.checks.r2).toBe('DOWN');
    });

    it('should return HTTP 503 when R2 binding is completely missing', async () => {
      const envNoR2 = { ...env, MEDIA: undefined as any };

      const req = new Request('http://localhost/api/v1/readiness');
      const res = await handleRequest(req, envNoR2);
      expect(res.status).toBe(503);

      const body: any = await res.json();
      expect(body.error.details.checks.r2).toBe('DOWN');
    });

    it('should safely log HEALTH_CHECK_FAILED event in admin_audit_logs when D1 is UP but R2 is DOWN, without crashing if D1 is DOWN', async () => {
      // Scenario A: R2 DOWN, D1 UP -> logs HEALTH_CHECK_FAILED to D1
      r2ShouldFail = true;
      const req1 = new Request('http://localhost/api/v1/readiness');
      const res1 = await handleRequest(req1, env);
      expect(res1.status).toBe(503);

      const audit = mockDb.auditLogs.find(a => a.action === 'HEALTH_CHECK_FAILED');
      expect(audit).toBeDefined();
      expect(audit.details_json).includes('"r2":"DOWN"');

      // Scenario B: D1 DOWN -> skips D1 audit log write safely without secondary crash
      mockDb.shouldFail = true;
      const req2 = new Request('http://localhost/api/v1/readiness');
      const res2 = await handleRequest(req2, env);
      expect(res2.status).toBe(503); // Still returns clean 503 without throwing unhandled exception
    });
  });

  describe('3. Rate Limiting (120 req/min)', () => {
    it('should enforce IP-based 120 req/min rate limit using checkRateLimit and return HTTP 429 after 120 requests', async () => {
      const makeReq = () =>
        new Request('http://localhost/api/v1/health', {
          headers: { 'CF-Connecting-IP': '198.51.100.99' }
        });

      for (let i = 0; i < 120; i++) {
        const res = await handleRequest(makeReq(), env);
        expect(res.status).toBe(200);
      }

      const blockedRes = await handleRequest(makeReq(), env);
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get('Retry-After')).toBeDefined();

      const body: any = await blockedRes.json();
      expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    });
  });
});
