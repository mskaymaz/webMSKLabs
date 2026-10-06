import { RequestContext, RouteHandler, MiddlewareHandler, RouteDefinition } from '../types/router.js';
import { errorResponse } from './response.js';

export class Router {
  private routes: RouteDefinition[] = [];

  public get(path: string, handler: RouteHandler, ...middlewares: MiddlewareHandler[]): this {
    this.addRoute('GET', path, handler, middlewares);
    return this;
  }

  public post(path: string, handler: RouteHandler, ...middlewares: MiddlewareHandler[]): this {
    this.addRoute('POST', path, handler, middlewares);
    return this;
  }

  public put(path: string, handler: RouteHandler, ...middlewares: MiddlewareHandler[]): this {
    this.addRoute('PUT', path, handler, middlewares);
    return this;
  }

  public patch(path: string, handler: RouteHandler, ...middlewares: MiddlewareHandler[]): this {
    this.addRoute('PATCH', path, handler, middlewares);
    return this;
  }

  public delete(path: string, handler: RouteHandler, ...middlewares: MiddlewareHandler[]): this {
    this.addRoute('DELETE', path, handler, middlewares);
    return this;
  }

  public use(prefix: string, router: Router): this {
    for (const r of router.routes) {
      const fullPath = (prefix + r.path).replace(/\/+/g, '/');
      const { pattern, paramNames } = this.parsePath(fullPath);
      this.routes.push({
        ...r,
        path: fullPath,
        pattern,
        paramNames
      });
    }
    return this;
  }

  private addRoute(method: string, path: string, handler: RouteHandler, middlewares: MiddlewareHandler[]) {
    const { pattern, paramNames } = this.parsePath(path);
    this.routes.push({ method, path, pattern, paramNames, handler, middlewares });
  }

  private parsePath(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    return {
      pattern: new RegExp(`^${regexPath}$`),
      paramNames
    };
  }

  public async handle(ctx: RequestContext): Promise<Response> {
    const method = ctx.request.method;
    const { url, corsHeaders, requestId } = ctx;

    // 1. Preflight OPTIONS request
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const pathname = url.pathname;

    // 2. Find matching route definition
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = pathname.match(route.pattern);
      if (match) {
        // Extract route parameters
        ctx.params = {};
        route.paramNames.forEach((name, idx) => {
          ctx.params[name] = decodeURIComponent(match[idx + 1]);
        });

        // Run middleware chain
        if (route.middlewares && route.middlewares.length > 0) {
          for (const middleware of route.middlewares) {
            const res = await middleware(ctx);
            if (res instanceof Response) {
              return res;
            }
          }
        }

        // Execute route handler
        return await route.handler(ctx);
      }
    }

    // 3. 404 Route Not Found
    return errorResponse('Resource Not Found', 'NOT_FOUND', 404, corsHeaders, undefined, requestId);
  }
}
