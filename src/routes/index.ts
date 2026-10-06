import { Env } from '../types/env.js';
import { getCorsHeaders } from '../middleware/cors.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { validateEnvBindings } from '../utils/env.js';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const corsHeaders = getCorsHeaders(request, env);

  // Preflight OPTIONS handler
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);

  // Health check endpoint
  if (url.pathname === '/api/health' || url.pathname === '/api/v1/health') {
    const envCheck = validateEnvBindings(env);
    return jsonResponse(
      {
        status: 'UP',
        service: 'webmsklabs-edge',
        environment: env.ENVIRONMENT || 'development',
        bindings: {
          d1: !!env.DB,
          r2: !!env.MEDIA,
          jwtSecretConfigured: !!env.JWT_SECRET,
          valid: envCheck.valid,
          missing: envCheck.missing
        }
      },
      envCheck.valid ? 200 : 500,
      corsHeaders
    );
  }

  return errorResponse('Resource Not Found', 'NOT_FOUND', 404, corsHeaders);
}
