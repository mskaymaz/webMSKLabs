import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

describe('DATA-002 — Headless CMS & App Catalog D1 Database Schema Tests', () => {
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
      '0005_cms_schema.sql'
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

  it('1. should run migrations in order on clean SQLite and return 0 foreign key errors', () => {
    const errors = db.prepare('PRAGMA foreign_key_check;').all();
    expect(errors).toHaveLength(0);
  });

  it('2. should verify all 6 CMS tables exist', () => {
    const tablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all() as { name: string }[];
    const tableNames = tablesResult.map(t => t.name);

    const cmsTables = [
      'blog_channels',
      'blog_posts',
      'apps',
      'app_versions',
      'site_templates',
      'media_assets'
    ];

    for (const tableName of cmsTables) {
      expect(tableNames).toContain(tableName);
    }
  });

  it('3. should enforce UNIQUE constraints on slug, key, and r2_key fields', () => {
    // blog_channels.slug
    db.exec(`INSERT INTO blog_channels (slug, name_tr) VALUES ('yazilim', 'Yazılım');`);
    expect(() => {
      db.exec(`INSERT INTO blog_channels (slug, name_tr) VALUES ('yazilim', 'Yazılım 2');`);
    }).toThrow();

    // blog_posts.slug
    db.exec(`INSERT INTO blog_posts (slug, title_tr, content_tr) VALUES ('post-1', 'Başlık 1', 'İçerik 1');`);
    expect(() => {
      db.exec(`INSERT INTO blog_posts (slug, title_tr, content_tr) VALUES ('post-1', 'Başlık 2', 'İçerik 2');`);
    }).toThrow();

    // apps.slug
    db.exec(`INSERT INTO apps (slug, name) VALUES ('app-1', 'Uygulama 1');`);
    expect(() => {
      db.exec(`INSERT INTO apps (slug, name) VALUES ('app-1', 'Uygulama 2');`);
    }).toThrow();

    // site_templates.key
    db.exec(`INSERT INTO site_templates (key, title) VALUES ('hero_banner', 'Hero Banner');`);
    expect(() => {
      db.exec(`INSERT INTO site_templates (key, title) VALUES ('hero_banner', 'Hero Banner 2');`);
    }).toThrow();

    // media_assets.r2_key
    db.exec(`INSERT INTO media_assets (filename, r2_key, mime_type, size_bytes, public_url) VALUES ('img.png', 'img-r2-1', 'image/png', 1024, 'https://cdn.example.com/img.png');`);
    expect(() => {
      db.exec(`INSERT INTO media_assets (filename, r2_key, mime_type, size_bytes, public_url) VALUES ('img2.png', 'img-r2-1', 'image/png', 2048, 'https://cdn.example.com/img2.png');`);
    }).toThrow();
  });

  it('4. should enforce blog_posts.status CHECK constraint', () => {
    db.exec(`INSERT INTO blog_posts (slug, title_tr, content_tr, status) VALUES ('valid-status', 'Title', 'Content', 'PUBLISHED');`);

    expect(() => {
      db.exec(`INSERT INTO blog_posts (slug, title_tr, content_tr, status) VALUES ('invalid-status', 'Title', 'Content', 'INVALID_STATUS');`);
    }).toThrow();
  });

  it('5. should enforce apps.platform CHECK constraint', () => {
    db.exec(`INSERT INTO apps (slug, name, platform) VALUES ('app-android', 'App', 'ANDROID');`);

    expect(() => {
      db.exec(`INSERT INTO apps (slug, name, platform) VALUES ('app-bad', 'App', 'WINDOWS');`);
    }).toThrow();
  });

  it('6. should enforce ON DELETE SET NULL on blog_posts.channel_id', () => {
    db.exec(`INSERT INTO blog_channels (id, slug, name_tr) VALUES (5, 'teknoloji', 'Teknoloji');`);
    db.exec(`INSERT INTO blog_posts (id, channel_id, slug, title_tr, content_tr) VALUES (10, 5, 'tech-post', 'Title', 'Content');`);

    let post = db.prepare('SELECT channel_id FROM blog_posts WHERE id = 10').get() as any;
    expect(post.channel_id).toBe(5);

    db.exec('DELETE FROM blog_channels WHERE id = 5');

    post = db.prepare('SELECT channel_id FROM blog_posts WHERE id = 10').get() as any;
    expect(post.channel_id).toBeNull();
  });

  it('7. should enforce ON DELETE CASCADE on app_versions.app_id', () => {
    db.exec(`INSERT INTO apps (id, slug, name) VALUES (1, 'my-app', 'My App');`);
    db.exec(`INSERT INTO app_versions (id, app_id, version_number) VALUES (100, 1, '1.0.0');`);

    let versions = db.prepare('SELECT * FROM app_versions WHERE app_id = 1').all();
    expect(versions).toHaveLength(1);

    db.exec('DELETE FROM apps WHERE id = 1');

    versions = db.prepare('SELECT * FROM app_versions WHERE app_id = 1').all();
    expect(versions).toHaveLength(0);
  });

  it('8. should verify comments.post_id foreign key relationship to blog_posts', () => {
    db.exec(`INSERT INTO blog_posts (id, slug, title_tr, content_tr) VALUES (1, 'sample-post', 'Sample', 'Body');`);
    db.exec(`INSERT INTO comments (id, post_slug, author_name, author_email, comment_text, post_id) VALUES (100, 'sample-post', 'Reader', 'reader@example.com', 'Comment text', 1);`);

    let comment = db.prepare('SELECT * FROM comments WHERE id = 100').get() as any;
    expect(comment.post_id).toBe(1);

    db.exec('DELETE FROM blog_posts WHERE id = 1');

    comment = db.prepare('SELECT * FROM comments WHERE id = 100').get() as any;
    expect(comment).toBeUndefined();
  });

  it('9. should verify performance indexes are created on tables', () => {
    const indexesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='index';").all() as { name: string }[];
    const indexNames = indexesResult.map(i => i.name);

    expect(indexNames).toContain('idx_blog_posts_slug');
    expect(indexNames).toContain('idx_blog_posts_status_published');
    expect(indexNames).toContain('idx_apps_slug');
    expect(indexNames).toContain('idx_app_versions_app_current');
    expect(indexNames).toContain('idx_comments_post_id');
  });
});
