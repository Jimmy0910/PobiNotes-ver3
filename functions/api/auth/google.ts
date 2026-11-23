interface Env {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_REDIRECT_URI?: string;
}

function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.GOOGLE_CLIENT_ID) {
    return Response.redirect(`${url.origin}/?auth_error=google_not_configured`, 302);
  }

  const state = generateState();
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  const isHttps = url.protocol === 'https:';

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

  return new Response(null, {
    status: 302,
    headers
  });
};
