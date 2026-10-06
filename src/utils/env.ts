import { Env } from '../types/env.js';

export function validateEnvBindings(env: Env): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!env.DB) missing.push('DB (D1Database)');
  if (!env.MEDIA) missing.push('MEDIA (R2Bucket)');
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');

  return {
    valid: missing.length === 0,
    missing
  };
}
