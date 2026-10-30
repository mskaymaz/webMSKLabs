import { Env } from '../types/env.js';

/**
 * SEC-ADV-001 — Security Headers & CSP Management Helper
 */
export function getSecurityHeaders(request: Request, env: Env): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://challenges.cloudflare.com https://generativelanguage.googleapis.com https://script.google.com https://api.telegram.org",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), payment=()'
  };

  const url = new URL(request.url);
  const isHttps = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  const isProduction = env.ENVIRONMENT === 'production';

  if (url.pathname.includes('/admin') || url.pathname.includes('/auth')) {
    headers['Cache-Control'] = 'no-store, no-cache, private, must-revalidate';
  }

  if (isProduction || isHttps) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}

/**
 * Applies security headers to an outgoing Response object without mutating original headers directly.
 */
export function applySecurityHeaders(response: Response, securityHeaders: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) {
    if (!newHeaders.has(key)) {
      newHeaders.set(key, value);
    }
  }

  const body = (response.status === 204 || response.status === 205 || response.status === 304) ? null : response.body;

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
