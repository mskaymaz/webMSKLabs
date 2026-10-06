import { Env } from '../types/env.js';

export function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowedOriginsStr = env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://mskaymaz.com';
  const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim());

  const isAllowed = allowedOrigins.includes(origin);
  const allowOrigin = isAllowed ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
}
