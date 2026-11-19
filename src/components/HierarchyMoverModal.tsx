import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../utils/api';
import type { CategoriesBundle } from '../types';
import {
  X,
  FolderTree,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Move
} from 'lucide-react';

export interface HierarchyMoveResult {
  sourceDimension: 'chapter' | 'unit';
  sourceId: string;
  sourceName: string;
  newDimension: 'chapter' | 'unit';
  newId: string;
  newSubjectId: string;
  newParentId: string;
  movedChildUnitCount?: number;
}

interface HierarchyMoverModalProps {
  categories: CategoriesBundle;
  initialSubjectId?: string | null;
  focusedItem?: { dimension: 'chapter' | 'unit'; id: string } | null;
  onClose: () => void;
  onMoved: (result: HierarchyMoveResult) => Promise<void> | void;
}

export default function HierarchyMoverModal({
  categories,
  initialSubjectId,
  focusedItem,
  onClose,
  onMoved
}: HierarchyMoverModalProps) {
  // Lock background scroll cleanly (including iPadOS / iOS Safari)
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Resolve initial source cascading dropdown values: Subject -> Chapter -> Unit (optional)
  const initialSource = useMemo(() => {
    if (focusedItem?.dimension === 'unit') {
      const u = categories.units.find(x => x.id === focusedItem.id);
      const ch = categories.chapters.find(c => c.id === (u?.chapter_id || u?.parent_id));
      const sId = u?.subject_id || ch?.subject_id || ch?.parent_id || initialSubjectId || categories.subjects[0]?.id || '';
      return {
        subjectId: sId,
        chapterId: ch?.id || u?.chapter_id || u?.parent_id || '',
        unitId: u?.id || ''
      };
    }
    if (focusedItem?.dimension === 'chapter') {
      const ch = categories.chapters.find(c => c.id === focusedItem.id);
      const sId = ch?.subject_id || ch?.parent_id || initialSubjectId || categories.subjects[0]?.id || '';
      return {
        subjectId: sId,
        chapterId: ch?.id || '',
        unitId: ''
      };
    }
    const defaultSubj = initialSubjectId || categories.subjects[0]?.id || '';
    const firstChap = categories.chapters.find(c => (c.subject_id || c.parent_id) === defaultSubj);
    return {
      subjectId: defaultSubj,
      chapterId: firstChap?.id || '',
      unitId: ''
    };
  }, [focusedItem, categories.subjects, categories.chapters, categories.units, initialSubjectId]);

  // Source cascading state
  const [srcSubjectId, setSrcSubjectId] = useState<string>(initialSource.subjectId);
  const [srcChapterId, setSrcChapterId] = useState<string>(initialSource.chapterId);
  const [srcUnitId, setSrcUnitId] = useState<string>(initialSource.unitId);

  // Target cascading state: Subject / Chapter (empty = chapter level under subject) / Unit (optional anchor for ordering)
  const [tgtSubjectId, setTgtSubjectId] = useState<string>(initialSource.subjectId);
  const [tgtChapterId, setTgtChapterId] = useState<string>('');
  const [tgtUnitId, setTgtUnitId] = useState<string>('');

  const [moving, setMoving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sorted subjects
  const sortedSubjects = useMemo(() => {
    return [...categories.subjects].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories.subjects]);

  // Source cascading lists
  const srcChapters = useMemo(() => {
    return categories.chapters
      .filter(c => (c.subject_id || c.parent_id) === srcSubjectId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories.chapters, srcSubjectId]);

  const srcUnits = useMemo(() => {
    if (!srcChapterId) return [];
    return categories.units
      .filter(u => (u.chapter_id || u.parent_id) === srcChapterId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories.units, srcChapterId]);

  // Active source item derived from cascading dropdowns
  const activeSource = useMemo(() => {
    if (srcUnitId) {
      const u = categories.units.find(x => x.id === srcUnitId);
      if (u) {
        return { dimension: 'unit' as const, id: u.id, item: u };
      }
    }
    if (srcChapterId) {
      const c = categories.chapters.find(x => x.id === srcChapterId);
      if (c) {
        return { dimension: 'chapter' as const, id: c.id, item: c };
      }
    }
    return null;
  }, [srcChapterId, srcUnitId, categories.chapters, categories.units]);

  // Count child units if moving a chapter
  const sourceChildUnitCount = useMemo(() => {
    if (activeSource?.dimension !== 'chapter') return 0;
    return categories.units.filter(u => (u.chapter_id || u.parent_id) === activeSource.id).length;
  }, [activeSource, categories.units]);

  // Target cascading lists
  const tgtChapters = useMemo(() => {
    return categories.chapters
      .filter(c => {
        if ((c.subject_id || c.parent_id) !== tgtSubjectId) return false;
        // Cannot place a chapter inside itself
        if (activeSource?.dimension === 'chapter' && c.id === activeSource.id) return false;
        return true;
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories.chapters, tgtSubjectId, activeSource]);

  const tgtUnits = useMemo(() => {
    if (!tgtChapterId) return [];
    return categories.units
      .filter(u => {
        if ((u.chapter_id || u.parent_id) !== tgtChapterId) return false;
        if (activeSource?.dimension === 'unit' && u.id === activeSource.id) return false;
        return true;
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories.units, tgtChapterId, activeSource]);

  // Compute human-readable move preview & validity
  const movePlan = useMemo(() => {
    if (!activeSource) {
      return { valid: false, reason: '請先選擇要搬運的章節或小單元', summary: '' };
    }
    if (!tgtSubjectId) {
      return { valid: false, reason: '請選擇目標科目', summary: '' };
    }

    const tgtSubj = categories.subjects.find(s => s.id === tgtSubjectId);
    const tgtChap = tgtChapterId ? categories.chapters.find(c => c.id === tgtChapterId) : null;
    const tgtUnit = tgtUnitId ? categories.units.find(u => u.id === tgtUnitId) : null;

    if (activeSource.dimension === 'unit') {
      if (!tgtChapterId) {
        return {
          valid: true,
          targetDimension: 'subject' as const,
          targetId: tgtSubjectId,
          placement: 'inside' as const,
          isPromotion: true,
          summary: `將小單元「${activeSource.item.name}」提升為「${tgtSubj?.name || '目標科目'}」底下的「章節」`
        };
      }
      if (tgtUnit) {
        return {
          valid: true,
          targetDimension: 'unit' as const,
          targetId: tgtUnit.id,
          placement: 'before' as const,
          isPromotion: false,
          summary: `將小單元「${activeSource.item.name}」移至「${tgtSubj?.name || ''} / ${tgtChap?.name || ''}」，並排在「${tgtUnit.name}」之前`
        };
      }
      const currentChapId = activeSource.item.chapter_id || activeSource.item.parent_id;
      if (currentChapId === tgtChapterId) {
        return {
          valid: false,
          reason: '此小單元目前已經在該章節底下，請選擇其他目標科目／章節，或選擇小單元以調整排序',
          summary: ''
        };
      }
      return {
        valid: true,
        targetDimension: 'chapter' as const,
        targetId: tgtChapterId,
        placement: 'inside' as const,
        isPromotion: false,
        summary: `將小單元「${activeSource.item.name}」移入「${tgtSubj?.name || ''} / ${tgtChap?.name || ''}」底下`
      };
    }

    // Moving a chapter
    if (!tgtChapterId) {
      const currentSubjId = activeSource.item.subject_id || activeSource.item.parent_id;
      if (currentSubjId === tgtSubjectId) {
        return {
          valid: false,
          reason: '此章節目前已經在該科目底下，請選擇其他科目，或選擇目標章節將其併入為小單元',
          summary: ''
        };
      }
      return {
        valid: true,
        targetDimension: 'subject' as const,
        targetId: tgtSubjectId,
        placement: 'inside' as const,
        isPromotion: false,
        summary: `將章節「${activeSource.item.name}」移至「${tgtSubj?.name || '目標科目'}」底下`
      };
    }

    if (tgtUnit) {
      return {
        valid: true,
        targetDimension: 'unit' as const,
        targetId: tgtUnit.id,
        placement: 'before' as const,
        isPromotion: false,
        summary: `將章節「${activeSource.item.name}」併入「${tgtSubj?.name || ''} / ${tgtChap?.name || ''}」成為小單元（排在「${tgtUnit.name}」之前）`
      };
    }

    return {
      valid: true,
      targetDimension: 'chapter' as const,
      targetId: tgtChapterId,
      placement: 'inside' as const,
      isPromotion: false,
      summary: `將章節「${activeSource.item.name}」併入「${tgtSubj?.name || ''} / ${tgtChap?.name || ''}」底下成為小單元`
    };
  }, [activeSource, tgtSubjectId, tgtChapterId, tgtUnitId, categories.subjects, categories.chapters, categories.units]);

  const executeMove = async (
    targetDimension: 'subject' | 'chapter' | 'unit',
    targetId: string,
    placement: 'inside' | 'before' | 'after'
  ) => {
    if (!activeSource || moving) return;
    setMoving(true);
    setStatusMessage(null);
    try {
      const res = await apiRequest<{
        success: boolean;
        movedItem: {
          id: string;
          dimension: 'chapter' | 'unit';
          parent_id: string;
          subject_id: string;
          name: string;
        };
        movedChildUnitCount?: number;
      }>('/api/categories', {
        method: 'PUT',
        body: {
          action: 'move_hierarchy',
          sourceDimension: activeSource.dimension,
          sourceId: activeSource.id,
          targetDimension,
          targetId,
          placement
        }
      });

      const moved = res.movedItem;
      if (moved) {
        // Sync dropdown selections to the moved item's new location
        setSrcSubjectId(moved.subject_id);
        if (moved.dimension === 'chapter') {
          setSrcChapterId(moved.id);
          setSrcUnitId('');
        } else {
          setSrcChapterId(moved.parent_id);
          setSrcUnitId(moved.id);
        }
        setTgtSubjectId(moved.subject_id);
        setTgtChapterId('');
        setTgtUnitId('');

        let msg = '';
        if (activeSource.dimension === 'unit' && moved.dimension === 'chapter') {
          const targetSubj = categories.subjects.find(s => s.id === moved.subject_id);
          msg = `已將小單元「${activeSource.item.name}」提升為「${targetSubj?.name || '科目'}」的章節`;
        } else if (activeSource.dimension === 'chapter' && moved.dimension === 'unit') {
          const targetChap = categories.chapters.find(c => c.id === moved.parent_id);
          const extra = res.movedChildUnitCount ? `（原底下 ${res.movedChildUnitCount} 個小單元亦一併移入）` : '';
          msg = `已將章節「${activeSource.item.name}」併入「${targetChap?.name || '目標章節'}」成為小單元${extra}`;
        } else if (moved.dimension === 'chapter') {
          const targetSubj = categories.subjects.find(s => s.id === moved.subject_id);
          msg = `已將章節「${activeSource.item.name}」移至「${targetSubj?.name || '科目'}」`;
        } else {
          const targetChap = categories.chapters.find(c => c.id === moved.parent_id);
          msg = `已將小單元「${activeSource.item.name}」移至「${targetChap?.name || '目標章節'}」`;
        }
        setStatusMessage({ type: 'success', text: msg });

        await onMoved({
          sourceDimension: activeSource.dimension,
          sourceId: activeSource.id,
          sourceName: activeSource.item.name,
          newDimension: moved.dimension,
          newId: moved.id,
          newSubjectId: moved.subject_id,
          newParentId: moved.parent_id,
          movedChildUnitCount: res.movedChildUnitCount
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || '搬運失敗，請稍後再試' });
    } finally {
      setMoving(false);
    }
  };

  const handleConfirmMove = () => {
    if (!movePlan.valid || !movePlan.targetDimension || !movePlan.targetId) return;
    executeMove(movePlan.targetDimension, movePlan.targetId, movePlan.placement || 'inside');
  };

  const handleQuickPromoteUnit = () => {
    if (!activeSource || activeSource.dimension !== 'unit') return;
    const parentChap = categories.chapters.find(
      c => c.id === (activeSource.item.chapter_id || activeSource.item.parent_id)
    );
    const targetSubjId =
      activeSource.item.subject_id || parentChap?.subject_id || parentChap?.parent_id || tgtSubjectId;
    if (!targetSubjId) return;
    executeMove('subject', targetSubjId, 'inside');
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
        zIndex: 100020,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px',
        boxSizing: 'border-box',
        overscrollBehavior: 'contain',
        overflow: 'hidden'
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !moving) onClose();
      }}
    >
      <div
        data-testid="hierarchy-mover-modal"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: 'min(88dvh, 88vh)',
          margin: 'auto',
          backgroundColor: 'var(--bg-secondary, #FFFFFF)',
          color: 'var(--text-primary, #1C1917)',
          borderRadius: '14px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                backgroundColor: 'rgba(217, 119, 6, 0.14)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FolderTree size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                章節與單元架構搬運
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.79rem', color: 'var(--text-secondary)' }}>
                透過「科目 / 章節 / 小單元」選單自由調整層級與所屬位置
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={moving}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
            title="關閉視窗"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              borderBottom: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              color: statusMessage.type === 'success' ? '#047857' : '#B91C1C',
              fontSize: '0.83rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Body (Scrollable if viewport is very short) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION 1: SOURCE ITEM (科目 / 章節 / 小單元) */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid var(--glass-border)',
              backgroundColor: 'var(--bg-primary, #FAF7F0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 700, color: '#92400E' }}>
                <Move size={15} />
                <span>步驟 1：選擇要搬運的項目</span>
              </div>
              {activeSource && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    color: '#92400E'
                  }}
                >
                  {activeSource.dimension === 'chapter' ? '章節' : '小單元'} · {activeSource.item.name}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              {/* Source Subject */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  1. 科目
                </label>
                <select
                  className="input"
                  data-testid="mover-src-subject"
                  style={{ padding: '8px 10px', fontSize: '0.85rem', width: '100%' }}
                  value={srcSubjectId}
                  onChange={e => {
                    const nextSubj = e.target.value;
                    setSrcSubjectId(nextSubj);
                    const firstCh = categories.chapters
                      .filter(c => (c.subject_id || c.parent_id) === nextSubj)
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
                    setSrcChapterId(firstCh?.id || '');
                    setSrcUnitId('');
                    setStatusMessage(null);
                  }}
                >
                  {sortedSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Chapter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  2. 章節
                </label>
                <select
                  className="input"
                  data-testid="mover-src-chapter"
                  style={{ padding: '8px 10px', fontSize: '0.85rem', width: '100%' }}
                  value={srcChapterId}
                  onChange={e => {
                    setSrcChapterId(e.target.value);
                    setSrcUnitId('');
                    setStatusMessage(null);
                  }}
                >
                  <option value="">-- 請選擇章節 --</option>
                  {srcChapters.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mistake_count || 0} 題)
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Unit (Optional) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  3. 小單元 (選填)
                </label>
                <select
                  className="input"
                  data-testid="mover-src-unit"
                  style={{ padding: '8px 10px', fontSize: '0.85rem', width: '100%' }}
                  value={srcUnitId}
                  disabled={!srcChapterId || srcUnits.length === 0}
                  onChange={e => {
                    setSrcUnitId(e.target.value);
                    setStatusMessage(null);
                  }}
                >
                  <option value="">
                    {!srcChapterId ? '-- 請先選章節 --' : srcUnits.length === 0 ? '-- 此章節無小單元 --' : '-- 搬運整個章節 --'}
                  </option>
                  {srcUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.mistake_count || 0} 題)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* One-click Promote Unit shortcut */}
            {activeSource?.dimension === 'unit' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  想直接將此小單元升級為同科目的獨立章節？
                </span>
                <button
                  type="button"
                  disabled={moving}
                  onClick={handleQuickPromoteUnit}
                  className="btn btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#B45309',
                    borderColor: 'rgba(217, 119, 6, 0.45)',
                    backgroundColor: '#FFFBEB',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  data-testid="quick-promote-unit-btn"
                >
                  <ArrowUpRight size={14} />
                  直接提升為章節
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: TARGET DESTINATION (科目 / 章節 / 小單元) */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1.5px solid rgba(217, 119, 6, 0.35)',
              backgroundColor: 'var(--bg-secondary, #FFFFFF)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <ArrowRight size={15} style={{ color: '#D97706' }} />
              <span>步驟 2：選擇要搬移到的目標位置</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              {/* Target Subject */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  1. 目標科目
                </label>
                <select
                  className="input"
                  data-testid="mover-tgt-subject"
                  style={{ padding: '8px 10px', fontSize: '0.85rem', width: '100%' }}
                  value={tgtSubjectId}
                  onChange={e => {
                    setTgtSubjectId(e.target.value);
                    setTgtChapterId('');
                    setTgtUnitId('');
                    setStatusMessage(null);
                  }}
                >
                  {sortedSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Chapter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  2. 目標章節 (不選則為章節層級)
                </label>
                <select
                  className="input"
                  data-testid="mover-tgt-chapter"
                  style={{ padding: '8px 10px', fontSize: '0.85rem', width: '100%' }}
                  value={tgtChapterId}
                  onChange={e => {
                    setTgtChapterId(e.target.value);
                    setTgtUnitId('');
                    setStatusMessage(null);
                  }}
                >
                  <option value="">
                    {activeSource?.dimension === 'unit'
                      ? '-- 提升為此科目的「章節」 --'
                      : '-- 設為此科目的「章節」 --'}
                  </option>
                  {tgtChapters.map(c => (
                    <option key={c.id} value={c.id}>
                      移入章節：{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Unit Position (Optional) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  3. 目標小單元排序 (選填)
                </label>
                <select
                  className="input"
                  data-testid="mover-tgt-unit"
                  style={{ padding: '8px 10px', fontSize: '0.85rem', width: '100%' }}
                  value={tgtUnitId}
                  disabled={!tgtChapterId || tgtUnits.length === 0}
                  onChange={e => {
                    setTgtUnitId(e.target.value);
                    setStatusMessage(null);
                  }}
                >
                  <option value="">
                    {!tgtChapterId
                      ? '-- 選擇目標章節後可選 --'
                      : tgtUnits.length === 0
                        ? '-- 排在章節內第一位 --'
                        : '-- 排在章節最後面 --'}
                  </option>
                  {tgtUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      排在「{u.name}」之前
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Child unit preservation note when demoting a chapter with sub-units */}
            {activeSource?.dimension === 'chapter' && tgtChapterId && sourceChildUnitCount > 0 && (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#92400E',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '7px',
                  padding: '8px 10px',
                  lineHeight: 1.5
                }}
              >
                提示：此章節底下包含 <strong>{sourceChildUnitCount}</strong> 個小單元，併入後會一併保留並移至目標章節底下，所有錯題皆不遺失。
              </div>
            )}
          </div>

          {/* PREVIEW BANNER */}
          <div
            style={{
              padding: '11px 14px',
              borderRadius: '9px',
              backgroundColor: movePlan.valid ? 'rgba(217, 119, 6, 0.08)' : 'rgba(148, 163, 184, 0.12)',
              border: `1px solid ${movePlan.valid ? 'rgba(217, 119, 6, 0.3)' : 'var(--glass-border)'}`,
              fontSize: '0.83rem',
              color: movePlan.valid ? '#92400E' : 'var(--text-secondary)',
              lineHeight: 1.5
            }}
          >
            {movePlan.valid ? (
              <>
                <strong>搬運預覽：</strong>
                {movePlan.summary}
              </>
            ) : (
              <span>{movePlan.reason}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            搬運時將自動同步所有關聯錯題。
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={moving}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.84rem' }}
            >
              關閉
            </button>
            <button
              type="button"
              onClick={handleConfirmMove}
              disabled={moving || !movePlan.valid}
              className="btn btn-primary"
              style={{
                padding: '7px 18px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              data-testid="confirm-hierarchy-move-btn"
            >
              {moving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>搬運中...</span>
                </>
              ) : (
                <span>確認搬運</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
