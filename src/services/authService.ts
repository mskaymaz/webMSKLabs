import { RequestContext } from '../types/router.js';
import { verifyPassword, generateToken, hashToken } from '../utils/crypto.js';
import { checkLoginLockout, recordFailedLogin, resetFailedLogin } from '../middleware/rateLimit.js';

export async function loginAdminService(ctx: RequestContext, body: any) {
  const { username, password } = body;
  const clientIp = ctx.clientIp;
  const userAgent = ctx.request.headers.get('user-agent') || 'Unknown';

  const lockoutStatus = checkLoginLockout(clientIp, username);
  if (lockoutStatus.locked) {
    return {
      status: 429,
      error: {
        message: `Çok sayıda başarısız giriş denemesi. Hesabınız geçici kilitlendi. Lütfen ${lockoutStatus.retryAfter} saniye sonra tekrar deneyin.`,
        code: 'LOCKOUT'
      }
    };
  }

  let admin: any = null;
  if (ctx.env.DB) {
    admin = await ctx.env.DB.prepare(`
      SELECT id, username, password_hash, role, is_active FROM admins WHERE username = ? LIMIT 1
    `).bind(username).first();
  }

  if (!admin) {
    const dummyHash = '$pbkdf2$v=1$i=100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
    await verifyPassword(password, dummyHash);
    recordFailedLogin(clientIp, username);
    return { status: 401, error: { message: 'Kullanıcı adı veya şifre hatalı.', code: 'INVALID_CREDENTIALS' } };
  }

  if (admin.is_active !== 1) {
    return { status: 403, error: { message: 'Hesabınız pasif durumdadır.', code: 'ACCOUNT_DISABLED' } };
  }

  const isValid = await verifyPassword(password, admin.password_hash);
  if (!isValid) {
    recordFailedLogin(clientIp, username);
    return { status: 401, error: { message: 'Kullanıcı adı veya şifre hatalı.', code: 'INVALID_CREDENTIALS' } };
  }

  resetFailedLogin(clientIp, username);

  const secret = ctx.env.JWT_SECRET || 'DEVADMIN_FALLBACK_SECRET_KEY_2026_DEV_ONLY';
  const token = await generateToken({
    admin_id: admin.id,
    username: admin.username,
    role: admin.role
  }, secret);

  if (ctx.env.DB) {
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    await ctx.env.DB.prepare(`
      INSERT INTO admin_sessions (admin_id, token_hash, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(admin.id, tokenHash, clientIp, userAgent, expiresAt).run();
  }

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
  if (ctx.env.DB && ctx.user?.rawToken) {
    const tokenHash = await hashToken(ctx.user.rawToken);
    await ctx.env.DB.prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).bind(tokenHash).run();
  }
  return { status: 200, data: { message: 'Başarıyla çıkış yapıldı.' } };
}
