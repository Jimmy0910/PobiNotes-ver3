// Shared server-side helpers for POBI STUDIO Daily Gmail Review Reminders.
// Pure Cloudflare Pages Functions compatible (no Node.js built-ins, no hardcoded emails).

export type CanonicalFamiliarityKey = '不會' | '卡' | '誤解' | '順';

export interface FamiliaritySchedule {
  不會: number | null;
  卡: number | null;
  誤解: number | null;
  順: number | null;
}

export interface DailyReminderConfig {
  subjectId: string;
  enabled: boolean;
  scopeKeys: string[];
  schedule: FamiliaritySchedule;
  sendTime: string; // HH:00 in Asia/Taipei (UTC+8)
  daysOfWeek: number[]; // 0 (Sun) .. 6 (Sat)
  timezone: string;
  lastSentDate: string | null;
  updatedAt: number | null;
}

export interface DueMistakeSummaryItem {
  id: string;
  title: string;
  chapterName: string;
  unitName: string;
  familiarityName: string;
  nextReviewDate: string;
}

export interface SubjectDueEvaluation {
  subjectName: string;
  totalInScope: number;
  dueMistakes: DueMistakeSummaryItem[];
}

export interface ResendEnv {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_TEST_FROM?: string;
}

export const GMAIL_ONLY_ERROR_MESSAGE = '開通Gmail帳號才能使用喔!!!';

export const DEFAULT_FAMILIARITY_SCHEDULE: FamiliaritySchedule = {
  不會: 1,
  卡: 3,
  誤解: 5,
  順: 14
};

export const DEFAULT_DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

export function isValidEmail(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeFamiliarityKey(familiarityName?: string | null): CanonicalFamiliarityKey {
  const name = (familiarityName || '').trim();
  if (name.includes('順') || name.includes('精熟') || name.includes('掌握') || name === '會') {
    return '順';
  }
  if (name.includes('誤解')) {
    return '誤解';
  }
  if (name.includes('卡') || name.includes('稍微')) {
    return '卡';
  }
  return '不會';
}

function sanitizeDaysValue(val: unknown, fallback: number | null): number | null {
  if (val === null || val === 'never' || val === 'NEVER') return null;
  const num = Number(val);
  if (Number.isFinite(num) && num >= 1 && num <= 3650) {
    return Math.round(num);
  }
  return fallback;
}

export function sanitizeSchedule(raw: unknown): FamiliaritySchedule {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_FAMILIARITY_SCHEDULE };
  }
  const obj = raw as Record<string, unknown>;
  return {
    不會: sanitizeDaysValue(obj['不會'], DEFAULT_FAMILIARITY_SCHEDULE['不會']),
    卡: sanitizeDaysValue(obj['卡'], DEFAULT_FAMILIARITY_SCHEDULE['卡']),
    誤解: sanitizeDaysValue(obj['誤解'], DEFAULT_FAMILIARITY_SCHEDULE['誤解']),
    順: sanitizeDaysValue(obj['順'], DEFAULT_FAMILIARITY_SCHEDULE['順'])
  };
}

export function sanitizeScopeKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ['__ALL__'];
  const cleaned = raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0 && x.trim().length <= 160)
    .map(x => x.trim());
  const unique = Array.from(new Set(cleaned));
  if (unique.length === 0) return [];
  if (unique.includes('__ALL__')) return ['__ALL__'];
  return unique.slice(0, 300);
}

export function sanitizeSendTime(raw: unknown): string {
  if (typeof raw !== 'string') return '20:00';
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '20:00';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return '20:00';
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return '20:00';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function sanitizeDaysOfWeek(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [...DEFAULT_DAYS_OF_WEEK];
  const valid = raw
    .map(v => Number(v))
    .filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
  const unique = Array.from(new Set(valid)).sort((a, b) => a - b);
  return unique.length > 0 ? unique : [...DEFAULT_DAYS_OF_WEEK];
}

export function getTaipeiClock(now = new Date()): {
  dateStr: string;
  hourStr: string;
  timeStr: string;
  dayOfWeek: number;
} {
  // Asia/Taipei is permanently UTC+8 (no daylight saving time)
  const taipeiMs = now.getTime() + 8 * 60 * 60 * 1000;
  const d = new Date(taipeiMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hour = String(d.getUTCHours()).padStart(2, '0');
  const minute = String(d.getUTCMinutes()).padStart(2, '0');
  return {
    dateStr: `${year}-${month}-${day}`,
    hourStr: hour,
    timeStr: `${hour}:${minute}`,
    dayOfWeek: d.getUTCDay()
  };
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const baseMs =
    parts.length === 3 && parts.every(Number.isFinite)
      ? Date.UTC(parts[0], parts[1] - 1, parts[2])
      : Date.now() + 8 * 60 * 60 * 1000;
  const d = new Date(baseMs + days * 24 * 60 * 60 * 1000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseReminderRow(row: any, subjectId: string): DailyReminderConfig {
  if (!row) {
    return {
      subjectId,
      enabled: false,
      scopeKeys: ['__ALL__'],
      schedule: { ...DEFAULT_FAMILIARITY_SCHEDULE },
      sendTime: '20:00',
      daysOfWeek: [...DEFAULT_DAYS_OF_WEEK],
      timezone: 'Asia/Taipei',
      lastSentDate: null,
      updatedAt: null
    };
  }
  let parsedScope: unknown = ['__ALL__'];
  let parsedSchedule: unknown = DEFAULT_FAMILIARITY_SCHEDULE;
  let parsedDays: unknown = DEFAULT_DAYS_OF_WEEK;
  try {
    parsedScope = row.scope_keys_json ? JSON.parse(row.scope_keys_json) : ['__ALL__'];
  } catch {}
  try {
    parsedSchedule = row.schedule_json ? JSON.parse(row.schedule_json) : DEFAULT_FAMILIARITY_SCHEDULE;
  } catch {}
  try {
    parsedDays = row.days_of_week_json ? JSON.parse(row.days_of_week_json) : DEFAULT_DAYS_OF_WEEK;
  } catch {}

  return {
    subjectId: row.subject_id || subjectId,
    enabled: Number(row.enabled) === 1,
    scopeKeys: sanitizeScopeKeys(parsedScope),
    schedule: sanitizeSchedule(parsedSchedule),
    sendTime: sanitizeSendTime(row.send_time),
    daysOfWeek: sanitizeDaysOfWeek(parsedDays),
    timezone: typeof row.timezone === 'string' && row.timezone.trim() ? row.timezone.trim() : 'Asia/Taipei',
    lastSentDate: typeof row.last_sent_date === 'string' && row.last_sent_date ? row.last_sent_date : null,
    updatedAt: typeof row.updated_at === 'number' ? row.updated_at : null
  };
}

export async function getUserGmailEligibility(
  db: D1Database,
  userId: string
): Promise<{ eligible: boolean; authProvider: string; email: string | null; username: string }> {
  const row = await db
    .prepare('SELECT username, email, auth_provider FROM users WHERE id = ?')
    .bind(userId)
    .first() as { username?: string; email?: string | null; auth_provider?: string | null } | null;

  const username = row?.username ? String(row.username) : '同學';
  const authProvider =
    typeof row?.auth_provider === 'string' && row.auth_provider.trim()
      ? row.auth_provider.trim()
      : 'local';
  const email =
    typeof row?.email === 'string' && row.email.trim() ? row.email.trim() : null;
  const eligible = authProvider === 'google' && isValidEmail(email);

  return { eligible, authProvider, email, username };
}

function extractFamiliarityFromDataJson(dataObj: any): string | null {
  if (!dataObj || typeof dataObj !== 'object') return null;
  const valid = new Set(['順', '卡', '不會', '誤解', '會']);
  const matchVal = (v: unknown): string | null => {
    if (typeof v === 'string' && valid.has(v.trim())) {
      return v.trim() === '會' ? '順' : v.trim();
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string' && valid.has(item.trim())) {
          return item.trim() === '會' ? '順' : item.trim();
        }
      }
    }
    if (v && typeof v === 'object' && typeof (v as any).value === 'string') {
      const s = String((v as any).value).trim();
      if (valid.has(s)) return s === '會' ? '順' : s;
    }
    return null;
  };

  const sections = [dataObj.answerData, dataObj.questionData, dataObj];
  for (const sec of sections) {
    if (sec && typeof sec === 'object') {
      for (const [k, v] of Object.entries(sec)) {
        const kLower = k.toLowerCase();
        if (
          kLower.includes('mastery') ||
          kLower.includes('fam') ||
          k.includes('掌握') ||
          k.includes('熟悉') ||
          k.includes('難易')
        ) {
          const matched = matchVal(v);
          if (matched) return matched;
        }
      }
    }
  }
  return null;
}

export async function evaluateSubjectDueMistakes(
  db: D1Database,
  userId: string,
  subjectId: string,
  scopeKeys: string[],
  schedule: FamiliaritySchedule,
  todayStr: string
): Promise<SubjectDueEvaluation> {
  const subjectRow = await db
    .prepare('SELECT id, name FROM subjects WHERE id = ? AND user_id = ?')
    .bind(subjectId, userId)
    .first() as { id: string; name: string } | null;

  const subjectName = subjectRow?.name || '未命名科目';

  // Fetch chapters & units for this subject to accurately interpret scopeKeys
  const [chaptersRes, unitsRes, mistakesRes] = await Promise.all([
    db
      .prepare('SELECT id, name FROM chapters WHERE subject_id = ?')
      .bind(subjectId)
      .all(),
    db
      .prepare(
        `SELECT u.id, u.chapter_id, u.name
         FROM units u
         INNER JOIN chapters c ON u.chapter_id = c.id
         WHERE c.subject_id = ?`
      )
      .bind(subjectId)
      .all(),
    db
      .prepare(
        `SELECT
           m.id,
           m.title,
           m.chapter_id,
           m.unit_id,
           m.mistake_date,
           m.data,
           m.created_at,
           c.name AS chapter_name,
           u.name AS unit_name,
           f.name AS familiarity_name
         FROM mistakes m
         LEFT JOIN chapters c ON m.chapter_id = c.id
         LEFT JOIN units u ON m.unit_id = u.id
         LEFT JOIN categories f ON m.familiarity_id = f.id
         WHERE (m.user_id = ? OR c.subject_id = ?)
           AND COALESCE(m.subject_id, c.subject_id) = ?
         ORDER BY m.created_at DESC`
      )
      .bind(userId, subjectId, subjectId)
      .all()
  ]);

  const validChapterIds = new Set((chaptersRes.results || []).map((c: any) => String(c.id)));
  const chapterUnitsMap = new Map<string, Set<string>>();
  for (const u of (unitsRes.results || []) as any[]) {
    const cid = String(u.chapter_id);
    if (!chapterUnitsMap.has(cid)) {
      chapterUnitsMap.set(cid, new Set());
    }
    chapterUnitsMap.get(cid)!.add(String(u.id));
  }

  const selectAll = scopeKeys.includes('__ALL__');
  const scopeSet = new Set(scopeKeys);

  const isInScope = (row: any): boolean => {
    if (selectAll) return true;
    if (scopeSet.size === 0) return false;

    const cid = row.chapter_id ? String(row.chapter_id) : '';
    const uid = row.unit_id ? String(row.unit_id) : '';

    if (!cid || !validChapterIds.has(cid)) {
      return scopeSet.has('uncategorized');
    }

    const unitsForChap = chapterUnitsMap.get(cid);
    if (!unitsForChap || unitsForChap.size === 0) {
      return scopeSet.has(`chap:${cid}`);
    }

    if (uid && unitsForChap.has(uid)) {
      return scopeSet.has(`unit:${uid}`) || scopeSet.has(`chap:${cid}`);
    }
    return scopeSet.has(`chap_direct:${cid}`) || scopeSet.has(`chap:${cid}`);
  };

  let totalInScope = 0;
  const dueMistakes: DueMistakeSummaryItem[] = [];

  for (const row of (mistakesRes.results || []) as any[]) {
    if (!isInScope(row)) continue;
    totalInScope += 1;

    let parsedData: any = {};
    try {
      parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
    } catch {
      parsedData = {};
    }

    const rawFamName = row.familiarity_name || extractFamiliarityFromDataJson(parsedData) || '不會';
    const famKey = normalizeFamiliarityKey(rawFamName);
    const interval = schedule[famKey];
    if (interval === null) continue;

    const existingMeta = parsedData?.reviewMeta;
    let nextReviewDate: string;
    if (existingMeta && typeof existingMeta.nextReviewDate === 'string' && existingMeta.nextReviewDate !== 'NEVER') {
      nextReviewDate = existingMeta.nextReviewDate;
    } else if (existingMeta && existingMeta.nextReviewDate === 'NEVER') {
      continue;
    } else {
      const fallbackDate =
        typeof row.mistake_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.mistake_date)
          ? row.mistake_date
          : new Date(Number(row.created_at) || Date.now()).toISOString().slice(0, 10);
      nextReviewDate = addDaysToDateStr(fallbackDate, interval);
    }

    if (nextReviewDate <= todayStr) {
      dueMistakes.push({
        id: String(row.id),
        title: String(row.title || '未命名錯題').trim() || '未命名錯題',
        chapterName: row.chapter_name ? String(row.chapter_name) : '未分類章節',
        unitName: row.unit_name ? String(row.unit_name) : '',
        familiarityName: famKey,
        nextReviewDate
      });
    }
  }

  return {
    subjectName,
    totalInScope,
    dueMistakes
  };
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export function formatDaysOfWeekSummary(daysOfWeek: number[]): string {
  const sorted = sanitizeDaysOfWeek(daysOfWeek);
  if (sorted.length === 7) return '每天';
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') return '僅平日（週一至週五）';
  return `每週${sorted.map(d => WEEKDAY_LABELS[d] || '').join('、')}`;
}

export function formatScheduleSummary(schedule: FamiliaritySchedule): string {
  const keys: CanonicalFamiliarityKey[] = ['不會', '卡', '誤解', '順'];
  return keys
    .map(k => `${k} ${schedule[k] === null ? '不再複習' : `${schedule[k]} 天`}`)
    .join(' · ');
}

export function buildDailyReminderEmail(params: {
  recipientName: string;
  subjectName: string;
  todayStr: string;
  totalInScope: number;
  dueMistakes: DueMistakeSummaryItem[];
  schedule: FamiliaritySchedule;
  sendTime: string;
  daysOfWeek: number[];
  isTestPreview?: boolean;
}): { subject: string; html: string; text: string } {
  const appUrl = 'https://pobinotes-ver3.pages.dev/';
  const dueCount = params.dueMistakes.length;
  const previewPrefix = params.isTestPreview ? '[測試預覽] ' : '';
  const emailSubject =
    dueCount > 0
      ? `${previewPrefix}POBI 每日複習提醒：《${params.subjectName}》今日有 ${dueCount} 題待複習`
      : `${previewPrefix}POBI 每日複習提醒：《${params.subjectName}》今日無到期錯題`;

  const safeName = escapeHtml(params.recipientName || '同學');
  const safeSubjectName = escapeHtml(params.subjectName);
  const safeScheduleText = escapeHtml(formatScheduleSummary(params.schedule));
  const safeDaysText = escapeHtml(formatDaysOfWeekSummary(params.daysOfWeek));
  const safeSendTime = escapeHtml(params.sendTime);
  const safeToday = escapeHtml(params.todayStr);

  const previewList = params.dueMistakes.slice(0, 8);
  const moreCount = Math.max(0, dueCount - previewList.length);

  const listHtml =
    dueCount > 0
      ? `
        <div style="background-color:#FBF8F1;border:1px solid #E6DEC8;border-left:4px solid #D97706;border-radius:10px;padding:16px 18px;margin:0 0 20px 0;">
          <div style="font-size:13px;font-weight:700;color:#92400E;margin-bottom:10px;">
            今日到期題目清單（顯示前 ${previewList.length} 題${moreCount > 0 ? `，另有 ${moreCount} 題` : ''}）
          </div>
          <ul style="margin:0;padding-left:18px;">
            ${previewList
              .map(item => {
                const loc = item.unitName
                  ? `${item.chapterName} / ${item.unitName}`
                  : item.chapterName;
                return `<li style="margin:0 0 8px 0;color:#29251F;font-size:14px;line-height:1.6;">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span style="color:#78716C;font-size:12px;">（${escapeHtml(loc)} · 熟悉度：${escapeHtml(item.familiarityName)}）</span>
                </li>`;
              })
              .join('')}
          </ul>
        </div>
      `
      : `
        <div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-left:4px solid #145B38;border-radius:10px;padding:16px 18px;margin:0 0 20px 0;color:#14532D;font-size:14px;line-height:1.7;">
          目前《${safeSubjectName}》所選範圍（共 ${params.totalInScope} 題）今日沒有到期的錯題，進度保持得很好！您仍可隨時回到錯題本自由重練已選章節。
        </div>
      `;

  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(emailSubject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E6;font-family:'Microsoft JhengHei','PingFang TC','Noto Sans TC',sans-serif;color:#29251F;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F0E6;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #DFD5C3;">
          <tr>
            <td style="background-color:#145B38;padding:24px 28px;border-bottom:3px solid #C89A50;">
              <div style="font-size:12px;letter-spacing:0.12em;color:#E8C27A;font-weight:700;text-transform:uppercase;">
                POBI STUDIO | 每日 GMAIL 複習通知
              </div>
              <h1 style="margin:8px 0 0 0;font-size:21px;line-height:1.4;color:#FFFFFF;font-weight:700;">
                《${safeSubjectName}》今日到期複習：${dueCount} 題
              </h1>
              <div style="margin-top:8px;font-size:12px;color:#E7E5E4;">
                日期：${safeToday} · 範圍總題數：${params.totalInScope} 題${params.isTestPreview ? ' · 測試預覽信' : ''}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 14px 0;font-size:15px;color:#29251F;line-height:1.7;">
                ${safeName} 您好，
              </p>
              <p style="margin:0 0 18px 0;font-size:14px;color:#57534E;line-height:1.7;">
                這是您的 POBI STUDIO 每日複習提醒。把握黃金記憶週期，花幾分鐘完成今天的閃卡自測吧。
              </p>
              ${listHtml}
              <div style="background-color:#FAF8F4;border:1px solid #E6DEC8;border-radius:10px;padding:12px 16px;margin:0 0 22px 0;font-size:12px;color:#57534E;line-height:1.7;">
                <div><strong>目前熟悉度週期：</strong>${safeScheduleText}</div>
                <div><strong>自動寄信時程：</strong>${safeDaysText} ${safeSendTime}（台灣時間 UTC+8）</div>
              </div>
              <div style="text-align:center;margin:22px 0 8px 0;">
                <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;border-radius:999px;background-color:#D97706;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;">
                  立即開啟 POBI 每日複習
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FBF8F1;border-top:1px solid #E6DEC8;padding:16px 28px;text-align:center;font-size:12px;color:#81796E;line-height:1.6;">
              POBI STUDIO 數位錯題手帳 · 如欲調整範圍或關閉通知，請至左側面板「每日複習 &gt; GMAIL 每日通知」修改設定。<br />
              官方網址：<a href="${appUrl}" style="color:#145B38;text-decoration:underline;">${appUrl}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `POBI STUDIO｜每日 GMAIL 複習通知（${params.todayStr}）`,
    `科目：《${params.subjectName}》`,
    `今日到期複習：${dueCount} 題（所選範圍共 ${params.totalInScope} 題）`,
    '',
    `${params.recipientName || '同學'} 您好，`,
    '',
    ...(dueCount > 0
      ? [
          '今日到期題目清單：',
          ...previewList.map(
            item =>
              `- ${item.title}（${item.unitName ? `${item.chapterName}/${item.unitName}` : item.chapterName} · ${item.familiarityName}）`
          ),
          ...(moreCount > 0 ? [`...另有 ${moreCount} 題`] : [])
        ]
      : ['目前所選範圍內今日無到期錯題，進度維持得很好！']),
    '',
    `目前熟悉度週期：${formatScheduleSummary(params.schedule)}`,
    `自動寄信時程：${formatDaysOfWeekSummary(params.daysOfWeek)} ${params.sendTime}（UTC+8）`,
    '',
    `立即開啟每日複習：${appUrl}`
  ];

  return {
    subject: emailSubject,
    html,
    text: textLines.join('\n')
  };
}

export async function sendResendEmail(
  env: ResendEnv,
  toEmail: string,
  subject: string,
  html: string,
  text: string
): Promise<{ ok: boolean; status: number; id?: string; error?: string }> {
  const apiKey = typeof env.RESEND_API_KEY === 'string' ? env.RESEND_API_KEY.trim() : '';
  const fromEmail =
    (typeof env.RESEND_FROM_EMAIL === 'string' && env.RESEND_FROM_EMAIL.trim()) ||
    (typeof env.RESEND_TEST_FROM === 'string' && env.RESEND_TEST_FROM.trim()) ||
    '';

  const missing: string[] = [];
  if (!apiKey) missing.push('RESEND_API_KEY');
  if (!fromEmail) missing.push('RESEND_FROM_EMAIL（或 RESEND_TEST_FROM）');
  if (missing.length > 0) {
    return {
      ok: false,
      status: 500,
      error: `伺服器尚未設定必要環境變數：${missing.join('、')}。`
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        html,
        text
      })
    });

    const rawText = await res.text();
    let parsed: any = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = { raw: rawText };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: parsed?.message || parsed?.error || `Resend HTTP ${res.status}`
      };
    }

    return {
      ok: true,
      status: res.status,
      id: parsed?.id
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 502,
      error: err?.message || '呼叫 Resend Email API 時發生網路錯誤。'
    };
  }
}
