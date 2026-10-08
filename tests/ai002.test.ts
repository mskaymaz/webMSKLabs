import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import {
  analyzeSupportMessage,
  parseAndValidateAIResponse,
  createFallbackAnalysis,
  PROMPT_ID,
  PROMPT_VERSION
} from '../backend/src/services/aiAnalysis';

import { globalAIRateLimiter } from '../backend/src/utils/ai';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

describe('AI-002 — Otomatik Mesaj Analizi & Özet (Structured Output & HITL) Test Suite', () => {
  let db: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalAIRateLimiter.reset();

    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');

    const migrationDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = [
      '0001_devadmin_initial_schema.sql',
      '0002_seed_devadmin.sql'
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        db.exec(sql);
      }
    }
  });

  describe('1. Structured Output & Valid Message Analysis', () => {
    it('should parse valid AI JSON response into correct structured output schema', async () => {
      const mockAiResponse = JSON.stringify({
        spam: false,
        urgency: 'HIGH',
        category: 'ACCOUNT',
        summary: 'Kullanıcı giriş yapamıyor ve şifre sıfırlama e-postası ulaşmıyor.',
        suggestedReply: 'Merhaba, şifre sıfırlama bağlantısını manuel olarak e-posta adresinize gönderdik.',
        confidence: 0.95,
        reasoning: 'Giriş engeli kritik hesap erişim sorunudur.'
      });

      const mockFetch = vi.fn().mockImplementation(async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: mockAiResponse }] } }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await analyzeSupportMessage({
        ticketId: 'MSK-2026-0001',
        subject: 'Giriş Sorunu',
        message: 'Hesabıma giriş yapamıyorum.',
        db: null,
        aiConfig: {
          apiKey: 'test-key',
          fetchFn: mockFetch as any
        }
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('MSK-2026-0001');
      expect(result.analysis.spam).toBe(false);
      expect(result.analysis.urgency).toBe('HIGH');
      expect(result.analysis.category).toBe('ACCOUNT');
      expect(result.analysis.summary).toContain('şifre');
      expect(result.analysis.suggestedReply).toContain('Merhaba');
      expect(result.analysis.confidence).toBe(0.95);
      expect(result.metadata.fallback_used).toBe(false);
      expect(result.metadata.prompt_id).toBe(PROMPT_ID);
      expect(result.metadata.prompt_version).toBe(PROMPT_VERSION);
      expect(typeof result.metadata.latency_ms).toBe('number');
    });
  });

  describe('2. Zod Schema Validation & Fallback Handling', () => {
    it('should trigger fallback when AI response is broken JSON', () => {
      const brokenJson = '{ "spam": false, "urgency": "HIGH", invalid json... ';
      const parsed = parseAndValidateAIResponse(brokenJson);

      expect(parsed.fallbackUsed).toBe(true);
      expect(parsed.analysis.spam).toBe(false);
      expect(parsed.analysis.urgency).toBe('MEDIUM');
      expect(parsed.analysis.suggestedReply).toBeNull();
      expect(parsed.analysis.confidence).toBe(0);
      expect(parsed.analysis.reasoning).toContain('JSON parse failed');
    });

    it('should trigger fallback when AI response violates Zod schema (invalid urgency value)', () => {
      const invalidSchemaJson = JSON.stringify({
        spam: false,
        urgency: 'EXTREME_DANGER', // Invalid enum
        category: 'ACCOUNT',
        summary: 'Test summary',
        suggestedReply: 'Draft reply',
        confidence: 0.9,
        reasoning: 'Invalid enum test'
      });

      const parsed = parseAndValidateAIResponse(invalidSchemaJson);

      expect(parsed.fallbackUsed).toBe(true);
      expect(parsed.analysis.urgency).toBe('MEDIUM');
      expect(parsed.analysis.suggestedReply).toBeNull();
      expect(parsed.analysis.reasoning).toContain('Schema validation error');
    });

    it('should trigger fallback when confidence score is out of range (>1.0 or <0)', () => {
      const invalidConfidenceJson = JSON.stringify({
        spam: false,
        urgency: 'HIGH',
        category: 'ACCOUNT',
        summary: 'Confidence out of range test',
        suggestedReply: null,
        confidence: 1.5, // > 1.0 invalid
        reasoning: 'Out of range confidence'
      });

      const parsed = parseAndValidateAIResponse(invalidConfidenceJson);

      expect(parsed.fallbackUsed).toBe(true);
      expect(parsed.analysis.urgency).toBe('MEDIUM');
      expect(parsed.analysis.confidence).toBe(0);
    });

    it('should trigger fallback when required field (summary or category) is missing', () => {
      const missingFieldJson = JSON.stringify({
        spam: false,
        urgency: 'LOW',
        // category missing
        summary: 'Missing category test',
        confidence: 0.8,
        reasoning: 'Missing field test'
      });

      const parsed = parseAndValidateAIResponse(missingFieldJson);

      expect(parsed.fallbackUsed).toBe(true);
      expect(parsed.analysis.category).toBe('GENERAL');
      expect(parsed.analysis.urgency).toBe('MEDIUM');
    });

    it('should handle markdown fenced codeblock JSON cleanly', () => {
      const markdownJson = `\`\`\`json
{
  "spam": true,
  "urgency": "LOW",
  "category": "SPAM",
  "summary": "Reklam mesajı.",
  "suggestedReply": null,
  "confidence": 0.99,
  "reasoning": "Kripto reklamı içeriyor."
}
\`\`\``;

      const parsed = parseAndValidateAIResponse(markdownJson);
      expect(parsed.fallbackUsed).toBe(false);
      expect(parsed.analysis.spam).toBe(true);
      expect(parsed.analysis.urgency).toBe('LOW');
      expect(parsed.analysis.confidence).toBe(0.99);
    });
  });

  describe('3. PII Sanitization & Data/Instruction Boundary', () => {
    it('should mask email and phone numbers before sending to AI prompt', async () => {
      let capturedBody: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = JSON.parse(options.body);
        return new Response(
          JSON.stringify({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    spam: false,
                    urgency: 'LOW',
                    category: 'GENERAL',
                    summary: 'PII testi',
                    suggestedReply: 'Cevap',
                    confidence: 0.9,
                    reasoning: 'Reasoning'
                  })
                }]
              }
            }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      await analyzeSupportMessage({
        ticketId: 'MSK-2026-0002',
        subject: 'İletişim Talebi',
        message: 'Bana ahmet.yilmaz@test.com adresinden veya +90 (532) 999-8877 numarasından ulaşabilirsiniz.',
        aiConfig: {
          apiKey: 'test-key',
          fetchFn: mockFetch as any
        }
      });

      const userContent = capturedBody.contents[0].parts[0].text;
      expect(userContent).not.toContain('ahmet.yilmaz@test.com');
      expect(userContent).not.toContain('999-8877');
      expect(userContent).toContain('[EMAIL_REDACTED]');
      expect(userContent).toContain('[PHONE_REDACTED]');
      expect(capturedBody.systemInstruction.parts[0].text).toContain('You are an AI support analyst');
    });
  });

  describe('4. HITL & Database Storage (no auto-send, no auto-delete)', () => {
    it('should update ai_summary and ai_draft in DB without altering message status or urgency', async () => {
      // Seed ticket
      db.exec(`
        INSERT INTO messages (id, name, email, subject, message, status, urgency, category)
        VALUES ('MSK-2026-TEST', 'Mehmet Kaya', 'mehmet@example.com', 'Ödeme Sorunu', 'Kredi kartımdan iki kez çekim yapıldı.', 'NEW', 'NORMAL', 'GENERAL');
      `);

      const mockAiResponse = JSON.stringify({
        spam: false,
        urgency: 'CRITICAL',
        category: 'BILLING',
        summary: 'Mükerrer kart çekimi şikayeti.',
        suggestedReply: 'Merhaba Mehmet Bey, mükerrer çekim tutarı hesabınıza iade edilmiştir.',
        confidence: 0.98,
        reasoning: 'Çift çekim finansal aciliyet taşır.'
      });

      const mockFetch = vi.fn().mockImplementation(async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: mockAiResponse }] } }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      // Wrap DatabaseSync prepared statements to emulate D1 prepare interface
      const d1Db = {
        prepare: (sql: string) => {
          return {
            bind: (...args: any[]) => {
              return {
                run: async () => {
                  db.prepare(sql).run(...args);
                  return { success: true };
                }
              };
            }
          };
        }
      };

      await analyzeSupportMessage({
        ticketId: 'MSK-2026-TEST',
        subject: 'Ödeme Sorunu',
        message: 'Kredi kartımdan iki kez çekim yapıldı.',
        db: d1Db,
        aiConfig: {
          apiKey: 'test-key',
          fetchFn: mockFetch as any
        }
      });

      // Verify DB state
      const ticket = db.prepare("SELECT * FROM messages WHERE id = 'MSK-2026-TEST';").get() as any;

      // Status must remain NEW (HITL: No auto-resolution)
      expect(ticket.status).toBe('NEW');
      expect(ticket.urgency).toBe('NORMAL'); // Status & urgency unchanged in DB table
      expect(ticket.ai_summary).toBe('Mükerrer kart çekimi şikayeti.');
      expect(ticket.ai_draft).toContain('iade edilmiştir');

      // Verify Audit Event in message_events
      const event = db.prepare("SELECT * FROM message_events WHERE message_id = 'MSK-2026-TEST';").get() as any;
      expect(event).toBeTruthy();
      expect(event.event_type).toBe('AI_ANALYSIS_COMPLETED');
      expect(event.actor).toBe('AI_SYSTEM');

      const metadata = JSON.parse(event.metadata);
      expect(metadata.prompt_id).toBe(PROMPT_ID);
      expect(metadata.prompt_version).toBe(PROMPT_VERSION);
      expect(typeof metadata.latency_ms).toBe('number');
      expect(metadata.confidence).toBe(0.98);
      expect(metadata.urgency).toBe('CRITICAL');
    });
  });

  describe('5. Error Resilience & Empty Input', () => {
    it('should return graceful fallback when AI provider throws an error', async () => {
      const mockFetch = vi.fn().mockImplementation(async () =>
        new Response(JSON.stringify({ error: { message: 'Provider internal error' } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await analyzeSupportMessage({
        ticketId: 'MSK-2026-ERR',
        subject: 'Hata Testi',
        message: 'Sunucu hatası testi',
        aiConfig: {
          apiKey: 'test-key',
          fetchFn: mockFetch as any
        }
      });

      expect(result.success).toBe(true);
      expect(result.analysis.spam).toBe(false);
      expect(result.analysis.urgency).toBe('MEDIUM');
      expect(result.metadata.fallback_used).toBe(true);
      expect(result.analysis.reasoning).toContain('Fallback triggered');
    });

    it('should return fallback immediately when ticket content is empty', async () => {
      const result = await analyzeSupportMessage({
        ticketId: '',
        subject: '',
        message: ''
      });

      expect(result.success).toBe(false);
      expect(result.metadata.fallback_used).toBe(true);
    });
  });
});
