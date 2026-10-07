import { describe, it, expect } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { Env } from '../src/types/env.js';
import { generateToken } from '../src/utils/crypto.js';

describe('API-006 — API Versioning & Standard Response Contract Tests', () => {
  const mockEnv: Env = {
    DB: {} as D1Database,
    MEDIA: {} as R2Bucket,
    JWT_SECRET: 'test_api006_jwt_secret_123',
    ENVIRONMENT: 'development',
    ALLOWED_ORIGINS: 'http://localhost:5173,https://mskaymaz.com'
  } as any;

  describe('1. Standard Response Contract Format (Success & Error)', () => {
    it('should return standardized JSON contract for successful responses', async () => {
      const req = new Request('http://localhost/api/v1/health');
      const res = await handleRequest(req, mockEnv);

      expect(res.status).toBe(200);
      const json = await res.json() as any;

      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.status).toBe('UP');
      expect(json.meta).toBeDefined();
      expect(json.meta.timestamp).toBeDefined();
      expect(json.meta.requestId).toBeDefined();
    });

    it('should return standardized JSON contract for error responses (404 Not Found)', async () => {
      const req = new Request('http://localhost/api/v1/unknown-endpoint');
      const res = await handleRequest(req, mockEnv);

      expect(res.status).toBe(404);
      const json = await res.json() as any;

      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe('NOT_FOUND');
      expect(json.error.message).toBeDefined();
      expect(Array.isArray(json.error.details)).toBe(true);
      expect(json.meta).toBeDefined();
      expect(json.meta.timestamp).toBeDefined();
      expect(json.meta.requestId).toBeDefined();
    });

    it('should return standardized 500 error envelope without leaking stack traces or internal paths', async () => {
      const token = await generateToken(
        { admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' },
        mockEnv.JWT_SECRET
      );
      const req = new Request('http://localhost/api/v1/admin/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const envWithError: Env = {
        ...mockEnv,
        ENVIRONMENT: 'production',
        DB: {
          prepare: () => { throw new Error('Sensitive SQL Syntax Error at /var/internal/db.sqlite'); }
        } as any
      };

      const res = await handleRequest(req, envWithError);
      expect(res.status).toBe(500);

      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('SERVER_ERROR');
      expect(json.error.message).toBe('Sunucu tarafında beklenmeyen bir hata oluştu.');
      expect(json.error.message).not.toContain('Sensitive SQL');
      expect(json.error.message).not.toContain('/var/internal');
      expect(json.meta.requestId).toBeDefined();
    });
  });

  describe('2. Request ID Generation & Sanitization', () => {
    it('should sanitize client-provided X-Request-ID to prevent log injection', async () => {
      const dirtyReqId = 'req_12345<script>alert(1)</script>_very_long_invalid_string_with_symbols!!!';
      const req = new Request('http://localhost/api/v1/health', {
        headers: { 'X-Request-ID': dirtyReqId }
      });

      const res = await handleRequest(req, mockEnv);
      const reqIdHeader = res.headers.get('X-Request-ID');
      const json = await res.json() as any;

      expect(reqIdHeader).not.toContain('<script>');
      expect(reqIdHeader).not.toContain('!');
      expect(json.meta.requestId).toBe(reqIdHeader);
      expect(reqIdHeader!.length).toBeLessThanOrEqual(64);
    });
  });

  describe('3. API Versioning & Legacy Alias Compatibility', () => {
    it('should support canonical /api/v1/health and legacy /api/health identically', async () => {
      const reqV1 = new Request('http://localhost/api/v1/health');
      const resV1 = await handleRequest(reqV1, mockEnv);

      const reqLegacy = new Request('http://localhost/api/health');
      const resLegacy = await handleRequest(reqLegacy, mockEnv);

      expect(resV1.status).toBe(200);
      expect(resLegacy.status).toBe(200);

      const jsonV1 = await resV1.json() as any;
      const jsonLegacy = await resLegacy.json() as any;

      expect(jsonV1.data.status).toBe(jsonLegacy.data.status);
    });

    it('should support canonical /api/v1/admin/me and legacy /api/admin/me without 301 redirect', async () => {
      const reqV1 = new Request('http://localhost/api/v1/admin/me');
      const resV1 = await handleRequest(reqV1, mockEnv);

      const reqLegacy = new Request('http://localhost/api/admin/me');
      const resLegacy = await handleRequest(reqLegacy, mockEnv);

      expect(resV1.status).toBe(401);
      expect(resLegacy.status).toBe(401);
      expect(resV1.status).not.toBe(301);
      expect(resLegacy.status).not.toBe(301);
    });
  });

  describe('4. Security & System Integration Regression Checks', () => {
    it('should retain Security Headers and CORS headers alongside standard response contract', async () => {
      const req = new Request('http://localhost/api/v1/health', {
        headers: { Origin: 'http://localhost:5173' }
      });
      const res = await handleRequest(req, mockEnv);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Request-ID')).toBeDefined();
    });
  });

  describe('5. Middleware Execution Performance Benchmark', () => {
    it('should execute middleware and router dispatch in less than 1ms average', async () => {
      const req = new Request('http://localhost/api/v1/health');
      
      // Warm-up
      await handleRequest(req, mockEnv);

      const iterations = 100;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await handleRequest(req, mockEnv);
      }
      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / iterations;

      expect(avgDuration).toBeLessThan(1.0); // Benchmark target < 1ms
    });
  });
});
