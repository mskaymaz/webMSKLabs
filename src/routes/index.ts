import { Env } from '../types/env.js';
import { Router } from '../utils/router.js';
import { createRequestContext } from '../middleware/request.js';
import { globalErrorHandler } from '../middleware/error.js';

import { publicRouter } from './publicRoutes.js';
import { authRouter } from './admin/authRoutes.js';
import { supportRouter } from './admin/supportRoutes.js';
import { commentRouter } from './admin/commentRoutes.js';
import { cmsRouter } from './admin/cmsRoutes.js';

export const mainRouter = new Router();

// 1. Mount Public Routes
mainRouter.use('', publicRouter);

// 2. Mount Admin Sub-Routers
mainRouter.use('/api/admin', authRouter);
mainRouter.use('/api/admin', supportRouter);
mainRouter.use('/api/admin', commentRouter);
mainRouter.use('/api/admin/cms', cmsRouter);

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const ctx = createRequestContext(request, env);
  try {
    return await mainRouter.handle(ctx);
  } catch (err) {
    return globalErrorHandler(err, ctx);
  }
}
