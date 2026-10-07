import { Router } from '../utils/router.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { validateEnvBindings } from '../utils/env.js';
import { checkRateLimit } from '../middleware/rateLimit.js';
import { validatePayload, escapeText } from '../utils/sanitize.js';
import { verifyTurnstileToken } from '../utils/turnstile.js';
import { createPublicSupportTicketService } from '../services/supportService.js';

export const publicRouter = new Router();

publicRouter.get('/api/health', (ctx) => {
  const envCheck = validateEnvBindings(ctx.env);
  return jsonResponse(
    {
      status: 'UP',
      service: 'webmsklabs-edge',
      environment: ctx.env.ENVIRONMENT || 'development',
      bindings: {
        d1: !!ctx.env.DB,
        r2: !!ctx.env.MEDIA,
        jwtSecretConfigured: !!ctx.env.JWT_SECRET,
        valid: envCheck.valid,
        missing: envCheck.missing
      }
    },
    envCheck.valid ? 200 : 500,
    ctx.corsHeaders,
    ctx.requestId
  );
});

publicRouter.get('/api/v1/health', (ctx) => {
  const envCheck = validateEnvBindings(ctx.env);
  return jsonResponse(
    {
      status: 'UP',
      service: 'webmsklabs-edge',
      environment: ctx.env.ENVIRONMENT || 'development',
      bindings: {
        d1: !!ctx.env.DB,
        r2: !!ctx.env.MEDIA,
        jwtSecretConfigured: !!ctx.env.JWT_SECRET,
        valid: envCheck.valid,
        missing: envCheck.missing
      }
    },
    envCheck.valid ? 200 : 500,
    ctx.corsHeaders,
    ctx.requestId
  );
});

async function handlePublicSupportSubmission(ctx: any) {
  // 1. Rate Limiting per IP + Route (max 10 requests / 1 minute)
  const routeKey = `route:${ctx.url.pathname}`;
  const rateCheck = checkRateLimit(ctx.clientIp, routeKey, 10, 60000);
  if (!rateCheck.allowed) {
    if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
      try {
        await ctx.env.DB.prepare(`
          INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
          VALUES (NULL, 'RATE_LIMIT_EXCEEDED', ?, ?, ?)
        `).bind(ctx.url.pathname, JSON.stringify({ retryAfter: rateCheck.retryAfter }), ctx.clientIp).run();
      } catch {
        // Ignore audit logging error
      }
    }

    return errorResponse(
      'Çok fazla destek talebi gönderildi. Lütfen biraz bekleyip tekrar deneyin.',
      'TOO_MANY_REQUESTS',
      429,
      { 'Retry-After': String(rateCheck.retryAfter), ...ctx.corsHeaders },
      undefined,
      ctx.requestId
    );
  }

  // 2. Parse & Validate Payload
  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const validation = validatePayload(body || {}, {
    name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    email: { required: true, type: 'email' },
    subject: { required: true, type: 'string', minLength: 3, maxLength: 150 },
    message: { required: true, type: 'string', minLength: 5, maxLength: 2000 }
  });

  if (!validation.valid) {
    return errorResponse('Girdi doğrulama hatası.', 'VALIDATION_ERROR', 400, ctx.corsHeaders, validation.errors, ctx.requestId);
  }

  // 3. Server-side Turnstile Verification
  const turnstileToken = body.turnstile_token || body.turnstileToken || ctx.request.headers.get('cf-turnstile-response');
  const turnstileResult = await verifyTurnstileToken(ctx, turnstileToken);

  if (!turnstileResult.success) {
    if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
      try {
        await ctx.env.DB.prepare(`
          INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
          VALUES (NULL, 'TURNSTILE_REJECTED', ?, ?, ?)
        `).bind(ctx.url.pathname, JSON.stringify({ code: turnstileResult.errorCode }), ctx.clientIp).run();
      } catch {
        // Ignore audit logging error
      }
    }

    return errorResponse(
      turnstileResult.errorMessage || 'Güvenlik doğrulaması başarısız oldu.',
      turnstileResult.errorCode || 'INVALID_TURNSTILE_TOKEN',
      turnstileResult.statusCode || 400,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }

  // 4. Create Ticket
  const res = await createPublicSupportTicketService(ctx, {
    name: escapeText(body.name),
    email: body.email.trim().toLowerCase(),
    subject: escapeText(body.subject),
    message: escapeText(body.message),
    category: body.category ? escapeText(body.category) : 'GENERAL'
  });

  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
}

publicRouter.post('/api/v1/support', handlePublicSupportSubmission);
publicRouter.post('/api/support', handlePublicSupportSubmission);
