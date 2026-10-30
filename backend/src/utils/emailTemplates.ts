/**
 * MSKLabs & DevAdmin — Email Template Engine (COM-001)
 * File: backend/src/utils/emailTemplates.ts
 * Description: TR / EN / AR dillerinde HTML ve plain-text e-posta şablon motoru.
 *              escapeHTML, template injection koruması, responsive/accessible tasarım.
 */

export const TEMPLATE_VERSION = '1.0.0';

export type SupportedLanguage = 'TR' | 'EN' | 'AR';

export type TemplateType =
  | 'TICKET_RECEIVED'
  | 'TICKET_REPLIED'
  | 'NEWSLETTER_CONFIRM'
  | 'UNSUBSCRIBE_CONFIRM'
  | 'BROADCAST_NEWSLETTER'
  | 'COUPON_REWARD'
  | 'ADMIN_ALERT';

export interface EmailTemplateData {
  name?: string;
  ticketNo?: string;
  subject?: string;
  message?: string;
  replyContent?: string;
  confirmUrl?: string;
  unsubscribeUrl?: string;
  broadcastHtml?: string;
  couponCode?: string;
  discountPercent?: number;
  alertDetails?: string;
  [key: string]: any;
}

export interface CompiledEmail {
  templateId: TemplateType;
  version: string;
  language: SupportedLanguage;
  subject: string;
  html: string;
  text: string;
  compileLatencyMs: number;
}

/**
 * XSS & Template Injection Protection Helper
 * Kullanıcı girdilerini (isim, konu, mesaj vb.) HTML entities olarak escape eder.
 */
export function escapeHTML(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Header Injection Protection Helper
 * From, To, Reply-To, Subject alanlarında \r veya \n karaklerini engeller/temizler.
 */
export function sanitizeHeaderValue(value: string | undefined | null): string {
  if (!value) return '';
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Common Responsive Base HTML Wrapper
 */
function wrapInBaseLayout(contentHtml: string, lang: SupportedLanguage = 'TR'): string {
  const isRtl = lang === 'AR';
  const dir = isRtl ? 'rtl' : 'ltr';

  return `<!DOCTYPE html>
<html lang="${lang.toLowerCase()}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; color: #172b4d; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0052cc; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .body { padding: 32px 24px; line-height: 1.6; font-size: 15px; }
    .btn { display: inline-block; background: #0052cc; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; margin-top: 16px; }
    .footer { background: #f4f5f7; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b778c; }
    .footer a { color: #6b778c; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MSKLabs</h1>
    </div>
    <div class="body">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MSKLabs. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Ana Şablon Derleyici (COM-001)
 */
export function compileEmailTemplate(
  templateId: TemplateType,
  data: EmailTemplateData,
  lang: SupportedLanguage = 'TR'
): CompiledEmail {
  const startTime = performance.now();

  const safeName = escapeHTML(data.name || (lang === 'EN' ? 'User' : lang === 'AR' ? 'المستخدم' : 'Kullanıcı'));
  const safeTicketNo = escapeHTML(data.ticketNo);
  const safeSubject = sanitizeHeaderValue(data.subject);
  const safeMessage = escapeHTML(data.message);
  const safeReply = escapeHTML(data.replyContent);
  const safeConfirmUrl = escapeHTML(data.confirmUrl);
  const safeUnsubUrl = escapeHTML(data.unsubscribeUrl);
  const safeCoupon = escapeHTML(data.couponCode);

  let subject = '';
  let bodyHtml = '';
  let bodyText = '';

  switch (templateId) {
    case 'TICKET_RECEIVED': {
      if (lang === 'EN') {
        subject = `Support Ticket Received: ${safeTicketNo}`;
        bodyHtml = `<h2>Hello ${safeName},</h2>
<p>We have received your support ticket <strong>#${safeTicketNo}</strong>.</p>
<p><strong>Subject:</strong> ${escapeHTML(safeSubject)}</p>
<p>Our team will review your message and reply as soon as possible.</p>`;
        bodyText = `Hello ${safeName},\n\nWe have received your support ticket #${safeTicketNo}.\nSubject: ${safeSubject}\n\nOur team will reply as soon as possible.`;
      } else if (lang === 'AR') {
        subject = `تم استلام تذكرة الدعم: ${safeTicketNo}`;
        bodyHtml = `<h2>مرحباً ${safeName}،</h2>
<p>تم استلام تذكرة الدعم الخاص بك برقم <strong>#${safeTicketNo}</strong>.</p>
<p>سوف يقوم فريقنا بالرد عليك في أقرب وقت ممكن.</p>`;
        bodyText = `مرحباً ${safeName}،\n\nتم استلام تذكرة الدعم #${safeTicketNo}.\n\nسوف يقوم فريقنا بالرد عليك قريبًا.`;
      } else {
        subject = `Destek Talebiniz Alındı: ${safeTicketNo}`;
        bodyHtml = `<h2>Merhaba ${safeName},</h2>
<p><strong>#${safeTicketNo}</strong> numaralı destek biletiniz sistemimize başarıyla ulaştı.</p>
<p><strong>Konu:</strong> ${escapeHTML(safeSubject)}</p>
<p>Destek ekibimiz mesajınızı en kısa sürede inceleyip yanıtlayacaktır.</p>`;
        bodyText = `Merhaba ${safeName},\n\n#${safeTicketNo} numaralı destek biletiniz başarıyla ulaştı.\nKonu: ${safeSubject}\n\nEkibimiz en kısa sürede yanıtlayacaktır.`;
      }
      break;
    }

    case 'TICKET_REPLIED': {
      if (lang === 'EN') {
        subject = `Reply to Ticket #${safeTicketNo}`;
        bodyHtml = `<h2>Hello ${safeName},</h2>
<p>Your support ticket <strong>#${safeTicketNo}</strong> has been replied to:</p>
<blockquote style="background:#f4f5f7; padding:12px; border-left:4px solid #0052cc;">${safeReply}</blockquote>`;
        bodyText = `Hello ${safeName},\n\nYour ticket #${safeTicketNo} has been replied to:\n\n${safeReply}`;
      } else if (lang === 'AR') {
        subject = `الرد على تذكرة الدعم #${safeTicketNo}`;
        bodyHtml = `<h2>مرحباً ${safeName}،</h2>
<p>تم الرد على تذكرتك <strong>#${safeTicketNo}</strong>:</p>
<blockquote style="background:#f4f5f7; padding:12px;">${safeReply}</blockquote>`;
        bodyText = `مرحباً ${safeName}،\n\nتم الرد على تذكرتك #${safeTicketNo}:\n\n${safeReply}`;
      } else {
        subject = `Destek Biletiniz Yanıtlandı: #${safeTicketNo}`;
        bodyHtml = `<h2>Merhaba ${safeName},</h2>
<p><strong>#${safeTicketNo}</strong> numaralı destek biletiniz yanıtlandı:</p>
<blockquote style="background:#f4f5f7; padding:12px; border-left:4px solid #0052cc;">${safeReply}</blockquote>`;
        bodyText = `Merhaba ${safeName},\n\n#${safeTicketNo} numaralı biletiniz yanıtlandı:\n\n${safeReply}`;
      }
      break;
    }

    case 'NEWSLETTER_CONFIRM': {
      if (lang === 'EN') {
        subject = 'Confirm Your Newsletter Subscription';
        bodyHtml = `<h2>Welcome!</h2>
<p>Please confirm your subscription to the MSKLabs newsletter by clicking below:</p>
<p><a href="${safeConfirmUrl}" class="btn">Confirm Subscription</a></p>`;
        bodyText = `Welcome!\n\nPlease confirm your subscription by visiting:\n${safeConfirmUrl}`;
      } else if (lang === 'AR') {
        subject = 'تأكيد الاشتراك في النشرة الإخبارية';
        bodyHtml = `<h2>مرحباً بك!</h2>
<p>يرجى تأكيد اشتراكك بالضغط على الرابط أدناه:</p>
<p><a href="${safeConfirmUrl}" class="btn">تأكيد الاشتراك</a></p>`;
        bodyText = `مرحباً بك!\n\nيرجى تأكيد اشتراكك عبر الرابط:\n${safeConfirmUrl}`;
      } else {
        subject = 'E-Bülten Aboneliğinizi Doğrulayın';
        bodyHtml = `<h2>Hoş Geldiniz!</h2>
<p>MSKLabs e-bülten aboneliğinizi tamamlamak için lütfen aşağıdaki bağlantıya tıklayın:</p>
<p><a href="${safeConfirmUrl}" class="btn">Aboneliği Doğrula</a></p>`;
        bodyText = `Hoş Geldiniz!\n\nAboneliğinizi doğrulamak için şu adresi ziyaret edin:\n${safeConfirmUrl}`;
      }
      break;
    }

    case 'UNSUBSCRIBE_CONFIRM': {
      subject = lang === 'EN' ? 'Unsubscribed Successfully' : lang === 'AR' ? 'تم إلغاء الاشتراك' : 'Aboneliğiniz Sonlandırıldı';
      bodyHtml = `<h2>${subject}</h2>
<p>${lang === 'EN' ? 'You have been unsubscribed from our mailing list.' : lang === 'AR' ? 'لقد تم إلغاء اشتراكك بنجاح.' : 'E-bülten aboneliğiniz başarıyla sonlandırılmıştır.'}</p>`;
      bodyText = `${subject}\n\n${lang === 'EN' ? 'You have been unsubscribed.' : 'Aboneliğiniz sonlandırılmıştır.'}`;
      break;
    }

    case 'BROADCAST_NEWSLETTER': {
      subject = safeSubject || (lang === 'EN' ? 'MSKLabs Announcement' : 'MSKLabs Duyurusu');
      bodyHtml = data.broadcastHtml || `<p>${safeMessage}</p>`;
      bodyText = data.message || 'MSKLabs Announcement';
      if (safeUnsubUrl) {
        bodyHtml += `<p style="margin-top:24px; font-size:12px;"><a href="${safeUnsubUrl}">Unsubscribe</a></p>`;
      }
      break;
    }

    case 'COUPON_REWARD': {
      const discount = data.discountPercent ? `${data.discountPercent}%` : '';
      subject = lang === 'EN' ? `Your ${discount} Discount Coupon` : `Özel %${data.discountPercent || ''} İndirim Kuponunuz`;
      bodyHtml = `<h2>${subject}</h2>
<p>Kupon Kodunuz: <strong style="font-size:18px; color:#0052cc;">${safeCoupon}</strong></p>`;
      bodyText = `${subject}\n\nKupon Kodunuz: ${safeCoupon}`;
      break;
    }

    case 'ADMIN_ALERT': {
      subject = `[ADMIN ALERT] ${safeSubject || 'System Notification'}`;
      bodyHtml = `<h2>System Alert</h2>
<p>${escapeHTML(data.alertDetails || safeMessage)}</p>`;
      bodyText = `System Alert\n\n${data.alertDetails || safeMessage}`;
      break;
    }
  }

  const finalHtml = wrapInBaseLayout(bodyHtml, lang);
  const latencyMs = Math.max(0, performance.now() - startTime);

  return {
    templateId,
    version: TEMPLATE_VERSION,
    language: lang,
    subject: sanitizeHeaderValue(subject),
    html: finalHtml,
    text: bodyText,
    compileLatencyMs: latencyMs
  };
}
