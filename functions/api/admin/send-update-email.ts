// Admin-only Cloudflare Pages Function to send POBI STUDIO update notification emails via Resend.
// Route: POST /api/admin/send-update-email
// Auth: Protected by functions/_middleware.ts (JWT) + admin check (data.user.is_admin === 1).

interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_TEST_FROM?: string;
  RESEND_TEST_TO?: string;
}

interface UserContext {
  user?: { id: string; username: string; is_admin: number };
}

interface RecipientTarget {
  email: string;
  username: string;
}

interface SendResultItem {
  email: string;
  username: string;
  ok: boolean;
  id?: string;
  status?: number;
  error?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(val: string): boolean {
  const trimmed = val.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function sanitizeCtaUrl(raw?: string): string {
  const fallback = 'https://pobinotes-ver3.pages.dev/';
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return fallback;
}

function buildUpdateEmailContent(params: {
  recipientName: string;
  subject: string;
  versionTag: string;
  bodyText: string;
  ctaUrl: string;
  ctaText: string;
}): { html: string; text: string } {
  const lines = params.bodyText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const safeGreetingName = params.recipientName ? escapeHtml(params.recipientName) : '同學';
  const safeSubject = escapeHtml(params.subject);
  const safeVersion = escapeHtml(params.versionTag);
  const safeCtaUrl = escapeHtml(params.ctaUrl);
  const safeCtaText = escapeHtml(params.ctaText);

  const htmlListItems = lines
    .map(line => {
      const cleaned = line.replace(/^[-*•]\s*/, '');
      return `<li style="margin:0 0 10px 0;color:#29251F;font-size:15px;line-height:1.7;">${escapeHtml(cleaned)}</li>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E6;font-family:'Microsoft JhengHei','PingFang TC','Noto Sans TC',sans-serif;color:#29251F;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F0E6;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #DFD5C3;">
          <tr>
            <td style="background-color:#145B38;padding:26px 28px;border-bottom:3px solid #C89A50;">
              <div style="font-size:12px;letter-spacing:0.12em;color:#E8C27A;font-weight:700;text-transform:uppercase;">
                POBI STUDIO | 數位錯題手帳
              </div>
              <h1 style="margin:8px 0 0 0;font-size:22px;line-height:1.4;color:#FFFFFF;font-weight:700;">
                ${safeSubject}
              </h1>
              ${
                safeVersion
                  ? `<div style="display:inline-block;margin-top:10px;padding:3px 10px;border-radius:999px;background-color:rgba(255,255,255,0.14);border:1px solid #C89A50;color:#FBF8F1;font-size:12px;font-weight:700;">${safeVersion}</div>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px;">
              <p style="margin:0 0 14px 0;font-size:15px;color:#29251F;line-height:1.7;">
                ${safeGreetingName} 您好，
              </p>
              <p style="margin:0 0 16px 0;font-size:15px;color:#57534E;line-height:1.7;">
                POBI STUDIO 數位錯題手帳剛剛推出了新的功能與體驗更新，以下是本次重點整理：
              </p>
              <div style="background-color:#FBF8F1;border:1px solid #E6DEC8;border-left:4px solid #C89A50;border-radius:10px;padding:18px 20px;margin:0 0 22px 0;">
                <ul style="margin:0;padding-left:20px;">
                  ${htmlListItems}
                </ul>
              </div>
              <div style="text-align:center;margin:26px 0 10px 0;">
                <a href="${safeCtaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;border-radius:999px;background-color:#D97706;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;">
                  ${safeCtaText}
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FBF8F1;border-top:1px solid #E6DEC8;padding:16px 28px;text-align:center;font-size:12px;color:#81796E;line-height:1.6;">
              POBI STUDIO 數位錯題手帳 · Explore. Decode. Understand.<br />
              官方網址：<a href="${safeCtaUrl}" style="color:#145B38;text-decoration:underline;">${safeCtaUrl}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `POBI STUDIO｜數位錯題手帳${params.versionTag ? `（${params.versionTag}）` : ''}`,
    params.subject,
    '',
    `${params.recipientName || '同學'} 您好，`,
    '',
    'POBI STUDIO 數位錯題手帳本次更新重點如下：',
    ...lines.map(l => `- ${l.replace(/^[-*•]\s*/, '')}`),
    '',
    `${params.ctaText}：${params.ctaUrl}`
  ];

  return { html, text: textLines.join('\n') };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const onRequestPost: PagesFunction<Env, any, UserContext> = async context => {
  try {
    const { request, env, data } = context;

    // 1. Admin-only authentication check
    if (!data || !data.user) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please login.' }, 401);
    }
    if (data.user.is_admin !== 1) {
      return jsonResponse({ success: false, error: 'Forbidden. Admin access required.' }, 403);
    }

    // 2. Validate Resend environment variables (no hardcoded credentials or emails)
    const apiKey = typeof env.RESEND_API_KEY === 'string' ? env.RESEND_API_KEY.trim() : '';
    const fromEmail =
      (typeof env.RESEND_FROM_EMAIL === 'string' && env.RESEND_FROM_EMAIL.trim()) ||
      (typeof env.RESEND_TEST_FROM === 'string' && env.RESEND_TEST_FROM.trim()) ||
      '';

    const missingVars: string[] = [];
    if (!apiKey) missingVars.push('RESEND_API_KEY');
    if (!fromEmail) missingVars.push('RESEND_FROM_EMAIL（或 RESEND_TEST_FROM）');
    if (missingVars.length > 0) {
      return jsonResponse(
        {
          success: false,
          error: `尚未設定必要環境變數：${missingVars.join('、')}。請先於 Cloudflare Pages 設定後再寄送。`
        },
        500
      );
    }

    // 3. Parse & validate request payload
    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: '請求格式錯誤，請傳送有效 JSON。' }, 400);
    }

    const mode: 'test' | 'selected' | 'all' =
      body?.mode === 'selected' || body?.mode === 'all' ? body.mode : 'test';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const versionTag = typeof body?.versionTag === 'string' ? body.versionTag.trim() : '';
    const bodyText = typeof body?.body === 'string' ? body.body.trim() : '';
    const ctaUrl = sanitizeCtaUrl(body?.ctaUrl);
    const ctaText =
      typeof body?.ctaText === 'string' && body.ctaText.trim()
        ? body.ctaText.trim()
        : '立即開啟 POBI STUDIO 體驗新版';

    if (!subject) {
      return jsonResponse({ success: false, error: '請填寫通知信主旨。' }, 400);
    }
    if (!bodyText) {
      return jsonResponse({ success: false, error: '請填寫更新通知內容。' }, 400);
    }

    // 4. Resolve target recipients
    const recipients: RecipientTarget[] = [];
    const seenEmails = new Set<string>();

    if (mode === 'test') {
      const targetEmail =
        (typeof body?.testEmail === 'string' && body.testEmail.trim()) ||
        (typeof env.RESEND_TEST_TO === 'string' && env.RESEND_TEST_TO.trim()) ||
        '';
      if (!targetEmail || !isValidEmail(targetEmail)) {
        return jsonResponse(
          {
            success: false,
            error: '請輸入有效的測試收件信箱（或設定環境變數 RESEND_TEST_TO）。'
          },
          400
        );
      }
      recipients.push({ email: targetEmail, username: data.user.username || '管理員' });
    } else {
      const dbUsersRes = await env.DB.prepare(
        `SELECT id, username, email FROM users WHERE email IS NOT NULL AND TRIM(email) != '' ORDER BY created_at DESC`
      ).all();
      const dbUsers = (dbUsersRes.results || []) as Array<{ id: string; username: string; email: string }>;

      const selectedIdSet =
        mode === 'selected' && Array.isArray(body?.recipientUserIds)
          ? new Set(body.recipientUserIds.map((x: unknown) => String(x)))
          : null;

      for (const u of dbUsers) {
        if (selectedIdSet && !selectedIdSet.has(u.id)) continue;
        const emailClean = String(u.email || '').trim();
        if (!isValidEmail(emailClean)) continue;
        const key = emailClean.toLowerCase();
        if (seenEmails.has(key)) continue;
        seenEmails.add(key);
        recipients.push({ email: emailClean, username: u.username || '用戶' });
      }

      if (recipients.length === 0) {
        return jsonResponse(
          {
            success: false,
            error:
              mode === 'selected'
                ? '請至少勾選一位已綁定有效信箱的用戶。'
                : '目前資料庫中沒有已綁定有效信箱的用戶可寄送。'
          },
          400
        );
      }
    }

    // Cap single request batch size to stay safely within Cloudflare Pages Function execution budget
    const MAX_BATCH = 40;
    if (recipients.length > MAX_BATCH) {
      return jsonResponse(
        {
          success: false,
          error: `單次最多寄送 ${MAX_BATCH} 位收件者（目前選擇 ${recipients.length} 位），請改用「指定用戶」分批寄送。`
        },
        400
      );
    }

    // 5. Send via Resend API sequentially with safe rate-limit pacing
    const results: SendResultItem[] = [];
    for (let i = 0; i < recipients.length; i++) {
      const target = recipients[i];
      const { html, text } = buildUpdateEmailContent({
        recipientName: target.username,
        subject,
        versionTag,
        bodyText,
        ctaUrl,
        ctaText
      });

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [target.email],
            subject,
            text,
            html
          })
        });

        const rawText = await res.text();
        let parsed: any = null;
        try {
          parsed = rawText ? JSON.parse(rawText) : null;
        } catch {
          parsed = { raw: rawText };
        }

        if (res.ok) {
          results.push({
            email: target.email,
            username: target.username,
            ok: true,
            id: parsed?.id
          });
        } else {
          results.push({
            email: target.email,
            username: target.username,
            ok: false,
            status: res.status,
            error: parsed?.message || parsed?.error || `HTTP ${res.status}`
          });
        }
      } catch (sendErr: any) {
        results.push({
          email: target.email,
          username: target.username,
          ok: false,
          error: sendErr?.message || '網路呼叫異常'
        });
      }

      // Pace consecutive requests to respect Resend 2 req/s free-tier rate limit
      if (i < recipients.length - 1) {
        await delay(550);
      }
    }

    const sentCount = results.filter(r => r.ok).length;
    const failedCount = results.length - sentCount;

    return jsonResponse(
      {
        success: sentCount > 0 && failedCount === 0,
        partial: sentCount > 0 && failedCount > 0,
        mode,
        total: results.length,
        sentCount,
        failedCount,
        results
      },
      sentCount > 0 ? 200 : 502
    );
  } catch (err: any) {
    return jsonResponse(
      {
        success: false,
        error: err?.message || '寄送更新通知信時發生未預期錯誤。'
      },
      500
    );
  }
};
