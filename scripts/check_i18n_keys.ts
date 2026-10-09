import fs from 'fs';
import path from 'path';

/**
 * TEST-003 / I18N-003 — i18n Key Consistency Quality Gate Validator
 */
export interface I18nCheckResult {
  passed: boolean;
  localesChecked: string[];
  missingKeys: Record<string, string[]>;
}

export function checkI18nKeys(
  trDictionary: Record<string, string>,
  enDictionary: Record<string, string>,
  arDictionary: Record<string, string>
): I18nCheckResult {
  const trKeys = Object.keys(trDictionary);
  const missingKeys: Record<string, string[]> = {
    en: [],
    ar: []
  };

  trKeys.forEach(key => {
    if (!(key in enDictionary)) {
      missingKeys.en.push(key);
    }
    if (!(key in arDictionary)) {
      missingKeys.ar.push(key);
    }
  });

  const passed = missingKeys.en.length === 0 && missingKeys.ar.length === 0;

  return {
    passed,
    localesChecked: ['tr', 'en', 'ar'],
    missingKeys
  };
}
