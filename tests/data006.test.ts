import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

describe('DATA-006 — Blog Layouts & Revisions D1 Database Schema & Business Logic Tests', () => {
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
      '0008_blog_layouts.sql'
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

  it('1. should run all 8 migrations in order on clean SQLite and return 0 foreign key errors', () => {
    const errors = db.prepare('PRAGMA foreign_key_check;').all();
    expect(errors).toHaveLength(0);
  });

  it('2. should verify post_revisions and blog_layouts tables exist', () => {
    const tableRev = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='post_revisions';").get();
    const tableLay = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='blog_layouts';").get();

    expect(tableRev).toBeTruthy();
    expect(tableLay).toBeTruthy();
  });

  it('3. should enforce foreign key constraint on post_id for both post_revisions and blog_layouts', () => {
    // Insert valid blog_post
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('fk-test-post', 'FK Test Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'fk-test-post';").get() as { id: number };

    // Valid FK inserts succeed
    db.exec(`
      INSERT INTO post_revisions (post_id, title, content, revision_number)
      VALUES (${post.id}, 'Rev 1', 'Content 1', 1);

      INSERT INTO blog_layouts (post_id, layout_name, block_structure_json)
      VALUES (${post.id}, 'Default Layout', '{"blocks":[]}');
    `);

    // Invalid FK insert fails
    expect(() => {
      db.exec(`
        INSERT INTO post_revisions (post_id, title, content, revision_number)
        VALUES (999999, 'Invalid FK', 'Content', 1);
      `);
    }).toThrow();

    expect(() => {
      db.exec(`
        INSERT INTO blog_layouts (post_id, layout_name, block_structure_json)
        VALUES (999999, 'Invalid Layout FK', '{"blocks":[]}');
      `);
    }).toThrow();
  });

  it('4. should cascade delete post_revisions and blog_layouts when parent blog_post is deleted', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('cascade-test-post', 'Cascade Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'cascade-test-post';").get() as { id: number };

    db.exec(`
      INSERT INTO post_revisions (post_id, title, content, revision_number)
      VALUES (${post.id}, 'Rev 1', 'Content 1', 1);

      INSERT INTO blog_layouts (post_id, layout_name, block_structure_json)
      VALUES (${post.id}, 'Layout 1', '{"blocks":[]}');
    `);

    // Delete parent post
    db.exec(`DELETE FROM blog_posts WHERE id = ${post.id};`);

    const revs = db.prepare(`SELECT COUNT(*) as count FROM post_revisions WHERE post_id = ${post.id};`).get() as { count: number };
    const lays = db.prepare(`SELECT COUNT(*) as count FROM blog_layouts WHERE post_id = ${post.id};`).get() as { count: number };

    expect(revs.count).toBe(0);
    expect(lays.count).toBe(0);
  });

  it('5. should enforce UNIQUE(post_id, revision_number) constraint', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('unique-rev-post', 'Unique Rev Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'unique-rev-post';").get() as { id: number };

    db.exec(`
      INSERT INTO post_revisions (post_id, title, content, revision_number)
      VALUES (${post.id}, 'Rev 1', 'Content 1', 1);
    `);

    expect(() => {
      db.exec(`
        INSERT INTO post_revisions (post_id, title, content, revision_number)
        VALUES (${post.id}, 'Rev 1 Duplicate', 'Content Dup', 1);
      `);
    }).toThrow();
  });

  it('6. should enforce maximum one active layout (is_active = 1) per blog post via partial unique index', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('single-active-layout-post', 'Layout Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'single-active-layout-post';").get() as { id: number };

    db.exec(`
      INSERT INTO blog_layouts (post_id, layout_name, block_structure_json, is_active)
      VALUES (${post.id}, 'Active Layout 1', '{"blocks":[1]}', 1);

      INSERT INTO blog_layouts (post_id, layout_name, block_structure_json, is_active)
      VALUES (${post.id}, 'Inactive Layout 2', '{"blocks":[2]}', 0);
    `);

    // Attempt to insert a SECOND active layout (is_active = 1) for the same post_id
    expect(() => {
      db.exec(`
        INSERT INTO blog_layouts (post_id, layout_name, block_structure_json, is_active)
        VALUES (${post.id}, 'Second Active Layout', '{"blocks":[3]}', 1);
      `);
    }).toThrow();
  });

  it('7. should purge oldest revision when creating 11th revision maintaining max 10 revisions limit', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('max-10-rev-post', 'Max Rev Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'max-10-rev-post';").get() as { id: number };

    // Function to add revision with max 10 limit logic in transaction
    const addRevisionWithLimit = (revNum: number, revTitle: string) => {
      db.exec('BEGIN TRANSACTION;');
      db.exec(`
        INSERT INTO post_revisions (post_id, title, content, revision_number)
        VALUES (${post.id}, '${revTitle}', 'Content ${revNum}', ${revNum});
      `);

      const countRes = db.prepare(`SELECT COUNT(*) as cnt FROM post_revisions WHERE post_id = ${post.id};`).get() as { cnt: number };
      if (countRes.cnt > 10) {
        db.exec(`
          DELETE FROM post_revisions 
          WHERE id = (
            SELECT id FROM post_revisions 
            WHERE post_id = ${post.id} 
            ORDER BY revision_number ASC 
            LIMIT 1
          );
        `);
      }
      db.exec('COMMIT;');
    };

    // Insert 11 revisions
    for (let r = 1; r <= 11; r++) {
      addRevisionWithLimit(r, `Revision ${r}`);
    }

    const finalCount = db.prepare(`SELECT COUNT(*) as cnt FROM post_revisions WHERE post_id = ${post.id};`).get() as { cnt: number };
    expect(finalCount.cnt).toBe(10);

    // Oldest revision (revision_number = 1) should be purged
    const rev1 = db.prepare(`SELECT * FROM post_revisions WHERE post_id = ${post.id} AND revision_number = 1;`).get();
    expect(rev1).toBeUndefined();

    // Newest revision (revision_number = 11) exists
    const rev11 = db.prepare(`SELECT * FROM post_revisions WHERE post_id = ${post.id} AND revision_number = 11;`).get();
    expect(rev11).toBeTruthy();
  });

  it('8. should create a new revision when restoring an old revision without overwriting history', () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('restore-rev-post', 'Restore Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'restore-rev-post';").get() as { id: number };

    db.exec(`
      INSERT INTO post_revisions (post_id, title, content, revision_number)
      VALUES (${post.id}, 'Original Title 1', 'Original Content 1', 1);

      INSERT INTO post_revisions (post_id, title, content, revision_number)
      VALUES (${post.id}, 'Updated Title 2', 'Updated Content 2', 2);
    `);

    // Restore revision 1 -> Creates revision 3
    const oldRev = db.prepare(`SELECT * FROM post_revisions WHERE post_id = ${post.id} AND revision_number = 1;`).get() as { title: string; content: string };
    const latestRevNum = (db.prepare(`SELECT MAX(revision_number) as max_rev FROM post_revisions WHERE post_id = ${post.id};`).get() as { max_rev: number }).max_rev;
    const newRevNum = latestRevNum + 1;

    db.exec(`
      INSERT INTO post_revisions (post_id, title, content, revision_number)
      VALUES (${post.id}, '${oldRev.title} (Restored)', '${oldRev.content}', ${newRevNum});
    `);

    const rev3 = db.prepare(`SELECT * FROM post_revisions WHERE post_id = ${post.id} AND revision_number = 3;`).get() as { title: string };
    expect(rev3).toBeTruthy();
    expect(rev3.title).toContain('Original Title 1');

    // Past revision 1 & 2 remain untouched
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM post_revisions WHERE post_id = ${post.id};`).get() as { cnt: number };
    expect(count.cnt).toBe(3);
  });

  it('9. should verify indexes idx_revisions_post_id and idx_blog_layouts_post exist', () => {
    const revIndexes = db.prepare("PRAGMA index_list('post_revisions');").all() as { name: string }[];
    const layIndexes = db.prepare("PRAGMA index_list('blog_layouts');").all() as { name: string }[];

    const revNames = revIndexes.map(i => i.name);
    const layNames = layIndexes.map(i => i.name);

    expect(revNames).toContain('idx_revisions_post_id');
    expect(layNames).toContain('idx_blog_layouts_post');
    expect(layNames).toContain('idx_single_active_layout');
  });

  it('10. should verify blog_layouts updated_at trigger updates timestamp on modification', async () => {
    db.exec(`
      INSERT INTO blog_posts (slug, title_tr, content_tr)
      VALUES ('trigger-layout-post', 'Trigger Post', 'Content');
    `);
    const post = db.prepare("SELECT id FROM blog_posts WHERE slug = 'trigger-layout-post';").get() as { id: number };

    db.exec(`
      INSERT INTO blog_layouts (post_id, layout_name, block_structure_json)
      VALUES (${post.id}, 'Layout Initial', '{"blocks":[]}');
    `);

    const initial = db.prepare(`SELECT updated_at FROM blog_layouts WHERE post_id = ${post.id};`).get() as { updated_at: string };

    await new Promise(res => setTimeout(res, 1100));

    db.exec(`UPDATE blog_layouts SET layout_name = 'Layout Modified' WHERE post_id = ${post.id};`);

    const updated = db.prepare(`SELECT updated_at FROM blog_layouts WHERE post_id = ${post.id};`).get() as { updated_at: string };
    expect(updated.updated_at).not.toBe(initial.updated_at);
  });
});
