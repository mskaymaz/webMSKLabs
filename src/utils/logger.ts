import { RequestContext } from '../types/router.js';

/**
 * PII & Sensitive Data Redaction Patterns & Key Filters
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'pass',
  'token',
  'access_token',
  'refresh_token',
  'jwt',
  'secret',
  'api_key',
  'apikey',
  'authorization',
  'auth',
  'cookie',
  'set-cookie',
  'credit_card',
  'card_number',
  'cvv',
  'ssn'
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

/**
 * Recursively redacts PII and sensitive credentials from object or string
 */
export function redactPII(val: any): any {
  if (val === null || val === undefined) return val;

  if (typeof val === 'string') {
    let result = val;
    // Redact email patterns
    result = result.replace(EMAIL_REGEX, (email) => {
      const parts = email.split('@');
      if (parts[0].length <= 2) return `[REDACTED_EMAIL]`;
      return `${parts[0][0]}***${parts[0][parts[0].length - 1]}@${parts[1]}`;
    });
    // Redact phone patterns if string looks like phone
    result = result.replace(PHONE_REGEX, '[REDACTED_PHONE]');
    // Redact Bearer authorization headers in text
    result = result.replace(/Bearer\s+[A-Za-z0-9._\-~+/]+=*/gi, 'Bearer [REDACTED]');
    // Redact key=value or key: value credential assignments in text
    result = result.replace(/(password|passwd|pass|token|access_token|refresh_token|secret|api_key|apikey|authorization|cookie)\s*[:=]\s*['"]?[^'\s,;&]+['"]?/gi, '$1=[REDACTED]');
    return result;
  }

  if (Array.isArray(val)) {
    return val.map(redactPII);
  }

  if (typeof val === 'object') {
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(val)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactPII(value);
      }
    }
    return redacted;
  }

  return val;
}

/**
 * Log System/Application Errors to D1 `system_logs` table (Best-Effort Execution)
 */
export async function logSystemError(
  ctx: RequestContext | any,
  error: unknown,
  customMessage?: string,
  extraDetails?: Record<string, any>,
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL' = 'ERROR'
): Promise<void> {
  try {
    const correlationId = ctx?.requestId || ctx?.correlationId || null;
    const errObj = error instanceof Error ? error : new Error(String(error || 'Unknown Error'));
    const rawMessage = customMessage ? `${customMessage}: ${errObj.message}` : errObj.message;
    const message = redactPII(rawMessage);
    const errorStack = errObj.stack ? redactPII(errObj.stack) : null;

    const safeDetails = extraDetails ? redactPII(extraDetails) : null;
    const detailsJson = safeDetails ? JSON.stringify(safeDetails) : null;

    const db = ctx?.env?.DB;
    if (db && typeof db.prepare === 'function') {
      await db.prepare(`
        INSERT INTO system_logs (level, message, correlation_id, error_stack, details_json)
        VALUES (?, ?, ?, ?, ?)
      `).bind(level, message, correlationId, errorStack, detailsJson).run();
    }
  } catch (logErr) {
    // Best-effort: Ignore logging errors to ensure HTTP response is never broken
    console.error('[Logger] Failed to write system log:', logErr);
  }
}

/**
 * Log Admin Audit Actions to D1 `admin_audit_logs` table (Best-Effort Execution)
 */
export async function logAuditAction(
  ctx: RequestContext | any,
  action: string,
  resource: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const adminId = ctx?.user?.id || null;
    const ipAddress = ctx?.clientIp || null;
    const safeDetails = details ? redactPII(details) : null;
    const detailsJson = safeDetails ? JSON.stringify(safeDetails) : null;

    const db = ctx?.env?.DB;
    if (db && typeof db.prepare === 'function') {
      await db.prepare(`
        INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `).bind(adminId, action, resource, detailsJson, ipAddress).run();
    }
  } catch (auditErr) {
    // Best-effort: Ignore audit logging errors to prevent request pipeline failure
    console.error('[Logger] Failed to write audit log:', auditErr);
  }
}
