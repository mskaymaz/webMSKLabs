import { Env } from '../types/env.js';
import { Router } from '../utils/router.js';
import { createRequestContext } from '../middleware/request.js';
import { globalErrorHandler } from '../middleware/error.js';
import { applySecurityHeaders } from '../middleware/securityHeaders.js';

import { healthRouter } from './health.js';
import { publicRouter } from './publicRoutes.js';
import { authRouter } from './admin/authRoutes.js';
import { supportRouter } from './admin/supportRoutes.js';
import { commentRouter } from './admin/commentRoutes.js';
import { cmsRouter } from './admin/cmsRoutes.js';
import { broadcastRouter } from './admin/broadcastRoutes.js';

export const mainRouter = new Router();

// 1. Mount Health & Public Routes (contains /api/v1/... and legacy /api/... aliases)
mainRouter.use('', healthRouter);
mainRouter.use('', publicRouter);

// 2. Mount Canonical v1 Admin Sub-Routers (/api/v1/admin/...)
mainRouter.use('/api/v1/admin', authRouter);
mainRouter.use('/api/v1/admin', supportRouter);
mainRouter.use('/api/v1/admin', commentRouter);
mainRouter.use('/api/v1/admin', broadcastRouter);
mainRouter.use('/api/v1/admin/cms', cmsRouter);

// 3. Mount Legacy Alias Admin Sub-Routers (/api/admin/...) for method-preserving compatibility
mainRouter.use('/api/admin', authRouter);
mainRouter.use('/api/admin', supportRouter);
mainRouter.use('/api/admin', commentRouter);
mainRouter.use('/api/admin', broadcastRouter);
mainRouter.use('/api/admin/cms', cmsRouter);

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const ctx = createRequestContext(request, env);
  try {
    const response = await mainRouter.handle(ctx);
    return applySecurityHeaders(response, ctx.securityHeaders);
  } catch (err) {
    const errorRes = globalErrorHandler(err, ctx);
    return applySecurityHeaders(errorRes, ctx.securityHeaders);
  }
}
