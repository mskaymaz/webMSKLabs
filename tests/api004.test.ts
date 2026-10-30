import { describe, it, expect, beforeEach } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { generateToken, hashToken } from '../src/utils/crypto.js';
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
  public messages: Map<string, any> = new Map();
  public replies: any[] = [];
  public messageEvents: any[] = [];
  public comments: Map<number, any> = new Map();
  public auditLogs: any[] = [];
  public adminSessions: any[] = [];

  constructor() {
    this.seed();
  }

  public seed() {
    this.messages.clear();
    this.replies = [];
    this.messageEvents = [];
    this.comments.clear();
    this.auditLogs = [];
    this.adminSessions = [];

    this.messages.set('MSK-2026-TEST1', {
      id: 'MSK-2026-TEST1',
      name: 'Test Kullanıcısı',
      email: 'testuser@example.com',
      subject: 'Test Konu',
      message: 'Detaylı test mesajı içeriği.',
      status: 'NEW',
      urgency: 'HIGH',
      category: 'TECHNICAL',
      created_at: '2026-10-07T10:00:00Z',
      updated_at: '2026-10-07T10:00:00Z'
    });

    this.messages.set('MSK-2026-TEST2', {
      id: 'MSK-2026-TEST2',
      name: 'İkinci Kullanıcı',
      email: 'user2@example.com',
      subject: 'Fatura İtirazı',
      message: 'Faturamda yanlışlık var.',
      status: 'IN_PROGRESS',
      urgency: 'NORMAL',
      category: 'BILLING',
      created_at: '2026-10-07T11:00:00Z',
      updated_at: '2026-10-07T11:00:00Z'
    });

    this.comments.set(101, {
      id: 101,
      post_slug: 'test-yazisi',
      author_name: 'Ahmet Yazar',
      author_email: 'ahmet@example.com',
      comment_text: 'Test yorumu metni buradadır.',
      status: 'PENDING',
      created_at: '2026-10-07T12:00:00Z'
    });

    this.comments.set(102, {
      id: 102,
      post_slug: 'test-yazisi',
      author_name: 'Mehmet Yazar',
      author_email: 'mehmet@example.com',
      comment_text: 'İkinci onaylı yorum.',
      status: 'APPROVED',
      created_at: '2026-10-07T13:00:00Z'
    });
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

        if (query.includes('FROM messages') && query.includes('WHERE id = ?')) {
          const id = boundParams[0];
          return self.messages.get(id) || null;
        }

        if (query.includes('FROM comments') && (query.includes('WHERE id = ?') || query.includes('WHERE id = ? OR id = ?'))) {
          const id = boundParams[0];
          const strId = String(id);
          const numId = strId.startsWith('c_') ? parseInt(strId.substring(2), 10) : parseInt(strId, 10);
          return self.comments.get(numId) || self.comments.get(id) || null;
        }

        return null;
      },
      async all() {
        if (query.includes('FROM messages')) {
          let list = Array.from(self.messages.values());

          if (query.includes('status = ?')) {
            const statusParam = boundParams[0];
            list = list.filter(m => m.status === statusParam);
          }

          if (query.includes('id < ?')) {
            const cursorParam = boundParams[boundParams.length - 2] || boundParams[0];
            list = list.filter(m => m.id < cursorParam);
          }

          return { results: list };
        }

        if (query.includes('FROM replies')) {
          const msgId = boundParams[0];
          const list = self.replies.filter(r => r.message_id === msgId);
          return { results: list };
        }

        if (query.includes('FROM message_events')) {
          const msgId = boundParams[0];
          const list = self.messageEvents.filter(e => e.message_id === msgId);
          return { results: list };
        }

        if (query.includes('FROM comments')) {
          let list = Array.from(self.comments.values());
          if (query.includes('status = ?')) {
            const statusParam = boundParams[0];
            list = list.filter(c => c.status === statusParam);
          }
          return { results: list };
        }

        return { results: [] };
      },
      async run() {
        if (query.includes('INSERT INTO replies')) {
          const [message_id, sender_type, reply_text] = boundParams;
          const reply = { id: self.replies.length + 1, message_id, sender_type, reply_text, created_at: new Date().toISOString() };
          self.replies.push(reply);
          return { meta: { last_row_id: reply.id } };
        }

        if (query.includes('UPDATE messages SET status = ?') || query.includes('UPDATE messages\n    SET status = ?')) {
          const [status, urgency, category, id] = boundParams.length === 4 ? boundParams : [boundParams[0], null, null, boundParams[1]];
          const targetId = id || boundParams[boundParams.length - 1];
          const msg = self.messages.get(targetId);
          if (msg) {
            msg.status = status;
            if (urgency) msg.urgency = urgency;
            if (category) msg.category = category;
            msg.updated_at = new Date().toISOString();
          }
          return { meta: { changes: 1 } };
        }

        if (query.includes('DELETE FROM messages')) {
          const id = boundParams[0];
          self.messages.delete(id);
          return { meta: { changes: 1 } };
        }

        if (query.includes('DELETE FROM replies')) {
          const id = boundParams[0];
          self.replies = self.replies.filter(r => r.message_id !== id);
          return { meta: { changes: 1 } };
        }

        if (query.includes('DELETE FROM message_events')) {
          const id = boundParams[0];
          self.messageEvents = self.messageEvents.filter(e => e.message_id !== id);
          return { meta: { changes: 1 } };
        }

        if (query.includes('UPDATE comments SET status = ?')) {
          const status = boundParams[0];
          const id = boundParams[1];
          const strId = String(id);
          const numId = strId.startsWith('c_') ? parseInt(strId.substring(2), 10) : parseInt(strId, 10);
          const comment = self.comments.get(numId);
          if (comment) {
            comment.status = status;
          }
          return { meta: { changes: 1 } };
        }

        if (query.includes('DELETE FROM comments')) {
          const id = boundParams[0];
          const strId = String(id);
          const numId = strId.startsWith('c_') ? parseInt(strId.substring(2), 10) : parseInt(strId, 10);
          self.comments.delete(numId);
          return { meta: { changes: 1 } };
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

        if (query.includes('INSERT INTO message_events')) {
          self.messageEvents.push({
            id: self.messageEvents.length + 1,
            message_id: boundParams[0],
            event_type: boundParams[1],
            actor: boundParams[2],
            metadata: boundParams[3]
          });
          return { meta: { last_row_id: self.messageEvents.length } };
        }

        return { meta: {} };
      }
    };
  }
}

describe('API-004 — Admin Messages & Comments Operations API Tests', () => {
  const jwtSecret = 'test_jwt_secret_key_for_api004_testing_12345';
  let mockDb: MockD1Database;
  let mockKv: MockKV;
  let superAdminToken: string;
  let editorToken: string;
  let env: Env;

  beforeEach(async () => {
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
    it('should reject unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages', { method: 'GET' });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(401);

      const body: any = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject unauthorized role without permission with 403 FORBIDDEN', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages', {
        method: 'GET',
        headers: { Authorization: `Bearer ${editorToken}` }
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(403);

      const body: any = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should allow authorized admin with valid permission', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages', {
        method: 'GET',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('2. Support Messages / Tickets API', () => {
    it('should list messages with cursor pagination metadata', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages?limit=10', {
        method: 'GET',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.meta).toBeDefined();
      expect(body.meta.hasMore).toBeDefined();
    });

    it('should get message details including replies and events', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('MSK-2026-TEST1');
      expect(Array.isArray(body.data.replies)).toBe(true);
    });

    it('should return 404 NOT_FOUND when getting non-existent message ID', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages/MSK-2026-NONEXISTENT', {
        method: 'GET',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(404);

      const body: any = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should update message status and urgency with validation', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST1', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'IN_PROGRESS', urgency: 'CRITICAL' })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('IN_PROGRESS');
      expect(body.data.urgency).toBe('CRITICAL');
    });

    it('should return 400 VALIDATION_ERROR on invalid status value', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST1', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'INVALID_STATUS' })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(400);

      const body: any = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reply to support ticket and update status to RESOLVED', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST1/reply', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ replyContent: 'Sorununuz çözülmüştür, iyi günler.' })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('RESOLVED');
      expect(mockDb.replies.length).toBe(1);
    });

    it('should reject short reply content (<5 chars) with 400 VALIDATION_ERROR', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST1/reply', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ replyContent: 'Kısa' })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(400);

      const body: any = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should delete support message and record audit log', async () => {
      const req = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST2', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
      expect(mockDb.messages.has('MSK-2026-TEST2')).toBe(false);

      const audit = mockDb.auditLogs.find(a => a.action === 'ADMIN_MESSAGE_DELETED');
      expect(audit).toBeDefined();
    });
  });

  describe('3. Admin Comments API', () => {
    it('should list comments for admin panel', async () => {
      const req = new Request('http://localhost/api/v1/admin/comments', {
        method: 'GET',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should approve comment via PATCH /comments/:id/status', async () => {
      const req = new Request('http://localhost/api/v1/admin/comments/c_101/status', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'APPROVED' })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('APPROVED');

      const audit = mockDb.auditLogs.find(a => a.action === 'ADMIN_COMMENT_APPROVED');
      expect(audit).toBeDefined();
    });

    it('should approve comment via isApproved boolean payload', async () => {
      const req = new Request('http://localhost/api/v1/admin/comments/c_101', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isApproved: true })
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('APPROVED');
    });

    it('should delete comment via DELETE /comments/:id', async () => {
      const req = new Request('http://localhost/api/v1/admin/comments/c_102', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      const res = await handleRequest(req, env);
      expect(res.status).toBe(200);

      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
      expect(mockDb.comments.has(102)).toBe(false);

      const audit = mockDb.auditLogs.find(a => a.action === 'ADMIN_COMMENT_DELETED');
      expect(audit).toBeDefined();
    });
  });

  describe('4. Idempotency Standard (A/B Scenarios)', () => {
    it('Scenario A: Same Key + Same Body should replay saved response without duplicated side-effects', async () => {
      const idempotencyKey = 'api004_idemp_key_1234567890';
      const requestPayload = { replyContent: 'Aynı anahtar ile birinci yanıt metni.' };

      // Request 1
      const req1 = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST1/reply', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(requestPayload)
      });
      const res1 = await handleRequest(req1, env);
      expect(res1.status).toBe(200);
      const body1: any = await res1.json();
      expect(mockDb.replies.length).toBe(1);

      // Request 2 with SAME key and SAME body
      const req2 = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST1/reply', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(requestPayload)
      });
      const res2 = await handleRequest(req2, env);
      expect(res2.status).toBe(200);
      const body2: any = await res2.json();

      expect(body2).toEqual(body1);
      // DB count remains 1 (no duplicate side-effect)
      expect(mockDb.replies.length).toBe(1);
    });

    it('Scenario B: Same Key + Different Body should return 422 IDEMPOTENCY_PAYLOAD_MISMATCH', async () => {
      const idempotencyKey = 'api004_mismatch_key_1234567890';

      // Request 1
      const req1 = new Request('http://localhost/api/v1/admin/comments/c_101/status', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ status: 'APPROVED' })
      });
      const res1 = await handleRequest(req1, env);
      expect(res1.status).toBe(200);

      // Request 2 with SAME key but DIFFERENT body
      const req2 = new Request('http://localhost/api/v1/admin/comments/c_101/status', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ status: 'REJECTED' })
      });
      const res2 = await handleRequest(req2, env);
      expect(res2.status).toBe(422);

      const body2: any = await res2.json();
      expect(body2.success).toBe(false);
      expect(body2.error.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
    });
  });
});
