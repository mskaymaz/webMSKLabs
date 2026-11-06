-- Migration 0004: Add Broadcasts Table for Mass Communication
-- Target Engine: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS broadcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    content_html TEXT NOT NULL,
    target_segment TEXT DEFAULT 'ALL',
    total_recipients INTEGER DEFAULT 0,
    status TEXT DEFAULT 'QUEUED' CHECK(status IN ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status, created_at DESC);
