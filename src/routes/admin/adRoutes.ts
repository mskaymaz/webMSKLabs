import { Router } from '../../utils/router.js';
import { jsonResponse, errorResponse } from '../../utils/response.js';
import { requirePermission } from '../../middleware/auth.js';
import { withIdempotency } from '../../middleware/idempotency.js';
import { checkRateLimit } from '../../middleware/rateLimit.js';
import {
  getAdSettingsService,
  createAdSettingService,
  updateAdSettingService
} from '../../services/adService.js';

export const adRouter = new Router();

const RATE_LIMIT_MAX = 300;
const RATE_LIMIT_WINDOW_MS = 60000;

// Helper to check SUPER_ADMIN / ADMIN role enforcement
function checkSuperAdminRole(ctx: any) {
  const role = ctx.user?.role;
  if (!role || role !== 'SUPER_ADMIN') {
    return errorResponse(
      'Bu işlem için yetkiniz bulunmamaktadır.',
      'FORBIDDEN',
      403,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }
  return null;
}

// GET /ads — List all ad settings
adRouter.get(
  '/ads',
  async (ctx: any) => {
    const roleError = checkSuperAdminRole(ctx);
    if (roleError) return roleError;

    const rateLimitKey = ctx.user ? `admin_${ctx.user.id}` : ctx.clientIp || '127.0.0.1';
    const rateCheck = checkRateLimit(rateLimitKey, 'admin_ads', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
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

    const res = await getAdSettingsService(ctx);
    if (res.error) {
      return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
    }
    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  },
  requirePermission('settings.manage')
);

// POST /ads — Create new ad setting
const handleCreateAd = withIdempotency(async (ctx: any) => {
  const roleError = checkSuperAdminRole(ctx);
  if (roleError) return roleError;

  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const res = await createAdSettingService(ctx, body || {});
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, (res.error as any).details, ctx.requestId);
  }
  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

adRouter.post(
  '/ads',
  handleCreateAd,
  requirePermission('settings.manage')
);

// PUT /ads/:id — Update existing ad setting
const handleUpdateAd = withIdempotency(async (ctx: any) => {
  const roleError = checkSuperAdminRole(ctx);
  if (roleError) return roleError;

  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const res = await updateAdSettingService(ctx, ctx.params.id, body || {});
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, (res.error as any).details, ctx.requestId);
  }
  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

adRouter.put(
  '/ads/:id',
  handleUpdateAd,
  requirePermission('settings.manage')
);

adRouter.patch(
  '/ads/:id',
  handleUpdateAd,
  requirePermission('settings.manage')
);
