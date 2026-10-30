import { describe, it, expect } from 'vitest';
import {
  generateBackupFilename,
  computeSHA256,
  verifyBackupIntegrity,
  createBackupArtifact
} from '../scripts/d1_backup_helper.js';
import { verifyRestoreProcedure, parseSqlTables } from '../scripts/d1_restore_helper.js';
import fs from 'fs';
import path from 'path';

describe('SECTION 14 — BACKUP, DISASTER RECOVERY & BUSINESS CONTINUITY (DR-001 & DR-002)', () => {
  it('1. should generate valid timestamped backup filename and SHA-256 checksum', () => {
    const filename = generateBackupFilename(new Date('2026-10-09T14:00:00Z'));
    expect(filename).toContain('d1_backup_20261009_');
    expect(filename.endsWith('.sql')).toBe(true);

    const hash = computeSHA256('test sql content');
    expect(hash).toHaveLength(64); // SHA-256 hex length
  });

  it('2. should verify backup integrity (valid SQL vs 0-byte vs invalid structure)', () => {
    const validSql = 'CREATE TABLE messages (id TEXT); INSERT INTO messages VALUES ("m1");';
    const resValid = verifyBackupIntegrity(validSql);
    expect(resValid.valid).toBe(true);
    expect(resValid.sizeBytes).toBeGreaterThan(0);
    expect(resValid.error).toBeUndefined();

    const emptySql = '';
    const resEmpty = verifyBackupIntegrity(emptySql);
    expect(resEmpty.valid).toBe(false);
    expect(resEmpty.error).toBe('BACKUP_EMPTY_ZERO_BYTES');

    const corruptSql = 'Random noise text without any SQL statements';
    const resCorrupt = verifyBackupIntegrity(corruptSql);
    expect(resCorrupt.valid).toBe(false);
    expect(resCorrupt.error).toBe('BACKUP_INVALID_SQL_STRUCTURE');
  });

  it('3. should create backup artifact with JSON metadata and checksum', () => {
    const validSql = 'CREATE TABLE blog_posts (id TEXT); INSERT INTO blog_posts VALUES ("p1");';
    const tempDir = path.join(process.cwd(), 'scratch', 'test_backups');
    
    const res = createBackupArtifact(validSql, tempDir, new Date());
    expect(fs.existsSync(res.sqlPath)).toBe(true);
    expect(fs.existsSync(res.metaPath)).toBe(true);
    expect(res.metadata.integrityValid).toBe(true);
    expect(res.metadata.auditAction).toBe('D1_BACKUP_SUCCESS');

    // Clean up temp test files
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('4. DR-002 — should parse tables and calculate RPO/RTO metrics during restore verification', () => {
    const backupSql = `
      CREATE TABLE messages (id TEXT, body TEXT);
      CREATE TABLE blog_posts (id TEXT, title TEXT);
      CREATE TABLE users (id TEXT);
      CREATE TABLE post_revisions (id TEXT);
      INSERT INTO messages VALUES ('m1', 'hello');
      INSERT INTO blog_posts VALUES ('p1', 'post 1');
    `;

    const backupDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const res = verifyRestoreProcedure(backupSql, backupDate);

    expect(res.success).toBe(true);
    expect(res.tablesFound).toContain('messages');
    expect(res.tablesFound).toContain('blog_posts');
    expect(res.recordsCount.messages).toBe(1);
    expect(res.recordsCount.blog_posts).toBe(1);
    expect(res.rpoHours).toBeGreaterThanOrEqual(1.9);
    expect(res.rtoMs).toBeGreaterThan(0);
  });

  it('5. should verify DR-001 GitHub Actions workflow file exists and is valid', () => {
    const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'd1_backup.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);
    const yaml = fs.readFileSync(workflowPath, 'utf-8');
    expect(yaml).toContain('DR-001 Automated D1 Backup');
    expect(yaml).toContain('upload-artifact');
  });
});
