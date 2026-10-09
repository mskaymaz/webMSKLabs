import { describe, it, expect } from 'vitest';
import { getEnvironmentType, validateEnvBindings, verifySecretBoundary, validateTargetEnvironment } from '../src/utils/env';
import { runDeploymentVerification } from '../scripts/verify_deployment';
import { executeRollback, prepareEmergencyHotfix } from '../scripts/rollback_helper';

describe('SECTION 16 — RELEASE, ENVIRONMENT & DEPLOYMENT MANAGEMENT (REL-ENV-001, REL-DEP-001, REL-ROLLBACK-001 & REL-HOTFIX-001)', () => {

  it('1. REL-ENV-001 — should classify development, staging, and production environments correctly', () => {
    expect(getEnvironmentType({})).toBe('development');
    expect(getEnvironmentType({ ENVIRONMENT: 'prod' })).toBe('production');
    expect(getEnvironmentType({ ENVIRONMENT: 'staging' })).toBe('staging');
  });

  it('2. REL-ENV-001 — should validate env bindings and detect missing required keys', () => {
    const valid = validateEnvBindings({ DB: {} as any, MEDIA: {} as any, JWT_SECRET: 'secret' });
    expect(valid.valid).toBe(true);

    const invalid = validateEnvBindings({} as any);
    expect(invalid.valid).toBe(false);
    expect(invalid.missing).toContain('DB (D1Database)');
  });

  it('3. REL-ENV-001 — should enforce secret boundary and detect secret leaks into public configuration', () => {
    const cleanEnv = {
      APP_NAME: 'MSKLabsDesk',
      JWT_SECRET: 'super-secret-jwt-key-123'
    };
    const cleanRes = verifySecretBoundary(cleanEnv);
    expect(cleanRes.valid).toBe(true);
    expect(cleanRes.leaks).toHaveLength(0);

    const leakedEnv = {
      APP_NAME: 'super-secret-jwt-key-123',
      JWT_SECRET: 'super-secret-jwt-key-123'
    };
    const leakedRes = verifySecretBoundary(leakedEnv);
    expect(leakedRes.valid).toBe(false);
    expect(leakedRes.leaks[0]).toContain('Secret JWT_SECRET found in public configuration APP_NAME');
  });

  it('4. REL-ENV-001 — should enforce Wrong-Env Guard preventing cross-environment assignment', () => {
    const validProd = validateTargetEnvironment('production', 'd1_desk_prod', 'r2_desk_prod');
    expect(validProd.allowed).toBe(true);

    const wrongDbProd = validateTargetEnvironment('production', 'd1_desk_staging', 'r2_desk_prod');
    expect(wrongDbProd.allowed).toBe(false);
    expect(wrongDbProd.reason).toContain('Wrong-Env Guard');

    const wrongBucketProd = validateTargetEnvironment('production', 'd1_desk_prod', 'r2_desk_staging');
    expect(wrongBucketProd.allowed).toBe(false);

    const wrongDbStaging = validateTargetEnvironment('staging', 'd1_desk_prod', 'r2_desk_staging');
    expect(wrongDbStaging.allowed).toBe(false);
  });

  it('5. REL-DEP-001 — should execute 10-layer deployment verification checklist', async () => {
    const mockFetch = async (url: string) => {
      if (url.includes('/health')) return { status: 200, json: { status: 'ok', database: { status: 'healthy' } } };
      if (url.includes('/posts')) return { status: 200, json: [{ id: 1, slug: 'test' }] };
      if (url.includes('/login')) return { status: 400, json: { error: 'Bad Request' } };
      if (url.includes('/audio')) return { status: 200, json: {} };
      return { status: 200, json: {} };
    };

    const report = await runDeploymentVerification('http://localhost', mockFetch);
    expect(report.results).toHaveLength(10);
    expect(report.passed).toBe(true);
    expect(report.rollbackRequired).toBe(false);
  });

  it('6. REL-DEP-001 — should trigger rollback flag when deployment verification fails', async () => {
    const failingFetch = async (url: string) => {
      if (url.includes('/health')) return { status: 500, json: { error: 'Internal Server Error' } };
      return { status: 500 };
    };

    const report = await runDeploymentVerification('http://localhost', failingFetch);
    expect(report.passed).toBe(false);
    expect(report.rollbackRequired).toBe(true);
  });

  it('7. REL-ROLLBACK-001 — should execute rollback helper and record target version state', () => {
    const rollback = executeRollback('v1.2.0', 'Health check failed after deployment');
    expect(rollback.success).toBe(true);
    expect(rollback.targetVersion).toBe('v1.2.0');
    expect(rollback.actionTaken).toContain('Rolled back Cloudflare Worker release');
  });

  it('8. REL-HOTFIX-001 — should prepare emergency hotfix with fast-track quality gate check', () => {
    const hotfix = prepareEmergencyHotfix('HOTFIX-2026-001', 'Fix security token edge case');
    expect(hotfix.success).toBe(true);
    expect(hotfix.hotfixId).toBe('HOTFIX-2026-001');
    expect(hotfix.qualityGatesPassed).toBe(true);
  });

});
