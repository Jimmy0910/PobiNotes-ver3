import { DEMO_CATEGORIES } from './demoData';
import type { CategoriesBundle, MistakeRecord } from '../types';

const BASE_URL = ''; // Relative paths since frontend and backend are deployed together on Pages

const STORAGE_KEYS = {
  MISTAKES: 'pobi_local_mistakes',
  CATEGORIES: 'pobi_local_categories',
  TEMPLATES: 'pobi_local_templates',
  USER: 'pobi_local_user',
  USERS_LIST: 'pobi_local_users_list',
  AUTH_TOKEN: 'pobi_auth_token',
};

interface LocalUserItem {
  id: string;
  username: string;
  is_admin: number;
  created_at: number;
}

function getLocalUsersList(): LocalUserItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    { id: 'u-jimmy', username: 'jimmy', is_admin: 1, created_at: Date.now() }
  ];
}

function saveLocalUsersList(list: LocalUserItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(list));
  } catch {}
}

function upsertLocalUser(user: { id: string; username: string; is_admin: number; created_at?: number }): LocalUserItem {
  const list = getLocalUsersList();
  const idx = list.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
  const isJimmy = user.username.toLowerCase() === 'jimmy';
  const entry: LocalUserItem = {
    id: idx !== -1 ? list[idx].id : user.id,
    username: user.username,
    is_admin: isJimmy ? 1 : user.is_admin,
    created_at: idx !== -1 ? list[idx].created_at : (user.created_at || Date.now()),
  };
  if (idx !== -1) {
    list[idx] = entry;
  } else {
    list.unshift(entry);
  }
  saveLocalUsersList(list);
  return entry;
}

// Helper: Read or initialize local mistakes
function getLocalMistakes(): MistakeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MISTAKES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalMistakes(list: MistakeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save mistakes to local storage:', e);
  }
}

// Helper: Read or initialize local categories
function getLocalCategories(): CategoriesBundle {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.subjects)) return parsed;
    }
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEMO_CATEGORIES));
  } catch {}
  return JSON.parse(JSON.stringify(DEMO_CATEGORIES));
}

function saveLocalCategories(cat: CategoriesBundle): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cat));
  } catch (e) {
    console.error('Failed to save categories to local storage:', e);
  }
}

// Helper: Convert Blob / File to base64 DataURL
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Local Fallback Handler for Offline / Demo / Dev Mode (Prevents 404)
async function handleLocalFallback<T = any>(
  endpoint: string,
  method: string,
  bodyData: any
): Promise<T> {
  const urlObj = new URL(endpoint, 'http://localhost');
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // 1. Mistakes API (/api/mistakes)
  if (pathname === '/api/mistakes') {
    const mistakes = getLocalMistakes();
    const categories = getLocalCategories();

    if (method === 'GET') {
      const id = searchParams.get('id');
      if (id) {
        const item = mistakes.find(m => m.id === id);
        return (item || null) as any as T;
      }
      return mistakes as any as T;
    }

    if (method === 'POST') {
      const newId = `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = Date.now();
      const subject = categories.subjects.find(s => s.id === bodyData.subjectId);
      const chapter = categories.chapters.find(c => c.id === bodyData.chapterId);
      const unit = categories.units.find(u => u.id === bodyData.unitId);
      const familiarity = categories.familiarities.find(f => f.id === bodyData.familiarityId);
      const errorReasons = (bodyData.errorReasonIds || [])
        .map((rid: string) => categories.errorReasons.find(r => r.id === rid)?.name)
        .filter(Boolean);

      let currentUserId = 'user-default';
      try {
        const rawU = localStorage.getItem(STORAGE_KEYS.USER);
        if (rawU) currentUserId = JSON.parse(rawU)?.id || currentUserId;
      } catch {}

      const newRecord: MistakeRecord = {
        id: newId,
        user_id: currentUserId,
        template_id: bodyData.templateId || 'default-exam',
        template_fields: {
          questionFields: [
            { id: 'q_desc', label: '題幹內容 / 詳述', type: 'textarea' },
            { id: 'q_image', label: '題目圖檔 / 照片', type: 'image' },
          ],
          answerFields: [
            { id: 'a_desc', label: '答案與完整詳解', type: 'textarea' },
            { id: 'a_image', label: '解題圖檔 / 板書紀錄', type: 'image' },
          ]
        },
        subject_id: bodyData.subjectId || null,
        subject_name: subject?.name,
        chapter_id: bodyData.chapterId || null,
        chapter_name: chapter?.name,
        unit_id: bodyData.unitId || null,
        unit_name: unit?.name,
        title: bodyData.title || '無標題題目',
        familiarity_id: bodyData.familiarityId || null,
        familiarity_name: familiarity?.name,
        familiarity_color: familiarity?.color,
        error_reason_ids: bodyData.errorReasonIds || [],
        error_reason_names: errorReasons,
        tags: bodyData.tags || [],
        mistake_date: bodyData.mistakeDate || new Date().toISOString().slice(0, 10),
        data: bodyData.data || { questionData: {}, answerData: {} },
        created_at: now,
        updated_at: now,
      };

      mistakes.unshift(newRecord);
      saveLocalMistakes(mistakes);
      return { success: true, id: newId, mistake: newRecord } as any as T;
    }

    if (method === 'PUT') {
      const targetId = bodyData.id;
      const index = mistakes.findIndex(m => m.id === targetId);
      if (index !== -1) {
        const existing = mistakes[index];
        const subject = bodyData.subjectId !== undefined
          ? categories.subjects.find(s => s.id === bodyData.subjectId)
          : undefined;
        const chapter = bodyData.chapterId !== undefined
          ? categories.chapters.find(c => c.id === bodyData.chapterId)
          : undefined;
        const unit = bodyData.unitId !== undefined
          ? categories.units.find(u => u.id === bodyData.unitId)
          : undefined;
        const familiarity = bodyData.familiarityId !== undefined
          ? categories.familiarities.find(f => f.id === bodyData.familiarityId)
          : undefined;

        const updated: MistakeRecord = {
          ...existing,
          ...bodyData,
          subject_name: subject !== undefined ? subject?.name : existing.subject_name,
          chapter_name: chapter !== undefined ? chapter?.name : existing.chapter_name,
          unit_name: unit !== undefined ? unit?.name : existing.unit_name,
          familiarity_name: familiarity !== undefined ? familiarity?.name : existing.familiarity_name,
          familiarity_color: familiarity !== undefined ? familiarity?.color : existing.familiarity_color,
          updated_at: Date.now(),
        };
        mistakes[index] = updated;
        saveLocalMistakes(mistakes);
      }
      return { success: true } as any as T;
    }

    if (method === 'DELETE') {
      if (searchParams.get('all') === 'true') {
        saveLocalMistakes([]);
        return { success: true, message: 'All mistakes cleared.' } as any as T;
      }
      const targetId = searchParams.get('id') || bodyData?.id;
      if (targetId) {
        const filtered = mistakes.filter(m => m.id !== targetId);
        saveLocalMistakes(filtered);
      }
      return { success: true } as any as T;
    }
  }

  // 2. Categories API (/api/categories, /api/subjects, /api/chapters)
  if (pathname === '/api/categories') {
    const categories = getLocalCategories();
    if (method === 'GET') {
      return categories as any as T;
    }
    if (method === 'POST') {
      const { dimension, name, parentId, subjectId, color } = bodyData || {};
      const newItem = {
        id: `local-${dimension}-${Date.now()}`,
        dimension,
        parent_id: parentId || null,
        subject_id: subjectId || null,
        name,
        color: color || 'default',
        sort_order: 10,
        is_active: 1,
        created_at: Date.now(),
        updated_at: Date.now(),
        mistake_count: 0
      };
      if (dimension === 'subject') categories.subjects.push(newItem);
      else if (dimension === 'chapter') categories.chapters.push(newItem);
      else if (dimension === 'unit') categories.units.push(newItem);
      else if (dimension === 'error_reason') categories.errorReasons.push(newItem);
      else if (dimension === 'familiarity') categories.familiarities.push(newItem);
      saveLocalCategories(categories);
      return { success: true, item: newItem } as any as T;
    }
  }

  if (pathname === '/api/subjects' && method === 'POST') {
    const categories = getLocalCategories();
    const trimmedName = (bodyData.name || '').trim();
    const existing = categories.subjects.find(
      s => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return { success: true, id: existing.id, subject: existing, item: existing } as any as T;
    }
    const newSubject = {
      id: `local-subject-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dimension: 'subject' as const,
      parent_id: null,
      name: trimmedName,
      color: bodyData.color || 'color:emerald;icon:Book',
      sort_order: (categories.subjects.length + 1) * 10,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    };
    categories.subjects.push(newSubject);
    saveLocalCategories(categories);
    return { success: true, id: newSubject.id, subject: newSubject, item: newSubject } as any as T;
  }

  if (pathname === '/api/chapters' && method === 'POST') {
    const categories = getLocalCategories();
    const trimmedName = (bodyData.name || '').trim();
    const existing = categories.chapters.find(
      c =>
        (c.subject_id === bodyData.subjectId || c.parent_id === bodyData.subjectId) &&
        c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return { success: true, id: existing.id, chapter: existing, item: existing } as any as T;
    }
    const newChapter = {
      id: `local-chapter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dimension: 'chapter' as const,
      parent_id: bodyData.subjectId,
      subject_id: bodyData.subjectId,
      name: trimmedName,
      color: 'default',
      sort_order: 10,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    };
    categories.chapters.push(newChapter);
    saveLocalCategories(categories);
    return { success: true, id: newChapter.id, chapter: newChapter, item: newChapter } as any as T;
  }

  // 3. Image Upload (/api/images/upload)
  if (pathname === '/api/images/upload' && method === 'POST') {
    let dataUrl = '';
    if (bodyData instanceof Blob) {
      dataUrl = await blobToDataUrl(bodyData);
    } else if (typeof bodyData === 'string' && bodyData.startsWith('data:')) {
      dataUrl = bodyData;
    }
    return { success: true, key: dataUrl } as any as T;
  }

  // 4. Templates & Prompt Templates
  if (pathname === '/api/templates') {
    return [
      {
        id: 'default-exam',
        name: '高中大考標準題型模板',
        fields: {
          questionFields: [
            { id: 'q_desc', label: '題幹內容 / 詳述', type: 'textarea' },
            { id: 'q_image', label: '題目圖檔 / 照片', type: 'image' },
          ],
          answerFields: [
            { id: 'a_desc', label: '答案與完整詳解', type: 'textarea' },
            { id: 'a_image', label: '解題圖檔 / 板書紀錄', type: 'image' },
          ]
        }
      }
    ] as any as T;
  }

  if (pathname === '/api/prompt-templates') {
    return [] as any as T;
  }

  // 5. Auth & User Profile
  if (pathname === '/api/auth/register' && method === 'POST') {
    const { username, registerAsAdmin, is_admin } = bodyData || {};
    const trimmed = (username || '').trim();
    const isJimmy = trimmed.toLowerCase() === 'jimmy';
    const rawUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: trimmed || '學生同學',
      is_admin: (isJimmy || registerAsAdmin || is_admin) ? 1 : 0,
      created_at: Date.now()
    };
    const savedUser = upsertLocalUser(rawUser);
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(savedUser));
    } catch {}
    return { success: true, message: '註冊成功', user: savedUser } as any as T;
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const { username } = bodyData || {};
    const trimmed = (username || '').trim();
    const isJimmy = trimmed.toLowerCase() === 'jimmy';
    const existingInList = getLocalUsersList().find(u => u.username.toLowerCase() === trimmed.toLowerCase());
    const userToSave = existingInList || {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: trimmed || '學生同學',
      is_admin: isJimmy ? 1 : 0,
      created_at: Date.now()
    };
    const currentUser = upsertLocalUser(userToSave);
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } catch {}
    return { success: true, user: currentUser } as any as T;
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
    return { success: true } as any as T;
  }

  if (pathname === '/api/auth/me') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.id && u.username) {
          if (String(u.username).toLowerCase() === 'jimmy') {
            u.is_admin = 1;
            try { localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u)); } catch {}
          }
          upsertLocalUser(u);
          return { success: true, user: u } as any as T;
        }
      }
    } catch {}
    return { success: false, user: null } as any as T;
  }

  // 6. Admin API fallbacks
  if (pathname === '/api/admin/users' && method === 'GET') {
    let currentUser: any = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      if (raw) currentUser = JSON.parse(raw);
    } catch {}
    if (currentUser && currentUser.id && currentUser.username) {
      upsertLocalUser(currentUser);
    }
    return getLocalUsersList() as any as T;
  }

  if (pathname === '/api/admin/users' && method === 'POST') {
    const { username, is_admin } = bodyData || {};
    const trimmed = (username || '').trim();
    if (!trimmed) {
      throw new Error('請輸入有效的使用者名稱');
    }
    const existing = getLocalUsersList().find(u => u.username.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      throw new Error('此使用者名稱已被註冊，請使用其他名稱。');
    }
    const created = upsertLocalUser({
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: trimmed,
      is_admin: is_admin ? 1 : 0,
      created_at: Date.now()
    });
    return { success: true, user: created } as any as T;
  }

  if (pathname.startsWith('/api/admin/users/') && method === 'DELETE') {
    const targetUserId = pathname.replace('/api/admin/users/', '').trim();
    const filtered = getLocalUsersList().filter(u => u.id !== targetUserId);
    saveLocalUsersList(filtered);
    return { success: true } as any as T;
  }

  if (pathname === '/api/feedback') {
    return [] as any as T;
  }

  // Default fallback response
  return { success: true } as any as T;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: Omit<RequestInit, 'body'> & { body?: any } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const rawBody = options.body;
  let parsedBodyData = rawBody;

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
    return await handleLocalFallback<T>(endpoint, method, parsedBodyData);
  }

  const contentType = response.headers.get('content-type') || '';
  const isHtmlResponse = contentType.includes('text/html');

  // Only fall back to LocalStorage if running on a static dev server without /api functions mounted (404 or HTML SPA fallback)
  if (
    response.status === 404 ||
    (isHtmlResponse && endpoint.startsWith('/api'))
  ) {
    console.warn(`[Local Fallback] API ${endpoint} returned ${response.status} (${contentType || 'no type'}). Switching to Local Storage Adapter.`);
    return await handleLocalFallback<T>(endpoint, method, parsedBodyData);
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
      return await handleLocalFallback<T>(endpoint, method, parsedBodyData);
    }
    return text as any as T;
  }
}
