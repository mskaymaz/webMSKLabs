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
}

export function checkLoginLockout(ip: string, username: string): LockoutResult {
  const mapKey = `lockout:${ip}:${username.toLowerCase()}`;
  const now = Date.now();
  const record = lockoutMap.get(mapKey);

  if (!record) {
    return { locked: false, retryAfter: 0, failedAttempts: 0 };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return { locked: true, retryAfter, failedAttempts: record.failedAttempts };
  }

  if (record.lockedUntil && now >= record.lockedUntil) {
    lockoutMap.delete(mapKey);
    return { locked: false, retryAfter: 0, failedAttempts: 0 };
  }

  return { locked: false, retryAfter: 0, failedAttempts: record.failedAttempts };
}

export function recordFailedLogin(ip: string, username: string): LockoutResult {
  const mapKey = `lockout:${ip}:${username.toLowerCase()}`;
  const now = Date.now();
  let record = lockoutMap.get(mapKey);

  if (!record) {
    record = { failedAttempts: 1, lockedUntil: null };
  } else {
    record.failedAttempts += 1;
  }

  if (record.failedAttempts >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15 minute lockout
    lockoutMap.set(mapKey, record);
    return { locked: true, retryAfter: 15 * 60, failedAttempts: record.failedAttempts };
  }

  lockoutMap.set(mapKey, record);
  return { locked: false, retryAfter: 0, failedAttempts: record.failedAttempts };
}

export function resetFailedLogin(ip: string, username: string): void {
  const mapKey = `lockout:${ip}:${username.toLowerCase()}`;
  lockoutMap.delete(mapKey);
}
