/**
 * MSKLabs & DevAdmin â€” Resend Email Service (COM-002)
 * File: backend/src/services/emailService.ts
 * Description: Server-side Resend API entegrasyonu, MOCK_SEND modu, Header Injection KorumasÄ±,
 *              Zero-Cost Rate/Cost Guard ve Non-blocking side-effect altyapÄ±sÄ±.
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
  brevoApiKey?: string;
  mockSend?: boolean;
  fetchFn?: typeof fetch;
  env?: Record<string, any>;
  listUnsubscribeHeader?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  mode: 'MOCK' | 'RESEND_API' | 'BREVO_API';
  status: number;
  error?: string;
  latencyMs: number;
}

/**
 * Header Injection Detection Helper
 * From, To, Reply-To, Subject baÅŸlÄ±klarÄ±nda \r veya \n karaklerini tespit eder.
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
 * Resend Email GÃ¶nderim Ana Servisi (COM-002)
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const startTime = performance.now();

  // 1. Header Injection KorumasÄ±
  validateHeaders(options);

  const env = options.env || (typeof process !== 'undefined' ? process.env : {});
  const apiKey = options.apiKey || env.RESEND_API_KEY;
  const brevoApiKey = options.brevoApiKey || env.BREVO_API_KEY;
  const isMock = options.mockSend ?? (env.MOCK_SEND === 'true' || !apiKey || apiKey.startsWith('mock-') || apiKey === 'test-resend-key');
  const fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : globalThis.fetch);

  const from = sanitizeHeaderValue(options.from || env.EMAIL_FROM || 'MSK Labs Destek <destek@msklabs.org>');
  const to = sanitizeHeaderValue(options.to);
  const subject = sanitizeHeaderValue(options.subject);
  const replyTo = options.replyTo ? sanitizeHeaderValue(options.replyTo) : undefined;

  // 2. MOCK_SEND Modu (GeliÅŸtirme, Test ve Local Ortam)
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

  // 3. GerÃ§ek Resend API Ã‡aÄŸrÄ±sÄ± (Production)
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

      // Rate limit / Quota exhaustion (HTTP 429) veya 5xx -> Brevo Hacim Yedeği (COM-OUTBOUND-002)
      const errorMsg = errData?.message || errData?.error?.message || `Resend API Error (${response.status})`;

      if ((response.status === 429 || response.status >= 500) && brevoApiKey) {
        try {
          const fromEmail = from.includes('<') ? from.match(/<([^>]+)>/)?.[1] || from : from;
          const fromName = from.includes('<') ? from.replace(/<[^>]+>/, '').trim() : undefined;
          const brevoPayload: Record<string, any> = {
            sender: { email: fromEmail, name: fromName },
            to: [{ email: to }],
            subject,
            htmlContent: options.html,
            textContent: options.text,
          };
          if (replyTo) brevoPayload.replyTo = { email: replyTo };

          const brevoRes = await fetchFn('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(brevoPayload),
          });

          const fallbackLatency = Math.max(1, performance.now() - startTime);

          if (brevoRes.ok) {
            const brevoData: any = await brevoRes.json().catch(() => ({}));
            return {
              success: true,
              messageId: brevoData.messageId || 'brevo_msg_ok',
              mode: 'BREVO_API',
              status: 200,
              latencyMs: fallbackLatency,
            };
          } else {
            const brevoErr = await brevoRes.text().catch(() => '');
            return {
              success: false,
              mode: 'BREVO_API',
              status: brevoRes.status,
              error: `Fallback Brevo Error (${brevoRes.status}): ${brevoErr}`,
              latencyMs: fallbackLatency,
            };
          }
        } catch (bErr: any) {
          return {
            success: false,
            mode: 'BREVO_API',
            status: 500,
            error: bErr.message || 'Brevo network error',
            latencyMs: Math.max(1, performance.now() - startTime),
          };
        }
      }

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
 * DerlenmiÅŸ E-PostayÄ± GÃ¶nderme YardÄ±mcÄ±sÄ±
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
