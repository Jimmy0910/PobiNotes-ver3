// Authenticated Cloudflare Pages Function for per-subject Daily Gmail Review Reminders.
// Routes:
//   GET  /api/daily-reminder?subjectId=...  -> returns Gmail eligibility + saved config for subject
//   PUT  /api/daily-reminder                -> saves scope, familiarity schedule, enabled toggle, send time & days (Gmail users only)
//   POST /api/daily-reminder                -> action: 'send_test' -> sends preview reminder email to the user's Gmail (Gmail users only)

import { ensureSchemaAndUserDefaults } from './_dbInit';
import {
  GMAIL_ONLY_ERROR_MESSAGE,
  jsonResponse,
  getUserGmailEligibility,
  parseReminderRow,
  sanitizeScopeKeys,
  sanitizeSchedule,
  sanitizeSendTime,
  sanitizeDaysOfWeek,
  getTaipeiClock,
  evaluateSubjectDueMistakes,
  buildDailyReminderEmail,
  sendResendEmail,
  type ResendEnv
} from './_dailyReminderHelper';

interface Env extends ResendEnv {
  DB: D1Database;
}

type UserContext = {
  user?: { id: string; username: string; is_admin: number };
};

export const onRequestGet: PagesFunction<Env, any, UserContext> = async context => {
  try {
    const { request, env, data } = context;
    if (!data?.user?.id) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please login.' }, 401);
    }

    const userId = data.user.id;
    await ensureSchemaAndUserDefaults(env.DB, userId);

    const url = new URL(request.url);
    const subjectId = (url.searchParams.get('subjectId') || '').trim();
    const eligibility = await getUserGmailEligibility(env.DB, userId);

    if (!subjectId) {
      // Return eligibility + all reminders for this user
      const allRows = eligibility.eligible
        ? await env.DB.prepare('SELECT * FROM daily_email_reminders WHERE user_id = ?')
            .bind(userId)
            .all()
        : { results: [] };
      const reminders = (allRows.results || []).map((row: any) =>
        parseReminderRow(row, String(row.subject_id || ''))
      );
      return jsonResponse({
        success: true,
        eligible: eligibility.eligible,
        auth_provider: eligibility.authProvider,
        email: eligibility.eligible ? eligibility.email : null,
        reminders
      });
    }

    if (!eligibility.eligible) {
      return jsonResponse({
        success: true,
        eligible: false,
        auth_provider: eligibility.authProvider,
        email: null,
        error: GMAIL_ONLY_ERROR_MESSAGE,
        reminder: parseReminderRow(null, subjectId)
      });
    }

    const row = await env.DB.prepare(
      'SELECT * FROM daily_email_reminders WHERE user_id = ? AND subject_id = ?'
    )
      .bind(userId, subjectId)
      .first();

    return jsonResponse({
      success: true,
      eligible: true,
      auth_provider: eligibility.authProvider,
      email: eligibility.email,
      reminder: parseReminderRow(row, subjectId)
    });
  } catch (err: any) {
    return jsonResponse(
      { success: false, error: err?.message || '讀取每日通知設定失敗。' },
      500
    );
  }
};

export const onRequestPut: PagesFunction<Env, any, UserContext> = async context => {
  try {
    const { request, env, data } = context;
    if (!data?.user?.id) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please login.' }, 401);
    }

    const userId = data.user.id;
    await ensureSchemaAndUserDefaults(env.DB, userId);

    const eligibility = await getUserGmailEligibility(env.DB, userId);
    if (!eligibility.eligible) {
      return jsonResponse(
        { success: false, eligible: false, error: GMAIL_ONLY_ERROR_MESSAGE },
        403
      );
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: '請求格式錯誤，請傳送有效 JSON。' }, 400);
    }

    const subjectId = typeof body?.subjectId === 'string' ? body.subjectId.trim() : '';
    if (!subjectId) {
      return jsonResponse({ success: false, error: '缺少必要欄位：subjectId。' }, 400);
    }

    const subjectRow = await env.DB.prepare(
      'SELECT id, name FROM subjects WHERE id = ? AND user_id = ?'
    )
      .bind(subjectId, userId)
      .first();

    if (!subjectRow) {
      return jsonResponse({ success: false, error: '找不到指定的科目。' }, 404);
    }

    const enabled = body?.enabled === true || Number(body?.enabled) === 1 ? 1 : 0;
    const scopeKeys = sanitizeScopeKeys(body?.scopeKeys);
    const schedule = sanitizeSchedule(body?.schedule);
    const sendTime = sanitizeSendTime(body?.sendTime);
    const daysOfWeek = sanitizeDaysOfWeek(body?.daysOfWeek);
    const timezone = 'Asia/Taipei';
    const now = Date.now();

    const existing = await env.DB.prepare(
      'SELECT id, last_sent_date FROM daily_email_reminders WHERE user_id = ? AND subject_id = ?'
    )
      .bind(userId, subjectId)
      .first() as { id: string; last_sent_date?: string | null } | null;

    if (existing) {
      await env.DB.prepare(
        `UPDATE daily_email_reminders
         SET enabled = ?, scope_keys_json = ?, schedule_json = ?, send_time = ?, days_of_week_json = ?, timezone = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
        .bind(
          enabled,
          JSON.stringify(scopeKeys),
          JSON.stringify(schedule),
          sendTime,
          JSON.stringify(daysOfWeek),
          timezone,
          now,
          existing.id,
          userId
        )
        .run();
    } else {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO daily_email_reminders
         (id, user_id, subject_id, enabled, scope_keys_json, schedule_json, send_time, days_of_week_json, timezone, last_sent_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
      )
        .bind(
          id,
          userId,
          subjectId,
          enabled,
          JSON.stringify(scopeKeys),
          JSON.stringify(schedule),
          sendTime,
          JSON.stringify(daysOfWeek),
          timezone,
          now,
          now
        )
        .run();
    }

    const savedRow = await env.DB.prepare(
      'SELECT * FROM daily_email_reminders WHERE user_id = ? AND subject_id = ?'
    )
      .bind(userId, subjectId)
      .first();

    return jsonResponse({
      success: true,
      eligible: true,
      email: eligibility.email,
      reminder: parseReminderRow(savedRow, subjectId)
    });
  } catch (err: any) {
    return jsonResponse(
      { success: false, error: err?.message || '儲存每日通知設定失敗。' },
      500
    );
  }
};

export const onRequestPost: PagesFunction<Env, any, UserContext> = async context => {
  try {
    const { request, env, data } = context;
    if (!data?.user?.id) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please login.' }, 401);
    }

    const userId = data.user.id;
    await ensureSchemaAndUserDefaults(env.DB, userId);

    const eligibility = await getUserGmailEligibility(env.DB, userId);
    if (!eligibility.eligible || !eligibility.email) {
      return jsonResponse(
        { success: false, eligible: false, error: GMAIL_ONLY_ERROR_MESSAGE },
        403
      );
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: '請求格式錯誤，請傳送有效 JSON。' }, 400);
    }

    if (body?.action !== 'send_test') {
      return jsonResponse({ success: false, error: '不支援的操作類型。' }, 400);
    }

    const subjectId = typeof body?.subjectId === 'string' ? body.subjectId.trim() : '';
    if (!subjectId) {
      return jsonResponse({ success: false, error: '缺少必要欄位：subjectId。' }, 400);
    }

    const savedRow = await env.DB.prepare(
      'SELECT * FROM daily_email_reminders WHERE user_id = ? AND subject_id = ?'
    )
      .bind(userId, subjectId)
      .first();
    const savedConfig = parseReminderRow(savedRow, subjectId);

    const scopeKeys =
      body?.scopeKeys !== undefined ? sanitizeScopeKeys(body.scopeKeys) : savedConfig.scopeKeys;
    const schedule =
      body?.schedule !== undefined ? sanitizeSchedule(body.schedule) : savedConfig.schedule;
    const sendTime =
      body?.sendTime !== undefined ? sanitizeSendTime(body.sendTime) : savedConfig.sendTime;
    const daysOfWeek =
      body?.daysOfWeek !== undefined ? sanitizeDaysOfWeek(body.daysOfWeek) : savedConfig.daysOfWeek;

    const clock = getTaipeiClock();
    const evaluation = await evaluateSubjectDueMistakes(
      env.DB,
      userId,
      subjectId,
      scopeKeys,
      schedule,
      clock.dateStr
    );

    const emailContent = buildDailyReminderEmail({
      recipientName: eligibility.username,
      subjectName: evaluation.subjectName,
      todayStr: clock.dateStr,
      totalInScope: evaluation.totalInScope,
      dueMistakes: evaluation.dueMistakes,
      schedule,
      sendTime,
      daysOfWeek,
      isTestPreview: true
    });

    const sendRes = await sendResendEmail(
      env,
      eligibility.email,
      emailContent.subject,
      emailContent.html,
      emailContent.text
    );

    if (!sendRes.ok) {
      return jsonResponse(
        {
          success: false,
          error: sendRes.error || '寄送預覽信失敗。',
          status: sendRes.status
        },
        sendRes.status >= 400 && sendRes.status < 600 ? sendRes.status : 502
      );
    }

    return jsonResponse({
      success: true,
      sentTo: eligibility.email,
      dueCount: evaluation.dueMistakes.length,
      totalInScope: evaluation.totalInScope,
      resendId: sendRes.id
    });
  } catch (err: any) {
    return jsonResponse(
      { success: false, error: err?.message || '寄送測試通知信時發生錯誤。' },
      500
    );
  }
};
