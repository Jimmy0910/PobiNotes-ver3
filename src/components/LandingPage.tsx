import { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Printer,
  RotateCcw,
  ArrowRight,
  Play,
  Share2,
  FolderTree,
  CheckCircle2,
  Copy,
  Check
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
      title: '數位書架與三層架構搬運',
      desc: '依科目建立獨立錯題手帳，支援「科目 / 章節 / 小單元」自由升降級搬運，關聯錯題自動同步不遺失。'
    },
    {
      icon: Sparkles,
      title: 'AI 考卷批次匯入與思維樹提詞',
      desc: '整份模擬考卷一鍵打包 ZIP 交給外部 AI 辨識 JSON 建檔，並內建名師思維樹提詞工坊逐步破題。'
    },
    {
      icon: RotateCcw,
      title: '間隔重複排程與進步軌跡',
      desc: '依據四維度熟悉度（順、卡、不會、誤解）自動排定今日待複習清單，完整記錄每題從不會到熟練的歷程。'
    },
    {
      icon: Printer,
      title: 'A4 雙模式試卷與錯題分享包',
      desc: '一鍵匯出無答案練習卷與完整解析卷 PDF，並可產生唯讀錯題分享連結，方便與同學或老師討論。'
    }
  ];

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary, #FAF7F0)',
        color: 'var(--text-primary, #1C1917)',
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
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.png"
            alt="POBI STUDIO"
            style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '7px' }}
          />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 800, fontSize: '1.02rem', letterSpacing: '0.03em' }}>POBI STUDIO</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>線上錯題手帳系統</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          padding: '32px 24px 56px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '48px'
        }}
      >
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '32px',
            alignItems: 'center',
            paddingTop: '12px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.9rem, 4vw, 2.75rem)',
                fontWeight: 800,
                lineHeight: 1.24,
                letterSpacing: '-0.015em',
                color: 'var(--text-primary)'
              }}
            >
              把每一道錯題，整理成考前最穩的複習地圖
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.75,
                maxWidth: '58ch'
              }}
            >
              結合數位活頁手帳、AI 批次考卷歸納、間隔重複排程與 A4 試卷列印。不必再花數小時剪貼抄題，專注把「不會」與「卡住」的盲點真正練順。
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '6px' }}>
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
                  gap: '8px',
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                  color: '#FFFFFF',
                  border: '1px solid #B45309',
                  boxShadow: '0 6px 18px rgba(180, 83, 9, 0.25)'
                }}
                data-testid="landing-demo-btn"
              >
                <Play size={16} />
                <span>免註冊試玩 Demo</span>
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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} style={{ color: '#059669' }} /> 支援電腦、iPad 與手機
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} style={{ color: '#059669' }} /> 完整 ZIP 備份不鎖資料
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} style={{ color: '#059669' }} /> 支援唯讀連結分享題組
              </span>
            </div>

            {/* Official Shareable Website Link Bar */}
            <div
              data-testid="landing-share-bar"
              style={{
                marginTop: '6px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                boxShadow: '0 2px 8px rgba(60, 40, 20, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 220px' }}>
                <Share2 size={15} style={{ color: '#B45309', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400E', flexShrink: 0 }}>分享給同學：</span>
                <a
                  href={OFFICIAL_SHARE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.82rem',
                    color: '#1D4ED8',
                    fontWeight: 600,
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
                {copiedSiteUrl ? <Check size={14} style={{ color: '#059669' }} /> : <Copy size={14} />}
                <span>{copiedSiteUrl ? '已複製網址' : '複製網址'}</span>
              </button>
            </div>
          </div>

          {/* Right Editorial Preview Panel */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 12px 32px rgba(60, 40, 20, 0.08)',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#92400E', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FolderTree size={16} /> 今日複習與學習閉環
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                間隔重複排程
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { step: '01', label: '收集建檔', detail: '單題拍照錄入，或透過 AI 批次匯入整份段考卷' },
                { step: '02', label: '四維度標記', detail: '精準區分「順、卡、不會、誤解」與錯因標籤' },
                { step: '03', label: '自動排程重測', detail: '依遺忘曲線自動列出今日待複習閃卡與進步軌跡' },
                { step: '04', label: '紙本實戰與分享', detail: '一鍵產出無答案 A4 練習卷，或分享題包給同學討論' }
              ].map(row => (
                <div
                  key={row.step}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#FAF7F0',
                    border: '1px solid rgba(180, 83, 9, 0.14)'
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#B45309', fontVariantNumeric: 'tabular-nums', paddingTop: '1px' }}>
                    {row.step}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1C1917' }}>{row.label}</div>
                    <div style={{ fontSize: '0.8rem', color: '#57534E', lineHeight: 1.5 }}>{row.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {features.map(f => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 2px 10px rgba(60, 40, 20, 0.04)'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(217, 119, 6, 0.12)',
                    color: '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon size={19} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1C1917' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#57534E', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            );
          })}
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--glass-border)',
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
        <span>POBI STUDIO 線上錯題手帳</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Share2 size={12} /> 專為大考複習與自主學習打造
        </span>
      </footer>
    </div>
  );
}
