import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../utils/api';
import type { CategoriesBundle, CategoryItem } from '../types';
import {
  X,
  FolderTree,
  Folder,
  FolderOpen,
  FileText,
  GripVertical,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  CornerDownRight,
  BookOpen,
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

type DragPayload = {
  dimension: 'chapter' | 'unit';
  id: string;
  name: string;
  subjectId: string;
  parentId: string;
};

type DropIndicator = {
  targetDimension: 'subject' | 'chapter' | 'unit';
  targetId: string;
  placement: 'inside' | 'before' | 'after';
};

export default function HierarchyMoverModal({
  categories,
  initialSubjectId,
  focusedItem,
  onClose,
  onMoved
}: HierarchyMoverModalProps) {
  // Resolve initial expanded state
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    if (initialSubjectId) {
      map[initialSubjectId] = true;
    } else if (categories.subjects.length <= 3) {
      categories.subjects.forEach(s => {
        map[s.id] = true;
      });
    } else if (categories.subjects[0]) {
      map[categories.subjects[0].id] = true;
    }
    if (focusedItem) {
      if (focusedItem.dimension === 'chapter') {
        const ch = categories.chapters.find(c => c.id === focusedItem.id);
        const sId = ch?.subject_id || ch?.parent_id;
        if (sId) map[sId] = true;
      } else {
        const u = categories.units.find(x => x.id === focusedItem.id);
        const ch = categories.chapters.find(c => c.id === (u?.chapter_id || u?.parent_id));
        const sId = u?.subject_id || ch?.subject_id || ch?.parent_id;
        if (sId) map[sId] = true;
      }
    }
    return map;
  });

  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    // Expand all chapters in initial subject by default so units are immediately visible
    categories.chapters.forEach(c => {
      const sId = c.subject_id || c.parent_id;
      if (!initialSubjectId || sId === initialSubjectId) {
        map[c.id] = true;
      }
    });
    if (focusedItem?.dimension === 'unit') {
      const u = categories.units.find(x => x.id === focusedItem.id);
      const cId = u?.chapter_id || u?.parent_id;
      if (cId) map[cId] = true;
    }
    return map;
  });

  // Selected source for click-to-move (pre-populated when opened from an item's "搬運" button)
  const [selectedSource, setSelectedSource] = useState<{ dimension: 'chapter' | 'unit'; id: string } | null>(
    focusedItem || null
  );

  // Drag & Drop state
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [moving, setMoving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hoverExpandTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hoverExpandTimerRef.current) {
        window.clearTimeout(hoverExpandTimerRef.current);
      }
    };
  }, []);

  // Sort subjects so initialSubjectId appears first for convenience
  const orderedSubjects = useMemo(() => {
    const list = [...categories.subjects].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (!initialSubjectId) return list;
    const idx = list.findIndex(s => s.id === initialSubjectId);
    if (idx > 0) {
      const [cur] = list.splice(idx, 1);
      list.unshift(cur);
    }
    return list;
  }, [categories.subjects, initialSubjectId]);

  const chaptersBySubject = useMemo(() => {
    const map: Record<string, CategoryItem[]> = {};
    for (const ch of categories.chapters) {
      const sId = ch.subject_id || ch.parent_id || '';
      if (!map[sId]) map[sId] = [];
      map[sId].push(ch);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return map;
  }, [categories.chapters]);

  const unitsByChapter = useMemo(() => {
    const map: Record<string, CategoryItem[]> = {};
    for (const u of categories.units) {
      const cId = u.chapter_id || u.parent_id || '';
      if (!map[cId]) map[cId] = [];
      map[cId].push(u);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return map;
  }, [categories.units]);

  const selectedSourceItem = useMemo(() => {
    if (!selectedSource) return null;
    if (selectedSource.dimension === 'chapter') {
      return categories.chapters.find(c => c.id === selectedSource.id) || null;
    }
    return categories.units.find(u => u.id === selectedSource.id) || null;
  }, [selectedSource, categories.chapters, categories.units]);

  const scheduleAutoExpand = (kind: 'subject' | 'chapter', id: string) => {
    if (hoverExpandTimerRef.current) {
      window.clearTimeout(hoverExpandTimerRef.current);
    }
    hoverExpandTimerRef.current = window.setTimeout(() => {
      if (kind === 'subject') {
        setExpandedSubjects(prev => (prev[id] ? prev : { ...prev, [id]: true }));
      } else {
        setExpandedChapters(prev => (prev[id] ? prev : { ...prev, [id]: true }));
      }
    }, 450);
  };

  const clearAutoExpand = () => {
    if (hoverExpandTimerRef.current) {
      window.clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
    }
  };

  const executeMove = async (
    source: { dimension: 'chapter' | 'unit'; id: string; name: string },
    targetDimension: 'subject' | 'chapter' | 'unit',
    targetId: string,
    placement: 'inside' | 'before' | 'after' = 'inside'
  ) => {
    if (moving) return;
    if (source.dimension === targetDimension && source.id === targetId) return;

    // Prevent dropping a chapter into one of its own child units
    if (source.dimension === 'chapter' && targetDimension === 'unit') {
      const targetUnit = categories.units.find(u => u.id === targetId);
      if (targetUnit && (targetUnit.chapter_id === source.id || targetUnit.parent_id === source.id)) {
        setStatusMessage({ type: 'error', text: '不可將章節搬移至自己底下的子單元' });
        return;
      }
    }

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
          sourceDimension: source.dimension,
          sourceId: source.id,
          targetDimension,
          targetId,
          placement
        }
      });

      const moved = res.movedItem;
      if (moved) {
        // Expand destination so user immediately sees where the item landed
        setExpandedSubjects(prev => ({ ...prev, [moved.subject_id]: true }));
        if (moved.dimension === 'unit') {
          setExpandedChapters(prev => ({ ...prev, [moved.parent_id]: true }));
        }
        // Keep focus on the moved item at its new ID/dimension
        setSelectedSource({ dimension: moved.dimension, id: moved.id });

        let msg = '';
        if (source.dimension === 'unit' && moved.dimension === 'chapter') {
          const targetSubj = categories.subjects.find(s => s.id === moved.subject_id);
          msg = `已將單元「${source.name}」提升為「${targetSubj?.name || '科目'}」的章節`;
        } else if (source.dimension === 'chapter' && moved.dimension === 'unit') {
          const targetChap = categories.chapters.find(c => c.id === moved.parent_id);
          const extra = res.movedChildUnitCount ? `（原底下 ${res.movedChildUnitCount} 個子單元亦一併移入）` : '';
          msg = `已將章節「${source.name}」併入「${targetChap?.name || '目標章節'}」成為子單元${extra}`;
        } else if (moved.dimension === 'chapter') {
          const targetSubj = categories.subjects.find(s => s.id === moved.subject_id);
          msg = `已更新章節「${source.name}」至「${targetSubj?.name || '科目'}」`;
        } else {
          const targetChap = categories.chapters.find(c => c.id === moved.parent_id);
          msg = `已移動單元「${source.name}」至「${targetChap?.name || '章節'}」`;
        }
        setStatusMessage({ type: 'success', text: msg });

        await onMoved({
          sourceDimension: source.dimension,
          sourceId: source.id,
          sourceName: source.name,
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
      setDragging(null);
      setDropIndicator(null);
      clearAutoExpand();
    }
  };

  const getDropHintLabel = (ind: DropIndicator, drag: DragPayload): string => {
    if (drag.dimension === 'unit') {
      if (ind.targetDimension === 'subject') return '放開以提升為此科目的「章節」';
      if (ind.targetDimension === 'chapter') {
        if (ind.placement === 'inside') return '放開以移入此章節';
        return '放開以插入並提升為「章節」';
      }
      return ind.placement === 'before' ? '移至此單元上方' : '移至此單元下方';
    } else {
      if (ind.targetDimension === 'subject') return '放開以移至此科目';
      if (ind.targetDimension === 'chapter') {
        if (ind.placement === 'inside') return '放開以併入成為此章節的子單元';
        return ind.placement === 'before' ? '移至此章節上方' : '移至此章節下方';
      }
      return '放開以併入此章節成為子單元';
    }
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDropIndicator(null);
    clearAutoExpand();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100020,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !moving) onClose();
      }}
    >
      <div
        data-testid="hierarchy-mover-modal"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '86vh',
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
            padding: '18px 22px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'var(--bg-primary, #FAF7F0)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(217, 119, 6, 0.14)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FolderTree size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                章節與單元架構搬運
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                像 Google Drive 一樣自由拖曳至各層架構：將<strong>單元</strong>拖至科目列或章節間隙可<strong>提升為章節</strong>；將<strong>章節</strong>拖入其他章節中央可<strong>併入為子單元</strong>；亦支援跨科目搬移與排序。
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

        {/* Selected Item Quick-Action Bar */}
        {selectedSourceItem && selectedSource && (
          <div
            style={{
              padding: '10px 22px',
              backgroundColor: 'rgba(217, 119, 6, 0.08)',
              borderBottom: '1px solid rgba(217, 119, 6, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
              <Move size={15} style={{ color: '#B45309', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}>目前選取搬運：</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  color: '#92400E',
                  fontWeight: 700
                }}
              >
                {selectedSource.dimension === 'chapter' ? '章節' : '單元'} · {selectedSourceItem.name}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedSource.dimension === 'unit' && (
                <button
                  type="button"
                  disabled={moving}
                  onClick={() => {
                    const parentChap = categories.chapters.find(
                      c => c.id === (selectedSourceItem.chapter_id || selectedSourceItem.parent_id)
                    );
                    const targetSubjId =
                      selectedSourceItem.subject_id || parentChap?.subject_id || parentChap?.parent_id || initialSubjectId;
                    if (targetSubjId) {
                      executeMove(
                        { dimension: 'unit', id: selectedSourceItem.id, name: selectedSourceItem.name },
                        'subject',
                        targetSubjId,
                        'inside'
                      );
                    }
                  }}
                  className="btn btn-primary"
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  data-testid="quick-promote-unit-btn"
                >
                  <ArrowUpRight size={14} />
                  直接提升為章節
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedSource(null)}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              >
                取消選取
              </button>
            </div>
          </div>
        )}

        {/* Status Message Banner */}
        {statusMessage && (
          <div
            style={{
              padding: '9px 22px',
              backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              borderBottom: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              color: statusMessage.type === 'success' ? '#047857' : '#B91C1C',
              fontSize: '0.83rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tree Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative'
          }}
        >
          {moving && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.55)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 700,
                color: '#B45309'
              }}
            >
              <Loader2 size={20} className="animate-spin" />
              <span>正在同步架構與關聯錯題...</span>
            </div>
          )}

          {orderedSubjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              尚未建立任何科目，請先於書架新增科目。
            </div>
          ) : (
            orderedSubjects.map(subject => {
              const isSubjExpanded = !!expandedSubjects[subject.id];
              const subjChapters = chaptersBySubject[subject.id] || [];
              const isSubjDropInside =
                dragging &&
                dropIndicator?.targetDimension === 'subject' &&
                dropIndicator.targetId === subject.id;

              const canClickMoveToSubject =
                selectedSource &&
                selectedSourceItem &&
                (selectedSource.dimension === 'unit' ||
                  (selectedSource.dimension === 'chapter' &&
                    (selectedSourceItem.subject_id || selectedSourceItem.parent_id) !== subject.id));

              return (
                <div
                  key={subject.id}
                  style={{
                    borderRadius: '10px',
                    border: isSubjDropInside ? '2px solid #D97706' : '1px solid var(--glass-border)',
                    backgroundColor: isSubjDropInside ? 'rgba(254, 243, 199, 0.45)' : 'var(--bg-primary, #FAF7F0)',
                    transition: 'border-color 0.15s, background-color 0.15s',
                    overflow: 'hidden'
                  }}
                >
                  {/* SUBJECT ROW (Drop target for promoting units or moving chapters across subjects) */}
                  <div
                    data-testid={`mover-subject-${subject.id}`}
                    onDragOver={e => {
                      if (!dragging) return;
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      setDropIndicator({ targetDimension: 'subject', targetId: subject.id, placement: 'inside' });
                      if (!isSubjExpanded) scheduleAutoExpand('subject', subject.id);
                    }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        clearAutoExpand();
                      }
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!dragging) return;
                      executeMove(dragging, 'subject', subject.id, 'inside');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => setExpandedSubjects(prev => ({ ...prev, [subject.id]: !prev[subject.id] }))}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                        {isSubjExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <BookOpen size={16} style={{ color: '#B45309', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                        {subject.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)',
                          padding: '1px 7px',
                          borderRadius: '999px',
                          backgroundColor: 'var(--bg-secondary, #FFFFFF)',
                          border: '1px solid var(--glass-border)'
                        }}
                      >
                        {subjChapters.length} 章節
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {isSubjDropInside && dragging && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#92400E',
                            backgroundColor: '#FDE68A',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {getDropHintLabel(dropIndicator!, dragging)}
                        </span>
                      )}

                      {!dragging && canClickMoveToSubject && selectedSourceItem && selectedSource && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            executeMove(
                              { dimension: selectedSource.dimension, id: selectedSource.id, name: selectedSourceItem.name },
                              'subject',
                              subject.id,
                              'inside'
                            );
                          }}
                          className="btn btn-secondary"
                          style={{
                            padding: '3px 9px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#B45309',
                            borderColor: 'rgba(217, 119, 6, 0.45)',
                            backgroundColor: '#FFFBEB'
                          }}
                        >
                          {selectedSource.dimension === 'unit' ? '提升為此科目章節' : '移至此科目'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CHAPTERS LIST UNDER SUBJECT */}
                  {isSubjExpanded && (
                    <div
                      style={{
                        borderTop: '1px solid var(--glass-border)',
                        backgroundColor: 'var(--bg-secondary, #FFFFFF)',
                        padding: '8px 12px 10px 26px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      {subjChapters.length === 0 ? (
                        <div
                          onDragOver={e => {
                            if (!dragging) return;
                            e.preventDefault();
                            setDropIndicator({ targetDimension: 'subject', targetId: subject.id, placement: 'inside' });
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            if (!dragging) return;
                            executeMove(dragging, 'subject', subject.id, 'inside');
                          }}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px dashed var(--glass-border)',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)'
                          }}
                        >
                          此科目尚無章節，可將任意章節或單元拖曳至此
                        </div>
                      ) : (
                        subjChapters.map(chap => {
                          const chapUnits = unitsByChapter[chap.id] || [];
                          const isChapExpanded = !!expandedChapters[chap.id];
                          const isDraggingThisChap = dragging?.dimension === 'chapter' && dragging.id === chap.id;
                          const isSelectedThisChap = selectedSource?.dimension === 'chapter' && selectedSource.id === chap.id;

                          const chapDrop =
                            dragging &&
                            !isDraggingThisChap &&
                            dropIndicator?.targetDimension === 'chapter' &&
                            dropIndicator.targetId === chap.id
                              ? dropIndicator
                              : null;

                          const canClickMoveIntoChap =
                            selectedSource &&
                            selectedSourceItem &&
                            !(selectedSource.dimension === 'chapter' && selectedSource.id === chap.id) &&
                            !(selectedSource.dimension === 'unit' && (selectedSourceItem.chapter_id || selectedSourceItem.parent_id) === chap.id);

                          return (
                            <div key={chap.id} style={{ position: 'relative' }}>
                              {/* Top Insertion Line (before chapter) */}
                              {chapDrop?.placement === 'before' && dragging && (
                                <div
                                  style={{
                                    height: '3px',
                                    backgroundColor: '#D97706',
                                    borderRadius: '2px',
                                    marginBottom: '4px',
                                    position: 'relative'
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      right: '8px',
                                      top: '-11px',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      backgroundColor: '#D97706',
                                      color: '#FFFFFF',
                                      padding: '1px 7px',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    {getDropHintLabel(chapDrop, dragging)}
                                  </span>
                                </div>
                              )}

                              {/* CHAPTER ROW */}
                              <div
                                draggable={!moving}
                                data-testid={`mover-chapter-${chap.id}`}
                                onDragStart={e => {
                                  e.stopPropagation();
                                  e.dataTransfer.effectAllowed = 'move';
                                  e.dataTransfer.setData('text/plain', `chapter:${chap.id}`);
                                  setDragging({
                                    dimension: 'chapter',
                                    id: chap.id,
                                    name: chap.name,
                                    subjectId: subject.id,
                                    parentId: subject.id
                                  });
                                }}
                                onDragEnd={handleDragEnd}
                                onDragOver={e => {
                                  if (!dragging || isDraggingThisChap) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = 'move';

                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const ratio = (e.clientY - rect.top) / Math.max(rect.height, 1);
                                  let placement: 'before' | 'inside' | 'after' = 'inside';
                                  if (ratio < 0.25) placement = 'before';
                                  else if (ratio > 0.75) placement = 'after';

                                  setDropIndicator({
                                    targetDimension: 'chapter',
                                    targetId: chap.id,
                                    placement
                                  });
                                  if (placement === 'inside' && !isChapExpanded) {
                                    scheduleAutoExpand('chapter', chap.id);
                                  }
                                }}
                                onDragLeave={e => {
                                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                    clearAutoExpand();
                                  }
                                }}
                                onDrop={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!dragging || isDraggingThisChap) return;
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const ratio = (e.clientY - rect.top) / Math.max(rect.height, 1);
                                  let placement: 'before' | 'inside' | 'after' = 'inside';
                                  if (ratio < 0.25) placement = 'before';
                                  else if (ratio > 0.75) placement = 'after';
                                  executeMove(dragging, 'chapter', chap.id, placement);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border:
                                    chapDrop?.placement === 'inside'
                                      ? '2px solid #D97706'
                                      : isSelectedThisChap
                                        ? '1.5px solid #D97706'
                                        : '1px solid var(--glass-border)',
                                  backgroundColor:
                                    chapDrop?.placement === 'inside'
                                      ? 'rgba(254, 243, 199, 0.7)'
                                      : isSelectedThisChap
                                        ? '#FFFBEB'
                                        : 'var(--bg-primary, #FAF7F0)',
                                  opacity: isDraggingThisChap ? 0.45 : 1,
                                  cursor: 'grab',
                                  transition: 'background-color 0.12s, border-color 0.12s'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                                  <GripVertical size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setExpandedChapters(prev => ({ ...prev, [chap.id]: !prev[chap.id] }));
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: '2px',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title={isChapExpanded ? '收合子單元' : '展開子單元'}
                                  >
                                    {isChapExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                  </button>
                                  {isChapExpanded ? (
                                    <FolderOpen size={16} style={{ color: '#D97706', flexShrink: 0 }} />
                                  ) : (
                                    <Folder size={16} style={{ color: '#D97706', flexShrink: 0 }} />
                                  )}
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: '0.88rem',
                                      color: 'var(--text-primary)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {chap.name}
                                  </span>
                                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                    ({chapUnits.length} 單元 · {chap.mistake_count || 0} 題)
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                  {chapDrop?.placement === 'inside' && dragging && (
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: '#92400E',
                                        backgroundColor: '#FDE68A',
                                        padding: '2px 7px',
                                        borderRadius: '5px'
                                      }}
                                    >
                                      {getDropHintLabel(chapDrop, dragging)}
                                    </span>
                                  )}

                                  {!dragging && canClickMoveIntoChap && selectedSourceItem && selectedSource && (
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        executeMove(
                                          { dimension: selectedSource.dimension, id: selectedSource.id, name: selectedSourceItem.name },
                                          'chapter',
                                          chap.id,
                                          'inside'
                                        );
                                      }}
                                      className="btn btn-secondary"
                                      style={{
                                        padding: '3px 8px',
                                        fontSize: '0.73rem',
                                        fontWeight: 600,
                                        color: '#92400E',
                                        backgroundColor: '#FFFFFF'
                                      }}
                                    >
                                      {selectedSource.dimension === 'unit' ? '移入此章節' : '併入為子單元'}
                                    </button>
                                  )}

                                  {!dragging && !isSelectedThisChap && (
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setSelectedSource({ dimension: 'chapter', id: chap.id });
                                      }}
                                      className="btn btn-text"
                                      style={{ padding: '3px 7px', fontSize: '0.73rem', color: 'var(--text-secondary)' }}
                                      title="選取此章節以進行點擊搬運"
                                    >
                                      選取
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Bottom Insertion Line (after chapter) */}
                              {chapDrop?.placement === 'after' && dragging && (
                                <div
                                  style={{
                                    height: '3px',
                                    backgroundColor: '#D97706',
                                    borderRadius: '2px',
                                    marginTop: '4px',
                                    position: 'relative'
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      right: '8px',
                                      top: '-11px',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      backgroundColor: '#D97706',
                                      color: '#FFFFFF',
                                      padding: '1px 7px',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    {getDropHintLabel(chapDrop, dragging)}
                                  </span>
                                </div>
                              )}

                              {/* UNITS LIST UNDER CHAPTER */}
                              {isChapExpanded && chapUnits.length > 0 && (
                                <div
                                  style={{
                                    marginLeft: '24px',
                                    paddingLeft: '12px',
                                    marginTop: '4px',
                                    marginBottom: '6px',
                                    borderLeft: '2px solid rgba(217, 119, 6, 0.22)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                  }}
                                >
                                  {chapUnits.map(unit => {
                                    const isDraggingThisUnit = dragging?.dimension === 'unit' && dragging.id === unit.id;
                                    const isSelectedThisUnit = selectedSource?.dimension === 'unit' && selectedSource.id === unit.id;
                                    const unitDrop =
                                      dragging &&
                                      !isDraggingThisUnit &&
                                      !(dragging.dimension === 'chapter' && dragging.id === chap.id) &&
                                      dropIndicator?.targetDimension === 'unit' &&
                                      dropIndicator.targetId === unit.id
                                        ? dropIndicator
                                        : null;

                                    return (
                                      <div key={unit.id} style={{ position: 'relative' }}>
                                        {unitDrop?.placement === 'before' && dragging && (
                                          <div
                                            style={{
                                              height: '2.5px',
                                              backgroundColor: '#D97706',
                                              borderRadius: '2px',
                                              marginBottom: '3px'
                                            }}
                                          />
                                        )}

                                        <div
                                          draggable={!moving}
                                          data-testid={`mover-unit-${unit.id}`}
                                          onDragStart={e => {
                                            e.stopPropagation();
                                            e.dataTransfer.effectAllowed = 'move';
                                            e.dataTransfer.setData('text/plain', `unit:${unit.id}`);
                                            setDragging({
                                              dimension: 'unit',
                                              id: unit.id,
                                              name: unit.name,
                                              subjectId: subject.id,
                                              parentId: chap.id
                                            });
                                          }}
                                          onDragEnd={handleDragEnd}
                                          onDragOver={e => {
                                            if (!dragging || isDraggingThisUnit) return;
                                            if (dragging.dimension === 'chapter' && dragging.id === chap.id) return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.dataTransfer.dropEffect = 'move';

                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const placement = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
                                            setDropIndicator({
                                              targetDimension: 'unit',
                                              targetId: unit.id,
                                              placement
                                            });
                                          }}
                                          onDrop={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!dragging || isDraggingThisUnit) return;
                                            if (dragging.dimension === 'chapter' && dragging.id === chap.id) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const placement = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
                                            executeMove(dragging, 'unit', unit.id, placement);
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '8px',
                                            padding: '6px 10px',
                                            borderRadius: '7px',
                                            border: isSelectedThisUnit
                                              ? '1.5px solid #D97706'
                                              : '1px solid var(--glass-border)',
                                            backgroundColor: isSelectedThisUnit ? '#FFFBEB' : 'var(--bg-secondary, #FFFFFF)',
                                            opacity: isDraggingThisUnit ? 0.45 : 1,
                                            cursor: 'grab'
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                                            <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <CornerDownRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <FileText size={14} style={{ color: '#64748B', flexShrink: 0 }} />
                                            <span
                                              style={{
                                                fontSize: '0.84rem',
                                                fontWeight: isSelectedThisUnit ? 700 : 500,
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                              }}
                                            >
                                              {unit.name}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                              ({unit.mistake_count || 0} 題)
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            {!dragging && (
                                              <button
                                                type="button"
                                                disabled={moving}
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  executeMove(
                                                    { dimension: 'unit', id: unit.id, name: unit.name },
                                                    'subject',
                                                    subject.id,
                                                    'inside'
                                                  );
                                                }}
                                                className="btn btn-secondary"
                                                style={{
                                                  padding: '2px 8px',
                                                  fontSize: '0.72rem',
                                                  fontWeight: 600,
                                                  color: '#B45309',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '3px'
                                                }}
                                                title="將此單元直接提升為章節層級"
                                                data-testid={`promote-unit-${unit.id}`}
                                              >
                                                <ArrowUpRight size={12} />
                                                升為章節
                                              </button>
                                            )}

                                            {!dragging && !isSelectedThisUnit && (
                                              <button
                                                type="button"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  setSelectedSource({ dimension: 'unit', id: unit.id });
                                                }}
                                                className="btn btn-text"
                                                style={{ padding: '2px 7px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}
                                                title="選取此單元以移動至其他章節或科目"
                                              >
                                                選取
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {unitDrop?.placement === 'after' && dragging && (
                                          <div
                                            style={{
                                              height: '2.5px',
                                              backgroundColor: '#D97706',
                                              borderRadius: '2px',
                                              marginTop: '3px'
                                            }}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            所有搬運皆會自動同步關聯錯題的所屬科目、章節與單元，不遺失任何題目。
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={moving}
            className="btn btn-primary"
            style={{ padding: '7px 18px', fontSize: '0.85rem', fontWeight: 600 }}
          >
            完成搬運
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
