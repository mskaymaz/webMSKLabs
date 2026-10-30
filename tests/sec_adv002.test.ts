import { describe, it, expect, beforeEach } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { Env } from '../src/types/env.js';
import { verifyPassword, hashPassword, generateToken, hashToken } from '../src/utils/crypto.js';

describe('SEC-ADV-002 — Cookie Security & Session Fixation Protection Tests', () => {
  let mockEnv: Env;

  let sessionsTable: Array<{ id: number; admin_id: number; token_hash: string; ip_address: string; user_agent: string; expires_at: string }> = [];
  let adminsTable: Array<{ id: number; username: string; password_hash: string; role: string; is_active: number }> = [];

  beforeEach(async () => {
    sessionsTable = [];
    adminsTable = [];

    const pwdHash = await hashPassword('AdminPass123!');
    adminsTable.push({
      id: 1,
      username: 'admin',
      password_hash: pwdHash,
      role: 'SUPER_ADMIN',
      is_active: 1
    });

    mockEnv = {
      MEDIA: {} as R2Bucket,
      JWT_SECRET: 'test_sec_adv002_jwt_secret_key_123',
      ENVIRONMENT: 'development',
      ALLOWED_ORIGINS: 'http://localhost:5173,https://mskaymaz.com',
      DB: {
        prepare: (query: string) => {
          return {
            bind: (...args: any[]) => {
              return {
                first: async () => {
                  if (query.includes('FROM admins WHERE username = ?')) {
                    const username = args[0];
                    return adminsTable.find(a => a.username === username) || null;
                  }
                  if (query.includes('admin_sessions')) {
                    const hash = args[0];
                    const session = sessionsTable.find(s => s.token_hash === hash);
                    if (!session) return null;
                    const admin = adminsTable.find(a => a.id === session.admin_id);
                    if (!admin || admin.is_active !== 1) return null;
                    return {
                      session_id: session.id,
                      admin_id: admin.id,
                      username: admin.username,
                      role: admin.role,
                      is_active: admin.is_active
                    };
                  }
                  return null;
                },
                run: async () => {
                  if (query.includes('INSERT INTO admin_sessions')) {
                    sessionsTable.push({
                      id: sessionsTable.length + 1,
                      admin_id: args[0],
                      token_hash: args[1],
                      ip_address: args[2],
                      user_agent: args[3],
                      expires_at: args[4]
                    });
                  }
                  if (query.includes('DELETE FROM admin_sessions WHERE token_hash = ?')) {
                    const hash = args[0];
                    sessionsTable = sessionsTable.filter(s => s.token_hash !== hash);
                  }
                  return { success: true };
                },
                all: async () => {
                  return { results: [] };
                }
              };
            }
          };
        }
      } as any
    };
  });

  describe('1. Transport Classification & Cookie Absence Verification', () => {
    it('should verify authentication relies on Bearer JWT and returns no Set-Cookie header', async () => {
      const loginReq = new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'AdminPass123!' })
      });

      const res = await handleRequest(loginReq, mockEnv);
      expect(res.status).toBe(200);
      expect(res.headers.get('Set-Cookie')).toBeNull();

      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
    });
  });

  describe('2. Session Fixation Prevention on Authentication Lifecycle', () => {
    it('should issue a fresh session token on each successful login and record in admin_sessions', async () => {
      const loginReq1 = new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'AdminPass123!' })
      });
      const res1 = await handleRequest(loginReq1, mockEnv);
      const data1 = await res1.json() as any;

      // Small delay to ensure timestamp/token variation if needed
      await new Promise(resolve => setTimeout(resolve, 1050));

      const loginReq2 = new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'AdminPass123!' })
      });
      const res2 = await handleRequest(loginReq2, mockEnv);
      const data2 = await res2.json() as any;

      expect(data1.data.token).not.toEqual(data2.data.token);
      expect(sessionsTable.length).toBe(2);
    });

    it('should prevent pre-created or attacker-supplied session identifiers from being forced', async () => {
      const attackerToken = 'attacker_pre_set_session_token_123';
      const loginReq = new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${attackerToken}`
        },
        body: JSON.stringify({ username: 'admin', password: 'AdminPass123!' })
      });

      const res = await handleRequest(loginReq, mockEnv);
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.data.token).not.toEqual(attackerToken);
    });
  });

  describe('3. Session Revocation & Logout Security', () => {
    it('should revoke session in D1 table upon logout and reject subsequent requests', async () => {
      // 1. Login
      const loginReq = new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'AdminPass123!' })
      });
      const loginRes = await handleRequest(loginReq, mockEnv);
      const loginData = await loginRes.json() as any;
      const token = loginData.data.token;

      expect(sessionsTable.length).toBe(1);

      // 2. Verify protected route works before logout
      const getTicketsReq = new Request('http://localhost/api/admin/tickets', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const ticketRes1 = await handleRequest(getTicketsReq, mockEnv);
      expect(ticketRes1.status).toBe(200);

      // 3. Logout
      const logoutReq = new Request('http://localhost/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const logoutRes = await handleRequest(logoutReq, mockEnv);
      expect(logoutRes.status).toBe(200);
      expect(sessionsTable.length).toBe(0);

      // 4. Verify access is revoked
      const ticketRes2 = await handleRequest(getTicketsReq, mockEnv);
      expect(ticketRes2.status).toBe(401);
    });
  });

  describe('4. CORS & Credential Safety Check', () => {
    it('should not expose wildcard origins when Access-Control-Allow-Credentials is true', async () => {
      const req = new Request('http://localhost/api/health', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' }
      });
      const res = await handleRequest(req, mockEnv);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
      expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });
  });
});
