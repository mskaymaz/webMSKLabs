import { Router } from '../utils/router.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { checkRateLimit } from '../middleware/rateLimit.js';
import { PUBLIC_CACHE_HEADER, generateETag, checkETagMatch } from '../middleware/cache.js';

export const publicCmsRouter = new Router();

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
        'Cache-Control': PUBLIC_CACHE_HEADER,
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
    'Cache-Control': PUBLIC_CACHE_HEADER,
    'ETag': etag
  }, ctx.requestId);
}

async function handlePublicPostDetail(ctx: any) {
  const slug = ctx.params.slug;
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

  const dynamicEtag = generateETag(post, post.revision_number);
  if (checkETagMatch(ctx.request, dynamicEtag)) {
    return new Response(null, {
      status: 304,
      headers: { ...ctx.corsHeaders, 'Cache-Control': PUBLIC_CACHE_HEADER, 'ETag': dynamicEtag }
    });
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
    'Cache-Control': PUBLIC_CACHE_HEADER,
    'ETag': dynamicEtag
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
  return jsonResponse(channels, 200, { ...ctx.corsHeaders, 'Cache-Control': PUBLIC_CACHE_HEADER }, ctx.requestId);
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

async function handlePublicPostAudioStream(ctx: any) {
  const slug = ctx.params.slug;
  if (!slug) {
    return errorResponse('Slug belirtilmedi.', 'BAD_REQUEST', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  let post: any = null;
  if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      post = await ctx.env.DB.prepare(`
        SELECT id, slug, status, revision_number, audio_r2_key, audio_status, audio_version
        FROM blog_posts
        WHERE slug = ? AND status = 'PUBLISHED' AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)
      `).bind(slug).first();
    } catch {
      post = null;
    }
  }

  if (!post || post.audio_status !== 'APPROVED' || Number(post.revision_number || 1) !== Number(post.audio_version || 0)) {
    return errorResponse(
      'Ses dosyası bulunamadı, sürüm uyuşmazlığı var veya henüz onaylanmadı.',
      'AUDIO_NOT_FOUND_OR_INVALID',
      404,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }

  const r2Key = post.audio_r2_key || `audio/${slug}.mp3`;
  const bucket = ctx.env?.MEDIA || ctx.env?.AUDIO_BUCKET || ctx.env?.R2;

  if (!bucket || typeof bucket.get !== 'function') {
    return errorResponse('R2 medya depolama servisi kullanılamıyor.', 'STORAGE_UNAVAILABLE', 503, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const rangeHeader = ctx.request.headers.get('range') || ctx.request.headers.get('Range');
  let object: any = null;

  try {
    if (rangeHeader) {
      object = await bucket.get(r2Key, { range: ctx.request.headers });
    } else {
      object = await bucket.get(r2Key);
    }
  } catch {
    return errorResponse('Ses dosyası getirilirken depolama hatası oluştu.', 'STORAGE_ERROR', 500, ctx.corsHeaders, undefined, ctx.requestId);
  }

  if (!object) {
    return errorResponse('Ses dosyası R2 deposunda bulunamadı.', 'AUDIO_NOT_FOUND', 404, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const headers = new Headers();
  if (typeof object.writeHttpMetadata === 'function') {
    object.writeHttpMetadata(headers);
  }
  if (object.httpEtag) {
    headers.set('ETag', object.httpEtag);
  }
  headers.set('Cache-Control', PUBLIC_CACHE_HEADER);
  headers.set('Accept-Ranges', 'bytes');
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', 'audio/mpeg');
  }

  Object.entries(ctx.corsHeaders || {}).forEach(([k, v]) => {
    headers.set(k, String(v));
  });

  const statusCode = rangeHeader ? 206 : 200;
  return new Response(object.body, {
    status: statusCode,
    headers
  });
}

publicCmsRouter.get('/api/v1/posts', handlePublicPostsList);
publicCmsRouter.get('/api/posts', handlePublicPostsList);

publicCmsRouter.get('/api/v1/posts/:slug', handlePublicPostDetail);
publicCmsRouter.get('/api/posts/:slug', handlePublicPostDetail);

publicCmsRouter.get('/api/v1/channels', handlePublicChannelsList);
publicCmsRouter.get('/api/channels', handlePublicChannelsList);

publicCmsRouter.get('/api/v1/sitemap.xml', handlePublicSitemap);
publicCmsRouter.get('/sitemap.xml', handlePublicSitemap);

publicCmsRouter.get('/api/v1/posts/:slug/audio', handlePublicPostAudioStream);
publicCmsRouter.get('/api/posts/:slug/audio', handlePublicPostAudioStream);
