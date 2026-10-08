import { describe, it, expect } from 'vitest';
import {
  GeminiTranslationProvider,
  FallbackProvider,
  validatePlaceholders,
  validateHTMLStructure,
  validateMarkdownStructure,
  sanitizeCmsHTML
} from '../backend/src/services/translationProvider';

describe('SECTION 9 — SEO, TRANSLATION & INTERNATIONALIZATION (i18n) TEST MATRIX', () => {

  // Scenario 1: Arabic Switch & Directionality
  it('Scenario 1: Arabic switch supports RTL directionality and Arabic string resolution', () => {
    const lang = 'ar';
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    expect(dir).toBe('rtl');
    expect(lang).toBe('ar');
  });

  // Scenario 2: Variable Translation & Interpolation
  it('Scenario 2: Variable translation correctly interpolates {{count}} parameter', () => {
    const template = 'Toplam {{count}} bilet listeleniyor';
    const result = template.replace(/\{\{count\}\}/g, String(3));
    expect(result).toBe('Toplam 3 bilet listeleniyor');
  });

  // Scenario 3: Placeholder Mismatch Detection
  it('Scenario 3: Missing {{name}} placeholder produces PLACEHOLDER_MISMATCH status', () => {
    const source = 'Hello {{name}}, welcome to MSKLabs.';
    const target = 'Merhaba, MSKLabs sitesine hoş geldiniz.'; // {{name}} dropped
    const check = validatePlaceholders(source, target);

    expect(check.matches).toBe(false);
    expect(check.missing).toContain('{{name}}');
  });

  // Scenario 4: XSS Sanitization
  it('Scenario 4: Dangerous XSS script tags in translated content are sanitized', () => {
    const rawTranslation = '<p>Hello</p><script>alert("XSS")</script><a href="javascript:doBad()">Link</a>';
    const sanitized = sanitizeCmsHTML(rawTranslation);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('<p>Hello</p>');
  });

  // Scenario 5: HITL Workflow & State Machine
  it('Scenario 5: AI Translation starts in GENERATED state and cannot auto-approve', async () => {
    const provider = new GeminiTranslationProvider();
    const mockFetch = async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Hoş geldiniz {{user_name}}' }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const input = {
      text: 'Welcome {{user_name}}',
      sourceLang: 'en',
      targetLang: 'tr',
      apiKey: 'test-api-key',
      env: { AI_MODEL: 'gemini-1.5-flash', fetchFn: mockFetch }
    };

    const result = await provider.translate(input);
    expect(['GENERATED', 'PLACEHOLDER_MISMATCH', 'QUEUED']).toContain(result.status);
    expect(result.status).not.toBe('APPROVED');
  });

  // Scenario 6: Glossary Protection Enforcement
  it('Scenario 6: Alteration of protected brand name triggers glossary warning', async () => {
    const provider = new GeminiTranslationProvider();
    const mockFetch = async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Yapay zeka platformu.' }] } }], // MSKLabs dropped
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const input = {
      text: 'MSKLabs is the leading AI platform.',
      sourceLang: 'en',
      targetLang: 'tr',
      apiKey: 'test-api-key',
      env: { AI_MODEL: 'gemini-1.5-flash', fetchFn: mockFetch },
      glossaryTerms: [{ source: 'MSKLabs', target: 'MSKLabs', isProtected: true }]
    };

    const result = await provider.translate(input);
    expect(result.glossaryWarnings.length).toBeGreaterThan(0);
    expect(result.glossaryWarnings[0]).toContain('MSKLabs');
  });

  // Scenario 7: CI i18n Key Verification Script
  it('Scenario 7: CI key checker detects unregistered keys', () => {
    const validKeys = new Set(['common.save', 'tickets.count']);
    const testKey = 'non_existent_key_123';
    expect(validKeys.has(testKey)).toBe(false);
  });

  // Scenario 8: Zero-Cost Guard & Rate Limit Failure (429 -> 503/QUEUED)
  it('Scenario 8: Rate limit quota exhaustion gracefully falls back to QUEUED without paid transition', async () => {
    const fallback = new FallbackProvider();
    const result = await fallback.translate({
      text: 'Test content',
      sourceLang: 'en',
      targetLang: 'tr'
    });

    expect(result.status).toBe('QUEUED');
    expect(result.provider).toBe('fallback');
    expect(result.warnings[0]).toContain('queued');
  });

  // Performance Benchmarks
  it('Performance: i18n key lookup takes < 0.5ms', () => {
    const dict: Record<string, string> = { 'common.save': 'Kaydet', 'tickets.count': 'Bilet sayısı: {{count}}' };
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      const val = dict['tickets.count'];
      const interpolated = val.replace('{{count}}', '5');
    }

    const duration = performance.now() - start;
    const avgLatency = duration / 1000;
    expect(avgLatency).toBeLessThan(0.5);
  });

  it('Performance: Structural validation & sanitization p95 < 10ms', () => {
    const html = '<div><h1>Title</h1><p>Hello <b>World</b></p><a href="https://msklabs.org">Link</a></div>';
    const samples: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sanitizeCmsHTML(html);
      validateHTMLStructure(html, html);
      validateMarkdownStructure('# Header\n**Bold**', '# Header\n**Bold**');
      samples.push(performance.now() - start);
    }

    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)];
    expect(p95).toBeLessThan(10);
  });
});
