import { ApiResponse } from '../types/index.js';

/**
 * Standard Success Response Helper (API-006)
 */
export function jsonResponse<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {},
  requestId?: string
): Response {
  const timestamp = new Date().toISOString();
  const reqId = requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`);

  const isAlreadyEnveloped =
    data &&
    typeof data === 'object' &&
    'success' in data &&
    'meta' in data;

  const payload: ApiResponse<T> = isAlreadyEnveloped
    ? (data as unknown as ApiResponse<T>)
    : {
        success: status >= 200 && status < 300,
        data,
        meta: {
          timestamp,
          requestId: reqId
        },
        timestamp,
        requestId: reqId
      };

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  };

  if (reqId) {
    responseHeaders['X-Request-ID'] = reqId;
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders
  });
}

/**
 * Standard Error Response Helper (API-006)
 */
export function errorResponse(
  message: string,
  code = 'INTERNAL_ERROR',
  status = 500,
  headers: Record<string, string> = {},
  details?: unknown,
  requestId?: string
): Response {
  const timestamp = new Date().toISOString();
  const reqId = requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`);

  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details: details !== undefined ? details : [],
      ...(reqId ? { requestId: reqId } : {})
    },
    meta: {
      timestamp,
      requestId: reqId
    },
    timestamp,
    requestId: reqId
  };

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  };

  if (reqId) {
    responseHeaders['X-Request-ID'] = reqId;
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders
  });
}
