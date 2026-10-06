/**
 * DevAdmin SEC-REQ-001 Verification Test Suite
 * Tests:
 * 1. General Rate Limiting (60 req / min limit)
 * 2. Login Brute-Force Lockout (5 failed logins -> 429 Too Many Requests & Retry-After)
 * 3. Lockout Counter Reset on Success
 * 4. Input Validation (Schema, Email, Username rules)
 * 5. HTML Sanitization & XSS Protection (Scripts, Event handlers, javascript: URIs)
 * 6. Security Headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
 */

import { checkRateLimit, checkLoginLockout, recordFailedLogin, resetFailedLogin } from '../functions/api/admin/_rateLimit.js';
import { sanitizeHtml, escapeText, isValidEmail, isValidUsername, validatePayload } from '../functions/api/admin/_sanitize.js';
import { SECURITY_HEADERS, errorResponse, jsonResponse } from '../functions/api/admin/_response.js';

async function runSecReqTests() {
    console.log('=== DevAdmin SEC-REQ-001 Test Suite Started ===\n');
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

    const testIp = '192.168.1.100';

    // Test 1: General Rate Limiting
    const limitResult1 = checkRateLimit(testIp, 'test_endpoint', 5, 60000);
    assert(limitResult1.allowed === true && limitResult1.remaining === 4, 'Rate limit initial request allowed');

    for (let i = 0; i < 4; i++) {
        checkRateLimit(testIp, 'test_endpoint', 5, 60000);
    }
    const limitResultExceeded = checkRateLimit(testIp, 'test_endpoint', 5, 60000);
    assert(limitResultExceeded.allowed === false && limitResultExceeded.retryAfter > 0, 'Rate limit threshold exceeded (429 condition triggered)');

    // Test 2: Login Brute-Force Lockout
    const bruteIp = '10.0.0.55';
    const bruteUser = 'target_admin';

    for (let i = 1; i <= 4; i++) {
        const res = recordFailedLogin(bruteIp, bruteUser);
        assert(res.locked === false, `Failed login attempt ${i} recorded without lockout`);
    }

    const lockoutRes = recordFailedLogin(bruteIp, bruteUser);
    assert(lockoutRes.locked === true && lockoutRes.retryAfter >= 890, '5th failed login attempt triggers 15-minute lockout');

    const checkLockout = checkLoginLockout(bruteIp, bruteUser);
    assert(checkLockout.locked === true, 'Lockout state verified for blocked IP/Username');

    // Test 3: Lockout Counter Reset
    resetFailedLogin(bruteIp, bruteUser);
    const postResetCheck = checkLoginLockout(bruteIp, bruteUser);
    assert(postResetCheck.locked === false, 'Successful login resets failed attempt counter and lockout state');

    // Test 4: Input Validation
    assert(isValidEmail('admin@msklabs.com') === true, 'Valid email format accepted');
    assert(isValidEmail('invalid-email-format') === false, 'Invalid email format rejected');
    assert(isValidUsername('admin_user.1') === true, 'Valid username format accepted');
    assert(isValidUsername('a') === false, 'Too short username rejected');

    const schemaValidation = validatePayload({
        username: 'ab',
        password: '123'
    }, {
        username: { required: true, minLength: 3, format: 'username' },
        password: { required: true, minLength: 6 }
    });
    assert(schemaValidation.valid === false && schemaValidation.errors.length >= 2, 'Payload validation returns structured schema errors');

    // Test 5: HTML Sanitization & XSS Protection
    const xssPayload = '<script>alert("XSS")</script><p onload="doBad()">Hello <a href="javascript:steal()">Link</a></p>';
    const sanitized = sanitizeHtml(xssPayload);
    assert(!sanitized.includes('<script>') && !sanitized.includes('onload=') && !sanitized.includes('javascript:'), 'XSS script tags, event handlers, and javascript URIs stripped');

    const escaped = escapeText('<b>Test & "Quotes"</b>');
    assert(escaped.includes('&lt;b&gt;') && escaped.includes('&quot;'), 'HTML characters safely escaped');

    // Test 6: Security Response & Headers
    assert(SECURITY_HEADERS['X-Content-Type-Options'] === 'nosniff', 'Security header X-Content-Type-Options: nosniff present');
    assert(SECURITY_HEADERS['X-Frame-Options'] === 'DENY', 'Security header X-Frame-Options: DENY present');

    const errResp = errorResponse('Giriş engellendi', 429, null, { 'Retry-After': '900' });
    assert(errResp.status === 429 && errResp.headers.get('Retry-After') === '900', 'Error response sets 429 status and Retry-After header');

    console.log(`\n=== Test Results: ${passCount} PASSED, ${failCount} FAILED ===`);
    if (failCount > 0) {
        process.exit(1);
    }
}

runSecReqTests().catch(err => {
    console.error('SEC-REQ Test Error:', err);
    process.exit(1);
});
