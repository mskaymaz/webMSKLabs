import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';
import { Env } from '../src/types/env.js';
import { validateEnvBindings } from '../src/utils/env.js';

describe('ARCH-001 — Serverless Edge Backend & Env Architecture Tests', () => {
  const mockEnv: Env = {
    DB: {} as D1Database,
    MEDIA: {} as R2Bucket,
    JWT_SECRET: 'test_jwt_secret_key_123',
    ENVIRONMENT: 'development',
    ALLOWED_ORIGINS: 'http://localhost:3000,https://mskaymaz.com'
  };

  it('1. should validate complete Env bindings correctly', () => {
    const result = validateEnvBindings(mockEnv);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('2. should detect missing D1/R2/Secret bindings safely', () => {
    const incompleteEnv = { DB: {} as D1Database } as Env;
    const result = validateEnvBindings(incompleteEnv);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('MEDIA (R2Bucket)');
    expect(result.missing).toContain('JWT_SECRET');
  });

  it('3. should respond to /api/health with status UP and CORS headers', async () => {
    const request = new Request('http://localhost/api/health', {
      method: 'GET',
      headers: { Origin: 'http://localhost:3000' }
    });

    const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');

    const json = await response.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('UP');
    expect(typeof json.data.timestamp).toBe('number');
  });

  it('4. should handle preflight OPTIONS requests with 204 status', async () => {
    const request = new Request('http://localhost/api/health', {
      method: 'OPTIONS',
      headers: { Origin: 'https://mskaymaz.com' }
    });

    const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://mskaymaz.com');
  });

  it('5. should return 404 for unknown routes', async () => {
    const request = new Request('http://localhost/api/unknown-route', {
      method: 'GET'
    });

    const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(404);

    const json = await response.json() as any;
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('6. should 301 redirect /aniltilar variations to canonical /blog/anilts', async () => {
    const paths = ['/aniltilar', '/aniltilar/', '/aniltilar.html', '/aniltilar/extra'];
    for (const p of paths) {
      const req = new Request(`https://msklabs.org${p}`, { method: 'GET' });
      const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
      expect(res.status).toBe(301);
      expect(res.headers.get('Location')).toBe('https://msklabs.org/blog/anilts');
    }
  });

  it('7. should 301 redirect /blog/blog.html to /blog', async () => {
    const req = new Request('https://msklabs.org/blog/blog.html', { method: 'GET' });
    const res = await worker.fetch(req, mockEnv, {} as ExecutionContext);
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('https://msklabs.org/blog');
  });
});
