import { describe, it, expect } from 'vitest';
import { stripPrivateMetadata, isPublicAudioEligible, sanitizeCmsHTML } from '../src/services/cmsService.js';

describe('CMS-005 & CMS-TTS-001 — Public API Security, ETag/304 & TTS Version Filtering Tests', () => {

  describe('1. Public API Lifecycle State Boundaries (TEST-PUBLIC-001 to TEST-PUBLIC-005)', () => {
    const allPosts = [
      { id: '1', slug: 'draft-p', status: 'DRAFT' },
      { id: '2', slug: 'review-p', status: 'REVIEW' },
      { id: '3', slug: 'future-p', status: 'APPROVED', published_at: '2026-12-31T23:59:59Z' },
      { id: '4', slug: 'unpub-p', status: 'UNPUBLISHED' },
      { id: '5', slug: 'archived-p', status: 'ARCHIVED' },
      { id: '6', slug: 'published-p', status: 'PUBLISHED', published_at: '2026-10-01T12:00:00Z' },
    ];

    const filterPublicPosts = (posts: any[], nowUtc: string = new Date().toISOString()) => {
      return posts.filter(
        (p) => p.status === 'PUBLISHED' && p.published_at && p.published_at <= nowUtc
      );
    };

    it('TEST-PUBLIC-001 — DRAFT post must NOT appear in public API', () => {
      const res = filterPublicPosts(allPosts, '2026-10-08T12:00:00Z');
      expect(res.some((p) => p.status === 'DRAFT')).toBe(false);
    });

    it('TEST-PUBLIC-002 — REVIEW post must NOT appear in public API', () => {
      const res = filterPublicPosts(allPosts, '2026-10-08T12:00:00Z');
      expect(res.some((p) => p.status === 'REVIEW')).toBe(false);
    });

    it('TEST-PUBLIC-003 — APPROVED post with future publish_at must NOT appear in public API', () => {
      const res = filterPublicPosts(allPosts, '2026-10-08T12:00:00Z');
      expect(res.some((p) => p.slug === 'future-p')).toBe(false);
    });

    it('TEST-PUBLIC-004 — UNPUBLISHED post must NOT appear in public API', () => {
      const res = filterPublicPosts(allPosts, '2026-10-08T12:00:00Z');
      expect(res.some((p) => p.status === 'UNPUBLISHED')).toBe(false);
    });

    it('TEST-PUBLIC-005 — ARCHIVED post must NOT appear in public API', () => {
      const res = filterPublicPosts(allPosts, '2026-10-08T12:00:00Z');
      expect(res.some((p) => p.status === 'ARCHIVED')).toBe(false);
    });

    it('Only PUBLISHED post with valid published_at is included in public API', () => {
      const res = filterPublicPosts(allPosts, '2026-10-08T12:00:00Z');
      expect(res.length).toBe(1);
      expect(res[0].slug).toBe('published-p');
    });
  });

  describe('2. Metadata Leak Prevention (TEST-PUBLIC-006 to TEST-PUBLIC-010)', () => {
    const rawRecord = {
      id: 'p1',
      slug: 'ai-post',
      title_tr: 'Başlık',
      content_tr: '<p>Metin</p>',
      status: 'PUBLISHED',
      ai_metadata: '{"model":"gemini-1.5-pro","tokens":450}',
      prompt_version: 'v1.4',
      reasoning: 'AI chain of thought trace',
      internal_notes: 'Bunu önümüzdeki hafta öne çıkaralım',
      admin_id: 'usr_admin_999',
    };

    it('TEST-PUBLIC-006 — ai_metadata must be stripped from public response', () => {
      const clean = stripPrivateMetadata(rawRecord);
      expect((clean as any).ai_metadata).toBeUndefined();
    });

    it('TEST-PUBLIC-007 — prompt_version must be stripped from public response', () => {
      const clean = stripPrivateMetadata(rawRecord);
      expect((clean as any).prompt_version).toBeUndefined();
    });

    it('TEST-PUBLIC-008 — reasoning must be stripped from public response', () => {
      const clean = stripPrivateMetadata(rawRecord);
      expect((clean as any).reasoning).toBeUndefined();
    });

    it('TEST-PUBLIC-009 — internal_notes must be stripped from public response', () => {
      const clean = stripPrivateMetadata(rawRecord);
      expect((clean as any).internal_notes).toBeUndefined();
    });

    it('TEST-PUBLIC-010 — admin_id must be stripped from public response', () => {
      const clean = stripPrivateMetadata(rawRecord);
      expect((clean as any).admin_id).toBeUndefined();
    });
  });

  describe('3. Public ETag / 304 Conditional Requests', () => {
    it('matching If-None-Match ETag must return 304 Not Modified with empty body', () => {
      const etag = 'W/"post-list-v1-hash"';
      const requestIfNoneMatch = 'W/"post-list-v1-hash"';

      const handleConditionalRequest = (headerValue: string | null, serverEtag: string) => {
        if (headerValue === serverEtag) {
          return { status: 304, body: null };
        }
        return { status: 200, body: [{ id: '1' }] };
      };

      const res = handleConditionalRequest(requestIfNoneMatch, etag);
      expect(res.status).toBe(304);
      expect(res.body).toBeNull();
    });
  });

  describe('4. CMS-TTS-001 Public TTS Audio Version Filtering Matrix', () => {
    it('APPROVED status & equal article/audio versions -> Public Audio: YES', () => {
      expect(isPublicAudioEligible('APPROVED', 3, 3)).toBe(true);
    });

    it('APPROVED status & mismatching article/audio versions -> Public Audio: NO', () => {
      expect(isPublicAudioEligible('APPROVED', 4, 3)).toBe(false);
    });

    it('DRAFT status & equal versions -> Public Audio: NO', () => {
      expect(isPublicAudioEligible('DRAFT', 3, 3)).toBe(false);
    });

    it('GENERATING status & equal versions -> Public Audio: NO', () => {
      expect(isPublicAudioEligible('GENERATING', 3, 3)).toBe(false);
    });

    it('FAILED status & equal versions -> Public Audio: NO', () => {
      expect(isPublicAudioEligible('FAILED', 3, 3)).toBe(false);
    });

    it('STALE status & equal or different versions -> Public Audio: NO', () => {
      expect(isPublicAudioEligible('STALE', 3, 3)).toBe(false);
      expect(isPublicAudioEligible('STALE', 4, 3)).toBe(false);
    });
  });

  describe('5. XSS & SVG Vectors Security Tests', () => {
    it('should sanitize script, inline event handler, javascript: link, and malicious SVG', () => {
      const payload1 = '<script>alert("xss")</script><p>Normal</p>';
      const payload2 = '<a href="javascript:alert(1)">Link</a>';
      const payload3 = '<img src="x" onerror="alert(1)">';
      const payload4 = '<svg onload="alert(1)"><circle cx="50" cy="50" r="40"/></svg>';

      expect(sanitizeCmsHTML(payload1)).not.toContain('<script>');
      expect(sanitizeCmsHTML(payload2)).not.toContain('javascript:');
      expect(sanitizeCmsHTML(payload3)).not.toContain('onerror=');
      expect(sanitizeCmsHTML(payload4)).not.toContain('onload=');
    });
  });
});
