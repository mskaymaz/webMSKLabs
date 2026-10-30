-- Migration 0014: Vlog Channel and Video URL Support
-- Target Engine: Cloudflare D1 (SQLite)

ALTER TABLE blog_posts ADD COLUMN video_url TEXT;

ALTER TABLE blog_channels ADD COLUMN is_active INTEGER DEFAULT 1;

INSERT OR IGNORE INTO blog_channels (slug, name_tr, name_en, name_ar, icon, is_active)
VALUES ('vlog', 'VLOG', 'VLOG', 'فلوغ', 'video', 0);
