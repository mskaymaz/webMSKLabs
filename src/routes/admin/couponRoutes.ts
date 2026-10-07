import { Router } from '../../utils/router.js';
import { jsonResponse, errorResponse } from '../../utils/response.js';
import { requirePermission } from '../../middleware/auth.js';
import { withIdempotency } from '../../middleware/idempotency.js';
import { checkRateLimit } from '../../middleware/rateLimit.js';
import {
  createCouponService,
  getCouponsService,
  deleteCouponService
} from '../../services/couponService.js';

export const couponRouter = new Router();

const RATE_LIMIT_MAX = 300;
const RATE_LIMIT_WINDOW_MS = 60000;

// POST /coupons — Create new coupon
const handleCreateCoupon = withIdempotency(async (ctx: any) => {
  const rateLimitKey = ctx.user ? `admin_${ctx.user.id}` : ctx.clientIp || '127.0.0.1';
  const rateCheck = checkRateLimit(rateLimitKey, 'admin_coupons', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

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

  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const res = await createCouponService(ctx, body || {});
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
  }

  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

couponRouter.post(
  '/coupons',
  handleCreateCoupon,
  requirePermission('settings.manage')
);

// GET /coupons — List coupons
couponRouter.get(
  '/coupons',
  async (ctx: any) => {
    const rateLimitKey = ctx.user ? `admin_${ctx.user.id}` : ctx.clientIp || '127.0.0.1';
    const rateCheck = checkRateLimit(rateLimitKey, 'admin_coupons', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

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

    const page = ctx.url.searchParams.get('page');
    const limit = ctx.url.searchParams.get('limit');
    const res = await getCouponsService(ctx, { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });

    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  },
  requirePermission('settings.manage')
);

// DELETE /coupons/:id — Delete coupon by ID or Code
const handleDeleteCoupon = withIdempotency(async (ctx: any) => {
  const rateLimitKey = ctx.user ? `admin_${ctx.user.id}` : ctx.clientIp || '127.0.0.1';
  const rateCheck = checkRateLimit(rateLimitKey, 'admin_coupons', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

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

  const res = await deleteCouponService(ctx, ctx.params.id);
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
  }

  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

couponRouter.delete(
  '/coupons/:id',
  handleDeleteCoupon,
  requirePermission('settings.manage')
);
