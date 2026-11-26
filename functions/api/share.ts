interface Env {
  DB: D1Database;
}

interface UserContext {
  user?: { id: string; username: string };
}

const SHARE_TTL_DAYS = 30;
const SHARE_TTL_MS = SHARE_TTL_DAYS * 24 * 60 * 60 * 1000;

async function ensureSharedPacksTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS shared_packs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        creator_name TEXT DEFAULT '',
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      )`
    )
    .run();

  try {
    await db.prepare(`ALTER TABLE shared_packs ADD COLUMN expires_at INTEGER`).run();
  } catch {
    // Column already exists
  }
}

async function cleanupExpiredSharedPacks(db: D1Database, now: number) {
  const cutoffCreatedAt = now - SHARE_TTL_MS;
  try {
    await db
      .prepare(
        `DELETE FROM shared_packs
         WHERE (expires_at IS NOT NULL AND expires_at <= ?)
            OR (expires_at IS NULL AND created_at <= ?)`
      )
      .bind(now, cutoffCreatedAt)
      .run();
  } catch {
    // Best-effort cleanup
  }
}

// GET /api/share?id=xxx (Public read-only, 30-day TTL)
export const onRequestGet: PagesFunction<Env, any, UserContext> = async (context) => {
  try {
    const { request, env } = context;
    await ensureSharedPacksTable(env.DB);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: '缺少分享包編號' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const row = (await env.DB.prepare(
      `SELECT id, title, creator_name, payload, created_at, expires_at FROM shared_packs WHERE id = ?`
    )
      .bind(id)
      .first()) as any;

    if (!row) {
      return new Response(JSON.stringify({ error: '找不到此錯題分享連結，或連結已超過 30 天效期而自動失效' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Date.now();
    const createdAt = Number(row.created_at) || now;
    const expiresAt =
      typeof row.expires_at === 'number' && row.expires_at > 0
        ? row.expires_at
        : createdAt + SHARE_TTL_MS;

    if (now > expiresAt) {
      try {
        await env.DB.prepare(`DELETE FROM shared_packs WHERE id = ?`).bind(id).run();
      } catch {}
      return new Response(
        JSON.stringify({
          error: '此錯題分享連結已超過 30 天有效期限，系統已自動失效並清除。',
          expired: true
        }),
        {
          status: 410,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    let items: any[] = [];
    try {
      const parsed = JSON.parse(row.payload || '[]');
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = [];
    }

    return new Response(
      JSON.stringify({
        success: true,
        pack: {
          id: row.id,
          title: row.title,
          creatorName: row.creator_name || 'PobiNotes 學習者',
          createdAt,
          expiresAt,
          ttlDays: SHARE_TTL_DAYS,
          items
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/share (Authenticated, 30-day TTL)
export const onRequestPost: PagesFunction<Env, any, UserContext> = async (context) => {
  try {
    const { request, env, data } = context;
    if (!data.user) {
      return new Response(JSON.stringify({ error: '請先登入再建立分享連結' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await ensureSharedPacksTable(env.DB);
    const body = (await request.json()) as any;
    const title = String(body.title || '').trim() || '精華錯題分享包';
    const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: '請至少選擇 1 道錯題進行分享' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const now = Date.now();
    const expiresAt = now + SHARE_TTL_MS;

    await cleanupExpiredSharedPacks(env.DB, now);

    await env.DB.prepare(
      `INSERT INTO shared_packs (id, user_id, title, creator_name, payload, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, data.user.id, title, data.user.username || '', JSON.stringify(items), now, expiresAt)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        shareId: id,
        expiresAt,
        ttlDays: SHARE_TTL_DAYS
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
