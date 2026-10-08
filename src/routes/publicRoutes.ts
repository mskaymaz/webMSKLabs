import { Router } from '../utils/router.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { validateEnvBindings } from '../utils/env.js';
import { checkRateLimit } from '../middleware/rateLimit.js';
import { validatePayload, escapeText } from '../utils/sanitize.js';
import { verifyTurnstileToken } from '../utils/turnstile.js';
import { createPublicSupportTicketService } from '../services/supportService.js';
import { getPublicCommentsService, createCommentService } from '../services/commentService.js';
import { subscribeService, unsubscribeService, verifySubscribeService } from '../services/newsletterService.js';
import { withIdempotency } from '../middleware/idempotency.js';

export const publicRouter = new Router();

// --- API-001 Public Support ---
async function handlePublicSupportSubmission(ctx: any) {
  const routeKey = `route:${ctx.url.pathname}`;
  const rateCheck = checkRateLimit(ctx.clientIp, routeKey, 5, 60000);
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
      if (cached) {
        return cached;
      }
    } catch {
      // Ignore cache match error
    }
  }

  const res = await getPublicCommentsService(ctx, postSlug);

  const headers = {
    ...ctx.corsHeaders,
    'Cache-Control': 'public, max-age=300, s-maxage=300'
  };

  const responsePayload = {
    success: true,
    data: res.data,
    meta: {
      ...res.meta,
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId
    }
  };

  const response = jsonResponse(responsePayload, res.status, headers, ctx.requestId);

  if (cache && response.status === 200) {
    try {
      ctx.executionCtx?.waitUntil
        ? ctx.executionCtx.waitUntil(cache.put(cacheKeyStr, response.clone()))
        : cache.put(cacheKeyStr, response.clone());
    } catch {
      // Ignore cache put error
    }
  }

  return response;
}

async function handlePublicCommentSubmission(ctx: any) {
  const routeKey = `route:${ctx.url.pathname}`;
  const rateCheck = checkRateLimit(ctx.clientIp, routeKey, 3, 60000);
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
  } catch {
    // Body might be empty if query params or headers are used
  }

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
  } catch {
    // Body might be empty if query params are used
  }

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

// --- CMS-005 Public Headless CMS REST API ---
async function handlePublicPostsList(ctx: any) {
  const routeKey = `route:${ctx.url.pathname}`;
  const rateCheck = checkRateLimit(ctx.clientIp, routeKey, 60, 60000);
  if (!rateCheck.allowed) {
    return errorResponse('Çok fazla istek gönderildi.', 'TOO_MANY_REQUESTS', 429, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const etag = 'W/"cms-posts-v1-hash"';
  const ifNoneMatch = ctx.request.headers.get('if-none-match') || ctx.request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...ctx.corsHeaders,
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'ETag': etag
      }
    });
  }

  let posts: any[] = [];
  if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      const res = await ctx.env.DB.prepare(`
        SELECT id, slug, title_tr, content_tr, summary_tr, cover_image, status, published_at, created_at
        FROM blog_posts
        WHERE status = 'PUBLISHED' AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)
        ORDER BY published_at DESC LIMIT 50
      `).all();
      posts = (res.results || []).map((p: any) => {
        const { ai_metadata, prompt_version, admin_id, ...clean } = p;
        return clean;
      });
    } catch {
      posts = [];
    }
  }

  return jsonResponse(posts, 200, {
    ...ctx.corsHeaders,
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    'ETag': etag
  }, ctx.requestId);
}

async function handlePublicPostDetail(ctx: any) {
  const slug = ctx.params.slug;
  const etag = `W/"post-${slug}-hash"`;
  const ifNoneMatch = ctx.request.headers.get('if-none-match') || ctx.request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: { ...ctx.corsHeaders, 'Cache-Control': 'public, max-age=300, s-maxage=600', 'ETag': etag }
    });
  }

  let post: any = null;
  if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      post = await ctx.env.DB.prepare(`
        SELECT id, slug, title_tr, title_en, title_ar, content_tr, content_en, content_ar, summary_tr, summary_en, summary_ar, cover_image, status, published_at, created_at, source_id, translation_status, revision_number
        FROM blog_posts
        WHERE slug = ? AND status = 'PUBLISHED' AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)
      `).bind(slug).first();
    } catch {
      post = null;
    }
  }

  if (!post) {
    return errorResponse('Yazı bulunamadı veya yayınlanmamış.', 'NOT_FOUND', 404, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const { ai_metadata, prompt_version, admin_id, internal_notes, ...cleanPost } = post;
  const canonical = `https://msklabs.org/blog/${cleanPost.slug}`;
  const hreflang = {
    tr: `https://msklabs.org/tr/blog/${cleanPost.slug}`,
    en: `https://msklabs.org/en/blog/${cleanPost.slug}`,
    ar: `https://msklabs.org/ar/blog/${cleanPost.slug}`
  };

  const responsePayload = {
    ...cleanPost,
    canonical,
    hreflang,
    source_id: cleanPost.source_id || cleanPost.id,
    translation_status: cleanPost.translation_status || 'APPROVED',
    revision_number: cleanPost.revision_number || 1
  };

  return jsonResponse(responsePayload, 200, {
    ...ctx.corsHeaders,
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    'ETag': etag
  }, ctx.requestId);
}

async function handlePublicChannelsList(ctx: any) {
  let channels: any[] = [];
  if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      const res = await ctx.env.DB.prepare('SELECT id, slug, name_tr, icon FROM blog_channels WHERE is_active = 1').all();
      channels = res.results || [];
    } catch {
      channels = [];
    }
  }
  return jsonResponse(channels, 200, { ...ctx.corsHeaders, 'Cache-Control': 'public, max-age=300, s-maxage=600' }, ctx.requestId);
}

async function handlePublicSitemap(ctx: any) {
  let posts: any[] = [];
  if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      const res = await ctx.env.DB.prepare(`
        SELECT slug, published_at, created_at
        FROM blog_posts
        WHERE status = 'PUBLISHED' AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)
        ORDER BY published_at DESC LIMIT 500
      `).all();
      posts = res.results || [];
    } catch {
      posts = [];
    }
  }

  const postUrlsXml = posts.map((p) => {
    const lastmod = (p.published_at || p.created_at || new Date().toISOString()).split('T')[0];
    return `  <url>
    <loc>https://msklabs.org/blog/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="tr" href="https://msklabs.org/tr/blog/${p.slug}"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://msklabs.org/en/blog/${p.slug}"/>
    <xhtml:link rel="alternate" hreflang="ar" href="https://msklabs.org/ar/blog/${p.slug}"/>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://msklabs.org/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="tr" href="https://msklabs.org/tr/"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://msklabs.org/en/"/>
    <xhtml:link rel="alternate" hreflang="ar" href="https://msklabs.org/ar/"/>
  </url>
  <url>
    <loc>https://msklabs.org/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="tr" href="https://msklabs.org/tr/blog"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://msklabs.org/en/blog"/>
    <xhtml:link rel="alternate" hreflang="ar" href="https://msklabs.org/ar/blog"/>
  </url>
${postUrlsXml}
</urlset>`;






  return new Response(xml, {
    status: 200,
    headers: {
      ...ctx.corsHeaders,
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

publicRouter.get('/api/v1/posts', handlePublicPostsList);
publicRouter.get('/api/posts', handlePublicPostsList);

publicRouter.get('/api/v1/posts/:slug', handlePublicPostDetail);
publicRouter.get('/api/posts/:slug', handlePublicPostDetail);

publicRouter.get('/api/v1/channels', handlePublicChannelsList);
publicRouter.get('/api/channels', handlePublicChannelsList);

publicRouter.get('/api/v1/sitemap.xml', handlePublicSitemap);
publicRouter.get('/sitemap.xml', handlePublicSitemap);
