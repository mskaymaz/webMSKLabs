/**
 * DevAdmin Support Messages / Tickets API
 * GET  /api/admin/messages - List tickets with filtering, search & detail view
 * POST /api/admin/messages - Status updates & Admin replies
 */

import { jsonResponse, errorResponse } from './_response.js';
import { validatePayload, escapeText, sanitizeHtml } from './_sanitize.js';
import { logAdminAudit } from './_auth.js';

export async function onRequestGet(context) {
    const { request, env, data } = context;
    const admin = data.admin;
    const url = new URL(request.url);

    const ticketId = url.searchParams.get('id');
    const search = url.searchParams.get('q') || '';
    const status = url.searchParams.get('status') || '';
    const urgency = url.searchParams.get('urgency') || '';
    const category = url.searchParams.get('category') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    if (!env.DB) {
        return errorResponse('Veritabanı bağlantısı bulunamadı.', 500);
    }

    try {
        // Fetch single ticket details + replies + events if ID is provided
        if (ticketId) {
            const ticket = await env.DB.prepare(`
                SELECT * FROM messages WHERE id = ? LIMIT 1
            `).bind(ticketId).first();

            if (!ticket) {
                return errorResponse('Bilet bulunamadı.', 404);
            }

            const replies = await env.DB.prepare(`
                SELECT * FROM replies WHERE message_id = ? ORDER BY created_at ASC
            `).bind(ticketId).all();

            const events = await env.DB.prepare(`
                SELECT * FROM message_events WHERE message_id = ? ORDER BY created_at DESC
            `).bind(ticketId).all();

            return jsonResponse({
                success: true,
                ticket,
                replies: replies.results || [],
                events: events.results || []
            });
        }

        // List tickets with dynamic filters
        let whereClauses = [];
        let params = [];

        if (search) {
            whereClauses.push('(id LIKE ? OR subject LIKE ? OR name LIKE ? OR email LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        if (status) {
            whereClauses.push('status = ?');
            params.push(status);
        }

        if (urgency) {
            whereClauses.push('urgency = ?');
            params.push(urgency);
        }

        if (category) {
            whereClauses.push('category = ?');
            params.push(category);
        }

        const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const countStmt = await env.DB.prepare(`
            SELECT COUNT(*) as total FROM messages ${whereSql}
        `).bind(...params).first();

        const ticketsStmt = await env.DB.prepare(`
            SELECT id, name, email, subject, status, urgency, category, created_at, updated_at
            FROM messages
            ${whereSql}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).bind(...params, limit, offset).all();

        return jsonResponse({
            success: true,
            tickets: ticketsStmt.results || [],
            pagination: {
                total: countStmt ? countStmt.total : 0,
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Admin Messages GET Error:', error);
        return errorResponse('Biletler yüklenirken bir hata oluştu.', 500);
    }
}

export async function onRequestPost(context) {
    const { request, env, data } = context;
    const admin = data.admin;

    if (!env.DB) {
        return errorResponse('Veritabanı bağlantısı bulunamadı.', 500);
    }

    try {
        const body = await request.json();
        const action = body.action || '';
        const ticketId = body.id || '';

        if (!ticketId) {
            return errorResponse('Bilet ID zorunludur.', 400);
        }

        const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

        // 1. UPDATE STATUS ACTION
        if (action === 'update_status') {
            const newStatus = body.status;
            const validStatuses = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM', 'CLOSED'];

            if (!validStatuses.includes(newStatus)) {
                return errorResponse('Geçersiz bilet durumu.', 400);
            }

            await env.DB.prepare(`
                UPDATE messages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(newStatus, ticketId).run();

            await env.DB.prepare(`
                INSERT INTO message_events (message_id, event_type, actor, metadata)
                VALUES (?, 'STATUS_CHANGE', ?, ?)
            `).bind(ticketId, admin.username, JSON.stringify({ new_status: newStatus })).run();

            await logAdminAudit(env, admin.id, 'TICKET_STATUS_UPDATE', 'messages', { ticketId, newStatus }, clientIp);

            return jsonResponse({
                success: true,
                message: 'Bilet durumu güncellendi.',
                status: newStatus
            });
        }

        // 2. REPLY ACTION
        if (action === 'reply') {
            const replyText = sanitizeHtml(body.reply_text || '');
            if (!replyText || replyText.length < 3) {
                return errorResponse('Yanıt metni en az 3 karakter olmalıdır.', 400);
            }

            await env.DB.prepare(`
                INSERT INTO replies (message_id, sender_type, reply_text)
                VALUES (?, 'ADMIN', ?)
            `).bind(ticketId, replyText).run();

            const targetStatus = body.status || 'RESOLVED';
            await env.DB.prepare(`
                UPDATE messages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(targetStatus, ticketId).run();

            await env.DB.prepare(`
                INSERT INTO message_events (message_id, event_type, actor, metadata)
                VALUES (?, 'REPLIED', ?, ?)
            `).bind(ticketId, admin.username, JSON.stringify({ reply_length: replyText.length })).run();

            await logAdminAudit(env, admin.id, 'TICKET_REPLIED', 'messages', { ticketId, status: targetStatus }, clientIp);

            return jsonResponse({
                success: true,
                message: 'Yanıt başarıyla gönderildi ve kaydedildi.',
                status: targetStatus
            });
        }

        return errorResponse('Geçersiz işlem tipi.', 400);
    } catch (error) {
        console.error('Admin Messages POST Error:', error);
        return errorResponse('İşlem sırasında bir hata oluştu.', 500);
    }
}
