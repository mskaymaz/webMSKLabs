import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

describe('DATA-TTS-001 — TTS Audio Metadata D1 Database Schema & Integrity Tests', () => {
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
      '0007_ad_settings.sql',
      '0008_blog_layouts.sql',
      '0009_translation.sql',
      '0010_post_audio_assets.sql'
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

  it('1. should execute all migrations in order on clean SQLite without errors', () => {
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='post_audio_assets';").get();
    expect(table).toBeTruthy();
  });

  it('2. should verify post_audio_assets table structure and columns', () => {
    const columns = db.prepare("PRAGMA table_info('post_audio_assets');").all() as any[];
    const colNames = columns.map((c: any) => c.name);

    expect(colNames).toContain('id');
    expect(colNames).toContain('post_id');
    expect(colNames).toContain('language');
    expect(colNames).toContain('article_version');
    expect(colNames).toContain('audio_version');
    expect(colNames).toContain('provider');
    expect(colNames).toContain('model');
    expect(colNames).toContain('r2_object_key');
    expect(colNames).toContain('file_size');
    expect(colNames).toContain('duration_seconds');
    expect(colNames).toContain('status');
    expect(colNames).toContain('validation_result_json');
    expect(colNames).toContain('created_at');
    expect(colNames).toContain('updated_at');
  });

  it('3. should enforce foreign key constraint on post_id', () => {
    // Valid insert with existing blog_post
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('fk-test-audio-post', 'FK Audio Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'fk-test-audio-post';").get() as { id: number };

    db.exec(`
      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
      VALUES (${post.id}, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/fk-test.mp3', 1024, 60);
    `);

    // Invalid post_id fails
    expect(() => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
        VALUES (999999, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/invalid-fk.mp3', 1024, 60);
      `);
    }).toThrow();
  });

  it('4. should cascade delete post_audio_assets when parent blog_post is deleted', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('cascade-audio-post', 'Cascade Audio Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'cascade-audio-post';").get() as { id: number };

    db.exec(`
      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
      VALUES (${post.id}, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/cascade-test.mp3', 1024, 60);
    `);

    let count = db.prepare(`SELECT COUNT(*) as count FROM post_audio_assets WHERE post_id = ${post.id};`).get() as { count: number };
    expect(count.count).toBe(1);

    // Delete parent post
    db.exec(`DELETE FROM blog_posts WHERE id = ${post.id};`);

    count = db.prepare(`SELECT COUNT(*) as count FROM post_audio_assets WHERE post_id = ${post.id};`).get() as { count: number };
    expect(count.count).toBe(0);
  });

  it('5. should enforce language CHECK constraint (TR, EN, AR pass; DE, FR, lowercase tr fail)', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('lang-check-post', 'Lang Check Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'lang-check-post';").get() as { id: number };

    // Valid languages: TR, EN, AR
    db.exec(`
      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
      VALUES (${post.id}, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/lang-tr.mp3', 100, 10);

      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
      VALUES (${post.id}, 'EN', 1, 1, 'GEMINI', 'TTS-1', 'audio/lang-en.mp3', 100, 10);

      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
      VALUES (${post.id}, 'AR', 1, 1, 'GEMINI', 'TTS-1', 'audio/lang-ar.mp3', 100, 10);
    `);

    // Invalid language 'DE'
    expect(() => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
        VALUES (${post.id}, 'DE', 1, 2, 'GEMINI', 'TTS-1', 'audio/lang-de.mp3', 100, 10);
      `);
    }).toThrow();

    // Invalid language lowercase 'tr'
    expect(() => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
        VALUES (${post.id}, 'tr', 1, 2, 'GEMINI', 'TTS-1', 'audio/lang-tr-lower.mp3', 100, 10);
      `);
    }).toThrow();
  });

  it('6. should enforce status CHECK constraint (GENERATING, DRAFT, APPROVED, FAILED, STALE pass; invalid fails)', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('status-check-post', 'Status Check Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'status-check-post';").get() as { id: number };

    const validStatuses = ['GENERATING', 'DRAFT', 'APPROVED', 'FAILED', 'STALE'];
    validStatuses.forEach((st, idx) => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds, status)
        VALUES (${post.id}, 'TR', 1, ${idx + 1}, 'GEMINI', 'TTS-1', 'audio/status-${st}.mp3', 100, 10, '${st}');
      `);
    });

    // Invalid status
    expect(() => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds, status)
        VALUES (${post.id}, 'TR', 1, 99, 'GEMINI', 'TTS-1', 'audio/status-invalid.mp3', 100, 10, 'PUBLISHED');
      `);
    }).toThrow();
  });

  it('7. should assign default status as DRAFT when omitted', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('default-status-post', 'Default Status Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'default-status-post';").get() as { id: number };

    db.exec(`
      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
      VALUES (${post.id}, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/default-status.mp3', 100, 10);
    `);

    const asset = db.prepare("SELECT status FROM post_audio_assets WHERE r2_object_key = 'audio/default-status.mp3';").get() as { status: string };
    expect(asset.status).toBe('DRAFT');
  });

  it('8. should reject NULL status', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('null-status-post', 'Null Status Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'null-status-post';").get() as { id: number };

    expect(() => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds, status)
        VALUES (${post.id}, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/null-status.mp3', 100, 10, NULL);
      `);
    }).toThrow();
  });

  it('9. should enforce UNIQUE constraint on r2_object_key', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('r2-unique-post', 'R2 Unique Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'r2-unique-post';").get() as { id: number };

    db.exec(`
      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
      VALUES (${post.id}, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/unique-r2-key.mp3', 100, 10);
    `);

    expect(() => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
        VALUES (${post.id}, 'EN', 1, 2, 'GEMINI', 'TTS-1', 'audio/unique-r2-key.mp3', 100, 10);
      `);
    }).toThrow();
  });

  it('10. should enforce composite UNIQUE constraint on (post_id, language, audio_version)', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('composite-unique-post', 'Composite Unique Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'composite-unique-post';").get() as { id: number };

    db.exec(`
      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
      VALUES (${post.id}, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/comp-1.mp3', 100, 10);
    `);

    expect(() => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
        VALUES (${post.id}, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/comp-2.mp3', 100, 10);
      `);
    }).toThrow();
  });

  it('11. should validate article_version and audio_version INTEGER NOT NULL constraints', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('version-notnull-post', 'Version NotNull Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'version-notnull-post';").get() as { id: number };

    expect(() => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
        VALUES (${post.id}, 'TR', NULL, 1, 'GEMINI', 'TTS-1', 'audio/ver-null.mp3', 100, 10);
      `);
    }).toThrow();

    expect(() => {
      db.exec(`
        INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds)
        VALUES (${post.id}, 'TR', 1, NULL, 'GEMINI', 'TTS-1', 'audio/ver-null-2.mp3', 100, 10);
      `);
    }).toThrow();
  });

  it('12. should test STALE business rule logic (article_version == audio_version AND status == APPROVED for public player)', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('stale-rule-post', 'Stale Rule Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'stale-rule-post';").get() as { id: number };

    // Valid fresh approved audio
    db.exec(`
      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds, status)
      VALUES (${post.id}, 'TR', 2, 2, 'GEMINI', 'TTS-1', 'audio/stale-fresh.mp3', 100, 10, 'APPROVED');

      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds, status)
      VALUES (${post.id}, 'EN', 3, 2, 'GEMINI', 'TTS-1', 'audio/stale-mismatch.mp3', 100, 10, 'APPROVED');
    `);

    // Business rule query filter simulate
    const publicPlayerAudio = db.prepare(`
      SELECT * FROM post_audio_assets
      WHERE post_id = ${post.id}
        AND article_version = audio_version
        AND status = 'APPROVED';
    `).all() as any[];

    expect(publicPlayerAudio).toHaveLength(1);
    expect(publicPlayerAudio[0].r2_object_key).toBe('audio/stale-fresh.mp3');
  });

  it('13. should verify idx_audio_post_lang_status and idx_audio_version_check indexes exist', () => {
    const indexes = db.prepare("PRAGMA index_list('post_audio_assets');").all() as any[];
    const idxNames = indexes.map((i: any) => i.name);

    expect(idxNames).toContain('idx_audio_post_lang_status');
    expect(idxNames).toContain('idx_audio_version_check');
  });

  it('14. should pass PRAGMA foreign_key_check with 0 errors across entire database', () => {
    const fkErrors = db.prepare('PRAGMA foreign_key_check;').all();
    expect(fkErrors).toHaveLength(0);
  });

  it('15. should trigger updated_at timestamp update on record modification', async () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('trigger-updatedat-post', 'Trigger Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'trigger-updatedat-post';").get() as { id: number };

    db.exec(`
      INSERT INTO post_audio_assets (post_id, language, article_version, audio_version, provider, model, r2_object_key, file_size, duration_seconds, updated_at)
      VALUES (${post.id}, 'TR', 1, 1, 'GEMINI', 'TTS-1', 'audio/trigger.mp3', 100, 10, '2000-01-01 00:00:00');
    `);

    const initial = db.prepare("SELECT updated_at FROM post_audio_assets WHERE r2_object_key = 'audio/trigger.mp3';").get() as { updated_at: string };
    expect(initial.updated_at).toBe('2000-01-01 00:00:00');

    // Perform UPDATE
    db.exec(`
      UPDATE post_audio_assets
      SET status = 'APPROVED'
      WHERE r2_object_key = 'audio/trigger.mp3';
    `);

    const updated = db.prepare("SELECT updated_at FROM post_audio_assets WHERE r2_object_key = 'audio/trigger.mp3';").get() as { updated_at: string };
    expect(updated.updated_at).not.toBe('2000-01-01 00:00:00');
  });
});
