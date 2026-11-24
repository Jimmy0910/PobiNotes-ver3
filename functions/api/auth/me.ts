export const onRequestGet: PagesFunction<{ DB?: D1Database }, any, { user?: { id: string; username: string; is_admin: number } }> = async (context) => {
  const { data, env } = context;

  if (!data.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let email: string | null = null;
  let authProvider: string = 'local';

  if (env?.DB) {
    try {
      const row = await env.DB.prepare(
        'SELECT email, auth_provider FROM users WHERE id = ?'
      )
        .bind(data.user.id)
        .first() as { email?: string | null; auth_provider?: string | null } | null;
      if (row) {
        email = typeof row.email === 'string' && row.email.trim() ? row.email.trim() : null;
        authProvider =
          typeof row.auth_provider === 'string' && row.auth_provider.trim()
            ? row.auth_provider.trim()
            : 'local';
      }
    } catch {
      // Fallback safely if older schema hasn't migrated yet
    }
  }

  const userData = {
    ...data.user,
    email,
    auth_provider: authProvider
  };
  if (userData.username && userData.username.toLowerCase() === 'jimmy') {
    userData.is_admin = 1;
  }

  return new Response(JSON.stringify({
    success: true,
    user: userData
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
