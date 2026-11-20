import { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../utils/api';
import { resolveImgUrl } from '../utils/mistakeMedia';
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

const UNCAT_CHAPTER = '__UNCAT_CHAPTER__';
const UNCAT_UNIT = '__UNCAT_UNIT__';

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
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  // Derive chapter list with counts
  const chapterGroups = useMemo(() => {
    if (!pack?.items) return [];
    const counts = new Map<string, number>();
    const order: string[] = [];
    for (const item of pack.items) {
      const key = (item.chapterName || '').trim() || UNCAT_CHAPTER;
      if (!counts.has(key)) order.push(key);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return order.map(key => ({
      key,
      label: key === UNCAT_CHAPTER ? '未分類章節' : key,
      count: counts.get(key) || 0
    }));
  }, [pack]);

  // Derive unit list under selected chapter
  const unitGroups = useMemo(() => {
    if (!pack?.items || !selectedChapter) return [];
    const counts = new Map<string, number>();
    const order: string[] = [];
    let hasNamedUnit = false;
    for (const item of pack.items) {
      const chapKey = (item.chapterName || '').trim() || UNCAT_CHAPTER;
      if (chapKey !== selectedChapter) continue;
      const uName = (item.unitName || '').trim();
      if (uName) hasNamedUnit = true;
      const uKey = uName || UNCAT_UNIT;
      if (!counts.has(uKey)) order.push(uKey);
      counts.set(uKey, (counts.get(uKey) || 0) + 1);
    }
    if (!hasNamedUnit) return [];
    return order.map(key => ({
      key,
      label: key === UNCAT_UNIT ? '未指定單元' : key,
      count: counts.get(key) || 0
    }));
  }, [pack, selectedChapter]);

  // Filtered items by selected chapter and unit
  const visibleItems = useMemo(() => {
    if (!pack?.items) return [];
    return pack.items.filter(item => {
      if (selectedChapter) {
        const chapKey = (item.chapterName || '').trim() || UNCAT_CHAPTER;
        if (chapKey !== selectedChapter) return false;
      }
      if (selectedUnit) {
        const uKey = (item.unitName || '').trim() || UNCAT_UNIT;
        if (uKey !== selectedUnit) return false;
      }
      return true;
    });
  }, [pack, selectedChapter, selectedUnit]);

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

            {/* Chapter Tabs Rail */}
            {chapterGroups.length > 0 && (
              <div
                data-testid="shared-chapter-tabs"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '6px 2px',
                  borderBottom: '2px solid rgba(180, 83, 9, 0.2)'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapter(null);
                    setSelectedUnit(null);
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '7px 14px',
                    borderRadius: '8px 8px 0 0',
                    border: selectedChapter === null ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                    borderBottom: selectedChapter === null ? '2px solid #FFFBEB' : '1px solid var(--glass-border)',
                    backgroundColor: selectedChapter === null ? '#FFFBEB' : '#FFFFFF',
                    color: selectedChapter === null ? '#92400E' : 'var(--text-secondary)',
                    fontWeight: selectedChapter === null ? 700 : 500,
                    fontSize: '0.86rem',
                    cursor: 'pointer'
                  }}
                >
                  全部章節 ({pack.items.length})
                </button>
                {chapterGroups.map(chap => {
                  const isActive = selectedChapter === chap.key;
                  return (
                    <button
                      key={chap.key}
                      type="button"
                      onClick={() => {
                        setSelectedChapter(chap.key);
                        setSelectedUnit(null);
                      }}
                      style={{
                        flexShrink: 0,
                        padding: '7px 14px',
                        borderRadius: '8px 8px 0 0',
                        border: isActive ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                        borderBottom: isActive ? '2px solid #FFFBEB' : '1px solid var(--glass-border)',
                        backgroundColor: isActive ? '#FFFBEB' : '#FFFFFF',
                        color: isActive ? '#92400E' : 'var(--text-secondary)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.86rem',
                        cursor: 'pointer'
                      }}
                    >
                      {chap.label} ({chap.count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sub-Units Pills Rail */}
            {selectedChapter && unitGroups.length > 0 && (
              <div
                data-testid="shared-unit-pills"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  overflowX: 'auto',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(180, 83, 9, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)'
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400E', flexShrink: 0 }}>
                  細部單元：
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUnit(null)}
                  style={{
                    flexShrink: 0,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: selectedUnit === null ? 700 : 500,
                    border: selectedUnit === null ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                    backgroundColor: selectedUnit === null ? '#FDE68A' : '#FFFFFF',
                    color: '#1C1917',
                    cursor: 'pointer'
                  }}
                >
                  全部單元
                </button>
                {unitGroups.map(unit => {
                  const isActive = selectedUnit === unit.key;
                  return (
                    <button
                      key={unit.key}
                      type="button"
                      onClick={() => setSelectedUnit(unit.key)}
                      style={{
                        flexShrink: 0,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: isActive ? 700 : 500,
                        border: isActive ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                        backgroundColor: isActive ? '#FDE68A' : '#FFFFFF',
                        color: '#1C1917',
                        cursor: 'pointer'
                      }}
                    >
                      {unit.label} ({unit.count})
                    </button>
                  );
                })}
              </div>
            )}

            {visibleItems.map((item, idx) => {
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
                        <img key={i} src={resolveImgUrl(src)} alt="題目圖" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
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
                              <img key={i} src={resolveImgUrl(src)} alt="解析圖" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #10B981' }} />
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
