import { describe, it, expect } from 'vitest';
import { scheduledPublishWorker, CmsPost } from '../src/services/cmsService.js';

describe('CMS-008 — Scheduled Publishing & Unpublishing Cron Engine Tests (SCH-001 to SCH-007)', () => {
  it('SCH-001 — UTC publish time NOT reached: post should remain DRAFT/SCHEDULED', () => {
    const posts: CmsPost[] = [
      {
        id: 'p1',
        slug: 'future-post',
        title_tr: 'Gelecek Yazı',
        content_tr: '<p>Gelecek</p>',
        status: 'DRAFT',
        revision_number: 1,
        scheduled_publish_at: '2026-12-31T23:59:59Z',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
    ];

    const res = scheduledPublishWorker(posts, '2026-10-08T12:00:00Z');
    expect(res.published.length).toBe(0);
    expect(posts[0].status).toBe('DRAFT');
  });

  it('SCH-002 — UTC publish time reached: post status should change to PUBLISHED and published_at set', () => {
    const posts: CmsPost[] = [
      {
        id: 'p2',
        slug: 'due-post',
        title_tr: 'Zamanı Gelen Yazı',
        content_tr: '<p>İçerik</p>',
        status: 'DRAFT',
        revision_number: 1,
        scheduled_publish_at: '2026-10-08T10:00:00Z',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
    ];

    const res = scheduledPublishWorker(posts, '2026-10-08T12:00:00Z');
    expect(res.published).toContain('p2');
    expect(posts[0].status).toBe('PUBLISHED');
    expect(posts[0].published_at).toBe('2026-10-08T12:00:00Z');
  });

  it('SCH-003 — UTC unpublish time reached: post status should change to UNPUBLISHED', () => {
    const posts: CmsPost[] = [
      {
        id: 'p3',
        slug: 'expiring-post',
        title_tr: 'Süresi Dolan Yazı',
        content_tr: '<p>İçerik</p>',
        status: 'PUBLISHED',
        revision_number: 2,
        scheduled_unpublish_at: '2026-10-08T10:00:00Z',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
    ];

    const res = scheduledPublishWorker(posts, '2026-10-08T12:00:00Z');
    expect(res.unpublished).toContain('p3');
    expect(posts[0].status).toBe('UNPUBLISHED');
  });

  it('SCH-004 — Cancel schedule: clearing scheduled_publish_at should prevent automatic publishing', () => {
    const post: CmsPost = {
      id: 'p4',
      slug: 'cancelled-post',
      title_tr: 'İptal Edilmiş',
      content_tr: '<p>Metin</p>',
      status: 'DRAFT',
      revision_number: 1,
      scheduled_publish_at: undefined,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    const res = scheduledPublishWorker([post], '2026-10-08T12:00:00Z');
    expect(res.published.length).toBe(0);
    expect(post.status).toBe('DRAFT');
  });

  it('SCH-005 — Reschedule: updated scheduled_publish_at timestamp should be strictly honored', () => {
    const post: CmsPost = {
      id: 'p5',
      slug: 'rescheduled-post',
      title_tr: 'Yeniden Zamanlanmış',
      content_tr: '<p>Metin</p>',
      status: 'DRAFT',
      revision_number: 1,
      scheduled_publish_at: '2026-10-09T15:00:00Z',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    const res = scheduledPublishWorker([post], '2026-10-08T12:00:00Z');
    expect(res.published.length).toBe(0); // Not published yet at 12:00
  });

  it('SCH-006 — Concurrency protection: duplicate execution by two workers must produce idempotent result', () => {
    const post: CmsPost = {
      id: 'p6',
      slug: 'worker-post',
      title_tr: 'Worker Yazısı',
      content_tr: '<p>Metin</p>',
      status: 'DRAFT',
      revision_number: 1,
      scheduled_publish_at: '2026-10-08T10:00:00Z',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    // Worker 1 runs
    const res1 = scheduledPublishWorker([post], '2026-10-08T12:00:00Z');
    expect(res1.published).toContain('p6');

    // Worker 2 runs immediately after on same post state (now PUBLISHED)
    const res2 = scheduledPublishWorker([post], '2026-10-08T12:00:01Z');
    expect(res2.published.length).toBe(0); // Idempotent, no duplicate publish!
  });

  it('SCH-007 — Performance measurement: processing 10 scheduled posts must take < 500ms (BENCHMARK)', () => {
    const posts: CmsPost[] = Array.from({ length: 10 }, (_, i) => ({
      id: `batch_${i}`,
      slug: `batch-post-${i}`,
      title_tr: `Başlık ${i}`,
      content_tr: `<p>İçerik ${i}</p>`,
      status: 'DRAFT',
      revision_number: 1,
      scheduled_publish_at: '2026-10-08T09:00:00Z',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    }));

    const start = performance.now();
    const res = scheduledPublishWorker(posts, '2026-10-08T12:00:00Z');
    const elapsed = performance.now() - start;

    expect(res.published.length).toBe(10);
    expect(elapsed).toBeLessThan(500); // BENCHMARK: < 500ms
  });
});
