import { RequestContext, RouteHandler } from '../types/router.js';
import { errorResponse, jsonResponse } from '../utils/response.js';
import { hashToken } from '../utils/crypto.js';

export interface IdempotencyRecord {
  state: 'IN_PROGRESS' | 'COMPLETED';
  status?: number;
  body?: any;
  claimedAt?: string;
  completedAt?: string;
}

/**
 * Validates Idempotency Key format.
 * Must be 16 to 64 characters long and contain only alphanumeric, hyphen, or underscore characters.
 */
export function isValidIdempotencyKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 16 || trimmed.length > 64) return false;
  return /^[a-zA-Z0-9_\-]+$/.test(trimmed);
}

/**
 * Derives a secure, isolated KV storage key for idempotency tracking.
 * Storage key format: idempotency:v1:{identity}:{method}:{pathname}:{sha256(key)}
 */
export async function deriveIdempotencyStorageKey(ctx: RequestContext, rawKey: string): Promise<string> {
  const hashedKey = await hashToken(rawKey.trim());
  const identity = ctx.user ? `user_${ctx.user.id}` : `ip_${ctx.clientIp || '127.0.0.1'}`;
  const method = ctx.request.method.toUpperCase();
  const pathname = ctx.url.pathname.toLowerCase();
  return `idempotency:v1:${identity}:${method}:${pathname}:${hashedKey}`;
}

/**
 * Idempotency Route Handler Wrapper (API-007)
 * Ensures state-changing operations (POST, PUT, PATCH, DELETE) are executed idempotently.
 */
export function withIdempotency(handler: RouteHandler): RouteHandler {
  return async (ctx: RequestContext): Promise<Response> => {
    const rawKey = ctx.request.headers.get('X-Idempotency-Key');

    // If no Idempotency key is provided or method is safe (GET/OPTIONS), execute handler directly
    if (!rawKey || ctx.request.method === 'GET' || ctx.request.method === 'OPTIONS') {
      return await handler(ctx);
    }

    // 1. Validate Idempotency Key format
    if (!isValidIdempotencyKey(rawKey)) {
      return errorResponse(
        'Geçersiz X-Idempotency-Key başlığı. Anahtar 16-64 karakter arasında ve alfanümerik olmalıdır.',
        'INVALID_IDEMPOTENCY_KEY',
        400,
        ctx.corsHeaders,
        undefined,
        ctx.requestId
      );
    }

    // 2. Verify KV Storage Availability (Fail-Closed Policy for Idempotent Requests)
    const kv = ctx.env.IDEMPOTENCY_STORE;
    if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function') {
      return errorResponse(
        'Idempotency depolama servisi geçici olarak kullanılamıyor.',
        'IDEMPOTENCY_STORE_UNAVAILABLE',
        503,
        ctx.corsHeaders,
        undefined,
        ctx.requestId
      );
    }

    const kvKey = await deriveIdempotencyStorageKey(ctx, rawKey);

    // 3. Inspect KV State Machine
    let existingRecord: IdempotencyRecord | null = null;
    try {
      existingRecord = await kv.get<IdempotencyRecord>(kvKey, 'json');
    } catch {
      existingRecord = null;
    }

    if (existingRecord) {
      if (existingRecord.state === 'IN_PROGRESS') {
        return errorResponse(
          'Aynı işlem halen devam ediyor.',
          'IDEMPOTENCY_IN_PROGRESS',
          409,
          ctx.corsHeaders,
          undefined,
          ctx.requestId
        );
      }

      if (existingRecord.state === 'COMPLETED' && existingRecord.body !== undefined) {
        // Replay saved response without re-executing business logic or side-effects
        return jsonResponse(
          existingRecord.body,
          existingRecord.status || 200,
          ctx.corsHeaders,
          ctx.requestId
        );
      }
    }

    // 4. Claim IN_PROGRESS Lock in KV (short TTL for processing window)
    const inProgressRecord: IdempotencyRecord = {
      state: 'IN_PROGRESS',
      claimedAt: new Date().toISOString()
    };
    try {
      await kv.put(kvKey, JSON.stringify(inProgressRecord), { expirationTtl: 60 });
    } catch {
      // If KV write fails, proceed safely or return 503
      return errorResponse(
        'Idempotency durumu kaydedilemedi.',
        'IDEMPOTENCY_STORE_UNAVAILABLE',
        503,
        ctx.corsHeaders,
        undefined,
        ctx.requestId
      );
    }

    // 5. Execute Primary Route Handler
    let response: Response;
    try {
      response = await handler(ctx);
    } catch (err) {
      // On unhandled handler failure, clear lock so retry is possible
      try {
        await kv.delete(kvKey);
      } catch {
        // Ignore KV delete error
      }
      throw err;
    }

    // 6. Save COMPLETED state for 2xx/3xx/4xx responses with 24h TTL (86400s)
    if (response.status >= 200 && response.status < 500) {
      try {
        const clonedRes = response.clone();
        const jsonBody = await clonedRes.json().catch(() => null);

        if (jsonBody !== null) {
          const completedRecord: IdempotencyRecord = {
            state: 'COMPLETED',
            status: response.status,
            body: jsonBody,
            completedAt: new Date().toISOString()
          };
          await kv.put(kvKey, JSON.stringify(completedRecord), { expirationTtl: 86400 });
        }
      } catch {
        // Ignore response caching failure if body is non-JSON or clone fails
      }
    } else if (response.status >= 500) {
      // Server error (5xx) -> delete lock to allow client retry
      try {
        await kv.delete(kvKey);
      } catch {
        // Ignore
      }
    }

    return response;
  };
}
