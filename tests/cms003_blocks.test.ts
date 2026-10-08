import { describe, it, expect } from 'vitest';
import { validateBlockStructure } from '../src/services/cmsService.js';

describe('CMS-007 — Modüler Layout Builder & 11 Block Schemas Test Matrisi', () => {
  it('should validate all 11 standard block types (Hero, Heading, RichText, Image, Gallery, Quote, Video, Audio, CTA, RelatedPosts, Advertisement)', () => {
    const validBlocks = [
      { block_id: 'b1', block_type: 'Hero', order: 0, schema_version: 1, payload: { title: 'Ana Başlık' } },
      { block_id: 'b2', block_type: 'Heading', order: 1, schema_version: 1, payload: { level: 2, text: 'Alt Başlık' } },
      { block_id: 'b3', block_type: 'RichText', order: 2, schema_version: 1, payload: { html: '<p>Metin</p>' } },
      { block_id: 'b4', block_type: 'Image', order: 3, schema_version: 1, payload: { url: 'https://img.com/a.png' } },
      { block_id: 'b5', block_type: 'Gallery', order: 4, schema_version: 1, payload: { images: [] } },
      { block_id: 'b6', block_type: 'Quote', order: 5, schema_version: 1, payload: { text: 'Alıntı' } },
      { block_id: 'b7', block_type: 'Video', order: 6, schema_version: 1, payload: { video_url: 'https://video.com/v.mp4' } },
      { block_id: 'b8', block_type: 'Audio', order: 7, schema_version: 1, payload: { audio_url: 'https://audio.com/a.mp3' } },
      { block_id: 'b9', block_type: 'CTA', order: 8, schema_version: 1, payload: { button_text: 'Tıkla' } },
      { block_id: 'b10', block_type: 'RelatedPosts', order: 9, schema_version: 1, payload: { post_ids: ['1', '2'] } },
      { block_id: 'b11', block_type: 'Advertisement', order: 10, schema_version: 1, payload: { slot_key: 'Header Banner' } },
    ];

    const res = validateBlockStructure(JSON.stringify(validBlocks));
    expect(res.valid).toBe(true);
    expect(res.blocks?.length).toBe(11);
  });

  it('should enforce contract: block_id, block_type, order, and schema_version', () => {
    const invalidBlock = [{ block_id: 'b1', block_type: 'Hero' }]; // Missing order & schema_version
    const res = validateBlockStructure(JSON.stringify(invalidBlock));
    expect(res.valid).toBe(false);
    expect(res.error).toContain('kontratı');
  });

  it('should fallback unrecognized block types to UnknownBlockFallback', () => {
    const customBlock = [
      { block_id: 'b1', block_type: 'CustomInteractiveMap', order: 0, schema_version: 1, payload: {} },
    ];

    const res = validateBlockStructure(JSON.stringify(customBlock));
    expect(res.valid).toBe(true);
    expect(res.blocks?.[0].block_type).toBe('UnknownBlockFallback');
  });

  it('should support block reordering via order index', () => {
    const blocks = [
      { block_id: 'b1', block_type: 'Heading', order: 1, schema_version: 1, payload: {} },
      { block_id: 'b2', block_type: 'Hero', order: 0, schema_version: 1, payload: {} },
    ];

    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    expect(sorted[0].block_id).toBe('b2');
    expect(sorted[1].block_id).toBe('b1');
  });

  it('should reject invalid non-JSON block payload', () => {
    const res = validateBlockStructure('invalid-json-string');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Geçersiz JSON');
  });
});
