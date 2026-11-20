import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../utils/api';
import {
  type CategoriesBundle,
  type MistakeRecord,
  buildNextReviewMeta,
  getMistakeReviewMeta
} from '../types';
import { extractMistakeMediaAndText } from '../utils/mistakeMedia';
import {
  X,
  Eye,
  CheckCircle2,
  RotateCcw,
  Clock,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface DailyReviewModalProps {
  dueMistakes: MistakeRecord[];
  categories: CategoriesBundle;
  onClose: () => void;
  onReviewUpdated: (updated: MistakeRecord) => void;
  onRefreshAll?: () => Promise<void>;
}

function extractCardContent(m: MistakeRecord) {
  const { qDesc, qImages, aDesc, aImages } = extractMistakeMediaAndText(m);
  return {
    qText: qDesc,
    aText: aDesc,
    qImgs: qImages,
    aImgs: aImages
  };
}

export default function DailyReviewModal({
  dueMistakes,
  categories,
  onClose,
  onReviewUpdated,
  onRefreshAll
}: DailyReviewModalProps) {
  // Snapshot queue on open so list doesn't shift mid-session
  const [queue] = useState<MistakeRecord[]>(() => [...dueMistakes]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const currentMistake = queue[currentIdx] || null;
  const isFinished = currentIdx >= queue.length;

  const content = useMemo(() => {
    return currentMistake ? extractCardContent(currentMistake) : null;
  }, [currentMistake]);

  const currentMeta = useMemo(() => {
    return currentMistake ? getMistakeReviewMeta(currentMistake) : null;
  }, [currentMistake]);

  const ratingButtons = [
    { name: '不會', sub: '1 天後重測', bg: 'rgba(239, 68, 68, 0.1)', border: '#EF4444', color: '#B91C1C' },
    { name: '卡', sub: '3 天後重測', bg: 'rgba(245, 158, 11, 0.12)', border: '#D97706', color: '#92400E' },
    { name: '誤解', sub: '5 天後重測', bg: 'rgba(220, 38, 38, 0.1)', border: '#DC2626', color: '#991B1B' },
    { name: '順', sub: '14 天後重測', bg: 'rgba(16, 185, 129, 0.12)', border: '#10B981', color: '#047857' }
  ];

  const handleRate = async (famName: string) => {
    if (!currentMistake || saving) return;
    setSaving(true);
    try {
      const famObj = categories.familiarities.find(f => f.name === famName) || null;
      const nextReviewMeta = buildNextReviewMeta(currentMistake, famObj?.id || null, famName);
      const nextData = {
        ...currentMistake.data,
        reviewMeta: nextReviewMeta
      };

      const updated: MistakeRecord = {
        ...currentMistake,
        familiarity_id: famObj?.id || currentMistake.familiarity_id,
        familiarity_name: famName,
        familiarity_color: famObj?.color || currentMistake.familiarity_color,
        data: nextData
      };

      onReviewUpdated(updated);

      await apiRequest('/api/mistakes', {
        method: 'PUT',
        body: {
          id: currentMistake.id,
          familiarity_id: famObj?.id || null,
          data: nextData
        }
      });

      setCompletedCount(c => c + 1);
      setShowAnswer(false);
      setCurrentIdx(i => i + 1);
    } catch (err) {
      console.error('更新複習紀錄失敗:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (completedCount > 0) {
      await onRefreshAll?.();
    }
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 100040,
        background: 'rgba(15, 23, 42, 0.74)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px',
        boxSizing: 'border-box'
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !saving) handleClose();
      }}
    >
      <div
        data-testid="daily-review-modal"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: 'min(88dvh, 88vh)',
          backgroundColor: 'var(--bg-secondary, #FFFFFF)',
          color: 'var(--text-primary, #1C1917)',
          borderRadius: '14px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '15px 20px',
            borderBottom: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                backgroundColor: 'rgba(217, 119, 6, 0.14)',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>今日待複習閃卡</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {isFinished
                  ? `已完成全部 ${queue.length} 題`
                  : `進度：第 ${currentIdx + 1} / ${queue.length} 題`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            title="關閉複習視窗"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {isFinished ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.14)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CheckCircle2 size={30} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>今日複習任務完成</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
                本次共完成 {completedCount} 道錯題重測，系統已依據您的熟練度自動排定下次間隔複習日期並記錄於單題進步軌跡。
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-primary"
                style={{ marginTop: '8px', padding: '9px 22px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                返回書架
              </button>
            </div>
          ) : currentMistake && content ? (
            <>
              {/* Subject/Chapter + History Trail */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {currentMistake.subject_name && (
                    <span style={{ padding: '2px 8px', borderRadius: '5px', backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.76rem', fontWeight: 700 }}>
                      {currentMistake.subject_name}
                    </span>
                  )}
                  {currentMistake.chapter_name && (
                    <span style={{ padding: '2px 8px', borderRadius: '5px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.76rem', fontWeight: 600 }}>
                      {currentMistake.chapter_name}
                      {currentMistake.unit_name ? ` / ${currentMistake.unit_name}` : ''}
                    </span>
                  )}
                </div>

                {currentMeta && currentMeta.history.length > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <Clock size={12} />
                    <span>歷程：</span>
                    {currentMeta.history.slice(-4).map((h, i, arr) => (
                      <span key={h.timestamp + '-' + i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span>{h.date.slice(5)} {h.familiarityName}</span>
                        {i < arr.length - 1 && <ArrowRight size={11} />}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Question */}
              <div style={{ padding: '16px 18px', borderRadius: '10px', backgroundColor: 'var(--bg-primary, #FAF7F0)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentMistake.title}
                </h4>
                {content.qText && (
                  <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-body)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {content.qText}
                  </p>
                )}
                {content.qImgs.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {content.qImgs.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`題目圖 ${idx + 1}`}
                        style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', border: '1px solid var(--glass-border)', objectFit: 'contain' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Answer Reveal */}
              {!showAnswer ? (
                <button
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className="btn btn-secondary"
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1.5px dashed #D97706',
                    backgroundColor: '#FFFBEB',
                    color: '#92400E',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  data-testid="review-reveal-answer-btn"
                >
                  <Eye size={17} />
                  <span>我已作答，展開答案與詳解</span>
                </button>
              ) : (
                <div style={{ padding: '16px 18px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1.5px solid #10B981', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#047857' }}>答案與完整解析</div>
                  {content.aText ? (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#1C1917', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {content.aText}
                    </p>
                  ) : (
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>（此題尚未填寫文字解析）</span>
                  )}
                  {content.aImgs.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {content.aImgs.map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt={`詳解圖 ${idx + 1}`}
                          style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', border: '1px solid #10B981', objectFit: 'contain' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Rating Footer */}
        {!isFinished && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--glass-border)',
              backgroundColor: 'var(--bg-primary, #FAF7F0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flexShrink: 0
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>
              {saving ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 size={14} className="animate-spin" /> 記錄複習進度中...
                </span>
              ) : (
                '請評估本次作答熟練度，系統將自動安排下次複習日期：'
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {ratingButtons.map(btn => (
                <button
                  key={btn.name}
                  type="button"
                  disabled={saving}
                  onClick={() => handleRate(btn.name)}
                  data-testid={`review-rate-${btn.name}`}
                  style={{
                    padding: '9px 6px',
                    borderRadius: '9px',
                    border: `1.5px solid ${btn.border}`,
                    backgroundColor: btn.bg,
                    color: btn.color,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>{btn.name}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.9 }}>{btn.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
