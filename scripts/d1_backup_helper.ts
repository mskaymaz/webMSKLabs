import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * DR-001 — Cloudflare D1 Automated Backup & Integrity Check Helper
 */
export function generateBackupFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `d1_backup_${yyyy}${mm}${dd}_${hh}${min}${ss}.sql`;
}

export function computeSHA256(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export interface BackupIntegrityResult {
  valid: boolean;
  sizeBytes: number;
  checksum: string;
  error?: string;
}

export function verifyBackupIntegrity(content: string | Buffer): BackupIntegrityResult {
  const sizeBytes = Buffer.byteLength(content);
  const checksum = computeSHA256(content);

  if (sizeBytes === 0) {
    return { valid: false, sizeBytes, checksum, error: 'BACKUP_EMPTY_ZERO_BYTES' };
  }

  const str = content.toString('utf-8');
  if (!str.includes('CREATE TABLE') && !str.includes('INSERT INTO') && !str.includes('PRAGMA')) {
    return { valid: false, sizeBytes, checksum, error: 'BACKUP_INVALID_SQL_STRUCTURE' };
  }

  return { valid: true, sizeBytes, checksum };
}

export function createBackupArtifact(
  sqlContent: string,
  backupDir = path.join(process.cwd(), 'backups'),
  date = new Date()
) {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = generateBackupFilename(date);
  const sqlPath = path.join(backupDir, filename);
  fs.writeFileSync(sqlPath, sqlContent, 'utf-8');

  const integrity = verifyBackupIntegrity(sqlContent);
  const metadata = {
    filename,
    timestamp: date.toISOString(),
    sizeBytes: integrity.sizeBytes,
    checksum: integrity.checksum,
    integrityValid: integrity.valid,
    error: integrity.error || null,
    auditAction: integrity.valid ? 'D1_BACKUP_SUCCESS' : 'D1_BACKUP_FAILED'
  };

  const metaPath = path.join(backupDir, `${filename}.json`);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return { sqlPath, metaPath, metadata, integrity };
}
