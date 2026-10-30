import { Env } from '../types/env.js';

export interface EnvGuardResult {
  valid: boolean;
  environment: 'development' | 'staging' | 'production';
  missingBindings: string[];
  leaks: string[];
}

export function getEnvironmentType(env?: any): 'development' | 'staging' | 'production' {
  if (!env) return 'development';
  const nodeEnv = env.ENVIRONMENT || env.NODE_ENV || env.CF_WORKER_ENV;
  if (nodeEnv === 'production' || nodeEnv === 'prod') return 'production';
  if (nodeEnv === 'staging' || nodeEnv === 'test') return 'staging';
  return 'development';
}

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

export function verifySecretBoundary(env: any): { valid: boolean; leaks: string[] } {
  const leaks: string[] = [];
  if (!env) return { valid: true, leaks: [] };

  const publicKeys = ['APP_NAME', 'API_PREFIX', 'DEFAULT_LANG', 'PUBLIC_URL'];
  const secrets = ['JWT_SECRET', 'RESEND_API_KEY', 'GEMINI_API_KEY', 'VAPID_PRIVATE_KEY'];

  secrets.forEach(secKey => {
    const secVal = env[secKey];
    if (secVal && typeof secVal === 'string') {
      publicKeys.forEach(pubKey => {
        if (env[pubKey] && env[pubKey] === secVal) {
          leaks.push(`Secret ${secKey} found in public configuration ${pubKey}`);
        }
      });
    }
  });

  return {
    valid: leaks.length === 0,
    leaks
  };
}

export function validateTargetEnvironment(
  targetEnv: 'staging' | 'production',
  configuredDatabaseId?: string,
  configuredBucket?: string
): { allowed: boolean; reason?: string } {
  if (targetEnv === 'production') {
    if (configuredDatabaseId && configuredDatabaseId.includes('staging')) {
      return { allowed: false, reason: 'Wrong-Env Guard: Staging database assigned to Production environment' };
    }
    if (configuredBucket && configuredBucket.includes('staging')) {
      return { allowed: false, reason: 'Wrong-Env Guard: Staging R2 bucket assigned to Production environment' };
    }
  }

  if (targetEnv === 'staging') {
    if (configuredDatabaseId && configuredDatabaseId.includes('prod') && !configuredDatabaseId.includes('staging')) {
      return { allowed: false, reason: 'Wrong-Env Guard: Production database assigned to Staging environment' };
    }
  }

  return { allowed: true };
}
