/**
 * DevAdmin Rate Limiting & Brute-Force Protection Module
 * Implements sliding-window rate limiting & login lockout (5 attempts / 15 mins)
 */

// In-Memory sliding-window rate limit store for Workers runtime
const rateLimitMap = new Map();
const lockoutMap = new Map();

// Configuration defaults
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 60; // 60 requests / minute for general endpoints

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_FAILED_ATTEMPTS = 5; // Lockout after 5 failed login attempts
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout duration

/**
 * Clean up expired entries to prevent memory growth
 */
function cleanupRateLimitStore() {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
        if (value.resetTime <= now) {
            rateLimitMap.delete(key);
        }
    }
    for (const [key, value] of lockoutMap.entries()) {
        if (value.until <= now) {
            lockoutMap.delete(key);
        }
    }
}

/**
 * Checks sliding-window rate limit for a request IP and endpoint
 */
export function checkRateLimit(ip, endpoint = 'general', maxRequests = DEFAULT_MAX_REQUESTS, windowMs = DEFAULT_WINDOW_MS) {
    cleanupRateLimitStore();

    const now = Date.now();
    const key = `${ip}:${endpoint}`;
    const record = rateLimitMap.get(key);

    if (!record || record.resetTime <= now) {
        rateLimitMap.set(key, {
            count: 1,
            resetTime: now + windowMs
        });
        return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
    }

    if (record.count >= maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        return { allowed: false, remaining: 0, retryAfter };
    }

    record.count += 1;
    return { allowed: true, remaining: maxRequests - record.count, retryAfter: 0 };
}

/**
 * Checks if an IP or username combination is currently locked out due to brute-force attempts
 */
export function checkLoginLockout(ip, username = '') {
    cleanupRateLimitStore();

    const now = Date.now();
    const lockoutKey = `${ip}:${username.toLowerCase()}`;
    const record = lockoutMap.get(lockoutKey);

    if (record && record.until > now) {
        const retryAfter = Math.ceil((record.until - now) / 1000);
        return { locked: true, retryAfter, attempts: record.failedAttempts };
    }

    if (record && record.until <= now) {
        lockoutMap.delete(lockoutKey);
    }

    return { locked: false, retryAfter: 0, attempts: record ? record.failedAttempts : 0 };
}

/**
 * Records a failed login attempt; locks out if threshold exceeded
 */
export function recordFailedLogin(ip, username = '') {
    const now = Date.now();
    const lockoutKey = `${ip}:${username.toLowerCase()}`;
    const record = lockoutMap.get(lockoutKey) || { failedAttempts: 0, firstAttempt: now, until: 0 };

    // Reset counter if window elapsed
    if (now - record.firstAttempt > LOGIN_WINDOW_MS) {
        record.failedAttempts = 0;
        record.firstAttempt = now;
    }

    record.failedAttempts += 1;

    if (record.failedAttempts >= LOGIN_MAX_FAILED_ATTEMPTS) {
        record.until = now + LOGIN_LOCKOUT_MS;
        lockoutMap.set(lockoutKey, record);
        const retryAfter = Math.ceil(LOGIN_LOCKOUT_MS / 1000);
        return { locked: true, retryAfter, failedAttempts: record.failedAttempts };
    }

    lockoutMap.set(lockoutKey, record);
    return { locked: false, remainingAttempts: LOGIN_MAX_FAILED_ATTEMPTS - record.failedAttempts };
}

/**
 * Resets failed login counters upon successful authentication
 */
export function resetFailedLogin(ip, username = '') {
    const lockoutKey = `${ip}:${username.toLowerCase()}`;
    lockoutMap.delete(lockoutKey);
}
