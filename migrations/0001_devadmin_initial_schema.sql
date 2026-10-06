-- Migration 0001: DevAdmin & MSKLabs Foundation Schema
-- Target Engine: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

-- 1. Admins & Authentication
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'SUPER_ADMIN' CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'SUPPORT')),
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details_json TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Support Tickets & Messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, -- Ticket No (e.g. MSK-2026-0001)
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'NEW' CHECK(status IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM', 'CLOSED')),
    urgency TEXT DEFAULT 'NORMAL' CHECK(urgency IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
    category TEXT DEFAULT 'GENERAL',
    ai_summary TEXT,
    ai_draft TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor TEXT DEFAULT 'SYSTEM',
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK(sender_type IN ('ADMIN', 'USER')),
    reply_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Comments, Subscribers & Email Queue
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_slug TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    unsubscribe_token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriber_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    is_subscribed INTEGER DEFAULT 1 CHECK(is_subscribed IN (0, 1)),
    UNIQUE(subscriber_id, category)
);

CREATE TABLE IF NOT EXISTS email_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME
);

CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    discount_amount REAL NOT NULL,
    discount_percent REAL,
    discount_type TEXT DEFAULT 'PERCENTAGE' CHECK(discount_type IN ('PERCENTAGE', 'FIXED')),
    max_uses INTEGER DEFAULT 100,
    current_uses INTEGER DEFAULT 0,
    assigned_email TEXT,
    is_used INTEGER DEFAULT 0 CHECK(is_used IN (0, 1)),
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. CMS & Media Metadata
CREATE TABLE IF NOT EXISTS blog_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name_tr TEXT NOT NULL,
    name_en TEXT,
    name_ar TEXT,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS post_audio_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    language TEXT NOT NULL CHECK(language IN ('TR', 'EN', 'AR')),
    article_version INTEGER NOT NULL,
    audio_version INTEGER NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    r2_object_key TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('GENERATING', 'DRAFT', 'APPROVED', 'FAILED', 'STALE')),
    validation_result_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, language, audio_version)
);

-- 5. Indexes Strategy
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_audio_post_lang ON post_audio_assets(post_id, language, status);
