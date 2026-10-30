import { RequestContext } from '../types/router.js';

/**
 * PRIV-001 — KVKK / GDPR Data Governance, Minimization & Anonymization Utilities ($0)
 */

export interface DataCategoryPolicy {
  category: string;
  purpose: string;
  dataType: string;
  retentionPolicy: string;
  actionOnExpiry: 'ANONYMIZE' | 'SOFT_DELETE' | 'HARD_DELETE' | 'LOG_MASK';
}

export const DATA_GOVERNANCE_INVENTORY: DataCategoryPolicy[] = [
  { category: 'USER_IDENTITY', purpose: 'Authentication & RBAC', dataType: 'Email, Password Hash, Name, Role', retentionPolicy: 'Active Account', actionOnExpiry: 'ANONYMIZE' },
  { category: 'SUPPORT_TICKETS', purpose: 'Customer Support', dataType: 'Subject, Message, Email, IP', retentionPolicy: 'Configurable (e.g. 12 months)', actionOnExpiry: 'ANONYMIZE' },
  { category: 'COMMENTS', purpose: 'Public Engagement', dataType: 'Content, Author Name, Email, IP', retentionPolicy: 'Content Lifecycle', actionOnExpiry: 'ANONYMIZE' },
  { category: 'NEWSLETTER', purpose: 'Email Communication', dataType: 'Email, Consent Date, Status', retentionPolicy: 'Active Subscription + Opt-Out Log', actionOnExpiry: 'HARD_DELETE' },
  { category: 'TECHNICAL_METADATA', purpose: 'Security & Rate Limiting', dataType: 'IP Address, User-Agent', retentionPolicy: 'Sliding Window', actionOnExpiry: 'LOG_MASK' },
  { category: 'AUDIT_LOGS', purpose: 'Security & Observability', dataType: 'Action, Resource, Timestamp, IP', retentionPolicy: 'Long-term Immutability', actionOnExpiry: 'LOG_MASK' }
];

export function maskPII(value?: string | null): string {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (trimmed.includes('@')) {
    const parts = trimmed.split('@');
    const namePart = parts[0];
    const maskedName = namePart.length <= 2 ? `${namePart[0]}***` : `${namePart.substring(0, 2)}***`;
    return `${maskedName}@${parts[1]}`;
  }
  if (trimmed.length <= 4) return '***';
  return `${trimmed.substring(0, 2)}***${trimmed.substring(trimmed.length - 2)}`;
}

export function maskSecretsInObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskSecretsInObject);

  const masked: Record<string, any> = {};
  const sensitiveKeys = ['password', 'secret', 'jwt', 'token', 'api_key', 'apikey', 'authorization', 'resend_api_key', 'gemini_api_key'];

  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(s => lowerKey.includes(s));

    if (isSensitive) {
      masked[key] = '[REDACTED_SECRET]';
    } else if (val && typeof val === 'object') {
      masked[key] = maskSecretsInObject(val);
    } else {
      masked[key] = val;
    }
  }

  return masked;
}

export function anonymizeUserData(input: { name?: string; email?: string }): { name: string; email: string } {
  const hashVal = Math.floor(1000 + Math.random() * 9000);
  return {
    name: 'ANONYMOUS_USER',
    email: `anon_${hashVal}@deleted.msklabs.org`
  };
}

export async function anonymizeSupportTicket(
  ctx: RequestContext,
  ticketId: string,
  options?: { ignoreLegalHold?: boolean }
) {
  if (!ticketId || typeof ticketId !== 'string') {
    return { status: 400, error: { message: 'Bilet numarası zorunludur.', code: 'VALIDATION_ERROR' } };
  }

  if (!ctx.env?.DB || typeof ctx.env.DB.prepare !== 'function') {
    return { status: 200, data: { ticketId, anonymized: true, isMock: true } };
  }

  const existing: any = await ctx.env.DB.prepare(`SELECT id, is_legal_hold FROM messages WHERE id = ?`).bind(ticketId).first();
  if (!existing) {
    return { status: 404, error: { message: 'Destek bileti bulunamadı.', code: 'NOT_FOUND' } };
  }

  if (existing.is_legal_hold === 1 && !options?.ignoreLegalHold) {
    return {
      status: 409,
      error: { message: 'Bu kayıt hukuki/güvenlik incelemesi (Legal Hold) altında olduğu için anonimleştirilemez.', code: 'LEGAL_HOLD_ACTIVE' }
    };
  }

  const anonData = anonymizeUserData({});

  await ctx.env.DB.prepare(`
    UPDATE messages
    SET name = ?, email = ?, message = '[ANONYMIZED_MESSAGE_CONTENT]', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(anonData.name, anonData.email, ticketId).run();

  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (?, 'DATA_ANONYMIZED', ?, ?, ?)
    `).bind(
      ctx.user?.id || null,
      `/api/v1/admin/privacy/anonymize-ticket/${ticketId}`,
      JSON.stringify({ ticketId, category: 'SUPPORT_TICKETS' }),
      ctx.clientIp || null
    ).run();
  } catch {}

  return {
    status: 200,
    data: { ticketId, anonymized: true }
  };
}

export async function processRetentionPurge(
  ctx: RequestContext,
  retentionDays = 365
) {
  if (!ctx.env?.DB || typeof ctx.env.DB.prepare !== 'function') {
    return { status: 200, data: { processed: 0, retentionDays, isMock: true } };
  }

  // Purge/Anonymize expired tickets not on legal hold
  const expiredTicketsRes = await ctx.env.DB.prepare(`
    SELECT id FROM messages
    WHERE status IN ('RESOLVED', 'CLOSED')
      AND (is_legal_hold IS NULL OR is_legal_hold = 0)
      AND datetime(updated_at) < datetime('now', '-' || ? || ' days')
    LIMIT 100
  `).bind(retentionDays).all();

  const expiredTickets = expiredTicketsRes.results || [];
  let count = 0;

  for (const t of expiredTickets) {
    const res = await anonymizeSupportTicket(ctx, (t as any).id);
    if (res.status === 200) count++;
  }

  return {
    status: 200,
    data: {
      processed: count,
      totalExpiredFound: expiredTickets.length,
      retentionDays
    }
  };
}
