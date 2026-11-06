-- Migration 0012: Observability & System Logs Schema
-- Target Engine: Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

-- 1. System Logs Table (Application Errors & System Diagnostics)
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL CHECK(level IN ('INFO', 'WARN', 'ERROR', 'FATAL')),
    message TEXT NOT NULL,
    correlation_id TEXT,
    error_stack TEXT,
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes Strategy for Observability Queries
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_correlation ON system_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_message_events_msg_created ON message_events(message_id, created_at DESC);
