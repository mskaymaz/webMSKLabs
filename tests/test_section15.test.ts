import { describe, it, expect } from 'vitest';
import { validateCatalogApp, processAppsImport } from '../scripts/import_apps_catalog.js';
import { parseGoogleSheetsJson, runGoogleSheetsImport } from '../scripts/import_google_sheets.js';
import { checkLineLimits } from '../scripts/check_line_limit.js';
import { checkI18nKeys } from '../scripts/check_i18n_keys.js';
import fs from 'fs';
import path from 'path';

describe('SECTION 15 — TESTING, QUALITY & CI/CD (TEST-001, TEST-002 & TEST-003)', () => {
  it('1. TEST-001 — should validate catalog app schema and handle duplicate slugs', () => {
    const validApp = { slug: 'app-1', name_tr: 'Uygulama 1', category: 'DEV', description_tr: 'Açıklama' };
    const invalidApp = { slug: '', name_tr: '' };

    expect(validateCatalogApp(validApp).valid).toBe(true);
    expect(validateCatalogApp(invalidApp).valid).toBe(false);

    const items = [
      validApp,
      { slug: 'app-1', name_tr: 'Uygulama 1 Kopya', category: 'DEV' }, // Duplicate slug
      { slug: 'app-2', category: 'DEV' } // Missing name
    ];

    const res = processAppsImport(items, true);
    expect(res.summary.total).toBe(3);
    expect(res.summary.imported).toBe(1);
    expect(res.summary.skipped).toBe(1);
    expect(res.summary.failed).toBe(1);
    expect(res.summary.isDryRun).toBe(true);
  });

  it('2. TEST-001 — should parse Google Sheets JSON/CSV and run import with dry-run support', () => {
    const jsonStr = JSON.stringify([
      { slug: 'sheet-app-1', name: 'Sheet App', category: 'TOOLS', description: 'Desc' }
    ]);

    const res = runGoogleSheetsImport(jsonStr, true);
    expect(res.summary.imported).toBe(1);
    expect(res.sqlStatements.length).toBe(1);
    expect(res.sqlStatements[0]).toContain('INSERT INTO apps_catalog');
    expect(res.sqlStatements[0]).toContain('ON CONFLICT(slug) DO UPDATE');
  });

  it('3. TEST-003 — should check line limit quality gate (max 450 lines per file)', () => {
    const res = checkLineLimits();
    expect(res.totalFilesChecked).toBeGreaterThan(0);
    expect(res.passed).toBe(true);
    expect(res.exceededFiles).toEqual([]);
  });

  it('4. TEST-003 — should verify i18n key consistency quality gate across TR/EN/AR dictionaries', () => {
    const trDict = { 'nav.home': 'Ana Sayfa', 'nav.blog': 'Blog' };
    const enDict = { 'nav.home': 'Home', 'nav.blog': 'Blog' };
    const arDict = { 'nav.home': 'الرئيسية', 'nav.blog': 'المدونة' };

    const resValid = checkI18nKeys(trDict, enDict, arDict);
    expect(resValid.passed).toBe(true);
    expect(resValid.missingKeys.en).toHaveLength(0);

    const enIncomplete = { 'nav.home': 'Home' }; // Missing nav.blog
    const resInvalid = checkI18nKeys(trDict, enIncomplete, arDict);
    expect(resInvalid.passed).toBe(false);
    expect(resInvalid.missingKeys.en).toContain('nav.blog');
  });

  it('5. TEST-002 / TEST-003 — should confirm CI workflow file exists with 5 Quality Gates', () => {
    const ciPath = path.join(process.cwd(), '.github', 'workflows', 'ci.yml');
    expect(fs.existsSync(ciPath)).toBe(true);
    const yaml = fs.readFileSync(ciPath, 'utf-8');

    expect(yaml).toContain('Quality Gate 1');
    expect(yaml).toContain('Quality Gate 2');
    expect(yaml).toContain('Quality Gate 3');
    expect(yaml).toContain('Quality Gate 4');
    expect(yaml).toContain('Quality Gate 5');
  });
});
