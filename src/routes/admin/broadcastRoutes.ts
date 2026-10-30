import { Router } from '../../utils/router.js';
import { jsonResponse, errorResponse } from '../../utils/response.js';
import { requirePermission } from '../../middleware/auth.js';
import { withIdempotency } from '../../middleware/idempotency.js';
import { checkRateLimit } from '../../middleware/rateLimit.js';
import { createBroadcastService } from '../../services/broadcastService.js';

export const broadcastRouter = new Router();

const handleBroadcast = withIdempotency(async (ctx: any) => {
  // 1. Mandatory Idempotency Key Check for API-005
  const idempotencyKey = ctx.request.headers.get('X-Idempotency-Key');
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
    return errorResponse(
      'Toplu e-posta gönderimi için X-Idempotency-Key başlığı zorunludur.',
      'INVALID_IDEMPOTENCY_KEY',
      400,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }

  // 2. Strict Rate Limit: 2 requests / minute (API-005)
  const rateLimitKey = ctx.user ? `admin_${ctx.user.id}` : ctx.clientIp || '127.0.0.1';
  const rateCheck = checkRateLimit(rateLimitKey, 'broadcast', 2, 60000);

  if (!rateCheck.allowed) {
    return errorResponse(
      `Rate limit aşıldı. Lütfen ${rateCheck.retryAfter} saniye sonra tekrar deneyin.`,
      'TOO_MANY_REQUESTS',
      429,
      { 'Retry-After': String(rateCheck.retryAfter), ...ctx.corsHeaders },
      undefined,
      ctx.requestId
    );
  }

  // 3. Parse Request Body
  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  // 4. Execute Service
  const res = await createBroadcastService(ctx, body || {});
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
  }

  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

broadcastRouter.post(
  '/broadcast',
  handleBroadcast,
  requirePermission('settings.manage')
);
