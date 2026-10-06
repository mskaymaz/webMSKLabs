import { Router } from '../utils/router.js';
import { jsonResponse } from '../utils/response.js';
import { validateEnvBindings } from '../utils/env.js';

export const publicRouter = new Router();

publicRouter.get('/api/health', (ctx) => {
  const envCheck = validateEnvBindings(ctx.env);
  return jsonResponse(
    {
      status: 'UP',
      service: 'webmsklabs-edge',
      environment: ctx.env.ENVIRONMENT || 'development',
      bindings: {
        d1: !!ctx.env.DB,
        r2: !!ctx.env.MEDIA,
        jwtSecretConfigured: !!ctx.env.JWT_SECRET,
        valid: envCheck.valid,
        missing: envCheck.missing
      }
    },
    envCheck.valid ? 200 : 500,
    ctx.corsHeaders,
    ctx.requestId
  );
});

publicRouter.get('/api/v1/health', (ctx) => {
  const envCheck = validateEnvBindings(ctx.env);
  return jsonResponse(
    {
      status: 'UP',
      service: 'webmsklabs-edge',
      environment: ctx.env.ENVIRONMENT || 'development',
      bindings: {
        d1: !!ctx.env.DB,
        r2: !!ctx.env.MEDIA,
        jwtSecretConfigured: !!ctx.env.JWT_SECRET,
        valid: envCheck.valid,
        missing: envCheck.missing
      }
    },
    envCheck.valid ? 200 : 500,
    ctx.corsHeaders,
    ctx.requestId
  );
});
