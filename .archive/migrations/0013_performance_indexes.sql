-- PERF-002: D1 Composite Performance Indexes for High-Volume Querying ($0 Cost)

-- 1. Composite Index for Ticket Listing & Filters (status + updated_at)
CREATE INDEX IF NOT EXISTS idx_tickets_status_updated ON tickets(status, updated_at DESC);

-- 2. Composite Index for Ticket Messages Listing (ticket_id + created_at + id)
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created ON ticket_messages(ticket_id, created_at DESC, id DESC);

-- 3. Composite Index for Comments Moderation & Listing (status + created_at + id)
CREATE INDEX IF NOT EXISTS idx_comments_status_created ON comments(status, created_at DESC, id DESC);

-- 4. Composite Index for Published CMS Posts (status + published_at + id)
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at DESC, id DESC);

-- 5. Index for Admin Audit Logs Timeline (created_at + action)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_action ON admin_audit_logs(created_at DESC, action);
