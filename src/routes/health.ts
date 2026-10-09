import { Router } from '../utils/router.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { checkRateLimit } from '../middleware/rateLimit.js';
import { sendEmail } from '../../backend/src/services/emailService.js';

export const healthRouter = new Router();

const inMemoryAlertCooldown = new Map<string, number>();
const ALERT_COOLDOWN_MS = 300000; // 5 minutes

async function shouldSendAlert(ctx: any, key: string): Promise<boolean> {
  const kv = ctx.env?.IDEMPOTENCY_STORE;
  if (kv && typeof kv.get === 'function') {
    try {
      const existing = await kv.get(`alert:${key}`);
      if (existing) return false;
      await kv.put(`alert:${key}`, '1', { expirationTtl: 300 });
      return true;
    } catch {
      // Fallback to in-memory
    }
  }

  const now = Date.now();
  const lastSent = inMemoryAlertCooldown.get(key) || 0;
  if (now - lastSent < ALERT_COOLDOWN_MS) {
    return false;
  }
  inMemoryAlertCooldown.set(key, now);
  return true;
}

/**
 * GET /api/v1/health
 * Liveness check endpoint (API-008 contract: { status: "UP", timestamp: <unix> })
 */
async function handleHealth(ctx: any): Promise<Response> {
  // 1. IP-based Rate Limit: 120 req/min
  const rateCheck = checkRateLimit(ctx.clientIp, 'route:health', 120, 60000);
  if (!rateCheck.allowed) {
    return errorResponse(
      'Çok fazla sağlık denetimi isteği gönderildi.',
      'TOO_MANY_REQUESTS',
      429,
      { 'Retry-After': String(rateCheck.retryAfter), ...ctx.corsHeaders },
      undefined,
      ctx.requestId
    );
  }

  // 2. 10s KV Caching Check for Liveness (API-008)
  const kv = ctx.env.IDEMPOTENCY_STORE;
  if (kv && typeof kv.get === 'function') {
    try {
      const cached = await kv.get('health:v1:liveness', 'json');
      if (cached) {
        return jsonResponse(cached, 200, ctx.corsHeaders, ctx.requestId);
      }
    } catch {
      // Ignore KV get error
    }
  }

  // 3. Narrowed Payload according to API-008 specification
  const nowUnix = Math.floor(Date.now() / 1000);
  const payload = {
    status: 'UP',
    timestamp: nowUnix
  };

  // 4. Save 10s Cache if KV Available
  if (kv && typeof kv.put === 'function') {
    try {
      await kv.put('health:v1:liveness', JSON.stringify(payload), { expirationTtl: 10 });
    } catch {
      // Ignore KV put error
    }
  }

  return jsonResponse(payload, 200, ctx.corsHeaders, ctx.requestId);
}

/**
 * GET /api/v1/readiness
 * Readiness check endpoint for D1 Database (SELECT 1) and R2 Storage (API-008)
 */
async function handleReadiness(ctx: any): Promise<Response> {
  // 1. IP-based Rate Limit: 120 req/min
  const rateCheck = checkRateLimit(ctx.clientIp, 'route:readiness', 120, 60000);
  if (!rateCheck.allowed) {
    return errorResponse(
      'Çok fazla hazır olma denetimi isteği gönderildi.',
      'TOO_MANY_REQUESTS',
      429,
      { 'Retry-After': String(rateCheck.retryAfter), ...ctx.corsHeaders },
      undefined,
      ctx.requestId
    );
  }

  // 2. Real D1 Connection Check (SELECT 1)
  let d1Status: 'UP' | 'DOWN' = 'DOWN';
  if (ctx.env.DB && typeof ctx.env.DB.prepare === 'function') {
    try {
      const res = await ctx.env.DB.prepare('SELECT 1 as ping').first();
      if (res && (res.ping === 1 || res.ping === '1' || Object.keys(res).length > 0)) {
        d1Status = 'UP';
      }
    } catch {
      d1Status = 'DOWN';
    }
  }

  // 3. Real R2 Storage Binding Check (Read-only list operation, non-destructive, zero-cost)
  let r2Status: 'UP' | 'DOWN' = 'DOWN';
  if (ctx.env.MEDIA && typeof ctx.env.MEDIA.list === 'function') {
    try {
      await ctx.env.MEDIA.list({ limit: 1 });
      r2Status = 'UP';
    } catch {
      r2Status = 'DOWN';
    }
  }

  const isReady = d1Status === 'UP' && r2Status === 'UP';

  // 4. If Unhealthy -> Safe Audit Log & Email Alert (COM-001) & Return HTTP 503
  if (!isReady) {
    if (d1Status === 'UP' && ctx.env.DB && typeof ctx.env.DB.prepare === 'function') {
      try {
        await ctx.env.DB.prepare(`
          INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          null,
          'HEALTH_CHECK_FAILED',
          ctx.url?.pathname || '/api/v1/readiness',
          JSON.stringify({ d1: d1Status, r2: r2Status }),
          ctx.clientIp || null
        ).run();
      } catch {
        // Ignore audit write failure during DB outage to prevent secondary errors
      }
    }

    // Trigger COM-001 Zero-Cost Email Alert (deduplicated via cooldown)
    shouldSendAlert(ctx, 'readiness_failure').then((canAlert) => {
      if (canAlert) {
        const recipient = ctx.env?.ADMIN_ALERT_EMAIL || 'admin@msklabs.com';
        sendEmail({
          to: recipient,
          subject: `[ALERT] Service Readiness Failure (${ctx.requestId})`,
          text: `Service Readiness Check Failed.\nStatus: DOWN\nD1: ${d1Status}\nR2: ${r2Status}\nCorrelation ID: ${ctx.requestId}\nTimestamp: ${new Date().toISOString()}`,
          html: `<h2>[ALERT] Service Readiness Failure</h2><p><strong>Status:</strong> DOWN</p><p><strong>D1 Database:</strong> ${d1Status}</p><p><strong>R2 Storage:</strong> ${r2Status}</p><p><strong>Correlation ID:</strong> ${ctx.requestId}</p><p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>`,
          env: ctx.env
        }).catch(() => {});
      }
    }).catch(() => {});

    return errorResponse(
      'Servis kullanılamıyor.',
      'SERVICE_UNAVAILABLE',
      503,
      ctx.corsHeaders,
      {
        status: 'DOWN',
        checks: {
          d1: d1Status,
          r2: r2Status
        }
      },
      ctx.requestId
    );
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  const payload = {
    status: 'READY',
    checks: {
      d1: d1Status,
      r2: r2Status
    },
    timestamp: nowUnix
  };

  return jsonResponse(payload, 200, ctx.corsHeaders, ctx.requestId);
}

// Canonical v1 Routes
healthRouter.get('/api/v1/health', handleHealth);
healthRouter.get('/api/v1/readiness', handleReadiness);

// Legacy Alias Routes (Preserved for backwards compatibility with existing clients and tests)
healthRouter.get('/api/health', handleHealth);
healthRouter.get('/api/readiness', handleReadiness);
