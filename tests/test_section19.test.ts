import { describe, it, expect } from 'vitest';
import { evaluate16Gates, computeGoNoGoDecision, recordGoLiveAuditDecision } from '../scripts/go_live_evaluator';

describe('SECTION 19 — PRODUCTION READINESS & GO-LIVE CHECKLIST (GO-001)', () => {

  it('1. GO-001 — should evaluate all 16 core verification gates', () => {
    const gates = evaluate16Gates();
    expect(gates).toHaveLength(16);

    const gateNames = gates.map(g => g.name);
    expect(gateNames).toContain('Architecture & Foundation Gate');
    expect(gateNames).toContain('Security & Authentication Gate');
    expect(gateNames).toContain('Secrets & Environment Isolation Gate');
    expect(gateNames).toContain('Database & Migration Gate');
    expect(gateNames).toContain('Deployment Verification Gate');
    expect(gateNames).toContain('API & Health Gate');
    expect(gateNames).toContain('CMS & Content Governance Gate');
    expect(gateNames).toContain('TTS / Audio Pipeline Gate');
    expect(gateNames).toContain('AI & Human-in-the-Loop Gate');
    expect(gateNames).toContain('Communication & Queue Gate');
    expect(gateNames).toContain('Privacy & Compliance Gate');
    expect(gateNames).toContain('Observability & Incident Response Gate');
    expect(gateNames).toContain('Backup & Disaster Recovery Gate');
    expect(gateNames).toContain('Performance & Scalability Gate');
    expect(gateNames).toContain('Accessibility & i18n Gate');
    expect(gateNames).toContain('webMSKLabs Integration Gate');
  });

  it('2. GO-001 — should yield GO decision when all 16 gates pass', () => {
    const gates = evaluate16Gates();
    const decision = computeGoNoGoDecision(gates);
    expect(decision).toBe('GO');
  });

  it('3. GO-001 — should yield NO-GO decision when any P0 gate fails (Security / DB / Foundation)', () => {
    const gates = evaluate16Gates();
    const securityGate = gates.find(g => g.name === 'Security & Authentication Gate');
    if (securityGate) securityGate.passed = false;

    const decision = computeGoNoGoDecision(gates);
    expect(decision).toBe('NO_GO');
  });

  it('4. GO-001 — should yield NO-GO decision when any P1 gate fails (Deployment / Backup / Verification)', () => {
    const gates = evaluate16Gates();
    const deployGate = gates.find(g => g.name === 'Deployment Verification Gate');
    if (deployGate) deployGate.passed = false;

    const decision = computeGoNoGoDecision(gates);
    expect(decision).toBe('NO_GO');
  });

  it('5. GO-001 — should yield CONDITIONAL-GO decision when only P2 non-blocker gate fails', () => {
    const gates = evaluate16Gates();
    const p2Gate = gates.find(g => g.category === 'P2');
    if (p2Gate) p2Gate.passed = false;

    const decision = computeGoNoGoDecision(gates);
    expect(decision).toBe('CONDITIONAL_GO');
  });

  it('6. GO-001 — should record Go-Live audit decision report', async () => {
    const ctxMock = { env: {} } as any;
    const report = await recordGoLiveAuditDecision(ctxMock, 'v1.0.0-final');
    expect(report.decision).toBe('GO');
    expect(report.passedGatesCount).toBe(16);
    expect(report.totalGatesCount).toBe(16);
    expect(report.auditRecorded).toBe(true);
  });

});
