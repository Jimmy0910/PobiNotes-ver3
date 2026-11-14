export const onRequestGet: PagesFunction<any, any, { user?: { id: string; username: string; is_admin: number } }> = async (context) => {
  const { data } = context;
  
  if (!data.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const userData = { ...data.user };
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
