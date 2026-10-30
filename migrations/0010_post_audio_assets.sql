-- Migration 0010: TTS Audio Metadata Schema (DATA-TTS-001)
-- Target Engine: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

-- 1. Re-create post_audio_assets table with complete schema constraints
DROP TABLE IF EXISTS post_audio_assets;

CREATE TABLE IF NOT EXISTS post_audio_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    language TEXT NOT NULL CHECK(language IN ('TR', 'EN', 'AR')),
    article_version INTEGER NOT NULL,
    audio_version INTEGER NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    r2_object_key TEXT NOT NULL UNIQUE,
    file_size INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('GENERATING', 'DRAFT', 'APPROVED', 'FAILED', 'STALE')),
    validation_result_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, language, audio_version)
);

-- 2. Indexes Strategy
CREATE INDEX IF NOT EXISTS idx_audio_post_lang_status ON post_audio_assets(post_id, language, status);
CREATE INDEX IF NOT EXISTS idx_audio_version_check ON post_audio_assets(post_id, article_version, audio_version);

-- 3. Automatic updated_at trigger for post_audio_assets UPDATE
CREATE TRIGGER IF NOT EXISTS trg_post_audio_assets_updated_at
AFTER UPDATE ON post_audio_assets
WHEN OLD.updated_at IS NEW.updated_at
BEGIN
    UPDATE post_audio_assets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
