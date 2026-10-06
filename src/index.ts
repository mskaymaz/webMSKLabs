import { Env } from './types/env.js';
import { handleRequest } from './routes/index.js';
import { errorResponse } from './utils/response.js';
import { getCorsHeaders } from './middleware/cors.js';

/**
 * ARCH-001 — Cloudflare Workers Main Entry Handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      console.error('Unhandled Worker Exception:', err);
      const corsHeaders = getCorsHeaders(request, env);
      return errorResponse(
        'Internal Server Error',
        'SERVER_ERROR',
        500,
        corsHeaders
      );
    }
  }
};
