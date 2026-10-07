import { RequestContext } from '../types/router.js';

export interface CreateCouponPayload {
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  maxUses?: number;
  assignedEmail?: string;
  expiresAt: string;
}

export interface CouponFilters {
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}

export async function createCouponService(ctx: RequestContext, payload: CreateCouponPayload) {
  // 1. Validate Code
  const rawCode = payload?.code;
  if (!rawCode || typeof rawCode !== 'string') {
    return {
      status: 400,
      error: {
        message: 'Kupon kodu zorunludur.',
        code: 'VALIDATION_ERROR'
      }
    };
  }

  const code = rawCode.trim().toUpperCase();
  if (code.length < 4 || code.length > 20 || !/^[A-Z0-9]+$/.test(code)) {
    return {
      status: 400,
      error: {
        message: 'Kupon kodu 4-20 karakter arasında alfanümerik büyük harf olmalıdır.',
        code: 'VALIDATION_ERROR'
      }
    };
  }

  // 2. Validate Discount
  const discountType = payload.discountType || 'PERCENTAGE';
  const discountPercent = payload.discountPercent !== undefined ? Number(payload.discountPercent) : undefined;
  const discountAmount = payload.discountAmount !== undefined ? Number(payload.discountAmount) : discountPercent;

  if (discountPercent !== undefined) {
    if (isNaN(discountPercent) || discountPercent < 1 || discountPercent > 100) {
      return {
        status: 400,
        error: {
          message: 'İndirim yüzdesi 1 ile 100 arasında geçerli bir sayı olmalıdır.',
          code: 'VALIDATION_ERROR'
        }
      };
    }
  }

  if (discountAmount === undefined || isNaN(discountAmount) || discountAmount <= 0) {
    return {
      status: 400,
      error: {
        message: 'Geçersiz indirim miktarı veya yüzdesi.',
        code: 'VALIDATION_ERROR'
      }
    };
  }

  // 3. Validate Max Uses
  const maxUses = payload.maxUses !== undefined ? Number(payload.maxUses) : 100;
  if (isNaN(maxUses) || maxUses <= 0 || !Number.isInteger(maxUses)) {
    return {
      status: 400,
      error: {
        message: 'Maksimum kullanım sayısı 0\'dan büyük bir tamsayı olmalıdır.',
        code: 'VALIDATION_ERROR'
      }
    };
  }

  // 4. Validate Expiration Date
  const rawExpiresAt = payload?.expiresAt;
  if (!rawExpiresAt || typeof rawExpiresAt !== 'string') {
    return {
      status: 400,
      error: {
        message: 'Son kullanma tarihi (expiresAt) zorunludur.',
        code: 'VALIDATION_ERROR'
      }
    };
  }

  const expDate = new Date(rawExpiresAt);
  if (isNaN(expDate.getTime())) {
    return {
      status: 400,
      error: {
        message: 'Geçersiz son kullanma tarihi formatı (ISO 8601 bekleniyor).',
        code: 'INVALID_EXPIRATION_DATE'
      }
    };
  }

  if (expDate.getTime() <= Date.now()) {
    return {
      status: 400,
      error: {
        message: 'Son kullanma tarihi gelecekte bir tarih olmalıdır.',
        code: 'EXPIRED_DATE_NOT_ALLOWED'
      }
    };
  }

  const formattedExpiresAt = expDate.toISOString();
  const assignedEmail = payload.assignedEmail ? payload.assignedEmail.trim().toLowerCase() : null;

  // 5. DB Insert or Mock Fallback
  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    const mockId = Math.floor(Math.random() * 1000) + 1;
    return {
      status: 201,
      data: {
        couponId: mockId,
        code,
        discountAmount,
        discountPercent: discountPercent ?? null,
        discountType,
        maxUses,
        currentUses: 0,
        assignedEmail,
        isUsed: 0,
        expiresAt: formattedExpiresAt
      }
    };
  }

  try {
    const insertRes = await ctx.env.DB.prepare(`
      INSERT INTO coupons (code, discount_amount, discount_percent, discount_type, max_uses, current_uses, assigned_email, is_used, expires_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)
    `).bind(
      code,
      discountAmount,
      discountPercent ?? null,
      discountType,
      maxUses,
      assignedEmail,
      formattedExpiresAt
    ).run();

    const couponId = insertRes.meta?.last_row_id || Date.now();

    // 6. Audit Logging (COUPON_CREATED)
    try {
      await ctx.env.DB.prepare(`
        INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        ctx.user?.id || null,
        'COUPON_CREATED',
        `coupon:${couponId}`,
        JSON.stringify({
          couponId,
          code,
          discountAmount,
          discountPercent,
          maxUses,
          expiresAt: formattedExpiresAt
        }),
        ctx.clientIp || null
      ).run();
    } catch {
      // Ignore audit log insertion error
    }

    return {
      status: 201,
      data: {
        couponId,
        code,
        discountAmount,
        discountPercent: discountPercent ?? null,
        discountType,
        maxUses,
        currentUses: 0,
        assignedEmail,
        isUsed: 0,
        expiresAt: formattedExpiresAt
      }
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('UNIQUE constraint failed') || errMsg.includes('coupons.code')) {
      return {
        status: 409,
        error: {
          message: 'Bu kupon kodu zaten mevcuttur.',
          code: 'COUPON_ALREADY_EXISTS'
        }
      };
    }

    throw err;
  }
}

export async function getCouponsService(ctx: RequestContext, filters: CouponFilters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const offset = (page - 1) * limit;

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: {
        items: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0
        }
      }
    };
  }

  const countResult = await ctx.env.DB.prepare(`SELECT COUNT(*) as total FROM coupons`).first<{ total: number }>();
  const totalItems = countResult?.total || 0;
  const totalPages = Math.ceil(totalItems / limit);

  const { results } = await ctx.env.DB.prepare(`
    SELECT * FROM coupons
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const items = (results || []).map((row: any) => ({
    id: row.id,
    code: row.code,
    discountAmount: row.discount_amount,
    discountPercent: row.discount_percent,
    discountType: row.discount_type,
    maxUses: row.max_uses,
    currentUses: row.current_uses,
    assignedEmail: row.assigned_email,
    isUsed: row.is_used === 1,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  }));

  return {
    status: 200,
    data: {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages
      }
    }
  };
}

export async function deleteCouponService(ctx: RequestContext, idOrCode: string) {
  if (!idOrCode || typeof idOrCode !== 'string' || idOrCode.trim() === '') {
    return {
      status: 400,
      error: {
        message: 'Kupon ID veya kodu zorunludur.',
        code: 'VALIDATION_ERROR'
      }
    };
  }

  const term = idOrCode.trim();
  const isNumeric = /^\d+$/.test(term);

  if (!ctx.env.DB || typeof ctx.env.DB.prepare !== 'function') {
    return {
      status: 200,
      data: {
        message: 'Kupon başarıyla silindi.',
        couponId: isNumeric ? Number(term) : term
      }
    };
  }

  // Find existing coupon
  const existing = isNumeric
    ? await ctx.env.DB.prepare(`SELECT * FROM coupons WHERE id = ?`).bind(Number(term)).first<any>()
    : await ctx.env.DB.prepare(`SELECT * FROM coupons WHERE code = ?`).bind(term.toUpperCase()).first<any>();

  if (!existing) {
    return {
      status: 404,
      error: {
        message: 'Kupon bulunamadı.',
        code: 'NOT_FOUND'
      }
    };
  }

  await ctx.env.DB.prepare(`DELETE FROM coupons WHERE id = ?`).bind(existing.id).run();

  // Audit Logging (COUPON_DELETED)
  try {
    await ctx.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      ctx.user?.id || null,
      'COUPON_DELETED',
      `coupon:${existing.id}`,
      JSON.stringify({
        couponId: existing.id,
        code: existing.code
      }),
      ctx.clientIp || null
    ).run();
  } catch {
    // Ignore audit log insertion error
  }

  return {
    status: 200,
    data: {
      message: 'Kupon başarıyla silindi.',
      couponId: existing.id,
      code: existing.code
    }
  };
}
