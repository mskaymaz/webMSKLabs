import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

describe('DATA-005 — Ad Settings D1 Database Schema & Seed Tests', () => {
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
      '0006_push_subscriptions.sql',
      '0007_ad_settings.sql'
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

  it('1. should run all 7 migrations in order on clean SQLite and return 0 foreign key errors', () => {
    const errors = db.prepare('PRAGMA foreign_key_check;').all();
    expect(errors).toHaveLength(0);
  });

  it('2. should verify ad_settings table exists', () => {
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ad_settings';").get();
    expect(table).toBeTruthy();
  });

  it('3. should verify all required columns exist on ad_settings table', () => {
    const columnsResult = db.prepare('PRAGMA table_info(ad_settings);').all() as { name: string }[];
    const columnNames = columnsResult.map(c => c.name);

    const expectedColumns = [
      'id',
      'slot_key',
      'title',
      'is_enabled',
      'ad_client',
      'ad_slot',
      'preset_size',
      'custom_width',
      'custom_height',
      'margin_top',
      'margin_bottom',
      'is_sticky',
      'updated_at'
    ];

    for (const col of expectedColumns) {
      expect(columnNames).toContain(col);
    }
  });

  it('4. should enforce slot_key UNIQUE constraint by rejecting duplicate slot_key inserts', () => {
    expect(() => {
      db.exec(`
        INSERT INTO ad_settings (slot_key, title)
        VALUES ('header_banner', 'Duplicate Header Banner');
      `);
    }).toThrow();
  });

  it('5. should enforce is_enabled CHECK constraint accepting 0/1 and rejecting invalid values', () => {
    db.exec(`
      INSERT INTO ad_settings (slot_key, title, is_enabled)
      VALUES ('custom_slot_valid_0', 'Valid 0', 0);

      INSERT INTO ad_settings (slot_key, title, is_enabled)
      VALUES ('custom_slot_valid_1', 'Valid 1', 1);
    `);

    expect(() => {
      db.exec(`
        INSERT INTO ad_settings (slot_key, title, is_enabled)
        VALUES ('custom_slot_invalid_2', 'Invalid 2', 2);
      `);
    }).toThrow();
  });

  it('6. should enforce is_sticky CHECK constraint accepting 0/1 and rejecting invalid values', () => {
    db.exec(`
      INSERT INTO ad_settings (slot_key, title, is_sticky)
      VALUES ('sticky_slot_valid_0', 'Valid 0', 0);

      INSERT INTO ad_settings (slot_key, title, is_sticky)
      VALUES ('sticky_slot_valid_1', 'Valid 1', 1);
    `);

    expect(() => {
      db.exec(`
        INSERT INTO ad_settings (slot_key, title, is_sticky)
        VALUES ('sticky_slot_invalid_2', 'Invalid 2', 2);
      `);
    }).toThrow();
  });

  it('7. should verify seed contains exactly the 4 required default ad slots', () => {
    const slots = db.prepare('SELECT slot_key, title FROM ad_settings ORDER BY id ASC;').all() as { slot_key: string }[];
    expect(slots).toHaveLength(4);

    const slotKeys = slots.map(s => s.slot_key);
    expect(slotKeys).toContain('header_banner');
    expect(slotKeys).toContain('sidebar_top');
    expect(slotKeys).toContain('post_in_article');
    expect(slotKeys).toContain('footer_sticky');
  });

  it('8. should verify seed idempotency when running INSERT OR IGNORE again', () => {
    const sql = fs.readFileSync(path.join(process.cwd(), 'migrations', '0007_ad_settings.sql'), 'utf-8');
    db.exec(sql);

    const count = db.prepare('SELECT COUNT(*) as total FROM ad_settings;').get() as { total: number };
    expect(count.total).toBe(4);
  });

  it('9. should verify index idx_ad_slot_key or UNIQUE index on ad_settings', () => {
    const indexes = db.prepare("PRAGMA index_list('ad_settings');").all() as { name: string }[];
    const indexNames = indexes.map(i => i.name);
    
    const hasIndex = indexNames.some(name => name === 'idx_ad_slot_key' || name.includes('sqlite_autoindex_ad_settings'));
    expect(hasIndex).toBe(true);
  });

  it('10. should verify updated_at trigger updates timestamp on record modification', async () => {
    const initial = db.prepare("SELECT updated_at FROM ad_settings WHERE slot_key = 'header_banner';").get() as { updated_at: string };
    
    // Sleep briefly to ensure timestamp difference
    await new Promise(res => setTimeout(res, 1100));

    db.exec("UPDATE ad_settings SET title = 'Header Banner Reklam Alanı (Guncel)' WHERE slot_key = 'header_banner';");

    const updated = db.prepare("SELECT updated_at FROM ad_settings WHERE slot_key = 'header_banner';").get() as { updated_at: string };
    expect(updated.updated_at).not.toBe(initial.updated_at);
  });
});
