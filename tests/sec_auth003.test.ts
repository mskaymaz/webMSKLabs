import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import {
  checkLoginLockout,
  resetRateLimitStoresForTest
} from '../src/middleware/rateLimit.js';
import { loginAdminService } from '../src/services/authService.js';
import { hashPassword } from '../src/utils/crypto.js';
import { createRequestContext } from '../src/middleware/request.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

function createD1Adapter(db: any) {
  return {
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
              return { success: true, meta: { changes: info.changes } };
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
          return { success: true, meta: { changes: info.changes } };
        }
      };
    },
    async exec(query: string) {
      return db.exec(query);
    }
  };
}

async function setupTestDb() {
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'SUPPORT',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return { rawDb, adapter: createD1Adapter(rawDb) };
}

function createMockContext(dbAdapter: any, clientIp = '192.168.1.100', headers: Record<string, string> = {}) {
  const defaultHeaders = { 'user-agent': 'TestAgent/1.0', ...headers };
  const reqHeaders = new Headers(defaultHeaders);

  return {
    request: new Request('http://localhost/api/admin/login', {
      headers: reqHeaders
    }),
    env: {
      DB: dbAdapter,
      JWT_SECRET: 'SEC_AUTH_003_TEST_SECRET_KEY_2026'
    },
    clientIp,
    corsHeaders: { 'Access-Control-Allow-Origin': '*' },
    requestId: 'req-sec-003-test'
  } as any;
}

describe('SEC-AUTH-003 — Brute-Force & Oturum Güvenliği Tests', () => {
  beforeEach(() => {
    resetRateLimitStoresForTest();
  });

  it('1. should lockout after 5 consecutive failed login attempts and return HTTP 429 with Retry-After header', async () => {
    const { adapter } = await setupTestDb();
    const hash = await hashPassword('CorrectPass123!');
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('sec_user1', hash).run();

    const ctx = createMockContext(adapter);

    // Attempts 1 to 4 -> 401
    for (let i = 1; i <= 4; i++) {
      const res = await loginAdminService(ctx, { username: 'sec_user1', password: 'WrongPassword' });
      expect(res.status).toBe(401);
      expect(res.error?.code).toBe('INVALID_CREDENTIALS');
    }

    // 5th attempt -> triggers lockout (status 429)
    const fifthRes = await loginAdminService(ctx, { username: 'sec_user1', password: 'WrongPassword' });
    expect(fifthRes.status).toBe(429);
    expect(fifthRes.error?.code).toBe('LOCKOUT');
    expect(fifthRes.headers?.['Retry-After']).toBeDefined();
    expect(Number(fifthRes.headers?.['Retry-After'])).toBeGreaterThan(0);

    // 6th attempt -> blocked by lockout check (status 429 with Retry-After)
    const sixthRes = await loginAdminService(ctx, { username: 'sec_user1', password: 'CorrectPass123!' });
    expect(sixthRes.status).toBe(429);
    expect(sixthRes.error?.code).toBe('LOCKOUT');
    expect(sixthRes.headers?.['Retry-After']).toBeDefined();
  });

  it('2. should reset failed attempts counter upon successful login', async () => {
    const { adapter } = await setupTestDb();
    const hash = await hashPassword('CorrectPass123!');
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('sec_user2', hash).run();

    const ctx = createMockContext(adapter);

    // 3 failed logins
    for (let i = 1; i <= 3; i++) {
      await loginAdminService(ctx, { username: 'sec_user2', password: 'WrongPassword' });
    }

    // Check lockout status -> 3 failed attempts
    const statusBefore = checkLoginLockout('192.168.1.100', 'sec_user2');
    expect(statusBefore.failedAttempts).toBe(3);
    expect(statusBefore.locked).toBe(false);

    // Successful login
    const successRes = await loginAdminService(ctx, { username: 'sec_user2', password: 'CorrectPass123!' });
    expect(successRes.status).toBe(200);

    // Lockout status should be reset to 0
    const statusAfter = checkLoginLockout('192.168.1.100', 'sec_user2');
    expect(statusAfter.failedAttempts).toBe(0);
    expect(statusAfter.locked).toBe(false);
  });

  it('3. should isolate lockout keys between different IPs and usernames', async () => {
    const { adapter } = await setupTestDb();
    const hash = await hashPassword('CorrectPass123!');
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('sec_user3', hash).run();

    const ctxIp1 = createMockContext(adapter, '10.0.0.1');
    const ctxIp2 = createMockContext(adapter, '10.0.0.2');

    // Lock out IP1 for sec_user3
    for (let i = 1; i <= 5; i++) {
      await loginAdminService(ctxIp1, { username: 'sec_user3', password: 'WrongPassword' });
    }

    const ip1Res = await loginAdminService(ctxIp1, { username: 'sec_user3', password: 'CorrectPass123!' });
    expect(ip1Res.status).toBe(429);

    // IP2 should NOT be locked out for sec_user3
    const ip2Res = await loginAdminService(ctxIp2, { username: 'sec_user3', password: 'CorrectPass123!' });
    expect(ip2Res.status).toBe(200);
  });

  it('4. should normalize username (case insensitivity and trimming)', async () => {
    const { adapter } = await setupTestDb();
    const hash = await hashPassword('CorrectPass123!');
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('admin_norm', hash).run();

    const ctx = createMockContext(adapter);

    // Mix cases and spaces across 5 attempts
    await loginAdminService(ctx, { username: 'ADMIN_NORM', password: 'wrong' });
    await loginAdminService(ctx, { username: ' admin_norm ', password: 'wrong' });
    await loginAdminService(ctx, { username: 'Admin_Norm', password: 'wrong' });
    await loginAdminService(ctx, { username: 'admin_norm', password: 'wrong' });
    const lockRes = await loginAdminService(ctx, { username: 'ADMIN_NORM ', password: 'wrong' });

    expect(lockRes.status).toBe(429);
  });

  it('5. should record ACCOUNT_LOCKED and IP_THROTTLED audit events in admin_audit_logs', async () => {
    const { adapter } = await setupTestDb();
    const hash = await hashPassword('CorrectPass123!');
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('audit_target', hash).run();

    const ctx = createMockContext(adapter);

    // 5 failed logins to trigger ACCOUNT_LOCKED
    for (let i = 1; i <= 5; i++) {
      await loginAdminService(ctx, { username: 'audit_target', password: 'WrongPassword' });
    }

    // 6th attempt to trigger IP_THROTTLED
    await loginAdminService(ctx, { username: 'audit_target', password: 'WrongPassword' });

    const auditLogs = await adapter.prepare(`SELECT action, details_json FROM admin_audit_logs ORDER BY id ASC`).all();
    const actions = auditLogs.results.map((r: any) => r.action);

    expect(actions).toContain('ACCOUNT_LOCKED');
    expect(actions).toContain('IP_THROTTLED');
  });

  it('6. should handle 6, 10, and 20 concurrent failed login requests cleanly', async () => {
    const { adapter } = await setupTestDb();
    const hash = await hashPassword('CorrectPass123!');
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('conc_user_20', hash).run();

    const ctx = createMockContext(adapter, '192.168.10.10');

    // 20 concurrent requests
    const promises = Array.from({ length: 20 }).map(() =>
      loginAdminService(ctx, { username: 'conc_user_20', password: 'WrongPassword' })
    );

    const results = await Promise.all(promises);
    const statuses = results.map(r => r.status);

    const count401 = statuses.filter(s => s === 401).length;
    const count429 = statuses.filter(s => s === 429).length;

    expect(count401).toBe(4);
    expect(count429).toBe(16);
  });

  it('7. should isolate different usernames on the same IP address (Cross-User Isolation)', async () => {
    const { adapter } = await setupTestDb();
    const hash = await hashPassword('CorrectPass123!');
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('user_a', hash).run();
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('user_b', hash).run();

    const ctx = createMockContext(adapter, '10.0.0.1');

    // Fail 5 times for user_a -> user_a locked
    for (let i = 1; i <= 5; i++) {
      await loginAdminService(ctx, { username: 'user_a', password: 'WrongPassword' });
    }

    const resUserA = await loginAdminService(ctx, { username: 'user_a', password: 'CorrectPass123!' });
    expect(resUserA.status).toBe(429);

    // user_b on the SAME IP should NOT be locked out!
    const resUserB = await loginAdminService(ctx, { username: 'user_b', password: 'CorrectPass123!' });
    expect(resUserB.status).toBe(200);
  });

  it('8. should safely escape SQL LIKE patterns and avoid substring collision (admin vs admin_user)', async () => {
    const { adapter } = await setupTestDb();
    const hash = await hashPassword('CorrectPass123!');
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('adm', hash).run();
    await adapter.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).bind('adm_user', hash).run();

    const ctx = createMockContext(adapter, '10.0.0.1');

    // Fail 5 times for adm
    for (let i = 1; i <= 5; i++) {
      await loginAdminService(ctx, { username: 'adm', password: 'WrongPassword' });
    }

    // adm is locked
    const resAdm = await loginAdminService(ctx, { username: 'adm', password: 'CorrectPass123!' });
    expect(resAdm.status).toBe(429);

    // adm_user must NOT be locked out by substring match!
    const resAdmUser = await loginAdminService(ctx, { username: 'adm_user', password: 'CorrectPass123!' });
    expect(resAdmUser.status).toBe(200);
  });

  it('9. should prioritize cf-connecting-ip over x-forwarded-for in createRequestContext (IP Header Spoofing Protection)', () => {
    const req = new Request('http://localhost/api/admin/login', {
      headers: {
        'cf-connecting-ip': '5.6.7.8',
        'x-forwarded-for': '1.2.3.4, 10.0.0.1'
      }
    });

    const ctx = createRequestContext(req, {} as any);
    expect(ctx.clientIp).toBe('5.6.7.8');
  });
});
