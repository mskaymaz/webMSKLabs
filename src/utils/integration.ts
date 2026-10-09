/**
 * INT-001, INT-002 & INT-TTS-001 — webMSKLabs Integration & TTS Pipeline Utilities ($0)
 */

export interface CompatibilityItem {
  domain: string;
  sourceOfTruth: 'MSKLabsDesk' | 'webMSKLabs';
  integrationMethod: string;
  status: 'VERIFIED' | 'COMPATIBLE';
}

export function getIntegrationCompatibilityMatrix(): CompatibilityItem[] {
  return [
    { domain: 'Article & Content', sourceOfTruth: 'MSKLabsDesk', integrationMethod: 'GET /api/v1/posts', status: 'VERIFIED' },
    { domain: 'Article Revision Number', sourceOfTruth: 'MSKLabsDesk', integrationMethod: 'revision_number metadata', status: 'VERIFIED' },
    { domain: 'Publication Lifecycle', sourceOfTruth: 'MSKLabsDesk', integrationMethod: 'status=PUBLISHED filter', status: 'VERIFIED' },
    { domain: 'Media Assets', sourceOfTruth: 'MSKLabsDesk', integrationMethod: 'R2 CDN URL', status: 'VERIFIED' },
    { domain: 'Audio / TTS Pipeline', sourceOfTruth: 'MSKLabsDesk', integrationMethod: 'GET /api/v1/posts/:slug/audio', status: 'VERIFIED' },
    { domain: 'i18n Dictionaries', sourceOfTruth: 'MSKLabsDesk', integrationMethod: 'Locale query param (tr/en/ar)', status: 'VERIFIED' },
    { domain: 'Public Presentation & Player', sourceOfTruth: 'webMSKLabs', integrationMethod: 'HTML5 Audio Player & UI', status: 'VERIFIED' }
  ];
}

export function verifyNonDestructiveMode(actionType: string): { allowed: boolean; reason?: string } {
  const writeActions = ['WRITE_PROD_DB', 'DELETE_PROD_RESOURCE', 'MUTATE_LIVE_CONFIG'];
  if (writeActions.includes(actionType.toUpperCase())) {
    return {
      allowed: false,
      reason: `Non-Destructive Integration Rule: Action ${actionType} is blocked on production during integration phase.`
    };
  }
  return { allowed: true };
}

export interface TtsAudioSyncStatus {
  active: boolean;
  status: 'APPROVED' | 'STALE' | 'NOT_APPROVED' | 'UNAVAILABLE';
  reason?: string;
}

export function checkTtsAudioSyncInvariants(
  articleRevision: number,
  audioVersion: number,
  audioStatus: string
): TtsAudioSyncStatus {
  if (audioStatus !== 'APPROVED') {
    return {
      active: false,
      status: 'NOT_APPROVED',
      reason: `TTS Audio status is ${audioStatus}, expected APPROVED`
    };
  }

  if (articleRevision > audioVersion) {
    return {
      active: false,
      status: 'STALE',
      reason: `Article revision (${articleRevision}) is newer than audio version (${audioVersion})`
    };
  }

  if (articleRevision === audioVersion) {
    return {
      active: true,
      status: 'APPROVED'
    };
  }

  return {
    active: false,
    status: 'UNAVAILABLE',
    reason: `Audio version mismatch: article=${articleRevision}, audio=${audioVersion}`
  };
}
