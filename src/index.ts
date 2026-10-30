import { Env } from './types/env.js';
import { handleRequest } from './routes/index.js';
import { createRequestContext } from './middleware/request.js';
import { globalErrorHandler } from './middleware/error.js';
import { handleInboundEmail } from './services/emailInboundService.js';

/**
 * ARCH-003 & COM-INBOUND-001 — Modular Route, Middleware & Inbound Email Worker Entry
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. API ve Dinamik Edge Uç Noktaları (Router üzerinden işlenir)
    if (pathname.startsWith('/api/') || pathname === '/api' || pathname === '/sitemap.xml') {
      const context = createRequestContext(request, env);
      try {
        return await handleRequest(request, env);
      } catch (err) {
        return globalErrorHandler(err, context);
      }
    }

    // 2. Statik Varlıklar ve SPA Yönlendirmesi (Cloudflare Worker Assets)
    if (env.ASSETS) {
      try {
        const lastSegment = pathname.split('/').pop() || '';
        const hasExtension = lastSegment.includes('.');

        // SPA Rota Yönlendirmeleri: /admin ve /blog
        if (!hasExtension) {
          if (pathname === '/admin' || pathname.startsWith('/admin/')) {
            return await env.ASSETS.fetch(new Request(new URL('/admin/index.html', request.url), request));
          }
          if (pathname === '/blog' || pathname.startsWith('/blog/')) {
            return await env.ASSETS.fetch(new Request(new URL('/blog/blog.html', request.url), request));
          }
        }

        // Doğrudan statik varlık isteği
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes.status !== 404) {
          return assetRes;
        }

        // Uzantısız HTML istekleri için otomatik .html denemesi (/about -> /about.html)
        if (!hasExtension && pathname !== '/') {
          const htmlUrl = new URL(`${pathname}.html`, request.url);
          const htmlRes = await env.ASSETS.fetch(new Request(htmlUrl, request));
          if (htmlRes.status === 200) {
            return htmlRes;
          }
        }

        // Özel 404 sayfası
        const notFoundRes = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url), request));
        if (notFoundRes.status === 200) {
          return new Response(notFoundRes.body, { status: 404, headers: notFoundRes.headers });
        }
        return assetRes;
      } catch (assetErr) {
        console.error('[Worker ASSETS] Fetch error:', assetErr);
      }
    }

    // 3. Fallback: Router
    const context = createRequestContext(request, env);
    try {
      return await handleRequest(request, env);
    } catch (err) {
      return globalErrorHandler(err, context);
    }
  },

  async email(message: any, env: Env, ctx: ExecutionContext): Promise<void> {
    await handleInboundEmail(message, env, ctx);
  }
};
