import { describe, it, expect, vi } from 'vitest';
import {
  extractSenderName,
  extractEmailBody,
  streamToText,
  generateInboundTicketId,
  handleInboundEmail
} from '../src/services/emailInboundService.js';
import worker from '../src/index.js';

describe('COM-INBOUND-001 — Cloudflare Email Routing & Gelen E-Posta Destek Bileti Köprüsü', () => {
  it('1. should extract clean sender name from From header or email address', () => {
    expect(extractSenderName('Ahmet Yılmaz <ahmet@example.com>', 'ahmet@example.com')).toBe('Ahmet Yılmaz');
    expect(extractSenderName('"Mehmet Ali" <mehmet@example.com>', 'mehmet@example.com')).toBe('Mehmet Ali');
    expect(extractSenderName(null, 'ali.veli@gmail.com')).toBe('Ali Veli');
    expect(extractSenderName('', 'support@msklabs.org')).toBe('Support');
  });

  it('2. should extract clean email body from raw MIME email string', () => {
    const rawMime = `From: user@example.com\r\nSubject: Yardım Lütfen\r\nContent-Type: text/plain\r\n\r\nMerhaba MSK Labs Ekibi, uygulamada bir hata aldım. Teşekkürler.`;
    const body = extractEmailBody(rawMime);
    expect(body).toContain('Merhaba MSK Labs Ekibi');
    expect(body).not.toContain('Subject:');
  });

  it('3. should read readable stream into string cleanly with streamToText', async () => {
    const textData = 'Bu bir test e-posta stream içeriğidir.';
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(textData));
        controller.close();
      }
    });

    const result = await streamToText(stream);
    expect(result).toBe(textData);
  });

  it('4. should generate unique MSK-YYYY-XXXX formatted ticket ID', () => {
    const id = generateInboundTicketId();
    expect(id).toMatch(/^MSK-\d{4}-[A-Z0-9]{4}$/);
  });

  it('5. should reject inbound email without valid sender address', async () => {
    const res = await handleInboundEmail(
      { from: 'invalid-email', to: 'destek@msklabs.org' },
      {} as any
    );
    expect(res.success).toBe(false);
    expect(res.error).toContain('Geçersiz');
  });

  it('6. should process inbound email and insert ticket into D1 database', async () => {
    const mockDbRuns: any[] = [];
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockImplementation((...args: any[]) => {
          mockDbRuns.push(args);
          return {
            run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } })
          };
        })
      })
    };

    const mockMessage = {
      from: 'kullanici@ornek.com',
      to: 'destek@msklabs.org',
      headers: {
        get: (name: string) => (name.toLowerCase() === 'subject' ? 'Mobil Uygulama Hatası' : null)
      },
      text: 'Uygulama açılırken beyaz ekranda kalıyor, yardım eder misiniz?'
    };

    const env = { DB: mockDb } as any;
    const res = await handleInboundEmail(mockMessage, env);

    expect(res.success).toBe(true);
    expect(res.ticketId).toBeDefined();
    expect(mockDb.prepare).toHaveBeenCalled();
    expect(mockDbRuns.length).toBeGreaterThanOrEqual(1);

    const firstRunArgs = mockDbRuns[0];
    expect(firstRunArgs).toContain('kullanici@ornek.com');
    expect(firstRunArgs).toContain('Mobil Uygulama Hatası');
  });

  it('7. should verify Worker entry exports both fetch and email event handlers', () => {
    expect(typeof worker.fetch).toBe('function');
    expect(typeof worker.email).toBe('function');
  });
});
