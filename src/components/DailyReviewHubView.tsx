import { useState, useMemo, useEffect } from 'react';
import {
  type CategoriesBundle,
  type MistakeRecord,
  isMistakeDueForReview
} from '../types';
import SubjectDailyReviewPanel from './SubjectDailyReviewPanel';
import DailyReviewModal from './DailyReviewModal';
import { GoldCornerOrnaments } from './PobiDesignElements';
import { RotateCcw, BookOpen } from 'lucide-react';

interface DailyReviewHubViewProps {
  categories: CategoriesBundle;
  mistakes: MistakeRecord[];
  initialSubjectId?: string | null;
  onSelectSubject?: (subjectId: string) => void;
  onGoToBookshelf: () => void;
  onRefreshAll: () => Promise<void>;
  onUpdateMistake: (updated: MistakeRecord) => void;
}

export default function DailyReviewHubView({
  categories,
  mistakes,
  initialSubjectId,
  onSelectSubject,
  onGoToBookshelf,
  onRefreshAll,
  onUpdateMistake
}: DailyReviewHubViewProps) {
  const [scheduleTick, setScheduleTick] = useState(0);
  const [activeReviewQueue, setActiveReviewQueue] = useState<MistakeRecord[] | null>(null);

  const sortedSubjects = useMemo(() => {
    return [...categories.subjects].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories.subjects]);

  // Compute due count per subject
  const subjectStats = useMemo(() => {
    void scheduleTick;
    const map: Record<string, { total: number; due: number }> = {};
    for (const subj of sortedSubjects) {
      const subjMistakes = mistakes.filter(m => m.subject_id === subj.id);
      const due = subjMistakes.filter(m => isMistakeDueForReview(m)).length;
      map[subj.id] = { total: subjMistakes.length, due };
    }
    return map;
  }, [sortedSubjects, mistakes, scheduleTick]);

  const [activeSubjectId, setActiveSubjectId] = useState<string>(() => {
    if (initialSubjectId && sortedSubjects.some(s => s.id === initialSubjectId)) {
      return initialSubjectId;
    }
    const firstWithDue = sortedSubjects.find(s => (subjectStats[s.id]?.due || 0) > 0);
    return firstWithDue?.id || sortedSubjects[0]?.id || '';
  });

  useEffect(() => {
    if (!activeSubjectId || !sortedSubjects.some(s => s.id === activeSubjectId)) {
      const nextId =
        (initialSubjectId && sortedSubjects.some(s => s.id === initialSubjectId) && initialSubjectId) ||
        sortedSubjects.find(s => (subjectStats[s.id]?.due || 0) > 0)?.id ||
        sortedSubjects[0]?.id ||
        '';
      setActiveSubjectId(nextId);
    }
  }, [sortedSubjects, activeSubjectId, initialSubjectId, subjectStats]);

  const activeSubject = useMemo(
    () => sortedSubjects.find(s => s.id === activeSubjectId) || null,
    [sortedSubjects, activeSubjectId]
  );

  const activeSubjectMistakes = useMemo(
    () => (activeSubject ? mistakes.filter(m => m.subject_id === activeSubject.id) : []),
    [mistakes, activeSubject]
  );

  const totalDueAllSubjects = useMemo(
    () => Object.values(subjectStats).reduce((sum, item) => sum + item.due, 0),
    [subjectStats]
  );

  const handleChooseSubject = (id: string) => {
    setActiveSubjectId(id);
    onSelectSubject?.(id);
  };

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '20px 20px 40px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Top Header & Subject Selector */}
      <section
        className="glass"
        data-testid="daily-review-hub-header"
        style={{
          position: 'relative',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <GoldCornerOrnaments size={36} inset={5} opacity={0.5} corners={['tl', 'tr', 'bl', 'br']} />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <RotateCcw size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                每日複習中心
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                選擇科目後，勾選章節範圍即可展開 POBI 閃卡重測與各科獨立間隔設定
              </p>
            </div>
          </div>

          <span
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              backgroundColor: totalDueAllSubjects > 0 ? 'var(--warning-bg)' : 'var(--bg-secondary)',
              border: `1px solid ${totalDueAllSubjects > 0 ? 'var(--warning-border)' : 'var(--glass-border)'}`,
              color: totalDueAllSubjects > 0 ? 'var(--warning-text)' : 'var(--text-secondary)'
            }}
          >
            全科今日待複習：{totalDueAllSubjects} 題
          </span>
        </div>

        {/* Subject Pills */}
        {sortedSubjects.length > 0 && (
          <div
            data-testid="daily-review-subject-selector"
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            {sortedSubjects.map(subj => {
              const stat = subjectStats[subj.id] || { total: 0, due: 0 };
              const isSelected = subj.id === activeSubjectId;
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => handleChooseSubject(subj.id)}
                  data-testid={`daily-review-subject-${subj.id}`}
                  style={{
                    padding: '7px 13px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #D97706' : '1px solid var(--glass-border)',
                    backgroundColor: isSelected ? 'var(--warning-bg)' : 'var(--bg-primary)',
                    color: isSelected ? 'var(--warning-text)' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease'
                  }}
                >
                  <span>{subj.name}</span>
                  <span
                    style={{
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      padding: '1px 7px',
                      borderRadius: '999px',
                      backgroundColor: stat.due > 0 ? '#D97706' : 'var(--bg-secondary)',
                      color: stat.due > 0 ? '#FFFFFF' : 'var(--text-muted)'
                    }}
                  >
                    {stat.due > 0 ? `待複習 ${stat.due}` : `${stat.total} 題`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Subject Daily Review Panel or Empty State */}
      {activeSubject ? (
        <SubjectDailyReviewPanel
          subjectId={activeSubject.id}
          subjectName={activeSubject.name}
          categories={categories}
          subjectMistakes={activeSubjectMistakes}
          onStartReview={picked => setActiveReviewQueue(picked)}
          onScheduleChanged={() => setScheduleTick(t => t + 1)}
        />
      ) : (
        <div
          className="glass"
          style={{
            padding: '48px 24px',
            borderRadius: '14px',
            border: '1px solid var(--glass-border)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <BookOpen size={32} style={{ color: 'var(--text-muted)' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            尚未建立任何科目錯題本
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            請先回到「我的書架」建立錯題本並匯入錯題，即可在這裡進行每日閃卡複習。
          </p>
          <button type="button" className="btn btn-primary" onClick={onGoToBookshelf}>
            前往我的書架
          </button>
        </div>
      )}

      {/* Daily Review Flashcard Modal */}
      {activeReviewQueue && activeReviewQueue.length > 0 && (
        <DailyReviewModal
          dueMistakes={activeReviewQueue}
          categories={categories}
          onClose={() => setActiveReviewQueue(null)}
          onReviewUpdated={onUpdateMistake}
          onRefreshAll={onRefreshAll}
        />
      )}
    </div>
  );
}
