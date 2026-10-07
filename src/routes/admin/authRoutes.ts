import { Router } from '../../utils/router.js';
import { jsonResponse, errorResponse } from '../../utils/response.js';
import { loginAdminService, logoutAdminService } from '../../services/authService.js';
import { requireAuth } from '../../middleware/auth.js';
import { validatePayload } from '../../utils/sanitize.js';

export const authRouter = new Router();

authRouter.post('/login', async (ctx) => {
  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return errorResponse('Girdi doğrulama hatası.', 'VALIDATION_ERROR', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const validation = validatePayload(body || {}, {
    username: { required: true, type: 'string', minLength: 3, maxLength: 50 },
    password: { required: true, type: 'string', minLength: 6, maxLength: 100 }
  });

  if (!validation.valid) {
    return errorResponse('Girdi doğrulama hatası.', 'VALIDATION_ERROR', 400, ctx.corsHeaders, validation.errors, ctx.requestId);
  }

  const res = await loginAdminService(ctx, body);
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
  }

  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

authRouter.post('/logout', async (ctx) => {
  const res = await logoutAdminService(ctx);
  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
}, requireAuth);

authRouter.get('/me', async (ctx) => {
  if (!ctx.user) {
    return errorResponse('Geçersiz veya süresi dolmuş oturum.', 'UNAUTHORIZED', 401, ctx.corsHeaders, undefined, ctx.requestId);
  }
  return jsonResponse({
    user: {
      admin_id: ctx.user.id,
      username: ctx.user.username,
      role: ctx.user.role
    }
  }, 200, ctx.corsHeaders, ctx.requestId);
}, requireAuth);
