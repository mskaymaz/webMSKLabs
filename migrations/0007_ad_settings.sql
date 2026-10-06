-- Migration 0007: Ad Settings Table & Seed Data (DATA-005)
-- Target Engine: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

-- 1. Create ad_settings table
CREATE TABLE IF NOT EXISTS ad_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    is_enabled INTEGER DEFAULT 0 CHECK(is_enabled IN (0, 1)),
    ad_client TEXT,
    ad_slot TEXT,
    preset_size TEXT DEFAULT 'RESPONSIVE',
    custom_width INTEGER,
    custom_height INTEGER,
    margin_top INTEGER DEFAULT 16,
    margin_bottom INTEGER DEFAULT 16,
    is_sticky INTEGER DEFAULT 0 CHECK(is_sticky IN (0, 1)),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Index Strategy for slot_key
CREATE INDEX IF NOT EXISTS idx_ad_slot_key ON ad_settings(slot_key);

-- 3. Automatic updated_at trigger for UPDATE statements
CREATE TRIGGER IF NOT EXISTS trg_ad_settings_updated_at
AFTER UPDATE ON ad_settings
WHEN OLD.updated_at IS NEW.updated_at
BEGIN
    UPDATE ad_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 4. Seed Default 4 Ad Slots (Idempotent with INSERT OR IGNORE)
INSERT OR IGNORE INTO ad_settings (slot_key, title, is_enabled, preset_size, margin_top, margin_bottom, is_sticky) VALUES
('header_banner', 'Header Banner Reklam Alanı', 0, 'RESPONSIVE', 16, 16, 0),
('sidebar_top', 'Yan Menü Üst Reklam Alanı', 0, 'RESPONSIVE', 16, 16, 0),
('post_in_article', 'Yazı İçi Reklam Alanı', 0, 'RESPONSIVE', 16, 16, 0),
('footer_sticky', 'Alt Yapışkan Reklam Alanı', 0, 'RESPONSIVE', 0, 0, 1);
