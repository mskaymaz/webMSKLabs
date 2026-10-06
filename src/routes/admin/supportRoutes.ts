import { Router } from '../../utils/router.js';
import { jsonResponse, errorResponse } from '../../utils/response.js';
import { requirePermission } from '../../middleware/auth.js';
import { getSupportTicketsService, replySupportTicketService } from '../../services/supportService.js';

export const supportRouter = new Router();

supportRouter.get(
  '/tickets',
  async (ctx) => {
    const res = await getSupportTicketsService(ctx);
    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  },
  requirePermission('messages.read')
);

supportRouter.post(
  '/tickets/:id/reply',
  async (ctx) => {
    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
    }

    const replyText = body?.reply_text;
    if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
      return errorResponse('Yanıt metni boş bırakılamaz.', 'VALIDATION_ERROR', 400, ctx.corsHeaders, undefined, ctx.requestId);
    }

    const res = await replySupportTicketService(ctx, ctx.params.id, replyText);
    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  },
  requirePermission('messages.write')
);
