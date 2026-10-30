import { describe, it, expect } from 'vitest';
import {
  DATA_GOVERNANCE_INVENTORY,
  maskPII,
  maskSecretsInObject,
  anonymizeUserData,
  anonymizeSupportTicket,
  processRetentionPurge
} from '../src/utils/privacy';

describe('SECTION 17 — PRIVACY, DATA GOVERNANCE & COMPLIANCE (PRIV-001)', () => {

  it('1. PRIV-001 — should maintain complete data inventory and classification matrix', () => {
    expect(DATA_GOVERNANCE_INVENTORY.length).toBeGreaterThanOrEqual(6);
    const categories = DATA_GOVERNANCE_INVENTORY.map(i => i.category);
    expect(categories).toContain('USER_IDENTITY');
    expect(categories).toContain('SUPPORT_TICKETS');
    expect(categories).toContain('COMMENTS');
    expect(categories).toContain('NEWSLETTER');
    expect(categories).toContain('AUDIT_LOGS');
  });

  it('2. PRIV-001 — should mask PII strings and email addresses safely', () => {
    expect(maskPII('ahmet@example.com')).toBe('ah***@example.com');
    expect(maskPII('al@example.com')).toBe('a***@example.com');
    expect(maskPII('05551234567')).toBe('05***67');
    expect(maskPII('')).toBe('');
  });

  it('3. PRIV-001 — should redact passwords, JWT tokens and API keys from log objects', () => {
    const logData = {
      user: 'admin',
      password: 'MySecretPassword123!',
      jwt_secret: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      resend_api_key: 're_123456789',
      metadata: {
        token: 'Bearer xyz123',
        action: 'USER_LOGIN'
      }
    };

    const redacted = maskSecretsInObject(logData);
    expect(redacted.user).toBe('admin');
    expect(redacted.password).toBe('[REDACTED_SECRET]');
    expect(redacted.jwt_secret).toBe('[REDACTED_SECRET]');
    expect(redacted.resend_api_key).toBe('[REDACTED_SECRET]');
    expect(redacted.metadata.token).toBe('[REDACTED_SECRET]');
    expect(redacted.metadata.action).toBe('USER_LOGIN');
  });

  it('4. PRIV-001 — should generate anonymous user identity replacement payload', () => {
    const anon = anonymizeUserData({ name: 'Ahmet Yılmaz', email: 'ahmet@example.com' });
    expect(anon.name).toBe('ANONYMOUS_USER');
    expect(anon.email).toContain('anon_');
    expect(anon.email).toContain('@deleted.msklabs.org');
  });

  it('5. PRIV-001 — should anonymize support ticket and enforce Legal Hold protection', async () => {
    // Mock Context without DB (Mock mode)
    const ctxMock = { env: {} } as any;
    const resMock = await anonymizeSupportTicket(ctxMock, 'MSK-2026-0001');
    expect(resMock.status).toBe(200);

    // Mock Context with DB containing Legal Hold item
    const ctxLegalHold = {
      env: {
        DB: {
          prepare: (sql: string) => ({
            bind: (...args: any[]) => ({
              first: async () => ({ id: args[0], is_legal_hold: 1 })
            })
          })
        }
      }
    } as any;

    const resLegalHold = await anonymizeSupportTicket(ctxLegalHold, 'MSK-2026-LEGAL');
    expect(resLegalHold.status).toBe(409);
    expect(resLegalHold.error?.code).toBe('LEGAL_HOLD_ACTIVE');
  });

  it('6. PRIV-001 — should process retention purge for expired records', async () => {
    const ctxMock = { env: {} } as any;
    const purgeRes = await processRetentionPurge(ctxMock, 365);
    expect(purgeRes.status).toBe(200);
    expect(purgeRes.data.retentionDays).toBe(365);
  });

});
