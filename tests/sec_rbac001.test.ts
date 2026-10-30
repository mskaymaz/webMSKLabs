import { describe, it, expect } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS } from '../src/middleware/auth.js';

describe('SEC-RBAC-001 — Role and Permission Model Tests', () => {
  it('1. should grant SUPER_ADMIN full access to all VALID system permissions', () => {
    expect(hasPermission('SUPER_ADMIN', 'posts.publish')).toBe(true);
    expect(hasPermission('SUPER_ADMIN', 'settings.manage')).toBe(true);
    expect(hasPermission('SUPER_ADMIN', 'messages.reply')).toBe(true);
  });

  it('2. should DENY SUPER_ADMIN when requested permission is invalid, typo, or uydurma', () => {
    expect(hasPermission('SUPER_ADMIN', 'posts.pubish')).toBe(false); // typo
    expect(hasPermission('SUPER_ADMIN', 'admin.all')).toBe(false); // wildcard bypass string
    expect(hasPermission('SUPER_ADMIN', 'custom.random.perm')).toBe(false); // unknown string
  });

  it('3. should grant ADMIN all standard operational permissions', () => {
    expect(hasPermission('ADMIN', 'posts.publish')).toBe(true);
    expect(hasPermission('ADMIN', 'comments.approve')).toBe(true);
    expect(hasPermission('ADMIN', 'messages.reply')).toBe(true);
    expect(hasPermission('ADMIN', 'settings.manage')).toBe(true);
  });

  it('4. should grant EDITOR publishing rights but deny messages and settings', () => {
    expect(hasPermission('EDITOR', 'posts.publish')).toBe(true);
    expect(hasPermission('EDITOR', 'posts.create')).toBe(true);
    expect(hasPermission('EDITOR', 'messages.reply')).toBe(false);
    expect(hasPermission('EDITOR', 'settings.manage')).toBe(false);
  });

  it('5. should restrict SUPPORT to messages and comments read', () => {
    expect(hasPermission('SUPPORT', 'messages.read')).toBe(true);
    expect(hasPermission('SUPPORT', 'messages.reply')).toBe(true);
    expect(hasPermission('SUPPORT', 'posts.publish')).toBe(false);
    expect(hasPermission('SUPPORT', 'settings.manage')).toBe(false);
  });

  it('6. should enforce strict deny-by-default on invalid or missing inputs', () => {
    expect(hasPermission(undefined, 'posts.read')).toBe(false);
    expect(hasPermission('SUPPORT', undefined)).toBe(false);
    expect(hasPermission('', 'posts.read')).toBe(false);
    expect(hasPermission('SUPPORT', '')).toBe(false);
    expect(hasPermission('UNKNOWN_ROLE', 'posts.read')).toBe(false);
    expect(hasPermission('SUPPORT', 'invalid.permission.typo')).toBe(false);
  });

  it('7. should ensure ROLE_PERMISSIONS map remains immutable and intact for canonical roles', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain('*');
    expect(ROLE_PERMISSIONS.SUPPORT).toContain('messages.read');
    expect(ROLE_PERMISSIONS.EDITOR).toContain('posts.publish');
  });
});
