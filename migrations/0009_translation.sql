-- Migration 0009: Translation Cache & Glossary Schema (DATA-007)
-- Target Engine: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

-- 1. Create translation_cache table
CREATE TABLE IF NOT EXISTS translation_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_hash TEXT NOT NULL UNIQUE,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    provider TEXT DEFAULT 'GEMINI',
    quality_score REAL DEFAULT 1.0 CHECK(quality_score >= 0.0 AND quality_score <= 1.0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create glossary table
CREATE TABLE IF NOT EXISTS glossary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_term TEXT NOT NULL,
    target_term TEXT NOT NULL,
    source_lang TEXT DEFAULT 'TR',
    target_lang DEFAULT 'EN',
    category TEXT DEFAULT 'TECHNICAL',
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_term, source_lang, target_lang)
);

-- 3. Glossary Lookup Index
CREATE INDEX IF NOT EXISTS idx_glossary_lookup ON glossary(source_lang, target_lang, is_active);
