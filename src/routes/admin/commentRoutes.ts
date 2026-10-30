import { Router } from '../../utils/router.js';
import { jsonResponse, errorResponse } from '../../utils/response.js';
import { requirePermission } from '../../middleware/auth.js';
import { withIdempotency } from '../../middleware/idempotency.js';
import {
  getCommentsService,
  updateCommentStatusService,
  deleteCommentService
} from '../../services/commentService.js';

export const commentRouter = new Router();

// GET /comments
commentRouter.get(
  '/comments',
  async (ctx) => {
    const res = await getCommentsService(ctx);
    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId, res.meta);
  },
  requirePermission('comments.read')
);

// Helper handler for comment status update
const handleUpdateCommentStatus = withIdempotency(async (ctx: any) => {
  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return errorResponse('Geçersiz JSON verisi.', 'INVALID_JSON', 400, ctx.corsHeaders, undefined, ctx.requestId);
  }

  const res = await updateCommentStatusService(ctx, ctx.params.id, body || {});
  if (res.error) {
    return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
  }

  return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
});

// PATCH /comments/:id/status
commentRouter.patch(
  '/comments/:id/status',
  handleUpdateCommentStatus,
  requirePermission('comments.approve')
);

// PATCH /comments/:id (direct status update alias)
commentRouter.patch(
  '/comments/:id',
  handleUpdateCommentStatus,
  requirePermission('comments.approve')
);

// DELETE /comments/:id
commentRouter.delete(
  '/comments/:id',
  withIdempotency(async (ctx: any) => {
    const res = await deleteCommentService(ctx, ctx.params.id);
    if (res.error) {
      return errorResponse(res.error.message, res.error.code, res.status, ctx.corsHeaders, undefined, ctx.requestId);
    }
    return jsonResponse(res.data, res.status, ctx.corsHeaders, ctx.requestId);
  }),
  requirePermission('comments.delete')
);
