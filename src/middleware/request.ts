import { Env } from '../types/env.js';
import { RequestContext } from '../types/router.js';
import { getCorsHeaders } from './cors.js';

export function createRequestContext(request: Request, env: Env): RequestContext {
  const url = new URL(request.url);

  // 1. Generate or extract X-Request-ID
  const existingRequestId = request.headers.get('X-Request-ID');
  const requestId = existingRequestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  // 2. Extract Client IP Safely
  const clientIp = request.headers.get('cf-connecting-ip') ||
                   request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   '127.0.0.1';

  // 3. Derive CORS headers
  const corsHeaders = getCorsHeaders(request, env);

  return {
    request,
    env,
    url,
    params: {},
    query: url.searchParams,
    requestId,
    clientIp,
    corsHeaders
  };
}
