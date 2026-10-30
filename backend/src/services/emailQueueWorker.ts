/**
 * MSKLabs & DevAdmin — Email Queue Worker & Cron Processing Service (COM-003)
 * File: backend/src/services/emailQueueWorker.ts
 * Description: 5 dakikalık Cron worker, D1 email_queue durum makinesi (PENDING -> PROCESSING -> SENT/RETRY_WAIT -> FAILED),
 *              Atomic Claim, Exponential Backoff (5m / 15m / 60m), Idempotency & Batch Processing (10 email < 1500ms).
 */

import { sendEmail, SendEmailResult } from './emailService';

export type QueueStatus = 'PENDING' | 'PROCESSING' | 'RETRY_WAIT' | 'SENT' | 'FAILED';

export interface EmailQueueItem {
  id: number;
  recipient_email: string;
  subject: string;
  html_body: string;
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  last_error?: string | null;
  scheduled_at: string;
  sent_at?: string | null;
  idempotency_key?: string | null;
}

export interface EnqueueEmailParams {
  recipientEmail: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  idempotencyKey?: string;
  db: any; // Cloudflare D1 Binding
}

export interface ProcessQueueOptions {
  db: any;
  batchSize?: number;
  fetchFn?: typeof fetch;
  env?: Record<string, any>;
  mockSend?: boolean;
}

export interface ProcessQueueResult {
  processedCount: number;
  successCount: number;
  failedCount: number;
  retryCount: number;
  batchLatencyMs: number;
  items: Array<{ id: number; status: QueueStatus; error?: string }>;
}

/**
 * Backoff Hesaplayıcı (5m -> 15m -> 60m)
 */
export function calculateBackoffMinutes(attempt: number): number {
  if (attempt <= 1) return 5;
  if (attempt === 2) return 15;
  return 60;
}

/**
 * E-Postayı Kuyruğa Ekleme (Enqueue + Idempotency Protection)
 */
export async function enqueueEmail(params: EnqueueEmailParams): Promise<{ success: boolean; queueId?: number; duplicate?: boolean }> {
  const { recipientEmail, subject, htmlBody, idempotencyKey, db } = params;

  if (!db || typeof db.prepare !== 'function') {
    throw new Error('D1 database binding is required for enqueueEmail');
  }

  // Idempotency kontrolü
  if (idempotencyKey) {
    const existing = await db
      .prepare('SELECT id, status FROM email_queue WHERE idempotency_key = ? LIMIT 1')
      .bind(idempotencyKey)
      .first();

    if (existing) {
      return { success: true, queueId: existing.id, duplicate: true };
    }
  }

  const result = await db
    .prepare(`
      INSERT INTO email_queue (recipient_email, subject, html_body, status, attempts, max_attempts, scheduled_at, idempotency_key)
      VALUES (?, ?, ?, 'PENDING', 0, 3, CURRENT_TIMESTAMP, ?)
    `)
    .bind(recipientEmail, subject, htmlBody, idempotencyKey || null)
    .run();

  const queueId = result?.meta?.last_row_id || result?.lastInsertRowid;
  return { success: true, queueId, duplicate: false };
}

/**
 * Atomik Claim Mantığı (Concurrent Worker Çakışmasını Engeller)
 * PENDING veya süresi gelmiş RETRY_WAIT durumundaki kayıtları atomik olarak PROCESSING'e çeker.
 */
export async function claimPendingEmails(db: any, batchSize: number = 10): Promise<EmailQueueItem[]> {
  if (!db || typeof db.prepare !== 'function') return [];

  // 1. İşlenebilecek aday ID'leri bul
  const candidates = await db
    .prepare(`
      SELECT id FROM email_queue
      WHERE (status = 'PENDING' OR (status = 'RETRY_WAIT' AND scheduled_at <= CURRENT_TIMESTAMP))
        AND attempts < max_attempts
      ORDER BY id ASC
      LIMIT ?
    `)
    .bind(batchSize)
    .all();

  const candidateRows = candidates?.results || candidates || [];
  if (!Array.isArray(candidateRows) || candidateRows.length === 0) {
    return [];
  }

  const ids = candidateRows.map((r: any) => r.id);

  // 2. Bulunan ID'leri atomik olarak PROCESSING durumuna çek (Atomic Claim)
  const placeholders = ids.map(() => '?').join(',');
  await db
    .prepare(`
      UPDATE email_queue
      SET status = 'PROCESSING'
      WHERE id IN (${placeholders}) AND (status = 'PENDING' OR status = 'RETRY_WAIT')
    `)
    .bind(...ids)
    .run();

  // 3. Atomik güncellenen kayıtları çek
  const claimed = await db
    .prepare(`SELECT * FROM email_queue WHERE id IN (${placeholders}) AND status = 'PROCESSING'`)
    .bind(...ids)
    .all();

  return claimed?.results || claimed || [];
}

/**
 * E-Posta Kuyruk Çalıştırıcısı (5 dakikalık Cron Worker Katmanı)
 */
export async function processEmailQueue(options: ProcessQueueOptions): Promise<ProcessQueueResult> {
  const startTime = performance.now();
  const { db, batchSize = 10, fetchFn, env, mockSend } = options;

  const itemsToProcess = await claimPendingEmails(db, batchSize);
  const results: Array<{ id: number; status: QueueStatus; error?: string }> = [];

  let successCount = 0;
  let failedCount = 0;
  let retryCount = 0;

  for (const item of itemsToProcess) {
    const currentAttempt = item.attempts + 1;
    let sendRes: SendEmailResult;

    try {
      sendRes = await sendEmail({
        to: item.recipient_email,
        subject: item.subject,
        html: item.html_body,
        text: item.subject, // plain text fallback
        fetchFn,
        env,
        mockSend
      });
    } catch (err: any) {
      sendRes = {
        success: false,
        mode: 'RESEND_API',
        status: 500,
        error: err.message || 'Worker exception',
        latencyMs: 0
      };
    }

    if (sendRes.success) {
      // SENT: Başarılı gönderim
      await db
        .prepare(`
          UPDATE email_queue
          SET status = 'SENT', attempts = ?, sent_at = CURRENT_TIMESTAMP, last_error = NULL
          WHERE id = ?
        `)
        .bind(currentAttempt, item.id)
        .run();

      successCount++;
      results.push({ id: item.id, status: 'SENT' });
    } else {
      // Hata Yönetimi & Retry / Dead Letter
      if (currentAttempt < item.max_attempts) {
        // RETRY_WAIT: Backoff süresi hesaplanıp geleceğe ertelenir
        const backoffMinutes = calculateBackoffMinutes(currentAttempt);
        await db
          .prepare(`
            UPDATE email_queue
            SET status = 'RETRY_WAIT',
                attempts = ?,
                last_error = ?,
                scheduled_at = DATETIME(CURRENT_TIMESTAMP, '+' || ? || ' minute')
            WHERE id = ?
          `)
          .bind(currentAttempt, sendRes.error || 'Send failed', backoffMinutes, item.id)
          .run();

        retryCount++;
        results.push({ id: item.id, status: 'RETRY_WAIT', error: sendRes.error });
      } else {
        // FAILED: Maksimum deneme aşıldı (Dead Letter Queue)
        await db
          .prepare(`
            UPDATE email_queue
            SET status = 'FAILED', attempts = ?, last_error = ?
            WHERE id = ?
          `)
          .bind(currentAttempt, sendRes.error || 'Max attempts reached', item.id)
          .run();

        failedCount++;
        results.push({ id: item.id, status: 'FAILED', error: sendRes.error });
      }
    }
  }

  const batchLatencyMs = Math.max(1, performance.now() - startTime);

  return {
    processedCount: itemsToProcess.length,
    successCount,
    failedCount,
    retryCount,
    batchLatencyMs,
    items: results
  };
}
