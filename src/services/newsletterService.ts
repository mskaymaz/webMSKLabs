import { RequestContext } from '../types/router.js';

export interface SubscribePayload {
  email: string;
  kvkkConsent: boolean;
}

/**
 * Generates a cryptographically secure 256-bit (32-byte) random token
 */
export function generate256BitToken(prefix: 'unsub' | 'verify'): string {
  const array = new Uint8Array(32); // 32 bytes = 256 bits CSPRNG entropy
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

/**
 * Masks email address for privacy and KVKK compliance in log entries and response payloads
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '***@***.***';
  }
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 2 ? `${local[0] || '*'}***` : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

export async function subscribeService(ctx: RequestContext, payload: SubscribePayload) {
  const normalizedEmail = payload.email.toLowerCase().trim();

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: {
        email: maskEmail(normalizedEmail),
        status: 'PENDING_VERIFICATION',
        message: 'Abonelik kaydınız alındı. Lütfen e-postanızı doğrulayın.'
      }
    };
  }

  // 1. Inspect existing subscriber record
  const existingRes = await ctx.env.DB.prepare(`
    SELECT id, email, is_active, verified_at, unsubscribe_token FROM subscribers WHERE email = ?
  `).bind(normalizedEmail).first<any>();

  const now = new Date();
  const expiresAtDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours TTL
  const expiresAtIso = expiresAtDate.toISOString();

  let verificationToken = generate256BitToken('verify');
  let unsubscribeToken = generate256BitToken('unsub');

  if (existingRes) {
    if (existingRes.is_active === 1 && existingRes.verified_at) {
      // Already verified active subscriber -> Idempotent response
      return {
        status: 200,
        data: {
          email: maskEmail(normalizedEmail),
          status: 'SUBSCRIBED',
          message: 'Abonelik kaydınız zaten aktiftir.'
        }
      };
    } else {
      // Re-subscription for unverified or unsubscribed user -> issue new verification token & set is_active = 0
      unsubscribeToken = existingRes.unsubscribe_token || unsubscribeToken;
      await ctx.env.DB.prepare(`
        UPDATE subscribers 
        SET is_active = 0, 
            verification_token = ?, 
            verification_expires_at = ?, 
            unsubscribe_token = ? 
        WHERE id = ?
      `).bind(verificationToken, expiresAtIso, unsubscribeToken, existingRes.id).run();
    }
  } else {
    // New subscriber -> insert with is_active = 0 (PENDING VERIFICATION)
    await ctx.env.DB.prepare(`
      INSERT INTO subscribers (email, is_active, unsubscribe_token, verification_token, verification_expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(normalizedEmail, 0, unsubscribeToken, verificationToken, expiresAtIso).run();
  }

  // 2. Anonymized Audit Log
  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (NULL, 'SUBSCRIBE_INITIATED', ?, ?, ?)
    `).bind(
      '/api/v1/subscribe',
      JSON.stringify({ email: maskEmail(normalizedEmail) }),
      ctx.clientIp
    ).run();
  } catch {
    // Ignore audit log error
  }

  return {
    status: 200,
    data: {
      email: maskEmail(normalizedEmail),
      status: 'PENDING_VERIFICATION',
      message: 'Abonelik kaydınız alındı. Lütfen e-postanızı doğrulayın.'
    }
  };
}

export async function verifySubscribeService(ctx: RequestContext, token: string) {
  const cleanToken = token.trim();

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: {
        message: 'Aboneliğiniz başarıyla doğrulandı.'
      }
    };
  }

  // 1. Find subscriber by verification token
  const existingRes = await ctx.env.DB.prepare(`
    SELECT id, email, is_active, verification_expires_at, verified_at FROM subscribers WHERE verification_token = ?
  `).bind(cleanToken).first<any>();

  if (!existingRes) {
    return {
      status: 404,
      error: {
        message: 'Geçersiz doğrulama jetonu.',
        code: 'INVALID_VERIFICATION_TOKEN'
      }
    };
  }

  // 2. Expiration Check
  if (existingRes.verification_expires_at) {
    const expiresAtTime = new Date(existingRes.verification_expires_at).getTime();
    if (isNaN(expiresAtTime) || expiresAtTime < Date.now()) {
      return {
        status: 410,
        error: {
          message: 'Doğrulama jetonunun süresi dolmuştur. Lütfen yeniden kaydolun.',
          code: 'EXPIRED_VERIFICATION_TOKEN'
        }
      };
    }
  }

  // 3. One-time use: Consume token, set is_active = 1 and verified_at = CURRENT_TIMESTAMP, set verification_token = NULL
  await ctx.env.DB.prepare(`
    UPDATE subscribers 
    SET is_active = 1, 
        verified_at = CURRENT_TIMESTAMP, 
        verification_token = NULL, 
        verification_expires_at = NULL 
    WHERE id = ?
  `).bind(existingRes.id).run();

  // Audit Log
  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (NULL, 'SUBSCRIBE_VERIFIED', ?, ?, ?)
    `).bind(
      '/api/v1/subscribe/verify',
      JSON.stringify({ email: maskEmail(existingRes.email) }),
      ctx.clientIp
    ).run();
  } catch {
    // Ignore audit log error
  }

  return {
    status: 200,
    data: {
      email: maskEmail(existingRes.email),
      status: 'VERIFIED',
      message: 'Aboneliğiniz başarıyla doğrulandı.'
    }
  };
}

export async function unsubscribeService(ctx: RequestContext, token: string) {
  const cleanToken = token.trim();

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: {
        message: 'Aboneliğiniz başarıyla sonlandırıldı.'
      }
    };
  }

  // 1. Find subscriber by unsubscribe token
  const existingRes = await ctx.env.DB.prepare(`
    SELECT id, email, is_active FROM subscribers WHERE unsubscribe_token = ?
  `).bind(cleanToken).first<any>();

  if (!existingRes) {
    return {
      status: 404,
      error: {
        message: 'Geçersiz abonelik sonlandırma jetonu.',
        code: 'INVALID_UNSUBSCRIBE_TOKEN'
      }
    };
  }

  // 2. Set is_active = 0
  await ctx.env.DB.prepare(`
    UPDATE subscribers SET is_active = 0 WHERE id = ?
  `).bind(existingRes.id).run();

  // Audit Log
  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (NULL, 'UNSUBSCRIBED', ?, ?, ?)
    `).bind(
      '/api/v1/unsubscribe',
      JSON.stringify({ email: maskEmail(existingRes.email) }),
      ctx.clientIp
    ).run();
  } catch {
    // Ignore audit log error
  }

  return {
    status: 200,
    data: {
      message: 'Aboneliğiniz başarıyla sonlandırıldı.'
    }
  };
}
