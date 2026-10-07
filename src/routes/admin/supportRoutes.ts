import { Router } from '../../utils/router.js';
import { jsonResponse, errorResponse } from '../../utils/response.js';
import { requirePermission } from '../../middleware/auth.js';
import { withIdempotency } from '../../middleware/idempotency.js';
import {
  getSupportTicketsService,
  getSupportTicketDetailService,
  updateSupportTicketService,
  replySupportTicketService,
  deleteSupportTicketService
} from '../../services/supportService.js';

export const supportRouter = new Router();

// Helper handler for listing tickets/messages
const handleListTickets = async (ctx: any) => {
  const res = await getSupportTicketsService(ctx);
  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId, res.meta);
};

// Helper handler for ticket detail
const handleGetTicketDetail = async (ctx: any) => {
  const res = await getSupportTicketDetailService(ctx, ctx.params.id);
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
  }
  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
};

// Helper handler for updating ticket status/urgency
const handleUpdateTicket = withIdempotency(async (ctx: any) => {
  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const res = await updateSupportTicketService(ctx, ctx.params.id, body || {});
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
  }
  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

// Helper handler for replying to a ticket
const handleReplyTicket = withIdempotency(async (ctx: any) => {
  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const replyText = body?.replyContent || body?.reply_text;
  const res = await replySupportTicketService(ctx, ctx.params.id, replyText);
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
  }
  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

// Helper handler for deleting a ticket
const handleDeleteTicket = withIdempotency(async (ctx: any) => {
  const res = await deleteSupportTicketService(ctx, ctx.params.id);
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
  }
  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

// Register routes for /tickets path
supportRouter.get('/tickets', handleListTickets, requirePermission('messages.read'));
supportRouter.get('/tickets/:id', handleGetTicketDetail, requirePermission('messages.read'));
supportRouter.patch('/tickets/:id', handleUpdateTicket, requirePermission('messages.write'));
supportRouter.post('/tickets/:id/reply', handleReplyTicket, requirePermission('messages.reply'));
supportRouter.delete('/tickets/:id', handleDeleteTicket, requirePermission('messages.delete'));

// Register route aliases for /messages path
supportRouter.get('/messages', handleListTickets, requirePermission('messages.read'));
supportRouter.get('/messages/:id', handleGetTicketDetail, requirePermission('messages.read'));
supportRouter.patch('/messages/:id', handleUpdateTicket, requirePermission('messages.write'));
supportRouter.post('/messages/:id/reply', handleReplyTicket, requirePermission('messages.reply'));
supportRouter.delete('/messages/:id', handleDeleteTicket, requirePermission('messages.delete'));
