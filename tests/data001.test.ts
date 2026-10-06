import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

describe('DATA-001 — Initial D1 Database Migration & Schema Integrity Tests', () => {
  let db: any;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');

    // Execute migrations in order
    const migrationDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = [
      '0001_devadmin_initial_schema.sql',
      '0002_seed_devadmin.sql',
      '0003_seed_tickets_comments.sql',
      '0004_add_broadcasts_table.sql'
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

  it('1. should verify PRAGMA foreign_key_check returns 0 errors', () => {
    const errors = db.prepare('PRAGMA foreign_key_check;').all();
    expect(errors).toHaveLength(0);
  });

  it('2. should verify all 10 core tables exist in schema', () => {
    const tablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all() as { name: string }[];
    const tableNames = tablesResult.map(t => t.name);

    const expectedTables = [
      'messages',
      'message_events',
      'replies',
      'comments',
      'subscribers',
      'subscriber_preferences',
      'email_queue',
      'coupons',
      'admins',
      'broadcasts'
    ];

    for (const expected of expectedTables) {
      expect(tableNames).toContain(expected);
    }
  });

  it('3. should enforce messages status CHECK constraint', () => {
    db.exec(`
      INSERT INTO messages (id, name, email, subject, message, status)
      VALUES ('MSK-TEST-001', 'Test User', 'test@example.com', 'Subject', 'Message text', 'NEW');
    `);

    expect(() => {
      db.exec(`
        INSERT INTO messages (id, name, email, subject, message, status)
        VALUES ('MSK-TEST-002', 'Test User', 'test@example.com', 'Subject', 'Message text', 'INVALID_STATUS');
      `);
    }).toThrow();
  });

  it('4. should enforce ON DELETE CASCADE on message_events and replies', () => {
    db.exec(`
      INSERT INTO messages (id, name, email, subject, message)
      VALUES ('MSK-CASCADE-1', 'User', 'user@example.com', 'Subject', 'Body');

      INSERT INTO message_events (message_id, event_type)
      VALUES ('MSK-CASCADE-1', 'CREATED');

      INSERT INTO replies (message_id, sender_type, reply_text)
      VALUES ('MSK-CASCADE-1', 'ADMIN', 'Test Reply');
    `);

    let events = db.prepare("SELECT * FROM message_events WHERE message_id = 'MSK-CASCADE-1'").all();
    let replies = db.prepare("SELECT * FROM replies WHERE message_id = 'MSK-CASCADE-1'").all();
    expect(events).toHaveLength(1);
    expect(replies).toHaveLength(1);

    db.exec("DELETE FROM messages WHERE id = 'MSK-CASCADE-1'");

    events = db.prepare("SELECT * FROM message_events WHERE message_id = 'MSK-CASCADE-1'").all();
    replies = db.prepare("SELECT * FROM replies WHERE message_id = 'MSK-CASCADE-1'").all();
    expect(events).toHaveLength(0);
    expect(replies).toHaveLength(0);
  });

  it('5. should enforce subscribers.email UNIQUE constraint', () => {
    db.exec(`
      INSERT INTO subscribers (email, unsubscribe_token)
      VALUES ('unique@example.com', 'token-123');
    `);

    expect(() => {
      db.exec(`
        INSERT INTO subscribers (email, unsubscribe_token)
        VALUES ('unique@example.com', 'token-456');
      `);
    }).toThrow();
  });

  it('6. should enforce subscriber_preferences composite UNIQUE (subscriber_id, category)', () => {
    db.exec(`
      INSERT INTO subscribers (id, email, unsubscribe_token)
      VALUES (10, 'pref@example.com', 'token-pref-10');

      INSERT INTO subscriber_preferences (subscriber_id, category)
      VALUES (10, 'ANNOUNCEMENTS');
    `);

    expect(() => {
      db.exec(`
        INSERT INTO subscriber_preferences (subscriber_id, category)
        VALUES (10, 'ANNOUNCEMENTS');
      `);
    }).toThrow();
  });

  it('7. should enforce admins.username UNIQUE constraint', () => {
    expect(() => {
      db.exec(`
        INSERT INTO admins (username, password_hash)
        VALUES ('admin', 'another_hash');
      `);
    }).toThrow();
  });

  it('8. should verify broadcasts table CRUD & status constraint', () => {
    db.exec(`
      INSERT INTO broadcasts (subject, content_html, status)
      VALUES ('Duyuru', '<p>Test</p>', 'QUEUED');
    `);

    const record = db.prepare("SELECT * FROM broadcasts WHERE subject = 'Duyuru'").get() as any;
    expect(record.status).toBe('QUEUED');

    expect(() => {
      db.exec(`
        INSERT INTO broadcasts (subject, content_html, status)
        VALUES ('Geçersiz Duyuru', '<p>Test</p>', 'BAD_STATUS');
      `);
    }).toThrow();
  });
});
