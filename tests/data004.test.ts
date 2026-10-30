import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

describe('DATA-004 — Push Subscriptions D1 Database Schema Tests', () => {
  let db: any;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');

    const migrationDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = [
      '0001_devadmin_initial_schema.sql',
      '0002_seed_devadmin.sql',
      '0003_seed_tickets_comments.sql',
      '0004_add_broadcasts_table.sql',
      '0005_cms_schema.sql',
      '0006_push_subscriptions.sql'
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        db.exec(sql);
      }
    }
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('1. should run all 6 migrations in order on clean SQLite and return 0 foreign key errors', () => {
    const errors = db.prepare('PRAGMA foreign_key_check;').all();
    expect(errors).toHaveLength(0);
  });

  it('2. should verify push_subscriptions table exists', () => {
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='push_subscriptions';").get();
    expect(table).toBeTruthy();
  });

  it('3. should verify all required columns exist on push_subscriptions table', () => {
    const columnsResult = db.prepare("PRAGMA table_info(push_subscriptions);").all() as { name: string }[];
    const columnNames = columnsResult.map(c => c.name);

    const expectedColumns = [
      'id',
      'endpoint',
      'p256dh',
      'auth',
      'user_agent',
      'is_active',
      'created_at',
      'updated_at'
    ];

    for (const col of expectedColumns) {
      expect(columnNames).toContain(col);
    }
  });

  it('4. should enforce endpoint UNIQUE constraint by rejecting duplicate endpoint inserts', () => {
    db.exec(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent)
      VALUES ('https://fcm.googleapis.com/fcm/send/test-endpoint-1', 'p256dh-key-1', 'auth-secret-1', 'Mozilla/5.0');
    `);

    expect(() => {
      db.exec(`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent)
        VALUES ('https://fcm.googleapis.com/fcm/send/test-endpoint-1', 'p256dh-key-2', 'auth-secret-2', 'Mozilla/5.0');
      `);
    }).toThrow();
  });

  it('5. should enforce is_active CHECK constraint accepting 0/1 and rejecting invalid values', () => {
    db.exec(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, is_active)
      VALUES ('https://fcm.googleapis.com/fcm/send/active-0', 'key', 'auth', 0);

      INSERT INTO push_subscriptions (endpoint, p256dh, auth, is_active)
      VALUES ('https://fcm.googleapis.com/fcm/send/active-1', 'key', 'auth', 1);
    `);

    expect(() => {
      db.exec(`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, is_active)
        VALUES ('https://fcm.googleapis.com/fcm/send/active-invalid', 'key', 'auth', 2);
      `);
    }).toThrow();
  });

  it('6. should support ON CONFLICT(endpoint) DO UPDATE upsert behavior correctly', () => {
    const endpoint = 'https://updates.push.apple.com/send/unique-token';

    db.exec(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, is_active)
      VALUES ('${endpoint}', 'old-key', 'old-auth', 'Safari/15.0', 1);
    `);

    let countResult = db.prepare("SELECT COUNT(*) as count FROM push_subscriptions;").get() as any;
    expect(countResult.count).toBe(1);

    db.exec(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, is_active, updated_at)
      VALUES ('${endpoint}', 'new-key', 'new-auth', 'Safari/16.0', 1, CURRENT_TIMESTAMP)
      ON CONFLICT(endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        is_active = excluded.is_active,
        updated_at = CURRENT_TIMESTAMP;
    `);

    countResult = db.prepare("SELECT COUNT(*) as count FROM push_subscriptions;").get() as any;
    expect(countResult.count).toBe(1);

    const record = db.prepare(`SELECT * FROM push_subscriptions WHERE endpoint = '${endpoint}'`).get() as any;
    expect(record.p256dh).toBe('new-key');
    expect(record.auth).toBe('new-auth');
    expect(record.user_agent).toBe('Safari/16.0');
  });

  it('7. should verify idx_push_active index exists', () => {
    const indexesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='index';").all() as { name: string }[];
    const indexNames = indexesResult.map(i => i.name);

    expect(indexNames).toContain('idx_push_active');
  });
});
