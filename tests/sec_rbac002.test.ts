import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { requirePermission } from '../src/middleware/auth.js';
import { generateToken, hashToken } from '../src/utils/crypto.js';

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

describe('SEC-RBAC-002 — Middleware Authorization & IDOR/BOLA Tests', () => {
  const secret = 'SEC_RBAC_002_TEST_SECRET_KEY';

  it('1. should return 401 for unauthenticated request', async () => {
    const { adapter } = await setupTestDb();
    const middleware = requirePermission('posts.publish');

    const ctx = {
      request: new Request('http://localhost/api/admin/cms/posts/1/publish', { method: 'POST' }),
      env: { DB: adapter, JWT_SECRET: secret },
      corsHeaders: { 'Access-Control-Allow-Origin': '*' },
      requestId: 'req-rbac-002-1'
    } as any;

    const response = await middleware(ctx);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
  });

  it('2. should return 403 FORBIDDEN and log PERMISSION_DENIED when user role lacks permission', async () => {
    const { adapter } = await setupTestDb();
    await adapter.prepare(`INSERT INTO admins (id, username, password_hash, role) VALUES (?, ?, ?, ?)`).bind(10, 'support_user', 'hash', 'SUPPORT').run();

    const token = await generateToken({ admin_id: 10, username: 'support_user', role: 'SUPPORT' }, secret);
    const tokenHash = await hashToken(token);
    await adapter.prepare(`INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`).bind(10, tokenHash).run();

    const middleware = requirePermission('posts.publish');

    const ctx = {
      request: new Request('http://localhost/api/admin/cms/posts/1/publish', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }),
      env: { DB: adapter, JWT_SECRET: secret },
      corsHeaders: { 'Access-Control-Allow-Origin': '*' },
      requestId: 'req-rbac-002-2',
      clientIp: '192.168.1.50'
    } as any;

    const response = await middleware(ctx);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);

    const body: any = await response?.json();
    expect(body?.error?.code).toBe('FORBIDDEN');

    // Audit log check (PERMISSION_DENIED)
    const logs = await adapter.prepare(`SELECT * FROM admin_audit_logs WHERE action = 'PERMISSION_DENIED'`).all();
    expect(logs.results.length).toBeGreaterThan(0);
    expect(logs.results[0].details_json).toContain('posts.publish');
  });

  it('3. should pass through (return null) when user has valid permission', async () => {
    const { adapter } = await setupTestDb();
    await adapter.prepare(`INSERT INTO admins (id, username, password_hash, role) VALUES (?, ?, ?, ?)`).bind(1, 'admin_user', 'hash', 'SUPER_ADMIN').run();

    const token = await generateToken({ admin_id: 1, username: 'admin_user', role: 'SUPER_ADMIN' }, secret);
    const tokenHash = await hashToken(token);
    await adapter.prepare(`INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`).bind(1, tokenHash).run();

    const middleware = requirePermission('posts.publish');

    const ctx = {
      request: new Request('http://localhost/api/admin/cms/posts/1/publish', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }),
      env: { DB: adapter, JWT_SECRET: secret },
      corsHeaders: { 'Access-Control-Allow-Origin': '*' },
      requestId: 'req-rbac-002-3'
    } as any;

    const response = await middleware(ctx);
    expect(response).toBeNull();
  });

  it('4. should prevent IDOR / BOLA when non-superadmin attempts to modify another admin session', async () => {
    const { adapter } = await setupTestDb();
    await adapter.prepare(`INSERT INTO admins (id, username, password_hash, role) VALUES (?, ?, ?, ?)`).bind(2, 'editor_user', 'hash', 'EDITOR').run();

    const token = await generateToken({ admin_id: 2, username: 'editor_user', role: 'EDITOR' }, secret);
    const tokenHash = await hashToken(token);
    await adapter.prepare(`INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`).bind(2, tokenHash).run();

    const middleware = requirePermission('settings.manage');

    const ctx = {
      request: new Request('http://localhost/api/admin/users/1', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }),
      env: { DB: adapter, JWT_SECRET: secret },
      corsHeaders: { 'Access-Control-Allow-Origin': '*' },
      requestId: 'req-rbac-002-4'
    } as any;

    const response = await middleware(ctx);
    expect(response?.status).toBe(403);
  });

  it('5. should immediately reflect D1 role changes on subsequent requests (stale role prevention)', async () => {
    const { adapter } = await setupTestDb();
    await adapter.prepare(`INSERT INTO admins (id, username, password_hash, role) VALUES (?, ?, ?, ?)`).bind(5, 'stale_test_user', 'hash', 'SUPER_ADMIN').run();

    // Token has SUPER_ADMIN in JWT payload
    const token = await generateToken({ admin_id: 5, username: 'stale_test_user', role: 'SUPER_ADMIN' }, secret);
    const tokenHash = await hashToken(token);
    await adapter.prepare(`INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`).bind(5, tokenHash).run();

    const middleware = requirePermission('settings.manage');

    const ctx = {
      request: new Request('http://localhost/api/admin/settings', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      }),
      env: { DB: adapter, JWT_SECRET: secret },
      corsHeaders: { 'Access-Control-Allow-Origin': '*' },
      requestId: 'req-rbac-stale-1'
    } as any;

    // 1st call -> SUPER_ADMIN in D1 -> Allowed (returns null)
    let res = await middleware(ctx);
    expect(res).toBeNull();

    // Update role in DB to SUPPORT
    await adapter.prepare(`UPDATE admins SET role = 'SUPPORT' WHERE id = 5`).run();

    // 2nd call -> Same JWT, but D1 role is now SUPPORT -> Denied 403!
    const ctx2 = { ...ctx, user: undefined };
    res = await middleware(ctx2);
    expect(res?.status).toBe(403);
  });

  it('6. should allow SUPPORT and ADMIN to reply to tickets with messages.reply permission, but deny EDITOR', async () => {
    const { adapter } = await setupTestDb();
    await adapter.prepare(`INSERT INTO admins (id, username, password_hash, role) VALUES (?, ?, ?, ?)`).bind(20, 'support_ticket_user', 'hash', 'SUPPORT').run();
    await adapter.prepare(`INSERT INTO admins (id, username, password_hash, role) VALUES (?, ?, ?, ?)`).bind(21, 'editor_ticket_user', 'hash', 'EDITOR').run();
    await adapter.prepare(`INSERT INTO admins (id, username, password_hash, role) VALUES (?, ?, ?, ?)`).bind(22, 'admin_ticket_user', 'hash', 'ADMIN').run();

    const supportToken = await generateToken({ admin_id: 20, username: 'support_ticket_user', role: 'SUPPORT' }, secret);
    await adapter.prepare(`INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`).bind(20, await hashToken(supportToken)).run();

    const editorToken = await generateToken({ admin_id: 21, username: 'editor_ticket_user', role: 'EDITOR' }, secret);
    await adapter.prepare(`INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`).bind(21, await hashToken(editorToken)).run();

    const adminToken = await generateToken({ admin_id: 22, username: 'admin_ticket_user', role: 'ADMIN' }, secret);
    await adapter.prepare(`INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`).bind(22, await hashToken(adminToken)).run();

    const middleware = requirePermission('messages.reply');

    // SUPPORT -> ALLOW (null)
    const ctxSupport = {
      request: new Request('http://localhost/api/admin/tickets/1/reply', { method: 'POST', headers: { Authorization: `Bearer ${supportToken}` } }),
      env: { DB: adapter, JWT_SECRET: secret }, corsHeaders: {}
    } as any;
    expect(await middleware(ctxSupport)).toBeNull();

    // ADMIN -> ALLOW (null)
    const ctxAdmin = {
      request: new Request('http://localhost/api/admin/tickets/1/reply', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }),
      env: { DB: adapter, JWT_SECRET: secret }, corsHeaders: {}
    } as any;
    expect(await middleware(ctxAdmin)).toBeNull();

    // EDITOR -> DENY (403)
    const ctxEditor = {
      request: new Request('http://localhost/api/admin/tickets/1/reply', { method: 'POST', headers: { Authorization: `Bearer ${editorToken}` } }),
      env: { DB: adapter, JWT_SECRET: secret }, corsHeaders: {}
    } as any;
    const resEditor = await middleware(ctxEditor);
    expect(resEditor?.status).toBe(403);
  });
});
