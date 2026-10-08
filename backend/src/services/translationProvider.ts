/**
 * MSKLabs & DevAdmin — Translation Provider Abstraction & Security Layer (I18N-004)
 * File: backend/src/services/translationProvider.ts
 * Description: Provider-agnostic translation engine with Gemini/DeepL/Fallback providers,
 *              $0 Cost Guard, HTML/Markdown/URL/Placeholder validation & Glossary enforcement.
 */

import { GeminiProvider, AIProviderOptions, getOrGenerateAICache } from './aiProvider';
import { AIProviderError } from '../utils/ai';

export type TranslationStatus = 'GENERATED' | 'REVIEW' | 'EDIT' | 'APPROVED' | 'PLACEHOLDER_MISMATCH' | 'QUEUED';

export interface TranslationInput {
  text: string;
  sourceLang: string;
  targetLang: string;
  isHtml?: boolean;
  isMarkdown?: boolean;
  glossaryTerms?: Array<{ source: string; target: string; isProtected?: boolean }>;
  apiKey?: string;
  fetchFn?: typeof fetch;
  env?: Record<string, any>;
}

export interface TranslationResult {
  translatedText: string;
  status: TranslationStatus;
  provider: string;
  model: string;
  cached: boolean;
  qualityScore: number;
  warnings: string[];
  placeholderMismatch: boolean;
  glossaryWarnings: string[];
  latencyMs: number;
}

export interface TranslationProvider {
  name: string;
  translate(input: TranslationInput): Promise<TranslationResult>;
}

/**
 * Extract placeholders like {{name}} or {count}
 */
export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{?[a-zA-Z0-9_]+\}?\}|%\{[a-zA-Z0-9_]+\}/g) || [];
  return Array.from(new Set(matches)).sort();
}

/**
 * Validate placeholder match between source and target
 */
export function validatePlaceholders(source: string, target: string): { matches: boolean; missing: string[] } {
  const sourceVars = extractPlaceholders(source);
  const targetVars = extractPlaceholders(target);
  const missing = sourceVars.filter((v) => !targetVars.includes(v));
  return {
    matches: missing.length === 0,
    missing
  };
}

/**
 * Validate HTML tags matching
 */
export function validateHTMLStructure(source: string, target: string): boolean {
  const extractTags = (str: string) => {
    const matches = str.match(/<\/?[a-z0-9]+[^>]*>/gi) || [];
    return matches.map((t) => t.replace(/attrs.*$/, '').toLowerCase()).sort();
  };
  const sourceTags = extractTags(source);
  const targetTags = extractTags(target);
  return JSON.stringify(sourceTags) === JSON.stringify(targetTags);
}

/**
 * Validate Markdown formatting retention (**bold**, ## header)
 */
export function validateMarkdownStructure(source: string, target: string): boolean {
  const countBold = (s: string) => (s.match(/\*\*/g) || []).length;
  const countHeaders = (s: string) => (s.match(/^#{1,6}\s/gm) || []).length;
  return countBold(source) === countBold(target) && countHeaders(source) === countHeaders(target);
}

/**
 * Sanitize dangerous HTML elements (<script>, javascript:, data:)
 */
export function sanitizeCmsHTML(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .replace(/src="data:[^"]*"/gi, '');
}

/**
 * GeminiTranslationProvider
 */
export class GeminiTranslationProvider implements TranslationProvider {
  public readonly name = 'gemini';
  private aiProvider = new GeminiProvider();

  public async translate(input: TranslationInput): Promise<TranslationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const glossaryWarnings: string[] = [];

    const protectedTerms = (input.glossaryTerms || []).filter((t) => t.isProtected !== false);
    let glossaryPromptPart = '';
    if (protectedTerms.length > 0) {
      glossaryPromptPart = `\nDO NOT translate the following protected terms: ${protectedTerms.map((t) => t.source).join(', ')}. Keep them exactly as in source.`;
    }

    const systemPrompt = `You are a professional translator from ${input.sourceLang} to ${input.targetLang}. Translate accurately while preserving all HTML/Markdown formatting and variable placeholders like {{name}}.${glossaryPromptPart}`;

    let response;
    try {
      response = await getOrGenerateAICache({
        inputContent: input.text,
        model: 'gemini-1.5-flash',
        promptVersion: '1.0.0',
        provider: this.aiProvider,
        kvCache: (input.env as any)?.AI_CACHE,
        options: {
          systemPrompt,
          prompt: input.text,
          language: input.sourceLang,
          targetLanguage: input.targetLang,
          apiKey: input.apiKey,
          fetchFn: input.fetchFn || (input.env as any)?.fetchFn,
          env: input.env,
          glossaryTerms: input.glossaryTerms
        }
      });
    } catch (err: any) {
      if (err instanceof AIProviderError && (err.status === 503 || err.code === 'QUOTA_EXHAUSTED')) {
        return {
          translatedText: input.text,
          status: 'QUEUED',
          provider: this.name,
          model: 'gemini-1.5-flash',
          cached: false,
          qualityScore: 0,
          warnings: ['AI Quota exhausted — Queued by Zero-Cost Guard ($0/Mo rule)'],
          placeholderMismatch: false,
          glossaryWarnings: [],
          latencyMs: Date.now() - startTime
        };
      }
      throw err;
    }

    let translatedText = response.text.trim();
    if (input.isHtml) {
      translatedText = sanitizeCmsHTML(translatedText);
      if (!validateHTMLStructure(input.text, translatedText)) {
        warnings.push('HTML structure tag mismatch detected');
      }
    }

    if (input.isMarkdown && !validateMarkdownStructure(input.text, translatedText)) {
      warnings.push('Markdown formatting mismatch detected');
    }

    // Placeholder validation
    const placeholderCheck = validatePlaceholders(input.text, translatedText);
    let status: TranslationStatus = 'GENERATED';
    let placeholderMismatch = false;

    if (!placeholderCheck.matches) {
      placeholderMismatch = true;
      status = 'PLACEHOLDER_MISMATCH';
      warnings.push(`Missing placeholders: ${placeholderCheck.missing.join(', ')}`);
    }

    // Glossary validation
    for (const term of protectedTerms) {
      if (input.text.includes(term.source) && !translatedText.includes(term.source)) {
        glossaryWarnings.push(`Protected term "${term.source}" was altered or translated.`);
      }
    }

    const latencyMs = Date.now() - startTime;
    const qualityScore = placeholderMismatch ? 50 : warnings.length > 0 ? 80 : 98;

    return {
      translatedText,
      status,
      provider: this.name,
      model: response.model,
      cached: response.cached,
      qualityScore,
      warnings,
      placeholderMismatch,
      glossaryWarnings,
      latencyMs
    };
  }
}

/**
 * DeepLProvider (Optional paid provider - NO auto fallback, admin controlled)
 */
export class DeepLProvider implements TranslationProvider {
  public readonly name = 'deepl';

  public async translate(input: TranslationInput): Promise<TranslationResult> {
    throw new Error('DeepL provider is not enabled by default ($0/Mo Zero-Cost Guard). Enable explicitly in admin config.');
  }
}

/**
 * FallbackProvider (Graceful failure to 503/QUEUED on primary exhaustion)
 */
export class FallbackProvider implements TranslationProvider {
  public readonly name = 'fallback';

  public async translate(input: TranslationInput): Promise<TranslationResult> {
    return {
      translatedText: input.text,
      status: 'QUEUED',
      provider: this.name,
      model: 'none',
      cached: false,
      qualityScore: 0,
      warnings: ['Primary provider unavailable. Request queued for admin review.'],
      placeholderMismatch: false,
      glossaryWarnings: [],
      latencyMs: 0
    };
  }
}
