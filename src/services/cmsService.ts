import { escapeText, sanitizeHTML } from '../utils/sanitize.js';

export interface CmsPost {
  id: string;
  channel_id?: string;
  slug: string;
  title_tr: string;
  title_en?: string;
  title_ar?: string;
  content_tr: string;
  content_en?: string;
  content_ar?: string;
  summary_tr?: string;
  summary_en?: string;
  summary_ar?: string;
  cover_image?: string;
  meta_keywords?: string;
  author_name?: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
  revision_number: number;
  scheduled_publish_at?: string;
  scheduled_unpublish_at?: string;
  block_structure_json?: string;
  ai_metadata?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CmsChannel {
  id: string;
  slug: string;
  name_tr: string;
  name_en?: string;
  name_ar?: string;
  icon?: string;
  is_active: boolean;
}

// 1. Sanitize & Validate Rich Text Elements
export function sanitizeCmsHTML(input: string): string {
  if (!input) return '';
  return sanitizeHTML(input)
    .replace(/javascript:/gi, 'blocked:')
    .replace(/data:text\/html/gi, 'blocked:')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, (match) => {
      if (/onload|onerror|javascript:/i.test(match)) return '';
      return match;
    });
}

// 2. Validate Media Upload (MIME & Size & Metadata)
export function validateMediaUpload(
  fileName: string,
  mimeType: string,
  sizeBytes: number,
  meta?: { alt_text?: string; caption?: string }
): { valid: boolean; error?: string } {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'exe' || ext === 'php' || ext === 'sh' || ext === 'bat') {
    return { valid: false, error: 'Zararlı dosya türü engellendi.' };
  }

  if (!allowedMime.includes(mimeType)) {
    return { valid: false, error: 'Yalnızca JPEG, PNG ve WebP görselleri kabul edilir.' };
  }

  if (sizeBytes > maxSizeBytes) {
    return { valid: false, error: 'Dosya boyutu 5 MB sınırını aşıyor.' };
  }

  if (meta) {
    if (!meta.alt_text || meta.alt_text.trim() === '') {
      return { valid: false, error: 'Görsel alt_text zorunludur.' };
    }
    if (!meta.caption || meta.caption.trim() === '') {
      return { valid: false, error: 'Görsel caption zorunludur.' };
    }
  }

  return { valid: true };
}

// 3. Strip Private Metadata from Public Output
export function stripPrivateMetadata(post: any): Partial<CmsPost> {
  const { ai_metadata, prompt_version, reasoning, admin_id, internal_notes, ...publicPost } = post;
  return publicPost;
}

// 4. Validate Block Structure JSON for 11 Block Types
export function validateBlockStructure(blocksJson: string): { valid: boolean; blocks?: any[]; error?: string } {
  try {
    const blocks = JSON.parse(blocksJson);
    if (!Array.isArray(blocks)) {
      return { valid: false, error: 'Blok yapısı liste (Array) olmalıdır.' };
    }

    const allowedTypes = ['Hero', 'Heading', 'RichText', 'Image', 'Gallery', 'Quote', 'Video', 'Audio', 'CTA', 'RelatedPosts', 'Advertisement'];

    for (const block of blocks) {
      if (!block.block_id || !block.block_type || typeof block.order !== 'number' || typeof block.schema_version !== 'number') {
        return { valid: false, error: 'Blok kontratı (block_id, block_type, order, schema_version) ihlal edildi.' };
      }
      if (!allowedTypes.includes(block.block_type)) {
        block.block_type = 'UnknownBlockFallback';
      }
    }

    return { valid: true, blocks };
  } catch {
    return { valid: false, error: 'Geçersiz JSON biçimi.' };
  }
}

// 5. Scheduled Publish Cron Engine Logic
export function scheduledPublishWorker(posts: CmsPost[], nowUtc: string = new Date().toISOString()): {
  published: string[];
  unpublished: string[];
} {
  const published: string[] = [];
  const unpublished: string[] = [];

  posts.forEach((p) => {
    if (p.scheduled_publish_at && p.scheduled_publish_at <= nowUtc && p.status !== 'PUBLISHED') {
      p.status = 'PUBLISHED';
      p.published_at = nowUtc;
      published.push(p.id);
    }
    if (p.scheduled_unpublish_at && p.scheduled_unpublish_at <= nowUtc && p.status === 'PUBLISHED') {
      p.status = 'UNPUBLISHED';
      unpublished.push(p.id);
    }
  });

  return { published, unpublished };
}

// 6. Public TTS Version Filtering Logic
export function isPublicAudioEligible(
  audioStatus: 'GENERATING' | 'DRAFT' | 'APPROVED' | 'FAILED' | 'STALE',
  articleVersion: number,
  audioVersion: number
): boolean {
  return audioStatus === 'APPROVED' && articleVersion === audioVersion;
}
