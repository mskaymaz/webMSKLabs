import { Env } from '../types/env.js';

export function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');

  const defaultOrigins = env.ENVIRONMENT === 'production'
    ? 'https://mskaymaz.com,https://webmsklabs.pages.dev'
    : 'http://localhost:3000,http://localhost:5173,https://mskaymaz.com';

  const allowedOriginsStr = env.ALLOWED_ORIGINS || defaultOrigins;
  const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim()).filter(Boolean);

  const hasWildcard = allowedOrigins.includes('*');

  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Request-ID'
  };

  // Reject wildcard '*' combined with credentials
  if (hasWildcard) {
    return headers;
  }

  if (origin) {
    const isAllowed = allowedOrigins.includes(origin);
    if (isAllowed) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Access-Control-Max-Age'] = '86400';
    }
    // Disallowed origin: Access-Control-Allow-Origin is omitted so browser blocks cross-origin access
  } else {
    // Default fallback for requests without Origin header
    if (allowedOrigins.length > 0) {
      headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  return headers;
}
