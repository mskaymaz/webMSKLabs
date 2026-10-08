/**
 * MSKLabs & DevAdmin — AI Support Message Analysis & Summarization Service
 * File: backend/src/services/aiAnalysis.ts
 * Task: AI-002 & AI-003 (Structured Output, HITL, Zod Validation, Fallback & Security Protection)
 */

import { z } from 'zod';
import { createAIClient, sanitizePII, AIProviderError, AIClientConfig } from '../utils/ai';
import { assertPromptSafety } from '../utils/sanitizePrompt';
import { getOrGenerateAICache } from './aiProvider';

export const PROMPT_ID = 'SUPPORT_TICKET_ANALYSIS';
export const PROMPT_VERSION = '1.0.0';

export const SYSTEM_PROMPT = `You are an AI support analyst for MSKLabs. Analyze the provided support ticket and generate a structured JSON response.

Strict JSON Output Schema:
{
  "spam": boolean,
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "category": string,
  "summary": string,
  "suggestedReply": string | null,
  "confidence": number,
  "reasoning": string
}

Rules:
1. "spam": set true only if the ticket is unsolicited advertisement, phishing, or gibberish.
2. "urgency": "CRITICAL" for server crashes/data loss, "HIGH" for account access/billing issues, "MEDIUM" for general bugs/questions, "LOW" for minor feedback.
3. "category": e.g., "ACCOUNT", "BILLING", "BUG", "GENERAL", "FEATURE_REQUEST".
4. "summary": concise 1-2 sentence summary of the user's issue in Turkish.
5. "suggestedReply": professional, polite draft reply in Turkish for the support agent to review.
6. "confidence": float between 0.0 and 1.0 representing confidence in classification.
7. "reasoning": brief explanation of why this urgency and category were selected.

IMPORTANT: Return ONLY a valid raw JSON object. Do not include markdown formatting or backticks.`;

export const AIAnalysisSchema = z.object({
  spam: z.boolean(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.string().min(1),
  summary: z.string().min(1),
  suggestedReply: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

export type AIAnalysisResult = z.infer<typeof AIAnalysisSchema>;

export interface AIAnalysisMetadata {
  model: string;
  prompt_id: string;
  prompt_version: string;
  latency_ms: number;
  pii_sanitized: boolean;
  fallback_used: boolean;
}

export interface AnalyzeMessageParams {
  ticketId: string;
  subject: string;
  message: string;
  name?: string;
  email?: string;
  db?: any; // Cloudflare D1 Binding
  env?: Record<string, any>;
  aiConfig?: AIClientConfig;
}

export interface AnalyzeMessageResponse {
  success: boolean;
  messageId: string;
  analysis: AIAnalysisResult;
  metadata: AIAnalysisMetadata;
}

// Güvenli Fallback Nesnesi — JSON parse veya şema doğrulaması başarısız olduğunda dönülür
export function createFallbackAnalysis(errorMessage?: string): AIAnalysisResult {
  return {
    spam: false,
    urgency: 'MEDIUM',
    category: 'GENERAL',
    summary: 'Destek bileti analizi yapılamadı (varsayılan bildirim).',
    suggestedReply: null,
    confidence: 0,
    reasoning: `Fallback triggered: ${errorMessage || 'Schema validation or parse error'}`
  };
}

// Raw AI Metin Çıktısını Temizleme ve JSON Parse İşlemi
export function parseAndValidateAIResponse(rawText: string): { analysis: AIAnalysisResult; fallbackUsed: boolean } {
  try {
    if (!rawText || !rawText.trim()) {
      return { analysis: createFallbackAnalysis('Empty response from AI model'), fallbackUsed: true };
    }

    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }

    const parsedJson = JSON.parse(cleaned);
    const validationResult = AIAnalysisSchema.safeParse(parsedJson);

    if (validationResult.success) {
      return {
        analysis: {
          ...validationResult.data,
          suggestedReply: validationResult.data.suggestedReply ?? null
        },
        fallbackUsed: false
      };
    } else {
      return {
        analysis: createFallbackAnalysis(`Schema validation error: ${validationResult.error.message}`),
        fallbackUsed: true
      };
    }
  } catch (parseErr: any) {
    return {
      analysis: createFallbackAnalysis(`JSON parse failed: ${parseErr.message}`),
      fallbackUsed: true
    };
  }
}

// Destek Mesajı AI Analiz Ana Servisi
export async function analyzeSupportMessage(params: AnalyzeMessageParams): Promise<AnalyzeMessageResponse> {
  const startTime = Date.now();
  const { ticketId, subject, message, db, env, aiConfig } = params;

  if (!ticketId || (!subject && !message)) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      messageId: ticketId || 'UNKNOWN',
      analysis: createFallbackAnalysis('Missing ticketId or ticket content'),
      metadata: {
        model: aiConfig?.model || 'gemini-1.5-flash',
        prompt_id: PROMPT_ID,
        prompt_version: PROMPT_VERSION,
        latency_ms: latency,
        pii_sanitized: false,
        fallback_used: true
      }
    };
  }

  let analysis: AIAnalysisResult;
  let fallbackUsed = false;

  try {
    // AI-003: Prompt Injection Protection Assertion
    assertPromptSafety(`${subject || ''} ${message || ''}`);

    // 1. PII Sanitization (E-posta ve Telefon maskeleme)
    const sanitizedSubject = sanitizePII(subject || '');
    const sanitizedMessage = sanitizePII(message || '');

    const userPrompt = `<user_ticket>\nSubject: ${sanitizedSubject}\nMessage: ${sanitizedMessage}\n</user_ticket>`;

    // 2. AI-005 Provider Abstraction & Cache Katmanı
    const aiResult = await getOrGenerateAICache({
      inputContent: `${sanitizedSubject}\n${sanitizedMessage}`,
      model: aiConfig?.model || env?.AI_MODEL || 'gemini-1.5-flash',
      promptVersion: PROMPT_VERSION,
      promptId: PROMPT_ID,
      kvCache: env?.AI_CACHE,
      options: {
        systemPrompt: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.1,
        apiKey: aiConfig?.apiKey || env?.GEMINI_API_KEY,
        model: aiConfig?.model || env?.AI_MODEL || 'gemini-1.5-flash',
        fetchFn: aiConfig?.fetchFn,
        env
      }
    });

    const parsed = parseAndValidateAIResponse(aiResult.text);
    analysis = parsed.analysis;
    fallbackUsed = parsed.fallbackUsed;
  } catch (err: any) {
    fallbackUsed = true;
    const errMessage = err instanceof AIProviderError ? err.message : err?.message || 'AI Provider Error';
    analysis = createFallbackAnalysis(errMessage);
  }

  const latencyMs = Date.now() - startTime;
  const metadata: AIAnalysisMetadata = {
    model: aiConfig?.model || env?.AI_MODEL || 'gemini-1.5-flash',
    prompt_id: PROMPT_ID,
    prompt_version: PROMPT_VERSION,
    latency_ms: latencyMs,
    pii_sanitized: true,
    fallback_used: fallbackUsed
  };

  // 3. HITL Prensibi & Veritabanı Kaydı (Otomatik silme / cevap gönderimi YAPILMAZ)
  if (db && typeof db.prepare === 'function') {
    try {
      const updateStmt = db.prepare(`
        UPDATE messages
        SET ai_summary = ?, ai_draft = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      await updateStmt.bind(analysis.summary, analysis.suggestedReply || null, ticketId).run();

      const eventMetadata = JSON.stringify({
        ...metadata,
        spam: analysis.spam,
        urgency: analysis.urgency,
        category: analysis.category,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning
      });

      const eventStmt = db.prepare(`
        INSERT INTO message_events (message_id, event_type, actor, metadata)
        VALUES (?, 'AI_ANALYSIS_COMPLETED', 'AI_SYSTEM', ?)
      `);
      await eventStmt.bind(ticketId, eventMetadata).run();
    } catch (dbErr) {
      console.error('Failed to update DB with AI analysis:', dbErr);
    }
  }

  return {
    success: true,
    messageId: ticketId,
    analysis,
    metadata
  };
}
