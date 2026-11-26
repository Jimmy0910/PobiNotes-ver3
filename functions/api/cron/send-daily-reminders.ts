// Protected scheduled dispatch endpoint for Daily Gmail Review Reminders.
// Route: POST /api/cron/send-daily-reminders
// Auth: Strictly requires header `X-Cron-Secret` matching `env.CRON_SECRET`.
// Triggered hourly by GitHub Actions (.github/workflows/daily-gmail-reminder.yml) or any trusted cron runner.

import { ensureSchemaAndUserDefaults } from '../_dbInit';
import {
  jsonResponse,
  isValidEmail,
  parseReminderRow,
  getTaipeiClock,
  evaluateSubjectDueMistakes,
  buildDailyReminderEmail,
  sendResendEmail,
  type ResendEnv
} from '../_dailyReminderHelper';

interface Env extends ResendEnv {
  DB: D1Database;
  CRON_SECRET?: string;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const onRequestPost: PagesFunction<Env> = async context => {
  try {
    const { request, env } = context;

    const expectedSecret = typeof env.CRON_SECRET === 'string' ? env.CRON_SECRET.trim() : '';
    if (!expectedSecret) {
      return jsonResponse(
        {
          success: false,
          error: '尚未設定環境變數 CRON_SECRET，排程寄信接口已停用。'
        },
        500
      );
    }

    const providedSecret = (request.headers.get('X-Cron-Secret') || '').trim();
    if (!providedSecret || !timingSafeEqualStr(providedSecret, expectedSecret)) {
      return jsonResponse({ success: false, error: 'Unauthorized cron secret.' }, 401);
    }

    await ensureSchemaAndUserDefaults(env.DB);

    const clock = getTaipeiClock();

    // Fetch all enabled reminders belonging to Google/Gmail users who have not yet been sent today
    const rowsRes = await env.DB.prepare(
      `SELECT
         r.*,
         u.username AS user_username,
         u.email AS user_email,
         u.auth_provider AS user_auth_provider
       FROM daily_email_reminders r
       INNER JOIN users u ON r.user_id = u.id
       WHERE r.enabled = 1
         AND u.auth_provider = 'google'
         AND u.email IS NOT NULL
         AND TRIM(u.email) != ''
         AND (r.last_sent_date IS NULL OR r.last_sent_date != ?)`
    )
      .bind(clock.dateStr)
      .all();

    const candidates = (rowsRes.results || []) as any[];
    const matched: Array<{ row: any; config: ReturnType<typeof parseReminderRow> }> = [];

    for (const row of candidates) {
      const config = parseReminderRow(row, String(row.subject_id || ''));
      // Catch-up safe: trigger whenever current Taipei time has reached or passed sendTime
      // and today's email has not been sent yet (guarded by last_sent_date != clock.dateStr).
      if (clock.timeStr < config.sendTime) continue;
      if (!config.daysOfWeek.includes(clock.dayOfWeek)) continue;
      if (!isValidEmail(row.user_email)) continue;
      matched.push({ row, config });
    }

    // Cap per-run batch size safely within Cloudflare Pages Function execution budget
    const MAX_PER_RUN = 35;
    const toProcess = matched.slice(0, MAX_PER_RUN);

    let sentCount = 0;
    let failedCount = 0;
    const details: Array<{
      reminderId: string;
      subjectId: string;
      ok: boolean;
      dueCount?: number;
      error?: string;
    }> = [];

    for (let i = 0; i < toProcess.length; i++) {
      const { row, config } = toProcess[i];
      const userId = String(row.user_id);
      const subjectId = String(row.subject_id);
      const email = String(row.user_email).trim();
      const username = row.user_username ? String(row.user_username) : '同學';

      try {
        const evaluation = await evaluateSubjectDueMistakes(
          env.DB,
          userId,
          subjectId,
          config.scopeKeys,
          config.schedule,
          clock.dateStr
        );

        const emailContent = buildDailyReminderEmail({
          recipientName: username,
          subjectName: evaluation.subjectName,
          todayStr: clock.dateStr,
          totalInScope: evaluation.totalInScope,
          dueMistakes: evaluation.dueMistakes,
          schedule: config.schedule,
          sendTime: config.sendTime,
          daysOfWeek: config.daysOfWeek,
          isTestPreview: false
        });

        const sendRes = await sendResendEmail(
          env,
          email,
          emailContent.subject,
          emailContent.html,
          emailContent.text
        );

        if (sendRes.ok) {
          sentCount += 1;
          await env.DB.prepare(
            'UPDATE daily_email_reminders SET last_sent_date = ?, updated_at = ? WHERE id = ?'
          )
            .bind(clock.dateStr, Date.now(), String(row.id))
            .run();
          details.push({
            reminderId: String(row.id),
            subjectId,
            ok: true,
            dueCount: evaluation.dueMistakes.length
          });
        } else {
          failedCount += 1;
          details.push({
            reminderId: String(row.id),
            subjectId,
            ok: false,
            error: sendRes.error || `HTTP ${sendRes.status}`
          });
        }
      } catch (itemErr: any) {
        failedCount += 1;
        details.push({
          reminderId: String(row.id),
          subjectId,
          ok: false,
          error: itemErr?.message || '處理提醒排程時發生異常'
        });
      }

      if (i < toProcess.length - 1) {
        await delay(550);
      }
    }

    return jsonResponse({
      success: failedCount === 0,
      taipeiDate: clock.dateStr,
      taipeiHour: clock.hourStr,
      taipeiTime: clock.timeStr,
      taipeiDayOfWeek: clock.dayOfWeek,
      matchedCount: matched.length,
      processedCount: toProcess.length,
      sentCount,
      failedCount,
      details
    });
  } catch (err: any) {
    return jsonResponse(
      { success: false, error: err?.message || '執行每日通知排程時發生錯誤。' },
      500
    );
  }
};
