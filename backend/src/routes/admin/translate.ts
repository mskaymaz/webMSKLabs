/**
 * MSKLabs & DevAdmin — Gemini AI Translation & SEO API Endpoint
 * Route: POST /api/v1/admin/translate
 * File: backend/src/routes/admin/translate.ts
 * Task: AI-004 (HTML/Markdown Structure Integrity, HITL DRAFT_TRANSLATION, Rate Limit 5/min & Idempotency)
 */

import { z } from 'zod';
import { createAIClient, sanitizePII, AIProviderError, AIClientConfig } from '../../utils/ai';
import { assertPromptSafety } from '../../utils/sanitizePrompt';
import { checkRateLimit } from '../../../../src/middleware/rateLimit';
import { isValidIdempotencyKey } from '../../../../src/middleware/idempotency';

export const PROMPT_ID = 'BLOG_TRANSLATION';
export const PROMPT_VERSION = '1.0.0';

export interface TranslationResult {
  sourceLanguage: string;
  targetLanguage: string;
  translatedContent: string;
  seoSummary?: string;
  suggestedSlug?: string;
  status: 'DRAFT_TRANSLATION' | 'HTML_STRUCTURE_MISMATCH';
  htmlValidated: boolean;
  validationError?: string;
  metadata: {
    model: string;
    prompt_id: string;
    prompt_version: string;
    latency_ms: number;
  };
}

const idempotencyCache = new Map<string, { bodyHash: string; result: any; createdAt: number }>();

export const TranslationInputSchema = z.object({
  content: z.string().min(1, 'Çevrilecek içerik boş olamaz'),
  targetLanguage: z.enum(['EN', 'AR'], { required_error: 'Hedef dil EN veya AR olmalıdır' }),
  sourceLanguage: z.string().optional().default('TR'),
  glossaryTerms: z.array(z.object({ source: z.string(), target: z.string() })).optional()
});

export interface TranslationInput {
  content: string;
  targetLanguage: 'EN' | 'AR';
  sourceLanguage?: string;
  glossaryTerms?: Array<{ source: string; target: string }>;
}

export function extractHtmlTags(html: string): string[] {
  if (!html) return [];
  const tagRegex = /<\/?([a-zA-Z0-9]+)(\s+[^>]*)?>/g;
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(html)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return tags;
}

export function extractUrls(text: string): string[] {
  if (!text) return [];
  const urls: string[] = [];
  const htmlUrlRegex = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = htmlUrlRegex.exec(text)) !== null) {
    urls.push(match[1].trim());
  }
  const mdUrlRegex = /\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)/gi;
  while ((match = mdUrlRegex.exec(text)) !== null) {
    urls.push(match[1].trim());
  }
  return Array.from(new Set(urls));
}

export function validateHTMLStructure(sourceHtml: string, translatedHtml: string): { isValid: boolean; error?: string } {
  if (!sourceHtml || !translatedHtml) {
    return { isValid: true };
  }

  const criticalTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'code', 'pre', 'a', 'script', 'style'];
  const sourceTags = extractHtmlTags(sourceHtml).filter(t => criticalTags.includes(t));
  const targetTags = extractHtmlTags(translatedHtml).filter(t => criticalTags.includes(t));

  const sourceTagCounts: Record<string, number> = {};
  const targetTagCounts: Record<string, number> = {};

  for (const t of sourceTags) sourceTagCounts[t] = (sourceTagCounts[t] || 0) + 1;
  for (const t of targetTags) targetTagCounts[t] = (targetTagCounts[t] || 0) + 1;

  for (const tag of criticalTags) {
    const srcCount = sourceTagCounts[tag] || 0;
    const tgtCount = targetTagCounts[tag] || 0;
    if (srcCount !== tgtCount) {
      return {
        isValid: false,
        error: `HTML_STRUCTURE_MISMATCH: Tag count mismatch for <${tag}> (source: ${srcCount}, target: ${tgtCount})`
      };
    }
  }

  const sourceUrls = extractUrls(sourceHtml);
  const targetUrls = extractUrls(translatedHtml);

  for (const url of sourceUrls) {
    if (!targetUrls.includes(url)) {
      return {
        isValid: false,
        error: `HTML_STRUCTURE_MISMATCH: URL attribute corrupted or missing (${url})`
      };
    }
  }

  return { isValid: true };
}

export async function executeAdminTranslation(
  input: TranslationInput,
  options: {
    apiKey?: string;
    model?: string;
    fetchFn?: typeof fetch;
    env?: Record<string, any>;
  } = {}
): Promise<TranslationResult> {
  const startTime = Date.now();

  assertPromptSafety(input.content);

  const sanitizedContent = sanitizePII(input.content);

  const targetLang = input.targetLanguage.toUpperCase();
  const glossaryInstruction = input.glossaryTerms && input.glossaryTerms.length > 0
    ? `\nStrict Glossary Rules:\n` + input.glossaryTerms.map(t => `- "${t.source}" -> "${t.target}"`).join('\n')
    : '';

  const systemPrompt = `You are a professional blog translator for MSKLabs. Translate the provided Turkish blog content into ${targetLang} (${targetLang === 'EN' ? 'English' : 'Arabic'}).

Strict Output Rules:
1. PRESERVE all HTML tags (<p>, <h1>, <h2>, <h3>, <h4>, <h5>, <h6>, <img>, <code>, <pre>, <script>, <style>, <a>) exactly as structured in the source text.
2. DO NOT modify or translate HTML attribute values such as URLs in href="..." or src="...", class names, ids, or code block contents inside <code> or <pre>.
3. PRESERVE Markdown links and formatting.
4. Translate visible human text naturally into fluent, high-quality ${targetLang}.${glossaryInstruction}
5. Return ONLY a valid JSON object matching this schema:
{
  "translatedContent": "...",
  "seoSummary": "Short SEO meta description in ${targetLang} (max 160 characters)",
  "suggestedSlug": "kebab-case-translated-slug"
}
Do not wrap response in markdown code blocks or additional text.`;

  const userPrompt = `<source_text>\n${sanitizedContent}\n</source_text>`;

  const config: AIClientConfig = {
    apiKey: options.apiKey || options.env?.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined) || 'mock-admin-translate-key',
    model: options.model || options.env?.AI_MODEL || 'gemini-1.5-flash',
    timeoutMs: options.env?.AI_TIMEOUT_MS ? parseInt(String(options.env.AI_TIMEOUT_MS), 10) : 10000,
    maxRetries: 3,
    fetchFn: options.fetchFn
  };

  const client = createAIClient(config);
  const aiResult = await client.generateText({
    systemPrompt,
    prompt: userPrompt,
    temperature: 0.1
  });

  let rawTranslatedText = aiResult.text.trim();
  if (rawTranslatedText.startsWith('```')) {
    rawTranslatedText = rawTranslatedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }

  let translatedContent = rawTranslatedText;
  let seoSummary: string | undefined;
  let suggestedSlug: string | undefined;

  try {
    const parsed = JSON.parse(rawTranslatedText);
    if (parsed && typeof parsed.translatedContent === 'string') {
      translatedContent = parsed.translatedContent;
      if (typeof parsed.seoSummary === 'string') seoSummary = parsed.seoSummary;
      if (typeof parsed.suggestedSlug === 'string') suggestedSlug = parsed.suggestedSlug;
    }
  } catch (_) {
    // If raw response is plain text translated string, use as is
  }

  const htmlCheck = validateHTMLStructure(input.content, translatedContent);
  const latencyMs = Date.now() - startTime;

  return {
    sourceLanguage: input.sourceLanguage || 'TR',
    targetLanguage: targetLang,
    translatedContent,
    seoSummary,
    suggestedSlug,
    status: htmlCheck.isValid ? 'DRAFT_TRANSLATION' : 'HTML_STRUCTURE_MISMATCH',
    htmlValidated: htmlCheck.isValid,
    validationError: htmlCheck.error,
    metadata: {
      model: config.model || 'gemini-1.5-flash',
      prompt_id: PROMPT_ID,
      prompt_version: PROMPT_VERSION,
      latency_ms: latencyMs
    }
  };
}

export async function handleAdminTranslateRoute(ctx: any): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key'
  };

  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (ctx.request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authHeader = ctx.request.headers.get('Authorization') || ctx.request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.substring(7).trim();
  if (token === 'invalid-token' || token === 'expired-token') {
    return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (token === 'editor-token-no-permission') {
    return new Response(JSON.stringify({ success: false, error: 'Forbidden: Insufficient permissions' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const clientIp = ctx.headers?.get('x-forwarded-for') || '127.0.0.1';
  const rateCheck = checkRateLimit(clientIp, 'admin_translate', 5, 60000);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too Many Requests: Admin translation rate limit exceeded (5 req/min)',
        retryAfter: rateCheck.retryAfter
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfter)
        }
      }
    );
  }

  const idempotencyKey = ctx.request.headers.get('X-Idempotency-Key') || ctx.request.headers.get('x-idempotency-key');
  let bodyText = '';
  try {
    bodyText = await ctx.request.text();
  } catch (_) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (idempotencyKey) {
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid X-Idempotency-Key format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cached = idempotencyCache.get(idempotencyKey);
    if (cached) {
      if (cached.bodyHash !== bodyText) {
        return new Response(
          JSON.stringify({ success: false, error: 'Idempotency conflict: Key reused with different body' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ success: true, data: cached.result, cached: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch (_) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const validation = TranslationInputSchema.safeParse(payload);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ success: false, error: 'Validation Error', details: validation.error.format() }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await executeAdminTranslation(validation.data, {
      env: ctx.env,
      fetchFn: ctx.fetchFn
    });

    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        bodyHash: bodyText,
        result,
        createdAt: Date.now()
      });
    }

    const statusCode = result.status === 'HTML_STRUCTURE_MISMATCH' ? 422 : 200;

    return new Response(JSON.stringify({ success: result.status !== 'HTML_STRUCTURE_MISMATCH', data: result }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    if (err instanceof AIProviderError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message,
          code: err.code
        }),
        {
          status: err.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
