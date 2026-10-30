import { CmsPost, scheduledPublishWorker } from '../services/cmsService.js';

export interface CronExecutionContext {
  env: any;
  nowUtc?: string;
}

export async function handleScheduledPublishCron(ctx: CronExecutionContext): Promise<{
  publishedCount: number;
  unpublishedCount: number;
  publishedIds: string[];
  unpublishedIds: string[];
}> {
  const now = ctx.nowUtc || new Date().toISOString();
  let posts: CmsPost[] = [];

  if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      const res = await ctx.env.DB.prepare(`
        SELECT id, slug, status, scheduled_publish_at, scheduled_unpublish_at, revision_number, created_at, updated_at
        FROM blog_posts
        WHERE (scheduled_publish_at IS NOT NULL AND scheduled_publish_at <= ?)
           OR (scheduled_unpublish_at IS NOT NULL AND scheduled_unpublish_at <= ?)
      `).bind(now, now).all();
      posts = res.results || [];
    } catch {
      posts = [];
    }
  }

  const result = scheduledPublishWorker(posts, now);

  if (ctx.env?.DB && typeof ctx.env.DB.prepare === 'function') {
    for (const pubId of result.published) {
      await ctx.env.DB.prepare(`
        UPDATE blog_posts
        SET status = 'PUBLISHED', published_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status != 'PUBLISHED'
      `).bind(now, pubId).run().catch(() => {});
    }

    for (const unpubId of result.unpublished) {
      await ctx.env.DB.prepare(`
        UPDATE blog_posts
        SET status = 'UNPUBLISHED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'PUBLISHED'
      `).bind(unpubId).run().catch(() => {});
    }
  }

  return {
    publishedCount: result.published.length,
    unpublishedCount: result.unpublished.length,
    publishedIds: result.published,
    unpublishedIds: result.unpublished,
  };
}
