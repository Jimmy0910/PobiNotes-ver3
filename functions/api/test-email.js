// Temporary Cloudflare Pages Function for testing Resend Email API connectivity.
// Route: POST /api/test-email
// Auth: Protected by functions/_middleware.ts (JWT) + existing admin check (data.user.is_admin === 1).

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestPost(context) {
  try {
    const { env, data } = context;

    // 1. Reuse existing authentication & admin authorization from functions/_middleware.ts
    if (!data || !data.user) {
      return jsonResponse(
        {
          success: false,
          error: 'Unauthorized. Please login.'
        },
        401
      );
    }

    if (data.user.is_admin !== 1) {
      return jsonResponse(
        {
          success: false,
          error: 'Forbidden. Admin access required.'
        },
        403
      );
    }

    // 2. Read Resend API key & test addresses strictly from Cloudflare Pages environment variables
    const apiKey = typeof env?.RESEND_API_KEY === 'string' ? env.RESEND_API_KEY.trim() : '';
    const testFrom = typeof env?.RESEND_TEST_FROM === 'string' ? env.RESEND_TEST_FROM.trim() : '';
    const testTo = typeof env?.RESEND_TEST_TO === 'string' ? env.RESEND_TEST_TO.trim() : '';

    const missingVars = [];
    if (!apiKey) missingVars.push('RESEND_API_KEY');
    if (!testFrom) missingVars.push('RESEND_TEST_FROM');
    if (!testTo) missingVars.push('RESEND_TEST_TO');

    if (missingVars.length > 0) {
      return jsonResponse(
        {
          success: false,
          error: `尚未設定必要環境變數：${missingVars.join('、')}。請先於 Cloudflare Pages 環境變數（Production / Preview）或本機 .dev.vars 設定後再重試。`
        },
        500
      );
    }

    // 3. Call Resend REST API directly via fetch (no extra packages)
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: testFrom,
        to: [testTo],
        subject: '錯題本 Email API 測試',
        text: 'Cloudflare Pages 已成功連接 Resend。',
        html: '<p>Cloudflare Pages 已成功連接 Resend。</p>'
      })
    });

    const rawText = await resendRes.text();
    let resendResult = null;
    try {
      resendResult = rawText ? JSON.parse(rawText) : null;
    } catch {
      resendResult = { raw: rawText };
    }

    if (!resendRes.ok) {
      const upstreamStatus = resendRes.status >= 400 && resendRes.status < 600 ? resendRes.status : 502;
      const errMessage =
        (resendResult && (resendResult.message || resendResult.error)) ||
        `Resend API 呼叫失敗（HTTP ${resendRes.status}）`;
      return jsonResponse(
        {
          success: false,
          error: errMessage,
          status: resendRes.status,
          result: resendResult
        },
        upstreamStatus
      );
    }

    return jsonResponse(
      {
        success: true,
        result: resendResult
      },
      200
    );
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        error: err instanceof Error ? err.message : '呼叫 Resend Email API 時發生未預期錯誤。'
      },
      500
    );
  }
}
