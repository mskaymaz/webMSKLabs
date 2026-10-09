import { RequestContext } from '../types/router.js';

/**
 * PERF-001 — Cloudflare Edge Cache Optimization Helper & Constants
 */

export const PUBLIC_CACHE_HEADER = 'public, max-age=300, s-maxage=600, stale-while-revalidate=60';
export const PRIVATE_CACHE_HEADER = 'no-store, no-cache, private, must-revalidate';

/**
 * Generates a deterministic ETag hash for given data or revision number.
 */
export function generateETag(data: any, version?: string | number): string {
  if (version !== undefined && version !== null) {
    return `W/"v${version}"`;
  }

  const str = typeof data === 'string' ? data : JSON.stringify(data || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const positiveHash = (hash >>> 0).toString(16);
  return `W/"${positiveHash}-${str.length}"`;
}

/**
 * Checks If-None-Match header in request against current ETag.
 */
export function checkETagMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('if-none-match') || request.headers.get('If-None-Match');
  if (!ifNoneMatch) return false;
  return ifNoneMatch.trim() === etag.trim() || ifNoneMatch.includes(etag);
}

/**
 * Determines appropriate Cache-Control header based on security guard principles.
 * Private/admin routes or requests with auth tokens/cookies are NEVER cached publicly.
 */
export function getCacheControlHeader(request: Request, isPublicRoute = false): string {
  const hasAuth =
    request.headers.has('authorization') ||
    request.headers.has('cookie') ||
    request.headers.has('x-admin-token');

  const url = new URL(request.url);
  const isAdminPath = url.pathname.includes('/admin');

  if (hasAuth || isAdminPath || !isPublicRoute) {
    return PRIVATE_CACHE_HEADER;
  }

  return PUBLIC_CACHE_HEADER;
}
