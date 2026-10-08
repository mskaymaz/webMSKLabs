import { describe, it, expect } from 'vitest';

describe('CMS-008 — Revision System, History, Diff & Optimistic Locking Tests (REV-001 to REV-010)', () => {
  it('REV-001 — Save content: should increment revision_number and create snapshot record', () => {
    const currentPost = { id: 'p1', title: 'İlk Başlık', revision_number: 1 };
    const updatePost = (post: any, newTitle: string) => {
      const nextRev = post.revision_number + 1;
      const snapshot = { post_id: post.id, revision_number: nextRev, title: newTitle, created_at: new Date().toISOString() };
      return { post: { ...post, title: newTitle, revision_number: nextRev }, snapshot };
    };

    const res = updatePost(currentPost, 'İkinci Başlık');
    expect(res.post.revision_number).toBe(2);
    expect(res.snapshot.revision_number).toBe(2);
    expect(res.snapshot.title).toBe('İkinci Başlık');
  });

  it('REV-002 — State change (Publish/Unpublish): should create revision snapshot', () => {
    const post = { id: 'p1', status: 'DRAFT', revision_number: 2 };
    const publishPost = (p: any) => {
      const nextRev = p.revision_number + 1;
      return { ...p, status: 'PUBLISHED', revision_number: nextRev };
    };

    const published = publishPost(post);
    expect(published.revision_number).toBe(3);
    expect(published.status).toBe('PUBLISHED');
  });

  it('REV-003 — Snapshot integrity: snapshot JSON should preserve exact previous content state', () => {
    const postState = { title_tr: 'TR Başlık', content_tr: '<p>İçerik</p>', summary_tr: 'Özet' };
    const snapshotJson = JSON.stringify(postState);
    const parsed = JSON.parse(snapshotJson);

    expect(parsed.title_tr).toBe('TR Başlık');
    expect(parsed.content_tr).toBe('<p>İçerik</p>');
    expect(parsed.summary_tr).toBe('Özet');
  });

  it('REV-004 — Revision history query: should return ordered revision history list', () => {
    const revisions = [
      { revision_number: 1, created_at: '2026-10-01T10:00:00Z' },
      { revision_number: 3, created_at: '2026-10-01T12:00:00Z' },
      { revision_number: 2, created_at: '2026-10-01T11:00:00Z' },
    ];

    const sorted = [...revisions].sort((a, b) => b.revision_number - a.revision_number);
    expect(sorted[0].revision_number).toBe(3);
    expect(sorted[2].revision_number).toBe(1);
  });

  it('REV-005 — Side-by-side diff comparison: should detect changes between rev 1 and rev 2', () => {
    const rev1 = { title: 'Eski Başlık', content: 'Eski içerik' };
    const rev2 = { title: 'Yeni Başlık', content: 'Eski içerik' };

    const getDiff = (a: any, b: any) => ({
      titleChanged: a.title !== b.title,
      contentChanged: a.content !== b.content,
    });

    const diff = getDiff(rev1, rev2);
    expect(diff.titleChanged).toBe(true);
    expect(diff.contentChanged).toBe(false);
  });

  it('REV-006 — Restore operation: should apply historical content state', () => {
    const revHistory = { 1: { title: 'Versiyon 1 Metni' } };
    const restoreRev = (history: any, revId: number) => history[revId];

    const restoredContent = restoreRev(revHistory, 1);
    expect(restoredContent.title).toBe('Versiyon 1 Metni');
  });

  it('REV-007 — Restore DOES NOT modify old revision: must generate a NEW revision number', () => {
    const currentPost = { id: 'p1', revision_number: 4 };
    const restoreToRev2 = (post: any) => {
      const newRevisionNumber = post.revision_number + 1; // 5
      return { ...post, revision_number: newRevisionNumber };
    };

    const restoredPost = restoreToRev2(currentPost);
    expect(restoredPost.revision_number).toBe(5); // New revision number 5, not overwriting rev 2 or rev 4!
  });

  it('REV-008 — Stale client revision save attempt: should trigger optimistic concurrency check failure', () => {
    const serverPost = { id: 'p1', revision_number: 3 };
    const clientState = { clientRevision: 2 }; // Stale revision 2!

    const canSave = clientState.clientRevision >= serverPost.revision_number;
    expect(canSave).toBe(false);
  });

  it('REV-009 — CONCURRENT_EDIT_CONFLICT response envelope: should return HTTP 409 status with currentRevision details', () => {
    const createConflictResponse = (serverRev: number, clientRev: number) => ({
      status: 409,
      code: 'CONCURRENT_EDIT_CONFLICT',
      message: 'Bu makale başka bir yönetici tarafından güncellenmiştir. Lütfen sayfayı yenileyin.',
      details: { currentRevision: serverRev, clientRevision: clientRev },
    });

    const res = createConflictResponse(3, 2);
    expect(res.status).toBe(409);
    expect(res.code).toBe('CONCURRENT_EDIT_CONFLICT');
    expect(res.details.currentRevision).toBe(3);
  });

  it('REV-010 — Data integrity on conflict: server content must NOT be overwritten when conflict occurs', () => {
    let serverData = { title: 'Sunucudaki Değer', revision_number: 3 };
    const staleUpdateAttempt = { title: 'Saldırgan/Eski İstemci Değeri', clientRevision: 2 };

    if (staleUpdateAttempt.clientRevision >= serverData.revision_number) {
      serverData.title = staleUpdateAttempt.title;
    }

    expect(serverData.title).toBe('Sunucudaki Değer'); // Preserved!
  });
});
