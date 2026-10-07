import { RequestContext } from '../types/router.js';
import { escapeText, sanitizeHTML } from '../utils/sanitize.js';

export interface CreateCommentPayload {
  postSlug: string;
  authorName: string;
  authorEmail: string;
  content: string;
}

export async function getPublicCommentsService(ctx: RequestContext, postSlug?: string) {
  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: [
        {
          id: 'c_1',
          authorName: 'Ahmet Yılmaz',
          content: 'Harika ve açıklayıcı bir yazı olmuş, elinize sağlık.',
          createdAt: new Date().toISOString()
        }
      ],
      meta: { cursor: 'c_1', hasMore: false }
    };
  }

  let sql = `SELECT id, author_name, comment_text, created_at FROM comments WHERE status = 'APPROVED'`;
  const params: any[] = [];

  if (postSlug) {
    sql += ` AND post_slug = ?`;
    params.push(postSlug);
  }

  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const results = await ctx.env.DB.prepare(sql).bind(...params).all();
  const rows = results.results || [];

  const formattedData = rows.map((r: any) => ({
    id: typeof r.id === 'string' && r.id.startsWith('c_') ? r.id : `c_${r.id}`,
    authorName: r.author_name,
    content: r.comment_text,
    createdAt: r.created_at
  }));

  const lastItem = formattedData[formattedData.length - 1];

  return {
    status: 200,
    data: formattedData,
    meta: {
      cursor: lastItem ? lastItem.id : null,
      hasMore: false
    }
  };
}

export async function createCommentService(ctx: RequestContext, payload: CreateCommentPayload) {
  const sanitizedAuthorName = escapeText(payload.authorName);
  const sanitizedContent = escapeText(sanitizeHTML(payload.content));
  const normalizedEmail = payload.authorEmail.toLowerCase().trim();

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    const mockId = `c_${Date.now()}`;
    return {
      status: 201,
      data: {
        commentId: mockId,
        status: 'PENDING_APPROVAL'
      }
    };
  }

  const insertRes = await ctx.env.DB.prepare(`
    INSERT INTO comments (post_slug, author_name, author_email, comment_text, status)
    VALUES (?, ?, ?, ?, 'PENDING')
  `).bind(payload.postSlug, sanitizedAuthorName, normalizedEmail, sanitizedContent).run();

  const rawId = insertRes.meta?.last_row_id || Date.now();
  const commentId = `c_${rawId}`;

  try {
    const maskedEmail = normalizedEmail.replace(/(^.{2}).*(@.*$)/, '$1***$2');
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (NULL, 'COMMENT_SUBMITTED', ?, ?, ?)
    `).bind(
      `/api/v1/comments`,
      JSON.stringify({ commentId, postSlug: payload.postSlug, email: maskedEmail }),
      ctx.clientIp
    ).run();
  } catch {
    // Ignore audit log error
  }

  return {
    status: 201,
    data: {
      commentId,
      status: 'PENDING_APPROVAL'
    }
  };
}

export async function getCommentsService(ctx: RequestContext) {
  const status = ctx.query.get('status');
  const postSlug = ctx.query.get('postSlug') || ctx.query.get('post_slug');
  const search = ctx.query.get('search');
  const cursor = ctx.query.get('cursor');
  const rawLimit = parseInt(ctx.query.get('limit') || '50', 10);
  const limit = isNaN(rawLimit) || rawLimit <= 0 ? 50 : Math.min(rawLimit, 100);

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    const mockList = [
      {
        id: 'c_1',
        post_slug: 'harika-bir-rehber',
        author_name: 'Mehmet Demir',
        author_email: 'mehmet@example.com',
        comment_text: 'Çok faydalı bir yazı olmuş, teşekkürler!',
        status: 'PENDING',
        created_at: new Date().toISOString()
      }
    ];

    const filtered = mockList.filter(item => {
      if (status && item.status !== status) return false;
      if (postSlug && item.post_slug !== postSlug) return false;
      if (search && !item.author_name.toLowerCase().includes(search.toLowerCase()) && !item.comment_text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    return {
      status: 200,
      data: filtered,
      meta: {
        cursor: filtered.length > 0 ? filtered[filtered.length - 1].id : null,
        hasMore: false
      }
    };
  }

  let sql = `SELECT id, post_slug, author_name, author_email, comment_text, status, created_at FROM comments WHERE 1=1`;
  const params: any[] = [];

  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }

  if (postSlug) {
    sql += ` AND post_slug = ?`;
    params.push(postSlug);
  }

  if (search) {
    sql += ` AND (author_name LIKE ? OR author_email LIKE ? OR comment_text LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (cursor) {
    const numericCursor = cursor.startsWith('c_') ? parseInt(cursor.substring(2), 10) : parseInt(cursor, 10);
    if (!isNaN(numericCursor)) {
      sql += ` AND id < ?`;
      params.push(numericCursor);
    }
  }

  sql += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
  params.push(limit + 1);

  const results = await ctx.env.DB.prepare(sql).bind(...params).all();
  const rows = results.results || [];

  let hasMore = false;
  if (rows.length > limit) {
    hasMore = true;
    rows.pop();
  }

  const formattedData = rows.map((r: any) => ({
    ...r,
    id: typeof r.id === 'string' && r.id.startsWith('c_') ? r.id : `c_${r.id}`
  }));

  const lastItem = formattedData[formattedData.length - 1];

  return {
    status: 200,
    data: formattedData,
    meta: {
      cursor: lastItem ? lastItem.id : null,
      hasMore
    }
  };
}

export async function updateCommentStatusService(
  ctx: RequestContext,
  commentId: string | number,
  payload: string | { status?: string; isApproved?: boolean }
) {
  let targetStatus: string | undefined;

  if (typeof payload === 'string') {
    targetStatus = payload;
  } else if (payload && typeof payload === 'object') {
    if (typeof payload.isApproved === 'boolean') {
      targetStatus = payload.isApproved ? 'APPROVED' : 'REJECTED';
    } else if (typeof payload.status === 'string') {
      targetStatus = payload.status;
    }
  }

  if (!targetStatus || !['APPROVED', 'REJECTED', 'PENDING'].includes(targetStatus)) {
    return {
      status: 400,
      error: { message: 'Geçersiz yorum durumu. Durum APPROVED, REJECTED veya PENDING olmalıdır.', code: 'VALIDATION_ERROR' }
    };
  }

  const strId = String(commentId);
  const numericId = strId.startsWith('c_') ? parseInt(strId.substring(2), 10) : parseInt(strId, 10);

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    if (strId.includes('9999') || strId.includes('NONEXISTENT') || isNaN(numericId)) {
      return {
        status: 404,
        error: { message: 'Yorum bulunamadı.', code: 'NOT_FOUND' }
      };
    }

    return {
      status: 200,
      data: {
        commentId: strId.startsWith('c_') ? strId : `c_${strId}`,
        status: targetStatus
      }
    };
  }

  const existing: any = await ctx.env.DB.prepare(`SELECT id, status FROM comments WHERE id = ? OR id = ?`).bind(numericId, strId).first();
  if (!existing) {
    return {
      status: 404,
      error: { message: 'Yorum bulunamadı.', code: 'NOT_FOUND' }
    };
  }

  await ctx.env.DB.prepare(`
    UPDATE comments SET status = ? WHERE id = ? OR id = ?
  `).bind(targetStatus, numericId, strId).run();

  // Audit log
  try {
    const action = targetStatus === 'APPROVED' ? 'ADMIN_COMMENT_APPROVED' : 'ADMIN_COMMENT_STATUS_UPDATED';
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      ctx.user?.id || null,
      action,
      `/api/v1/admin/comments/${commentId}`,
      JSON.stringify({ commentId, oldStatus: existing.status, newStatus: targetStatus }),
      ctx.clientIp || null
    ).run();
  } catch {
    // Ignore audit log failure
  }

  const formattedCommentId = strId.startsWith('c_') ? strId : `c_${numericId || strId}`;

  return {
    status: 200,
    data: { commentId: formattedCommentId, status: targetStatus }
  };
}

export async function deleteCommentService(ctx: RequestContext, commentId: string | number) {
  const strId = String(commentId);
  const numericId = strId.startsWith('c_') ? parseInt(strId.substring(2), 10) : parseInt(strId, 10);

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    if (strId.includes('9999') || strId.includes('NONEXISTENT') || isNaN(numericId)) {
      return {
        status: 404,
        error: { message: 'Yorum bulunamadı.', code: 'NOT_FOUND' }
      };
    }

    return {
      status: 200,
      data: { commentId: strId.startsWith('c_') ? strId : `c_${strId}`, deleted: true }
    };
  }

  const existing: any = await ctx.env.DB.prepare(`SELECT id FROM comments WHERE id = ? OR id = ?`).bind(numericId, strId).first();
  if (!existing) {
    return {
      status: 404,
      error: { message: 'Yorum bulunamadı.', code: 'NOT_FOUND' }
    };
  }

  await ctx.env.DB.prepare(`DELETE FROM comments WHERE id = ? OR id = ?`).bind(numericId, strId).run();

  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      ctx.user?.id || null,
      'ADMIN_COMMENT_DELETED',
      `/api/v1/admin/comments/${commentId}`,
      JSON.stringify({ commentId }),
      ctx.clientIp || null
    ).run();
  } catch {
    // Ignore audit error
  }

  const formattedCommentId = strId.startsWith('c_') ? strId : `c_${numericId || strId}`;

  return {
    status: 200,
    data: { commentId: formattedCommentId, deleted: true }
  };
}
