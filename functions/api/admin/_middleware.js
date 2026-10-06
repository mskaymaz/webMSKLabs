/**
 * DevAdmin API Guard Middleware
 * Intercepts requests under /api/admin/
 * Applies Rate Limiting, Security Headers & Auth Verification
 */

import { getAuthenticatedAdmin } from './_auth.js';
import { checkRateLimit } from './_rateLimit.js';
import { errorResponse } from './_response.js';

export async function onRequest(context) {
    const { request, env, data } = context;
    const url = new URL(request.url);

    // Extract client IP address safely
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

    // Apply General Rate Limiting (60 requests / minute)
    const rateCheck = checkRateLimit(clientIp, 'admin_api', 60, 60000);
    if (!rateCheck.allowed) {
        return errorResponse(
            'Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.',
            429,
            null,
            { 'Retry-After': String(rateCheck.retryAfter) }
        );
    }

    // Bypass auth verification for public auth endpoints
    if (url.pathname === '/api/admin/login') {
        return context.next();
    }

    const authHeader = request.headers.get('Authorization');
    const admin = await getAuthenticatedAdmin(env, authHeader);

    if (!admin) {
        return errorResponse('Geçersiz veya süresi dolmuş oturum.', 401, null, {
            'WWW-Authenticate': 'Bearer'
        });
    }

    // Attach authenticated admin context to downstream handlers
    data.admin = admin;
    return context.next();
}
