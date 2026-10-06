/**
 * DevAdmin API Guard Middleware
 * Automatically intercepts requests under /api/admin/
 * Excludes unauthenticated endpoints (like /api/admin/login)
 */

import { getAuthenticatedAdmin } from './_auth.js';

export async function onRequest(context) {
    const { request, env, data } = context;
    const url = new URL(request.url);

    // Bypass authentication for public auth endpoints
    if (url.pathname === '/api/admin/login') {
        return context.next();
    }

    const authHeader = request.headers.get('Authorization');
    const admin = await getAuthenticatedAdmin(env, authHeader);

    if (!admin) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized',
            message: 'Geçersiz veya süresi dolmuş oturum.'
        }), {
            status: 401,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'WWW-Authenticate': 'Bearer'
            }
        });
    }

    // Attach authenticated admin context to downstream handlers
    data.admin = admin;
    return context.next();
}
