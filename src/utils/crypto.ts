/**
  * DevAdmin WebCrypto Security & Token Cryptography Utilities
  */

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );

  const exportedKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));

  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const keyHex = Array.from(exportedKey).map(b => b.toString(16).padStart(2, '0')).join('');

  return `$pbkdf2$v=1$i=100000$${saltHex}$${keyHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[1] !== 'pbkdf2') {
      return false;
    }

    const iterations = parseInt(parts[3].replace('i=', ''), 10) || 100000;
    const saltHex = parts[4];
    const keyHex = parts[5];

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      true,
      ['sign']
    );

    const exportedKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    const derivedKeyHex = Array.from(exportedKey).map(b => b.toString(16).padStart(2, '0')).join('');

    return timingSafeEqual(derivedKeyHex, keyHex);
  } catch (err) {
    console.error('Password Verification Error:', err);
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function generateToken(payload: Record<string, any>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 86400
  };

  const b64Header = base64UrlEncode(JSON.stringify(header));
  const b64Payload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${b64Header}.${b64Payload}`;

  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', secretKey, enc.encode(dataToSign));
  const b64Signature = base64UrlEncode(new Uint8Array(signature));

  return `${dataToSign}.${b64Signature}`;
}

export async function verifyToken(token: string, secret: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [b64Header, b64Payload, b64Signature] = parts;
    const dataToSign = `${b64Header}.${b64Payload}`;

    const enc = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecode(b64Signature);
    const isValid = await crypto.subtle.verify('HMAC', secretKey, signature as BufferSource, enc.encode(dataToSign));

    if (!isValid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(b64Payload)));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (err) {
    console.error('Token Verification Error:', err);
    return null;
  }
}

export async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64UrlEncode(input: string | Uint8Array): string {
  let str = '';
  if (typeof input === 'string') {
    str = btoa(input);
  } else {
    str = btoa(String.fromCharCode(...input));
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): Uint8Array {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function normalizeTranslationText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .replace(/\s+/g, ' ');
}

export function generateTranslationSourceHash(sourceLang: string, targetLang: string, sourceText: string): string {
  const normLang = sourceLang.toLowerCase().trim();
  const normTarget = targetLang.toLowerCase().trim();
  const normText = normalizeTranslationText(sourceText);
  const rawStr = `${normLang}:${normTarget}:${normText}`;
  const crypto = require('node:crypto');
  return crypto.createHash('sha256').update(rawStr).digest('hex');
}
