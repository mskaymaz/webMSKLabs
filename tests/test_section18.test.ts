import { describe, it, expect } from 'vitest';
import {
  getIntegrationCompatibilityMatrix,
  verifyNonDestructiveMode,
  checkTtsAudioSyncInvariants
} from '../src/utils/integration';
import fs from 'fs';
import path from 'path';

describe('SECTION 18 — WEBMSKLABS INTEGRATION (INT-001, INT-002 & INT-TTS-001)', () => {

  it('1. INT-001 — should verify presence of integration documentation guides', () => {
    const doc1 = path.join(process.cwd(), '..', 'MSKLabsDesk', 'webMSKLabs_cms_integration.md');
    const doc2 = path.join(process.cwd(), '..', 'MSKLabsDesk', 'webMSKLabs_integration_guide.md');

    expect(fs.existsSync(doc1)).toBe(true);
    expect(fs.existsSync(doc2)).toBe(true);
  });

  it('2. INT-001 — should verify Source of Truth assignments in compatibility matrix', () => {
    const matrix = getIntegrationCompatibilityMatrix();
    expect(matrix.length).toBe(7);

    const articleItem = matrix.find(m => m.domain === 'Article & Content');
    expect(articleItem?.sourceOfTruth).toBe('MSKLabsDesk');

    const playerItem = matrix.find(m => m.domain === 'Public Presentation & Player');
    expect(playerItem?.sourceOfTruth).toBe('webMSKLabs');
  });

  it('3. INT-002 — should enforce Non-Destructive integration rule on production mutative actions', () => {
    const readOnlyCheck = verifyNonDestructiveMode('READ_PUBLIC_POSTS');
    expect(readOnlyCheck.allowed).toBe(true);

    const mutativeCheck = verifyNonDestructiveMode('WRITE_PROD_DB');
    expect(mutativeCheck.allowed).toBe(false);
    expect(mutativeCheck.reason).toContain('Non-Destructive Integration Rule');
  });

  it('4. INT-TTS-001 — should pass active audio stream when article revision matches audio version and status is APPROVED', () => {
    const res = checkTtsAudioSyncInvariants(3, 3, 'APPROVED');
    expect(res.active).toBe(true);
    expect(res.status).toBe('APPROVED');
  });

  it('5. INT-TTS-001 — should mark audio as STALE and deactivate stream when article revision is newer than audio version', () => {
    const res = checkTtsAudioSyncInvariants(4, 3, 'APPROVED');
    expect(res.active).toBe(false);
    expect(res.status).toBe('STALE');
    expect(res.reason).toContain('Article revision (4) is newer than audio version (3)');
  });

  it('6. INT-TTS-001 — should reject stream when audio status is not APPROVED', () => {
    const res = checkTtsAudioSyncInvariants(2, 2, 'DRAFT');
    expect(res.active).toBe(false);
    expect(res.status).toBe('NOT_APPROVED');
  });

});
