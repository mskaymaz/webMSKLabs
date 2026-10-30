import { describe, it, expect, beforeEach } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { generateToken, hashToken } from '../src/utils/crypto.js';
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
  public coupons: any[] = [];
  public auditLogs: any[] = [];
  public adminSessions: any[] = [];

  constructor() {
    this.seed();
  }

  public seed() {
    this.coupons = [
      {
        id: 1,
        code: 'WELCOME10',
        discount_amount: 10,
        discount_percent: 10,
        discount_type: 'PERCENTAGE',
        max_uses: 100,
        current_uses: 5,
        assigned_email: null,
        is_used: 0,
        expires_at: '2026-12-31T23:59:59.000Z',
        created_at: '2026-01-01T00:00:00.000Z'
      }
    ];
    this.auditLogs = [];
    this.adminSessions = [];
  }

  prepare(query: string) {
    const self = this;
    let boundParams: any[] = [];

    return {
      bind(...params: any[]) {
        boundParams = params;
        return this;
      },

      async first<T = any>(): Promise<T | null> {
        if (query.includes('FROM admin_sessions')) {
          const tokenHash = boundParams[0];
          const session = self.adminSessions.find((s) => s.token_hash === tokenHash);
          if (session) {
            return {
              session_id: session.id,
              admin_id: session.admin_id,
              username: session.username,
              role: session.role,
              is_active: 1
            } as any;
          }
          return null;
        }

        if (query.includes('COUNT(*) as total FROM coupons')) {
          return { total: self.coupons.length } as any;
        }

        if (query.includes('SELECT * FROM coupons WHERE id =')) {
          const id = boundParams[0];
          return (self.coupons.find((c) => c.id === id) || null) as any;
        }

        if (query.includes('SELECT * FROM coupons WHERE code =')) {
          const code = boundParams[0];
          return (self.coupons.find((c) => c.code === code) || null) as any;
        }

        return null;
      },

      async all() {
        if (query.includes('FROM coupons')) {
          return { results: [...self.coupons].reverse() };
        }
        return { results: [] };
      },

      async run() {
        if (query.includes('INSERT INTO coupons')) {
          const code = boundParams[0];
          const discountAmount = boundParams[1];
          const discountPercent = boundParams[2];
          const discountType = boundParams[3];
          const maxUses = boundParams[4];
          const assignedEmail = boundParams[5];
          const expiresAt = boundParams[6];

          if (self.coupons.some((c) => c.code === code)) {
            throw new Error('UNIQUE constraint failed: coupons.code');
          }

          const newId = self.coupons.length > 0 ? Math.max(...self.coupons.map((c) => c.id)) + 1 : 1;
          const newCoupon = {
            id: newId,
            code,
            discount_amount: discountAmount,
            discount_percent: discountPercent,
            discount_type: discountType,
            max_uses: maxUses,
            current_uses: 0,
            assigned_email: assignedEmail,
            is_used: 0,
            expires_at: expiresAt,
            created_at: new Date().toISOString()
          };

          self.coupons.push(newCoupon);
          return { success: true, meta: { last_row_id: newId } };
        }

        if (query.includes('INSERT INTO admin_audit_logs')) {
          self.auditLogs.push({
            id: self.auditLogs.length + 1,
            admin_id: boundParams[0],
            action: boundParams[1],
            resource: boundParams[2],
            details_json: boundParams[3],
            ip_address: boundParams[4]
          });
          return { success: true, meta: { last_row_id: self.auditLogs.length } };
        }

        if (query.includes('DELETE FROM coupons')) {
          const id = boundParams[0];
          self.coupons = self.coupons.filter((c) => c.id !== id);
          return { success: true, meta: {} };
        }

        return { success: true, meta: {} };
      }
    };
  }
}

describe('API-009 — Admin Kupon API Tests', () => {
  const jwtSecret = 'test_jwt_secret_key_for_api009_testing_12345';
  let mockEnv: Env;
  let mockDb: MockD1Database;
  let mockKv: MockKV;
  let superAdminToken: string;
  let supportToken: string;

  beforeEach(async () => {
    resetRateLimitStoresForTest();
    mockDb = new MockD1Database();
    mockKv = new MockKV();

    superAdminToken = await generateToken({ admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' }, jwtSecret);
    supportToken = await generateToken({ admin_id: 2, username: 'supportuser', role: 'SUPPORT' }, jwtSecret);

    const superAdminHash = await hashToken(superAdminToken);
    const supportHash = await hashToken(supportToken);

    mockDb.adminSessions.push(
      { id: 1, admin_id: 1, username: 'admin', role: 'SUPER_ADMIN', token_hash: superAdminHash },
      { id: 2, admin_id: 2, username: 'supportuser', role: 'SUPPORT', token_hash: supportHash }
    );

    mockEnv = {
      DB: mockDb as any,
      IDEMPOTENCY_STORE: mockKv as any,
      JWT_SECRET: jwtSecret,
      ENVIRONMENT: 'development'
    } as any;
  });

  describe('1. Authentication & RBAC Controls', () => {
    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'GET'
      });
      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('should return 403 Forbidden when accessed by SUPPORT role without settings.manage permission', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${supportToken}`
        }
      });
      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.message).toContain('yetkiniz bulunmamaktadır');
    });

    it('should allow GET coupons for SUPER_ADMIN role', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${superAdminToken}`
        }
      });
      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].code).toBe('WELCOME10');
    });
  });

  describe('2. POST /api/v1/admin/coupons (Create Coupon)', () => {
    it('should create a new valid coupon and write COUPON_CREATED audit log', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': 'key-create-coupon-valid-1234'
        },
        body: JSON.stringify({
          code: 'tesekkur2026',
          discountPercent: 20,
          maxUses: 50,
          expiresAt: '2026-12-31T23:59:59.000Z'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(201);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.data.code).toBe('TESEKKUR2026');
      expect(body.data.discountPercent).toBe(20);
      expect(body.data.maxUses).toBe(50);
      expect(body.data.couponId).toBeDefined();

      // Verify D1 insert
      const inserted = mockDb.coupons.find((c) => c.code === 'TESEKKUR2026');
      expect(inserted).toBeDefined();
      expect(inserted.max_uses).toBe(50);

      // Verify Audit Log
      const audit = mockDb.auditLogs.find((l) => l.action === 'COUPON_CREATED');
      expect(audit).toBeDefined();
      expect(audit.resource).toContain('coupon:');
    });

    it('should reject creation when coupon code already exists with 409 Conflict', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'WELCOME10',
          discountPercent: 15,
          maxUses: 100,
          expiresAt: '2026-12-31T23:59:59.000Z'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.message).toContain('zaten mevcuttur');
    });

    it('should reject short code (< 4 chars) with 400 Bad Request', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'ABC',
          discountPercent: 10,
          expiresAt: '2026-12-31T23:59:59.000Z'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.message).toContain('4-20 karakter');
    });

    it('should reject invalid discount percent (> 100) with 400 Bad Request', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'BIGDISCOUNT',
          discountPercent: 150,
          expiresAt: '2026-12-31T23:59:59.000Z'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.message).toContain('1 ile 100 arasında');
    });

    it('should reject invalid expiration date in the past with 400 Bad Request', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'PASTCODE',
          discountPercent: 10,
          expiresAt: '2020-01-01T00:00:00.000Z'
        })
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.message).toContain('gelecekte bir tarih');
    });
  });

  describe('3. DELETE /api/v1/admin/coupons/:id (Delete Coupon)', () => {
    it('should delete existing coupon and log COUPON_DELETED audit event', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons/1', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${superAdminToken}`
        }
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('silindi');

      // Verify D1 deletion
      expect(mockDb.coupons.find((c) => c.id === 1)).toBeUndefined();

      // Verify Audit Log
      const audit = mockDb.auditLogs.find((l) => l.action === 'COUPON_DELETED');
      expect(audit).toBeDefined();
    });

    it('should return 404 Not Found when attempting to delete non-existent coupon', async () => {
      const req = new Request('http://localhost/api/v1/admin/coupons/99999', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${superAdminToken}`
        }
      });

      const res = await handleRequest(req, mockEnv);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.message).toContain('Kupon bulunamadı');
    });
  });

  describe('4. Idempotency & Rate Limit', () => {
    it('should replay cached response on duplicate request with same X-Idempotency-Key', async () => {
      const idempotencyKey = 'key-coupon-replay-test-12345';
      const makeReq = () =>
        new Request('http://localhost/api/v1/admin/coupons', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            code: 'IDEMPOTENT1',
            discountPercent: 15,
            expiresAt: '2026-12-31T23:59:59.000Z'
          })
        });

      const res1 = await handleRequest(makeReq(), mockEnv);
      expect(res1.status).toBe(201);

      const res2 = await handleRequest(makeReq(), mockEnv);
      expect(res2.status).toBe(201);
      const body2 = await res2.json();
      expect(body2.data.code).toBe('IDEMPOTENT1');

      // Ensure only 1 record was created in DB
      const matches = mockDb.coupons.filter((c) => c.code === 'IDEMPOTENT1');
      expect(matches).toHaveLength(1);
    });

    it('should return 422 IDEMPOTENCY_PAYLOAD_MISMATCH when same key is used with different body', async () => {
      const idempotencyKey = 'key-coupon-mismatch-test-12345';

      const req1 = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          code: 'ORIGINAL1',
          discountPercent: 15,
          expiresAt: '2026-12-31T23:59:59.000Z'
        })
      });

      const res1 = await handleRequest(req1, mockEnv);
      expect(res1.status).toBe(201);

      const req2 = new Request('http://localhost/api/v1/admin/coupons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          code: 'DIFFERENT2',
          discountPercent: 25,
          expiresAt: '2026-12-31T23:59:59.000Z'
        })
      });

      const res2 = await handleRequest(req2, mockEnv);
      expect(res2.status).toBe(422);
      const body2 = await res2.json();
      expect(body2.error.message).toContain('farklı istek gövdesi');
    });
  });
});
