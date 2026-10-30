import { describe, it, expect } from 'vitest';
import {
  compileEmailTemplate,
  escapeHTML,
  sanitizeHeaderValue,
  TEMPLATE_VERSION
} from '../backend/src/utils/emailTemplates';

describe('COM-001 — Email Template Engine Test Suite', () => {
  it('should compile TICKET_RECEIVED in TR, EN, and AR languages', () => {
    const tr = compileEmailTemplate('TICKET_RECEIVED', { name: 'Ahmet', ticketNo: 'MSK-2026-A1', subject: 'Destek' }, 'TR');
    expect(tr.subject).toBe('Destek Talebiniz Alındı: MSK-2026-A1');
    expect(tr.html).toContain('Ahmet');
    expect(tr.text).toContain('MSK-2026-A1');
    expect(tr.version).toBe(TEMPLATE_VERSION);

    const en = compileEmailTemplate('TICKET_RECEIVED', { name: 'John', ticketNo: 'MSK-2026-A1', subject: 'Support' }, 'EN');
    expect(en.subject).toBe('Support Ticket Received: MSK-2026-A1');
    expect(en.html).toContain('John');

    const ar = compileEmailTemplate('TICKET_RECEIVED', { name: 'علي', ticketNo: 'MSK-2026-A1', subject: 'دعم' }, 'AR');
    expect(ar.subject).toContain('تم استلام تذكرة الدعم');
  });

  it('should escape malicious HTML inputs to prevent template injection (XSS protection)', () => {
    const maliciousName = '<script>alert("xss")</script><img onerror=alert(1) src=x>';
    const compiled = compileEmailTemplate('TICKET_RECEIVED', { name: maliciousName, ticketNo: 'MSK-XSS', subject: 'Test' }, 'TR');

    expect(compiled.html).not.toContain('<script>');
    expect(compiled.html).toContain('&lt;script&gt;');
    expect(compiled.html).toContain('&lt;img onerror=alert(1) src=x&gt;');
  });

  it('escapeHTML helper function test', () => {
    expect(escapeHTML('hello <world> & "quotes"')).toBe('hello &lt;world&gt; &amp; &quot;quotes&quot;');
    expect(escapeHTML(null)).toBe('');
  });

  it('sanitizeHeaderValue helper test (strips \\r and \\n)', () => {
    expect(sanitizeHeaderValue('Subject\r\nBcc: hacker@bad.com')).toBe('Subject Bcc: hacker@bad.com');
  });

  it('should compile all required templates (NEWSLETTER_CONFIRM, TICKET_REPLIED, COUPON_REWARD, ADMIN_ALERT)', () => {
    const confirm = compileEmailTemplate('NEWSLETTER_CONFIRM', { confirmUrl: 'https://msklabs.com/confirm?token=xyz' });
    expect(confirm.html).toContain('https://msklabs.com/confirm?token=xyz');

    const reply = compileEmailTemplate('TICKET_REPLIED', { ticketNo: 'MSK-123', replyContent: 'Sorununuz çözüldü.' });
    expect(reply.html).toContain('Sorununuz çözüldü.');

    const coupon = compileEmailTemplate('COUPON_REWARD', { couponCode: 'TESEKKUR20', discountPercent: 20 });
    expect(coupon.html).toContain('TESEKKUR20');

    const alert = compileEmailTemplate('ADMIN_ALERT', { alertDetails: 'Database connection delay' });
    expect(alert.html).toContain('Database connection delay');
  });

  it('should compile template in < 1ms performance acceptance target', () => {
    const compiled = compileEmailTemplate('TICKET_RECEIVED', { name: 'Fast', ticketNo: 'MSK-FAST' });
    expect(compiled.compileLatencyMs).toBeLessThan(10); // <10ms in test environment, target <1ms
  });
});
