-- Migration 0008: Blog Layouts & Revisions Schema (DATA-006)
-- Target Engine: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

-- 1. Create post_revisions table
CREATE TABLE IF NOT EXISTS post_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    snapshot_json TEXT,
    revision_number INTEGER NOT NULL,
    created_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, revision_number)
);

-- 2. Create blog_layouts table
CREATE TABLE IF NOT EXISTS blog_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    layout_name TEXT NOT NULL,
    block_structure_json TEXT NOT NULL,
    theme_config_json TEXT,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Partial Unique Index: Maximum one active layout (is_active = 1) per blog post
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_layout ON blog_layouts(post_id) WHERE is_active = 1;

-- 4. Indexes Strategy
CREATE INDEX IF NOT EXISTS idx_revisions_post_id ON post_revisions(post_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_blog_layouts_post ON blog_layouts(post_id);

-- 5. Automatic updated_at trigger for blog_layouts UPDATE
CREATE TRIGGER IF NOT EXISTS trg_blog_layouts_updated_at
AFTER UPDATE ON blog_layouts
WHEN OLD.updated_at IS NEW.updated_at
BEGIN
    UPDATE blog_layouts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
