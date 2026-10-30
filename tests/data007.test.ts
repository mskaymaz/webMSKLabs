import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { generateTranslationSourceHash } from '../src/utils/crypto.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

describe('DATA-007 — Translation Cache & Glossary D1 Database Schema & Hash Logic Tests', () => {
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
      '0009_translation.sql'
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

  it('1. Same content (source_lang, target_lang, source_text) generates identical source_hash', () => {
    const hash1 = generateTranslationSourceHash('tr', 'en', 'Merhaba Dünya');
    const hash2 = generateTranslationSourceHash('tr', 'en', 'Merhaba Dünya');
    expect(hash1).toBe(hash2);
  });

  it('2. Different source_lang generates different source_hash', () => {
    const hashTR = generateTranslationSourceHash('tr', 'en', 'Merhaba');
    const hashDE = generateTranslationSourceHash('de', 'en', 'Merhaba');
    expect(hashTR).not.toBe(hashDE);
  });

  it('3. Different target_lang generates different source_hash', () => {
    const hashEN = generateTranslationSourceHash('tr', 'en', 'Merhaba');
    const hashES = generateTranslationSourceHash('tr', 'es', 'Merhaba');
    expect(hashEN).not.toBe(hashES);
  });

  it('4. Normalization resilience (whitespace/line-ending differences produce identical canonical source_hash)', () => {
    const hashBase = generateTranslationSourceHash('tr', 'en', 'Merhaba Dünya');
    const hashPadded = generateTranslationSourceHash(' TR ', ' EN ', '  Merhaba   Dünya  \r\n');
    expect(hashPadded).toBe(hashBase);
  });

  it('5. source_hash UNIQUE constraint (duplicate insert rejected)', () => {
    const hash = generateTranslationSourceHash('tr', 'en', 'Unique Test Text');

    db.exec(`
      INSERT INTO translation_cache (source_hash, source_lang, target_lang, source_text, translated_text, provider, quality_score)
      VALUES ('${hash}', 'tr', 'en', 'Unique Test Text', 'Unique Test Text EN', 'GEMINI', 1.0);
    `);

    expect(() => {
      db.exec(`
        INSERT INTO translation_cache (source_hash, source_lang, target_lang, source_text, translated_text, provider, quality_score)
        VALUES ('${hash}', 'tr', 'en', 'Unique Test Text', 'Duplicate Entry', 'GEMINI', 0.9);
      `);
    }).toThrow();
  });

  it('6. quality_score CHECK validation (0.0, 1.0, 0.5 pass; -0.1, 1.1 rejected)', () => {
    const hash1 = generateTranslationSourceHash('tr', 'en', 'Score Test 1');
    const hash2 = generateTranslationSourceHash('tr', 'en', 'Score Test 2');
    const hash3 = generateTranslationSourceHash('tr', 'en', 'Score Test 3');

    // Valid scores: 0.0, 1.0, 0.5
    db.exec(`
      INSERT INTO translation_cache (source_hash, source_lang, target_lang, source_text, translated_text, quality_score)
      VALUES ('${hash1}', 'tr', 'en', 'Score Test 1', 'Trans 1', 0.0);

      INSERT INTO translation_cache (source_hash, source_lang, target_lang, source_text, translated_text, quality_score)
      VALUES ('${hash2}', 'tr', 'en', 'Score Test 2', 'Trans 2', 1.0);

      INSERT INTO translation_cache (source_hash, source_lang, target_lang, source_text, translated_text, quality_score)
      VALUES ('${hash3}', 'tr', 'en', 'Score Test 3', 'Trans 3', 0.5);
    `);

    // Invalid score < 0.0
    expect(() => {
      db.exec(`
        INSERT INTO translation_cache (source_hash, source_lang, target_lang, source_text, translated_text, quality_score)
        VALUES ('invalid_low_hash', 'tr', 'en', 'Invalid Low', 'Trans', -0.1);
      `);
    }).toThrow();

    // Invalid score > 1.0
    expect(() => {
      db.exec(`
        INSERT INTO translation_cache (source_hash, source_lang, target_lang, source_text, translated_text, quality_score)
        VALUES ('invalid_high_hash', 'tr', 'en', 'Invalid High', 'Trans', 1.1);
      `);
    }).toThrow();
  });

  it('7. Glossary UNIQUE constraint (source_term + source_lang + target_lang duplicate rejected)', () => {
    db.exec(`
      INSERT INTO glossary (source_term, target_term, source_lang, target_lang, category)
      VALUES ('Yapay Zeka', 'Artificial Intelligence', 'TR', 'EN', 'TECHNICAL');
    `);

    expect(() => {
      db.exec(`
        INSERT INTO glossary (source_term, target_term, source_lang, target_lang, category)
        VALUES ('Yapay Zeka', 'AI', 'TR', 'EN', 'GENERAL');
      `);
    }).toThrow();

    // Different target_lang should pass
    db.exec(`
      INSERT INTO glossary (source_term, target_term, source_lang, target_lang, category)
      VALUES ('Yapay Zeka', 'Inteligencia Artificial', 'TR', 'ES', 'TECHNICAL');
    `);
    const count = db.prepare("SELECT COUNT(*) as count FROM glossary WHERE source_term = 'Yapay Zeka';").get() as { count: number };
    expect(count.count).toBe(2);
  });

  it('8. Glossary is_active CHECK constraint (0 and 1 pass, invalid rejected)', () => {
    db.exec(`
      INSERT INTO glossary (source_term, target_term, source_lang, target_lang, is_active)
      VALUES ('Term 1', 'Target 1', 'TR', 'EN', 1);

      INSERT INTO glossary (source_term, target_term, source_lang, target_lang, is_active)
      VALUES ('Term 2', 'Target 2', 'TR', 'EN', 0);
    `);

    expect(() => {
      db.exec(`
        INSERT INTO glossary (source_term, target_term, source_lang, target_lang, is_active)
        VALUES ('Term Invalid', 'Target Invalid', 'TR', 'EN', 2);
      `);
    }).toThrow();
  });

  it('9. Glossary index check (PRAGMA index_list)', () => {
    const indexes = db.prepare("PRAGMA index_list('glossary');").all() as any[];
    const lookupIdx = indexes.find((idx: any) => idx.name === 'idx_glossary_lookup');
    expect(lookupIdx).toBeTruthy();
  });

  it('10. Foreign key integrity check (PRAGMA foreign_key_check returns 0 errors)', () => {
    const fkErrors = db.prepare('PRAGMA foreign_key_check;').all();
    expect(fkErrors).toHaveLength(0);
  });
});
