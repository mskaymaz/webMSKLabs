import { Env } from './env.js';

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: string;
  sessionId?: number;
  rawToken?: string;
}

export interface RequestContext {
  request: Request;
  env: Env;
  url: URL;
  params: Record<string, string>;
  query: URLSearchParams;
  requestId: string;
  clientIp: string;
  corsHeaders: Record<string, string>;
  securityHeaders: Record<string, string>;
  user?: AuthenticatedUser;
}

export type RouteHandler = (ctx: RequestContext) => Promise<Response> | Response;
export type MiddlewareHandler = (ctx: RequestContext) => Promise<Response | null> | Response | null;

export interface RouteDefinition {
  method: string;
  path: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  middlewares?: MiddlewareHandler[];
}
