import { ensureSchemaAndUserDefaults } from '../_dbInit';
import { hashPassword } from '../auth/_utils';

interface Env {
  DB: D1Database;
}

interface UserContext {
  user?: { id: string; username: string; is_admin: number };
}

// GET /api/admin/users - Retrieve all users (admin only)
export const onRequestGet: PagesFunction<Env, any, UserContext> = async (context) => {
  try {
    const { env, data } = context;
    if (!data.user || data.user.is_admin !== 1) {
      return new Response(JSON.stringify({ error: 'Forbidden. Admin access required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Lightweight check without running heavy mistake healing
    await ensureSchemaAndUserDefaults(env.DB);

    const users = await env.DB.prepare('SELECT id, username, email, auth_provider, is_admin, created_at FROM users ORDER BY created_at DESC')
      .all();

    return new Response(JSON.stringify(users.results || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/admin/users - Create a new user account directly from Admin Panel
export const onRequestPost: PagesFunction<Env, any, UserContext> = async (context) => {
  try {
    const { request, env, data } = context;
    if (!data.user || data.user.is_admin !== 1) {
      return new Response(JSON.stringify({ error: 'Forbidden. Admin access required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { username, password, is_admin } = await request.json() as any;
    const trimmedUsername = (username || '').trim();
    const rawPassword = String(password || '');

    if (!trimmedUsername || rawPassword.length < 1) {
      return new Response(JSON.stringify({ error: '請輸入有效的使用者名稱與密碼。' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await ensureSchemaAndUserDefaults(env.DB);

    const existing = await env.DB.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)')
      .bind(trimmedUsername)
      .first();

    if (existing) {
      return new Response(JSON.stringify({ error: '此使用者名稱已被註冊，請使用其他名稱。' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(rawPassword);
    const now = Date.now();
    const isAdminVal = (trimmedUsername.toLowerCase() === 'jimmy' || is_admin === 1 || is_admin === true) ? 1 : 0;

    await env.DB.prepare('INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, trimmedUsername, passwordHash, isAdminVal, now)
      .run();

    await ensureSchemaAndUserDefaults(env.DB, userId);

    return new Response(JSON.stringify({
      success: true,
      user: { id: userId, username: trimmedUsername, is_admin: isAdminVal, created_at: now }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
