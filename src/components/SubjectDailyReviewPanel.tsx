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
import { GoldCornerOrnaments } from './PobiDesignElements';
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
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Check
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
  const [draftDays, setDraftDays] = useState<Record<CanonicalFamiliarityKey, string>>(() => {
    const initial = getSubjectReviewSchedule(subjectId);
    return {
      不會: initial['不會'] === null ? '' : String(initial['不會']),
      卡: initial['卡'] === null ? '' : String(initial['卡']),
      誤解: initial['誤解'] === null ? '' : String(initial['誤解']),
      順: initial['順'] === null ? '' : String(initial['順'])
    };
  });
  const [scheduleVersion, setScheduleVersion] = useState(0);
  // Default: only show the 2 step buttons (1. 選擇範圍 / 2. 開始複習), with schedule collapsed
  const [activeReviewStep, setActiveReviewStep] = useState<'scope' | 'start' | null>(null);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);

  const syncDraftsFromSchedule = (next: SubjectFamiliaritySchedule) => {
    setDraftDays({
      不會: next['不會'] === null ? '' : String(next['不會']),
      卡: next['卡'] === null ? '' : String(next['卡']),
      誤解: next['誤解'] === null ? '' : String(next['誤解']),
      順: next['順'] === null ? '' : String(next['順'])
    });
  };

  useEffect(() => {
    const loaded = getSubjectReviewSchedule(subjectId);
    setSchedule(loaded);
    syncDraftsFromSchedule(loaded);
    setActiveReviewStep(null);
    setShowScheduleEditor(false);
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
    setDraftDays(prev => ({
      ...prev,
      [key]: value === null ? '' : String(value)
    }));
  };

  const handleDraftDaysChange = (key: CanonicalFamiliarityKey, rawInput: string) => {
    const digitsOnly = rawInput.replace(/[^\d]/g, '');
    setDraftDays(prev => ({ ...prev, [key]: digitsOnly }));
    if (digitsOnly !== '') {
      const parsed = parseInt(digitsOnly, 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        setSchedule(prev => ({ ...prev, [key]: parsed }));
      }
    }
  };

  const handleSaveSchedule = () => {
    const nextSchedule: SubjectFamiliaritySchedule = { ...schedule };
    for (const meta of FAMILIARITY_SCHEDULE_META) {
      if (nextSchedule[meta.key] !== null) {
        const raw = (draftDays[meta.key] || '').trim();
        const parsed = parseInt(raw, 10);
        if (!raw || !Number.isFinite(parsed) || parsed < 1) {
          showToast(`請為「${meta.label}」輸入大於 0 的間隔天數，或切換為「不再複習」`, 'error');
          return;
        }
        nextSchedule[meta.key] = parsed;
      }
    }
    const saved = saveSubjectReviewSchedule(subjectId, nextSchedule);
    setSchedule(saved);
    syncDraftsFromSchedule(saved);
    setScheduleVersion(v => v + 1);
    onScheduleChanged?.();
    showToast(`已儲存《${subjectName}》的熟悉度複習排程設定`, 'success');
  };

  const handleResetSchedule = () => {
    const defaults = resetSubjectReviewSchedule(subjectId);
    setSchedule(defaults);
    syncDraftsFromSchedule(defaults);
    setScheduleVersion(v => v + 1);
    onScheduleChanged?.();
    showToast(`已恢復《${subjectName}》預設複習週期（1 / 3 / 5 / 14 天）`, 'info');
  };

  const scheduleSummaryText = useMemo(() => {
    return FAMILIARITY_SCHEDULE_META.map(meta => {
      const v = schedule[meta.key];
      return `${meta.label} ${v === null ? '不再複習' : `${v}天`}`;
    }).join(' · ');
  }, [schedule]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        flex: 1,
        minHeight: 'calc(100dvh - 280px)'
      }}
      data-testid="subject-daily-review-panel"
    >
      {/* Main POBI Daily Review Editorial Stage */}
      <section
        className="glass pobi-engineering-grid"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '24px 24px 22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          borderTop: '2px solid rgba(200, 154, 80, 0.55)'
        }}
      >
        <GoldCornerOrnaments size={42} inset={6} opacity={0.58} corners={['tl', 'tr', 'bl', 'br']} />

        {/* POBI Mascot Compact Header */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            backgroundColor: 'var(--warning-bg)',
            border: '1.5px solid var(--warning-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              width: '62px',
              height: '62px',
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
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} /> 比熊 POBI 的每日閃卡複習室
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              汪！今天在《{subjectName}》裡面，先挑選範圍或直接開始閃卡複習吧！
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' }}>
              目前預設全選範圍共 {selectedScopeMistakes.length} 題，今日到期 {selectedDueMistakes.length} 題。
            </div>
          </div>
        </div>

        {/* Two Primary Step Buttons (Default View: 1. 選擇範圍 / 2. 開始複習) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px'
          }}
        >
          {/* Step Button 1: 選擇範圍 */}
          <button
            type="button"
            onClick={() => setActiveReviewStep(prev => (prev === 'scope' ? null : 'scope'))}
            data-testid="daily-review-step1-scope-btn"
            className={`pobi-mode-card ${activeReviewStep === 'scope' ? 'is-selected' : ''}`}
            style={{
              minHeight: '176px',
              padding: '22px 22px 18px 22px',
              borderRadius: '14px',
              border: activeReviewStep === 'scope' ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
              backgroundColor: activeReviewStep === 'scope' ? 'var(--warning-bg)' : 'var(--bg-primary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              boxShadow: activeReviewStep === 'scope' ? '0 8px 20px rgba(217, 119, 6, 0.16)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '11px',
                    backgroundColor: activeReviewStep === 'scope' ? 'var(--accent-secondary)' : 'var(--glass-highlight)',
                    color: activeReviewStep === 'scope' ? '#FFFFFF' : 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Folder size={21} />
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: activeReviewStep === 'scope' ? '1px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                    backgroundColor: activeReviewStep === 'scope' ? 'var(--accent-secondary)' : 'var(--bg-secondary)',
                    color: activeReviewStep === 'scope' ? '#FFFFFF' : 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {activeReviewStep === 'scope' && <Check size={12} />}
                  <span>{activeReviewStep === 'scope' ? '調整中（點此收合）' : '點此展開範圍'}</span>
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.08rem', color: 'var(--text-primary)' }}>
                  1. 選擇範圍
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.6 }}>
                  預設已全選本科所有章節與小單元；點擊可自由勾選或調整本次要複習的章節範圍。
                </div>
              </div>
            </div>
            <div
              style={{
                paddingTop: '10px',
                borderTop: '1px dashed var(--glass-border)',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: activeReviewStep === 'scope' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              目前已選 {selectedScopeMistakes.length} 題（含 {scopeStructure.groups.length} 個章節群組）
            </div>
          </button>

          {/* Step Button 2: 開始複習 */}
          <button
            type="button"
            onClick={() => setActiveReviewStep(prev => (prev === 'start' ? null : 'start'))}
            data-testid="daily-review-step2-start-btn"
            className={`pobi-mode-card ${activeReviewStep === 'start' ? 'is-selected' : ''}`}
            style={{
              minHeight: '176px',
              padding: '22px 22px 18px 22px',
              borderRadius: '14px',
              border: activeReviewStep === 'start' ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
              backgroundColor: activeReviewStep === 'start' ? 'var(--warning-bg)' : 'var(--bg-primary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              boxShadow: activeReviewStep === 'start' ? '0 8px 20px rgba(217, 119, 6, 0.16)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '11px',
                    backgroundColor: 'var(--accent-secondary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Play size={21} />
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: '1px solid var(--accent-secondary)',
                    backgroundColor: activeReviewStep === 'start' ? 'var(--accent-secondary)' : 'var(--warning-bg)',
                    color: activeReviewStep === 'start' ? '#FFFFFF' : 'var(--warning-text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {activeReviewStep === 'start' && <Check size={12} />}
                  <span>{activeReviewStep === 'start' ? '已展開啟動區' : '點此開始複習'}</span>
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.08rem', color: 'var(--text-primary)' }}>
                  2. 開始複習
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.6 }}>
                  啟動比熊 POBI 閃卡自測，可選擇只複習「今日到期題目」或直接重練已選範圍全部錯題。
                </div>
              </div>
            </div>
            <div
              style={{
                paddingTop: '10px',
                borderTop: '1px dashed var(--glass-border)',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--accent-secondary)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              今日到期 {selectedDueMistakes.length} 題 · 已選範圍全部 {selectedScopeMistakes.length} 題
            </div>
          </button>
        </div>

        {/* Expanded Panel for Step 1: Scope Checklist */}
        {activeReviewStep === 'scope' && (
          <div
            data-testid="daily-review-scope-panel"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RotateCcw size={16} style={{ color: 'var(--accent-secondary)' }} />
                  勾選本次複習範圍（預設全選）
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.79rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
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
              <div style={{ padding: '28px 16px', textAlign: 'center', borderRadius: '10px', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                《{subjectName}》目前尚無收錄任何錯題，請先切換到「查看錯題」新增題目。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                {scopeStructure.groups.map(group => {
                  const groupAllChecked = group.allKeys.every(k => selectedSet.has(k));
                  const groupSomeChecked = group.allKeys.some(k => selectedSet.has(k));
                  const groupDueCount = group.totalMistakes.filter(m => isMistakeDueForReview(m)).length;

                  return (
                    <div
                      key={group.chapterId || 'uncategorized'}
                      style={{
                        borderRadius: '10px',
                        border: groupSomeChecked ? '1.5px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                        backgroundColor: groupSomeChecked ? 'var(--warning-bg)' : 'var(--bg-secondary)',
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
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {groupAllChecked ? (
                            <CheckSquare size={17} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
                          ) : (
                            <Square size={17} style={{ color: groupSomeChecked ? 'var(--accent-secondary)' : 'var(--text-muted)', flexShrink: 0 }} />
                          )}
                          <Folder size={15} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
                          <span>{group.chapterName}</span>
                        </span>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: groupDueCount > 0 ? 'var(--accent-secondary)' : 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
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
                                  border: checked ? '1.5px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                                  backgroundColor: checked ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--glass-border)' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveReviewStep('start')}
                style={{ padding: '9px 18px', fontSize: '0.88rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>完成範圍選取，前往開始複習</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Expanded Panel for Step 2: Launch Flashcard Review */}
        {activeReviewStep === 'start' && (
          <div
            data-testid="daily-review-start-panel"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                選擇本次閃卡複習模式
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                範圍共 {selectedScopeMistakes.length} 題 · 今日到期 {selectedDueMistakes.length} 題
              </span>
            </div>

            {selectedScopeMistakes.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', borderRadius: '10px', border: '1px dashed var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.86rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span>目前尚未勾選任何題目範圍，請先點選「1. 選擇範圍」挑選章節。</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveReviewStep('scope')}
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                >
                  前往選擇範圍
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {selectedDueMistakes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onStartReview(selectedDueMistakes)}
                    data-testid="subject-start-due-flashcard-btn"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Play size={16} />
                    <span>複習今日到期題目（{selectedDueMistakes.length} 題）</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onStartReview(selectedScopeMistakes)}
                  data-testid="subject-start-all-flashcard-btn"
                  className={selectedDueMistakes.length === 0 ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <RotateCcw size={15} />
                  <span>
                    {selectedDueMistakes.length === 0
                      ? `開始 POBI 閃卡複習（共 ${selectedScopeMistakes.length} 題）`
                      : `練習已選範圍全部錯題（${selectedScopeMistakes.length} 題）`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Collapsible Per-Subject Familiarity Review Interval Settings (Pre-collapsed by Default) */}
      <div
        className="glass"
        style={{
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
        data-testid="subject-review-schedule-card"
      >
        <div
          onClick={() => setShowScheduleEditor(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} style={{ color: 'var(--accent-secondary)' }} />
              <span>《{subjectName}》熟悉度複習週期設定</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              目前週期：{scheduleSummaryText}（各科目獨立儲存，可設為「不再複習」）
            </p>
          </div>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setShowScheduleEditor(prev => !prev);
            }}
            data-testid="toggle-review-schedule-btn"
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            {showScheduleEditor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{showScheduleEditor ? '收合週期設定' : '展開週期設定'}</span>
          </button>
        </div>

        {showScheduleEditor && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--glass-border)' }}>
              {FAMILIARITY_SCHEDULE_META.map(meta => {
                const val = schedule[meta.key];
                const isNever = val === null;
                return (
                  <div
                    key={meta.key}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: `1.5px solid ${meta.accentBorder}55`,
                      backgroundColor: 'var(--bg-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div style={{ minWidth: '110px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        熟悉度：{meta.label}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{meta.desc}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateScheduleItem(meta.key, isNever ? 3 : val)}
                        data-testid={`schedule-mode-days-${meta.key}`}
                        className={!isNever ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.78rem',
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
                        className={isNever ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.78rem',
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
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="天數"
                            value={draftDays[meta.key]}
                            onChange={e => handleDraftDaysChange(meta.key, e.target.value)}
                            data-testid={`schedule-days-input-${meta.key}`}
                            className="input"
                            style={{
                              width: '74px',
                              height: '30px',
                              padding: '2px 8px',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              textAlign: 'center',
                              fontVariantNumeric: 'tabular-nums'
                            }}
                          />
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>天後</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
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
  );
}
