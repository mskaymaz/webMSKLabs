import fs from 'fs';
import path from 'path';

/**
 * TEST-001 — Apps Catalog Data Import Script (with Dry-Run, Idempotency & Schema Validation)
 */
export interface CatalogAppItem {
  slug: string;
  name_tr: string;
  name_en?: string;
  category: string;
  description_tr: string;
  description_en?: string;
  icon?: string;
  is_active?: boolean;
}

export interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ index: number; slug?: string; error: string }>;
  isDryRun: boolean;
}

export function validateCatalogApp(item: any): { valid: boolean; error?: string } {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'ITEM_NOT_AN_OBJECT' };
  }
  if (!item.slug || typeof item.slug !== 'string' || !item.slug.trim()) {
    return { valid: false, error: 'MISSING_MANDATORY_SLUG' };
  }
  if (!item.name_tr && !item.name) {
    return { valid: false, error: 'MISSING_MANDATORY_NAME' };
  }
  if (!item.category || typeof item.category !== 'string') {
    return { valid: false, error: 'MISSING_MANDATORY_CATEGORY' };
  }
  return { valid: true };
}

export function processAppsImport(
  items: any[],
  isDryRun = false
): { summary: ImportSummary; sqlStatements: string[] } {
  const summary: ImportSummary = {
    total: items.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    isDryRun
  };

  const seenSlugs = new Set<string>();
  const sqlStatements: string[] = [];

  items.forEach((raw, idx) => {
    const val = validateCatalogApp(raw);
    if (!val.valid) {
      summary.failed++;
      summary.errors.push({ index: idx, slug: raw?.slug, error: val.error || 'INVALID_SCHEMA' });
      return;
    }

    const cleanSlug = String(raw.slug).trim().toLowerCase();
    if (seenSlugs.has(cleanSlug)) {
      summary.skipped++;
      summary.errors.push({ index: idx, slug: cleanSlug, error: 'DUPLICATE_SLUG_IN_PAYLOAD' });
      return;
    }
    seenSlugs.add(cleanSlug);

    const nameTr = (raw.name_tr || raw.name || '').trim();
    const category = (raw.category || 'GENERAL').trim();
    const descTr = (raw.description_tr || raw.description || '').trim();
    const icon = (raw.icon || 'default-icon').trim();
    const isActive = raw.is_active !== undefined ? (raw.is_active ? 1 : 0) : 1;

    // UPSERT query for D1 / SQLite idempotency
    const sql = `INSERT INTO apps_catalog (slug, name_tr, category, description_tr, icon, is_active) ` +
      `VALUES ('${cleanSlug}', '${nameTr.replace(/'/g, "''")}', '${category.replace(/'/g, "''")}', ` +
      `'${descTr.replace(/'/g, "''")}', '${icon}', ${isActive}) ` +
      `ON CONFLICT(slug) DO UPDATE SET name_tr = excluded.name_tr, category = excluded.category, ` +
      `description_tr = excluded.description_tr, icon = excluded.icon, is_active = excluded.is_active;`;

    sqlStatements.push(sql);
    summary.imported++;
  });

  return { summary, sqlStatements };
}
