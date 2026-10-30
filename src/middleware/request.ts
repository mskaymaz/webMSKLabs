import { Env } from '../types/env.js';
import { RequestContext } from '../types/router.js';
import { getCorsHeaders } from './cors.js';
import { getSecurityHeaders } from './securityHeaders.js';

export function createRequestContext(request: Request, env: Env): RequestContext {
  const url = new URL(request.url);

  // 1. Extract, sanitize, or generate X-Request-ID
  let rawRequestId = request.headers.get('X-Request-ID');
  let requestId = '';
  if (rawRequestId && typeof rawRequestId === 'string') {
    requestId = rawRequestId.replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 64);
  }
  if (!requestId) {
    requestId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 2. Extract Client IP Safely
  const clientIp = request.headers.get('cf-connecting-ip') ||
                   request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   '127.0.0.1';

  // 3. Derive CORS & Security headers
  const corsHeaders = getCorsHeaders(request, env);
  const securityHeaders = getSecurityHeaders(request, env);

  return {
    request,
    env,
    url,
    params: {},
    query: url.searchParams,
    requestId,
    clientIp,
    corsHeaders,
    securityHeaders
  };
}
