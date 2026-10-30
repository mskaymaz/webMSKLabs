/**
 * POST /api/admin/logout
 * DevAdmin Session Revocation Endpoint
 */

import { revokeAdminSession, logAdminAudit } from './_auth.js';

export async function onRequestPost(context) {
    const { request, env, data } = context;
    const admin = data.admin;

    const authHeader = request.headers.get('Authorization');
    const token = authHeader ? authHeader.substring(7).trim() : null;

    if (token) {
        await revokeAdminSession(env, token);
    }

    if (admin) {
        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
        await logAdminAudit(env, admin.id, 'LOGOUT', 'auth', {}, clientIp);
    }

    return new Response(JSON.stringify({
        success: true,
        message: 'Oturum başarıyla kapatıldı.'
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
}
