import { RequestContext } from '../types/router.js';
import { z } from 'zod';

export const AdClientSchema = z.string().regex(/^ca-pub-\d+$/, 'Geçersiz AdSense Client ID formatı (Örn: ca-pub-1234567890123456)');

export const PRESET_SIZES = [
  '728x90',
  '300x250',
  '336x280',
  '320x50',
  '300x600',
  '160x600',
  '970x90',
  '970x250',
  '320x100',
  'RESPONSIVE'
] as const;

export const AdSettingSchema = z.object({
  slot_key: z.string().min(1, 'Slot key boş olamaz'),
  title: z.string().min(1, 'Başlık boş olamaz'),
  is_enabled: z.union([z.boolean(), z.number().min(0).max(1)]).optional().default(0),
  ad_client: z.string().optional().nullable().refine((val) => {
    if (!val || val.trim() === '') return true;
    return /^ca-pub-\d+$/.test(val.trim());
  }, { message: 'ad_client geçersiz format (Örn: ca-pub-1234567890123456)' }),
  ad_slot: z.string().optional().nullable(),
  preset_size: z.enum(PRESET_SIZES).optional().default('RESPONSIVE'),
  custom_width: z.number().min(50, 'Genişlik en az 50px olmalıdır').max(1200, 'Genişlik en fazla 1200px olmalıdır').optional().nullable(),
  custom_height: z.number().min(30, 'Yükseklik en az 30px olmalıdır').max(800, 'Yükseklik en fazla 800px olmalıdır').optional().nullable(),
  margin_top: z.number().min(0, 'Margin top 0-100 arasında olmalıdır').max(100, 'Margin top 0-100 arasında olmalıdır').optional().default(16),
  margin_bottom: z.number().min(0, 'Margin bottom 0-100 arasında olmalıdır').max(100, 'Margin bottom 0-100 arasında olmalıdır').optional().default(16),
  is_sticky: z.union([z.boolean(), z.number().min(0).max(1)]).optional().default(0)
});

async function logAudit(ctx: RequestContext, action: string, details?: Record<string, any>) {
  if (!ctx.env?.DB || typeof ctx.env.DB.prepare !== 'function') return;
  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      ctx.user?.id || null,
      action,
      '/api/v1/admin/ads',
      details ? JSON.stringify(details) : null,
      ctx.clientIp || null
    ).run();
  } catch (_) {}
}

export async function getAdSettingsService(ctx: RequestContext) {
  if (!ctx.env?.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: {
        ads: [
          { id: 1, slot_key: 'header_banner', title: 'Header Banner', is_enabled: 0, preset_size: 'RESPONSIVE', is_sticky: 0 },
          { id: 2, slot_key: 'sidebar_top', title: 'Sidebar Top', is_enabled: 0, preset_size: 'RESPONSIVE', is_sticky: 0 },
          { id: 3, slot_key: 'post_in_article', title: 'In-Article', is_enabled: 0, preset_size: 'RESPONSIVE', is_sticky: 0 },
          { id: 4, slot_key: 'footer_sticky', title: 'Footer Sticky', is_enabled: 0, preset_size: 'RESPONSIVE', is_sticky: 1 }
        ]
      }
    };
  }

  try {
    const { results } = await ctx.env.DB.prepare(`
      SELECT id, slot_key, title, is_enabled, ad_client, ad_slot, preset_size, custom_width, custom_height, margin_top, margin_bottom, is_sticky, updated_at
      FROM ad_settings
      ORDER BY id ASC
    `).all();

    return {
      status: 200,
      data: { ads: results || [] }
    };
  } catch (err: any) {
    return {
      status: 500,
      error: { message: err.message || 'Veritabanı hatası', code: 'DATABASE_ERROR' }
    };
  }
}

export async function createAdSettingService(ctx: RequestContext, payload: any) {
  const parseResult = AdSettingSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      status: 400,
      error: {
        message: 'Reklam yapılandırma girdi doğrulama hatası',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.format()
      }
    };
  }

  const data = parseResult.data;
  const isEnabledNum = data.is_enabled ? 1 : 0;
  const isStickyNum = data.is_sticky ? 1 : 0;

  if (!ctx.env?.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 201,
      data: { id: Date.now(), ...data, is_enabled: isEnabledNum, is_sticky: isStickyNum }
    };
  }

  try {
    const res = await ctx.env.DB.prepare(`
      INSERT INTO ad_settings (slot_key, title, is_enabled, ad_client, ad_slot, preset_size, custom_width, custom_height, margin_top, margin_bottom, is_sticky)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.slot_key,
      data.title,
      isEnabledNum,
      data.ad_client || null,
      data.ad_slot || null,
      data.preset_size,
      data.custom_width || null,
      data.custom_height || null,
      data.margin_top,
      data.margin_bottom,
      isStickyNum
    ).run();

    await logAudit(ctx, 'CREATE_AD_SLOT', { slot_key: data.slot_key, title: data.title });

    return {
      status: 201,
      data: { id: res.meta?.last_row_id || Date.now(), ...data, is_enabled: isEnabledNum, is_sticky: isStickyNum }
    };
  } catch (err: any) {
    return {
      status: 400,
      error: { message: err.message || 'Reklam alanı eklenemedi', code: 'CREATE_FAILED' }
    };
  }
}

export async function updateAdSettingService(ctx: RequestContext, idStr: string, payload: any) {
  const id = parseInt(idStr, 10);
  if (isNaN(id) || id <= 0) {
    return {
      status: 400,
      error: { message: 'Geçersiz reklam ID', code: 'INVALID_ID' }
    };
  }

  const parseResult = AdSettingSchema.partial().safeParse(payload);
  if (!parseResult.success) {
    return {
      status: 400,
      error: {
        message: 'Reklam yapılandırma doğrulama hatası',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.format()
      }
    };
  }

  const data = parseResult.data;
  if (!ctx.env?.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: { id, ...data }
    };
  }

  try {
    const existing = await ctx.env.DB.prepare('SELECT id, slot_key, title, is_enabled FROM ad_settings WHERE id = ? LIMIT 1').bind(id).first();
    if (!existing) {
      return {
        status: 404,
        error: { message: 'Reklam alanı bulunamadı', code: 'NOT_FOUND' }
      };
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.is_enabled !== undefined) { updates.push('is_enabled = ?'); values.push(data.is_enabled ? 1 : 0); }
    if (data.ad_client !== undefined) { updates.push('ad_client = ?'); values.push(data.ad_client || null); }
    if (data.ad_slot !== undefined) { updates.push('ad_slot = ?'); values.push(data.ad_slot || null); }
    if (data.preset_size !== undefined) { updates.push('preset_size = ?'); values.push(data.preset_size); }
    if (data.custom_width !== undefined) { updates.push('custom_width = ?'); values.push(data.custom_width || null); }
    if (data.custom_height !== undefined) { updates.push('custom_height = ?'); values.push(data.custom_height || null); }
    if (data.margin_top !== undefined) { updates.push('margin_top = ?'); values.push(data.margin_top); }
    if (data.margin_bottom !== undefined) { updates.push('margin_bottom = ?'); values.push(data.margin_bottom); }
    if (data.is_sticky !== undefined) { updates.push('is_sticky = ?'); values.push(data.is_sticky ? 1 : 0); }

    if (updates.length > 0) {
      values.push(id);
      await ctx.env.DB.prepare(`UPDATE ad_settings SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    }

    const action = data.is_enabled !== undefined && Object.keys(data).length === 1 ? 'TOGGLE_AD_SLOT' : 'UPDATE_AD_SLOT';
    await logAudit(ctx, action, { id, slot_key: existing.slot_key, updates: data });

    const updated = await ctx.env.DB.prepare('SELECT * FROM ad_settings WHERE id = ?').bind(id).first();
    return {
      status: 200,
      data: updated
    };
  } catch (err: any) {
    return {
      status: 500,
      error: { message: err.message || 'Güncelleme hatası', code: 'UPDATE_FAILED' }
    };
  }
}
