import { Env } from './types/env.js';
import { handleRequest } from './routes/index.js';
import { createRequestContext } from './middleware/request.js';
import { globalErrorHandler } from './middleware/error.js';

/**
 * ARCH-003 — Modular Route & Middleware Worker Entry
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const context = createRequestContext(request, env);
    try {
      return await handleRequest(request, env);
    } catch (err) {
      return globalErrorHandler(err, context);
    }
  }
};
