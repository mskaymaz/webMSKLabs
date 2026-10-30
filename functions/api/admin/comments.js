/**
 * DevAdmin Blog Comments API
 * GET  /api/admin/comments - List comments with filtering & status
 * POST /api/admin/comments - Approve, Reject & Delete comments
 */

import { jsonResponse, errorResponse } from './_response.js';
import { logAdminAudit } from './_auth.js';

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    const search = url.searchParams.get('q') || '';
    const status = url.searchParams.get('status') || '';
    const postSlug = url.searchParams.get('postSlug') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    if (!env.DB) {
        return errorResponse('Veritabanı bağlantısı bulunamadı.', 500);
    }

    try {
        let whereClauses = [];
        let params = [];

        if (search) {
            whereClauses.push('(author_name LIKE ? OR author_email LIKE ? OR comment_text LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        if (status) {
            whereClauses.push('status = ?');
            params.push(status);
        }

        if (postSlug) {
            whereClauses.push('post_slug = ?');
            params.push(postSlug);
        }

        const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const countStmt = await env.DB.prepare(`
            SELECT COUNT(*) as total FROM comments ${whereSql}
        `).bind(...params).first();

        const commentsStmt = await env.DB.prepare(`
            SELECT * FROM comments
            ${whereSql}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).bind(...params, limit, offset).all();

        return jsonResponse({
            success: true,
            comments: commentsStmt.results || [],
            pagination: {
                total: countStmt ? countStmt.total : 0,
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Admin Comments GET Error:', error);
        return errorResponse('Yorumlar yüklenirken bir hata oluştu.', 500);
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
        const commentId = parseInt(body.id, 10);

        if (!commentId || isNaN(commentId)) {
            return errorResponse('Geçersiz Yorum ID.', 400);
        }

        const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

        // 1. APPROVE COMMENT
        if (action === 'approve') {
            await env.DB.prepare(`
                UPDATE comments SET status = 'APPROVED' WHERE id = ?
            `).bind(commentId).run();

            await logAdminAudit(env, admin.id, 'COMMENT_APPROVED', 'comments', { commentId }, clientIp);
            return jsonResponse({ success: true, message: 'Yorum onaylandı.' });
        }

        // 2. REJECT COMMENT
        if (action === 'reject') {
            await env.DB.prepare(`
                UPDATE comments SET status = 'REJECTED' WHERE id = ?
            `).bind(commentId).run();

            await logAdminAudit(env, admin.id, 'COMMENT_REJECTED', 'comments', { commentId }, clientIp);
            return jsonResponse({ success: true, message: 'Yorum reddedildi.' });
        }

        // 3. DELETE COMMENT
        if (action === 'delete') {
            await env.DB.prepare(`
                DELETE FROM comments WHERE id = ?
            `).bind(commentId).run();

            await logAdminAudit(env, admin.id, 'COMMENT_DELETED', 'comments', { commentId }, clientIp);
            return jsonResponse({ success: true, message: 'Yorum silindi.' });
        }

        return errorResponse('Geçersiz işlem tipi.', 400);
    } catch (error) {
        console.error('Admin Comments POST Error:', error);
        return errorResponse('Yorum işlemi sırasında hata oluştu.', 500);
    }
}
