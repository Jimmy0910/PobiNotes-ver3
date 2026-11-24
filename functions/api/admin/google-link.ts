// Admin-only endpoint to unlink a bound Google account from the current admin user.
// Route: DELETE /api/admin/google-link

import { ensureSchemaAndUserDefaults } from '../_dbInit';

interface Env {
  DB: D1Database;
}

type UserContext = {
  user?: { id: string; username: string; is_admin: number };
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

export const onRequestDelete: PagesFunction<Env, any, UserContext> = async (context) => {
  try {
    const { env, data } = context;

    if (!data?.user?.id) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please login.' }, 401);
    }
    if (data.user.is_admin !== 1) {
      return jsonResponse({ success: false, error: 'Forbidden. Admin access required.' }, 403);
    }

    await ensureSchemaAndUserDefaults(env.DB);

    const row = (await env.DB.prepare(
      'SELECT id, password_hash, google_id, email FROM users WHERE id = ?'
    )
      .bind(data.user.id)
      .first()) as {
      id: string;
      password_hash?: string | null;
      google_id?: string | null;
      email?: string | null;
    } | null;

    if (!row) {
      return jsonResponse({ success: false, error: '找不到目前管理員帳號。' }, 404);
    }

    if (!row.password_hash || row.password_hash === 'google-oauth-only') {
      return jsonResponse(
        {
          success: false,
          error: '此管理員帳號尚未設定本地密碼，為避免無法登入，無法解除 Google 綁定。'
        },
        400
      );
    }

    await env.DB.prepare(
      `UPDATE users SET google_id = NULL, email = NULL, auth_provider = 'local' WHERE id = ?`
    )
      .bind(data.user.id)
      .run();

    return jsonResponse({
      success: true,
      message: '已解除管理員帳號的 Google 綁定。'
    });
  } catch (err: any) {
    return jsonResponse(
      { success: false, error: err?.message || '解除 Google 綁定失敗。' },
      500
    );
  }
};
