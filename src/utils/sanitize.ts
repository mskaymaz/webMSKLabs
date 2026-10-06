/**
 * Input Validation & Sanitization Helpers
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
