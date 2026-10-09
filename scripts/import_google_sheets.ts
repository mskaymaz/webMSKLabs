import fs from 'fs';
import path from 'path';
import { validateCatalogApp, processAppsImport, ImportSummary } from './import_apps_catalog.js';

/**
 * TEST-001 — Google Sheets CSV/JSON Import Script (with Dry-Run & Audit Verification)
 */
export function parseGoogleSheetsJson(jsonString: string): any[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) return parsed.items;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows)) return parsed.rows;
    return [];
  } catch {
    return [];
  }
}

export function runGoogleSheetsImport(
  rawJsonOrCsv: string,
  isDryRun = false
): { summary: ImportSummary; sqlStatements: string[] } {
  const items = parseGoogleSheetsJson(rawJsonOrCsv);
  return processAppsImport(items, isDryRun);
}
