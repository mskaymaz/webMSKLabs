import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';
import { Env } from '../src/types/env.js';
import { generateToken } from '../src/utils/crypto.js';

describe('ARCH-003 — Modular Routes & Middleware Architecture Tests', () => {
  const mockEnv: Env = {
    DB: {} as D1Database,
    MEDIA: {} as R2Bucket,
    JWT_SECRET: 'test_jwt_secret_key_123',
    ENVIRONMENT: 'development',
    ALLOWED_ORIGINS: 'http://localhost:3000,https://mskaymaz.com'
  };

  it('1. should generate X-Request-ID and attach to response headers', async () => {
    const request = new Request('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Request-ID')).toBeTruthy();

    const json = await response.json() as any;
    expect(json.success).toBe(true);
    expect(json.requestId).toBeTruthy();
  });

  it('2. should handle preflight OPTIONS requests with 204 status and CORS', async () => {
    const request = new Request('http://localhost/api/admin/login', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' }
    });

    const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });

  it('3. should reject unauthorized access to protected admin route with 401', async () => {
    const request = new Request('http://localhost/api/admin/tickets', {
      method: 'GET'
    });

    const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(401);

    const json = await response.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('4. should reject user with insufficient role permissions with 403', async () => {
    const token = await generateToken(
      { admin_id: 2, username: 'support_user', role: 'SUPPORT' },
      mockEnv.JWT_SECRET
    );

    const request = new Request('http://localhost/api/admin/comments/1/status', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });

    const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(403);

    const json = await response.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('5. should allow user with correct permission to access protected route', async () => {
    const token = await generateToken(
      { admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' },
      mockEnv.JWT_SECRET
    );

    const request = new Request('http://localhost/api/admin/tickets', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(200);

    const json = await response.json() as any;
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('6. should return 404 for unknown route with X-Request-ID', async () => {
    const request = new Request('http://localhost/api/admin/non-existent-route', {
      method: 'GET'
    });

    const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(404);
    expect(response.headers.get('X-Request-ID')).toBeTruthy();

    const json = await response.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });
});
