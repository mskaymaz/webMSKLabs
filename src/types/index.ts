export * from './env.js';
export * from './router.js';
export * from './auth.js';

export interface ApiMeta {
  timestamp: string;
  requestId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
  meta: ApiMeta;
  timestamp?: string;
  requestId?: string;
}
