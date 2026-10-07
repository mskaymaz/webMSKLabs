import { describe, it, expect } from 'vitest';
import { hasPermission } from '../src/middleware/auth.js';

describe('SEC-RBAC-003 — Frontend Role & Permission Helper Tests', () => {
  it('1. should verify hasPermission evaluates role-based capabilities correctly', () => {
    // SUPPORT should see tickets but NOT publish posts
    expect(hasPermission('SUPPORT', 'messages.read')).toBe(true);
    expect(hasPermission('SUPPORT', 'messages.reply')).toBe(true);
    expect(hasPermission('SUPPORT', 'posts.publish')).toBe(false);

    // EDITOR should see posts but NOT reply to tickets
    expect(hasPermission('EDITOR', 'posts.publish')).toBe(true);
    expect(hasPermission('EDITOR', 'messages.reply')).toBe(false);

    // SUPER_ADMIN should see everything
    expect(hasPermission('SUPER_ADMIN', 'messages.reply')).toBe(true);
    expect(hasPermission('SUPER_ADMIN', 'posts.publish')).toBe(true);
    expect(hasPermission('SUPER_ADMIN', 'settings.manage')).toBe(true);
  });

  it('2. should reject empty, null, or undefined permission queries on frontend', () => {
    expect(hasPermission('SUPER_ADMIN', '')).toBe(false);
    expect(hasPermission('SUPER_ADMIN', undefined)).toBe(false);
    expect(hasPermission(undefined, 'posts.publish')).toBe(false);
  });
});
