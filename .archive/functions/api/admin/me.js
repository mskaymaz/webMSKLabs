/**
 * GET /api/admin/me
 * DevAdmin Profile & Active Session Verification Endpoint
 */

export async function onRequestGet(context) {
    const { data } = context;
    const admin = data.admin;

    return new Response(JSON.stringify({
        success: true,
        user: {
            id: admin.id,
            username: admin.username,
            role: admin.role
        }
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
}
