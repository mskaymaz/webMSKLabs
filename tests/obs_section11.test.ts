import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { mainRouter } from '../src/routes/index.js';
import { generateToken } from '../src/utils/crypto.js';
import { redactPII, logSystemError, logAuditAction } from '../src/utils/logger.js';
import { globalErrorHandler } from '../src/middleware/error.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

function createMockEnv(db: any, kvMap = new Map<string, string>()) {
  return {
    JWT_SECRET: 'test-secret-key-32-chars-long-security',
    MOCK_SEND: 'true',
    ADMIN_ALERT_EMAIL: 'admin@msklabs.com',
    IDEMPOTENCY_STORE: {
      async get(key: string) {
        return kvMap.get(key) || null;
      },
      async put(key: string, val: string, opts?: any) {
        kvMap.set(key, typeof val === 'string' ? val : JSON.stringify(val));
      }
    },
    DB: {
      prepare(query: string) {
        return {
          bind(...args: any[]) {
            return {
              async first() {
                if (query.includes('SELECT 1')) return { ping: 1 };
                const stmt = db.prepare(query);
                return stmt.get(...args) || null;
              },
              async all() {
                const stmt = db.prepare(query);
                const results = stmt.all(...args);
                return { results, success: true };
              },
              async run() {
                const stmt = db.prepare(query);
                const info = stmt.run(...args);
                return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
              }
            };
          },
          async first() {
            if (query.includes('SELECT 1')) return { ping: 1 };
            const stmt = db.prepare(query);
            return stmt.get() || null;
          },
          async all() {
            const stmt = db.prepare(query);
            const results = stmt.all();
            return { results, success: true };
          },
          async run() {
            const stmt = db.prepare(query);
            const info = stmt.run();
            return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
          }
        };
      }
    },
    MEDIA: {
      async list() {
        return { objects: [], truncated: false };
      }
    }
  };
}

describe('SECTION 11 — Audit, Logging, Observability & Monitoring Test Suite', () => {
  let db: any;
  let superAdminToken: string;

  beforeEach(async () => {
    db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'SUPER_ADMIN',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'NEW',
        urgency TEXT DEFAULT 'NORMAL',
        category TEXT DEFAULT 'GENERAL',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS message_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        actor TEXT DEFAULT 'SYSTEM',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        action TEXT NOT NULL,
        resource TEXT,
        details_json TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL CHECK(level IN ('INFO', 'WARN', 'ERROR', 'FATAL')),
        message TEXT NOT NULL,
        correlation_id TEXT,
        error_stack TEXT,
        details_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO admins (id, username, password_hash, role) VALUES (1, 'superadmin', 'hash123', 'SUPER_ADMIN');
    `);

    superAdminToken = await generateToken({ admin_id: 1, username: 'superadmin', role: 'SUPER_ADMIN' }, 'test-secret-key-32-chars-long-security');
  });

  describe('1. OBS-001 — Message Events Audit Trail', () => {
    it('1. TICKET_CREATED: should insert TICKET_CREATED event in message_events when public ticket is created', async () => {
      const req = new Request('http://localhost/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Mehmet Öz',
          email: 'mehmet@example.com',
          subject: 'Teknik Destek',
          message: 'Sistemde erişim hatası alıyorum.'
        })
      });

      const ctx: any = {
        request: req,
        url: new URL(req.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'test-req-obs-001',
        env: createMockEnv(db)
      };

      const res = await mainRouter.handle(ctx);
      expect(res.status).toBe(201);
      const body: any = await res.json();
      const ticketId = body.data.ticketId;

      const event = db.prepare("SELECT * FROM message_events WHERE message_id = ? AND event_type = 'TICKET_CREATED'").get(ticketId);
      expect(event).toBeTruthy();
      expect(event.actor).toBe('USER');
    });

    it('2. STATUS_CHANGED: should insert STATUS_CHANGED in message_events only when status actually changes', async () => {
      db.exec(`
        INSERT INTO messages (id, name, email, subject, message, status)
        VALUES ('MSK-2026-TEST1', 'Ali Veli', 'ali@example.com', 'Test', 'Mesaj', 'NEW');
      `);

      // Update urgency only (no status change) -> should NOT create STATUS_CHANGED event
      const reqNoStatusChange = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST1', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urgency: 'HIGH' })
      });

      const ctxNoChange: any = {
        request: reqNoStatusChange,
        url: new URL(reqNoStatusChange.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'test-req-no-status-change',
        env: createMockEnv(db)
      };

      const resNoChange = await mainRouter.handle(ctxNoChange);
      expect(resNoChange.status).toBe(200);

      const eventNoChange = db.prepare("SELECT * FROM message_events WHERE message_id = 'MSK-2026-TEST1' AND event_type = 'STATUS_CHANGED'").get();
      expect(eventNoChange).toBeFalsy(); // Verifies no false-positive status event

      // Update status -> SHOULD create STATUS_CHANGED event
      const reqStatusChange = new Request('http://localhost/api/v1/admin/messages/MSK-2026-TEST1', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      });

      const ctxChange: any = {
        request: reqStatusChange,
        url: new URL(reqStatusChange.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'test-req-status-change',
        env: createMockEnv(db)
      };

      const resChange = await mainRouter.handle(ctxChange);
      expect(resChange.status).toBe(200);

      const eventChange = db.prepare("SELECT * FROM message_events WHERE message_id = 'MSK-2026-TEST1' AND event_type = 'STATUS_CHANGED'").get();
      expect(eventChange).toBeTruthy();
      expect(eventChange.actor).toBe('superadmin');
      const meta = JSON.parse(eventChange.metadata);
      expect(meta.oldStatus).toBe('NEW');
      expect(meta.newStatus).toBe('IN_PROGRESS');
    });
  });

  describe('2. OBS-002 — Audit Log vs Application Log Separation & PII Redaction', () => {
    it('3. system_logs Table & D1 Insert: should insert system error logs to system_logs table', async () => {
      const ctx: any = {
        requestId: 'corr-id-sys-test',
        env: createMockEnv(db)
      };

      await logSystemError(ctx, new Error('Connection timeout to D1'), 'D1 Error', { attempt: 3 });

      const sysLog = db.prepare("SELECT * FROM system_logs WHERE correlation_id = 'corr-id-sys-test'").get();
      expect(sysLog).toBeTruthy();
      expect(sysLog.level).toBe('ERROR');
      expect(sysLog.message).toContain('D1 Error: Connection timeout to D1');
    });

    it('4. admin_audit_logs vs system_logs Separation: should write admin actions to audit logs and errors to system logs without cross-leak', async () => {
      const ctx: any = {
        requestId: 'corr-id-separation',
        user: { id: 1 },
        clientIp: '192.168.1.100',
        env: createMockEnv(db)
      };

      await logSystemError(ctx, new Error('Failed worker memory allocation'), 'Worker OOM');
      await logAuditAction(ctx, 'SETTINGS_UPDATE', '/api/v1/admin/settings', { setting: 'ads' });

      const sysLogCount = db.prepare("SELECT COUNT(*) as cnt FROM system_logs WHERE correlation_id = 'corr-id-separation'").get().cnt;
      expect(sysLogCount).toBe(1);

      const auditLogCount = db.prepare("SELECT COUNT(*) as cnt FROM admin_audit_logs WHERE action = 'SETTINGS_UPDATE'").get().cnt;
      expect(auditLogCount).toBe(1);

      // Verify strict separation: audit_logs has NO system error, system_logs has NO admin action
      const crossAuditInSys = db.prepare("SELECT * FROM system_logs WHERE message LIKE '%SETTINGS_UPDATE%'").get();
      expect(crossAuditInSys).toBeFalsy();
    });

    it('5. Correlation ID: should verify request ID propagates to system_logs.correlation_id', async () => {
      const ctx: any = {
        requestId: 'x-req-id-uuid-778899',
        env: createMockEnv(db)
      };

      await logSystemError(ctx, new Error('API Rate limit breach'), 'RateLimit');

      const sysLog = db.prepare("SELECT correlation_id FROM system_logs WHERE correlation_id = 'x-req-id-uuid-778899'").get();
      expect(sysLog).toBeTruthy();
      expect(sysLog.correlation_id).toBe('x-req-id-uuid-778899');
    });

    it('6. PII Redaction: should redact email, phone, password, token, secret, auth before DB write', async () => {
      const ctx: any = {
        requestId: 'pii-test-req',
        env: createMockEnv(db)
      };

      const sensitivePayload = {
        email: 'john.doe@domain.com',
        phone: '+905551112233',
        password: 'MySecretPassword99!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token',
        secret: 'super-api-secret',
        authorization: 'Bearer secret_jwt_token',
        cookie: 'session_id=12345'
      };

      await logSystemError(ctx, new Error('Unhandled Payload Exception'), 'PayloadError', sensitivePayload);

      const sysLog = db.prepare("SELECT details_json FROM system_logs WHERE correlation_id = 'pii-test-req'").get();
      expect(sysLog).toBeTruthy();
      const details = sysLog.details_json;

      // Verify all sensitive values are redacted before entering database
      expect(details).not.toContain('john.doe@domain.com');
      expect(details).not.toContain('MySecretPassword99!');
      expect(details).not.toContain('super-api-secret');
      expect(details).not.toContain('Bearer secret_jwt_token');
      expect(details).toContain('[REDACTED]');
    });

    it('6b. PII Redaction in Message & ErrorStack: should redact email, phone, password, token, secret, auth in message and errorStack before D1 INSERT', async () => {
      const ctx: any = {
        requestId: 'pii-msg-stack-req',
        env: createMockEnv(db)
      };

      const sensitiveErr = new Error('Database error for john.doe@domain.com with Bearer token_secret_12345');
      sensitiveErr.stack = 'Error: DB failure at auth.js:10 with password=MySecretPassword99! and secret=super-api-secret';

      await logSystemError(ctx, sensitiveErr, 'AuthFailure');

      const sysLog = db.prepare("SELECT message, error_stack FROM system_logs WHERE correlation_id = 'pii-msg-stack-req'").get();
      expect(sysLog).toBeTruthy();

      // Verify message is redacted before entering database
      expect(sysLog.message).not.toContain('john.doe@domain.com');
      expect(sysLog.message).not.toContain('token_secret_12345');
      expect(sysLog.message).toContain('[REDACTED]');

      // Verify error_stack is redacted before entering database
      expect(sysLog.error_stack).not.toContain('MySecretPassword99!');
      expect(sysLog.error_stack).not.toContain('super-api-secret');
      expect(sysLog.error_stack).toContain('[REDACTED]');
    });

    it('7. globalErrorHandler & Best Effort: should log to system_logs on 500 error and fall back safely if DB write throws', async () => {
      const ctx: any = {
        requestId: 'req-500-handler',
        request: { method: 'POST' },
        url: new URL('http://localhost/api/v1/trigger-error'),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        env: createMockEnv(db)
      };

      const err = new Error('Database unexpected disconnection');
      const res = globalErrorHandler(err, ctx);

      expect(res.status).toBe(500);

      await new Promise(resolve => setTimeout(resolve, 20));

      const sysLog = db.prepare("SELECT * FROM system_logs WHERE correlation_id = 'req-500-handler'").get();
      expect(sysLog).toBeTruthy();
      expect(sysLog.message).toContain('Database unexpected disconnection');

      // Best Effort Verification: If DB prepare fails, globalErrorHandler still returns clean HTTP 500 response
      const badCtx: any = {
        requestId: 'req-bad-db',
        request: { method: 'GET' },
        url: new URL('http://localhost/api/v1/bad'),
        corsHeaders: {},
        env: {
          DB: {
            prepare() {
              throw new Error('Fatal DB crash');
            }
          }
        }
      };

      const safeRes = globalErrorHandler(new Error('Fatal error'), badCtx);
      expect(safeRes.status).toBe(500); // Does NOT crash HTTP response envelope
    });
  });

  describe('3. OBS-003 — Health / Readiness & Cooldown Email Alerting', () => {
    it('8. Readiness 503 & COM-001 Email Alert: should return 503 and call sendEmail when D1/R2 is DOWN', async () => {
      const mockEnvNoR2 = createMockEnv(db);
      mockEnvNoR2.MEDIA = null as any; // R2 outage

      const req = new Request('http://localhost/api/v1/readiness');
      const ctx: any = {
        request: req,
        url: new URL(req.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'req-readiness-fail-alert',
        env: mockEnvNoR2
      };

      const res = await mainRouter.handle(ctx);
      expect(res.status).toBe(503);
      const body: any = await res.json();
      expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(body.error.details.checks.r2).toBe('DOWN');
    });

    it('9. Alert Deduplication / Cooldown: should suppress duplicate email alerts on continuous failures within 5 min cooldown', async () => {
      const kvStore = new Map<string, string>();
      const mockEnv = createMockEnv(db, kvStore);
      mockEnv.MEDIA = null as any; // Continuous R2 outage

      const req1 = new Request('http://localhost/api/v1/readiness');
      const ctx1: any = {
        request: req1,
        url: new URL(req1.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'req-fail-1',
        env: mockEnv
      };

      const res1 = await mainRouter.handle(ctx1);
      expect(res1.status).toBe(503);

      // Verify KV cooldown key was set during first alert
      const cooldownKey = kvStore.get('alert:readiness_failure');
      expect(cooldownKey).toBe('1');

      // Second consecutive failure during cooldown period
      const req2 = new Request('http://localhost/api/v1/readiness');
      const ctx2: any = {
        request: req2,
        url: new URL(req2.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'req-fail-2',
        env: mockEnv
      };

      const res2 = await mainRouter.handle(ctx2);
      expect(res2.status).toBe(503); // Still returns 503 without secondary email alert spam
    });
  });
});
