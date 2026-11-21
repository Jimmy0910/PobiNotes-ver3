import { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Printer,
  RotateCcw,
  ArrowRight,
  Play,
  Share2,
  CheckCircle2,
  Copy,
  Check,
  Flame,
  Inbox,
  Sun,
  Moon
} from 'lucide-react';
import { useUiFeedback } from './UiFeedbackProvider';

const OFFICIAL_SHARE_URL = 'https://pobinotes-ver3.pages.dev/';

interface LandingPageProps {
  onEnterDemo: () => void;
  onGoToAuth: (mode?: 'login' | 'register') => void;
}

export default function LandingPage({ onEnterDemo, onGoToAuth }: LandingPageProps) {
  const { showToast } = useUiFeedback();
  const [copiedSiteUrl, setCopiedSiteUrl] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {}
  }, [theme]);

  const handleCopyOfficialUrl = async () => {
    try {
      await navigator.clipboard.writeText(OFFICIAL_SHARE_URL);
      setCopiedSiteUrl(true);
      showToast('已複製 POBI STUDIO 分享連結，快傳給同學一起用！', 'success');
      window.setTimeout(() => setCopiedSiteUrl(false), 2500);
    } catch {
      showToast('請手動複製連結：' + OFFICIAL_SHARE_URL, 'info');
    }
  };

  const features = [
    {
      icon: BookOpen,
      title: '單科三大模式與未分類暫存區',
      desc: '左側精簡為我的書架、未分類區、模板管理、AI 提詞管理。打開任一科目即可切換「查看錯題 / 每日複習 / 分析與工坊」，刪除分類時可選擇將題目安全保留於未分類區。'
    },
    {
      icon: RotateCcw,
      title: 'POBI 閃卡複習與各科自訂週期',
      desc: '比熊 POBI 引導挑選章節與小單元（預設全選）進行閃卡重測，並支援為「不同科目」獨立設定熟悉度複習天數，或將已精熟層級設為「不再複習」。'
    },
    {
      icon: Flame,
      title: '三步驟分析工坊與視覺弱點熱度圖',
      desc: '依「章節與單元 / 熟悉度與錯因 / 自訂標籤」多選範圍，透過互動占比圖與視覺化弱點熱度圖複選失分熱點，直接預覽題目與解析圖片縮圖。'
    },
    {
      icon: Printer,
      title: '外部 AI 提示資料包 ZIP 與 A4 防切題考卷',
      desc: '一鍵打包單一提詞檔＋題目／解析圖片 ZIP 直接上傳給 ChatGPT／Gemini／Claude；或匯出預設 A4、絕不跨頁切題的練習卷與解析卷，並支援行動裝置系統列印調格式。'
    },
    {
      icon: Sparkles,
      title: '4 階段 AI 考卷批次匯入與專屬提詞管理',
      desc: '寫完模考拍照上傳即可透過 4 階段流程（設計提詞 -> 上傳分析 -> 調整多圖配對 -> 極速入庫）快速建檔，並於「AI 提詞管理」自由客製化範本。'
    },
    {
      icon: Inbox,
      title: '唯讀分類分享與跨帳號 ZIP 備份還原',
      desc: '分享整本錯題本或單一章節連結後，同學免登入即可依章節與小單元篩選瀏覽；內建跨帳號 ZIP／JSON 完整備份還原與高對比深色模式。'
    }
  ];

  return (
    <div
      className="pobi-paper-stage"
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          width: '100%',
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '1px solid rgba(200, 154, 80, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/pobi-mascot.jpg"
            alt="POBI STUDIO"
            style={{ width: '38px', height: '38px', objectFit: 'cover', objectPosition: 'center 25%', borderRadius: '50%', border: '1.5px solid #C89A50', boxShadow: '0 2px 6px rgba(41, 37, 31, 0.1)' }}
          />
          <div style={{ lineHeight: 1.22 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.08rem', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>POBI STUDIO</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>數位錯題手帳 · Explore. Decode. Understand.</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            className="btn btn-secondary"
            style={{ padding: '7px 10px' }}
            title={theme === 'dark' ? '切換淺色模式' : '切換深色模式'}
            data-testid="landing-theme-toggle-btn"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={() => onGoToAuth('login')}
            className="btn btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.86rem', fontWeight: 600 }}
            data-testid="landing-login-btn"
          >
            登入
          </button>
          <button
            type="button"
            onClick={() => onGoToAuth('register')}
            className="btn btn-primary"
            style={{ padding: '7px 16px', fontSize: '0.86rem', fontWeight: 700 }}
            data-testid="landing-register-btn"
          >
            免費註冊
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '28px 24px 56px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '44px'
        }}
      >
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '30px',
            alignItems: 'center',
            paddingTop: '8px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.9rem, 4vw, 2.7rem)',
                fontWeight: 700,
                lineHeight: 1.28,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)'
              }}
            >
              把每一道錯題，整理成考前最穩的複習與診斷工坊
            </h1>

            <hr className="pobi-gold-divider" style={{ width: '120px', margin: '0' }} />

            <p
              style={{
                margin: 0,
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.75,
                maxWidth: '58ch'
              }}
            >
              結合數位活頁書架、4 階段 AI 考卷批次匯入、POBI 各科自訂閃卡複習、視覺弱點熱度圖、外部 AI 提示資料包（ZIP）與防跨頁切割 A4 試卷列印。不必再花數小時剪貼抄題，專注把盲點徹底練順。
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={onEnterDemo}
                className="btn btn-primary"
                style={{
                  padding: '12px 22px',
                  fontSize: '0.96rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                data-testid="landing-demo-btn"
              >
                <Play size={16} />
                <span>免註冊試玩 Demo（含範例圖片）</span>
              </button>

              <button
                type="button"
                onClick={() => onGoToAuth('register')}
                className="btn btn-secondary"
                style={{
                  padding: '12px 20px',
                  fontSize: '0.94rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>建立個人雲端錯題本</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> 電腦、iPad 與手機皆順暢
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> 淺色紙張 / 高對比深色模式
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> 跨帳號 ZIP 備份還原不鎖資料
              </span>
            </div>

            {/* Official Shareable Website Link Bar */}
            <div
              data-testid="landing-share-bar"
              className="glass"
              style={{
                marginTop: '4px',
                padding: '10px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 220px' }}>
                <Share2 size={15} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>分享給同學：</span>
                <a
                  href={OFFICIAL_SHARE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {OFFICIAL_SHARE_URL}
                </a>
              </div>
              <button
                type="button"
                onClick={handleCopyOfficialUrl}
                className="btn btn-secondary"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  flexShrink: 0
                }}
                data-testid="landing-copy-url-btn"
              >
                {copiedSiteUrl ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                <span>{copiedSiteUrl ? '已複製網址' : '複製網址'}</span>
              </button>
            </div>
          </div>

          {/* Right Deep Forest Green Academic Studio Showcase Panel */}
          <div
            className="pobi-studio-hero-card"
            style={{
              borderRadius: '14px',
              padding: '26px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Subtle Academic Geometric Watermark */}
            <svg
              aria-hidden="true"
              viewBox="0 0 220 220"
              style={{
                position: 'absolute',
                right: '-24px',
                bottom: '-24px',
                width: '180px',
                height: '180px',
                opacity: 0.12,
                pointerEvents: 'none',
                color: '#C89A50'
              }}
            >
              <circle cx="110" cy="110" r="82" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="110" cy="110" r="54" fill="none" stroke="currentColor" strokeWidth="1" />
              <line x1="20" y1="110" x2="200" y2="110" stroke="currentColor" strokeWidth="0.9" />
              <line x1="110" y1="20" x2="110" y2="200" stroke="currentColor" strokeWidth="0.9" />
              <path d="M 45 155 Q 110 45 175 155" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(200, 154, 80, 0.35)', paddingBottom: '12px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src="/pobi-mascot.jpg"
                  alt="Pobi 陪伴導師"
                  style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 25%', border: '1.5px solid #C89A50' }}
                />
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '0.96rem', color: '#FBF8F1', letterSpacing: '0.03em' }}>
                    完整錯題攻克閉環
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#E4C284', letterSpacing: '0.08em' }}>
                    Explore. Decode. Understand.
                  </div>
                </div>
              </div>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: '1px solid rgba(200, 154, 80, 0.55)',
                  backgroundColor: 'rgba(11, 64, 43, 0.55)',
                  color: '#F3E5C8'
                }}
              >
                數位錯題手帳
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', position: 'relative', zIndex: 1 }}>
              {[
                { step: '01', label: '拍照錄入與 4 階段 AI 批次建檔', detail: '必選熟悉度並提醒補充錯因；多張試卷圖可一鍵打包 ZIP 交給 AI 解析' },
                { step: '02', label: 'POBI 每日閃卡與各科自訂週期', detail: '預設全選章節與小單元重測，不同科目可獨立設定複習天數或不再複習' },
                { step: '03', label: '三步驟視覺分析與弱點熱度圖', detail: '依章節單元／熟悉度錯因／自訂標籤篩選，直接在熱度圖複選弱點範圍' },
                { step: '04', label: 'AI 提示資料包 ZIP 與 A4 防切題考卷', detail: '匯出單一提詞＋圖片 ZIP 交給 AI 指導，或印出不切題 A4 練習卷實戰' }
              ].map(row => (
                <div
                  key={row.step}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(251, 248, 241, 0.08)',
                    border: '1px solid rgba(200, 154, 80, 0.25)'
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#E4C284', fontVariantNumeric: 'tabular-nums', paddingTop: '1px' }}>
                    {row.step}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#FBF8F1' }}>{row.label}</div>
                    <div style={{ fontSize: '0.79rem', color: 'rgba(251, 248, 241, 0.82)', lineHeight: 1.5 }}>{row.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {features.map((f, idx) => {
            const Icon = f.icon;
            const isForest = idx % 2 === 0;
            return (
              <div
                key={f.title}
                className="glass"
                style={{
                  borderRadius: '11px',
                  padding: '20px',
                  borderTop: isForest ? '2.5px solid #145B38' : '2.5px solid #C89A50',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: isForest ? 'rgba(20, 91, 56, 0.09)' : 'rgba(217, 119, 6, 0.1)',
                    border: isForest ? '1px solid rgba(20, 91, 56, 0.24)' : '1px solid rgba(200, 154, 80, 0.45)',
                    color: isForest ? '#145B38' : '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon size={19} />
                </div>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            );
          })}
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(200, 154, 80, 0.3)',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>POBI STUDIO｜數位錯題手帳</span>
        <span>Explore. Decode. Understand.</span>
      </footer>
    </div>
  );
}
