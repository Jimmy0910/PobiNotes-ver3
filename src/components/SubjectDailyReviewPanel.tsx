import { useState, useMemo, useEffect } from 'react';
import {
  type CategoriesBundle,
  type MistakeRecord,
  isMistakeDueForReview
} from '../types';
import {
  type SubjectFamiliaritySchedule,
  type CanonicalFamiliarityKey,
  FAMILIARITY_SCHEDULE_META,
  getSubjectReviewSchedule,
  saveSubjectReviewSchedule,
  resetSubjectReviewSchedule
} from '../utils/reviewSettings';
import { useUiFeedback } from './UiFeedbackProvider';
import {
  RotateCcw,
  CheckSquare,
  Square,
  Folder,
  FileText,
  Sliders,
  Sparkles,
  Play,
  Save,
  Ban,
  CalendarClock
} from 'lucide-react';

interface SubjectDailyReviewPanelProps {
  subjectId: string;
  subjectName: string;
  categories: CategoriesBundle;
  subjectMistakes: MistakeRecord[];
  onStartReview: (selectedMistakes: MistakeRecord[]) => void;
  onScheduleChanged?: () => void;
}

export default function SubjectDailyReviewPanel({
  subjectId,
  subjectName,
  categories,
  subjectMistakes,
  onStartReview,
  onScheduleChanged
}: SubjectDailyReviewPanelProps) {
  const { showToast } = useUiFeedback();

  // Per-subject familiarity review schedule state
  const [schedule, setSchedule] = useState<SubjectFamiliaritySchedule>(() =>
    getSubjectReviewSchedule(subjectId)
  );
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [showScheduleEditor, setShowScheduleEditor] = useState(true);

  useEffect(() => {
    setSchedule(getSubjectReviewSchedule(subjectId));
  }, [subjectId]);

  const subjectChapters = useMemo(() => {
    return categories.chapters
      .filter(c => c.subject_id === subjectId || c.parent_id === subjectId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories.chapters, subjectId]);

  // Build hierarchical scope keys: every chapter (and its units if any) + uncategorized
  const scopeStructure = useMemo(() => {
    const groups: Array<{
      chapterId: string | null;
      chapterName: string;
      units: Array<{ key: string; unitId: string | null; label: string; mistakes: MistakeRecord[] }>;
      allKeys: string[];
      totalMistakes: MistakeRecord[];
    }> = [];

    for (const chap of subjectChapters) {
      const chapMistakes = subjectMistakes.filter(m => m.chapter_id === chap.id);
      const chapUnits = categories.units
        .filter(u => u.chapter_id === chap.id || u.parent_id === chap.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      if (chapUnits.length === 0) {
        const key = `chap:${chap.id}`;
        groups.push({
          chapterId: chap.id,
          chapterName: chap.name,
          units: [],
          allKeys: [key],
          totalMistakes: chapMistakes
        });
      } else {
        const unitNodes: Array<{ key: string; unitId: string | null; label: string; mistakes: MistakeRecord[] }> = chapUnits.map(u => ({
          key: `unit:${u.id}`,
          unitId: u.id,
          label: u.name,
          mistakes: chapMistakes.filter(m => m.unit_id === u.id)
        }));
        const directMistakes = chapMistakes.filter(
          m => !m.unit_id || !chapUnits.some(u => u.id === m.unit_id)
        );
        if (directMistakes.length > 0) {
          unitNodes.push({
            key: `chap_direct:${chap.id}`,
            unitId: null,
            label: '未指定小單元',
            mistakes: directMistakes
          });
        }
        groups.push({
          chapterId: chap.id,
          chapterName: chap.name,
          units: unitNodes,
          allKeys: unitNodes.map(u => u.key),
          totalMistakes: chapMistakes
        });
      }
    }

    const uncategorizedMistakes = subjectMistakes.filter(
      m => !m.chapter_id || !subjectChapters.some(c => c.id === m.chapter_id)
    );
    if (uncategorizedMistakes.length > 0) {
      groups.push({
        chapterId: null,
        chapterName: '未分類章節',
        units: [],
        allKeys: ['uncategorized'],
        totalMistakes: uncategorizedMistakes
      });
    }

    const allScopeKeys = groups.flatMap(g => g.allKeys);
    return { groups, allScopeKeys };
  }, [subjectChapters, categories.units, subjectMistakes]);

  // Default ALL selected!
  const allScopeKeysSignature = useMemo(() => scopeStructure.allScopeKeys.join('|'), [scopeStructure.allScopeKeys]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => scopeStructure.allScopeKeys);

  // When subject or available scope keys change, ensure all new keys default to selected
  useEffect(() => {
    setSelectedKeys(allScopeKeysSignature ? allScopeKeysSignature.split('|') : []);
  }, [subjectId, allScopeKeysSignature]);

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const toggleSingleKey = (key: string) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleGroupKeys = (keys: string[]) => {
    const allChecked = keys.every(k => selectedSet.has(k));
    if (allChecked) {
      setSelectedKeys(prev => prev.filter(k => !keys.includes(k)));
    } else {
      setSelectedKeys(prev => Array.from(new Set([...prev, ...keys])));
    }
  };

  const selectAll = () => setSelectedKeys(scopeStructure.allScopeKeys);
  const clearAll = () => setSelectedKeys([]);

  // Compute selected mistakes based on checked chapters & sub-units
  const selectedScopeMistakes = useMemo(() => {
    const matchedIds = new Set<string>();
    const result: MistakeRecord[] = [];
    for (const group of scopeStructure.groups) {
      if (group.units.length === 0) {
        if (selectedSet.has(group.allKeys[0])) {
          for (const m of group.totalMistakes) {
            if (!matchedIds.has(m.id)) {
              matchedIds.add(m.id);
              result.push(m);
            }
          }
        }
      } else {
        for (const u of group.units) {
          if (selectedSet.has(u.key)) {
            for (const m of u.mistakes) {
              if (!matchedIds.has(m.id)) {
                matchedIds.add(m.id);
                result.push(m);
              }
            }
          }
        }
      }
    }
    return result;
  }, [scopeStructure.groups, selectedSet]);

  const selectedDueMistakes = useMemo(() => {
    // Depend on scheduleVersion so changes recalculate immediately
    void scheduleVersion;
    return selectedScopeMistakes.filter(m => isMistakeDueForReview(m));
  }, [selectedScopeMistakes, scheduleVersion]);

  const handleUpdateScheduleItem = (key: CanonicalFamiliarityKey, value: number | null) => {
    setSchedule(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSchedule = () => {
    const saved = saveSubjectReviewSchedule(subjectId, schedule);
    setSchedule(saved);
    setScheduleVersion(v => v + 1);
    onScheduleChanged?.();
    showToast(`已儲存《${subjectName}》的熟悉度複習排程設定`, 'success');
  };

  const handleResetSchedule = () => {
    const defaults = resetSubjectReviewSchedule(subjectId);
    setSchedule(defaults);
    setScheduleVersion(v => v + 1);
    onScheduleChanged?.();
    showToast(`已恢復《${subjectName}》預設複習週期（1 / 3 / 5 / 14 天）`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="subject-daily-review-panel">
      {/* POBI Mascot Conversational Header */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: '14px',
          backgroundColor: '#FFFBEB',
          border: '1.5px solid #F59E0B',
          boxShadow: '0 4px 14px rgba(180, 83, 9, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            border: '2.5px solid #D97706',
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(180, 83, 9, 0.18)'
          }}
        >
          <img
            src="/pobi-mascot.jpg"
            alt="比熊 POBI"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B45309', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> 比熊 POBI 的每日閃卡複習室
          </div>
          <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#1C1917', lineHeight: 1.55 }}>
            汪！今天在《{subjectName}》裡面，你想複習哪幾個章節與小單元呢？
          </div>
          <div style={{ fontSize: '0.82rem', color: '#57534E', marginTop: '4px', lineHeight: 1.5 }}>
            已為你預設全選所有章節與小單元；你也可以自由勾選範圍，或在下方調整《{subjectName}》專屬的熟悉度複習天數（包含設為「不再複習」）。
          </div>
        </div>
      </div>

      {/* Main Two-Column Responsive Layout: Scope Checklist + Per-Subject Familiarity Schedule */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          alignItems: 'start'
        }}
      >
        {/* Left Card: Chapter & Sub-unit Selection (Default All Selected) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 2px 10px rgba(60, 40, 20, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={17} style={{ color: '#B45309' }} />
                選擇本次複習範圍（預設全選）
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                已勾選範圍內共 {selectedScopeMistakes.length} 題，其中今日到期 {selectedDueMistakes.length} 題
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={selectAll}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 600 }}
                data-testid="review-select-all-btn"
              >
                全選
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 600 }}
                data-testid="review-clear-all-btn"
              >
                取消全選
              </button>
            </div>
          </div>

          {subjectMistakes.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', borderRadius: '10px', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              《{subjectName}》目前尚無收錄任何錯題，請先切換到「查看錯題」新增題目。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {scopeStructure.groups.map(group => {
                const groupAllChecked = group.allKeys.every(k => selectedSet.has(k));
                const groupSomeChecked = group.allKeys.some(k => selectedSet.has(k));
                const groupDueCount = group.totalMistakes.filter(m => isMistakeDueForReview(m)).length;

                return (
                  <div
                    key={group.chapterId || 'uncategorized'}
                    style={{
                      borderRadius: '10px',
                      border: groupSomeChecked ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                      backgroundColor: groupSomeChecked ? '#FFFBEB' : '#FAF7F0',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroupKeys(group.allKeys)}
                      data-testid={`review-chapter-toggle-${group.chapterId || 'uncategorized'}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', color: '#1C1917' }}>
                        {groupAllChecked ? (
                          <CheckSquare size={17} style={{ color: '#B45309', flexShrink: 0 }} />
                        ) : (
                          <Square size={17} style={{ color: groupSomeChecked ? '#D97706' : '#78716C', flexShrink: 0 }} />
                        )}
                        <Folder size={15} style={{ color: '#D97706', flexShrink: 0 }} />
                        <span>{group.chapterName}</span>
                      </span>
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: groupDueCount > 0 ? '#B45309' : '#78716C', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {groupDueCount > 0 ? `到期 ${groupDueCount} / 共 ${group.totalMistakes.length} 題` : `共 ${group.totalMistakes.length} 題`}
                      </span>
                    </button>

                    {/* Nested Sub-Units */}
                    {group.units.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '24px' }}>
                        {group.units.map(u => {
                          const checked = selectedSet.has(u.key);
                          const uDue = u.mistakes.filter(m => isMistakeDueForReview(m)).length;
                          return (
                            <button
                              key={u.key}
                              type="button"
                              onClick={() => toggleSingleKey(u.key)}
                              data-testid={`review-unit-toggle-${u.key}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                border: checked ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                                backgroundColor: checked ? '#FEF3C7' : '#FFFFFF',
                                color: checked ? '#92400E' : '#57534E',
                                fontSize: '0.78rem',
                                fontWeight: checked ? 700 : 500,
                                cursor: 'pointer'
                              }}
                            >
                              {checked ? <CheckSquare size={13} /> : <Square size={13} />}
                              <FileText size={12} />
                              <span>{u.label}</span>
                              <span style={{ opacity: 0.85 }}>
                                ({uDue > 0 ? `${uDue}/${u.mistakes.length}` : u.mistakes.length})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Launch Flashcard Review Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--glass-border)' }}>
            {selectedDueMistakes.length > 0 && (
              <button
                type="button"
                onClick={() => onStartReview(selectedDueMistakes)}
                data-testid="subject-start-due-flashcard-btn"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                  color: '#FFFFFF',
                  border: '1px solid #B45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Play size={16} />
                <span>開始 POBI 閃卡複習：今日到期題目（{selectedDueMistakes.length} 題）</span>
              </button>
            )}

            <button
              type="button"
              disabled={selectedScopeMistakes.length === 0}
              onClick={() => onStartReview(selectedScopeMistakes)}
              data-testid="subject-start-all-flashcard-btn"
              className={selectedDueMistakes.length === 0 ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: selectedScopeMistakes.length === 0 ? 0.5 : 1
              }}
            >
              <RotateCcw size={15} />
              <span>
                {selectedDueMistakes.length === 0
                  ? `開始 POBI 閃卡複習（已選範圍共 ${selectedScopeMistakes.length} 題）`
                  : `直接練習已選範圍全部錯題（${selectedScopeMistakes.length} 題）`}
              </span>
            </button>
          </div>
        </div>

        {/* Right Card: Per-Subject Familiarity Review Interval Settings */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 2px 10px rgba(60, 40, 20, 0.05)'
          }}
          data-testid="subject-review-schedule-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={17} style={{ color: '#B45309' }} />
                《{subjectName}》熟悉度複習週期設定
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                各科目獨立儲存；可設定幾天後再複習，或設為「不再複習」
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowScheduleEditor(prev => !prev)}
              className="btn btn-text"
              style={{ padding: '4px 8px', fontSize: '0.78rem' }}
            >
              {showScheduleEditor ? '收合' : '展開'}
            </button>
          </div>

          {showScheduleEditor && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {FAMILIARITY_SCHEDULE_META.map(meta => {
                  const val = schedule[meta.key];
                  const isNever = val === null;
                  return (
                    <div
                      key={meta.key}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `1.5px solid ${meta.accentBorder}45`,
                        backgroundColor: meta.accentBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ minWidth: '110px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: meta.accentColor }}>
                          熟悉度：{meta.label}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#57534E' }}>{meta.desc}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateScheduleItem(meta.key, isNever ? 3 : val)}
                          data-testid={`schedule-mode-days-${meta.key}`}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '7px',
                            border: !isNever ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                            backgroundColor: !isNever ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                            color: !isNever ? '#92400E' : '#57534E',
                            fontWeight: !isNever ? 700 : 500,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CalendarClock size={13} /> 間隔天數
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateScheduleItem(meta.key, null)}
                          data-testid={`schedule-mode-never-${meta.key}`}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '7px',
                            border: isNever ? '1.5px solid #64748B' : '1px solid var(--glass-border)',
                            backgroundColor: isNever ? '#334155' : 'rgba(255,255,255,0.6)',
                            color: isNever ? '#FFFFFF' : '#57534E',
                            fontWeight: isNever ? 700 : 500,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Ban size={13} /> 不再複習
                        </button>

                        {!isNever ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={val}
                              onChange={e => {
                                const parsed = parseInt(e.target.value, 10);
                                handleUpdateScheduleItem(
                                  meta.key,
                                  Number.isFinite(parsed) && parsed >= 1 ? Math.min(365, parsed) : 1
                                );
                              }}
                              data-testid={`schedule-days-input-${meta.key}`}
                              style={{
                                width: '62px',
                                height: '30px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                color: '#1C1917',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                textAlign: 'center'
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#44403C' }}>天後</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                            不列入排程
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleResetSchedule}
                  className="btn btn-secondary"
                  style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  恢復預設（1/3/5/14天）
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  data-testid="save-subject-schedule-btn"
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={15} />
                  <span>套用並儲存本科設定</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
