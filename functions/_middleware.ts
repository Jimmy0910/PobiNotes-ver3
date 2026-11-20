import { verifyJWT } from './api/auth/_utils';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET?: string;
}

export const onRequest: PagesFunction<Env, any, { user?: { id: string; username: string; is_admin: number } }> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  
  const isApiRequest = url.pathname.startsWith('/api/');
  const isAuthRequest = url.pathname.startsWith('/api/auth/login') || url.pathname.startsWith('/api/auth/register');
  const isPublicReadRequest =
    request.method === 'GET' &&
    (url.pathname === '/api/share' || url.pathname.startsWith('/api/images/'));
  
  const jwtSecret = env.JWT_SECRET || 'local-dev-jwt-secret-key-12345';
  
  let user = null;
  
  // Parse Cookie header or Authorization Bearer header
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
  
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = cookies['authToken'] || bearerToken;
  
  if (token) {
    const payload = await verifyJWT(token, jwtSecret);
    if (payload && payload.id && payload.username) {
      const isJimmy = String(payload.username).toLowerCase() === 'jimmy';
      user = {
        id: payload.id,
        username: payload.username,
        is_admin: isJimmy ? 1 : (typeof payload.is_admin === 'number' ? payload.is_admin : 0)
      };
      context.data.user = user;
    }
  }
  
  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  }

  // Block unauthorized API requests (excluding login/register and public read-only share/image endpoints)
  if (isApiRequest && !isAuthRequest && !isPublicReadRequest && !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Please login.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const response = await next();
  
  // Add CORS headers to all API responses
  if (isApiRequest) {
    const newHeaders = new Headers(response.headers);
    const origin = request.headers.get('Origin') || '*';
    newHeaders.set('Access-Control-Allow-Origin', origin);
    newHeaders.set('Access-Control-Allow-Credentials', 'true');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
  
  return response;
};
