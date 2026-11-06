-- Migration 0005: CMS & App Catalog Schema (DATA-002)
-- Target Engine: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

-- 1. Blog Channels
CREATE TABLE IF NOT EXISTS blog_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name_tr TEXT NOT NULL,
    name_en TEXT,
    name_ar TEXT,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER REFERENCES blog_channels(id) ON DELETE SET NULL,
    slug TEXT NOT NULL UNIQUE,
    title_tr TEXT NOT NULL,
    title_en TEXT,
    title_ar TEXT,
    content_tr TEXT NOT NULL,
    content_en TEXT,
    content_ar TEXT,
    summary_tr TEXT,
    summary_en TEXT,
    summary_ar TEXT,
    cover_image TEXT,
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED')),
    view_count INTEGER DEFAULT 0,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Mobile/Web Apps Catalog
CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    short_description_tr TEXT,
    short_description_en TEXT,
    icon_url TEXT,
    platform TEXT DEFAULT 'BOTH' CHECK(platform IN ('ANDROID', 'IOS', 'BOTH', 'WEB')),
    is_featured INTEGER DEFAULT 0 CHECK(is_featured IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. App Version Releases
CREATE TABLE IF NOT EXISTS app_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    version_number TEXT NOT NULL,
    release_notes_tr TEXT,
    release_notes_en TEXT,
    apk_url TEXT,
    store_url TEXT,
    is_current INTEGER DEFAULT 1 CHECK(is_current IN (0, 1)),
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Site Announcements & Templates
CREATE TABLE IF NOT EXISTS site_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Media Assets (R2 Reference Metadata)
CREATE TABLE IF NOT EXISTS media_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    public_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Comments -> Blog Posts Foreign Key Relationship
ALTER TABLE comments ADD COLUMN post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE;

-- 8. Indexes Strategy
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
CREATE INDEX IF NOT EXISTS idx_app_versions_app_current ON app_versions(app_id, is_current);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
