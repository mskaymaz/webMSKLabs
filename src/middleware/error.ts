import { RequestContext } from '../types/router.js';
import { errorResponse } from '../utils/response.js';

export function globalErrorHandler(err: unknown, ctx: RequestContext): Response {
  console.error(`[GlobalErrorHandler] Error processing request ${ctx.requestId} (${ctx.request.method} ${ctx.url.pathname}):`, err);

  const isDev = ctx.env.ENVIRONMENT === 'development';
  const errorMessage = isDev && err instanceof Error ? err.message : 'Sunucu tarafında beklenmeyen bir hata oluştu.';

  return errorResponse(
    errorMessage,
    'SERVER_ERROR',
    500,
    ctx.corsHeaders,
    undefined,
    ctx.requestId
  );
}
