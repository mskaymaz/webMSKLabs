import { Env } from './types/env.js';
import { handleRequest } from './routes/index.js';
import { createRequestContext } from './middleware/request.js';
import { globalErrorHandler } from './middleware/error.js';
import { handleInboundEmail } from './services/emailInboundService.js';

/**
 * ARCH-003 & COM-INBOUND-001 — Modular Route, Middleware & Inbound Email Worker Entry
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const context = createRequestContext(request, env);
    try {
      return await handleRequest(request, env);
    } catch (err) {
      return globalErrorHandler(err, context);
    }
  },

  async email(message: any, env: Env, ctx: ExecutionContext): Promise<void> {
    await handleInboundEmail(message, env, ctx);
  }
};
