import { useState, useEffect, useRef } from 'react';
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
  Moon,
  Volume2,
  VolumeX,
  Maximize2,
  Clock,
  Layers,
  Target
} from 'lucide-react';
import { useUiFeedback } from './UiFeedbackProvider';
import {
  GoldCornerOrnaments,
  GoldGeometricDivider,
  AcademicHandDrawnBackdrop
} from './PobiDesignElements';
import RollerShutterIntro from './RollerShutterIntro';

const OFFICIAL_SHARE_URL = 'https://pobinotes-ver3.pages.dev/';
let hasPlayedShutterIntroInMemory = false;

interface LandingPageProps {
  onEnterDemo: () => void;
  onGoToAuth: (mode?: 'login' | 'register') => void;
  onPrefetchDemo?: () => void;
  onPrefetchAuth?: () => void;
}

export default function LandingPage({ onEnterDemo, onGoToAuth, onPrefetchDemo, onPrefetchAuth }: LandingPageProps) {
  const { showToast } = useUiFeedback();
  const [copiedSiteUrl, setCopiedSiteUrl] = useState(false);
  const [showShutterIntro, setShowShutterIntro] = useState<boolean>(() => !hasPlayedShutterIntroInMemory);
  const [introRunKey, setIntroRunKey] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const promoVideoRef = useRef<HTMLVideoElement | null>(null);

  const handleEnterVideoFullscreen = () => {
    const videoEl = promoVideoRef.current as (HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;
    if (!videoEl) return;
    if (typeof videoEl.requestFullscreen === 'function') {
      videoEl.requestFullscreen().catch(() => {
        if (typeof videoEl.webkitEnterFullscreen === 'function') {
          videoEl.webkitEnterFullscreen();
        }
      });
    } else if (typeof videoEl.webkitEnterFullscreen === 'function') {
      videoEl.webkitEnterFullscreen();
    } else if (typeof videoEl.webkitRequestFullscreen === 'function') {
      videoEl.webkitRequestFullscreen();
    }
  };
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
      showToast('已複製 POBI STUDIO 分享連結', 'success');
      window.setTimeout(() => setCopiedSiteUrl(false), 2200);
    } catch {
      showToast('複製失敗，請手動複製網址', 'error');
    }
  };

  const highlights = [
    {
      icon: Clock,
      label: '拍照 10 秒建檔',
      desc: '告別剪刀膠水抄題，整份考卷拍照即可透過 AI 批次辨識歸類。'
    },
    {
      icon: Target,
      label: '鎖定真正盲點',
      desc: '以熱度圖直覺看出失分章節與錯因，把考前時間花在最容易掉分的題型。'
    },
    {
      icon: Layers,
      label: '考前實戰輸出',
      desc: '一鍵打包 AI 指導資料包（ZIP），或直接排版印出防切題 A4 練習卷。'
    }
  ];

  const features = [
    {
      icon: BookOpen,
      title: '單科手帳與未分類暫存區',
      desc: '依科目建立獨立硬殼錯題本，翻開即可切換「查看錯題 / 每日複習 / 分析與工坊」，刪除分類時可將題目保留於未分類區。'
    },
    {
      icon: RotateCcw,
      title: 'POBI 閃卡複習與各科自訂週期',
      desc: '比熊 POBI 引導挑選章節與小單元進行閃卡重測，並可針對不同科目自訂各熟悉度的間隔天數或設為「不再複習」。'
    },
    {
      icon: Flame,
      title: '視覺化弱點熱度圖與多選分析',
      desc: '依「章節與單元 / 熟悉度與錯因 / 自訂標籤」檢視占比圖與弱點熱度表，直接點選多個熱區即可鎖定複習清單。'
    },
    {
      icon: Printer,
      title: 'AI 提示資料包與 A4 防切題考卷',
      desc: '匯出完整提詞與圖片 ZIP 上傳給 AI 分析，或排版輸出 A4 模擬練習卷、附解析卷與行動裝置系統列印。'
    },
    {
      icon: Sparkles,
      title: 'AI 考卷批次匯入與提詞工坊',
      desc: '透過 4 階段流程（設計提詞 → 上傳分析 → 調整配對 → 快速入庫）批次整理模考卷，並可自訂專屬 AI 提詞範本。'
    },
    {
      icon: Inbox,
      title: '唯讀題目分享包與跨帳號備份',
      desc: '書封與章節皆可產生免登入唯讀分享連結（預設隱藏解答方便自測），並支援含圖片之完整 ZIP 備份還原。'
    }
  ];

  return (
    <div
      className="pobi-paper-stage"
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Opening Brand Logo Video Intro (Pure White Backdrop -> Smooth Fade Out) */}
      {showShutterIntro && (
        <RollerShutterIntro
          key={introRunKey}
          onComplete={() => {
            hasPlayedShutterIntroInMemory = true;
            setShowShutterIntro(false);
          }}
        />
      )}

      {/* Academic Hand-Drawn Technical Sketches Watermark */}
      <AcademicHandDrawnBackdrop subject="all" />
      {/* Gold Geometric Page Corner Ornaments */}
      <GoldCornerOrnaments size={62} inset={12} opacity={0.48} corners={['tl', 'tr']} />

      {/* Top Navigation Bar */}
      <header
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '1140px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '1px solid rgba(200, 154, 80, 0.35)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              backgroundColor: '#145B38',
              border: '1.5px solid #C89A50',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(20, 91, 56, 0.22)',
              flexShrink: 0
            }}
          >
            <img
              src="/logo-128.webp"
              alt="POBI STUDIO 筆記本標誌"
              width={32}
              height={32}
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '5px' }}
            />
          </div>
          <div style={{ lineHeight: 1.22 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.08rem', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
              POBI STUDIO
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
              數位錯題手帳 · Explore. Decode. Understand.
            </div>
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
            onMouseEnter={onPrefetchAuth}
            onFocus={onPrefetchAuth}
            onPointerDown={onPrefetchAuth}
            onClick={() => onGoToAuth('login')}
            className="btn btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.86rem', fontWeight: 600 }}
            data-testid="landing-login-btn"
          >
            登入
          </button>
          <button
            type="button"
            onMouseEnter={onPrefetchAuth}
            onFocus={onPrefetchAuth}
            onPointerDown={onPrefetchAuth}
            onClick={() => onGoToAuth('register')}
            className="btn btn-primary"
            style={{ padding: '7px 16px', fontSize: '0.86rem', fontWeight: 700 }}
            data-testid="landing-register-btn"
          >
            免費註冊
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          width: '100%',
          maxWidth: '1140px',
          margin: '0 auto',
          padding: '28px 24px 56px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '38px'
        }}
      >
        {/* Hero Section */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            alignItems: 'center',
            paddingTop: '6px'
          }}
        >
          {/* Left Pitch & CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', padding: '5px 12px', borderRadius: '999px', backgroundColor: 'rgba(20, 91, 56, 0.09)', border: '1px solid rgba(20, 91, 56, 0.25)', fontSize: '0.78rem', fontWeight: 700, color: '#145B38' }}>
              <BookOpen size={14} />
              <span>專為高中大考、段考與自主備考設計的數位錯題手帳</span>
            </div>

            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.95rem, 4vw, 2.75rem)',
                fontWeight: 700,
                lineHeight: 1.26,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)'
              }}
            >
              把每一次考場失誤，
              <br />
              轉化成下一次拿分的把握
            </h1>

            <hr className="pobi-gold-divider" style={{ width: '130px', margin: '0' }} />

            <p
              style={{
                margin: 0,
                fontSize: '0.98rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.78,
                maxWidth: '56ch'
              }}
            >
              結合硬殼活頁書架、4 階段 AI 考卷批次建檔、POBI 閃卡複習排程、弱點熱度圖分析、外部 AI 提示資料包與防跨頁 A4 試卷列印。不必再花數小時剪貼抄題，把每一分鐘專注在真正會考的弱點上。
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
              <button
                type="button"
                onMouseEnter={onPrefetchDemo}
                onFocus={onPrefetchDemo}
                onPointerDown={onPrefetchDemo}
                onClick={onEnterDemo}
                className="btn btn-primary"
                style={{
                  padding: '12px 24px',
                  fontSize: '0.96rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                data-testid="landing-demo-btn"
              >
                <Play size={16} />
                <span>免註冊體驗 Demo</span>
              </button>

              <button
                type="button"
                onMouseEnter={onPrefetchAuth}
                onFocus={onPrefetchAuth}
                onPointerDown={onPrefetchAuth}
                onClick={() => onGoToAuth('register')}
                className="btn btn-secondary"
                style={{
                  padding: '12px 22px',
                  fontSize: '0.96rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                data-testid="landing-start-btn"
              >
                <span>免費建立個人錯題本</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> 電腦、iPad 與手機皆順暢
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> 淺色紙張 / 高對比深色模式
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> 跨帳號 ZIP 完整備份還原
              </span>
            </div>

            {/* Official Shareable Website Link Bar */}
            <div
              data-testid="landing-share-bar"
              className="glass"
              style={{
                marginTop: '2px',
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
                <Share2 size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
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

          {/* Right Product Promo Video Showcase Card (Deep Forest Green Hardcover Studio) */}
          <div
            className="pobi-studio-hero-card"
            data-testid="landing-promo-video-card"
            style={{
              borderRadius: '16px',
              padding: '22px 22px 20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <GoldCornerOrnaments size={50} inset={6} opacity={0.78} color="#E4C284" />

            {/* Showcase Top Header with POBI Mascot & Audio Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(200, 154, 80, 0.35)', paddingBottom: '12px', position: 'relative', zIndex: 2, gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src="/pobi-mascot-128.webp"
                  alt="比熊 POBI 學習夥伴"
                  width={40}
                  height={40}
                  decoding="async"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 25%', border: '1.5px solid #E4C284' }}
                />
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '0.98rem', color: '#FBF8F1', letterSpacing: '0.03em' }}>
                    POBI STUDIO 產品介紹影片
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#E4C284', letterSpacing: '0.04em' }}>
                    34 秒快速認識數位錯題手帳完整流程
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="pobi-promo-ctrl-btn"
                  onClick={() => {
                    const nextMuted = !isVideoMuted;
                    setIsVideoMuted(nextMuted);
                    if (promoVideoRef.current) {
                      promoVideoRef.current.muted = nextMuted;
                    }
                  }}
                  data-testid="landing-promo-mute-btn"
                  style={{
                    padding: '5px 10px',
                    borderRadius: '999px',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    border: '1px solid rgba(228, 194, 132, 0.65)',
                    backgroundColor: isVideoMuted ? 'rgba(217, 119, 6, 0.92)' : 'rgba(11, 64, 43, 0.78)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isVideoMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  <span>{isVideoMuted ? '開啟配樂' : '靜音'}</span>
                </button>
                <button
                  type="button"
                  className="pobi-promo-ctrl-btn"
                  onClick={handleEnterVideoFullscreen}
                  data-testid="landing-promo-fullscreen-btn"
                  title="全螢幕觀看推廣影片"
                  style={{
                    padding: '5px 10px',
                    borderRadius: '999px',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    border: '1px solid rgba(228, 194, 132, 0.65)',
                    backgroundColor: 'rgba(11, 64, 43, 0.78)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Maximize2 size={13} />
                  <span>全螢幕</span>
                </button>
              </div>
            </div>

            {/* Embedded 16:9 Commercial Promo Video (Paused initially, auto-pauses at end, replays from 0s) */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                borderRadius: '11px',
                overflow: 'hidden',
                border: '1.5px solid rgba(228, 194, 132, 0.55)',
                backgroundColor: '#0B402B',
                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.28)',
                aspectRatio: '16 / 9',
                width: '100%'
              }}
            >
              <video
                ref={promoVideoRef}
                src="/pobi-promo.mp4"
                poster="/pobi-promo-poster.webp"
                muted={isVideoMuted}
                playsInline
                controls
                preload="none"
                data-testid="landing-promo-video"
                onPlay={e => {
                  const v = e.currentTarget;
                  if (isVideoEnded || v.ended || (v.duration > 0 && v.currentTime >= v.duration - 0.15)) {
                    v.currentTime = 0;
                    setIsVideoEnded(false);
                  }
                }}
                onEnded={e => {
                  const v = e.currentTarget;
                  v.pause();
                  v.currentTime = 0;
                  setIsVideoEnded(true);
                }}
                onVolumeChange={e => {
                  setIsVideoMuted(e.currentTarget.muted);
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  backgroundColor: '#0B402B'
                }}
              >
                您的瀏覽器不支援內嵌影片播放，請改用新版瀏覽器觀看。
              </video>
            </div>

            {/* Compact 4-Step Feature Strip below Video */}
            <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {[
                { step: '01', label: 'AI 考卷批次建檔' },
                { step: '02', label: 'POBI 每日閃卡排程' },
                { step: '03', label: '弱點熱度圖多選' },
                { step: '04', label: 'AI 提詞包與 A4 考卷' }
              ].map(item => (
                <div
                  key={item.step}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(251, 248, 241, 0.08)',
                    border: '1px solid rgba(200, 154, 80, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#E4C284', fontVariantNumeric: 'tabular-nums' }}>
                    {item.step}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#FBF8F1' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Commercial Value Proposition 3-Column Strip */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
          {highlights.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="glass"
                style={{
                  borderRadius: '11px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  borderLeft: '3.5px solid #D97706'
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(217, 119, 6, 0.12)',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <GoldGeometricDivider />

        {/* Feature Grid Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '18px', contentVisibility: 'auto', containIntrinsicSize: '0 420px' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.52rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              從收錄、複習到實戰輸出，一套工具全部完成
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              每一項功能皆圍繞「高效率消除錯題」設計，讓複習節奏清楚可控
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
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
          </div>
        </section>

        {/* Bottom Conversion CTA Banner */}
        <section
          className="pobi-studio-hero-card"
          style={{
            borderRadius: '16px',
            padding: '28px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <GoldCornerOrnaments size={44} inset={6} opacity={0.72} color="#E4C284" />
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 320px' }}>
            <img
              src="/pobi-mascot-128.webp"
              alt="比熊 POBI"
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 25%', border: '2px solid #E4C284', flexShrink: 0 }}
            />
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: '#FBF8F1' }}>
                現在就把最近一份考卷，變成你的專屬弱點地圖
              </h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.86rem', color: 'rgba(251, 248, 241, 0.85)' }}>
                免下載安裝，免註冊也能直接體驗完整功能，登入即享雲端跨裝置同步。
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onMouseEnter={onPrefetchDemo}
              onFocus={onPrefetchDemo}
              onPointerDown={onPrefetchDemo}
              onClick={onEnterDemo}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Play size={15} />
              <span>立即體驗 Demo</span>
            </button>
            <button
              type="button"
              className="pobi-promo-ctrl-btn"
              onMouseEnter={onPrefetchAuth}
              onFocus={onPrefetchAuth}
              onPointerDown={onPrefetchAuth}
              onClick={() => onGoToAuth('register')}
              data-testid="landing-bottom-register-btn"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1.5px solid #E4C284',
                backgroundColor: 'rgba(251, 248, 241, 0.14)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>免費註冊帳號</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="binder-bottom-bar"
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '18px 24px',
          justifyContent: 'center',
          gap: '16px'
        }}
      >
        <GoldCornerOrnaments size={28} inset={6} opacity={0.55} corners={['bl', 'br']} />
        <span style={{ position: 'relative', zIndex: 2, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>POBI STUDIO｜數位錯題手帳</span>
        <span style={{ position: 'relative', zIndex: 2, width: '5px', height: '5px', transform: 'rotate(45deg)', backgroundColor: '#C89A50', display: 'inline-block' }} />
        <span style={{ position: 'relative', zIndex: 2, letterSpacing: '0.06em' }}>Explore. Decode. Understand.</span>
        <button
          type="button"
          onClick={() => {
            setIntroRunKey(k => k + 1);
            setShowShutterIntro(true);
          }}
          style={{
            position: 'relative',
            zIndex: 2,
            background: 'none',
            border: '1px solid rgba(200, 154, 80, 0.45)',
            borderRadius: '999px',
            padding: '3px 10px',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <RotateCcw size={12} />
          <span>重播開場</span>
        </button>
      </footer>
    </div>
  );
}
