import { ApiResponse } from '../types/index.js';

export function jsonResponse<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  const payload: ApiResponse<T> = {
    success: status >= 200 && status < 300,
    data,
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

export function errorResponse(
  message: string,
  code = 'INTERNAL_ERROR',
  status = 500,
  headers: Record<string, string> = {}
): Response {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}
