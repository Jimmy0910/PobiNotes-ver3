import { hashPassword, signJWT } from './_utils';
import { ensureSchemaAndUserDefaults } from '../_dbInit';

interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const { username, password, is_admin, registerAsAdmin } = await request.json() as any;

    if (!username || !password || username.trim() === '' || String(password).length < 1) {
      return new Response(JSON.stringify({ error: '請輸入有效的使用者名稱與密碼。' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await ensureSchemaAndUserDefaults(env.DB);

    const trimmedUsername = username.trim();
    const isJimmy = trimmedUsername.toLowerCase() === 'jimmy';

    // Check if user already exists (case-insensitive check for safety)
    const existing = await env.DB.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)')
      .bind(trimmedUsername)
      .first();

    if (existing) {
      return new Response(JSON.stringify({ error: '此使用者名稱已被註冊，請使用其他名稱或直接登入。' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Admin registration check
    const wantsAdmin = !!(isJimmy || is_admin === true || registerAsAdmin === true);
    if (wantsAdmin && !isJimmy) {
      const adminExists = await env.DB.prepare('SELECT id FROM users WHERE is_admin = 1').first();
      if (adminExists) {
        return new Response(JSON.stringify({ error: '系統已存在管理員帳號，一般註冊請取消勾選管理員 (Admin account already exists)。' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Create user
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = Date.now();
    const isAdminVal = wantsAdmin ? 1 : 0;

    await env.DB.prepare('INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, trimmedUsername, passwordHash, isAdminVal, now)
      .run();

    await ensureSchemaAndUserDefaults(env.DB, userId);

    // Sign token
    const jwtSecret = env.JWT_SECRET || 'local-dev-jwt-secret-key-12345';
    const payload = { id: userId, username: trimmedUsername, is_admin: isAdminVal };
    const token = await signJWT(payload, jwtSecret);

    // Set cookie (HTTP-only)
    const cookie = `authToken=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`;

    return new Response(JSON.stringify({
      success: true,
      token,
      message: 'User registered successfully.',
      user: { id: userId, username: trimmedUsername, is_admin: isAdminVal }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
