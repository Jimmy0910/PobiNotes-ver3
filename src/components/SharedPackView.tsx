import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { BookOpen, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

interface SharedPackItem {
  id: string;
  title: string;
  subjectName?: string;
  chapterName?: string;
  unitName?: string;
  familiarityName?: string;
  errorReasons?: string[];
  qDesc?: string;
  qImages?: string[];
  aDesc?: string;
  aImages?: string[];
}

interface SharedPackData {
  id: string;
  title: string;
  creatorName: string;
  createdAt: number;
  items: SharedPackItem[];
}

function resolveImg(key?: string): string {
  if (!key || typeof key !== 'string') return '';
  if (
    key.startsWith('data:') ||
    key.startsWith('blob:') ||
    key.startsWith('http://') ||
    key.startsWith('https://') ||
    key.startsWith('/api/images/')
  ) {
    return key;
  }
  return `/api/images/${key}`;
}

interface SharedPackViewProps {
  shareId: string;
  onGoHome: () => void;
}

export default function SharedPackView({ shareId, onGoHome }: SharedPackViewProps) {
  const [pack, setPack] = useState<SharedPackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hideAnswers, setHideAnswers] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiRequest<{ success: boolean; pack: SharedPackData }>(
          `/api/share?id=${encodeURIComponent(shareId)}`
        );
        if (active && res?.pack) {
          setPack(res.pack);
        }
      } catch (err: any) {
        if (active) setError(err?.message || '找不到此錯題分享包');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [shareId]);

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary, #FAF7F0)', color: 'var(--text-primary, #1C1917)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <header style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--glass-border)', padding: '14px 20px' }}>
        <div style={{ maxWidth: '940px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="POBI STUDIO" style={{ width: '30px', height: '30px', borderRadius: '6px' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.96rem' }}>POBI STUDIO 錯題分享包</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>唯讀公開預覽模式</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoHome}
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
              color: '#FFFFFF',
              border: '1px solid #B45309'
            }}
            data-testid="shared-pack-cta-btn"
          >
            <BookOpen size={15} />
            <span>用 PobiNotes 建立我的錯題本</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: '940px', margin: '0 auto', padding: '24px 20px 48px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--text-muted)' }}>
            <Loader2 size={28} className="animate-spin" style={{ marginBottom: '10px' }} />
            <div>正在載入錯題分享包...</div>
          </div>
        ) : error || !pack ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={32} style={{ color: '#DC2626' }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{error || '分享連結已失效'}</h2>
            <button type="button" onClick={onGoHome} className="btn btn-primary" style={{ marginTop: '8px', padding: '8px 18px' }}>
              前往 POBI STUDIO 首頁
            </button>
          </div>
        ) : (
          <>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>{pack.title}</h1>
                <div style={{ marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  分享者：{pack.creatorName} · 共 {pack.items.length} 道錯題 · 建立於 {new Date(pack.createdAt).toLocaleDateString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHideAnswers(prev => !prev)}
                className="btn btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.84rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {hideAnswers ? <Eye size={15} /> : <EyeOff size={15} />}
                <span>{hideAnswers ? '目前隱藏解答（自測中）' : '隱藏解答進行自測'}</span>
              </button>
            </div>

            {pack.items.map((item, idx) => {
              const showAns = !hideAnswers || !!revealedIds[item.id];
              return (
                <article
                  key={item.id || idx}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: '#B45309', fontSize: '0.85rem' }}>#{idx + 1}</span>
                    <h3 style={{ margin: 0, fontSize: '1.04rem', fontWeight: 700 }}>{item.title}</h3>
                    {(item.subjectName || item.chapterName) && (
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.75rem', fontWeight: 600 }}>
                        {[item.subjectName, item.chapterName, item.unitName].filter(Boolean).join(' / ')}
                      </span>
                    )}
                  </div>

                  {item.qDesc && (
                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{item.qDesc}</p>
                  )}

                  {Array.isArray(item.qImages) && item.qImages.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {item.qImages.map((src, i) => (
                        <img key={i} src={resolveImg(src)} alt="題目圖" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '12px' }}>
                    {showAns ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#047857' }}>答案與詳解</div>
                        {item.aDesc ? (
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#44403C', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{item.aDesc}</p>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>（無文字解析）</span>
                        )}
                        {Array.isArray(item.aImages) && item.aImages.length > 0 && (
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {item.aImages.map((src, i) => (
                              <img key={i} src={resolveImg(src)} alt="解析圖" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #10B981' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevealedIds(prev => ({ ...prev, [item.id]: true }))}
                        className="btn btn-secondary"
                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                      >
                        點擊展開此題解析
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
