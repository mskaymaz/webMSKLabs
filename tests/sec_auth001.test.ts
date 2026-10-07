import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import worker from '../src/index.js';
import { Env } from '../src/types/env.js';
import { hashPassword, generateToken } from '../src/utils/crypto.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

function createD1Adapter(db: any): D1Database {
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
      } as any;
    }
  } as unknown as D1Database;
}

describe('SEC-AUTH-001 — Admin Auth API & Session Management Tests', () => {
  let sqliteDb: any;
  let d1Db: D1Database;
  let mockEnv: Env;

  beforeEach(async () => {
    sqliteDb = new DatabaseSync(':memory:');
    sqliteDb.exec('PRAGMA foreign_keys = ON;');

    const migrationDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = [
      '0001_devadmin_initial_schema.sql',
      '0002_seed_devadmin.sql',
      '0003_seed_tickets_comments.sql',
      '0004_add_broadcasts_table.sql',
      '0005_cms_schema.sql',
      '0006_push_subscriptions.sql',
      '0007_ad_settings.sql',
      '0008_blog_layouts.sql',
      '0009_translation.sql',
      '0010_post_audio_assets.sql'
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        sqliteDb.exec(sql);
      }
    }

    // Insert test admin user with known password 'SecretPassword123'
    const passHash = await hashPassword('SecretPassword123');
    sqliteDb.exec(`
      INSERT INTO admins (username, password_hash, role, is_active)
      VALUES ('test_admin', '${passHash}', 'ADMIN', 1);
    `);

    d1Db = createD1Adapter(sqliteDb);

    mockEnv = {
      DB: d1Db,
      MEDIA: {} as R2Bucket,
      JWT_SECRET: 'super_secret_jwt_key_2026_test',
      ENVIRONMENT: 'development',
      ALLOWED_ORIGINS: 'http://localhost:3000'
    };
  });

  afterEach(() => {
    if (sqliteDb) {
      sqliteDb.close();
    }
  });

  // ------------------- LOGIN TESTS -------------------

  it('1. should succeed login with correct username and password (200 OK)', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(200);

    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.token).toBeTruthy();
    expect(json.data.user.username).toBe('test_admin');
    expect(json.data.user.role).toBe('ADMIN');
  });

  it('2. should return 401 Unauthorized for wrong password', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'WrongPassword999' })
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);

    const json = await res.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('3. should return identical 401 Unauthorized for non-existent username', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'non_existent_user', password: 'SecretPassword123' })
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);

    const json = await res.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
    expect(json.error.message).toBe('Kullanıcı adı veya şifre hatalı.');
  });

  it('4. should return 400 Bad Request for missing username', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'SecretPassword123' })
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(400);

    const json = await res.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('5. should return 400 Bad Request for missing password', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin' })
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(400);

    const json = await res.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('6. should return 400 Bad Request for malformed JSON body', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed json text'
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(400);

    const json = await res.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_JSON');
  });

  it('7. should enforce input validation limits on length and types', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ab', password: '123' }) // Too short
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(400);
  });

  it('8. should return a valid JWT token string on successful login', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    const json = await res.json() as any;
    expect(typeof json.data.token).toBe('string');
    expect(json.data.token.split('.')).toHaveLength(3);
  });

  it('9. should ensure JWT payload contains no password, hash, or secret', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    const json = await res.json() as any;
    const tokenParts = json.data.token.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));

    expect(payload.password).toBeUndefined();
    expect(payload.password_hash).toBeUndefined();
    expect(payload.secret).toBeUndefined();
    expect(payload.admin_id).toBeTruthy();
    expect(payload.username).toBe('test_admin');
  });

  it('10. should create active session record in admin_sessions table on login', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });

    await worker.fetch(req, mockEnv, {} as ExecutionContext);

    const sessions = sqliteDb.prepare("SELECT * FROM admin_sessions;").all();
    expect(sessions.length).toBeGreaterThan(0);
  });

  it('11. should protect against timing attack by running dummy password verification on missing user', async () => {
    const start = Date.now();
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'non_existent_timing_user', password: 'SecretPassword123' })
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    const duration = Date.now() - start;

    expect(res.status).toBe(401);
    // PBKDF2 with 100k iterations takes >10ms, proving password verification ran
    expect(duration).toBeGreaterThan(5);
  });

  // ------------------- MIDDLEWARE TESTS -------------------

  it('12. should reject protected route access when Authorization header is missing', async () => {
    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET'
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  it('13. should reject protected route when Bearer format is invalid', async () => {
    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: 'Basic dXNlcjpwYXNz' }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  it('14. should reject protected route when token is invalid format', async () => {
    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid.token.str' }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  it('15. should reject token signed with invalid signature', async () => {
    const tokenWithWrongSecret = await generateToken(
      { admin_id: 1, username: 'test_admin', role: 'ADMIN' },
      'wrong_secret_key_123'
    );

    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenWithWrongSecret}` }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  it('16. should reject expired token with 401', async () => {
    // Generate token expired 1 hour ago
    const b64Header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
    const now = Math.floor(Date.now() / 1000);
    const b64Payload = btoa(JSON.stringify({
      admin_id: 1,
      username: 'test_admin',
      role: 'ADMIN',
      iat: now - 7200,
      exp: now - 3600
    })).replace(/=/g, '');

    const dataToSign = `${b64Header}.${b64Payload}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(mockEnv.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));
    const b64Sig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const expiredToken = `${dataToSign}.${b64Sig}`;

    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${expiredToken}` }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  it('17. should allow protected route access with valid token & session', async () => {
    // Perform real login to create session & token
    const loginReq = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });
    const loginRes = await worker.fetch(loginReq, mockEnv, {} as ExecutionContext);
    const loginJson = await loginRes.json() as any;
    const validToken = loginJson.data.token;

    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${validToken}` }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(200);

    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.user.username).toBe('test_admin');
  });

  it('18. should reject token missing required admin_id claim', async () => {
    const invalidClaimToken = await generateToken(
      { username: 'test_admin', role: 'ADMIN' }, // missing admin_id
      mockEnv.JWT_SECRET
    );

    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${invalidClaimToken}` }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  it('19. should reject token with invalid claim type (admin_id string instead of number)', async () => {
    const invalidTypeToken = await generateToken(
      { admin_id: 'string_id_123', username: 'test_admin', role: 'ADMIN' },
      mockEnv.JWT_SECRET
    );

    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${invalidTypeToken}` }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  it('20. should reject access if D1 session has been revoked', async () => {
    // Perform login
    const loginReq = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });
    const loginRes = await worker.fetch(loginReq, mockEnv, {} as ExecutionContext);
    const loginJson = await loginRes.json() as any;
    const token = loginJson.data.token;

    // Revoke all sessions in DB directly
    sqliteDb.exec("DELETE FROM admin_sessions;");

    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  // ------------------- LOGOUT TESTS -------------------

  it('21. should revoke session on logout call', async () => {
    const loginReq = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });
    const loginRes = await worker.fetch(loginReq, mockEnv, {} as ExecutionContext);
    const loginJson = await loginRes.json() as any;
    const token = loginJson.data.token;

    const logoutReq = new Request('http://localhost/api/admin/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    const logoutRes = await worker.fetch(logoutReq, mockEnv, {} as ExecutionContext);
    expect(logoutRes.status).toBe(200);

    const sessions = sqliteDb.prepare("SELECT * FROM admin_sessions;").all();
    expect(sessions.length).toBe(0);
  });

  it('22. should reject same token on protected route after logout', async () => {
    const loginReq = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });
    const loginRes = await worker.fetch(loginReq, mockEnv, {} as ExecutionContext);
    const loginJson = await loginRes.json() as any;
    const token = loginJson.data.token;

    // Logout
    const logoutReq = new Request('http://localhost/api/admin/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    await worker.fetch(logoutReq, mockEnv, {} as ExecutionContext);

    // Try using same token for /me
    const meReq = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    const meRes = await worker.fetch(meReq, mockEnv, {} as ExecutionContext);
    expect(meRes.status).toBe(401);
  });

  it('23. should write LOGOUT audit event on logout', async () => {
    const loginReq = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });
    const loginRes = await worker.fetch(loginReq, mockEnv, {} as ExecutionContext);
    const loginJson = await loginRes.json() as any;
    const token = loginJson.data.token;

    const logoutReq = new Request('http://localhost/api/admin/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    await worker.fetch(logoutReq, mockEnv, {} as ExecutionContext);

    const logs = sqliteDb.prepare("SELECT * FROM admin_audit_logs WHERE action = 'LOGOUT';").all();
    expect(logs.length).toBeGreaterThan(0);
  });

  // ------------------- /ME ENDPOINT TESTS -------------------

  it('24. should return admin user info on /api/admin/me with valid token', async () => {
    const loginReq = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });
    const loginRes = await worker.fetch(loginReq, mockEnv, {} as ExecutionContext);
    const loginJson = await loginRes.json() as any;
    const token = loginJson.data.token;

    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(200);

    const json = await res.json() as any;
    expect(json.data.user.admin_id).toBeTruthy();
    expect(json.data.user.username).toBe('test_admin');
    expect(json.data.user.role).toBe('ADMIN');
  });

  it('25. should return 401 on /api/admin/me without token', async () => {
    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET'
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  it('26. should ensure sensitive credential fields (password, hash) are NOT present in /me response', async () => {
    const loginReq = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });
    const loginRes = await worker.fetch(loginReq, mockEnv, {} as ExecutionContext);
    const loginJson = await loginRes.json() as any;
    const token = loginJson.data.token;

    const req = new Request('http://localhost/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    const json = await res.json() as any;

    expect(json.data.user.password).toBeUndefined();
    expect(json.data.user.password_hash).toBeUndefined();
    expect(json.data.user.token).toBeUndefined();
  });

  // ------------------- SECRET & CONFIG TESTS -------------------

  it('27. should return controlled 500 SERVER_MISCONFIGURATION response when JWT_SECRET is missing', async () => {
    const envWithoutSecret: Env = {
      ...mockEnv,
      JWT_SECRET: '' // empty secret
    };

    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });

    const res = await worker.fetch(req, envWithoutSecret, {} as ExecutionContext);
    expect(res.status).toBe(500);

    const json = await res.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_MISCONFIGURATION');
  });

  it('28. should never expose password, password_hash, or secret in audit logs or response details', async () => {
    const loginReq = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_admin', password: 'SecretPassword123' })
    });
    await worker.fetch(loginReq, mockEnv, {} as ExecutionContext);

    const auditLogs = sqliteDb.prepare("SELECT * FROM admin_audit_logs;").all() as any[];
    auditLogs.forEach((log: any) => {
      const details = log.details_json || '';
      expect(details).not.toContain('SecretPassword123');
      expect(details).not.toContain('pbkdf2');
      expect(details).not.toContain(mockEnv.JWT_SECRET);
    });
  });
});
