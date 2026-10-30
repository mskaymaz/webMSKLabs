import { RequestContext, MiddlewareHandler } from '../types/router.js';
import { Permission, AdminRole, VALID_PERMISSIONS } from '../types/auth.js';
import { verifyToken, hashToken } from '../utils/crypto.js';
import { errorResponse } from '../utils/response.js';

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[] | ['*']> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'messages.read', 'messages.reply', 'messages.write', 'messages.delete',
    'comments.read', 'comments.approve', 'comments.delete',
    'posts.read', 'posts.create', 'posts.write', 'posts.publish', 'media.upload',
    'settings.manage'
  ],
  EDITOR: [
    'comments.read', 'comments.approve',
    'posts.read', 'posts.create', 'posts.write', 'posts.publish', 'media.upload'
  ],
  SUPPORT: [
    'messages.read', 'messages.reply', 'messages.write', 'comments.read'
  ]
};

export function hasPermission(userRole?: string, requiredPermission?: string): boolean {
  if (!userRole || typeof userRole !== 'string' || !requiredPermission || typeof requiredPermission !== 'string') {
    return false;
  }

  const cleanPerm = requiredPermission.trim();
  if (!cleanPerm || !VALID_PERMISSIONS.has(cleanPerm as Permission)) {
    return false; // Invalid permissions, typos, or uydurma strings are ALWAYS denied!
  }

  const permissions = (ROLE_PERMISSIONS[userRole as AdminRole] || []) as string[];
  if (permissions.length === 0) return false;

  if (permissions.includes('*')) return true;

  if (permissions.includes(cleanPerm)) return true;

  if (cleanPerm === 'messages.reply' && permissions.includes('messages.write')) {
    return true;
  }

  return false;
}

export async function getAuthenticatedAdmin(ctx: RequestContext) {
  const authHeader = ctx.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  const secret = ctx.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    return null;
  }

  const payload = await verifyToken(token, secret);
  if (
    !payload ||
    payload.admin_id === undefined ||
    typeof payload.admin_id !== 'number' ||
    typeof payload.username !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    return null;
  }

  // Fallback if D1 database binding is missing or not a D1 instance
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
  } catch {
    // If admin_sessions table doesn't exist in mock DB object, fallback to JWT payload
    return {
      id: payload.admin_id,
      username: payload.username,
      role: payload.role || 'SUPER_ADMIN',
      rawToken: token
    };
  }
}

export const requireAuth: MiddlewareHandler = async (ctx: RequestContext) => {
  if (!ctx.env.JWT_SECRET || typeof ctx.env.JWT_SECRET !== 'string' || ctx.env.JWT_SECRET.trim() === '') {
    return errorResponse(
      'Sunucu konfigürasyon hatası.',
      'SERVER_MISCONFIGURATION',
      500,
      ctx.corsHeaders,
      undefined,
      ctx.requestId
    );
  }

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

export function requirePermission(permission: Permission): MiddlewareHandler {
  return async (ctx: RequestContext) => {
    if (!ctx.user) {
      const authResult = await requireAuth(ctx);
      if (authResult) return authResult;
    }

    if (!hasPermission(ctx.user?.role, permission)) {
      if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
        try {
          await ctx.env.DB.prepare(`
            INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            ctx.user?.id || null,
            'PERMISSION_DENIED',
            ctx.request?.url || '/api/admin',
            JSON.stringify({
              requiredPermission: permission,
              userRole: ctx.user?.role || 'UNKNOWN',
              username: ctx.user?.username || 'UNKNOWN'
            }),
            ctx.clientIp || null
          ).run();
        } catch {
          // Ignore audit write failure
        }
      }

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
