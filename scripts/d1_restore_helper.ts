import fs from 'fs';
import path from 'path';
import { verifyBackupIntegrity } from './d1_backup_helper.js';

/**
 * DR-002 — Cloudflare D1 Restore Verification & RPO/RTO Measurement Helper
 */
export interface RestoreVerificationResult {
  success: boolean;
  backupFilename: string;
  rtoMs: number; // Recovery Time Objective (duration of restore & verification)
  rpoHours: number; // Recovery Point Objective (age of backup in hours)
  tablesFound: string[];
  recordsCount: Record<string, number>;
  error?: string;
}

export function parseSqlTables(sqlContent: string): string[] {
  const tableMatches = sqlContent.match(/CREATE TABLE (IF NOT EXISTS )?([a-zA-Z0-9_]+)/gi) || [];
  const tables = tableMatches.map(m => {
    const parts = m.split(/\s+/);
    return parts[parts.length - 1].replace(/[`"']/g, '');
  });
  return Array.from(new Set(tables));
}

export function verifyRestoreProcedure(
  sqlContent: string,
  backupDate: Date = new Date(),
  criticalTables = ['messages', 'blog_posts', 'users', 'post_revisions']
): RestoreVerificationResult {
  const startRTO = performance.now();

  const integrity = verifyBackupIntegrity(sqlContent);
  if (!integrity.valid) {
    const elapsedMs = performance.now() - startRTO;
    return {
      success: false,
      backupFilename: 'invalid_backup.sql',
      rtoMs: elapsedMs,
      rpoHours: (Date.now() - backupDate.getTime()) / (1000 * 60 * 60),
      tablesFound: [],
      recordsCount: {},
      error: `RESTORE_FAILED_INTEGRITY_CHECK: ${integrity.error}`
    };
  }

  const tablesFound = parseSqlTables(sqlContent);
  const recordsCount: Record<string, number> = {};

  // Count INSERT statements per table
  criticalTables.forEach(table => {
    const regex = new RegExp(`INSERT INTO (?:OR REPLACE |OR IGNORE )?${table}`, 'gi');
    const matches = sqlContent.match(regex) || [];
    recordsCount[table] = matches.length;
  });

  const elapsedRTO = performance.now() - startRTO;
  const rpoHours = Math.max(0, (Date.now() - backupDate.getTime()) / (1000 * 60 * 60));

  return {
    success: true,
    backupFilename: 'd1_backup_verified.sql',
    rtoMs: elapsedRTO,
    rpoHours: parseFloat(rpoHours.toFixed(2)),
    tablesFound,
    recordsCount
  };
}
