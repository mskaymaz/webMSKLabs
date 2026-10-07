import { RequestContext } from '../types/router.js';

export interface TurnstileVerifyResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  statusCode?: number;
}

export async function verifyTurnstileToken(
  ctx: RequestContext,
  token?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = ctx.env.TURNSTILE_SECRET_KEY;

  if (!secretKey || secretKey.trim() === '') {
    if (ctx.env.ENVIRONMENT === 'production') {
      return {
        success: false,
        errorCode: 'SERVER_MISCONFIGURATION',
        errorMessage: 'Güvenlik konfigürasyon hatası.',
        statusCode: 500
      };
    }
    // Development / Test fallback without TURNSTILE_SECRET_KEY
    return { success: true };
  }

  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      success: false,
      errorCode: 'MISSING_TURNSTILE_TOKEN',
      errorMessage: 'Güvenlik doğrulaması (Turnstile token) gereklidir.',
      statusCode: 400
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const bodyData = new URLSearchParams();
    bodyData.append('secret', secretKey.trim());
    bodyData.append('response', token.trim());
    if (ctx.clientIp) {
      bodyData.append('remoteip', ctx.clientIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: bodyData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        errorCode: 'TURNSTILE_SERVICE_UNAVAILABLE',
        errorMessage: 'Güvenlik doğrulama servisine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.',
        statusCode: 503
      };
    }

    const data: any = await response.json();

    if (data && data.success === true) {
      return { success: true };
    }

    return {
      success: false,
      errorCode: 'INVALID_TURNSTILE_TOKEN',
      errorMessage: 'Güvenlik doğrulaması başarısız oldu. Lütfen tekrar deneyin.',
      statusCode: 422
    };
  } catch {
    // Fail-Closed: Return 503 Service Unavailable on API timeout/failure
    return {
      success: false,
      errorCode: 'TURNSTILE_SERVICE_UNAVAILABLE',
      errorMessage: 'Güvenlik doğrulama servisine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.',
      statusCode: 503
    };
  }
}
