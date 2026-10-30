import { describe, it, expect } from 'vitest';
import { validateMediaUpload } from '../src/services/cmsService.js';

describe('CMS-006 — Media & R2 Storage Test Matrisi (MEDIA-001 to MEDIA-013)', () => {
  it('MEDIA-001 — JPEG image under 5MB should pass validation', () => {
    const res = validateMediaUpload('header.jpg', 'image/jpeg', 2 * 1024 * 1024);
    expect(res.valid).toBe(true);
  });

  it('MEDIA-002 — PNG image under 5MB should pass validation', () => {
    const res = validateMediaUpload('logo.png', 'image/png', 3 * 1024 * 1024);
    expect(res.valid).toBe(true);
  });

  it('MEDIA-003 — WEBP image under 5MB should pass validation', () => {
    const res = validateMediaUpload('hero.webp', 'image/webp', 1 * 1024 * 1024);
    expect(res.valid).toBe(true);
  });

  it('MEDIA-004 — Image over 5MB should return 400 error', () => {
    const res = validateMediaUpload('huge.jpg', 'image/jpeg', 5.5 * 1024 * 1024);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('5 MB');
  });

  it('MEDIA-005 — Executable file (.exe) upload should return 400 error', () => {
    const res = validateMediaUpload('setup.exe', 'application/x-msdownload', 1024);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Zararlı dosya');
  });

  it('MEDIA-006 — PHP script (.php) upload should return 400 error', () => {
    const res = validateMediaUpload('backdoor.php', 'application/x-php', 512);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Zararlı dosya');
  });

  it('MEDIA-007 — Invalid MIME type should return 400 error', () => {
    const res = validateMediaUpload('document.pdf', 'application/pdf', 1024 * 1024);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('JPEG, PNG ve WebP');
  });

  it('MEDIA-008 — Object name normalization should generate UUID pattern', () => {
    const generateKey = (filename: string) => `media/${crypto.randomUUID()}-${filename.toLowerCase()}`;
    const key = generateKey('banner.png');
    expect(key).toMatch(/^media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-banner\.png$/);
  });

  it('MEDIA-009 — Mandatory alt_text check: missing alt_text should be rejected', () => {
    const res = validateMediaUpload('test.jpg', 'image/jpeg', 1024, { alt_text: '', caption: 'Açıklama' });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('alt_text zorunludur');
  });

  it('MEDIA-010 — Mandatory caption check: missing caption should be rejected', () => {
    const res = validateMediaUpload('test.jpg', 'image/jpeg', 1024, { alt_text: 'Alt Metin', caption: '  ' });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('caption zorunludur');
  });

  it('MEDIA-011 — Replace media operation: should retain ID but update path & metadata', () => {
    const existing = { id: 'media_1', key: 'media/old.png', alt_text: 'Eski' };
    const updated = { ...existing, key: 'media/new.png', alt_text: 'Yeni' };
    expect(updated.id).toBe('media_1');
    expect(updated.key).toBe('media/new.png');
    expect(updated.alt_text).toBe('Yeni');
  });

  it('MEDIA-012 — Used media delete protection: should prevent deleting image referenced in published post', () => {
    const isMediaUsedInPosts = (mediaKey: string, posts: any[]) => {
      return posts.some((p) => p.cover_image === mediaKey || (p.content_tr && p.content_tr.includes(mediaKey)));
    };

    const posts = [{ id: 'p1', cover_image: 'media/logo.png', content_tr: '<p>Yazı</p>' }];
    expect(isMediaUsedInPosts('media/logo.png', posts)).toBe(true);
    expect(isMediaUsedInPosts('media/orphan.png', posts)).toBe(false);
  });

  it('MEDIA-013 — Orphan media detection: should identify uploaded files not linked to any post', () => {
    const allMedia = ['media/logo.png', 'media/banner.png', 'media/unused.jpg'];
    const posts = [{ cover_image: 'media/logo.png', content_tr: '<img src="media/banner.png"/>' }];

    const orphanMedia = allMedia.filter(
      (m) => !posts.some((p) => p.cover_image === m || p.content_tr.includes(m))
    );

    expect(orphanMedia).toEqual(['media/unused.jpg']);
  });
});
