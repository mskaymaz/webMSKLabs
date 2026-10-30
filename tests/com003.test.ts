import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enqueueEmail,
  claimPendingEmails,
  processEmailQueue,
  calculateBackoffMinutes
} from '../backend/src/services/emailQueueWorker';

// Mock D1 SQLite Database Implementation for Vitest
class MockD1Database {
  private queue: any[] = [];
  private lastId = 0;

  public prepare(sql: string) {
    const db = this;
    let boundArgs: any[] = [];

    const stmt = {
      bind(...args: any[]) {
        boundArgs = args;
        return stmt;
      },
      async run() {
        if (sql.includes('INSERT INTO email_queue')) {
          db.lastId++;
          const [recipient_email, subject, html_body, idempotency_key] = boundArgs;
          const newItem = {
            id: db.lastId,
            recipient_email,
            subject,
            html_body,
            status: 'PENDING',
            attempts: 0,
            max_attempts: 3,
            last_error: null,
            scheduled_at: new Date().toISOString(),
            sent_at: null,
            idempotency_key: idempotency_key || null
          };
          db.queue.push(newItem);
          return { meta: { last_row_id: db.lastId } };
        }

        const normalizedSql = sql.replace(/\s+/g, ' ');

        if (normalizedSql.includes("status = 'PROCESSING'")) {
          const ids = boundArgs;
          for (const item of db.queue) {
            if (ids.includes(item.id) && (item.status === 'PENDING' || item.status === 'RETRY_WAIT')) {
              item.status = 'PROCESSING';
            }
          }
          return { success: true };
        }

        if (normalizedSql.includes("status = 'SENT'")) {
          const [attempts, id] = boundArgs;
          const item = db.queue.find(q => q.id === id);
          if (item) {
            item.status = 'SENT';
            item.attempts = attempts;
            item.sent_at = new Date().toISOString();
          }
          return { success: true };
        }

        if (normalizedSql.includes("status = 'RETRY_WAIT'")) {
          const [attempts, last_error, _backoff, id] = boundArgs;
          const item = db.queue.find(q => q.id === id);
          if (item) {
            item.status = 'RETRY_WAIT';
            item.attempts = attempts;
            item.last_error = last_error;
          }
          return { success: true };
        }

        if (normalizedSql.includes("status = 'FAILED'")) {
          const [attempts, last_error, id] = boundArgs;
          const item = db.queue.find(q => q.id === id);
          if (item) {
            item.status = 'FAILED';
            item.attempts = attempts;
            item.last_error = last_error;
          }
          return { success: true };
        }

        return { success: true };
      },

      async first() {
        if (sql.includes('SELECT id, status FROM email_queue WHERE idempotency_key')) {
          const key = boundArgs[0];
          return db.queue.find(q => q.idempotency_key === key) || null;
        }
        return null;
      },

      async all() {
        if (sql.includes('SELECT id FROM email_queue')) {
          const limit = boundArgs[0] || 10;
          const matches = db.queue
            .filter(q => (q.status === 'PENDING' || q.status === 'RETRY_WAIT') && q.attempts < q.max_attempts)
            .slice(0, limit);
          return { results: matches.map(m => ({ id: m.id })) };
        }

        if (sql.includes('SELECT * FROM email_queue WHERE id IN')) {
          const ids = boundArgs;
          const matches = db.queue.filter(q => ids.includes(q.id) && q.status === 'PROCESSING');
          return { results: matches };
        }

        return { results: db.queue };
      }
    };

    return stmt;
  }
}

describe('COM-003 — Email Queue Worker Test Suite', () => {
  let db: MockD1Database;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = new MockD1Database();
  });

  it('calculateBackoffMinutes should return 5m, 15m, 60m for attempts 1, 2, 3', () => {
    expect(calculateBackoffMinutes(1)).toBe(5);
    expect(calculateBackoffMinutes(2)).toBe(15);
    expect(calculateBackoffMinutes(3)).toBe(60);
  });

  it('enqueueEmail should insert new pending email and reject duplicate idempotencyKey', async () => {
    const res1 = await enqueueEmail({
      recipientEmail: 'user1@example.com',
      subject: 'Welcome',
      htmlBody: '<p>Welcome</p>',
      idempotencyKey: 'idemp-12345',
      db
    });

    expect(res1.success).toBe(true);
    expect(res1.duplicate).toBe(false);

    // Duplicate enqueue attempt
    const res2 = await enqueueEmail({
      recipientEmail: 'user1@example.com',
      subject: 'Welcome',
      htmlBody: '<p>Welcome</p>',
      idempotencyKey: 'idemp-12345',
      db
    });

    expect(res2.success).toBe(true);
    expect(res2.duplicate).toBe(true);
  });

  it('claimPendingEmails should atomically update status to PROCESSING', async () => {
    await enqueueEmail({ recipientEmail: 'a@ex.com', subject: 'S1', htmlBody: 'B1', db });
    await enqueueEmail({ recipientEmail: 'b@ex.com', subject: 'S2', htmlBody: 'B2', db });

    const claimed = await claimPendingEmails(db, 10);
    expect(claimed).toHaveLength(2);
    expect(claimed[0].status).toBe('PROCESSING');
  });

  it('processEmailQueue should transition PENDING -> PROCESSING -> SENT on success', async () => {
    await enqueueEmail({ recipientEmail: 'a@ex.com', subject: 'S1', htmlBody: 'B1', db });

    const result = await processEmailQueue({ db, mockSend: true });
    expect(result.processedCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.items[0].status).toBe('SENT');
  });

  it('processEmailQueue should retry on failure and move to FAILED on 3rd attempt (Dead Letter Queue)', async () => {
    await enqueueEmail({ recipientEmail: 'fail@ex.com', subject: 'Fail', htmlBody: 'B', db });

    const mockFetchFail = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 })
    );

    // 1st Attempt -> RETRY_WAIT
    const res1 = await processEmailQueue({ db, fetchFn: mockFetchFail, mockSend: false });
    expect(res1.retryCount).toBe(1);
    expect(res1.items[0].status).toBe('RETRY_WAIT');

    // 2nd Attempt -> RETRY_WAIT
    const res2 = await processEmailQueue({ db, fetchFn: mockFetchFail, mockSend: false });
    expect(res2.retryCount).toBe(1);

    // 3rd Attempt -> FAILED (Dead Letter Queue)
    const res3 = await processEmailQueue({ db, fetchFn: mockFetchFail, mockSend: false });
    expect(res3.failedCount).toBe(1);
    expect(res3.items[0].status).toBe('FAILED');
  });

  it('should process batch of 10 emails in < 1500ms performance acceptance target', async () => {
    for (let i = 0; i < 10; i++) {
      await enqueueEmail({ recipientEmail: `u${i}@ex.com`, subject: `S${i}`, htmlBody: 'B', db });
    }

    const batchRes = await processEmailQueue({ db, batchSize: 10, mockSend: true });
    expect(batchRes.processedCount).toBe(10);
    expect(batchRes.batchLatencyMs).toBeLessThan(1500);
  });
});
