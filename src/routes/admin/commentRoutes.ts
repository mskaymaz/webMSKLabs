import { Router } from '../../utils/router.js';
import { jsonResponse, errorResponse } from '../../utils/response.js';
import { requirePermission } from '../../middleware/auth.js';
import { getCommentsService, updateCommentStatusService } from '../../services/commentService.js';

export const commentRouter = new Router();

commentRouter.get(
  '/comments',
  async (ctx) => {
    const res = await getCommentsService(ctx);
    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  },
  requirePermission('comments.read')
);

commentRouter.patch(
  '/comments/:id/status',
  async (ctx) => {
    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
    }

    const status = body?.status;
    if (!status) {
      return errorResponse('Yorum durumu zorunludur.', 'VALIDATION_ERROR', 400, ctx.corsHeaders, undefined, ctx.requestId);
    }

    const res = await updateCommentStatusService(ctx, ctx.params.id, status);
    if (res.error) {
      return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
    }

    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  },
  requirePermission('comments.approve')
);
