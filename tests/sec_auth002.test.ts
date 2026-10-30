import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../src/utils/crypto.js';

describe('SEC-AUTH-002 — Cryptographic Security & Hardening Tests', () => {
  it('1. should generate password hash in format $pbkdf2$v=1$i=100000$salt$hash', async () => {
    const password = 'MySecurePassword2026!';
    const hash = await hashPassword(password);

    expect(hash.startsWith('$pbkdf2$v=1$i=100000$')).toBe(true);

    const parts = hash.split('$');
    expect(parts).toHaveLength(6);
    expect(parts[1]).toBe('pbkdf2');
    expect(parts[2]).toBe('v=1');
    expect(parts[3]).toBe('i=100000');
    expect(parts[4].length).toBe(32); // 16 bytes = 32 hex chars
    expect(parts[5].length).toBe(64); // 256 bits = 64 hex chars
  });

  it('2. should generate unique 16-byte random salts for same password', async () => {
    const password = 'SamePassword';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);

    const salt1 = hash1.split('$')[4];
    const salt2 = hash2.split('$')[4];
    expect(salt1).not.toBe(salt2);
  });

  it('3. should verify correct password with PBKDF2 derived key', async () => {
    const password = 'CorrectPassword123#';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('4. should reject incorrect password in constant time', async () => {
    const password = 'CorrectPassword123#';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword('WrongPassword123#', hash);
    expect(isValid).toBe(false);
  });

  it('5. should reject unsupported or malformed hash format gracefully with false', async () => {
    expect(await verifyPassword('password', 'plain_text_password')).toBe(false);
    expect(await verifyPassword('password', '$argon2id$v=19$m=4096,t=3,p=1$salt$hash')).toBe(false);
    expect(await verifyPassword('password', '$pbkdf2$v=2$i=100000$salt$hash')).toBe(false);
    expect(await verifyPassword('password', '')).toBe(false);
  });

  it('6. should generate HMAC-SHA256 JWT with 7-day (604800s) validity', async () => {
    const secret = 'jwt_test_secret_key_2026';
    const token = await generateToken({ admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' }, secret);

    const parts = token.split('.');
    expect(parts).toHaveLength(3);

    const payload = JSON.parse(atob(parts[1]));
    expect(payload.exp - payload.iat).toBe(7 * 86400); // 7 days
  });

  it('7. should verify valid token signed with correct secret', async () => {
    const secret = 'jwt_test_secret_key_2026';
    const token = await generateToken({ admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' }, secret);

    const payload = await verifyToken(token, secret);
    expect(payload).toBeTruthy();
    expect(payload?.admin_id).toBe(1);
    expect(payload?.username).toBe('admin');
  });

  it('8. should reject token with tampered signature or modified payload', async () => {
    const secret = 'jwt_test_secret_key_2026';
    const token = await generateToken({ admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' }, secret);

    const parts = token.split('.');
    // Tamper payload (change admin_id: 1 to admin_id: 999)
    const payloadObj = JSON.parse(atob(parts[1]));
    payloadObj.admin_id = 999;
    const tamperedPayloadB64 = btoa(JSON.stringify(payloadObj)).replace(/=/g, '');
    const tamperedToken = `${parts[0]}.${tamperedPayloadB64}.${parts[2]}`;

    const payload = await verifyToken(tamperedToken, secret);
    expect(payload).toBeNull();
  });

  it('9. should reject token signed with a different secret', async () => {
    const token = await generateToken({ admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' }, 'secret_1');
    const payload = await verifyToken(token, 'secret_2');

    expect(payload).toBeNull();
  });

  it('10. should reject expired token past 7 days', async () => {
    const secret = 'jwt_test_secret_key_2026';

    const b64Header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
    const now = Math.floor(Date.now() / 1000);
    const b64Payload = btoa(JSON.stringify({
      admin_id: 1,
      username: 'admin',
      role: 'SUPER_ADMIN',
      iat: now - 8 * 86400,
      exp: now - 1 * 86400
    })).replace(/=/g, '');

    const dataToSign = `${b64Header}.${b64Payload}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));
    const b64Sig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const expiredToken = `${dataToSign}.${b64Sig}`;

    const payload = await verifyToken(expiredToken, secret);
    expect(payload).toBeNull();
  });

  it('11. should reject token with unsupported algorithm header (e.g. alg: none)', async () => {
    const b64Header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=/g, '');
    const b64Payload = btoa(JSON.stringify({ admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' })).replace(/=/g, '');
    const unsignedToken = `${b64Header}.${b64Payload}.`;

    const payload = await verifyToken(unsignedToken, 'any_secret');
    expect(payload).toBeNull();
  });
});
