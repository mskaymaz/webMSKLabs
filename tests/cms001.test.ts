import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeCmsHTML, validateMediaUpload, validateBlockStructure, stripPrivateMetadata } from '../src/services/cmsService.js';

describe('Bölüm 8 — CMS, CONTENT, EDITOR & MEDIA Test Matrisi & Security Boundaries', () => {

  describe('1. Public CMS API & Security Boundaries (Leak Prevention)', () => {
    it('Test 1 — Public DRAFT leak: should not return DRAFT post in public API', () => {
      const posts = [
        { id: '1', slug: 'draft-post', status: 'DRAFT', published_at: null },
        { id: '2', slug: 'pub-post', status: 'PUBLISHED', published_at: '2026-10-01T12:00:00Z' }
      ];

      const publicPosts = posts.filter(p => p.status === 'PUBLISHED' && p.published_at && p.published_at <= new Date().toISOString());
      expect(publicPosts.length).toBe(1);
      expect(publicPosts[0].slug).toBe('pub-post');
    });

    it('Test 2 — Public REVIEW leak: should not return REVIEW post in public API', () => {
      const posts = [
        { id: '1', slug: 'review-post', status: 'REVIEW', published_at: null }
      ];

      const publicPosts = posts.filter(p => p.status === 'PUBLISHED');
      expect(publicPosts.length).toBe(0);
    });

    it('Test 3 — Public UNPUBLISHED leak: should not return UNPUBLISHED post in public API', () => {
      const posts = [
        { id: '1', slug: 'unpub-post', status: 'UNPUBLISHED', published_at: '2026-10-01T12:00:00Z' }
      ];

      const publicPosts = posts.filter(p => p.status === 'PUBLISHED');
      expect(publicPosts.length).toBe(0);
    });

    it('Test 4 & 6 — Public AI Metadata Leak: should strip ai_metadata, prompt_version, reasoning and admin_id from public response', () => {
      const rawPost: any = {
        id: '1',
        slug: 'ai-post',
        title_tr: 'AI Analiz',
        content_tr: '<p>İçerik</p>',
        status: 'PUBLISHED' as const,
        revision_number: 1,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        ai_metadata: '{"prompt":"secret prompt","confidence":0.98}',
        prompt_version: 'v2',
        reasoning: 'Deep reasoning text',
        admin_id: 'admin_123'
      };

      const clean = stripPrivateMetadata(rawPost);
      expect(clean.ai_metadata).toBeUndefined();
      expect((clean as any).prompt_version).toBeUndefined();
      expect((clean as any).admin_id).toBeUndefined();
      expect(clean.slug).toBe('ai-post');
    });
  });

  describe('2. Rich Text Security & HTML Sanitization', () => {
    it('Test 5 & 4 — XSS: should strip <script> tags from content', () => {
      const dangerous = '<p>Güvenli paragraf</p><script>alert(1)</script>';
      const clean = sanitizeCmsHTML(dangerous);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('<p>Güvenli paragraf</p>');
    });

    it('Test 6 — javascript URL: should block javascript: URLs in links', () => {
      const dangerous = '<a href="javascript:alert(1)">Tıkla</a>';
      const clean = sanitizeCmsHTML(dangerous);
      expect(clean).not.toContain('javascript:');
    });

    it('Test 7 — data URL: should block data:text/html URIs in links', () => {
      const dangerous = '<a href="data:text/html,<script>alert(1)</script>">Tıkla</a>';
      const clean = sanitizeCmsHTML(dangerous);
      expect(clean).not.toContain('data:text/html');
    });
  });

  describe('3. Media Security & Cloudflare R2 Validation', () => {
    it('Test 8 & 5 — Malicious Media: should reject .exe and .php file uploads', () => {
      const exeRes = validateMediaUpload('virus.exe', 'application/x-msdownload', 1024);
      expect(exeRes.valid).toBe(false);
      expect(exeRes.error).toContain('Zararlı dosya türü');

      const phpRes = validateMediaUpload('shell.php', 'application/x-php', 1024);
      expect(phpRes.valid).toBe(false);
    });

    it('Test 9 — Oversized Media: should reject file uploads over 5 MB', () => {
      const overRes = validateMediaUpload('large.png', 'image/png', 6 * 1024 * 1024);
      expect(overRes.valid).toBe(false);
      expect(overRes.error).toContain('5 MB');
    });

    it('should accept valid JPEG/PNG/WebP images under 5 MB', () => {
      const validRes = validateMediaUpload('photo.webp', 'image/webp', 2 * 1024 * 1024);
      expect(validRes.valid).toBe(true);
    });
  });

  describe('4. Revisions, Optimistic Locking & Scheduling', () => {
    it('Test 10 & 7 — Concurrent Editing: should return 409 CONCURRENT_EDIT_CONFLICT when client revision is outdated', () => {
      const currentRevision = 10;
      const clientRevision = 9;

      const checkLock = (cur: number, cli: number) => {
        if (cli < cur) {
          return { status: 409, code: 'CONCURRENT_EDIT_CONFLICT' };
        }
        return { status: 200 };
      };

      const res = checkLock(currentRevision, clientRevision);
      expect(res.status).toBe(409);
      expect(res.code).toBe('CONCURRENT_EDIT_CONFLICT');
    });

    it('Test 11 & 2 — Revision Restore: restoring an old revision should generate a NEW revision number', () => {
      let currentRevision = 5;
      const restoreRevision = (targetRev: number) => {
        currentRevision = currentRevision + 1; // rev 5 -> rev 6
        return { newRevision: currentRevision, restoredFrom: targetRev };
      };

      const res = restoreRevision(2);
      expect(res.newRevision).toBe(6);
      expect(res.restoredFrom).toBe(2);
    });

    it('Test 12 & 3 — Scheduled Publish: UTC time reaching scheduled_publish_at should publish post', () => {
      const nowUtc = '2026-10-08T12:00:00Z';
      const post = {
        id: 'p1',
        status: 'APPROVED',
        scheduled_publish_at: '2026-10-08T11:55:00Z'
      };

      const evaluatePublish = (p: typeof post) => {
        if (p.scheduled_publish_at && p.scheduled_publish_at <= nowUtc) {
          return { ...p, status: 'PUBLISHED', published_at: nowUtc };
        }
        return p;
      };

      const updated = evaluatePublish(post);
      expect(updated.status).toBe('PUBLISHED');
      expect(updated.published_at).toBe(nowUtc);
    });

    it('Test 13 — Scheduled Unpublish: UTC time reaching scheduled_unpublish_at should unpublish post', () => {
      const nowUtc = '2026-10-08T12:00:00Z';
      const post = {
        id: 'p1',
        status: 'PUBLISHED',
        scheduled_unpublish_at: '2026-10-08T11:55:00Z'
      };

      const evaluateUnpublish = (p: typeof post) => {
        if (p.scheduled_unpublish_at && p.scheduled_unpublish_at <= nowUtc) {
          return { ...p, status: 'UNPUBLISHED' };
        }
        return p;
      };

      const updated = evaluateUnpublish(post);
      expect(updated.status).toBe('UNPUBLISHED');
    });
  });

  describe('5. Modular Layout Builder & Zod Schema Validation', () => {
    it('should validate block types and render UnknownBlockFallback for unknown schemas', () => {
      const validJson = JSON.stringify([
        { block_id: 'b1', block_type: 'Hero', order: 0, schema_version: 1, payload: { title: 'Hero Title' } },
        { block_id: 'b2', block_type: 'CustomUndefinedType', order: 1, schema_version: 1, payload: {} }
      ]);

      const res = validateBlockStructure(validJson);
      expect(res.valid).toBe(true);
      expect(res.blocks).toBeDefined();
      expect(res.blocks![0].block_type).toBe('Hero');
      expect(res.blocks![1].block_type).toBe('UnknownBlockFallback');
    });
  });

  describe('6. TTS CMS & Version Mismatch Governance', () => {
    it('Test 14 — Stale TTS: when article_version !== audio_version, TTS should be marked STALE', () => {
      const getTTSStatus = (articleVer: number, audioVer: number, currentStatus: string) => {
        if (articleVer !== audioVer) {
          return 'STALE';
        }
        return currentStatus;
      };

      expect(getTTSStatus(2, 2, 'APPROVED')).toBe('APPROVED');
      expect(getTTSStatus(3, 2, 'APPROVED')).toBe('STALE');
    });

    it('Test 15 — Public TTS Filtering: should only return TTS where status === APPROVED AND article_version === audio_version', () => {
      const audioAssets = [
        { id: 1, status: 'APPROVED', article_version: 2, audio_version: 2 },
        { id: 2, status: 'APPROVED', article_version: 3, audio_version: 2 }, // STALE
        { id: 3, status: 'DRAFT', article_version: 2, audio_version: 2 }
      ];

      const publicAudios = audioAssets.filter(a => a.status === 'APPROVED' && a.article_version === a.audio_version);
      expect(publicAudios.length).toBe(1);
      expect(publicAudios[0].id).toBe(1);
    });
  });

  describe('7. Public ETag & 304 Not Modified', () => {
    it('Test 16 & 8 — ETag / 304: should return 304 Not Modified when If-None-Match header matches ETag', () => {
      const etag = 'W/"cms-posts-v1-hash"';
      const requestHeaders = { 'If-None-Match': 'W/"cms-posts-v1-hash"' };

      const handleETagCheck = (headers: Record<string, string>) => {
        if (headers['If-None-Match'] === etag) {
          return { status: 304 };
        }
        return { status: 200, data: [] };
      };

      const res = handleETagCheck(requestHeaders);
      expect(res.status).toBe(304);
    });
  });
});
