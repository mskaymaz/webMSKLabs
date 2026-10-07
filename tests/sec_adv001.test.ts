import { describe, it, expect } from 'vitest';
import { handleRequest } from '../src/routes/index.js';
import { getSecurityHeaders, applySecurityHeaders } from '../src/middleware/securityHeaders.js';
import { Env } from '../src/types/env.js';
import { generateToken } from '../src/utils/crypto.js';

describe('SEC-ADV-001 — Security Headers & CSP Management Tests', () => {
  const mockEnv: Env = {
    DB: {} as D1Database,
    MEDIA: {} as R2Bucket,
    JWT_SECRET: 'test_jwt_secret_key_123',
    ENVIRONMENT: 'development',
    ALLOWED_ORIGINS: 'http://localhost:5173,https://mskaymaz.com'
  } as any;

  describe('1. Security Headers Presence on Various Responses', () => {
    it('should attach mandatory security headers to 200 OK responses', async () => {
      const req = new Request('http://localhost/api/health');
      const res = await handleRequest(req, mockEnv);

      expect(res.status).toBe(200);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('Permissions-Policy')).toBe('geolocation=(), camera=(), microphone=(), payment=()');
      expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });

    it('should attach security headers to 204 OPTIONS preflight responses', async () => {
      const req = new Request('http://localhost/api/health', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' }
      });
      const res = await handleRequest(req, mockEnv);

      expect(res.status).toBe(204);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Content-Security-Policy')).toBeDefined();
    });

    it('should attach security headers to 404 Not Found responses', async () => {
      const req = new Request('http://localhost/api/non-existent-route');
      const res = await handleRequest(req, mockEnv);

      expect(res.status).toBe(404);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Content-Security-Policy')).toBeDefined();
    });

    it('should attach security headers to 401 Unauthorized responses', async () => {
      const req = new Request('http://localhost/api/admin/tickets', {
        method: 'GET'
      });
      const res = await handleRequest(req, mockEnv);

      expect(res.status).toBe(401);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should attach security headers to 500 Server Error responses', async () => {
      const token = await generateToken(
        { admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' },
        mockEnv.JWT_SECRET
      );
      const req = new Request('http://localhost/api/admin/tickets', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const envWithError: Env = {
        ...mockEnv,
        DB: {
          prepare: () => { throw new Error('D1 Connection Simulated Failure'); }
        } as any
      };

      const res = await handleRequest(req, envWithError);
      expect(res.status).toBe(500);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });

  describe('2. HSTS (Strict-Transport-Security) Policy Enforcement', () => {
    it('should NOT attach HSTS in local HTTP development environment', async () => {
      const req = new Request('http://localhost/api/health');
      const devEnv: Env = { ...mockEnv, ENVIRONMENT: 'development' };

      const res = await handleRequest(req, devEnv);
      expect(res.headers.get('Strict-Transport-Security')).toBeNull();
    });

    it('should attach HSTS in production environment even over http request object', async () => {
      const req = new Request('http://mskaymaz.com/api/health');
      const prodEnv: Env = { ...mockEnv, ENVIRONMENT: 'production' };

      const res = await handleRequest(req, prodEnv);
      expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains; preload');
    });

    it('should attach HSTS when request protocol is https regardless of ENVIRONMENT setting', async () => {
      const req = new Request('https://mskaymaz.com/api/health');
      const devEnv: Env = { ...mockEnv, ENVIRONMENT: 'development' };

      const res = await handleRequest(req, devEnv);
      expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains; preload');
    });

    it('should attach HSTS when x-forwarded-proto is https', async () => {
      const req = new Request('http://mskaymaz.com/api/health', {
        headers: { 'x-forwarded-proto': 'https' }
      });
      const devEnv: Env = { ...mockEnv, ENVIRONMENT: 'development' };

      const res = await handleRequest(req, devEnv);
      expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains; preload');
    });
  });

  describe('3. Content-Security-Policy Directives Verification', () => {
    it('should contain all required CSP directives', () => {
      const req = new Request('http://localhost/api/health');
      const headers = getSecurityHeaders(req, mockEnv);
      const csp = headers['Content-Security-Policy'];

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' https://challenges.cloudflare.com");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("img-src 'self' data: https: blob:");
      expect(csp).toContain("font-src 'self' data:");
      expect(csp).toContain("connect-src 'self' https://challenges.cloudflare.com https://generativelanguage.googleapis.com https://script.google.com https://api.telegram.org");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    });
  });

  describe('4. Coexistence with CORS & System Headers', () => {
    it('should retain CORS headers alongside security headers', async () => {
      const req = new Request('http://localhost/api/health', {
        headers: { Origin: 'http://localhost:5173' }
      });
      const res = await handleRequest(req, mockEnv);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should correctly handle 204 null body in applySecurityHeaders', () => {
      const origRes = new Response(null, { status: 204, headers: { 'X-Custom': 'test' } });
      const secHeaders = { 'X-Frame-Options': 'DENY' };

      const finalRes = applySecurityHeaders(origRes, secHeaders);
      expect(finalRes.status).toBe(204);
      expect(finalRes.headers.get('X-Custom')).toBe('test');
      expect(finalRes.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });
});
