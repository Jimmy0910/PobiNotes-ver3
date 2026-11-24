interface Env {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_REDIRECT_URI?: string;
}

type UserContext = {
  user?: { id: string; username: string; is_admin: number };
};

function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const onRequestGet: PagesFunction<Env, any, UserContext> = async (context) => {
  const { request, env, data } = context;
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') === 'link' ? 'link' : 'login';
  const isHttps = url.protocol === 'https:';

  if (!env.GOOGLE_CLIENT_ID) {
    const errorParam = mode === 'link' ? 'admin_google_error=google_not_configured' : 'auth_error=google_not_configured';
    return Response.redirect(`${url.origin}/?${errorParam}`, 302);
  }

  // Admin Google account linking requires an authenticated admin session
  if (mode === 'link') {
    if (!data?.user?.id || data.user.is_admin !== 1) {
      return Response.redirect(`${url.origin}/?admin_google_error=admin_required`, 302);
    }
  }

  const state = generateState();
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  const headers = new Headers();
  headers.set('Location', authUrl.toString());
  headers.append(
    'Set-Cookie',
    `google_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}`
  );

  if (mode === 'link' && data?.user?.id) {
    headers.append(
      'Set-Cookie',
      `google_oauth_link_uid=${encodeURIComponent(data.user.id)}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}`
    );
  } else {
    headers.append(
      'Set-Cookie',
      `google_oauth_link_uid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}`
    );
  }

  return new Response(null, {
    status: 302,
    headers
  });
};
