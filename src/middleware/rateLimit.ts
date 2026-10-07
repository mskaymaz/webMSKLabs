/**
 * DevAdmin Sliding-Window Rate Limiter & Brute-Force Lockout Defense
 */

interface RateLimitStore {
  count: number;
  resetAt: number;
}

interface LockoutStore {
  failedAttempts: number;
  lockedUntil: number | null;
}

const rateLimitMap = new Map<string, RateLimitStore>();
const lockoutMap = new Map<string, LockoutStore>();

export interface RateCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export function checkRateLimit(
  key: string,
  prefix = 'global',
  maxRequests = 60,
  windowMs = 60000
): RateCheckResult {
  const mapKey = `${prefix}:${key}`;
  const now = Date.now();
  const record = rateLimitMap.get(mapKey);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(mapKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, retryAfter: 0 };
}

export interface LockoutResult {
  locked: boolean;
  retryAfter: number;
  failedAttempts: number;
  newlyLocked?: boolean;
}

export const LOCKOUT_CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_WINDOW_MS: 15 * 60 * 1000 // 15 minutes
};


export function checkLoginLockout(ip: string, username: string): LockoutResult {
  const normalizedUser = (username || '').trim().toLowerCase();
  const mapKey = `lockout:${ip}:${normalizedUser}`;
  const now = Date.now();
  const record = lockoutMap.get(mapKey);

  if (!record) {
    return { locked: false, retryAfter: 0, failedAttempts: 0 };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfter = Math.max(1, Math.ceil((record.lockedUntil - now) / 1000));
    return { locked: true, retryAfter, failedAttempts: record.failedAttempts };
  }

  if (record.lockedUntil && now >= record.lockedUntil) {
    lockoutMap.delete(mapKey);
    return { locked: false, retryAfter: 0, failedAttempts: 0 };
  }

  return { locked: false, retryAfter: 0, failedAttempts: record.failedAttempts };
}

export function recordFailedLogin(ip: string, username: string): LockoutResult {
  const normalizedUser = (username || '').trim().toLowerCase();
  const mapKey = `lockout:${ip}:${normalizedUser}`;
  const now = Date.now();
  let record = lockoutMap.get(mapKey);

  const wasLocked = Boolean(record?.lockedUntil && now < record.lockedUntil);

  if (!record) {
    record = { failedAttempts: 1, lockedUntil: null };
  } else {
    record.failedAttempts += 1;
  }

  if (record.failedAttempts >= LOCKOUT_CONFIG.MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_CONFIG.LOCKOUT_WINDOW_MS;
    lockoutMap.set(mapKey, record);
    const retryAfter = Math.max(1, Math.ceil(LOCKOUT_CONFIG.LOCKOUT_WINDOW_MS / 1000));
    return {
      locked: true,
      retryAfter,
      failedAttempts: record.failedAttempts,
      newlyLocked: !wasLocked
    };
  }

  lockoutMap.set(mapKey, record);
  return { locked: false, retryAfter: 0, failedAttempts: record.failedAttempts };
}

export function resetFailedLogin(ip: string, username: string): void {
  const normalizedUser = (username || '').trim().toLowerCase();
  const mapKey = `lockout:${ip}:${normalizedUser}`;
  lockoutMap.delete(mapKey);
}

export async function checkLoginLockoutD1(ctx: any, ip: string, username: string): Promise<LockoutResult> {
  const normalizedUser = (username || '').trim().toLowerCase();
  const memResult = checkLoginLockout(ip, normalizedUser);
  if (memResult.locked) return memResult;

  if (ctx?.env?.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      const escapedUser = normalizedUser.replace(/[%_\\]/g, '\\$&');
      const jsonPattern = `%"username":"${escapedUser}"%`;

      const row: any = await ctx.env.DB.prepare(`
        SELECT COUNT(*) as failed_count, MAX(created_at) as last_created
        FROM admin_audit_logs
        WHERE action = 'LOGIN_FAILED'
          AND ip_address = ?
          AND details_json LIKE ? ESCAPE '\\'
          AND created_at >= datetime('now', '-15 minutes')
          AND created_at > COALESCE(
            (SELECT MAX(created_at)
             FROM admin_audit_logs
             WHERE action = 'LOGIN_SUCCESS'
               AND ip_address = ?
               AND details_json LIKE ? ESCAPE '\\'),
            '1970-01-01'
          )
      `).bind(ip, jsonPattern, ip, jsonPattern).first();

      const failedCount = Number(row?.failed_count || 0);
      if (failedCount >= LOCKOUT_CONFIG.MAX_ATTEMPTS) {
        let retryAfter = Math.max(1, Math.ceil(LOCKOUT_CONFIG.LOCKOUT_WINDOW_MS / 1000));
        if (row?.last_created) {
          const lastTime = new Date(row.last_created).getTime();
          if (!isNaN(lastTime)) {
            const unlockTime = lastTime + LOCKOUT_CONFIG.LOCKOUT_WINDOW_MS;
            retryAfter = Math.max(1, Math.ceil((unlockTime - Date.now()) / 1000));
          }
        }
        return { locked: true, retryAfter, failedAttempts: failedCount };
      }
      if (failedCount > memResult.failedAttempts) {
        return { locked: false, retryAfter: 0, failedAttempts: failedCount };
      }
    } catch {
      // Ignore DB query errors and use in-memory state
    }
  }

  return memResult;
}

export function resetRateLimitStoresForTest(): void {
  rateLimitMap.clear();
  lockoutMap.clear();
}
