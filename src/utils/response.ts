import { ApiResponse } from '../types/index.js';

export function jsonResponse<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {},
  requestId?: string
): Response {
  const payload: ApiResponse<T> = {
    success: status >= 200 && status < 300,
    data,
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {})
  };

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  };

  if (requestId) {
    responseHeaders['X-Request-ID'] = requestId;
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders
  });
}

export function errorResponse(
  message: string,
  code = 'INTERNAL_ERROR',
  status = 500,
  headers: Record<string, string> = {},
  details?: unknown,
  requestId?: string
): Response {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {})
    },
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {})
  };

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  };

  if (requestId) {
    responseHeaders['X-Request-ID'] = requestId;
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders
  });
}
