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

  // 1. Insert comment into D1
  const insertRes = await ctx.env.DB.prepare(`
    INSERT INTO comments (post_slug, author_name, author_email, comment_text, status)
    VALUES (?, ?, ?, ?, 'PENDING')
  `).bind(payload.postSlug, sanitizedAuthorName, normalizedEmail, sanitizedContent).run();

  const rawId = insertRes.meta?.last_row_id || Date.now();
  const commentId = `c_${rawId}`;

  // 2. Audit log
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

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: [
        {
          id: 'c_1',
          post_slug: 'harika-bir-rehber',
          author_name: 'Mehmet Demir',
          author_email: 'mehmet@example.com',
          comment_text: 'Çok faydalı bir yazı olmuş, teşekkürler!',
          status: 'PENDING',
          created_at: new Date().toISOString()
        }
      ]
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

  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const results = await ctx.env.DB.prepare(sql).bind(...params).all();
  const rows = (results.results || []).map((r: any) => ({
    ...r,
    id: typeof r.id === 'string' && r.id.startsWith('c_') ? r.id : `c_${r.id}`
  }));

  return { status: 200, data: rows };
}

export async function updateCommentStatusService(ctx: RequestContext, commentId: string | number, status: string) {
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    return { status: 400, error: { message: 'Geçersiz yorum durumu.', code: 'INVALID_STATUS' } };
  }

  const numericId = typeof commentId === 'string' && commentId.startsWith('c_')
    ? parseInt(commentId.substring(2), 10)
    : commentId;

  if (ctx.env.DB && typeof ctx.env.DB.prepare === 'function') {
    await ctx.env.DB.prepare(`
      UPDATE comments SET status = ? WHERE id = ? OR id = ?
    `).bind(status, numericId, commentId).run();
  }

  return { status: 200, data: { commentId: `c_${numericId}`, status } };
}
