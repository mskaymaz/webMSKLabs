import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { mainRouter } from '../src/routes/index.js';
import { generateToken } from '../src/utils/crypto.js';
import { AdSettingSchema, AdClientSchema } from '../src/services/adService.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

function createMockEnv(db: any) {
  return {
    JWT_SECRET: 'test-secret-key-32-chars-long-security',
    DB: {
      prepare(query: string) {
        return {
          bind(...args: any[]) {
            return {
              async first() {
                const stmt = db.prepare(query);
                return stmt.get(...args) || null;
              },
              async all() {
                const stmt = db.prepare(query);
                const results = stmt.all(...args);
                return { results, success: true };
              },
              async run() {
                const stmt = db.prepare(query);
                const info = stmt.run(...args);
                return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
              }
            };
          },
          async first() {
            const stmt = db.prepare(query);
            return stmt.get() || null;
          },
          async all() {
            const stmt = db.prepare(query);
            const results = stmt.all();
            return { results, success: true };
          }
        };
      }
    }
  };
}

describe('ADS-001 & ADS-002 — AdSense & Monetization API & Security Test Suite', () => {
  let db: any;
  let superAdminToken: string;
  let adminToken: string;
  let editorToken: string;

  beforeEach(async () => {
    db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS ad_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        is_enabled INTEGER DEFAULT 0 CHECK(is_enabled IN (0, 1)),
        ad_client TEXT,
        ad_slot TEXT,
        preset_size TEXT DEFAULT 'RESPONSIVE',
        custom_width INTEGER,
        custom_height INTEGER,
        margin_top INTEGER DEFAULT 16,
        margin_bottom INTEGER DEFAULT 16,
        is_sticky INTEGER DEFAULT 0 CHECK(is_sticky IN (0, 1)),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        action TEXT NOT NULL,
        resource TEXT,
        details_json TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO ad_settings (slot_key, title, is_enabled, preset_size, is_sticky) VALUES
      ('header_banner', 'Header Banner', 0, 'RESPONSIVE', 0),
      ('sidebar_top', 'Sidebar Top', 0, 'RESPONSIVE', 0),
      ('post_in_article', 'In-Article', 0, 'RESPONSIVE', 0),
      ('footer_sticky', 'Footer Sticky', 0, 'RESPONSIVE', 1);
    `);

    superAdminToken = await generateToken({ admin_id: 1, username: 'superadmin', role: 'SUPER_ADMIN' }, 'test-secret-key-32-chars-long-security');
    adminToken = await generateToken({ admin_id: 3, username: 'adminuser', role: 'ADMIN' }, 'test-secret-key-32-chars-long-security');
    editorToken = await generateToken({ admin_id: 2, username: 'editoruser', role: 'EDITOR' }, 'test-secret-key-32-chars-long-security');
  });

  describe('1. Zod Validation & Security Sanitization', () => {
    it('should validate correct ad_client format (ca-pub-1234567890123456)', () => {
      const valid = AdClientSchema.safeParse('ca-pub-1234567890123456');
      expect(valid.success).toBe(true);
    });

    it('should reject invalid ad_client containing script tags or invalid strings', () => {
      expect(AdClientSchema.safeParse('<script>alert(1)</script>').success).toBe(false);
      expect(AdClientSchema.safeParse('javascript:void(0)').success).toBe(false);
      expect(AdClientSchema.safeParse('ca-pub-abc').success).toBe(false);
      expect(AdClientSchema.safeParse('random-string').success).toBe(false);
    });

    it('should enforce custom_width (50-1200) and custom_height (30-800) boundaries', () => {
      expect(AdSettingSchema.partial().safeParse({ custom_width: 10 }).success).toBe(false); // Too small
      expect(AdSettingSchema.partial().safeParse({ custom_width: 2000 }).success).toBe(false); // Too large
      expect(AdSettingSchema.partial().safeParse({ custom_width: 300 }).success).toBe(true); // Valid

      expect(AdSettingSchema.partial().safeParse({ custom_height: 5 }).success).toBe(false); // Too small
      expect(AdSettingSchema.partial().safeParse({ custom_height: 9999 }).success).toBe(false); // Too large
      expect(AdSettingSchema.partial().safeParse({ custom_height: 250 }).success).toBe(true); // Valid
    });

    it('should enforce margin_top and margin_bottom (0-100) boundaries', () => {
      expect(AdSettingSchema.partial().safeParse({ margin_top: -10 }).success).toBe(false);
      expect(AdSettingSchema.partial().safeParse({ margin_top: 200 }).success).toBe(false);
      expect(AdSettingSchema.partial().safeParse({ margin_top: 16 }).success).toBe(true);
    });
  });

  describe('2. API Endpoints, RBAC & Audit Logging', () => {
    it('should return 200 and list of ad settings for SUPER_ADMIN', async () => {
      const req = new Request('http://localhost/api/v1/admin/ads', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${superAdminToken}` }
      });

      const ctx: any = {
        request: req,
        url: new URL(req.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'test-req-id',
        env: createMockEnv(db)
      };

      const res = await mainRouter.handle(ctx);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.ads).toHaveLength(4);
    });

    it('should return 403 Forbidden when EDITOR attempts to access /ads API', async () => {
      const req = new Request('http://localhost/api/v1/admin/ads', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${editorToken}` }
      });

      const ctx: any = {
        request: req,
        url: new URL(req.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'test-req-id',
        env: createMockEnv(db)
      };

      const res = await mainRouter.handle(ctx);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when ADMIN (non-SUPER_ADMIN) attempts to access /ads API', async () => {
      const req = new Request('http://localhost/api/v1/admin/ads', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      const ctx: any = {
        request: req,
        url: new URL(req.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'test-req-id',
        env: createMockEnv(db)
      };

      const res = await mainRouter.handle(ctx);
      expect(res.status).toBe(403);
    });

    it('should update ad setting and log UPDATE_AD_SLOT audit event on PUT /ads/1', async () => {
      const req = new Request('http://localhost/api/v1/admin/ads/1', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ad_client: 'ca-pub-9876543210123456',
          ad_slot: '1234567890',
          preset_size: '728x90',
          is_enabled: 1
        })
      });

      const ctx: any = {
        request: req,
        url: new URL(req.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'test-req-id',
        env: createMockEnv(db)
      };

      const res = await mainRouter.handle(ctx);
      expect(res.status).toBe(200);

      const updated = db.prepare('SELECT ad_client, is_enabled FROM ad_settings WHERE id = 1;').get();
      expect(updated.ad_client).toBe('ca-pub-9876543210123456');
      expect(updated.is_enabled).toBe(1);

      const audit = db.prepare("SELECT action FROM admin_audit_logs WHERE action IN ('UPDATE_AD_SLOT', 'TOGGLE_AD_SLOT');").get();
      expect(audit).toBeTruthy();
    });

    it('should verify DRAFT -> PREVIEW -> PUBLISH boundary (draft state does not mutate DB until explicit publish)', async () => {
      // 1. Read existing production value
      const initial = db.prepare('SELECT ad_client, is_enabled FROM ad_settings WHERE id = 1;').get();
      expect(initial.ad_client).toBeNull();
      expect(initial.is_enabled).toBe(0);

      // 2 & 3. Simulated Draft Change & Preview in Frontend UI state
      const draftState = {
        ad_client: 'ca-pub-1111222233334444',
        ad_slot: '9988776655',
        preset_size: '300x250',
        is_enabled: 1
      };

      // 4. Verify Production DB remains unchanged before Publish
      const currentProd = db.prepare('SELECT ad_client, is_enabled FROM ad_settings WHERE id = 1;').get();
      expect(currentProd.ad_client).toBeNull();
      expect(currentProd.is_enabled).toBe(0);

      // 5. Publish action (Backend API PUT call)
      const req = new Request('http://localhost/api/v1/admin/ads/1', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(draftState)
      });

      const ctx: any = {
        request: req,
        url: new URL(req.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'test-req-id',
        env: createMockEnv(db)
      };

      const res = await mainRouter.handle(ctx);
      expect(res.status).toBe(200);

      // 6. Verify Production DB now reflects published value
      const finalProd = db.prepare('SELECT ad_client, is_enabled FROM ad_settings WHERE id = 1;').get();
      expect(finalProd.ad_client).toBe('ca-pub-1111222233334444');
      expect(finalProd.is_enabled).toBe(1);
    });

    it('should return 400 Bad Request when updating ad setting with script injection in ad_client', async () => {
      const req = new Request('http://localhost/api/v1/admin/ads/1', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ad_client: '<script>alert("xss")</script>'
        })
      });

      const ctx: any = {
        request: req,
        url: new URL(req.url),
        corsHeaders: { 'Access-Control-Allow-Origin': '*' },
        requestId: 'test-req-id',
        env: createMockEnv(db)
      };

      const res = await mainRouter.handle(ctx);
      expect(res.status).toBe(400);
    });
  });
});
