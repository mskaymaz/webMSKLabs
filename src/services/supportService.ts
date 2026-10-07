import { RequestContext } from '../types/router.js';

export async function getSupportTicketsService(ctx: RequestContext) {
  const status = ctx.query.get('status');
  const urgency = ctx.query.get('urgency');
  const search = ctx.query.get('search');

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: [
        {
          id: 'MSK-2026-0001',
          name: 'Ahmet Yılmaz',
          email: 'ahmet@example.com',
          subject: 'Giriş Sorunu',
          message: 'Hesabıma giriş yaparken şifre sıfırlama e-postası gelmiyor.',
          status: 'NEW',
          urgency: 'HIGH',
          created_at: new Date().toISOString()
        }
      ]
    };
  }

  let sql = `SELECT id, name, email, subject, message, status, urgency, category, created_at FROM messages WHERE 1=1`;
  const params: any[] = [];

  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (urgency) {
    sql += ` AND urgency = ?`;
    params.push(urgency);
  }
  if (search) {
    sql += ` AND (id LIKE ? OR name LIKE ? OR email LIKE ? OR subject LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const results = await ctx.env.DB.prepare(sql).bind(...params).all();
  return { status: 200, data: results.results || [] };
}

export async function replySupportTicketService(ctx: RequestContext, ticketId: string, replyText: string) {
  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return { status: 200, data: { ticketId, replyText, status: 'REPLIED' } };
  }

  await ctx.env.DB.prepare(`
    INSERT INTO replies (message_id, sender_type, reply_text)
    VALUES (?, 'ADMIN', ?)
  `).bind(ticketId, replyText).run();

  await ctx.env.DB.prepare(`
    UPDATE messages SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(ticketId).run();

  return { status: 200, data: { ticketId, status: 'IN_PROGRESS' } };
}

export async function createPublicSupportTicketService(
  ctx: RequestContext,
  payload: { name: string; email: string; subject: string; message: string; category?: string }
) {
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const ticketId = `MSK-2026-${randNum}`;

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 201,
      data: {
        ticketId,
        name: payload.name,
        email: payload.email,
        subject: payload.subject,
        status: 'NEW',
        message: 'Destek talebiniz alındı.'
      }
    };
  }

  await ctx.env.DB.prepare(`
    INSERT INTO messages (id, name, email, subject, message, category, status, urgency)
    VALUES (?, ?, ?, ?, ?, ?, 'NEW', 'NORMAL')
  `).bind(
    ticketId,
    payload.name,
    payload.email,
    payload.subject,
    payload.message,
    payload.category || 'GENERAL'
  ).run();

  return {
    status: 201,
    data: {
      ticketId,
      name: payload.name,
      email: payload.email,
      subject: payload.subject,
      status: 'NEW'
    }
  };
}
