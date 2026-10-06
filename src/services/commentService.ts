import { RequestContext } from '../types/router.js';

export async function getCommentsService(ctx: RequestContext) {
  const status = ctx.query.get('status');

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: [
        {
          id: 1,
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

  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const results = await ctx.env.DB.prepare(sql).bind(...params).all();
  return { status: 200, data: results.results || [] };
}

export async function updateCommentStatusService(ctx: RequestContext, commentId: string | number, status: string) {
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    return { status: 400, error: { message: 'Geçersiz yorum durumu.', code: 'INVALID_STATUS' } };
  }

  if (ctx.env.DB && typeof ctx.env.DB.prepare === 'function') {
    await ctx.env.DB.prepare(`
      UPDATE comments SET status = ? WHERE id = ?
    `).bind(status, commentId).run();
  }

  return { status: 200, data: { commentId, status } };
}
