/**
 * DevAdmin Session & RBAC Management Module
 * Connects WebCrypto JWT validation with D1 Session Revocation and Role Permissions
 */

import { verifyToken, hashToken } from './_crypto.js';

// Master Role & Permission Matrix (Least Privilege / Deny by Default)
export const ROLE_PERMISSIONS = {
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

/**
 * Checks if a given role possesses a required permission
 */
export function hasPermission(userRole, requiredPermission) {
    if (!userRole || !requiredPermission) return false;
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    if (permissions.includes('*')) return true;
    return permissions.includes(requiredPermission);
}

/**
 * Validates token and checks session status against Cloudflare D1
 */
export async function getAuthenticatedAdmin(env, authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7).trim();
    if (!token) return null;

    const secret = env.JWT_SECRET || 'DEVADMIN_FALLBACK_SECRET_KEY_2026_DEV_ONLY';
    const payload = await verifyToken(token, secret);
    if (!payload || !payload.admin_id) {
        return null;
    }

    // Hash token to verify session active state in D1
    const tokenHash = await hashToken(token);

    if (!env.DB) {
        // Fallback for environment testing without D1 binding
        return {
            id: payload.admin_id,
            username: payload.username,
            role: payload.role || 'SUPER_ADMIN'
        };
    }

    try {
        const query = `
            SELECT s.id as session_id, a.id as admin_id, a.username, a.role, a.is_active
            FROM admin_sessions s
            JOIN admins a ON s.admin_id = a.id
            WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP AND a.is_active = 1
            LIMIT 1
        `;
        const sessionRecord = await env.DB.prepare(query).bind(tokenHash).first();

        if (!sessionRecord) {
            return null; // Session revoked, expired, or admin disabled
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
        return null;
    }
}

/**
 * Persists a new active admin session in D1
 */
export async function createAdminSession(env, adminId, token, ipAddress = null, userAgent = null) {
    if (!env.DB) return null;

    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

    try {
        await env.DB.prepare(`
            INSERT INTO admin_sessions (admin_id, token_hash, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, ?)
        `).bind(adminId, tokenHash, ipAddress, userAgent, expiresAt).run();

        await env.DB.prepare(`
            UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(adminId).run();

        return true;
    } catch (error) {
        console.error('D1 Session Creation Error:', error);
        return false;
    }
}

/**
 * Revokes an active session in D1 (Logout)
 */
export async function revokeAdminSession(env, token) {
    if (!env.DB || !token) return false;

    const tokenHash = await hashToken(token);
    try {
        await env.DB.prepare(`
            DELETE FROM admin_sessions WHERE token_hash = ?
        `).bind(tokenHash).run();
        return true;
    } catch (error) {
        console.error('D1 Session Revocation Error:', error);
        return false;
    }
}

/**
 * Helper to record security audit logs in D1
 */
export async function logAdminAudit(env, adminId, action, resource, details = {}, ipAddress = null) {
    if (!env.DB) return;

    try {
        await env.DB.prepare(`
            INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            adminId,
            action,
            resource,
            JSON.stringify(details),
            ipAddress
        ).run();
    } catch (error) {
        console.error('D1 Audit Logging Error:', error);
    }
}
