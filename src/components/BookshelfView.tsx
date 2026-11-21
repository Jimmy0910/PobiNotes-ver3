import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { CategoriesBundle, MistakeRecord } from '../types';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';
import SharePackModal from './SharePackModal';
import {
  parseNotebookStyle,
  serializeNotebookStyle,
  getNotebookPalette,
  getNotebookIcon,
  NOTEBOOK_COLOR_PALETTES,
  NOTEBOOK_ICONS
} from '../utils/notebookThemes';
import {
  Library,
  Plus,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Check,
  X,
  Sparkles,
  RotateCcw,
  Archive,
  ArrowRight,
  MoreVertical,
  Share2,
  Edit2,
  Trash2,
  Play
} from 'lucide-react';

interface BookshelfViewProps {
  categories: CategoriesBundle;
  mistakes: MistakeRecord[];
  onOpenNotebook: (subjectId: string) => void;
  onAddSubject: (name: string, colorStyle: string) => Promise<void>;
  onOpenGuideModal: () => void;
  onOpenFeedbackModal: () => void;
  onToggleTheme?: () => void;
  theme: 'dark' | 'light';
  currentUser?: { username: string; is_admin: number } | null;
  onOpenBatchImport?: () => void;
  onOpenDailyReview?: () => void;
  onOpenBackupRestore?: () => void;
  onOpenPobiTutorial?: () => void;
  onRefreshAll?: () => Promise<void>;
  dueReviewCount?: number;
}

export default function BookshelfView({
  categories,
  mistakes,
  onOpenNotebook,
  onAddSubject,
  onOpenGuideModal,
  onOpenFeedbackModal,
  theme,
  currentUser,
  onOpenBatchImport,
  onOpenDailyReview,
  onOpenBackupRestore,
  onOpenPobiTutorial,
  onRefreshAll,
  dueReviewCount = 0
}: BookshelfViewProps) {
  const { showToast, confirmDialog, promptDialog } = useUiFeedback();
  const [bookMenu, setBookMenu] = useState<{ subjectId: string; subjectName: string; x: number; y: number } | null>(null);
  const [shareSubject, setShareSubject] = useState<{ title: string; mistakes: MistakeRecord[] } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedPalette, setSelectedPalette] = useState('navy');
  const [selectedIcon, setSelectedIcon] = useState('BookOpen');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleBookClick = (subjectId: string) => {
    onOpenNotebook(subjectId);
  };

  const handleRenameSubject = async (subjectId: string, currentName: string) => {
    const nextName = await promptDialog({
      title: '重新命名錯題本',
      label: '請輸入新的科目名稱',
      defaultValue: currentName,
      confirmText: '儲存名稱'
    });
    if (!nextName || !nextName.trim() || nextName.trim() === currentName) return;
    try {
      await apiRequest('/api/subjects', {
        method: 'PUT',
        body: { id: subjectId, name: nextName.trim() }
      });
      await onRefreshAll?.();
      showToast(`已將錯題本重新命名為「${nextName.trim()}」`, 'success');
    } catch (err: any) {
      showToast(err?.message || '重新命名失敗', 'error');
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    const count = mistakes.filter(m => m.subject_id === subjectId).length;
    const ok = await confirmDialog({
      title: '刪除錯題本確認',
      message:
        count > 0
          ? `確定要刪除《${subjectName}》錯題本嗎？此本包含 ${count} 道錯題，刪除後錯題會安全保留為未分類。`
          : `確定要刪除《${subjectName}》錯題本嗎？`,
      confirmText: '確認刪除',
      cancelText: '取消',
      danger: true
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/subjects?id=${subjectId}&mode=unassign`, { method: 'DELETE' });
      await onRefreshAll?.();
      showToast(`已刪除《${subjectName}》錯題本`, 'success');
    } catch (err: any) {
      showToast(err?.message || '刪除失敗', 'error');
    }
  };

  // Calculate stats per subject
  const subjectStats = useMemo(() => {
    const statsMap: Record<string, { total: number; mastered: number; pct: number }> = {};
    categories.subjects.forEach(s => {
      statsMap[s.id] = { total: 0, mastered: 0, pct: 0 };
    });

    mistakes.forEach(m => {
      if (m.subject_id && statsMap[m.subject_id]) {
        statsMap[m.subject_id].total += 1;
        // Check if mastered
        const isMastered = m.familiarity_name?.includes('精熟') || 
                           m.familiarity_name?.includes('熟練') || 
                           m.familiarity_color === 'success';
        if (isMastered) {
          statsMap[m.subject_id].mastered += 1;
        }
      }
    });

    Object.keys(statsMap).forEach(k => {
      const item = statsMap[k];
      item.pct = item.total > 0 ? Math.round((item.mastered / item.total) * 100) : 0;
    });

    return statsMap;
  }, [categories.subjects, mistakes]);

  // Overall stats
  const totalMistakes = mistakes.length;
  const totalNotebooks = categories.subjects.length;
  const masteredCount = Object.values(subjectStats).reduce((sum, item) => sum + item.mastered, 0);

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMsg('請輸入錯題本名稱');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const colorStyle = serializeNotebookStyle(selectedPalette, selectedIcon);
      await onAddSubject(newTitle.trim(), colorStyle);
      setShowAddModal(false);
      setNewTitle('');
      setSelectedPalette('navy');
      setSelectedIcon('BookOpen');
    } catch (err: any) {
      setErrorMsg(err.message || '建立失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bookshelf-room animate-fade-in">
      {/* Top Navigation Bar */}
      <header className="bookshelf-header">
        <div className="bookshelf-title-group">
          <h1>
            <Library className="w-7 h-7 text-pobi-blue dark:text-blue-400" />
            數位錯題手帳書架
          </h1>
          <p>
            共收錄 {totalNotebooks} 本學科手帳，累計 {totalMistakes} 道錯題記錄{currentUser ? ` · 嗨，${currentUser.username}` : ''}
          </p>
        </div>

        <div className="bookshelf-actions">
          {onOpenBatchImport && (
            <button
              type="button"
              onClick={onOpenBatchImport}
              className="notebook-tool-btn"
              style={{
                backgroundColor: '#FDE68A',
                color: '#1C1917',
                borderColor: '#D97706',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(180, 83, 9, 0.2)'
              }}
              title="AI 考卷批次匯入與極速審核"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              AI 考卷批次匯入
            </button>
          )}

          <button
            type="button"
            onClick={onOpenGuideModal}
            className="notebook-tool-btn"
            title="系統導引手冊"
          >
            <HelpCircle className="w-4 h-4" />
            使用導引
          </button>

          <button
            type="button"
            onClick={onOpenFeedbackModal}
            className="notebook-tool-btn"
            title="意見回饋與評分"
          >
            <MessageSquare className="w-4 h-4" />
            帳號與回饋
          </button>

          {onOpenPobiTutorial && (
            <button
              type="button"
              onClick={onOpenPobiTutorial}
              className="notebook-tool-btn"
              title="重播 POBI 比熊互動教學"
              data-testid="bookshelf-pobi-tutorial-btn"
            >
              <Play className="w-4 h-4" />
              POBI 教學
            </button>
          )}

          {onOpenBackupRestore && (
            <button
              type="button"
              onClick={onOpenBackupRestore}
              className="notebook-tool-btn"
              title="一鍵完整備份與還原（JSON / ZIP）"
              data-testid="bookshelf-backup-btn"
            >
              <Archive className="w-4 h-4" />
              備份與還原
            </button>
          )}
        </div>
      </header>

      {/* Main Bookshelf Stage */}
      <main className="bookshelf-stage">
        {/* Spaced Repetition Daily Review Banner */}
        {onOpenDailyReview && mistakes.length > 0 && (
          <section
            data-testid="daily-review-banner"
            style={{
              marginBottom: '18px',
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: dueReviewCount > 0 ? '#FFFBEB' : 'var(--bg-secondary, #FFFFFF)',
              border: dueReviewCount > 0 ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
              boxShadow: '0 4px 14px rgba(60, 40, 20, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: dueReviewCount > 0 ? 'rgba(217, 119, 6, 0.16)' : 'rgba(16, 185, 129, 0.14)',
                  color: dueReviewCount > 0 ? '#B45309' : '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <RotateCcw size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1C1917' }}>
                  {dueReviewCount > 0
                    ? `今日待複習：${dueReviewCount} 題（間隔重複排程）`
                    : '今日排程複習已全部完成'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#57534E', marginTop: '2px' }}>
                  {dueReviewCount > 0
                    ? '依熟悉度自動排程（不會 1 天、卡 3 天、誤解 5 天、順 14 天），點此用閃卡模式快速重測。'
                    : '系統將依您每次的熟練度自動在下次到期時提醒複習。'}
                </div>
              </div>
            </div>

            {dueReviewCount > 0 && (
              <button
                type="button"
                onClick={onOpenDailyReview}
                className="btn btn-primary"
                style={{
                  padding: '9px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                  color: '#FFFFFF',
                  border: '1px solid #B45309'
                }}
                data-testid="start-daily-review-btn"
              >
                <span>開始今日複習</span>
                <ArrowRight size={15} />
              </button>
            )}
          </section>
        )}

        <section className={`shelf-unit ${theme === 'dark' ? 'shelf-unit-dark' : 'shelf-unit-light'}`}>
          <div className="shelf-books-row">
            {/* Subject Book Covers */}
            {categories.subjects.map((subject, index) => {
              const style = parseNotebookStyle(subject.color, subject.name);
              const palette = getNotebookPalette(style.paletteId);
              const IconComp = getNotebookIcon(style.iconId);
              const stats = subjectStats[subject.id] || { total: 0, mastered: 0, pct: 0 };

              return (
                <div
                  key={subject.id}
                  className="book-item-wrapper"
                  onClick={() => handleBookClick(subject.id)}
                  title={`點擊翻開《${subject.name}》錯題本主頁（查看錯題 / 每日複習 / 分析與工坊）`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleBookClick(subject.id);
                    }
                  }}
                >
                  <div
                    className="book-cover"
                    style={{
                      background: palette.coverTexture,
                      color: palette.textLight
                    }}
                  >
                    {/* Brass Corners */}
                    <div className="book-corner-brass book-corner-tr" />
                    <div className="book-corner-brass book-corner-br" />

                    {/* Ribbon Bookmark */}
                    <div
                      className="book-ribbon"
                      style={{ background: palette.accent }}
                    />

                    {/* Foil Frame */}
                    <div className="book-frame">
                      <div className="book-frame-inner" />
                    </div>

                    {/* Book Header */}
                    <div className="book-header">
                      <div className="book-badge-icon">
                        <IconComp className="w-4 h-4 text-amber-200" />
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', zIndex: 5 }}>
                        <span className="book-mistake-pill">
                          {stats.total} 題
                        </span>
                        <button
                          type="button"
                          data-testid={`book-menu-${subject.id}`}
                          onClick={e => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setBookMenu(prev =>
                              prev?.subjectId === subject.id
                                ? null
                                : {
                                    subjectId: subject.id,
                                    subjectName: subject.name,
                                    x: Math.min(rect.left - 110, window.innerWidth - 180),
                                    y: rect.bottom + 6
                                  }
                            );
                          }}
                          style={{
                            background: 'rgba(0, 0, 0, 0.28)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            padding: '3px 4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={`更多操作：分享、重新命名或刪除《${subject.name}》`}
                        >
                          <MoreVertical size={15} color="#FFFFFF" stroke="#FFFFFF" strokeWidth={2.4} style={{ color: '#FFFFFF' }} />
                        </button>
                      </div>
                    </div>

                    {/* Book Body Title with Hot-stamped Foil & Series Tag */}
                    <div className="book-body">
                      <div className="book-series-tag">
                        {`VOL. ${(index + 1).toString().padStart(2, '0')} · ACADEMIC`}
                      </div>
                      <h2
                        className="book-title"
                        style={{ color: palette.foilColor }}
                      >
                        {subject.name}
                      </h2>
                    </div>

                    {/* Book Footer Progress */}
                    <div className="book-footer">
                      <div className="book-progress-wrapper">
                        <div className="book-progress-labels">
                          <span>掌握進度</span>
                          <span style={{ color: palette.foilColor }}>{stats.pct}%</span>
                        </div>
                        <div className="book-progress-track">
                          <div
                            className="book-progress-bar"
                            style={{
                              width: `${stats.pct}%`,
                              background: palette.accent
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add New Notebook Card */}
            <div
              className="book-item-wrapper"
              onClick={() => setShowAddModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowAddModal(true);
                }
              }}
            >
              <div className="add-book-cover">
                <div className="add-book-icon-circle">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="add-book-text">放置新錯題本</div>
                <div className="add-book-subtext">自訂書封色彩與標誌</div>
              </div>
            </div>
          </div>

          {/* Wooden / Slate Shelf Plank */}
          <div className="shelf-plank" />
        </section>
        <section className="dashboard-snapshot" aria-label="學習總覽">
          <div className="dashboard-snapshot-heading">
            <div className="eyebrow">POBI STUDY INDEX</div>
            <h2>學習總覽</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              點擊上方任一本錯題本，即可進入該科「查看錯題 / 每日複習 / 分析與工坊」
            </p>
          </div>
          <div className="dashboard-snapshot-stat">
            <strong className="dashboard-stat-number">{totalMistakes}</strong>
            <div className="dashboard-snapshot-stat-meta">
              <span className="dashboard-stat-label">收錄錯題</span>
              <small className="dashboard-stat-sub">分布於 {totalNotebooks} 本錯題本</small>
            </div>
          </div>
          <div className="dashboard-snapshot-stat">
            <strong className="dashboard-stat-number">{Math.max(0, totalMistakes - masteredCount)}</strong>
            <div className="dashboard-snapshot-stat-meta">
              <span className="dashboard-stat-label">待複習</span>
              <small className="dashboard-stat-sub">從最近錯題開始回顧</small>
            </div>
          </div>
          <div className="dashboard-snapshot-stat">
            <strong className="dashboard-stat-number">{masteredCount}</strong>
            <div className="dashboard-snapshot-stat-meta">
              <span className="dashboard-stat-label">已掌握</span>
              <small className="dashboard-stat-sub">掌握率 {totalMistakes > 0 ? Math.round((masteredCount / totalMistakes) * 100) : 0}%</small>
            </div>
          </div>
        </section>
      </main>

      {/* Add / Customize Notebook Modal */}
      {showAddModal && (
        <div className="notebook-sheet-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="notebook-sheet-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              width: '92vw',
              maxHeight: '85vh',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-secondary)',
              border: '1.5px solid var(--glass-border)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--glass-border)',
              backgroundColor: 'var(--bg-secondary)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color="var(--pobi-blue)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  新增學科錯題本
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateNotebook} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                scrollbarWidth: 'thin'
              }}>
                {/* Subject Name Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    錯題本名稱
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例如：學測自然科、高一數學、多益單字"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      minHeight: '46px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--glass-border)',
                      backgroundColor: 'var(--notebook-paper)',
                      color: 'var(--text-primary)',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                </div>

                {/* Color Palette Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    書封皮革色彩 (藍 / 綠 / 紅 / 橘 / 粉 / 棕 / 紫 / 黑)
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '10px'
                  }}>
                    {NOTEBOOK_COLOR_PALETTES.map((p) => {
                      const isSelected = selectedPalette === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPalette(p.id)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px 4px',
                            borderRadius: '10px',
                            border: isSelected ? `2.5px solid ${p.primary}` : '1.5px solid var(--glass-border)',
                            backgroundColor: isSelected ? 'rgba(180, 83, 9, 0.1)' : 'var(--bg-secondary)',
                            boxShadow: isSelected ? `0 0 0 3px ${p.primary}35` : 'none',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.18s ease'
                          }}
                        >
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              minWidth: '34px',
                              minHeight: '34px',
                              borderRadius: '50%',
                              backgroundColor: p.primary,
                              boxShadow: '0 3px 8px rgba(0,0,0,0.28), inset 0 2px 3px rgba(255,255,255,0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {isSelected && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
                          </div>
                          <span style={{
                            fontSize: '11.5px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? p.primary : 'var(--text-primary)',
                            whiteSpace: 'nowrap'
                          }}>
                            {p.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Badge Icon Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    書封徽章圖示
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                    gap: '8px'
                  }}>
                    {NOTEBOOK_ICONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedIcon(item.id)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '8px 4px',
                            minHeight: '52px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--pobi-blue)' : '1px solid var(--glass-border)',
                            backgroundColor: isSelected ? 'rgba(139, 90, 43, 0.14)' : 'transparent',
                            color: isSelected ? 'var(--pobi-blue)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.15s ease'
                          }}
                          title={item.name}
                        >
                          <Icon size={20} />
                          <span style={{ fontSize: '11px', whiteSpace: 'nowrap', fontWeight: isSelected ? 650 : 400 }}>
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {errorMsg && (
                  <div style={{
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: 'var(--danger)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px'
                  }}>
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--glass-border)',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '8px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 24px',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1.5px solid #D97706',
                    background: 'linear-gradient(180deg, #FDE68A 0%, #F59E0B 100%)',
                    color: '#451A03',
                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
                    cursor: 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                  disabled={submitting}
                >
                  {submitting ? '建立中...' : '確認放置書架'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOK COVER VERTICAL 3-DOT MENU PORTAL */}
      {bookMenu &&
        createPortal(
          <div onClick={() => setBookMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 100030 }}>
            <div
              data-testid="book-context-menu"
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: `${bookMenu.y}px`,
                left: `${Math.max(12, bookMenu.x)}px`,
                minWidth: '170px',
                backgroundColor: 'var(--bg-secondary, #FFFFFF)',
                border: '1px solid var(--glass-border)',
                borderRadius: '10px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.22)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const subjMistakes = mistakes.filter(m => m.subject_id === bookMenu.subjectId);
                  const subjName = bookMenu.subjectName;
                  setBookMenu(null);
                  if (subjMistakes.length === 0) {
                    showToast(`《${subjName}》目前尚未收錄錯題可供分享`, 'info');
                    return;
                  }
                  setShareSubject({
                    title: `《${subjName}》錯題本分享包`,
                    mistakes: subjMistakes
                  });
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', borderRadius: '6px', fontSize: '0.84rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}
              >
                <Share2 size={14} style={{ color: '#2563EB' }} /> 分享此錯題本
              </button>
              <button
                type="button"
                onClick={() => {
                  const { subjectId, subjectName } = bookMenu;
                  setBookMenu(null);
                  handleRenameSubject(subjectId, subjectName);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', borderRadius: '6px', fontSize: '0.84rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}
              >
                <Edit2 size={14} /> 重新命名
              </button>
              <button
                type="button"
                onClick={() => {
                  const { subjectId, subjectName } = bookMenu;
                  setBookMenu(null);
                  handleDeleteSubject(subjectId, subjectName);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', borderRadius: '6px', fontSize: '0.84rem', color: '#DC2626', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}
              >
                <Trash2 size={14} /> 刪除
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* SHARE SUBJECT MISTAKE PACK MODAL */}
      {shareSubject && (
        <SharePackModal
          defaultTitle={shareSubject.title}
          mistakes={shareSubject.mistakes}
          onClose={() => setShareSubject(null)}
        />
      )}
    </div>
  );
}
