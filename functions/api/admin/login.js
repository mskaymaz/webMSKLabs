/**
 * POST /api/admin/login
 * Admin Login Endpoint with WebCrypto PBKDF2, Lockout Protection & Security Response
 */

import { verifyPassword, generateToken } from './_crypto.js';
import { createAdminSession, logAdminAudit } from './_auth.js';
import { checkLoginLockout, recordFailedLogin, resetFailedLogin } from './_rateLimit.js';
import { validatePayload, escapeText } from './_sanitize.js';
import { jsonResponse, errorResponse } from './_response.js';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
        const userAgent = request.headers.get('user-agent') || 'Unknown';

        let body;
        try {
            body = await request.json();
        } catch {
            return errorResponse('Geçersiz JSON verisi.', 400);
        }

        // 1. Input Validation Schema
        const validation = validatePayload(body || {}, {
            username: { required: true, type: 'string', minLength: 3, maxLength: 30 },
            password: { required: true, type: 'string', minLength: 6, maxLength: 100 }
        });

        if (!validation.valid) {
            return errorResponse('Girdi doğrulama hatası.', 400, validation.errors);
        }

        const username = escapeText(body.username.trim());
        const password = body.password;

        // 2. Brute-Force Lockout Check
        const lockoutStatus = checkLoginLockout(clientIp, username);
        if (lockoutStatus.locked) {
            await logAdminAudit(env, null, 'LOGIN_LOCKOUT_BLOCKED', 'auth', { username, ip: clientIp }, clientIp);
            return errorResponse(
                `Çok sayıda başarısız giriş denemesi. Hesabınız geçici olarak kilitlendi. Lütfen ${lockoutStatus.retryAfter} saniye sonra tekrar deneyin.`,
                429,
                null,
                { 'Retry-After': String(lockoutStatus.retryAfter) }
            );
        }

        // 3. User Lookup
        let admin = null;
        if (env.DB) {
            admin = await env.DB.prepare(`
                SELECT id, username, password_hash, role, is_active FROM admins WHERE username = ? LIMIT 1
            `).bind(username).first();
        }

        // Timing-attack prevention: perform dummy hash verification if user not found
        if (!admin) {
            const dummyHash = '$pbkdf2$v=1$i=100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
            await verifyPassword(password, dummyHash);
            recordFailedLogin(clientIp, username);

            return errorResponse('Kullanıcı adı veya şifre hatalı.', 401);
        }

        if (admin.is_active !== 1) {
            await logAdminAudit(env, admin.id, 'LOGIN_FAILED', 'auth', { reason: 'Account disabled' }, clientIp);
            return errorResponse('Hesabınız pasif durumdadır.', 403);
        }

        // 4. Password Verification
        const isPasswordValid = await verifyPassword(password, admin.password_hash);
        if (!isPasswordValid) {
            const lockResult = recordFailedLogin(clientIp, username);
            await logAdminAudit(env, admin.id, 'LOGIN_FAILED', 'auth', { reason: 'Invalid password', attempts: lockResult.failedAttempts }, clientIp);

            if (lockResult.locked) {
                return errorResponse(
                    `Çok sayıda başarısız giriş denemesi. Hesabınız 15 dakika kilitlendi.`,
                    429,
                    null,
                    { 'Retry-After': String(lockResult.retryAfter) }
                );
            }

            return errorResponse('Kullanıcı adı veya şifre hatalı.', 401);
        }

        // 5. Successful Authentication
        resetFailedLogin(clientIp, username);

        const secret = env.JWT_SECRET || 'DEVADMIN_FALLBACK_SECRET_KEY_2026_DEV_ONLY';
        const token = await generateToken({
            admin_id: admin.id,
            username: admin.username,
            role: admin.role
        }, secret);

        await createAdminSession(env, admin.id, token, clientIp, userAgent);
        await logAdminAudit(env, admin.id, 'LOGIN_SUCCESS', 'auth', { role: admin.role }, clientIp);

        return jsonResponse({
            success: true,
            token,
            user: {
                id: admin.id,
                username: admin.username,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Login Endpoint Internal Error:', error);
        return errorResponse('Giriş işlemi sırasında bir sunucu hatası oluştu.', 500);
    }
}
