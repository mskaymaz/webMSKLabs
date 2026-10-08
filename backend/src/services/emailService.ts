/**
 * MSKLabs & DevAdmin — Resend Email Service (COM-002)
 * File: backend/src/services/emailService.ts
 * Description: Server-side Resend API entegrasyonu, MOCK_SEND modu, Header Injection Koruması,
 *              Zero-Cost Rate/Cost Guard ve Non-blocking side-effect altyapısı.
 */

import { CompiledEmail, sanitizeHeaderValue } from '../utils/emailTemplates';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  apiKey?: string;
  mockSend?: boolean;
  fetchFn?: typeof fetch;
  env?: Record<string, any>;
  listUnsubscribeHeader?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  mode: 'MOCK' | 'RESEND_API';
  status: number;
  error?: string;
  latencyMs: number;
}

/**
 * Header Injection Detection Helper
 * From, To, Reply-To, Subject başlıklarında \r veya \n karaklerini tespit eder.
 */
export function validateHeaders(options: { to: string; subject: string; from?: string; replyTo?: string }): void {
  const check = (name: string, val?: string) => {
    if (val && (/[\r\n]/.test(val))) {
      throw new Error(`HeaderInjectionError: Invalid character in header ${name}`);
    }
  };

  check('To', options.to);
  check('Subject', options.subject);
  check('From', options.from);
  check('Reply-To', options.replyTo);
}

/**
 * Resend Email Gönderim Ana Servisi (COM-002)
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const startTime = performance.now();

  // 1. Header Injection Koruması
  validateHeaders(options);

  const env = options.env || (typeof process !== 'undefined' ? process.env : {});
  const apiKey = options.apiKey || env.RESEND_API_KEY;
  const isMock = options.mockSend ?? (env.MOCK_SEND === 'true' || !apiKey || apiKey.startsWith('mock-') || apiKey === 'test-resend-key');
  const fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : globalThis.fetch);

  const from = sanitizeHeaderValue(options.from || env.EMAIL_FROM || 'MSKLabs Destek <destek@msklabs.com>');
  const to = sanitizeHeaderValue(options.to);
  const subject = sanitizeHeaderValue(options.subject);
  const replyTo = options.replyTo ? sanitizeHeaderValue(options.replyTo) : undefined;

  // 2. MOCK_SEND Modu (Geliştirme, Test ve Local Ortam)
  if (isMock) {
    const mockLatency = Math.max(1, performance.now() - startTime);
    return {
      success: true,
      messageId: `mock_msg_${Math.random().toString(36).substring(2, 10)}`,
      mode: 'MOCK',
      status: 200,
      latencyMs: mockLatency
    };
  }

  // 3. Gerçek Resend API Çağrısı (Production)
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const payload: Record<string, any> = {
    from,
    to: [to],
    subject,
    html: options.html,
    text: options.text
  };

  if (replyTo) payload.reply_to = replyTo;
  if (options.listUnsubscribeHeader) {
    payload.headers = {
      'List-Unsubscribe': options.listUnsubscribeHeader
    };
  }

  try {
    const response = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const latencyMs = Math.max(1, performance.now() - startTime);

    if (!response.ok) {
      let errData: any = {};
      try {
        errData = await response.json();
      } catch (_) {}

      // Rate limit / Quota exhaustion (HTTP 429) -> Paid fallback YAPILMAZ (Zero-Cost Guard)
      const errorMsg = errData?.message || errData?.error?.message || `Resend API Error (${response.status})`;
      return {
        success: false,
        mode: 'RESEND_API',
        status: response.status,
        error: errorMsg,
        latencyMs
      };
    }

    const data: any = await response.json();
    return {
      success: true,
      messageId: data.id || 'resend_ok',
      mode: 'RESEND_API',
      status: 200,
      latencyMs
    };
  } catch (err: any) {
    const latencyMs = Math.max(1, performance.now() - startTime);
    return {
      success: false,
      mode: 'RESEND_API',
      status: 500,
      error: err.message || 'Network error while calling Resend API',
      latencyMs
    };
  }
}

/**
 * Derlenmiş E-Postayı Gönderme Yardımcısı
 */
export async function sendCompiledEmail(
  compiled: CompiledEmail,
  to: string,
  options: Partial<SendEmailOptions> = {}
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: compiled.subject,
    html: compiled.html,
    text: compiled.text,
    ...options
  });
}
