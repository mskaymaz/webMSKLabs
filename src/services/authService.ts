import { RequestContext } from '../types/router.js';
import { verifyPassword, generateToken, hashToken } from '../utils/crypto.js';
import { checkLoginLockout, recordFailedLogin, resetFailedLogin } from '../middleware/rateLimit.js';

async function logAdminAudit(ctx: RequestContext, adminId: number | null, action: string, details?: Record<string, any>) {
  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') return;
  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      adminId,
      action,
      '/api/admin/auth',
      details ? JSON.stringify(details) : null,
      ctx.clientIp || null
    ).run();
  } catch {
    // Ignore audit log write errors so primary auth flow proceeds safely
  }
}

export async function loginAdminService(ctx: RequestContext, body: any) {
  const secret = ctx.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    return {
      status: 500,
      error: {
        message: 'Sunucu konfigürasyon hatası.',
        code: 'SERVER_MISCONFIGURATION'
      }
    };
  }

  const { username, password } = body || {};
  const clientIp = ctx.clientIp || '127.0.0.1';
  const userAgent = ctx.request?.headers?.get('user-agent') || 'Unknown';

  const lockoutStatus = checkLoginLockout(clientIp, username || '');
  if (lockoutStatus.locked) {
    return {
      status: 429,
      error: {
        message: `Çok sayıda başarısız giriş denemesi. Hesabınız geçici kilitlendi. Lütfen ${lockoutStatus.retryAfter} saniye sonra tekrar deneyin.`,
        code: 'LOCKOUT'
      }
    };
  }

  const dummyHash = '$pbkdf2$v=1$i=100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';

  let admin: any = null;
  if (ctx.env.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      admin = await ctx.env.DB.prepare(`
        SELECT id, username, password_hash, role, is_active FROM admins WHERE username = ? LIMIT 1
      `).bind(username).first();
    } catch {
      admin = null;
    }
  }

  if (!admin) {
    await verifyPassword(password || '', dummyHash);
    recordFailedLogin(clientIp, username || '');
    await logAdminAudit(ctx, null, 'LOGIN_FAILED', { reason: 'User not found' });
    return { status: 401, error: { message: 'Kullanıcı adı veya şifre hatalı.', code: 'INVALID_CREDENTIALS' } };
  }

  if (admin.is_active !== 1) {
    await verifyPassword(password || '', admin.password_hash || dummyHash);
    recordFailedLogin(clientIp, username || '');
    await logAdminAudit(ctx, admin.id, 'LOGIN_FAILED', { reason: 'Account inactive' });
    return { status: 401, error: { message: 'Kullanıcı adı veya şifre hatalı.', code: 'INVALID_CREDENTIALS' } };
  }

  const isValid = await verifyPassword(password || '', admin.password_hash);
  if (!isValid) {
    recordFailedLogin(clientIp, username || '');
    await logAdminAudit(ctx, admin.id, 'LOGIN_FAILED', { reason: 'Invalid password' });
    return { status: 401, error: { message: 'Kullanıcı adı veya şifre hatalı.', code: 'INVALID_CREDENTIALS' } };
  }

  resetFailedLogin(clientIp, username || '');

  const token = await generateToken({
    admin_id: admin.id,
    username: admin.username,
    role: admin.role
  }, secret);

  if (ctx.env.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      const tokenHash = await hashToken(token);
      const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
      await ctx.env.DB.prepare(`
        INSERT INTO admin_sessions (admin_id, token_hash, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(admin.id, tokenHash, clientIp, userAgent, expiresAt).run();
    } catch {
      // Ignore session table insertion error if running in mock env
    }
  }

  await logAdminAudit(ctx, admin.id, 'LOGIN_SUCCESS', { username: admin.username });

  return {
    status: 200,
    data: {
      token,
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    }
  };
}

export async function logoutAdminService(ctx: RequestContext) {
  if (ctx.env.DB && typeof ctx.env.DB.prepare === 'function' && ctx.user?.rawToken) {
    try {
      const tokenHash = await hashToken(ctx.user.rawToken);
      await ctx.env.DB.prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).bind(tokenHash).run();
    } catch {
      // Ignore error
    }
  }

  if (ctx.user?.id) {
    await logAdminAudit(ctx, ctx.user.id, 'LOGOUT', { username: ctx.user.username });
  }

  return { status: 200, data: { message: 'Başarıyla çıkış yapıldı.' } };
}
