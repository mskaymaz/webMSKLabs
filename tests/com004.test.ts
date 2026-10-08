import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerPushSubscription,
  unregisterPushSubscription,
  sendPushNotification,
  resetPushDedupeStore,
  PushSubscriptionSchema
} from '../backend/src/services/pushService';

// Mock D1 SQLite DB Implementation
class MockD1PushDB {
  public subscriptions: any[] = [];
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
        if (sql.includes('INSERT INTO push_subscriptions')) {
          const [endpoint, p256dh, auth, user_agent] = boundArgs;
          const existing = db.subscriptions.find(s => s.endpoint === endpoint);
          if (existing) {
            existing.p256dh = p256dh;
            existing.auth = auth;
            existing.user_agent = user_agent;
            existing.is_active = 1;
            return { meta: { last_row_id: existing.id } };
          }
          db.lastId++;
          const newSub = { id: db.lastId, endpoint, p256dh, auth, user_agent, is_active: 1 };
          db.subscriptions.push(newSub);
          return { meta: { last_row_id: db.lastId } };
        }

        if (sql.includes('UPDATE push_subscriptions SET is_active = 0')) {
          const [endpoint] = boundArgs;
          const sub = db.subscriptions.find(s => s.endpoint === endpoint);
          if (sub) {
            sub.is_active = 0;
          }
          return { success: true };
        }

        return { success: true };
      },

      async all() {
        if (sql.includes('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE is_active = 1')) {
          return { results: db.subscriptions.filter(s => s.is_active === 1) };
        }
        return { results: db.subscriptions };
      }
    };

    return stmt;
  }
}

describe('COM-004 — Web Push Notification & VAPID Test Suite', () => {
  let db: MockD1PushDB;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetPushDedupeStore();
    db = new MockD1PushDB();
  });

  it('PushSubscriptionSchema should validate endpoint URL, p256dh, and auth', () => {
    const valid = PushSubscriptionSchema.safeParse({
      endpoint: 'https://fcm.googleapis.com/fcm/send/sub_123',
      p256dh: 'keys_p256dh_value',
      auth: 'keys_auth_value'
    });
    expect(valid.success).toBe(true);

    const invalid = PushSubscriptionSchema.safeParse({
      endpoint: 'not-a-url',
      p256dh: '',
      auth: ''
    });
    expect(invalid.success).toBe(false);
  });

  it('registerPushSubscription & unregisterPushSubscription D1 operations', async () => {
    const reg = await registerPushSubscription(db, {
      endpoint: 'https://push.example.com/sub_1',
      p256dh: 'p256_key',
      auth: 'auth_key'
    });

    expect(reg.success).toBe(true);
    expect(db.subscriptions).toHaveLength(1);
    expect(db.subscriptions[0].is_active).toBe(1);

    const unreg = await unregisterPushSubscription(db, 'https://push.example.com/sub_1');
    expect(unreg.success).toBe(true);
    expect(db.subscriptions[0].is_active).toBe(0);
  });

  it('sendPushNotification should deduplicate events within 60s window', async () => {
    await registerPushSubscription(db, {
      endpoint: 'https://push.example.com/sub_dedupe',
      p256dh: 'p256',
      auth: 'auth'
    });

    const payload = {
      title: 'Yeni Bilet',
      body: 'Destek bileti oluşturuldu',
      eventType: 'MESSAGE_CREATED' as const,
      referenceId: 'MSK-2026-001'
    };

    // 1st Push -> Sent
    const res1 = await sendPushNotification({ db, payload, mockSend: true });
    expect(res1.deduped).toBe(false);
    expect(res1.successCount).toBe(1);

    // 2nd Push within 60s -> Deduplicated!
    const res2 = await sendPushNotification({ db, payload, mockSend: true });
    expect(res2.deduped).toBe(true);
    expect(res2.successCount).toBe(0);
  });

  it('should automatically cleanup D1 subscription when WebPush endpoint returns 404 or 410 Gone', async () => {
    await registerPushSubscription(db, {
      endpoint: 'https://push.example.com/stale_sub',
      p256dh: 'p256',
      auth: 'auth'
    });

    const mockFetch410 = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ error: 'Subscription Gone' }), { status: 410 })
    );

    const res = await sendPushNotification({
      db,
      payload: { title: 'Test', body: 'Body', eventType: 'SYSTEM_ALERT' },
      fetchFn: mockFetch410,
      mockSend: false
    });

    expect(res.staleCleanedCount).toBe(1);
    // Subscription should be deactivated in D1
    expect(db.subscriptions[0].is_active).toBe(0);
  });

  it('should send push notification with latency < 500ms acceptance target', async () => {
    await registerPushSubscription(db, {
      endpoint: 'https://push.example.com/fast_sub',
      p256dh: 'p256',
      auth: 'auth'
    });

    const res = await sendPushNotification({
      db,
      payload: { title: 'Fast', body: 'Fast Body', eventType: 'COMMENT_CREATED' },
      mockSend: true
    });

    expect(res.latencyMs).toBeLessThan(500);
  });
});
