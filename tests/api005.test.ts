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
  public subscribers: any[] = [];
  public broadcasts: any[] = [];
  public emailQueue: any[] = [];
  public auditLogs: any[] = [];
  public adminSessions: any[] = [];

  constructor() {
    this.seed();
  }

  public seed() {
    this.subscribers = [
      { id: 1, email: 'active1@example.com', is_active: 1, is_verified: 1, unsubscribe_token: 'unsub_token_1' },
      { id: 2, email: 'active2@example.com', is_active: 1, is_verified: 0, unsubscribe_token: 'unsub_token_2' },
      { id: 3, email: 'inactive@example.com', is_active: 0, is_verified: 1, unsubscribe_token: 'unsub_token_3' }
    ];
    this.broadcasts = [];
    this.emailQueue = [];
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
      async first() {
        if (query.includes('FROM admin_sessions')) {
          const tokenHash = boundParams[0];
          const session = self.adminSessions.find(s => s.token_hash === tokenHash);
          if (session) {
            return {
              session_id: session.id,
              admin_id: session.admin_id,
              username: session.username,
              role: session.role,
              is_active: 1
            };
          }
          return null;
        }
        return null;
      },
      async all() {
        if (query.includes('FROM subscribers')) {
          let list = self.subscribers.filter(s => s.is_active === 1);
          if (query.includes('is_verified = 1')) {
            list = list.filter(s => s.is_verified === 1);
          }
          return { results: list };
        }
        return { results: [] };
      },
      async run() {
        if (query.includes('INSERT INTO broadcasts')) {
          const broadcast = {
            id: self.broadcasts.length + 1,
            subject: boundParams[0],
            content_html: boundParams[1],
            target_segment: boundParams[2],
            total_recipients: boundParams[3],
            status: 'QUEUED',
            created_at: new Date().toISOString()
          };
          self.broadcasts.push(broadcast);
          return { meta: { last_row_id: broadcast.id } };
        }

        if (query.includes('INSERT INTO email_queue')) {
          const queueItem = {
            id: self.emailQueue.length + 1,
            recipient_email: boundParams[0],
            subject: boundParams[1],
            html_body: boundParams[2],
            status: 'PENDING'
          };
          self.emailQueue.push(queueItem);
          return { meta: { last_row_id: queueItem.id } };
        }

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

describe('API-005 — Admin Broadcast API Tests', () => {
  const jwtSecret = 'test_jwt_secret_key_for_api005_testing_12345';
  let mockDb: MockD1Database;
  let mockKv: MockKV;
  let superAdminToken: string;
  let editorToken: string;
  let env: Env;

  beforeEach(async () => {
    resetRateLimitStoresForTest();
    mockDb = new MockD1Database();
    mockKv = new MockKV();

    superAdminToken = await generateToken({ admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' }, jwtSecret);
    editorToken = await generateToken({ admin_id: 2, username: 'editor', role: 'EDITOR' }, jwtSecret);

    const superAdminHash = await hashToken(superAdminToken);
    const editorHash = await hashToken(editorToken);

    mockDb.adminSessions.push(
      { id: 1, admin_id: 1, username: 'admin', role: 'SUPER_ADMIN', token_hash: superAdminHash },
      { id: 2, admin_id: 2, username: 'editor', role: 'EDITOR', token_hash: editorHash }
    );

    env = {
      DB: mockDb as any,
      IDEMPOTENCY_STORE: mockKv as any,
      MEDIA: {} as any,
      JWT_SECRET: jwtSecret,
      ENVIRONMENT: 'development'
    };
  });

  describe('1. Auth & RBAC Security Controls', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': 'broadcast_idemp_key_1001' }
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(401);

      const body: any = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject unauthorized role (EDITOR without settings.manage) with 403 FORBIDDEN', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${editorToken}`,
          'X-Idempotency-Key': 'broadcast_idemp_key_1002'
        },
        body: JSON.stringify({
          subject: 'Yeni Bülten',
          contentHtml: '<p>Merhaba arkadaşlar, güncellemelerimiz yayında.</p>',
          confirm: true
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(403);

      const body: any = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should allow authorized admin (SUPER_ADMIN) with valid token', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_idemp_key_1003'
        },
        body: JSON.stringify({
          subject: 'Yeni Sürüm Yayınlandı',
          contentHtml: '<p>Sistem güncellemelerimiz tamamlandı.</p>',
          confirm: true
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(202);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('QUEUED');
      expect(body.data.broadcastId).toBeDefined();
    });
  });

  describe('2. Mandatory Idempotency Header Enforcement', () => {
    it('should reject request missing X-Idempotency-Key with 400 INVALID_IDEMPOTENCY_KEY', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`
        },
        body: JSON.stringify({
          subject: 'Test Başlık',
          contentHtml: '<p>Detaylı metin içeriği buradadır.</p>',
          confirm: true
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(400);

      const body: any = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_IDEMPOTENCY_KEY');
    });
  });

  describe('3. Rate Limiting (2 req/min)', () => {
    it('should enforce 2 req/min rate limit and return 429 TOO_MANY_REQUESTS on 3rd attempt', async () => {
      // Req 1
      const req1 = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_rate_key_0001'
        },
        body: JSON.stringify({
          subject: 'Broadcast 1',
          contentHtml: '<p>İçerik 1 detayları buradadır.</p>',
          confirm: true
        })
      });
      const res1 = await handleRequest(req1, env);
      expect(res1.status).toBe(202);

      // Req 2
      const req2 = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_rate_key_0002'
        },
        body: JSON.stringify({
          subject: 'Broadcast 2',
          contentHtml: '<p>İçerik 2 detayları buradadır.</p>',
          confirm: true
        })
      });
      const res2 = await handleRequest(req2, env);
      expect(res2.status).toBe(202);

      // Req 3 (Exceeds 2 req/min limit)
      const req3 = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_rate_key_0003'
        },
        body: JSON.stringify({
          subject: 'Broadcast 3',
          contentHtml: '<p>İçerik 3 detayları buradadır.</p>',
          confirm: true
        })
      });
      const res3 = await handleRequest(req3, env);
      expect(res3.status).toBe(429);
      expect(res3.headers.get('Retry-After')).toBeDefined();

      const body3: any = await res3.json();
      expect(body3.error.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('4. Confirmation & Double Confirmation Check', () => {
    it('should require confirmation (confirm: true or X-Broadcast-Confirm header)', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_confirm_key_01'
        },
        body: JSON.stringify({
          subject: 'Onaysız Duyuru',
          contentHtml: '<p>Onay verilmeyen toplu e-posta.</p>',
          confirm: false
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(400);

      const body: any = await res.json();
      expect(body.error.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('should accept broadcast with X-Broadcast-Confirm: true header', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_confirm_key_02',
          'X-Broadcast-Confirm': 'true'
        },
        body: JSON.stringify({
          subject: 'Header Onaylı Duyuru',
          contentHtml: '<p>Header üzerinden onay verilen e-posta.</p>'
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(202);
    });
  });

  describe('5. Input Validation & Content Sanitization', () => {
    it('should reject short subject (<3 chars) with 400 VALIDATION_ERROR', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_val_key_01'
        },
        body: JSON.stringify({
          subject: 'A',
          contentHtml: '<p>Uzun metin içeriği buradadır.</p>',
          confirm: true
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(400);

      const body: any = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize XSS tags (<script>, onerror) in contentHtml and append Unsubscribe link', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_val_key_02'
        },
        body: JSON.stringify({
          subject: 'GÜVENLİK TESTİ',
          contentHtml: '<div>Duyuru Metni<script>alert("xss")</script><img src="x" onerror="alert(1)"/></div>',
          confirm: true
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(202);

      const broadcast = mockDb.broadcasts[0];
      expect(broadcast).toBeDefined();
      expect(broadcast.content_html).not.includes('<script>');
      expect(broadcast.content_html).not.includes('onerror=');
      expect(broadcast.content_html).includes('Unsubscribe');
    });
  });

  describe('6. Target Segment & Active Subscriber Filtering', () => {
    it('should include all active subscribers when targetSegment is ALL', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_seg_key_01'
        },
        body: JSON.stringify({
          subject: 'Tüm Aboneler',
          contentHtml: '<p>Tüm abonelerimize özel duyurumuzdur.</p>',
          targetSegment: 'ALL',
          confirm: true
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(202);

      const body: any = await res.json();
      expect(body.data.totalRecipients).toBe(2); // active1 and active2, inactive is excluded!
      expect(mockDb.emailQueue.length).toBe(2);
    });

    it('should include only verified active subscribers when targetSegment is VERIFIED_ONLY', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_seg_key_02'
        },
        body: JSON.stringify({
          subject: 'Doğrulanmış Aboneler',
          contentHtml: '<p>Sadece doğrulanmış abonelere duyuru.</p>',
          targetSegment: 'VERIFIED_ONLY',
          confirm: true
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(202);

      const body: any = await res.json();
      expect(body.data.totalRecipients).toBe(1); // active1 only
      expect(mockDb.emailQueue.length).toBe(1);
    });
  });

  describe('7. Idempotency Standard (A/B Scenarios)', () => {
    it('Scenario A: Same Key + Same Body should replay 202 Accepted without duplicate DB queue side-effects', async () => {
      const idempotencyKey = 'broadcast_idemp_scenario_a_key_100';
      const payload = {
        subject: 'Aynı Anahtar Testi A',
        contentHtml: '<p>Birinci istek ile gönderilen toplu e-posta.</p>',
        confirm: true
      };

      // Req 1
      const req1 = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });
      const res1 = await handleRequest(req1, env);
      expect(res1.status).toBe(202);
      const body1: any = await res1.json();
      expect(mockDb.broadcasts.length).toBe(1);

      // Req 2 (Same key + Same body)
      const req2 = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });
      const res2 = await handleRequest(req2, env);
      expect(res2.status).toBe(202);
      const body2: any = await res2.json();

      expect(body2).toEqual(body1);
      expect(mockDb.broadcasts.length).toBe(1); // No duplicate DB write
    });

    it('Scenario B: Same Key + Different Body should return 422 IDEMPOTENCY_PAYLOAD_MISMATCH', async () => {
      const idempotencyKey = 'broadcast_idemp_scenario_b_key_200';

      // Req 1
      const req1 = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          subject: 'Orijinal Başlık',
          contentHtml: '<p>Orijinal duyuru metni.</p>',
          confirm: true
        })
      });
      const res1 = await handleRequest(req1, env);
      expect(res1.status).toBe(202);

      // Req 2 (Same key + DIFFERENT body)
      const req2 = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          subject: 'Farklı Başlık',
          contentHtml: '<p>Farklı duyuru metni.</p>',
          confirm: true
        })
      });
      const res2 = await handleRequest(req2, env);
      expect(res2.status).toBe(422);

      const body2: any = await res2.json();
      expect(body2.success).toBe(false);
      expect(body2.error.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
    });
  });

  describe('8. Audit Logging', () => {
    it('should record BROADCAST_CREATED audit event in admin_audit_logs without leaking PII emails', async () => {
      const req = new Request('http://localhost/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'X-Idempotency-Key': 'broadcast_audit_key_001'
        },
        body: JSON.stringify({
          subject: 'Audit Log Testi',
          contentHtml: '<p>Audit log detayları inceleniyor.</p>',
          confirm: true
        })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(202);

      const audit = mockDb.auditLogs.find(a => a.action === 'BROADCAST_CREATED');
      expect(audit).toBeDefined();
      expect(audit.resource).toBe('/api/v1/admin/broadcast');
      expect(audit.details_json).not.includes('@example.com'); // No PII subscriber emails in audit!
    });
  });
});
