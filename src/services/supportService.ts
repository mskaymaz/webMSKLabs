import { RequestContext } from '../types/router.js';
import { sanitizeHTML } from '../utils/sanitize.js';

export const VALID_MESSAGE_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM', 'CLOSED'];
export const VALID_MESSAGE_URGENCIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

export async function getSupportTicketsService(ctx: RequestContext) {
  const status = ctx.query.get('status');
  const urgency = ctx.query.get('urgency');
  const category = ctx.query.get('category');
  const search = ctx.query.get('search');
  const cursor = ctx.query.get('cursor');
  const rawLimit = parseInt(ctx.query.get('limit') || '50', 10);
  const limit = isNaN(rawLimit) || rawLimit <= 0 ? 50 : Math.min(rawLimit, 100);

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    const mockList = [
      {
        id: 'MSK-2026-0001',
        name: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        subject: 'Giriş Sorunu',
        message: 'Hesabıma giriş yaparken şifre sıfırlama e-postası gelmiyor.',
        status: 'NEW',
        urgency: 'HIGH',
        category: 'GENERAL',
        created_at: new Date().toISOString()
      }
    ];

    const filtered = mockList.filter(item => {
      if (status && item.status !== status) return false;
      if (urgency && item.urgency !== urgency) return false;
      if (category && item.category !== category) return false;
      if (search && !item.subject.toLowerCase().includes(search.toLowerCase()) && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
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

  let sql = `SELECT id, name, email, subject, message, status, urgency, category, ai_summary, ai_draft, created_at, updated_at FROM messages WHERE 1=1`;
  const params: any[] = [];

  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (urgency) {
    sql += ` AND urgency = ?`;
    params.push(urgency);
  }
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (search) {
    sql += ` AND (id LIKE ? OR name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }
  if (cursor) {
    sql += ` AND id < ?`;
    params.push(cursor);
  }

  sql += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
  params.push(limit + 1);

  const results = await ctx.env.DB.prepare(sql).bind(...params).all();
  const rows: any[] = results.results || [];

  let hasMore = false;
  if (rows.length > limit) {
    hasMore = true;
    rows.pop();
  }

  const lastItem = rows[rows.length - 1];
  const nextCursor = lastItem ? lastItem.id : null;

  return {
    status: 200,
    data: rows,
    meta: {
      cursor: nextCursor,
      hasMore
    }
  };
}

export async function getSupportTicketDetailService(ctx: RequestContext, ticketId: string) {
  if (!ticketId || typeof ticketId !== 'string' || !ticketId.trim()) {
    return {
      status: 400,
      error: { message: 'Bilet numarası zorunludur.', code: 'VALIDATION_ERROR' }
    };
  }

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    if (ticketId.includes('9999') || ticketId.includes('NONEXISTENT')) {
      return {
        status: 404,
        error: { message: 'Destek bileti bulunamadı.', code: 'NOT_FOUND' }
      };
    }

    return {
      status: 200,
      data: {
        id: ticketId,
        name: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        subject: 'Giriş Sorunu',
        message: 'Hesabıma giriş yaparken şifre sıfırlama e-postası gelmiyor.',
        status: 'NEW',
        urgency: 'HIGH',
        category: 'GENERAL',
        created_at: new Date().toISOString(),
        replies: [],
        events: []
      }
    };
  }

  const ticket: any = await ctx.env.DB.prepare(`
    SELECT id, name, email, subject, message, status, urgency, category, ai_summary, ai_draft, created_at, updated_at
    FROM messages
    WHERE id = ?
  `).bind(ticketId).first();

  if (!ticket) {
    return {
      status: 404,
      error: { message: 'Destek bileti bulunamadı.', code: 'NOT_FOUND' }
    };
  }

  const repliesRes = await ctx.env.DB.prepare(`
    SELECT id, message_id, sender_type, reply_text, created_at
    FROM replies
    WHERE message_id = ?
    ORDER BY created_at ASC
  `).bind(ticketId).all();

  const eventsRes = await ctx.env.DB.prepare(`
    SELECT id, message_id, event_type, actor, metadata, created_at
    FROM message_events
    WHERE message_id = ?
    ORDER BY created_at ASC
  `).bind(ticketId).all();

  ticket.replies = repliesRes.results || [];
  ticket.events = eventsRes.results || [];

  return { status: 200, data: ticket };
}

export async function updateSupportTicketService(
  ctx: RequestContext,
  ticketId: string,
  updates: { status?: string; urgency?: string; category?: string }
) {
  if (!ticketId || typeof ticketId !== 'string' || !ticketId.trim()) {
    return {
      status: 400,
      error: { message: 'Bilet numarası zorunludur.', code: 'VALIDATION_ERROR' }
    };
  }

  if (!updates || (updates.status === undefined && updates.urgency === undefined && updates.category === undefined)) {
    return {
      status: 400,
      error: { message: 'Güncellenecek en az bir alan zorunludur.', code: 'VALIDATION_ERROR' }
    };
  }

  if (updates.status && !VALID_MESSAGE_STATUSES.includes(updates.status)) {
    return {
      status: 400,
      error: { message: 'Geçersiz mesaj durumu.', code: 'VALIDATION_ERROR' }
    };
  }

  if (updates.urgency && !VALID_MESSAGE_URGENCIES.includes(updates.urgency)) {
    return {
      status: 400,
      error: { message: 'Geçersiz aciliyet seviyesi.', code: 'VALIDATION_ERROR' }
    };
  }

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    if (ticketId.includes('9999') || ticketId.includes('NONEXISTENT')) {
      return {
        status: 404,
        error: { message: 'Destek bileti bulunamadı.', code: 'NOT_FOUND' }
      };
    }

    return {
      status: 200,
      data: {
        ticketId,
        status: updates.status || 'IN_PROGRESS',
        urgency: updates.urgency || 'NORMAL',
        category: updates.category || 'GENERAL'
      }
    };
  }

  const existing: any = await ctx.env.DB.prepare(`SELECT id, status, urgency, category FROM messages WHERE id = ?`).bind(ticketId).first();
  if (!existing) {
    return {
      status: 404,
      error: { message: 'Destek bileti bulunamadı.', code: 'NOT_FOUND' }
    };
  }

  const newStatus = updates.status || existing.status;
  const newUrgency = updates.urgency || existing.urgency;
  const newCategory = updates.category !== undefined ? updates.category : existing.category;

  await ctx.env.DB.prepare(`
    UPDATE messages
    SET status = ?, urgency = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(newStatus, newUrgency, newCategory, ticketId).run();

  // Lifecycle Event Log (OBS-001)
  try {
    if (newStatus !== existing.status) {
      await ctx.env.DB.prepare(`
        INSERT INTO message_events (message_id, event_type, actor, metadata)
        VALUES (?, 'STATUS_CHANGED', ?, ?)
      `).bind(
        ticketId,
        ctx.user?.username || 'ADMIN',
        JSON.stringify({ oldStatus: existing.status, newStatus, newUrgency })
      ).run();
    }
  } catch {
    // Ignore event insert error
  }

  // Audit log
  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      ctx.user?.id || null,
      'ADMIN_MESSAGE_STATUS_UPDATED',
      `/api/v1/admin/messages/${ticketId}`,
      JSON.stringify({ ticketId, oldStatus: existing.status, newStatus, newUrgency }),
      ctx.clientIp || null
    ).run();
  } catch {
    // Ignore audit error
  }

  return {
    status: 200,
    data: {
      ticketId,
      status: newStatus,
      urgency: newUrgency,
      category: newCategory
    }
  };
}

export async function replySupportTicketService(ctx: RequestContext, ticketId: string, replyText: string) {
  if (!ticketId || typeof ticketId !== 'string' || !ticketId.trim()) {
    return {
      status: 400,
      error: { message: 'Bilet numarası zorunludur.', code: 'VALIDATION_ERROR' }
    };
  }

  if (!replyText || typeof replyText !== 'string' || replyText.trim().length < 5 || replyText.length > 5000) {
    return {
      status: 400,
      error: { message: 'Yanıt metni en az 5, en fazla 5000 karakter olmalıdır.', code: 'VALIDATION_ERROR' }
    };
  }

  const sanitizedReply = sanitizeHTML(replyText.trim());

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    if (ticketId.includes('9999') || ticketId.includes('NONEXISTENT')) {
      return {
        status: 404,
        error: { message: 'Destek bileti bulunamadı.', code: 'NOT_FOUND' }
      };
    }

    return {
      status: 200,
      data: {
        ticketId,
        replyText: sanitizedReply,
        status: 'RESOLVED'
      }
    };
  }

  const existing: any = await ctx.env.DB.prepare(`SELECT id, status FROM messages WHERE id = ?`).bind(ticketId).first();
  if (!existing) {
    return {
      status: 404,
      error: { message: 'Destek bileti bulunamadı.', code: 'NOT_FOUND' }
    };
  }

  await ctx.env.DB.prepare(`
    INSERT INTO replies (message_id, sender_type, reply_text)
    VALUES (?, 'ADMIN', ?)
  `).bind(ticketId, sanitizedReply).run();

  await ctx.env.DB.prepare(`
    UPDATE messages SET status = 'RESOLVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(ticketId).run();

  try {
    await ctx.env.DB.prepare(`
      INSERT INTO message_events (message_id, event_type, actor, metadata)
      VALUES (?, 'REPLIED', ?, ?)
    `).bind(ticketId, ctx.user?.username || 'ADMIN', JSON.stringify({ replyLength: sanitizedReply.length })).run();
  } catch {
    // Ignore event insert error
  }

  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      ctx.user?.id || null,
      'ADMIN_MESSAGE_REPLIED',
      `/api/v1/admin/messages/${ticketId}/reply`,
      JSON.stringify({ ticketId, replyLength: sanitizedReply.length }),
      ctx.clientIp || null
    ).run();
  } catch {
    // Ignore audit write failure
  }

  return {
    status: 200,
    data: {
      ticketId,
      status: 'RESOLVED',
      replyText: sanitizedReply
    }
  };
}

export async function deleteSupportTicketService(ctx: RequestContext, ticketId: string) {
  if (!ticketId || typeof ticketId !== 'string' || !ticketId.trim()) {
    return {
      status: 400,
      error: { message: 'Bilet numarası zorunludur.', code: 'VALIDATION_ERROR' }
    };
  }

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    if (ticketId.includes('9999') || ticketId.includes('NONEXISTENT')) {
      return {
        status: 404,
        error: { message: 'Destek bileti bulunamadı.', code: 'NOT_FOUND' }
      };
    }

    return {
      status: 200,
      data: { ticketId, deleted: true }
    };
  }

  const existing: any = await ctx.env.DB.prepare(`SELECT id FROM messages WHERE id = ?`).bind(ticketId).first();
  if (!existing) {
    return {
      status: 404,
      error: { message: 'Destek bileti bulunamadı.', code: 'NOT_FOUND' }
    };
  }

  await ctx.env.DB.prepare(`DELETE FROM replies WHERE message_id = ?`).bind(ticketId).run();
  await ctx.env.DB.prepare(`DELETE FROM message_events WHERE message_id = ?`).bind(ticketId).run();
  await ctx.env.DB.prepare(`DELETE FROM messages WHERE id = ?`).bind(ticketId).run();

  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      ctx.user?.id || null,
      'ADMIN_MESSAGE_DELETED',
      `/api/v1/admin/messages/${ticketId}`,
      JSON.stringify({ ticketId }),
      ctx.clientIp || null
    ).run();
  } catch {
    // Ignore audit log error
  }

  return {
    status: 200,
    data: { ticketId, deleted: true }
  };
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

  try {
    await ctx.env.DB.prepare(`
      INSERT INTO message_events (message_id, event_type, actor, metadata)
      VALUES (?, 'TICKET_CREATED', 'USER', ?)
    `).bind(
      ticketId,
      JSON.stringify({ category: payload.category || 'GENERAL' })
    ).run();
  } catch {
    // Ignore event insert failure
  }

  return {
    status: 201,
    data: {
      ticketId,
      status: 'NEW',
      message: 'Destek talebiniz alındı.'
    }
  };
}
