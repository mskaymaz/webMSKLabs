/**
 * DevAdmin Secure Response & Error Handler Module
 * Masks internal error details, injects security HTTP headers
 */

export const SECURITY_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
};

/**
 * Creates a JSON response with security headers
 */
export function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...SECURITY_HEADERS,
            ...extraHeaders
        }
    });
}

/**
 * Generates a masked, safe error response
 */
export function errorResponse(message = 'Bir işlem hatası oluştu.', status = 400, details = null, extraHeaders = {}) {
    const payload = {
        success: false,
        error: getErrorTitleByStatus(status),
        message
    };

    if (details && Array.isArray(details) && details.length > 0) {
        payload.details = details;
    }

    return jsonResponse(payload, status, extraHeaders);
}

function getErrorTitleByStatus(status) {
    switch (status) {
        case 400: return 'Bad Request';
        case 401: return 'Unauthorized';
        case 403: return 'Forbidden';
        case 404: return 'Not Found';
        case 429: return 'Too Many Requests';
        case 500: return 'Internal Server Error';
        default: return 'Request Error';
    }
}
