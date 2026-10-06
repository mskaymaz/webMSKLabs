import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('DATA-003 — D1 Database Binding & Configuration Tests', () => {
  const wranglerPath = path.join(process.cwd(), 'wrangler.toml');
  const migrationDir = path.join(process.cwd(), 'migrations');

  it('1. should verify wrangler.toml contains valid D1 database binding configuration', () => {
    expect(fs.existsSync(wranglerPath)).toBe(true);
    const content = fs.readFileSync(wranglerPath, 'utf-8');

    expect(content).toContain('[[d1_databases]]');
    expect(content).toContain('binding = "DB"');
    expect(content).toContain('database_name = "msklabsdesk_db"');
    expect(content).toContain('migrations_dir = "migrations"');
  });

  it('2. should verify all 5 core migration files exist in migrations directory', () => {
    expect(fs.existsSync(migrationDir)).toBe(true);

    const expectedFiles = [
      '0001_devadmin_initial_schema.sql',
      '0002_seed_devadmin.sql',
      '0003_seed_tickets_comments.sql',
      '0004_add_broadcasts_table.sql',
      '0005_cms_schema.sql'
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(migrationDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('3. should verify local SQLite/D1 state file exists under .wrangler directory', () => {
    const wranglerStateDir = path.join(process.cwd(), '.wrangler', 'state');
    expect(fs.existsSync(wranglerStateDir)).toBe(true);
  });
});
