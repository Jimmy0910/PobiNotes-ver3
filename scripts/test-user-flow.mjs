import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startFlow } from 'lighthouse';

const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer'));

const distDir = path.resolve(process.cwd(), 'dist');
const lhciDir = path.resolve(process.cwd(), '.lighthouseci');
if (!fs.existsSync(lhciDir)) {
  fs.mkdirSync(lhciDir, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
};

function startStaticServer(port = 4188) {
  const server = http.createServer((req, res) => {
    const reqPath = (req.url || '/').split('?')[0];
    if (reqPath === '/api/auth/me') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, user: null }));
      return;
    }
    if (reqPath.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }
    let filePath = path.join(distDir, reqPath === '/' ? 'index.html' : reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function clickActionAndMeasure(page, { label, selector, buttonText, checkBodyText }) {
  const res = await page.evaluate(
    async ({ sel, btnText, expectedText }) => {
      let target = sel ? document.querySelector(sel) : null;
      if (!target && btnText) {
        const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], .notebook-cover-card'));
        target = candidates.find((el) => (el.textContent || '').includes(btnText));
      }
      if (!target) {
        return { error: `找不到目標按鈕 (${sel || btnText})` };
      }

      const t0 = performance.now();
      target.click();

      let sawLoader = false;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const bodyText = document.body.innerText || '';
        if (bodyText.includes('載入錯題本中...')) {
          sawLoader = true;
        }
        if (bodyText.includes(expectedText)) {
          return { ms: Number((performance.now() - t0).toFixed(1)), sawLoader };
        }
      }
      return { ms: Number((performance.now() - t0).toFixed(1)), sawLoader, timeout: true };
    },
    { sel: selector || null, btnText: buttonText || null, expectedText: checkBodyText }
  );

  return { label, ...res };
}

const server = await startStaticServer(4188);
const url = 'http://127.0.0.1:4188/';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

try {
  // Part 1: Real-world Click-to-Render Latency Benchmark (after opening intro background preload)
  const benchPage = await browser.newPage();
  await benchPage.setViewport({ width: 1280, height: 800 });
  await benchPage.goto(url, { waitUntil: 'networkidle0' });

  // Trigger natural pointer move during intro so staggered micro-batch preloading runs
  await benchPage.mouse.move(240, 240);
  await new Promise((r) => setTimeout(r, 1400));

  // Skip remaining intro frame if present
  await benchPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const skip = btns.find((b) => (b.textContent || '').includes('略過開場'));
    if (skip) skip.click();
  });
  await new Promise((r) => setTimeout(r, 120));

  const actionPlan = [
    { label: '首頁 -> 登入頁 (AuthPage)', buttonText: '登入', checkBodyText: '返回首頁' },
    { label: '登入頁 -> 返回首頁 (LandingPage)', buttonText: '返回首頁', checkBodyText: '免註冊體驗 Demo' },
    { label: '首頁 -> 免註冊體驗 Demo (BookshelfView)', buttonText: '免註冊體驗 Demo', checkBodyText: '我的數位書架' },
    { label: '數位書架 -> 打開科目錯題手帳 (NotebookOpenView)', buttonText: '數學', checkBodyText: '返回書架' },
    { label: '側邊欄 -> 每日複習 (DailyReviewHubView)', selector: '[data-testid="nav-daily-review"]', checkBodyText: '每日複習' },
    { label: '側邊欄 -> 未分類區 (UncategorizedView)', selector: '[data-testid="nav-uncategorized"]', checkBodyText: '未分類區' },
    { label: '側邊欄 -> AI 提詞管理 (PromptGenerator)', selector: '[data-testid="nav-prompt"]', checkBodyText: 'AI 提詞管理' },
    { label: '側邊欄 -> 模板管理 (TemplateManager)', selector: '[data-testid="nav-templates"]', checkBodyText: '模板管理' },
    { label: '側邊欄 -> 使用導引 (UsageGuide)', selector: '[data-testid="nav-guide"]', checkBodyText: '使用說明與導引' },
    { label: '側邊欄 -> 返回我的數位書架 (BookshelfView)', selector: '[data-testid="nav-bookshelf"]', checkBodyText: '我的數位書架' },
  ];

  const results = [];
  for (const act of actionPlan) {
    results.push(await clickActionAndMeasure(benchPage, act));
    await new Promise((r) => setTimeout(r, 60));
  }
  await benchPage.close();

  // Part 2: Official Lighthouse User Flow (Navigation + Timespan + Snapshot)
  const flowPage = await browser.newPage();
  const flow = await startFlow(flowPage, {
    name: 'POBI STUDIO 頁面載入與按鈕點擊互動流程測試 (Lighthouse User Flow)',
    configContext: {
      settingsOverrides: {
        throttlingMethod: 'simulate',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75,
          disabled: false,
        },
        formFactor: 'mobile',
      },
    },
  });

  console.log('1. [Lighthouse Navigation] 測試首頁首次載入...');
  await flow.navigate(url, { name: '1. 首頁首次載入 (Navigation)' });

  // Trigger natural pointer move & allow staggered micro-batch preload to complete before clicking buttons
  await flowPage.mouse.move(180, 220);
  await new Promise((r) => setTimeout(r, 1400));

  console.log('2. [Lighthouse Timespan] 錄製連續點擊核心按鈕互動流程...');
  await flow.startTimespan({ name: '2. 連續點擊核心功能按鈕 (Timespan 互動測試)' });

  await flowPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const skip = btns.find((b) => (b.textContent || '').includes('略過開場'));
    if (skip) skip.click();
  });
  await new Promise((r) => setTimeout(r, 60));

  for (const act of actionPlan) {
    await clickActionAndMeasure(flowPage, act);
  }

  await flow.endTimespan();

  console.log('3. [Lighthouse Snapshot] 檢測互動後應用程式畫面狀態...');
  await flow.snapshot({ name: '3. 數位書架互動後快照 (Snapshot)' });

  const flowReportHtml = await flow.generateReport();
  const flowReportJson = await flow.createFlowResult();

  const flowHtmlPath = path.join(lhciDir, 'user-flow-report.html');
  const flowNamedPath = path.join(lhciDir, '20261126網頁測試報告-互動流程.html');
  fs.writeFileSync(flowHtmlPath, flowReportHtml, 'utf8');
  fs.writeFileSync(flowNamedPath, flowReportHtml, 'utf8');

  console.log('\n============================================================');
  console.log('  POBI STUDIO 核心按鈕點擊反應時間實測結果 (Click-to-Render)');
  console.log('============================================================');
  for (const r of results) {
    const status = r.error || r.timeout ? '[FAIL]' : r.ms <= 80 ? '[PASS]' : '[WARN]';
    const loaderNote = r.sawLoader ? ' (出現載入畫面!)' : ' (0 載入閃爍)';
    console.log(`${status} ${r.label}: ${r.ms ?? 'N/A'} ms${loaderNote}`);
  }
  console.log('------------------------------------------------------------');
  for (const step of flowReportJson.steps) {
    const cats = Object.entries(step.lhr.categories)
      .map(([k, v]) => `${k}: ${v.score !== null ? Math.round(v.score * 100) : 'N/A'}`)
      .join(', ');
    const tbt = step.lhr.audits['total-blocking-time']?.displayValue || '-';
    const inp = step.lhr.audits['interaction-to-next-paint']?.displayValue || '-';
    console.log(`[Flow Step] ${step.name} => ${cats} | TBT: ${tbt} | INP: ${inp}`);
  }
  console.log('============================================================');
  console.log(`Lighthouse User Flow 報告已儲存至: ${flowNamedPath}`);
} finally {
  await browser.close();
  server.close();
}
