/**
 * DevAdmin WebCrypto Security & Cryptography Utilities
 * Implementation: PBKDF2 Password Hashing & HMAC-SHA256 JWT Management
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTE_LENGTH = 16;
const KEY_BYTE_LENGTH = 32;

/**
 * Converts Uint8Array or ArrayBuffer to Hex string
 */
function bufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts Hex string to Uint8Array
 */
function hexToBuffer(hexString) {
    if (!hexString || hexString.length % 2 !== 0) return new Uint8Array(0);
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Converts string to Base64URL
 */
function base64UrlEncode(str) {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts Base64URL to string
 */
function base64UrlDecode(base64Url) {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return atob(base64);
}

/**
 * Timing-safe comparison of two Uint8Arrays
 */
function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i];
    }
    return result === 0;
}

/**
 * Hashes a plain-text password using WebCrypto PBKDF2
 * Format: $pbkdf2$v=1$i=100000$<saltHex>$<hashHex>
 */
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        baseKey,
        KEY_BYTE_LENGTH * 8
    );

    const saltHex = bufferToHex(salt);
    const hashHex = bufferToHex(derivedBits);
    return `$pbkdf2$v=1$i=${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

/**
 * Verifies a plain-text password against a stored PBKDF2 hash string
 */
export async function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.startsWith('$pbkdf2$v=1$')) {
        return false;
    }

    const parts = storedHash.split('$');
    if (parts.length !== 6) return false;

    const iterations = parseInt(parts[3].replace('i=', ''), 10);
    const salt = hexToBuffer(parts[4]);
    const expectedHash = hexToBuffer(parts[5]);

    if (salt.length !== SALT_BYTE_LENGTH || expectedHash.length !== KEY_BYTE_LENGTH) {
        return false;
    }

    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
        },
        baseKey,
        KEY_BYTE_LENGTH * 8
    );

    const derivedHash = new Uint8Array(derivedBits);
    return constantTimeCompare(derivedHash, expectedHash);
}

/**
 * Generates an HMAC-SHA256 signed JWT token
 */
export async function generateToken(payload, secret, expiresInSeconds = 7 * 86400) {
    const secretKey = secret || 'DEVADMIN_FALLBACK_SECRET_KEY_2026_DEV_ONLY';
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
    const dataToSign = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
    const signatureB64 = base64UrlEncode(bufferToHex(signatureBuffer));

    return `${dataToSign}.${signatureB64}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 JWT token
 */
export async function verifyToken(token, secret) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const secretKey = secret || 'DEVADMIN_FALLBACK_SECRET_KEY_2026_DEV_ONLY';
    const dataToSign = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );

    const expectedSignatureHex = hexToBuffer(base64UrlDecode(signatureB64));
    const signatureBuffer = expectedSignatureHex.buffer;

    const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBuffer,
        encoder.encode(dataToSign)
    );

    if (!isValid) return null;

    try {
        const payloadJson = base64UrlDecode(payloadB64);
        const payload = JSON.parse(payloadJson);
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return null; // Expired
        }
        return payload;
    } catch {
        return null;
    }
}

/**
 * Computes SHA-256 hash of a session token for secure DB storage
 */
export async function hashToken(token) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    return bufferToHex(hashBuffer);
}
