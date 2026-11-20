import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  type CategoriesBundle,
  type MistakeRecord,
  isMistakeDueForReview
} from '../types';
import { X, ArrowLeft, BookOpen, Folder, RotateCcw, Sparkles } from 'lucide-react';

interface PobiFlashcardGuideModalProps {
  categories: CategoriesBundle;
  mistakes: MistakeRecord[];
  initialSubjectId?: string | null;
  onClose: () => void;
  onStartReview: (selectedMistakes: MistakeRecord[]) => void;
}

export default function PobiFlashcardGuideModal({
  categories,
  mistakes,
  initialSubjectId = null,
  onClose,
  onStartReview
}: PobiFlashcardGuideModalProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId);

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

  const selectedSubject = useMemo(() => {
    return categories.subjects.find(s => s.id === selectedSubjectId) || null;
  }, [categories.subjects, selectedSubjectId]);

  const subjectMistakes = useMemo(() => {
    if (!selectedSubjectId) return [];
    return mistakes.filter(m => m.subject_id === selectedSubjectId);
  }, [mistakes, selectedSubjectId]);

  const subjectDueMistakes = useMemo(() => {
    return subjectMistakes.filter(m => isMistakeDueForReview(m));
  }, [subjectMistakes]);

  const subjectChapters = useMemo(() => {
    if (!selectedSubjectId) return [];
    return categories.chapters
      .filter(c => c.subject_id === selectedSubjectId || c.parent_id === selectedSubjectId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories.chapters, selectedSubjectId]);

  const pobiMessage = !selectedSubject
    ? '汪！歡迎來到閃卡複習模式，我是比熊 POBI！請問今天想要複習哪一個科目的錯題呢？'
    : `太棒了！在《${selectedSubject.name}》裡面，今天想複習哪一個章節，或是直接挑戰今日排程待複習題目呢？`;

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
        zIndex: 100035,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-testid="pobi-flashcard-guide-modal"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: 'min(86dvh, 86vh)',
          backgroundColor: 'var(--bg-secondary, #FFFFFF)',
          color: 'var(--text-primary, #1C1917)',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header with Top-Right Close Button */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.96rem', color: '#92400E' }}>
            <RotateCcw size={17} />
            <span>POBI 閃卡複習小教練</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
            title="關閉視窗"
          >
            <X size={20} />
          </button>
        </div>

        {/* POBI Mascot Dialogue Bubble */}
        <div style={{ padding: '18px 20px 12px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', flexShrink: 0 }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: '2px solid #D97706',
              backgroundColor: '#FFFBEB',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(180, 83, 9, 0.16)'
            }}
          >
            <img src="/logo.png" alt="比熊 POBI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: '#1C1917',
              fontWeight: 500
            }}
          >
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#B45309', marginBottom: '3px' }}>
              比熊 POBI
            </div>
            {pobiMessage}
          </div>
        </div>

        {/* Interactive Selection Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!selectedSubject ? (
            <>
              {categories.subjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  目前尚未建立科目錯題本，請先於書架新增科目與錯題。
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {categories.subjects.map(subj => {
                    const subjList = mistakes.filter(m => m.subject_id === subj.id);
                    const dueCount = subjList.filter(m => isMistakeDueForReview(m)).length;
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => setSelectedSubjectId(subj.id)}
                        data-testid={`pobi-pick-subject-${subj.id}`}
                        style={{
                          padding: '13px 15px',
                          borderRadius: '10px',
                          border: '1px solid var(--glass-border)',
                          backgroundColor: 'var(--bg-primary, #FAF7F0)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <BookOpen size={17} style={{ color: '#B45309', flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {subj.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: dueCount > 0 ? '#B45309' : 'var(--text-muted)', flexShrink: 0 }}>
                          {dueCount > 0 ? `待複習 ${dueCount} 題` : `共 ${subjList.length} 題`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectId(null)}
                  className="btn btn-text"
                  style={{ padding: '4px 6px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}
                >
                  <ArrowLeft size={14} /> 重選科目
                </button>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  《{selectedSubject.name}》共 {subjectMistakes.length} 題
                </span>
              </div>

              {subjectMistakes.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', borderRadius: '10px', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  《{selectedSubject.name}》目前還沒有收錄錯題，先去錄入幾題吧！
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {subjectDueMistakes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onStartReview(subjectDueMistakes)}
                      data-testid="pobi-start-due-review-btn"
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1.5px solid #D97706',
                        backgroundColor: '#FFFBEB',
                        color: '#92400E',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} /> 優先複習：今日排程待複習題目
                      </span>
                      <span>{subjectDueMistakes.length} 題</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onStartReview(subjectMistakes)}
                    data-testid="pobi-start-all-subject-review-btn"
                    style={{
                      padding: '11px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--glass-border)',
                      backgroundColor: 'var(--bg-primary, #FAF7F0)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 600,
                      fontSize: '0.88rem'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={15} style={{ color: '#B45309' }} /> 全部章節一起複習
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subjectMistakes.length} 題</span>
                  </button>

                  {subjectChapters.map(chap => {
                    const chapMistakes = subjectMistakes.filter(m => m.chapter_id === chap.id);
                    return (
                      <button
                        key={chap.id}
                        type="button"
                        disabled={chapMistakes.length === 0}
                        onClick={() => onStartReview(chapMistakes)}
                        data-testid={`pobi-pick-chapter-${chap.id}`}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '9px',
                          border: '1px solid var(--glass-border)',
                          backgroundColor: '#FFFFFF',
                          color: chapMistakes.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                          cursor: chapMistakes.length === 0 ? 'not-allowed' : 'pointer',
                          opacity: chapMistakes.length === 0 ? 0.55 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.86rem',
                          fontWeight: 600
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <Folder size={15} style={{ color: '#D97706' }} /> {chap.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{chapMistakes.length} 題</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
