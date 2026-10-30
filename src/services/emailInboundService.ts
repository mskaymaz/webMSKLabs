/**
 * MSK Labs — Cloudflare Email Routing Inbound Handler (COM-INBOUND-001)
 * Gelen e-postaları yakalayıp D1 messages tablosuna destek bileti olarak işler.
 * $0/Ay sıfır maliyet, Workers Email Event mimarisi.
 */

import { Env } from '../types/env.js';

export interface InboundEmailMessage {
  from: string;
  to: string;
  headers?: {
    get(name: string): string | null;
  };
  raw?: ReadableStream<Uint8Array>;
  text?: string;
  forward?(destination: string): Promise<void>;
  setReject?(reason: string): void;
}

export function generateInboundTicketId(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MSK-${year}-${randomPart}`;
}

export async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let result = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
      if (result.length > 65536) break;
    }
    result += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return result;
}

export function extractSenderName(fromHeader: string | null, fromEmail: string): string {
  if (fromHeader) {
    const match = fromHeader.match(/^"?([^"<]+)"?\s*<.+>$/);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
  }
  const emailPrefix = fromEmail.split('@')[0] || 'Kullanıcı';
  return emailPrefix
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function extractEmailBody(rawEmail: string): string {
  if (!rawEmail) return '(E-posta içeriği boş)';

  const headerEndPos = rawEmail.search(/\r?\n\r?\n/);
  const rawBody = headerEndPos !== -1 ? rawEmail.slice(headerEndPos).trim() : rawEmail.trim();

  const cleaned = rawBody
    .replace(/--[a-zA-Z0-9_-]+(--)?/g, '')
    .replace(/Content-Type:[^\n]+/gi, '')
    .replace(/Content-Transfer-Encoding:[^\n]+/gi, '')
    .replace(/charset=[^\n]+/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, 3000) || '(E-posta gövdesi okundu)';
}

export async function handleInboundEmail(
  message: InboundEmailMessage,
  env: Env,
  _ctx?: ExecutionContext
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  try {
    const senderEmail = (message.from || '').trim().toLowerCase();
    if (!senderEmail || !senderEmail.includes('@')) {
      return { success: false, error: 'Geçersiz gönderici e-posta adresi.' };
    }

    const fromHeader = message.headers?.get('from') || null;
    const senderName = extractSenderName(fromHeader, senderEmail);
    const subject = (message.headers?.get('subject') || '(Konu Belirtilmedi)').trim();

    let emailBody = '';
    if (typeof message.text === 'string' && message.text) {
      emailBody = message.text.trim();
    } else if (message.raw) {
      const rawText = await streamToText(message.raw);
      emailBody = extractEmailBody(rawText);
    } else {
      emailBody = '(İçerik belirtilmedi)';
    }

    const ticketId = generateInboundTicketId();

    if (env.DB && typeof env.DB.prepare === 'function') {
      try {
        await env.DB.prepare(`
          INSERT INTO messages (id, name, email, subject, message, status, urgency, category, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'NEW', 'NORMAL', 'EMAIL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(
          ticketId,
          senderName,
          senderEmail,
          subject,
          emailBody
        ).run();
      } catch {
        // Fallback schema: sender_name, sender_email, content
        await env.DB.prepare(`
          INSERT INTO messages (id, sender_name, sender_email, subject, content, status, urgency, category, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'open', 'medium', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(
          ticketId,
          senderName,
          senderEmail,
          subject,
          emailBody
        ).run();
      }

      try {
        await env.DB.prepare(`
          INSERT INTO admin_audit_logs (admin_id, action, resource, details_json, ip_address)
          VALUES (NULL, 'INBOUND_EMAIL_RECEIVED', ?, ?, 'EMAIL_ROUTING')
        `).bind(
          `/api/v1/support/email`,
          JSON.stringify({ ticketId, from: senderEmail, to: message.to, subject })
        ).run();
      } catch {
        // Ignore audit log error
      }
    }

    return { success: true, ticketId };
  } catch (err: any) {
    console.error('[INBOUND EMAIL PROCESSING ERROR]', err);
    return { success: false, error: err.message || 'E-posta işleme hatası.' };
  }
}
