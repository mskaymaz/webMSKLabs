/**
 * SEC-REQ-002: HTML Sanitization & Input Validation Utility
 * Pure TypeScript implementation for Cloudflare Workers Runtime ($0 cost)
 */

export function escapeText(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

export function validatePayload(
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(rules)) {
    const val = data ? data[field] : undefined;

    if (rule.required && (val === undefined || val === null || val === '')) {
      errors[field] = `${field} alanı zorunludur.`;
      continue;
    }

    if (val !== undefined && val !== null && val !== '') {
      if (rule.type === 'string' && typeof val !== 'string') {
        errors[field] = `${field} metin olmalıdır.`;
      } else if (rule.type === 'number' && typeof val !== 'number') {
        errors[field] = `${field} sayı olmalıdır.`;
      } else if (rule.type === 'email' && typeof val === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          errors[field] = `Geçerli bir e-posta adresi giriniz.`;
        }
      }

      if (typeof val === 'string') {
        if (rule.minLength && val.length < rule.minLength) {
          errors[field] = `${field} en az ${rule.minLength} karakter olmalıdır.`;
        }
        if (rule.maxLength && val.length > rule.maxLength) {
          errors[field] = `${field} en fazla ${rule.maxLength} karakter olabilir.`;
        }
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Decode HTML entities for URL protocol evaluation
 */
function decodeHTMLEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&Tab;/gi, '')
    .replace(/&NewLine;/gi, '')
    .replace(/&colon;/gi, ':')
    .replace(/&#x3a;/gi, ':')
    .replace(/&#58;/gi, ':')
    .replace(/&#115;/gi, 's')
    .replace(/&#83;/gi, 'S')
    .replace(/&#([0-9]+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Validates if a URL uses a safe protocol (http, https, mailto, tel, or relative)
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  const decoded = decodeHTMLEntities(url);
  // Strip all whitespace, tabs, newlines, and control chars
  const cleanUrl = decoded.replace(/[\s\t\n\r\0\u200b\u00A0\x00-\x1F]/g, '');

  if (!cleanUrl) return false;

  // Extract scheme if present before colon
  const colonIdx = cleanUrl.indexOf(':');
  if (colonIdx === -1) {
    // Relative URL or fragment -> Safe
    return true;
  }

  const scheme = cleanUrl.substring(0, colonIdx).toLowerCase().trim();

  // Block dangerous executable/data schemes
  const forbiddenSchemes = ['javascript', 'data', 'vbscript', 'file', 'about', 'blob'];
  if (forbiddenSchemes.includes(scheme)) {
    return false;
  }

  // Allowed safe schemes
  const allowedSchemes = ['http', 'https', 'mailto', 'tel'];
  return allowedSchemes.includes(scheme);
}

const ALLOWED_TAGS = new Set([
  'p', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'sub', 'sup',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'br', 'hr',
  'a', 'img', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
]);

const STRIP_CONTENTS_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'svg', 'applet',
  'meta', 'link', 'head', 'base', 'form', 'input', 'button', 'textarea', 'select', 'option'
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  span: new Set(['class', 'title']),
  div: new Set(['class', 'title']),
  p: new Set(['class', 'title']),
  blockquote: new Set(['class', 'title']),
  code: new Set(['class']),
  pre: new Set(['class'])
};

/**
 * SEC-REQ-002: HTML Sanitizer Engine
 * Strips dangerous tags, scripts, SVGs, event handlers, style attributes, and malicious URLs.
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let html = input;

  // 1. Completely strip forbidden content-bearing tags and their contents
  for (const tag of STRIP_CONTENTS_TAGS) {
    const tagRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    html = html.replace(tagRegex, '');
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    html = html.replace(selfClosingRegex, '');
  }

  // 2. Tokenize and process remaining HTML tags
  const sanitized = html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (fullMatch, rawTagName, rawAttrs) => {
    const tagName = rawTagName.toLowerCase();

    // If tag is not in allowed list, strip tag boundary
    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    // Closing tag
    if (fullMatch.startsWith('</')) {
      return `</${tagName}>`;
    }

    // Process attributes for open or self-closing tag
    let cleanAttrs = '';
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;

    const tagAllowedAttrs = ALLOWED_ATTRIBUTES[tagName] || new Set();

    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // Block any event handler (on*) and style attribute
      if (attrName.startsWith('on') || attrName === 'style') {
        continue;
      }

      // Check attribute allowlist
      if (!tagAllowedAttrs.has(attrName)) {
        continue;
      }

      // Validate URL attributes
      if (attrName === 'href' || attrName === 'src') {
        if (!isSafeUrl(attrVal)) {
          continue; // Strip attribute if URL is unsafe
        }
      }

      cleanAttrs += ` ${attrName}="${escapeText(attrVal)}"`;
    }

    // Ensure rel="noopener noreferrer" for target="_blank" on <a> tags
    if (tagName === 'a' && cleanAttrs.includes('target="_blank"') && !cleanAttrs.includes('rel=')) {
      cleanAttrs += ' rel="noopener noreferrer"';
    }

    const isSelfClosing = fullMatch.endsWith('/>') || ['br', 'hr', 'img'].includes(tagName);
    return isSelfClosing ? `<${tagName}${cleanAttrs} />` : `<${tagName}${cleanAttrs}>`;
  });

  return sanitized.trim();
}
