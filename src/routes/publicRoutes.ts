import { Router } from '../utils/router.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { checkRateLimit } from '../middleware/rateLimit.js';
import { validatePayload, escapeText } from '../utils/sanitize.js';
import { verifyTurnstileToken } from '../utils/turnstile.js';
import { createPublicSupportTicketService } from '../services/supportService.js';
import { getPublicCommentsService, createCommentService } from '../services/commentService.js';
import { subscribeService, unsubscribeService, verifySubscribeService } from '../services/newsletterService.js';
import { withIdempotency } from '../middleware/idempotency.js';
import { publicCmsRouter } from './publicCmsRoutes.js';

export const publicRouter = new Router();
publicRouter.use('', publicCmsRouter);

async function logAudit(ctx: any, action: string, details: any) {
  if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      await ctx.env.DB.prepare(`INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address) VALUES (NULL, ?, ?, ?, ?)`).bind(action, ctx.url.pathname, JSON.stringify(details), ctx.clientIp).run();
    } catch {}
  }
}

// --- API-001 Public Support ---
async function handlePublicSupportSubmission(ctx: any) {
  const routeKey = `route:${ctx.url.pathname}`;
  const rateCheck = checkRateLimit(ctx.clientIp, routeKey, 5, 60000);
  if (!rateCheck.allowed) {
    await logAudit(ctx, 'RATE_LIMIT_EXCEEDED', { retryAfter: rateCheck.retryAfter });
    return errorResponse(
      'Çok fazla destek talebi gönderildi. Lütfen biraz bekleyip tekrar deneyin.',
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

  const rawName = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : body?.name;
  const rawEmail = typeof body?.email === 'string' ? body.email.trim() : body?.email;
  const rawSubject = typeof body?.subject === 'string' ? body.subject.trim() : body?.subject;
  const rawMessage = typeof body?.message === 'string' ? body.message.trim() : body?.message;

  const validation = validatePayload(
    { name: rawName, email: rawEmail, subject: rawSubject, message: rawMessage },
    {
      name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
      email: { required: true, type: 'email', maxLength: 255 },
      subject: { required: true, type: 'string', minLength: 3, maxLength: 150 },
      message: { required: true, type: 'string', minLength: 10, maxLength: 3000 }
    }
  );

  if (!validation.valid) {
    return errorResponse('Girdi doğrulama hatası.', 'VALIDATION_ERROR', 400, ctx.corsHeaders, validation.errors, ctx.requestId);
  }

  const turnstileToken = body.turnstile_token || body.turnstileToken || ctx.request.headers.get('cf-turnstile-response');
  const turnstileResult = await verifyTurnstileToken(ctx, turnstileToken);

  if (!turnstileResult.success) {
    await logAudit(ctx, 'TURNSTILE_REJECTED', { code: turnstileResult.errorCode });
    return errorResponse(
      turnstileResult.errorMessage || 'Güvenlik doğrulaması başarısız oldu.',
      turnstileResult.errorCode || 'INVALID_TURNSTILE_TOKEN',
      turnstileResult.statusCode || 400,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }

  try {
    const res = await createPublicSupportTicketService(ctx, {
      name: escapeText(rawName),
      email: rawEmail.toLowerCase(),
      subject: escapeText(rawSubject),
      message: escapeText(rawMessage),
      category: body.category ? escapeText(String(body.category).trim()) : 'GENERAL'
    });

    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  } catch (err: any) {
    return errorResponse(
      'Destek talebi kaydı sırasında bir sunucu hatası oluştu.',
      'INTERNAL_SERVER_ERROR',
      500,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }
}

const idempotentSupportHandler = withIdempotency(handlePublicSupportSubmission);
publicRouter.post('/api/v1/support', idempotentSupportHandler);
publicRouter.post('/api/support', idempotentSupportHandler);

// --- API-002 Public Comments ---
async function handlePublicCommentList(ctx: any) {
  const postSlug = ctx.query.get('postSlug') || ctx.query.get('post_slug') || undefined;

  const cacheKeyStr = ctx.url.toString();
  const cfCaches = (globalThis as any).caches;
  const cache = cfCaches && cfCaches.default ? cfCaches.default : null;
  if (cache) {
    try {
      const cached = await cache.match(cacheKeyStr);
      if (cached) return cached;
    } catch {}
  }

  const res = await getPublicCommentsService(ctx, postSlug);
  const headers = { ...ctx.corsHeaders, 'Cache-Control': 'public, max-age=300, s-maxage=300' };

  const responsePayload = {
    success: true,
    data: res.data,
    meta: { ...res.meta, timestamp: new Date().toISOString(), requestId: ctx.requestId }
  };

  const response = jsonResponse(responsePayload, res.status, headers, ctx.requestId);

  if (cache && response.status === 200) {
    try {
      ctx.executionCtx?.waitUntil
        ? ctx.executionCtx.waitUntil(cache.put(cacheKeyStr, response.clone()))
        : cache.put(cacheKeyStr, response.clone());
    } catch {}
  }

  return response;
}

async function handlePublicCommentSubmission(ctx: any) {
  const routeKey = `route:${ctx.url.pathname}`;
  const rateCheck = checkRateLimit(ctx.clientIp, routeKey, 3, 60000);
  if (!rateCheck.allowed) {
    await logAudit(ctx, 'RATE_LIMIT_EXCEEDED', { retryAfter: rateCheck.retryAfter });
    return errorResponse(
      'Çok fazla yorum gönderildi. Lütfen biraz bekleyip tekrar deneyin.',
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

  const rawPostSlug = typeof body?.postSlug === 'string' ? body.postSlug.trim() : (typeof body?.post_slug === 'string' ? body.post_slug.trim() : body?.postSlug);
  const rawAuthorName = typeof body?.authorName === 'string' ? body.authorName.trim().replace(/\s+/g, ' ') : body?.authorName;
  const rawAuthorEmail = typeof body?.authorEmail === 'string' ? body.authorEmail.trim() : body?.authorEmail;
  const rawContent = typeof body?.content === 'string' ? body.content.trim() : body?.content;

  const validation = validatePayload(
    { postSlug: rawPostSlug, authorName: rawAuthorName, authorEmail: rawAuthorEmail, content: rawContent },
    {
      postSlug: { required: true, type: 'string', minLength: 1, maxLength: 150 },
      authorName: { required: true, type: 'string', minLength: 2, maxLength: 50 },
      authorEmail: { required: true, type: 'email', maxLength: 255 },
      content: { required: true, type: 'string', minLength: 5, maxLength: 1000 }
    }
  );

  if (!validation.valid) {
    return errorResponse('Girdi doğrulama hatası.', 'VALIDATION_ERROR', 400, ctx.corsHeaders, validation.errors, ctx.requestId);
  }

  const turnstileToken = body.turnstile_token || body.turnstileToken || ctx.request.headers.get('cf-turnstile-response');
  const turnstileResult = await verifyTurnstileToken(ctx, turnstileToken);

  if (!turnstileResult.success) {
    await logAudit(ctx, 'TURNSTILE_REJECTED', { code: turnstileResult.errorCode });
    return errorResponse(
      turnstileResult.errorMessage || 'Güvenlik doğrulaması başarısız oldu.',
      turnstileResult.errorCode || 'INVALID_TURNSTILE_TOKEN',
      turnstileResult.statusCode || 400,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }

  try {
    const res = await createCommentService(ctx, {
      postSlug: rawPostSlug,
      authorName: rawAuthorName,
      authorEmail: rawAuthorEmail,
      content: rawContent
    });

    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  } catch (err: any) {
    return errorResponse(
      'Yorum kaydedilirken bir sunucu hatası oluştu.',
      'INTERNAL_SERVER_ERROR',
      500,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }
}

publicRouter.get('/api/v1/comments', handlePublicCommentList);
publicRouter.get('/api/comments', handlePublicCommentList);

const idempotentCommentHandler = withIdempotency(handlePublicCommentSubmission);
publicRouter.post('/api/v1/comments', idempotentCommentHandler);
publicRouter.post('/api/comments', idempotentCommentHandler);

// --- API-003 Public Newsletter ---
async function handlePublicSubscribeSubmission(ctx: any) {
  const routeKey = `route:${ctx.url.pathname}`;
  const rateCheck = checkRateLimit(ctx.clientIp, routeKey, 5, 60000);
  if (!rateCheck.allowed) {
    await logAudit(ctx, 'RATE_LIMIT_EXCEEDED', { retryAfter: rateCheck.retryAfter });
    return errorResponse(
      'Çok fazla abonelik denemesi yapıldı. Lütfen biraz bekleyip tekrar deneyin.',
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

  // Mandatory KVKK consent check
  if (body?.kvkkConsent !== true && body?.kvkk_consent !== true) {
    return errorResponse(
      'KVKK ve aydınlatma metni onayı zorunludur.',
      'VALIDATION_ERROR',
      400,
      ctx.corsHeaders,
      { kvkkConsent: 'KVKK ve aydınlatma metni onayı zorunludur.' },
      ctx.requestId
    );
  }

  const rawEmail = typeof body?.email === 'string' ? body.email.trim() : body?.email;

  const validation = validatePayload(
    { email: rawEmail },
    { email: { required: true, type: 'email', maxLength: 255 } }
  );

  if (!validation.valid) {
    return errorResponse('Girdi doğrulama hatası.', 'VALIDATION_ERROR', 400, ctx.corsHeaders, validation.errors, ctx.requestId);
  }

  const turnstileToken = body.turnstile_token || body.turnstileToken || ctx.request.headers.get('cf-turnstile-response');
  const turnstileResult = await verifyTurnstileToken(ctx, turnstileToken);

  if (!turnstileResult.success) {
    return errorResponse(
      turnstileResult.errorMessage || 'Güvenlik doğrulaması başarısız oldu.',
      turnstileResult.errorCode || 'INVALID_TURNSTILE_TOKEN',
      turnstileResult.statusCode || 400,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }

  try {
    const res = await subscribeService(ctx, {
      email: rawEmail,
      kvkkConsent: true
    });

    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  } catch (err: any) {
    return errorResponse(
      'Abonelik kaydı sırasında bir sunucu hatası oluştu.',
      'INTERNAL_SERVER_ERROR',
      500,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }
}

async function handlePublicUnsubscribeSubmission(ctx: any) {
  const routeKey = `route:${ctx.url.pathname}`;
  const rateCheck = checkRateLimit(ctx.clientIp, routeKey, 10, 60000);
  if (!rateCheck.allowed) {
    return errorResponse('Çok fazla istek gönderildi.', 'TOO_MANY_REQUESTS', 429, ctx.corsHeaders, undefined, ctx.requestId);
  }

  let body: any = {};
  try {
    body = await ctx.request.json();
  } catch {}

  const rawToken =
    (typeof body?.token === 'string' ? body.token.trim() : undefined) ||
    ctx.query.get('token') ||
    ctx.request.headers.get('X-Unsubscribe-Token');

  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 16) {
    return errorResponse(
      'Geçersiz abonelik sonlandırma jetonu.',
      'VALIDATION_ERROR',
      400,
      ctx.corsHeaders,
      { token: 'Jeton zorunludur ve en az 16 karakter olmalıdır.' },
      ctx.requestId
    );
  }

  try {
    const res = await unsubscribeService(ctx, rawToken);
    if (res.error) {
      return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
    }
    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  } catch (err: any) {
    return errorResponse(
      'Abonelik sonlandırma sırasında bir sunucu hatası oluştu.',
      'INTERNAL_SERVER_ERROR',
      500,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }
}

async function handlePublicSubscribeVerify(ctx: any) {
  const routeKey = `route:${ctx.url.pathname}`;
  const rateCheck = checkRateLimit(ctx.clientIp, routeKey, 10, 60000);
  if (!rateCheck.allowed) {
    return errorResponse('Çok fazla istek gönderildi.', 'TOO_MANY_REQUESTS', 429, ctx.corsHeaders, undefined, ctx.requestId);
  }

  let body: any = {};
  try {
    body = await ctx.request.json();
  } catch {}

  const rawToken =
    (typeof body?.token === 'string' ? body.token.trim() : undefined) ||
    ctx.query.get('token');

  if (!rawToken || typeof rawToken !== 'string') {
    return errorResponse(
      'Doğrulama jetonu zorunludur.',
      'VALIDATION_ERROR',
      400,
      ctx.corsHeaders,
      { token: 'Doğrulama jetonu zorunludur.' },
      ctx.requestId
    );
  }

  try {
    const res = await verifySubscribeService(ctx, rawToken);
    if (res.error) {
      return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
    }
    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  } catch (err: any) {
    return errorResponse(
      'Doğrulama sırasında bir sunucu hatası oluştu.',
      'INTERNAL_SERVER_ERROR',
      500,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }
}

const idempotentSubscribeHandler = withIdempotency(handlePublicSubscribeSubmission);
const idempotentUnsubscribeHandler = withIdempotency(handlePublicUnsubscribeSubmission);

publicRouter.post('/api/v1/subscribe', idempotentSubscribeHandler);
publicRouter.post('/api/subscribe', idempotentSubscribeHandler);

publicRouter.post('/api/v1/unsubscribe', idempotentUnsubscribeHandler);
publicRouter.post('/api/unsubscribe', idempotentUnsubscribeHandler);
publicRouter.get('/api/v1/unsubscribe', handlePublicUnsubscribeSubmission);
publicRouter.get('/api/unsubscribe', handlePublicUnsubscribeSubmission);

publicRouter.post('/api/v1/subscribe/verify', handlePublicSubscribeVerify);
publicRouter.post('/api/subscribe/verify', handlePublicSubscribeVerify);
