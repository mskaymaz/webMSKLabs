/**
 * MSKLabs & DevAdmin — AI Security & Prompt Injection Protection
 * File: backend/src/utils/sanitizePrompt.ts
 * Task: AI-003 (DATA ≠ INSTRUCTION, Heuristic Policy Filters, Multi-language Injection Guard)
 */

import { AIProviderError } from './ai';

export interface PromptSanitizeResult {
  sanitizedText: string;
  isSafe: boolean;
  blockedReason?: string;
  detectedVector?: string;
}

// 1. Kontrol Karakterleri ve Zero-Width Temizleme Regex'i
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g;

// 2. Potansiyel Injection Desenleri (EN, TR, AR & Role Impersonation)
const INJECTION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // EN Direct & System Prompt Leakage
  { pattern: /ignore\s+(all\s+|previous\s+|prior\s+)?instructions?/i, name: 'EN_IGNORE_INSTRUCTIONS' },
  { pattern: /disregard\s+(all\s+|previous\s+|prior\s+)?(prompts?|rules?|instructions?)/i, name: 'EN_DISREGARD_RULES' },
  { pattern: /you\s+are\s+now\s+(a|an|the)?/i, name: 'EN_ROLE_IMPERSONATION' },
  { pattern: /(print|output|show|display|reveal)\s+(your\s+)?(initial\s+|secret\s+)?(system\s+prompt|instructions?|rules)/i, name: 'EN_PROMPT_LEAK' },
  { pattern: /(developer\s+mode|jailbreak|dan\s+mode|unrestricted\s+mode)/i, name: 'EN_JAILBREAK' },
  { pattern: /(forget|override)\s+(all\s+)?(rules|safety|constraints)/i, name: 'EN_FORGET_RULES' },

  // TR Direct Injection
  { pattern: /(önceki|geçmiş|tüm)\s+(talimatları|kuralları|sistem\s+mesajını)\s+(unut|yok\s+say|iptal\s+et|sil)/i, name: 'TR_IGNORE_INSTRUCTIONS' },
  { pattern: /artık\s+(bir|sen)\s+/i, name: 'TR_ROLE_IMPERSONATION' },
  { pattern: /(sistem\s+talimatını|sistem\s+promptunu|gizli\s+kuralları)\s+(yazdır|göster|açıkla|sızdır)/i, name: 'TR_PROMPT_LEAK' },
  { pattern: /(geliştirici\s+modu|kısıtlamasız\s+mod|yetkili\s+mod)/i, name: 'TR_JAILBREAK' },

  // AR Direct Injection
  { pattern: /تجاهل\s+(جميع\s+|التعليمات\s+)?التعليمات/i, name: 'AR_IGNORE_INSTRUCTIONS' },
  { pattern: /أنت\s+الآن\s+/i, name: 'AR_ROLE_IMPERSONATION' },
  { pattern: /(عرض|طباعة)\s+تعليمات\s+النظام/i, name: 'AR_PROMPT_LEAK' },
  { pattern: /وضع\s+المطور/i, name: 'AR_JAILBREAK' },

  // Role Headers & Fake System Prompts
  { pattern: /^\s*(system|developer|admin|assistant)\s*:\s*/im, name: 'ROLE_HEADER_IMPERSONATION' },

  // Tool / Function Hijacking
  { pattern: /(call\s+function|execute\s+tool|run\s+command|eval\(|system\()/i, name: 'TOOL_HIJACKING' },

  // Indirect HTML / Script Injection
  { pattern: /<script[\s>]/i, name: 'HTML_SCRIPT_INJECTION' },
  { pattern: /javascript\s*:/i, name: 'JAVASCRIPT_URI_INJECTION' }
];

// Base64 Kontrolü: Base64 decode edilmiş metinde injection aranır
function checkBase64Injection(input: string): string | null {
  const base64Regex = /\b[A-Za-z0-9+/]{20,}={0,2}\b/g;
  const matches = input.match(base64Regex);
  if (!matches) return null;

  for (const match of matches) {
    try {
      if (typeof atob === 'function') {
        const decoded = atob(match).toLowerCase();
        if (decoded.includes('ignore previous') || decoded.includes('system prompt') || decoded.includes('you are now')) {
          return match;
        }
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Normalizes and sanitizes user prompts to detect & block prompt injection attacks.
 */
export function sanitizePrompt(text: string): PromptSanitizeResult {
  if (!text || typeof text !== 'string') {
    return { sanitizedText: '', isSafe: true };
  }

  // 1. Unicode Normalization (NFKC - Homoglyph / Full-width bypasses)
  let normalized = text.normalize('NFKC');

  // 2. Control Characters & Zero-Width Space Cleansing
  normalized = normalized.replace(CONTROL_CHARS_REGEX, '');

  // 3. Excess Whitespace Normalization
  const cleanText = normalized.replace(/\s+/g, ' ').trim();

  // 4. Heuristic Injection Pattern Matching
  for (const item of INJECTION_PATTERNS) {
    if (item.pattern.test(cleanText)) {
      return {
        sanitizedText: cleanText,
        isSafe: false,
        blockedReason: `Prompt injection pattern detected (${item.name})`,
        detectedVector: item.name
      };
    }
  }

  // 5. Base64 Obfuscated Injection Check
  const base64Payload = checkBase64Injection(text);
  if (base64Payload) {
    return {
      sanitizedText: cleanText,
      isSafe: false,
      blockedReason: 'Obfuscated Base64 prompt injection detected',
      detectedVector: 'BASE64_OBFUSCATED_INJECTION'
    };
  }

  return {
    sanitizedText: cleanText,
    isSafe: true
  };
}

/**
 * Asserts prompt safety before executing AI pipeline.
 * Throws AIProviderError with SAFETY_BLOCKED status if injection detected.
 */
export function assertPromptSafety(text: string): string {
  const result = sanitizePrompt(text);
  if (!result.isSafe) {
    throw new AIProviderError(
      `SAFETY_BLOCKED: ${result.blockedReason}`,
      'SAFETY_BLOCKED',
      400,
      false
    );
  }
  return result.sanitizedText;
}
