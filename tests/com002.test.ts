import { describe, it, expect, vi } from 'vitest';
import { sendEmail, validateHeaders } from '../backend/src/services/emailService';

describe('COM-002 — Resend Email Service Test Suite', () => {
  it('should reject email headers containing CR/LF characters (Header Injection Protection)', () => {
    expect(() => validateHeaders({ to: 'user@example.com\r\nBcc: hacker@bad.com', subject: 'Normal' })).toThrow();
    expect(() => validateHeaders({ to: 'user@example.com', subject: 'Subject\nHacked' })).toThrow();
  });

  it('should send email in MOCK_SEND mode when apiKey is mock or MOCK_SEND=true', async () => {
    const res = await sendEmail({
      to: 'alici@example.com',
      subject: 'Test Subject',
      html: '<p>Body</p>',
      text: 'Body',
      mockSend: true
    });

    expect(res.success).toBe(true);
    expect(res.mode).toBe('MOCK');
    expect(res.status).toBe(200);
    expect(res.messageId).toContain('mock_msg_');
  });

  it('should call Resend HTTP API in production mode with Bearer token', async () => {
    const mockFetch = vi.fn().mockImplementation(async (_url, opts) => {
      const headers = opts.headers;
      expect(headers['Authorization']).toBe('Bearer re_valid_resend_key');
      return new Response(JSON.stringify({ id: 're_msg_12345' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const res = await sendEmail({
      to: 'alici@example.com',
      subject: 'Production Subject',
      html: '<p>Prod Body</p>',
      text: 'Prod Body',
      apiKey: 're_valid_resend_key',
      mockSend: false,
      fetchFn: mockFetch
    });

    expect(res.success).toBe(true);
    expect(res.mode).toBe('RESEND_API');
    expect(res.messageId).toBe('re_msg_12345');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle Resend API 429 quota limit gracefully without paid fallback', async () => {
    const mockFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await sendEmail({
      to: 'alici@example.com',
      subject: 'Quota Test',
      html: '<p>Body</p>',
      text: 'Body',
      apiKey: 're_valid_resend_key',
      mockSend: false,
      fetchFn: mockFetch
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe(429);
    expect(res.error).toContain('Rate limit exceeded');
  });

  it('should send email with latency < 400ms acceptance target', async () => {
    const res = await sendEmail({
      to: 'alici@example.com',
      subject: 'Latency Test',
      html: '<p>Body</p>',
      text: 'Body',
      mockSend: true
    });

    expect(res.latencyMs).toBeLessThan(400);
  });
});
