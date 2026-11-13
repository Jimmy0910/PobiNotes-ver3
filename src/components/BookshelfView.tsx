import { useState, useMemo } from 'react';
import type { CategoriesBundle, MistakeRecord } from '../types';
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
  BarChart3,
  HelpCircle,
  MessageSquare,
  LayoutDashboard,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Zap
} from 'lucide-react';

interface BookshelfViewProps {
  categories: CategoriesBundle;
  mistakes: MistakeRecord[];
  onOpenNotebook: (subjectId: string) => void;
  onAddSubject: (name: string, colorStyle: string) => Promise<void>;
  onOpenOverviewModal: () => void;
  onOpenGuideModal: () => void;
  onOpenFeedbackModal: () => void;
  onToggleTheme?: () => void;
  theme: 'dark' | 'light';
  currentUser?: { username: string; is_admin: number } | null;
  onSwitchToClassicDashboard?: () => void;
  onOpenBatchImport?: () => void;
  onOpenFastReview?: () => void;
}

export default function BookshelfView({
  categories,
  mistakes,
  onOpenNotebook,
  onAddSubject,
  onOpenOverviewModal,
  onOpenGuideModal,
  onOpenFeedbackModal,
  theme,
  currentUser,
  onSwitchToClassicDashboard,
  onOpenBatchImport,
  onOpenFastReview
}: BookshelfViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedPalette, setSelectedPalette] = useState('navy');
  const [selectedIcon, setSelectedIcon] = useState('BookOpen');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Unreviewed mistakes count for Inbox banner
  const unreviewedMistakes = useMemo(() => {
    return mistakes.filter(m => !m.familiarity_id);
  }, [mistakes]);
  const unreviewedCount = unreviewedMistakes.length;

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
            onClick={onOpenOverviewModal}
            className="notebook-tool-btn"
            title="開啟全部錯題數據儀表板"
          >
            <BarChart3 className="w-4 h-4 text-pobi-blue dark:text-blue-400" />
            全部錯題儀表板
          </button>

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

          {onSwitchToClassicDashboard && (
            <button
              type="button"
              onClick={onSwitchToClassicDashboard}
              className="notebook-tool-btn"
              title="切換至傳統後台模式"
            >
              <LayoutDashboard className="w-4 h-4" />
              傳統模式
            </button>
          )}
        </div>
      </header>

      {/* Inbox Notification Banner for Pending Reviews */}
      {unreviewedCount > 0 && (
        <div style={{
          maxWidth: '1240px',
          width: '100%',
          margin: '0 auto 24px auto',
          padding: '14px 20px',
          backgroundColor: '#FFFBEB',
          border: '1px solid #D97706',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle className="w-5 h-5 text-amber-700" />
            <span style={{ fontSize: '0.9rem', color: '#78350F', fontWeight: 600 }}>
              收件匣提醒：尚有 <strong style={{ fontVariantNumeric: 'tabular-nums', textDecoration: 'underline' }}>{unreviewedCount} 道新題目</strong> 尚未完成熟悉度標記。
            </span>
          </div>
          {onOpenFastReview && (
            <button
              type="button"
              onClick={onOpenFastReview}
              style={{
                padding: '6px 14px',
                backgroundColor: '#B45309',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Zap className="w-3.5 h-3.5" /> 立即接續極速審核
            </button>
          )}
        </div>
      )}

      {/* Main Bookshelf Stage */}
      <main className="bookshelf-stage">
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
                  onClick={() => onOpenNotebook(subject.id)}
                  title={`點擊翻開《${subject.name}》手帳`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenNotebook(subject.id);
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
                      <span className="book-mistake-pill">
                        {stats.total} 題
                      </span>
                    </div>

                    {/* Book Body Title with Hot-stamped Foil & Series Tag */}
                    <div className="book-body">
                      <div className="book-series-tag">
                        VOL. {(index + 1).toString().padStart(2, '0')} · ACADEMIC
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
            <button type="button" onClick={onOpenOverviewModal} className="dashboard-snapshot-link">
              查看全部錯題數據 <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="dashboard-snapshot-stat">
            <span>收錄錯題</span><strong>{totalMistakes}</strong><small>分布於 {totalNotebooks} 本錯題本</small>
          </div>
          <div className="dashboard-snapshot-stat">
            <span>待複習</span><strong>{Math.max(0, totalMistakes - masteredCount)}</strong><small>從最近錯題開始回顧</small>
          </div>
          <div className="dashboard-snapshot-stat">
            <span>已掌握</span><strong>{masteredCount}</strong><small>持續累積學習進度</small>
          </div>
        </section>
      </main>

      {/* Add / Customize Notebook Modal */}
      {showAddModal && (
        <div className="notebook-sheet-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="notebook-sheet-content p-6 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-glass-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-pobi-blue dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-text-primary">新增學科錯題本</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-glass-highlight"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNotebook} className="mt-5 space-y-5">
                {/* Subject Name Input */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    錯題本名稱
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例如：學測自然科、高一數學、多益單字"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-glass-border bg-notebook-paper text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-pobi-blue"
                    autoFocus
                  />
                </div>

                {/* Color Palette Selector */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    書封皮革色彩
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {NOTEBOOK_COLOR_PALETTES.map((p) => {
                      const isSelected = selectedPalette === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPalette(p.id)}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all"
                          style={{
                            borderColor: isSelected ? p.primary : 'var(--glass-border)',
                            backgroundColor: isSelected ? 'var(--glass-highlight)' : 'transparent'
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-full shadow-inner flex items-center justify-center"
                            style={{ background: p.coverTexture }}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className="text-xs text-text-muted">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Badge Icon Selector */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    書封徽章圖示
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {NOTEBOOK_ICONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedIcon(item.id)}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all"
                          style={{
                            borderColor: isSelected ? 'var(--pobi-blue)' : 'var(--glass-border)',
                            backgroundColor: isSelected ? 'var(--glass-highlight)' : 'transparent',
                            color: isSelected ? 'var(--pobi-blue)' : 'var(--text-muted)'
                          }}
                          title={item.name}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[10px] truncate max-w-full">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 text-xs text-danger bg-danger-glow/10 border border-danger/30 rounded-lg">
                    {errorMsg}
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-glass-border">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-glass-border text-text-muted hover:bg-glass-highlight"
                    disabled={submitting}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-pobi-blue text-white hover:opacity-90 shadow-sm"
                    disabled={submitting}
                  >
                    {submitting ? '建立中...' : '確認放置書架'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
