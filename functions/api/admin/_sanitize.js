/**
 * DevAdmin Sanitization & Input Validation Module
 * Strips XSS script tags, normalizes inputs, and enforces schema rules
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/;

/**
 * Strips HTML tags, script execution attributes, and dangerous protocols
 */
export function sanitizeHtml(input) {
    if (typeof input !== 'string') return '';

    return input
        // Remove script tags and contents
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove style, iframe, object, embed tags
        .replace(/<(?:style|iframe|object|embed|svg)\b[^<]*(?:(?!<\/(?:style|iframe|object|embed|svg)>)<[^<]*)*<\/(?:style|iframe|object|embed|svg)>/gi, '')
        // Remove event handlers (onload, onerror, onclick, etc.)
        .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
        // Remove dangerous URI schemes (javascript:, data:)
        .replace(/href\s*=\s*["']\s*(?:javascript|data):[^"']*["']/gi, 'href="#"')
        .replace(/src\s*=\s*["']\s*(?:javascript|data):[^"']*["']/gi, 'src=""')
        .trim();
}

/**
 * Escapes HTML characters for safe text insertion
 */
export function escapeText(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
}

/**
 * Validates email format
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates username format (3-30 chars, alphanumeric, underscore, dot, hyphen)
 */
export function isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    return USERNAME_REGEX.test(username.trim());
}

/**
 * Validates required fields in a request payload
 */
export function validatePayload(payload, rules) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
        const val = payload[field];

        if (rule.required && (val === undefined || val === null || val === '')) {
            errors.push(`${field} alanı zorunludur.`);
            continue;
        }

        if (val !== undefined && val !== null) {
            if (rule.type && typeof val !== rule.type) {
                errors.push(`${field} alanı ${rule.type} tipinde olmalıdır.`);
            }
            if (rule.minLength && typeof val === 'string' && val.length < rule.minLength) {
                errors.push(`${field} en az ${rule.minLength} karakter olmalıdır.`);
            }
            if (rule.maxLength && typeof val === 'string' && val.length > rule.maxLength) {
                errors.push(`${field} en fazla ${rule.maxLength} karakter olabilir.`);
            }
            if (rule.format === 'email' && !isValidEmail(val)) {
                errors.push(`Geçersiz e-posta formatı.`);
            }
            if (rule.format === 'username' && !isValidUsername(val)) {
                errors.push(`Geçersiz kullanıcı adı formatı (3-30 karakter, harf, rakam, alt çizgi).`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
