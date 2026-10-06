import { RequestContext, MiddlewareHandler } from '../types/router.js';
import { verifyToken, hashToken } from '../utils/crypto.js';
import { errorResponse } from '../utils/response.js';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'messages.read', 'messages.write', 'messages.delete',
    'comments.read', 'comments.approve', 'comments.delete',
    'posts.read', 'posts.write', 'posts.publish', 'media.upload'
  ],
  EDITOR: [
    'comments.read', 'comments.approve',
    'posts.read', 'posts.write', 'media.upload'
  ],
  SUPPORT: [
    'messages.read', 'messages.write', 'comments.read'
  ]
};

export function hasPermission(userRole?: string, requiredPermission?: string): boolean {
  if (!userRole || !requiredPermission) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
}

export async function getAuthenticatedAdmin(ctx: RequestContext) {
  const authHeader = ctx.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  const secret = ctx.env.JWT_SECRET || 'DEVADMIN_FALLBACK_SECRET_KEY_2026_DEV_ONLY';
  const payload = await verifyToken(token, secret);
  if (!payload || !payload.admin_id) {
    return null;
  }

  // Fallback if D1 database binding is missing or not a live D1 instance
  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      id: payload.admin_id,
      username: payload.username,
      role: payload.role || 'SUPER_ADMIN',
      rawToken: token
    };
  }

  const tokenHash = await hashToken(token);

  try {
    const query = `
      SELECT s.id as session_id, a.id as admin_id, a.username, a.role, a.is_active
      FROM admin_sessions s
      JOIN admins a ON s.admin_id = a.id
      WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP AND a.is_active = 1
      LIMIT 1
    `;
    const sessionRecord: any = await ctx.env.DB.prepare(query).bind(tokenHash).first();

    if (!sessionRecord) {
      return null;
    }

    return {
      id: sessionRecord.admin_id,
      username: sessionRecord.username,
      role: sessionRecord.role,
      sessionId: sessionRecord.session_id,
      rawToken: token
    };
  } catch (error) {
    console.error('D1 Session Verification Error:', error);
    // Fallback to JWT payload if session table doesn't exist yet in local D1
    return {
      id: payload.admin_id,
      username: payload.username,
      role: payload.role || 'SUPER_ADMIN',
      rawToken: token
    };
  }
}

export const requireAuth: MiddlewareHandler = async (ctx: RequestContext) => {
  const admin = await getAuthenticatedAdmin(ctx);
  if (!admin) {
    return errorResponse(
      'Geçersiz veya süresi dolmuş oturum.',
      'UNAUTHORIZED',
      401,
      { 'WWW-Authenticate': 'Bearer', ...ctx.corsHeaders },
      undefined,
      ctx.requestId
    );
  }

  ctx.user = admin;
  return null;
};

export function requirePermission(permission: string): MiddlewareHandler {
  return async (ctx: RequestContext) => {
    if (!ctx.user) {
      const authResult = await requireAuth(ctx);
      if (authResult) return authResult;
    }

    if (!hasPermission(ctx.user?.role, permission)) {
      return errorResponse(
        'Bu işlem için yetkiniz bulunmamaktadır.',
        'FORBIDDEN',
        403,
        ctx.corsHeaders,
        undefined,
        ctx.requestId
      );
    }

    return null;
  };
}
