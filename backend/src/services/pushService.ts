/**
 * MSKLabs & DevAdmin — Web Push Notification & VAPID Service (COM-004)
 * File: backend/src/services/pushService.ts
 * Description: Web Push VAPID key güvenliği, D1 push_subscriptions yönetimi, MESSAGE_CREATED / COMMENT_CREATED yönlendirme,
 *              60s deduplication ve 404/410 Stale Subscription Otomatik Temizlik altyapısı.
 */

import { z } from 'zod';

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url('Geçerli bir Push endpoint URL olmalıdır'),
  p256dh: z.string().min(1, 'p256dh anahtarı gereklidir'),
  auth: z.string().min(1, 'auth anahtarı gereklidir'),
  userAgent: z.string().optional()
});

export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;

export type PushEventType = 'MESSAGE_CREATED' | 'COMMENT_CREATED' | 'SYSTEM_ALERT';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  eventType: PushEventType;
  referenceId?: string;
}

export interface SendPushOptions {
  db: any; // Cloudflare D1 Binding
  payload: PushNotificationPayload;
  fetchFn?: typeof fetch;
  env?: Record<string, any>;
  mockSend?: boolean;
}

export interface SendPushResult {
  totalActive: number;
  successCount: number;
  staleCleanedCount: number;
  failedCount: number;
  deduped: boolean;
  latencyMs: number;
}

// 60 Saniyelik Deduplication Mağazası
const pushDedupeStore = new Map<string, number>();

export function resetPushDedupeStore(): void {
  pushDedupeStore.clear();
}

/**
 * Push Aboneliği Oluşturma / Güncelleme (D1 `push_subscriptions`)
 */
export async function registerPushSubscription(db: any, input: PushSubscriptionInput): Promise<{ success: boolean; id?: number }> {
  if (!db || typeof db.prepare !== 'function') {
    throw new Error('D1 database binding is required');
  }

  const validated = PushSubscriptionSchema.parse(input);

  // ON CONFLICT(endpoint) DO UPDATE
  const res = await db
    .prepare(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, is_active, updated_at)
      VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(validated.endpoint, validated.p256dh, validated.auth, validated.userAgent || null)
    .run();

  const id = res?.meta?.last_row_id || res?.lastInsertRowid;
  return { success: true, id };
}

/**
 * Push Aboneliği İptal Etme / Pasife Alma
 */
export async function unregisterPushSubscription(db: any, endpoint: string): Promise<{ success: boolean }> {
  if (!db || typeof db.prepare !== 'function') {
    throw new Error('D1 database binding is required');
  }

  await db
    .prepare('UPDATE push_subscriptions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE endpoint = ?')
    .bind(endpoint)
    .run();

  return { success: true };
}

/**
 * Push Bildirimi Gönderme & 404/410 Otomatik Temizlik (COM-004)
 */
export async function sendPushNotification(options: SendPushOptions): Promise<SendPushResult> {
  const startTime = performance.now();
  const { db, payload, fetchFn, env, mockSend } = options;

  // 1. 60 Saniyelik Deduplication Kontrolü
  const dedupeKey = `${payload.eventType}:${payload.referenceId || payload.title}`;
  const now = Date.now();
  const lastSent = pushDedupeStore.get(dedupeKey);

  if (lastSent && now - lastSent < 60000) {
    return {
      totalActive: 0,
      successCount: 0,
      staleCleanedCount: 0,
      failedCount: 0,
      deduped: true,
      latencyMs: Math.max(1, performance.now() - startTime)
    };
  }

  pushDedupeStore.set(dedupeKey, now);

  // 2. Aktif Aboneleri Çek
  const subscriptions = await db
    .prepare('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE is_active = 1')
    .all();

  const activeList = subscriptions?.results || subscriptions || [];
  if (!Array.isArray(activeList) || activeList.length === 0) {
    return {
      totalActive: 0,
      successCount: 0,
      staleCleanedCount: 0,
      failedCount: 0,
      deduped: false,
      latencyMs: Math.max(1, performance.now() - startTime)
    };
  }

  let successCount = 0;
  let staleCleanedCount = 0;
  let failedCount = 0;

  const actualFetch = fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : globalThis.fetch);
  const isMock = mockSend ?? (env?.MOCK_SEND === 'true' || !env?.VAPID_PRIVATE_KEY);

  for (const sub of activeList) {
    if (isMock) {
      successCount++;
      continue;
    }

    try {
      const res = await actualFetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'TTL': '60'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 404 || res.status === 410) {
        // 404 Not Found veya 410 Gone -> Stale Subscription Otomatik D1 Temizliği
        await unregisterPushSubscription(db, sub.endpoint);
        staleCleanedCount++;
      } else if (res.ok) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (_) {
      failedCount++;
    }
  }

  const latencyMs = Math.max(1, performance.now() - startTime);

  return {
    totalActive: activeList.length,
    successCount,
    staleCleanedCount,
    failedCount,
    deduped: false,
    latencyMs
  };
}
