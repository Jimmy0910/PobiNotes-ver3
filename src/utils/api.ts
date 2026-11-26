const BASE_URL = ''; // Relative paths since frontend and backend are deployed together on Pages

const STORAGE_KEYS = {
  USER: 'pobi_local_user',
  AUTH_TOKEN: 'pobi_auth_token',
};

let fallbackModulePromise: Promise<typeof import('./localApiFallback')> | null = null;

export function preloadLocalFallback() {
  if (!fallbackModulePromise) {
    fallbackModulePromise = import('./localApiFallback');
  }
  return fallbackModulePromise;
}

async function invokeLocalFallback<T>(endpoint: string, method: string, bodyData: any): Promise<T> {
  const mod = await preloadLocalFallback();
  return mod.handleLocalFallback<T>(endpoint, method, bodyData);
}

function isDemoGuestMode(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.id === 'demo-guest';
  } catch {
    return false;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: Omit<RequestInit, 'body'> & { body?: any } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const rawBody = options.body;
  let parsedBodyData = rawBody;
  if (typeof rawBody === 'string') {
    try {
      parsedBodyData = JSON.parse(rawBody);
    } catch {
      parsedBodyData = rawBody;
    }
  }

  // In Demo Guest mode (no account login), bypass backend auth-protected /api endpoints
  // and handle all reads/writes locally in browser storage so Demo works identically on Cloudflare Pages.
  if (
    isDemoGuestMode() &&
    endpoint.startsWith('/api') &&
    !endpoint.startsWith('/api/auth/login') &&
    !endpoint.startsWith('/api/auth/register') &&
    !endpoint.startsWith('/api/share')
  ) {
    return await invokeLocalFallback<T>(endpoint, method, parsedBodyData);
  }

  const url = `${BASE_URL}${endpoint}`;

  let storedToken = '';
  try {
    storedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || '';
  } catch {}

  const mergedHeaders: Record<string, string> = {
    ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  // Default to credentials 'include' so HTTP-only auth cookies are sent and stored properly
  const config = {
    ...options,
    headers: mergedHeaders,
    credentials: options.credentials || 'include',
  } as RequestInit;

  // Set Content-Type: application/json if body is not a binary blob or form data
  if (config.body && !(config.body instanceof Blob) && !(config.body instanceof FormData)) {
    config.headers = {
      'Content-Type': 'application/json',
      ...(config.headers as Record<string, string>),
    };
    if (typeof config.body !== 'string') {
      parsedBodyData = config.body;
      config.body = JSON.stringify(config.body);
    } else {
      try {
        parsedBodyData = JSON.parse(config.body);
      } catch {
        parsedBodyData = config.body;
      }
    }
  }

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err: any) {
    console.warn(`[Local Fallback] Network failed on ${endpoint}: ${err.message}. Switching to Local Storage Adapter.`);
    return await invokeLocalFallback<T>(endpoint, method, parsedBodyData);
  }

  const contentType = response.headers.get('content-type') || '';
  const isHtmlResponse = contentType.includes('text/html');

  // Only fall back to LocalStorage if running on a static dev server without /api functions mounted (404 or HTML SPA fallback)
  if (
    response.status === 404 ||
    (isHtmlResponse && endpoint.startsWith('/api'))
  ) {
    if (endpoint === '/api/auth/me') {
      try {
        if (!localStorage.getItem(STORAGE_KEYS.USER)) {
          return { success: false, user: null } as any as T;
        }
      } catch {}
    }
    console.warn(`[Local Fallback] API ${endpoint} returned ${response.status} (${contentType || 'no type'}). Switching to Local Storage Adapter.`);
    return await invokeLocalFallback<T>(endpoint, method, parsedBodyData);
  }

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const data = await response.json() as any;
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const text = await response.text();
  try {
    const parsed = text ? JSON.parse(text) : ({ success: true } as any);
    // Persist auth token when logging in or registering
    if (
      (endpoint === '/api/auth/login' || endpoint === '/api/auth/register') &&
      parsed?.token
    ) {
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, parsed.token);
      } catch {}
    } else if (endpoint === '/api/auth/logout') {
      try {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      } catch {}
    }
    return parsed as T;
  } catch {
    if (endpoint.startsWith('/api')) {
      return await invokeLocalFallback<T>(endpoint, method, parsedBodyData);
    }
    return text as any as T;
  }
}
