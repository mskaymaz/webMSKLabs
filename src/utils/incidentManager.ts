import { RequestContext } from '../types/router.js';
import { redactPII, logSystemError, logAuditAction } from './logger.js';
import { sendEmail } from '../../backend/src/services/emailService.js';

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface IncidentAlertOptions {
  severity: IncidentSeverity;
  eventType: string;
  message: string;
  extraDetails?: Record<string, any>;
  actor?: string;
}

export interface RevokeSessionsResult {
  success: boolean;
  revokedCount: number;
  message: string;
}

export interface LockAdminResult {
  success: boolean;
  adminId: number;
  sessionsRevoked: number;
  accountLocked: boolean;
  message: string;
}

/**
 * 12.1 Secret Rotation Prosedür Standardı (Dokümantasyon & Operasyon Rehberi)
 * Sıra: Revoke → Replace → Deploy → Verify → Invalidate
 */
export const SECRET_ROTATION_GUIDE = `
SECRET ROTATION OPERASYON REHBERİ (INC-001 / SEC-AUTH-001)

1. REVOKE: Sızan veya tehlikedeki anahtarı sağlayıcı panelinden anında iptal et (Google Cloud Console, Resend, VAPID).
2. REPLACE: En az 32 karakter uzunluğunda yeni kriptografik rastgele secret üret.
3. DEPLOY: Cloudflare ortamına güvenle aktar: \`npx wrangler secret put <SECRET_NAME>\`
4. VERIFY: \`/api/v1/health\` ve \`/api/v1/readiness\` servislerinin yeşil döndüğünü doğrula.
5. INVALIDATE: \`revokeAdminSessions\` çağrısı veya D1 \`DELETE FROM admin_sessions\` sorgusuyla eski JWT/oturumları düşür.
6. EVIDENCE: Logları silme! \`system_logs\` ve \`admin_audit_logs\` üzerinden olay zaman çizelgesini çıkar.
`;

/**
 * Incident Response Merkezi Olay Bildirimi (INC-001 / OBS-002 / COM-001)
 * Critical ve High seviyeli kriz olaylarında yöneticilere PII-redacted e-posta uyarısı tetikler.
 * (Non-blocking: E-posta gönderim hatası asıl güvenlik aksiyonunu bozmaz).
 */
export async function createIncidentAlert(
  ctx: RequestContext | any,
  options: IncidentAlertOptions
): Promise<void> {
  const { severity, eventType, message, extraDetails, actor } = options;
  const requestId = ctx?.requestId || 'incident-req';

  const safeMessage = redactPII(message);
  const safeDetails = extraDetails ? redactPII(extraDetails) : {};

  // 1. Log to D1 Observability system_logs & admin_audit_logs (OBS-002)
  const logLevel = severity === 'CRITICAL' ? 'FATAL' : severity === 'HIGH' ? 'ERROR' : severity === 'MEDIUM' ? 'WARN' : 'INFO';
  logSystemError(ctx, new Error(safeMessage), `INCIDENT [${severity}] [${eventType}]`, {
    eventType,
    severity,
    actor: actor || ctx?.user?.username || 'SYSTEM',
    ...safeDetails
  }, logLevel).catch(() => {});

  logAuditAction(ctx, `INCIDENT_${severity}_${eventType}`, ctx?.url?.pathname || '/api/v1/incident', {
    severity,
    eventType,
    message: safeMessage
  }).catch(() => {});

  // 2. Trigger COM-001 Email Alert for CRITICAL & HIGH Severity Incidents
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    try {
      const recipient = ctx?.env?.ADMIN_ALERT_EMAIL || 'admin@msklabs.com';
      const subject = `[SECURITY INCIDENT - ${severity}] ${eventType} (${requestId})`;
      const timestampStr = new Date().toISOString();

      const textBody = `SECURITY INCIDENT ALERT\n-------------------------\nSeverity: ${severity}\nEvent Type: ${eventType}\nCorrelation ID: ${requestId}\nTimestamp: ${timestampStr}\nMessage: ${safeMessage}\nActor: ${actor || 'SYSTEM'}\n\nNote: All PII has been redacted. Please investigate system audit logs.`;
      const htmlBody = `<h2>[SECURITY INCIDENT - ${severity}] ${eventType}</h2><p><strong>Severity:</strong> ${severity}</p><p><strong>Event Type:</strong> ${eventType}</p><p><strong>Correlation ID:</strong> ${requestId}</p><p><strong>Timestamp:</strong> ${timestampStr}</p><p><strong>Message:</strong> ${safeMessage}</p><p><strong>Actor:</strong> ${actor || 'SYSTEM'}</p><hr/><p><em>Note: All sensitive credentials and PII have been redacted.</em></p>`;

      sendEmail({
        to: recipient,
        subject,
        text: textBody,
        html: htmlBody,
        env: ctx?.env
      }).catch((emailErr) => {
        console.error('[IncidentManager] Alert email send error (suppressed):', emailErr);
      });
    } catch {
      // Non-blocking catch
    }
  }
}

/**
 * Acil Durum Oturum İptali (Emergency Session Revocation - INC-001 / SEC-AUTH-001)
 * Belirli bir admin'in veya tüm admin'lerin aktif D1 oturumlarını anında siler.
 */
export async function revokeAdminSessions(
  ctx: RequestContext | any,
  adminId?: number
): Promise<RevokeSessionsResult> {
  const db = ctx?.env?.DB;
  if (!db || typeof db.prepare !== 'function') {
    return {
      success: false,
      revokedCount: 0,
      message: 'D1 veritabanı bağlantısı bulunamadı.'
    };
  }

  try {
    let result: any;
    if (typeof adminId === 'number' && !isNaN(adminId)) {
      result = await db.prepare('DELETE FROM admin_sessions WHERE admin_id = ?').bind(adminId).run();
    } else {
      result = await db.prepare('DELETE FROM admin_sessions').run();
    }

    const count = Number(result?.meta?.changes || 0);

    // Audit log
    await logAuditAction(ctx, 'INCIDENT_SESSIONS_REVOKED', '/api/v1/admin/sessions/revoke', {
      targetAdminId: adminId || 'ALL',
      revokedCount: count
    });

    return {
      success: true,
      revokedCount: count,
      message: adminId
        ? `Admin (ID: ${adminId}) için ${count} adet oturum başarıyla iptal edildi.`
        : `Tüm yöneticiler için ${count} adet aktif oturum başarıyla iptal edildi.`
    };
  } catch (err: any) {
    console.error('[IncidentManager] revokeAdminSessions error:', err);
    return {
      success: false,
      revokedCount: 0,
      message: `Oturum iptali hatası: ${err?.message || String(err)}`
    };
  }
}

/**
 * Ele Geçirilmiş Admin Hesabını Dondurma (Lock Compromised Admin - INC-001 / SEC-AUTH-003)
 * Hesabı dondurur (`is_active = 0`), tüm aktif oturumlarını siler ve kriz alarmı fırlatır.
 */
export async function lockCompromisedAdmin(
  ctx: RequestContext | any,
  adminId: number,
  reason = 'Şüpheli güvenlik ihlali nedeniyle hesap donduruldu'
): Promise<LockAdminResult> {
  const db = ctx?.env?.DB;
  if (!db || typeof db.prepare !== 'function') {
    return {
      success: false,
      adminId,
      sessionsRevoked: 0,
      accountLocked: false,
      message: 'D1 veritabanı bağlantısı bulunamadı.'
    };
  }

  try {
    // 1. D1 admins update: is_active = 0
    const updateRes = await db.prepare('UPDATE admins SET is_active = 0 WHERE id = ?').bind(adminId).run();
    const rowsAffected = Number(updateRes?.meta?.changes || 0);

    if (rowsAffected === 0) {
      return {
        success: false,
        adminId,
        sessionsRevoked: 0,
        accountLocked: false,
        message: `Admin (ID: ${adminId}) veritabanında bulunamadı.`
      };
    }

    // 2. Revoke all active sessions for this admin
    const revokeRes = await revokeAdminSessions(ctx, adminId);
    if (!revokeRes.success) {
      return {
        success: false,
        adminId,
        sessionsRevoked: 0,
        accountLocked: true,
        message: `Admin (ID: ${adminId}) hesabı pasifleştirildi ancak oturum iptali başarısız oldu: ${revokeRes.message}`
      };
    }

    // 3. Log Audit Action
    await logAuditAction(ctx, 'ADMIN_ACCOUNT_LOCKED_INCIDENT', `/api/v1/admin/users/${adminId}/lock`, {
      targetAdminId: adminId,
      reason,
      sessionsRevoked: revokeRes.revokedCount
    });

    // 4. Trigger High Severity Alert
    createIncidentAlert(ctx, {
      severity: 'HIGH',
      eventType: 'COMPROMISED_ADMIN_LOCKED',
      message: `Admin account ID ${adminId} has been locked and ${revokeRes.revokedCount} sessions revoked. Reason: ${reason}`,
      extraDetails: { targetAdminId: adminId, reason }
    }).catch(() => {});

    return {
      success: true,
      adminId,
      sessionsRevoked: revokeRes.revokedCount,
      accountLocked: true,
      message: `Admin (ID: ${adminId}) hesabı başarıyla donduruldu ve ${revokeRes.revokedCount} adet oturumu iptal edildi.`
    };
  } catch (err: any) {
    console.error('[IncidentManager] lockCompromisedAdmin error:', err);
    return {
      success: false,
      adminId,
      sessionsRevoked: 0,
      accountLocked: false,
      message: `Hesap dondurma hatası: ${err?.message || String(err)}`
    };
  }
}
