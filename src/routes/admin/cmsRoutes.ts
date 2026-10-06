import { Router } from '../../utils/router.js';
import { jsonResponse } from '../../utils/response.js';
import { requirePermission } from '../../middleware/auth.js';

export const cmsRouter = new Router();

cmsRouter.get(
  '/posts',
  async (ctx) => {
    return jsonResponse([
      { id: 1, title: 'MSKLabs DevAdmin Başlangıç', status: 'PUBLISHED' }
    ], 200, ctx.corsHeaders, ctx.requestId);
  },
  requirePermission('posts.read')
);
