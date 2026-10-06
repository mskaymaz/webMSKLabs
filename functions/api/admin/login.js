/**
 * POST /api/admin/login
 * Admin Login Endpoint with WebCrypto PBKDF2 verification, JWT generation & D1 Session persistence
 */

import { verifyPassword, hashPassword, generateToken } from './_crypto.js';
import { createAdminSession, logAdminAudit } from './_auth.js';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { username, password } = body || {};

        if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Bad Request',
                message: 'Kullanıcı adı ve şifre zorunludur.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
        const userAgent = request.headers.get('user-agent') || 'Unknown';

        let admin = null;
        if (env.DB) {
            admin = await env.DB.prepare(`
                SELECT id, username, password_hash, role, is_active FROM admins WHERE username = ? LIMIT 1
            `).bind(username.trim()).first();
        }

        // Timing-attack prevention: perform dummy hash verification if user not found
        if (!admin) {
            const dummyHash = '$pbkdf2$v=1$i=100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
            await verifyPassword(password, dummyHash);

            return new Response(JSON.stringify({
                success: false,
                error: 'Unauthorized',
                message: 'Kullanıcı adı veya şifre hatalı.'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        if (admin.is_active !== 1) {
            await logAdminAudit(env, admin.id, 'LOGIN_FAILED', 'auth', { reason: 'Account disabled' }, clientIp);
            return new Response(JSON.stringify({
                success: false,
                error: 'Forbidden',
                message: 'Hesabınız pasif durumdadır.'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        const isPasswordValid = await verifyPassword(password, admin.password_hash);
        if (!isPasswordValid) {
            await logAdminAudit(env, admin.id, 'LOGIN_FAILED', 'auth', { reason: 'Invalid password' }, clientIp);
            return new Response(JSON.stringify({
                success: false,
                error: 'Unauthorized',
                message: 'Kullanıcı adı veya şifre hatalı.'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        // Generate JWT Token
        const secret = env.JWT_SECRET || 'DEVADMIN_FALLBACK_SECRET_KEY_2026_DEV_ONLY';
        const token = await generateToken({
            admin_id: admin.id,
            username: admin.username,
            role: admin.role
        }, secret);

        // Store session in D1
        await createAdminSession(env, admin.id, token, clientIp, userAgent);
        await logAdminAudit(env, admin.id, 'LOGIN_SUCCESS', 'auth', { role: admin.role }, clientIp);

        return new Response(JSON.stringify({
            success: true,
            token,
            user: {
                id: admin.id,
                username: admin.username,
                role: admin.role
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    } catch (error) {
        console.error('Login Endpoint Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal Error',
            message: 'Giriş işlemi sırasında bir sunucu hatası oluştu.'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}
