-- Seed realistic support tickets and comments for local DevAdmin testing

-- 1. Support Tickets
INSERT OR IGNORE INTO messages (id, name, email, subject, message, status, urgency, category, created_at)
VALUES 
('MSK-2026-0001', 'Ahmet Yılmaz', 'ahmet@example.com', 'TTS Ses Oynatıcı Hatası', 'TTS ses dosyaları mobil Safari tarayıcısında oynatılamıyor. İlgili hatayı inceleyebilir misiniz?', 'NEW', 'HIGH', 'TECHNICAL', '2026-10-06 08:30:00'),
('MSK-2026-0002', 'Ayşe Demir', 'ayse@example.com', 'Abonelik İptal Talebi', 'Bülten aboneliğimi iptal etmek istiyorum.', 'IN_PROGRESS', 'NORMAL', 'GENERAL', '2026-10-05 14:20:00'),
('MSK-2026-0003', 'Mehmet Kaya', 'mehmet@example.com', 'İş Birliği Ve Reklam', 'Web sitenizde reklam vermek istiyoruz, medya kitinizi iletir misiniz?', 'RESOLVED', 'LOW', 'BUSINESS', '2026-10-04 11:00:00');

-- 2. Message Events & Initial Replies
INSERT OR IGNORE INTO message_events (id, message_id, event_type, actor, metadata, created_at)
VALUES 
(1, 'MSK-2026-0001', 'CREATED', 'USER', '{"ip": "192.168.1.50"}', '2026-10-06 08:30:00'),
(2, 'MSK-2026-0002', 'STATUS_CHANGE', 'admin', '{"new_status": "IN_PROGRESS"}', '2026-10-05 15:00:00');

INSERT OR IGNORE INTO replies (id, message_id, sender_type, reply_text, created_at)
VALUES 
(1, 'MSK-2026-0003', 'ADMIN', 'Merhaba Mehmet Bey, medya kitimiz e-posta adresinize gönderilmiştir.', '2026-10-04 12:30:00');

-- 3. Blog Comments
INSERT OR IGNORE INTO comments (id, post_slug, author_name, author_email, comment_text, status, created_at)
VALUES 
(1, 'cloudflare-d1-rehberi', 'Fatma Şahin', 'fatma@example.com', 'Harika bir D1 veritabanı rehberi olmuş, ellerinize sağlık!', 'PENDING', '2026-10-06 09:15:00'),
(2, 'serverless-edge-architecture', 'Ali Öztürk', 'ali@example.com', 'Cloudflare Workers cold-start süreleri harika anlatılmış.', 'APPROVED', '2026-10-05 10:00:00'),
(3, 'web-security-best-practices', 'Spam User', 'spam@badbot.com', 'Buy cheap products at http://spam.com', 'REJECTED', '2026-10-04 16:45:00');
