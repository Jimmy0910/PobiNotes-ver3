import { useState, useMemo } from 'react';
import { apiRequest } from '../utils/api';
import type { CategoriesBundle, MistakeRecord } from '../types';
import { extractMistakeMediaAndText } from '../utils/mistakeMedia';
import { useUiFeedback } from './UiFeedbackProvider';
import MistakeEditor from './MistakeEditor';
import {
  Inbox,
  CheckSquare,
  Square,
  FolderInput,
  Edit2,
  Trash2,
  Search,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface UncategorizedViewProps {
  categories: CategoriesBundle;
  allMistakes: MistakeRecord[];
  onRefreshAll: () => Promise<void>;
  onImageClick?: (src: string) => void;
}

export default function UncategorizedView({
  categories,
  allMistakes,
  onRefreshAll,
  onImageClick
}: UncategorizedViewProps) {
  const { showToast, confirmDialog } = useUiFeedback();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetSubjectId, setTargetSubjectId] = useState('');
  const [targetChapterId, setTargetChapterId] = useState('');
  const [targetUnitId, setTargetUnitId] = useState('');
  const [moving, setMoving] = useState(false);
  const [editingMistake, setEditingMistake] = useState<MistakeRecord | null>(null);

  const uncategorizedMistakes = useMemo(() => {
    const validSubjectIds = new Set(categories.subjects.map(s => s.id));
    const validChapterIds = new Set(categories.chapters.map(c => c.id));
    return allMistakes.filter(m => {
      const missingSubject = !m.subject_id || !validSubjectIds.has(m.subject_id);
      const missingChapter = !m.chapter_id || !validChapterIds.has(m.chapter_id);
      return missingSubject || missingChapter;
    });
  }, [allMistakes, categories.subjects, categories.chapters]);

  const visibleList = useMemo(() => {
    if (!search.trim()) return uncategorizedMistakes;
    const kw = search.trim().toLowerCase();
    return uncategorizedMistakes.filter(m => {
      const media = extractMistakeMediaAndText(m);
      return (
        (m.title || '').toLowerCase().includes(kw) ||
        media.qDesc.toLowerCase().includes(kw) ||
        media.aDesc.toLowerCase().includes(kw)
      );
    });
  }, [uncategorizedMistakes, search]);

  const targetChapters = useMemo(() => {
    if (!targetSubjectId) return [];
    return categories.chapters.filter(c => c.subject_id === targetSubjectId || c.parent_id === targetSubjectId);
  }, [categories.chapters, targetSubjectId]);

  const targetUnits = useMemo(() => {
    if (!targetChapterId) return [];
    return categories.units.filter(u => u.chapter_id === targetChapterId || u.parent_id === targetChapterId);
  }, [categories.units, targetChapterId]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleBatchAssign = async () => {
    if (selectedIds.length === 0) {
      showToast('請先勾選要歸類的錯題', 'info');
      return;
    }
    if (!targetSubjectId || !targetChapterId) {
      showToast('請選擇目標「科目」與「章節」以完成歸類', 'error');
      return;
    }
    setMoving(true);
    try {
      for (const id of selectedIds) {
        const m = allMistakes.find(x => x.id === id);
        if (!m) continue;
        await apiRequest('/api/mistakes', {
          method: 'PUT',
          body: {
            id: m.id,
            subjectId: targetSubjectId,
            chapterId: targetChapterId,
            unitId: targetUnitId || null
          }
        });
      }
      const count = selectedIds.length;
      setSelectedIds([]);
      await onRefreshAll();
      showToast(`已將 ${count} 道未分類錯題成功歸類！`, 'success');
    } catch (err: any) {
      showToast(err?.message || '歸類失敗', 'error');
    } finally {
      setMoving(false);
    }
  };

  const handleDeleteMistake = async (m: MistakeRecord) => {
    const ok = await confirmDialog({
      title: '刪除錯題確認',
      message: `確定要永久刪除未分類錯題「${m.title}」嗎？`,
      confirmText: '確認刪除',
      cancelText: '取消',
      danger: true
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/mistakes?id=${m.id}`, { method: 'DELETE' });
      setSelectedIds(prev => prev.filter(x => x !== m.id));
      await onRefreshAll();
      showToast(`已刪除「${m.title}」`, 'success');
    } catch (err: any) {
      showToast(err?.message || '刪除失敗', 'error');
    }
  };

  return (
    <div
      data-testid="uncategorized-view"
      style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
    >
      <div style={{ width: '100%', maxWidth: '1120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header */}
        <div
          className="glass"
          style={{
            padding: '18px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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
                backgroundColor: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                color: 'var(--warning-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Inbox size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                未分類區（暫存題庫）
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                所有尚未指定科目／章節，或刪除分類時保留下來的錯題皆集中於此（共 {uncategorizedMistakes.length} 題），可隨時一鍵歸類至目標錯題本。
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', minWidth: '220px', flex: '0 1 280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.86rem' }}
              placeholder="搜尋未分類題目..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Batch Reassign Toolbar */}
        {uncategorizedMistakes.length > 0 && (
          <div
            className="glass"
            style={{
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setSelectedIds(visibleList.map(m => m.id))}
              >
                全選 ({visibleList.length})
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setSelectedIds([])}
              >
                取消全選
              </button>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                已勾選 {selectedIds.length} 題
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <select
                className="input"
                style={{ width: 'auto', minWidth: '130px', height: '36px', padding: '4px 10px', fontSize: '0.84rem' }}
                value={targetSubjectId}
                onChange={e => {
                  setTargetSubjectId(e.target.value);
                  setTargetChapterId('');
                  setTargetUnitId('');
                }}
              >
                <option value="">選擇目標科目</option>
                {categories.subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                className="input"
                style={{ width: 'auto', minWidth: '130px', height: '36px', padding: '4px 10px', fontSize: '0.84rem' }}
                value={targetChapterId}
                onChange={e => {
                  setTargetChapterId(e.target.value);
                  setTargetUnitId('');
                }}
                disabled={!targetSubjectId}
              >
                <option value="">選擇目標章節</option>
                {targetChapters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {targetUnits.length > 0 && (
                <select
                  className="input"
                  style={{ width: 'auto', minWidth: '120px', height: '36px', padding: '4px 10px', fontSize: '0.84rem' }}
                  value={targetUnitId}
                  onChange={e => setTargetUnitId(e.target.value)}
                >
                  <option value="">小單元（選填）</option>
                  {targetUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                className="btn btn-primary"
                disabled={moving || selectedIds.length === 0 || !targetSubjectId || !targetChapterId}
                onClick={handleBatchAssign}
                data-testid="uncategorized-batch-assign-btn"
                style={{ padding: '7px 14px', fontSize: '0.84rem', fontWeight: 700 }}
              >
                {moving ? <Loader2 size={14} className="animate-spin" /> : <FolderInput size={15} />}
                <span>歸類到目標位置</span>
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {visibleList.length === 0 ? (
          <div
            className="glass"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <CheckCircle2 size={34} style={{ color: 'var(--success)' }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {uncategorizedMistakes.length === 0 ? '太棒了！目前沒有未分類錯題' : '找不到符合搜尋關鍵字的題目'}
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              當您刪除科目、章節或小單元並選擇「放到未分類區」時，相關錯題會安全保存在這裡等待重新整理。
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {visibleList.map(m => {
              const checked = selectedIds.includes(m.id);
              const media = extractMistakeMediaAndText(m);
              const allImgs = [
                ...media.qImages.map((src, i) => ({ src, tag: `題${media.qImages.length > 1 ? i + 1 : ''}`, isQ: true })),
                ...media.aImages.map((src, i) => ({ src, tag: `解${media.aImages.length > 1 ? i + 1 : ''}`, isQ: false }))
              ];

              return (
                <div
                  key={m.id}
                  onClick={() => toggleSelect(m.id)}
                  className="glass"
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: checked ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                      {checked ? (
                        <CheckSquare size={17} style={{ color: 'var(--accent-secondary)', flexShrink: 0, marginTop: '2px' }} />
                      ) : (
                        <Square size={17} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
                      )}
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {m.title}
                      </div>
                    </div>
                    <div style={{ display: 'inline-flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setEditingMistake(m)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                        title="編輯與歸類"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMistake(m)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                        title="刪除錯題"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '25px' }}>
                    <span className="pobi-tag-chip">
                      科目：{m.subject_name || '未分類'}
                    </span>
                    <span className="pobi-tag-chip">
                      章節：{m.chapter_name || '未分類'}
                    </span>
                    {m.familiarity_name && (
                      <span className="pobi-tag-chip">熟悉度：{m.familiarity_name}</span>
                    )}
                  </div>

                  {media.qDesc && (
                    <div style={{ paddingLeft: '25px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {media.qDesc}
                    </div>
                  )}

                  {allImgs.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingLeft: '25px' }} onClick={e => e.stopPropagation()}>
                      {allImgs.map((im, idx) => (
                        <div
                          key={idx}
                          onClick={() => onImageClick?.(im.src)}
                          style={{
                            position: 'relative',
                            width: '82px',
                            height: '62px',
                            borderRadius: '7px',
                            overflow: 'hidden',
                            border: `1.5px solid ${im.isQ ? '#D97706' : '#10B981'}`,
                            cursor: onImageClick ? 'zoom-in' : 'default'
                          }}
                        >
                          <img src={im.src} alt={im.tag} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <span style={{ position: 'absolute', left: '3px', bottom: '3px', fontSize: '0.64rem', fontWeight: 700, padding: '0 4px', borderRadius: '3px', backgroundColor: 'rgba(15, 23, 42, 0.82)', color: '#FFFFFF' }}>
                            {im.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingMistake && (
        <MistakeEditor
          categories={categories}
          initialSubjectId={editingMistake.subject_id}
          chapterId={editingMistake.chapter_id}
          initialUnitId={editingMistake.unit_id}
          mistake={editingMistake}
          onClose={() => setEditingMistake(null)}
          onSaveSuccess={async () => {
            setEditingMistake(null);
            await onRefreshAll();
          }}
          onImageClick={onImageClick}
        />
      )}
    </div>
  );
}
