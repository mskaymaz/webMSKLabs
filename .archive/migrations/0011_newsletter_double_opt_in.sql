-- Migration 0011: Double Opt-In Verification Schema for Subscribers (API-003)
-- Target Engine: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

ALTER TABLE subscribers ADD COLUMN verification_token TEXT UNIQUE;
ALTER TABLE subscribers ADD COLUMN verification_expires_at DATETIME;
ALTER TABLE subscribers ADD COLUMN verified_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_subscribers_verification_token ON subscribers(verification_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token);
