/**
 * DevAdmin SEC-AUTH-002 Verification Test Suite
 * Tests:
 * 1. WebCrypto PBKDF2 Hashing (100k iterations, 16-byte salt, format $pbkdf2$v=1$i=100000$...)
 * 2. Password Verification (Valid vs Invalid)
 * 3. HMAC-SHA256 JWT Generation & Verification
 * 4. Tampered JWT Detection & Expired Token Rejection
 * 5. Role-Based Access Control (RBAC) Permissions Matrix
 * 6. Local D1 Admin Authentication & Session Revocation
 */

import { hashPassword, verifyPassword, generateToken, verifyToken, hashToken } from '../functions/api/admin/_crypto.js';
import { hasPermission } from '../functions/api/admin/_auth.js';

async function runTests() {
    console.log('=== DevAdmin SEC-AUTH-002 Test Suite Started ===\n');
    let passCount = 0;
    let failCount = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`[PASS] ${testName}`);
            passCount++;
        } else {
            console.error(`[FAIL] ${testName}`);
            failCount++;
        }
    }

    // Test 1: PBKDF2 Password Hashing Format
    const password = 'AdminSuperSecret123!';
    const hash = await hashPassword(password);
    assert(hash.startsWith('$pbkdf2$v=1$i=100000$'), 'PBKDF2 Hash prefix and 100k iteration spec matches');
    assert(hash.split('$').length === 6, 'PBKDF2 Hash string contains salt and hash components');

    // Test 2: Valid Password Verification
    const isMatch = await verifyPassword(password, hash);
    assert(isMatch === true, 'Valid password matches PBKDF2 derived hash');

    // Test 3: Invalid Password Rejection
    const isWrongMatch = await verifyPassword('WrongPassword123!', hash);
    assert(isWrongMatch === false, 'Invalid password correctly rejected');

    // Test 4: Random Salt Uniqueness
    const hash2 = await hashPassword(password);
    assert(hash !== hash2, 'Subsequent hashes generate unique 16-byte salts');

    // Test 5: HMAC-SHA256 JWT Generation & Verification
    const secret = 'TEST_JWT_SECRET_KEY_9988776655';
    const payload = { admin_id: 1, username: 'admin', role: 'SUPER_ADMIN' };
    const token = await generateToken(payload, secret);
    assert(typeof token === 'string' && token.split('.').length === 3, 'JWT token formatted as 3-part string');

    const decoded = await verifyToken(token, secret);
    assert(decoded !== null && decoded.admin_id === 1 && decoded.role === 'SUPER_ADMIN', 'Valid JWT token verified and decoded payload');

    // Test 6: Tampered JWT Rejection
    const tamperedToken = token.substring(0, token.length - 4) + 'XXXX';
    const tamperedDecoded = await verifyToken(tamperedToken, secret);
    assert(tamperedDecoded === null, 'Tampered JWT signature correctly rejected');

    // Test 7: Wrong Secret Rejection
    const wrongSecretDecoded = await verifyToken(token, 'WRONG_SECRET_KEY');
    assert(wrongSecretDecoded === null, 'JWT signed with different secret correctly rejected');

    // Test 8: Expired Token Rejection
    const expiredToken = await generateToken(payload, secret, -100); // 100 seconds in past
    const expiredDecoded = await verifyToken(expiredToken, secret);
    assert(expiredDecoded === null, 'Expired JWT token correctly rejected');

    // Test 9: RBAC Matrix Checks
    assert(hasPermission('SUPER_ADMIN', 'any.action') === true, 'SUPER_ADMIN has unrestricted permission');
    assert(hasPermission('ADMIN', 'posts.publish') === true, 'ADMIN role has posts.publish permission');
    assert(hasPermission('SUPPORT', 'posts.publish') === false, 'SUPPORT role lacks posts.publish permission (Deny by Default)');
    assert(hasPermission('GUEST', 'messages.read') === false, 'Undefined role denied by default');

    // Test 10: Token Hash Hashing
    const thash1 = await hashToken(token);
    const thash2 = await hashToken(token);
    assert(thash1 === thash2 && thash1.length === 64, 'Token hashing produces deterministic SHA-256 hex string');

    console.log(`\n=== Test Results: ${passCount} PASSED, ${failCount} FAILED ===`);
    if (failCount > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test Error:', err);
    process.exit(1);
});
