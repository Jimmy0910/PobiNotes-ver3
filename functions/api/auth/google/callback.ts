import { signJWT } from '../_utils';
import { ensureSchemaAndUserDefaults } from '../../_dbInit';

interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
}

function redirectWithError(origin: string, code: string, isHttps: boolean): Response {
  const headers = new Headers();
  headers.set('Location', `${origin}/?auth_error=${encodeURIComponent(code)}`);
  headers.append(
    'Set-Cookie',
    `google_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}`
  );
  return new Response(null, { status: 302, headers });
}

async function resolveUniqueUsername(db: D1Database, rawBase: string): Promise<string> {
  const cleaned = rawBase.replace(/\s+/g, ' ').trim().slice(0, 28) || 'GoogleUser';
  const base = cleaned.toLowerCase() === 'jimmy' ? 'GoogleUser' : cleaned;

  const existingBase = await db
    .prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)')
    .bind(base)
    .first();

  if (!existingBase) {
    return base;
  }

  for (let i = 0; i < 10; i++) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${base.slice(0, 23)}_${rand}`;
    const exists = await db
      .prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)')
      .bind(candidate)
      .first();
    if (!exists) {
      return candidate;
    }
  }

  return `user_${crypto.randomUUID().slice(0, 8)}`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const isHttps = url.protocol === 'https:';

  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return redirectWithError(url.origin, 'google_not_configured', isHttps);
    }

    const oauthError = url.searchParams.get('error');
    if (oauthError) {
      return redirectWithError(url.origin, 'google_cancelled', isHttps);
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const savedState = cookies['google_oauth_state'];

    if (!code || !state || !savedState || state !== savedState) {
      return redirectWithError(url.origin, 'invalid_state', isHttps);
    }

    const redirectUri = env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;

    // Exchange authorization code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    if (!tokenRes.ok) {
      return redirectWithError(url.origin, 'token_exchange_failed', isHttps);
    }

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenData.access_token) {
      return redirectWithError(url.origin, 'token_exchange_failed', isHttps);
    }

    // Fetch Google user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!profileRes.ok) {
      return redirectWithError(url.origin, 'profile_fetch_failed', isHttps);
    }

    const profile = (await profileRes.json()) as GoogleUserInfo;
    if (!profile.sub) {
      return redirectWithError(url.origin, 'profile_fetch_failed', isHttps);
    }

    await ensureSchemaAndUserDefaults(env.DB);

    // Find existing Google user by google_id
    let user = (await env.DB.prepare(
      'SELECT id, username, is_admin FROM users WHERE google_id = ?'
    )
      .bind(profile.sub)
      .first()) as { id: string; username: string; is_admin: number } | null;

    if (!user) {
      const userId = crypto.randomUUID();
      const emailPrefix = profile.email ? profile.email.split('@')[0] : '';
      const desiredName = (profile.name && profile.name.trim()) || emailPrefix || 'GoogleUser';
      const uniqueUsername = await resolveUniqueUsername(env.DB, desiredName);
      const now = Date.now();

      await env.DB.prepare(
        `INSERT INTO users (id, username, password_hash, is_admin, google_id, email, auth_provider, created_at)
         VALUES (?, ?, ?, 0, ?, ?, 'google', ?)`
      )
        .bind(userId, uniqueUsername, 'google-oauth-only', profile.sub, profile.email || null, now)
        .run();

      await ensureSchemaAndUserDefaults(env.DB, userId);

      user = { id: userId, username: uniqueUsername, is_admin: 0 };
    } else if (profile.email) {
      // Keep email synced if missing/updated
      try {
        await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?')
          .bind(profile.email, user.id)
          .run();
      } catch {}
    }

    const jwtSecret = env.JWT_SECRET || 'local-dev-jwt-secret-key-12345';
    const isAdminVal = typeof user.is_admin === 'number' ? user.is_admin : 0;
    const token = await signJWT(
      { id: user.id, username: user.username, is_admin: isAdminVal },
      jwtSecret
    );

    const headers = new Headers();
    headers.set('Location', `${url.origin}/`);
    headers.append(
      'Set-Cookie',
      `authToken=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}`
    );
    headers.append(
      'Set-Cookie',
      `google_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}`
    );

    return new Response(null, {
      status: 302,
      headers
    });
  } catch (e) {
    console.error('Google OAuth callback error:', e);
    return redirectWithError(url.origin, 'google_auth_failed', isHttps);
  }
};
