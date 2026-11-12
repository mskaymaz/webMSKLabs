import { Env } from './types/env.js';
import { handleRequest } from './routes/index.js';
import { createRequestContext } from './middleware/request.js';
import { globalErrorHandler } from './middleware/error.js';
import { handleInboundEmail } from './services/emailInboundService.js';
import {
  getMaintenanceConfig,
  checkPathMaintenance,
  checkAdminBypass,
  generateMaintenance503Response,
} from './utils/maintenance.js';

/**
 * ARCH-003 & COM-INBOUND-001 — Modular Route, Middleware & Inbound Email Worker Entry
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 0. Bakım Modu Kalkanı (Maintenance Shield Interceptor - HTTP 503 & Admin Bypass)
    const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|webmanifest|json|map)$/i.test(pathname);
    const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin') || pathname.startsWith('/api/v1/admin');
    const isBypassPath = pathname === '/api/health' || pathname === '/api/v1/health' || pathname === '/api/v1/maintenance';

    if (!isStaticAsset && !isAdminRoute && !isBypassPath && env.DB) {
      try {
        const mConfig = await getMaintenanceConfig(env.DB);
        const mCheck = checkPathMaintenance(pathname, mConfig);
        if (mCheck.inMaintenance && !checkAdminBypass(request)) {
          if (pathname.startsWith('/api/')) {
            return new Response(JSON.stringify({
              error: 'Hizmet geçici olarak planlı bakım modundadır.',
              message: mCheck.message || mConfig.message,
              eta: mCheck.eta,
            }), {
              status: 503,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Retry-After': '3600',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
              },
            });
          }

          // Statik maintenance.html şablonunu ASSETS üzerinden 503 status ile sunma
          if (env.ASSETS) {
            try {
              const mQuery = new URLSearchParams({
                title: mCheck.routeTitle || 'MSK Labs',
                msg: mCheck.message || mConfig.message || '',
                eta: mCheck.eta || '',
              });
              const mAssetReq = new Request(new URL(`/maintenance.html?${mQuery.toString()}`, request.url), request);
              const mAssetRes = await env.ASSETS.fetch(mAssetReq);
              if (mAssetRes.status === 200) {
                const newHeaders = new Headers(mAssetRes.headers);
                newHeaders.set('Retry-After', '3600');
                newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
                return new Response(mAssetRes.body, {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: newHeaders,
                });
              }
            } catch (mAssetErr) {
              console.warn('[Maintenance Asset Fallback Error]', mAssetErr);
            }
          }

          return generateMaintenance503Response(mCheck.routeTitle || 'MSK Labs', mCheck.message || mConfig.message, mCheck.eta);
        }
      } catch (mErr) {
        console.warn('[Maintenance Interceptor Error]', mErr);
      }
    }

    // 1. API ve Dinamik Edge Uç Noktaları (Router üzerinden işlenir)
    if (pathname.startsWith('/api/') || pathname === '/api' || pathname === '/sitemap.xml') {
      const context = createRequestContext(request, env);
      try {
        return await handleRequest(request, env);
      } catch (err) {
        return globalErrorHandler(err, context);
      }
    }

    // SEO & Eski Rota 301 Kalıcı Yönlendirmeleri (Googlebot & Arama İndeksi Onarımı)
    const normalizedPath = (pathname.endsWith('/') && pathname.length > 1) ? pathname.slice(0, -1) : pathname;
    if (normalizedPath === '/aniltilar' || normalizedPath === '/aniltilar.html' || pathname.startsWith('/aniltilar/')) {
      return Response.redirect('https://msklabs.org/blog/anilts', 301);
    }
    if (normalizedPath === '/blog/blog.html' || normalizedPath === '/blog/blog' || pathname.startsWith('/blog/blog/')) {
      return Response.redirect('https://msklabs.org/blog', 301);
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
