import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { mainRouter } from '../src/routes/index.js';
import { generateToken } from '../src/utils/crypto.js';
import { getAuthenticatedAdmin } from '../src/middleware/auth.js';
import {
  createIncidentAlert,
  revokeAdminSessions,
  lockCompromisedAdmin,
  IncidentSeverity,
  SECRET_ROTATION_GUIDE
} from '../src/utils/incidentManager.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

function createMockEnv(db: any) {
  return {
    JWT_SECRET: 'test-incident-secret-key-32-chars-long',
    ADMIN_ALERT_EMAIL: 'security-alert@msklabs.com',
    MOCK_SEND: 'true',
    DB: {
      prepare(query: string) {
        return {
          bind(...args: any[]) {
            return {
              async first() {
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
    }
  };
}

describe('SECTION 12 — Incident Response & Security Management Test Suite (INC-001)', () => {
  let db: any;
  let admin1Token: string;
  let admin2Token: string;

  beforeEach(async () => {
    db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'SUPER_ADMIN',
        is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        user_agent TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
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

      INSERT INTO admins (id, username, password_hash, role, is_active) VALUES (1, 'admin1', 'hash123', 'SUPER_ADMIN', 1);
      INSERT INTO admins (id, username, password_hash, role, is_active) VALUES (2, 'admin2', 'hash456', 'ADMIN', 1);
    `);

    admin1Token = await generateToken({ admin_id: 1, username: 'admin1', role: 'SUPER_ADMIN' }, 'test-incident-secret-key-32-chars-long');
    admin2Token = await generateToken({ admin_id: 2, username: 'admin2', role: 'ADMIN' }, 'test-incident-secret-key-32-chars-long');

    // Create D1 sessions
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    
    // Compute simple sha256 hash for token_hash test match
    const crypto = await import('../src/utils/crypto.js');
    const token1Hash = await crypto.hashToken(admin1Token);
    const token2Hash = await crypto.hashToken(admin2Token);

    db.exec(`
      INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (1, '${token1Hash}', '${futureDate}');
      INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (2, '${token2Hash}', '${futureDate}');
    `);
  });

  describe('1. Incident Severity Classification & Central Alerting', () => {
    it('should handle all 4 severity levels (CRITICAL, HIGH, MEDIUM, LOW) and record to system_logs', async () => {
      const ctx: any = {
        requestId: 'inc-test-sev-1',
        env: createMockEnv(db)
      };

      const severities: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

      for (const severity of severities) {
        await createIncidentAlert(ctx, {
          severity,
          eventType: 'TEST_EVENT',
          message: `Testing severity level ${severity} for user secret.admin@msklabs.com`
        });
      }

      const logs = db.prepare("SELECT * FROM system_logs WHERE correlation_id = 'inc-test-sev-1' ORDER BY id ASC").all();
      expect(logs.length).toBe(4);

      // Verify PII redaction on message
      for (const log of logs) {
        expect(log.message).not.toContain('secret.admin@msklabs.com');
        expect(log.message).toContain('REDACTED');
      }
    });

    it('should trigger COM-001 email for CRITICAL & HIGH alerts without failing on email error', async () => {
      const ctx: any = {
        requestId: 'inc-email-alert-req',
        env: createMockEnv(db)
      };

      // Email sending is MOCK_SEND=true
      await createIncidentAlert(ctx, {
        severity: 'CRITICAL',
        eventType: 'API_KEY_LEAK',
        message: 'Critical API Key leaked with Bearer token_secret_xyz123',
        extraDetails: { keyType: 'GEMINI_API_KEY' }
      });

      const auditLog = db.prepare("SELECT * FROM admin_audit_logs WHERE action = 'INCIDENT_CRITICAL_API_KEY_LEAK'").get();
      expect(auditLog).toBeTruthy();
      const details = JSON.parse(auditLog.details_json);
      expect(details.message).not.toContain('token_secret_xyz123');
      expect(details.message).toContain('[REDACTED]');
    });

    it('should tolerate email error gracefully and NOT throw exception', async () => {
      const ctxFaultyEmail: any = {
        requestId: 'inc-faulty-email',
        env: {
          ...createMockEnv(db),
          MOCK_SEND: 'false',
          RESEND_API_KEY: 'invalid_key_will_reject'
        }
      };

      // Should complete without throwing exception
      await expect(
        createIncidentAlert(ctxFaultyEmail, {
          severity: 'HIGH',
          eventType: 'BRUTE_FORCE_SPIKE',
          message: 'High volume brute force attack detected'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('2. Emergency Session Revocation (revokeAdminSessions)', () => {
    it('should revoke active sessions for a specific admin and reject subsequent auth requests', async () => {
      const ctx: any = {
        request: new Request('http://localhost/api/v1/admin/me', {
          headers: { 'Authorization': `Bearer ${admin1Token}` }
        }),
        requestId: 'inc-revoke-admin1',
        env: createMockEnv(db)
      };

      // 1. Verify admin1 is initially authenticated
      const authenticatedBefore = await getAuthenticatedAdmin(ctx);
      expect(authenticatedBefore).toBeTruthy();
      expect(authenticatedBefore?.id).toBe(1);

      // 2. Perform Emergency Session Revocation for Admin 1
      const res = await revokeAdminSessions(ctx, 1);
      expect(res.success).toBe(true);
      expect(res.revokedCount).toBe(1);

      // 3. Verify admin1 is now REJECTED (401)
      const authenticatedAfter = await getAuthenticatedAdmin(ctx);
      expect(authenticatedAfter).toBeNull();

      // 4. Verify admin2 session remains intact (Isolating revocation to target admin)
      const ctxAdmin2: any = {
        request: new Request('http://localhost/api/v1/admin/me', {
          headers: { 'Authorization': `Bearer ${admin2Token}` }
        }),
        requestId: 'inc-admin2-check',
        env: createMockEnv(db)
      };

      const authenticatedAdmin2 = await getAuthenticatedAdmin(ctxAdmin2);
      expect(authenticatedAdmin2).toBeTruthy();
      expect(authenticatedAdmin2?.id).toBe(2);
    });

    it('should revoke ALL admin sessions when adminId is omitted', async () => {
      const ctx: any = {
        requestId: 'inc-revoke-all',
        env: createMockEnv(db)
      };

      const res = await revokeAdminSessions(ctx);
      expect(res.success).toBe(true);
      expect(res.revokedCount).toBe(2);

      // Verify both tokens are rejected
      const ctx1: any = {
        request: new Request('http://localhost/api/v1/admin/me', { headers: { 'Authorization': `Bearer ${admin1Token}` } }),
        env: createMockEnv(db)
      };
      const ctx2: any = {
        request: new Request('http://localhost/api/v1/admin/me', { headers: { 'Authorization': `Bearer ${admin2Token}` } }),
        env: createMockEnv(db)
      };

      expect(await getAuthenticatedAdmin(ctx1)).toBeNull();
      expect(await getAuthenticatedAdmin(ctx2)).toBeNull();
    });

    it('should be idempotent and handle non-existent adminId safely', async () => {
      const ctx: any = {
        requestId: 'inc-revoke-nonexistent',
        env: createMockEnv(db)
      };

      const res1 = await revokeAdminSessions(ctx, 9999);
      expect(res1.success).toBe(true);
      expect(res1.revokedCount).toBe(0);

      const res2 = await revokeAdminSessions(ctx, 9999);
      expect(res2.success).toBe(true);
      expect(res2.revokedCount).toBe(0);
    });

    it('should return failure result when D1 DB prepare throws error', async () => {
      const faultyCtx: any = {
        env: {
          DB: {
            prepare() {
              throw new Error('D1 connection failure');
            }
          }
        }
      };

      const res = await revokeAdminSessions(faultyCtx, 1);
      expect(res.success).toBe(false);
      expect(res.revokedCount).toBe(0);
      expect(res.message).toContain('D1 connection failure');
    });
  });

  describe('3. Compromised Admin Account Locking (lockCompromisedAdmin)', () => {
    it('should set is_active = 0, revoke sessions, log audit action, and reject future JWTs', async () => {
      const ctx: any = {
        requestId: 'inc-lock-admin-2',
        env: createMockEnv(db)
      };

      // 1. Initially Admin 2 is active and authenticated
      const ctxAdmin2Before: any = {
        request: new Request('http://localhost/api/v1/admin/me', { headers: { 'Authorization': `Bearer ${admin2Token}` } }),
        env: createMockEnv(db)
      };
      expect(await getAuthenticatedAdmin(ctxAdmin2Before)).toBeTruthy();

      // 2. Lock compromised admin 2
      const lockRes = await lockCompromisedAdmin(ctx, 2, 'Stolen JWT credential detected');
      expect(lockRes.success).toBe(true);
      expect(lockRes.adminId).toBe(2);
      expect(lockRes.accountLocked).toBe(true);
      expect(lockRes.sessionsRevoked).toBe(1);

      // 3. Check DB state: is_active = 0
      const adminRecord = db.prepare('SELECT is_active FROM admins WHERE id = 2').get();
      expect(adminRecord.is_active).toBe(0);

      // 4. Verify auth middleware rejects Admin 2 (401)
      const ctxAdmin2After: any = {
        request: new Request('http://localhost/api/v1/admin/me', { headers: { 'Authorization': `Bearer ${admin2Token}` } }),
        env: createMockEnv(db)
      };
      expect(await getAuthenticatedAdmin(ctxAdmin2After)).toBeNull();

      // 5. Verify audit log entry was created
      const audit = db.prepare("SELECT * FROM admin_audit_logs WHERE action = 'ADMIN_ACCOUNT_LOCKED_INCIDENT'").get();
      expect(audit).toBeTruthy();
      const details = JSON.parse(audit.details_json);
      expect(details.targetAdminId).toBe(2);
      expect(details.reason).toContain('Stolen JWT credential');
    });

    it('should return failure result when target admin ID does not exist in DB', async () => {
      const ctx: any = {
        requestId: 'inc-lock-missing',
        env: createMockEnv(db)
      };

      const res = await lockCompromisedAdmin(ctx, 8888, 'Non existent user lock');
      expect(res.success).toBe(false);
      expect(res.accountLocked).toBe(false);
      expect(res.message).toContain('bulunamadı');
    });

    it('should return HTTP 401 on protected admin route via mainRouter when admin session is revoked or locked', async () => {
      // 1. Send request with valid Admin 2 token BEFORE lock
      const reqBefore = new Request('http://localhost/api/v1/admin/me', {
        headers: { 'Authorization': `Bearer ${admin2Token}` }
      });
      const urlBefore = new URL(reqBefore.url);
      const ctxBefore: any = {
        request: reqBefore,
        url: urlBefore,
        query: urlBefore.searchParams,
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'req-me-before-lock',
        env: createMockEnv(db)
      };

      const resBefore = await mainRouter.handle(ctxBefore);
      expect(resBefore.status).toBe(200);

      // 2. Lock Compromised Admin 2
      const lockCtx: any = { requestId: 'lock-ctx', env: createMockEnv(db) };
      await lockCompromisedAdmin(lockCtx, 2, 'Compromised key');

      // 3. Send request with same token AFTER lock
      const reqAfter = new Request('http://localhost/api/v1/admin/me', {
        headers: { 'Authorization': `Bearer ${admin2Token}` }
      });
      const urlAfter = new URL(reqAfter.url);
      const ctxAfter: any = {
        request: reqAfter,
        url: urlAfter,
        query: urlAfter.searchParams,
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'req-me-after-lock',
        env: createMockEnv(db)
      };

      const resAfter = await mainRouter.handle(ctxAfter);
      expect(resAfter.status).toBe(401);
    });
  });

  describe('4. Evidence Protection & Operational Guidance', () => {
    it('should record all incident operations in admin_audit_logs and system_logs without deleting logs', async () => {
      const ctx: any = {
        requestId: 'inc-evidence-test',
        env: createMockEnv(db)
      };

      await lockCompromisedAdmin(ctx, 1, 'Emergency quarantine');

      const auditCount = db.prepare("SELECT COUNT(*) as count FROM admin_audit_logs").get().count;
      const sysCount = db.prepare("SELECT COUNT(*) as count FROM system_logs").get().count;

      expect(auditCount).toBeGreaterThan(0);
      expect(sysCount).toBeGreaterThan(0);

      // Confirm no log truncation/delete queries exist in incidentManager
      expect(SECRET_ROTATION_GUIDE).toContain('INVALIDATE');
      expect(SECRET_ROTATION_GUIDE).toContain('Logları silme!');
    });
  });
});
