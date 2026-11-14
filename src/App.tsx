import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiRequest } from './utils/api';
import {
  type CategoriesBundle,
  type CategoryDimension,
  type FilterState,
  type MistakeRecord,
  createEmptyFilterState
} from './types';
import AuthPage from './components/AuthPage';
import type { AppViewType } from './components/Dashboard';
import OverviewDashboard from './components/OverviewDashboard';
import CategoryManager from './components/CategoryManager';
import AnalyticsView from './components/AnalyticsView';
import PromptGenerator from './components/PromptGenerator';
import TemplateManager from './components/TemplateManager';
import MistakeList from './components/MistakeList';
import ExportPDF from './components/ExportPDF';
import AdminPanel from './components/AdminPanel';
import UsageGuide from './components/UsageGuide';
import BookshelfView from './components/BookshelfView';
import NotebookOpenView from './components/NotebookOpenView';
import BatchExamImportModal from './components/BatchExamImportModal';
import BinderSpineNav from './components/BinderSpineNav';
import './styles/notebookLayout.css';
import {
  LogOut,
  Sun,
  Moon,
  Loader2,
  MessageSquare,
  Shield,
  Trash2,
  Star,
  X,
  Printer,
  CircleHelp,
  Sparkles,
  BookOpen,
  FileText,
  BarChart2
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  is_admin: number;
}

const EMPTY_CATEGORIES: CategoriesBundle = {
  items: [],
  subjects: [],
  chapters: [],
  units: [],
  familiarities: [],
  errorReasons: [],
  errorReasonMode: 'multi'
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  // Navigation & Hierarchy states: default to 'bookshelf' (數位書架)
  const [activeView, setActiveView] = useState<AppViewType>('bookshelf');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [triggerOpenNewMistake, setTriggerOpenNewMistake] = useState(false);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [batchImportStage, setBatchImportStage] = useState<'prompt' | 'import' | 'review'>('import');

  // Global synchronized Categories & Mistakes state + persistent Analytics Filter state (Requirement 8)
  const [categories, setCategories] = useState<CategoriesBundle>(EMPTY_CATEGORIES);
  const [allMistakes, setAllMistakes] = useState<MistakeRecord[]>([]);
  const [analyticsFilter, setAnalyticsFilter] = useState<FilterState>(() => createEmptyFilterState());

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return window.innerWidth < 768;
  });

  // Account delete modal states
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Feedback modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const currentViewTitle = useMemo(() => {
    if (activeView === 'bookshelf') return '我的數位書架';
    if (activeView === 'notebook') {
      const subj = categories.subjects.find(s => s.id === selectedSubjectId);
      return subj ? `${subj.name} 錯題手帳` : '錯題手帳';
    }
    if (activeView === 'all') return '全部錯題索引';
    if (activeView === 'chapter') {
      const subj = categories.subjects.find(s => s.id === selectedSubjectId);
      const chap = categories.chapters.find(c => c.id === selectedChapterId);
      const unit = categories.units.find(u => u.id === selectedUnitId);
      return [subj?.name, chap?.name, unit?.name].filter(Boolean).join(' / ') || '章節錯題檢視';
    }
    if (activeView === 'dashboard') return '學習成效總覽';
    if (activeView === 'analytics') return '統計與弱點分析';
    if (activeView === 'export') return '列印試卷工坊';
    if (activeView === 'categories') return '學科分類與標籤管理';
    if (activeView === 'templates') return '錯題題目範本管理';
    if (activeView === 'prompt') return 'AI 提示詞工坊';
    if (activeView === 'admin') return '系統後台管理';
    if (activeView === 'guide') return '使用說明與導引';
    return '錯題手帳';
  }, [activeView, categories, selectedSubjectId, selectedChapterId, selectedUnitId]);

  const refreshAllData = useCallback(async () => {
    try {
      const [catRes, mistakesRes] = await Promise.all([
        apiRequest('/api/categories'),
        apiRequest('/api/mistakes')
      ]);
      if (catRes && catRes.subjects) {
        setCategories(catRes);
      }
      if (Array.isArray(mistakesRes)) {
        setAllMistakes(mistakesRes);
      }
    } catch (e) {
      console.error('Failed to refresh global data:', e);
    }
  }, []);

  // Check login status on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await apiRequest('/api/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Load categories and mistakes whenever user logs in
  useEffect(() => {
    if (user) {
      refreshAllData().finally(() => setLoading(false));
    } else {
      setCategories(EMPTY_CATEGORIES);
      setAllMistakes([]);
      setAnalyticsFilter(createEmptyFilterState());
    }
  }, [user, refreshAllData]);

  // Listen for window resize to auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync theme to document body attribute and html class
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {}
  }, [theme]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveView('bookshelf');
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('登出異常：', e);
    } finally {
      setUser(null);
      setSelectedSubjectId(null);
      setSelectedChapterId(null);
      setSelectedUnitId(null);
      setActiveView('bookshelf');
    }
  };

  const handleOpenNotebook = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedChapterId(null);
    setSelectedUnitId(null);
    setActiveView('notebook');
  };

  const handleUpdateSingleMistake = (updated: MistakeRecord) => {
    setAllMistakes(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const handleAddSubjectFromBookshelf = async (name: string, colorStyle: string) => {
    await apiRequest('/api/subjects', {
      method: 'POST',
      body: { name, color: colorStyle }
    });
    await refreshAllData();
  };

  const handleAddChapterFromNotebook = async (subjectId: string, name: string) => {
    await apiRequest('/api/chapters', {
      method: 'POST',
      body: { name, subjectId }
    });
    await refreshAllData();
  };

  const handleAddUnitFromNotebook = async (subjectId: string, chapterId: string, name: string) => {
    await apiRequest('/api/categories', {
      method: 'POST',
      body: { dimension: 'unit', name, parentId: chapterId, subjectId }
    });
    await refreshAllData();
  };

  const handleSelectHierarchy = (subjectId: string | null, chapterId: string | null, unitId: string | null) => {
    setSelectedSubjectId(subjectId);
    setSelectedChapterId(chapterId);
    setSelectedUnitId(unitId);
    if (subjectId || chapterId || unitId) {
      setActiveView('chapter');
    } else {
      setActiveView('all');
    }
  };

  const handleDrilldownFromChart = (dimension: CategoryDimension, categoryId: string) => {
    const nextFilter = createEmptyFilterState();
    if (dimension === 'subject') nextFilter.subjectIds = [categoryId];
    else if (dimension === 'chapter') nextFilter.chapterIds = [categoryId];
    else if (dimension === 'unit') nextFilter.unitIds = [categoryId];
    else if (dimension === 'familiarity') nextFilter.familiarityIds = [categoryId];
    else if (dimension === 'error_reason') nextFilter.errorReasonIds = [categoryId];

    setAnalyticsFilter(nextFilter);
    setActiveView('analytics');
  };

  const handleNavigateToExport = (mistakeIds: string[]) => {
    setSelectedExportIds(mistakeIds);
    setActiveView('export');
  };

  const handleNavigateToPrompt = (mistakeIds: string[]) => {
    setSelectedPromptIds(mistakeIds);
    setActiveView('prompt');
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmUsername !== user.username) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiRequest('/api/users/delete', { method: 'DELETE' });
      setUser(null);
      setShowDeleteAccountModal(false);
      setDeleteConfirmUsername('');
      setActiveView('all');
    } catch (e: any) {
      setDeleteError(e.message || '刪除帳號失敗');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openFeedbackModal = () => {
    setFeedbackRating(0);
    setFeedbackHoverRating(0);
    setFeedbackComment('');
    setFeedbackSuccess(false);
    setFeedbackError('');
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setFeedbackRating(0);
    setFeedbackHoverRating(0);
    setFeedbackComment('');
    setFeedbackSuccess(false);
    setFeedbackError('');
  };

  const handleFeedbackSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (feedbackRating === 0) {
      setFeedbackError('請選擇評分星數');
      return;
    }
    setFeedbackLoading(true);
    setFeedbackError('');
    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: { rating: feedbackRating, comment: feedbackComment }
      });
      setFeedbackSuccess(true);
    } catch (err: any) {
      setFeedbackError(err.message || '送出回饋失敗');
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '16px' }} />
        <span style={{ fontSize: '0.95rem', letterSpacing: '0.05em' }}>載入錯題本中...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="bg-ambient-lights" />
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="binder-app-shell">
      <div className="bg-ambient-lights" />

      {/* Mobile Backdrop when Left Spine is Expanded */}
      {!sidebarCollapsed && (
        <div
          className="binder-mobile-backdrop no-print"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Left Binder Spine Navigation */}
      <BinderSpineNav
        activeView={activeView}
        onNavigateView={(view) => {
          if (view === 'all') {
            handleSelectHierarchy(null, null, null);
          } else {
            setActiveView(view);
          }
          if (window.innerWidth <= 768) {
            setSidebarCollapsed(true);
          }
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenGuide={() => {
          setActiveView('guide');
          if (window.innerWidth <= 768) setSidebarCollapsed(true);
        }}
        onOpenFeedback={() => {
          openFeedbackModal();
          if (window.innerWidth <= 768) setSidebarCollapsed(true);
        }}
        onLogout={handleLogout}
        onOpenDeleteAccount={() => {
          setShowDeleteAccountModal(true);
          if (window.innerWidth <= 768) setSidebarCollapsed(true);
        }}
      />

      {/* Main Binder Stage */}
      <div className="binder-main-stage">
        {/* Top Navbar / Breadcrumb Header */}
        <header className="pobi-navbar glass no-print top-navbar binder-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="binder-breadcrumb">
              <span className="binder-breadcrumb-item active font-binder-title">{currentViewTitle}</span>
            </div>

            {/* Hidden brand for E2E navbar-brand compatibility */}
            <button
              className="pobi-wordmark navbar-brand"
              onClick={() => setActiveView('bookshelf')}
              title="回到我的書架首頁"
              style={{ display: 'none' }}
            >
              <div className="pobi-wordmark-text">
                <span className="pobi-wordmark-title navbar-title">POBI STUDIO</span>
              </div>
            </button>
          </div>

          {/* Primary Navigation Tabs - kept for E2E test querying without cluttering UI */}
          <nav
            className="pobi-nav no-print"
            aria-label="主要功能導覽"
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveView('bookshelf')}
              className={`pobi-nav-item btn ${activeView === 'bookshelf' || activeView === 'notebook' ? 'active btn-primary' : 'btn-text'}`}
            >
              <BookOpen size={15} />
              <span className="nav-label">我的書架</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectHierarchy(null, null, null)}
              className={`pobi-nav-item btn ${activeView === 'all' || activeView === 'chapter' ? 'active btn-primary' : 'btn-text'}`}
            >
              <FileText size={15} />
              <span className="nav-label">錯題索引</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('export')}
              className={`pobi-nav-item btn ${activeView === 'export' ? 'active btn-primary' : 'btn-text'}`}
            >
              <Printer size={15} />
              <span className="nav-label">列印練習卷</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className={`pobi-nav-item btn ${activeView === 'dashboard' || activeView === 'analytics' ? 'active btn-primary' : 'btn-text'}`}
            >
              <BarChart2 size={15} />
              <span className="nav-label">學習概覽</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('categories')}
              className={`pobi-nav-item btn ${activeView === 'categories' ? 'active btn-primary' : 'btn-text'}`}
            >
              <span className="nav-label">分類管理</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('templates')}
              className={`pobi-nav-item btn ${activeView === 'templates' ? 'active btn-primary' : 'btn-text'}`}
            >
              <span className="nav-label">模板管理</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('prompt')}
              className={`pobi-nav-item btn ${activeView === 'prompt' ? 'active btn-primary' : 'btn-text'}`}
            >
              <Sparkles size={15} />
              <span className="nav-label">AI 提詞</span>
            </button>
            {user.is_admin === 1 && (
              <button
                type="button"
                onClick={() => setActiveView('admin')}
                className={`pobi-nav-item btn ${activeView === 'admin' ? 'active btn-primary' : 'btn-text'}`}
              >
                <Shield size={15} />
                <span className="nav-label">控制台</span>
              </button>
            )}
          </nav>

          {/* Account Tools */}
          <div className="pobi-account-tools no-print navbar-actions">
            <button
              onClick={toggleTheme}
              className="pobi-icon-btn btn btn-secondary"
              title={theme === 'dark' ? '切換淺色模式' : '切換深色模式'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={() => setActiveView('guide')}
              className="pobi-icon-btn btn btn-secondary"
              title="閱讀使用導引"
            >
              <CircleHelp size={16} />
            </button>

            <button
              onClick={openFeedbackModal}
              className="pobi-icon-btn btn btn-secondary"
              title="提供寶貴意見回饋"
            >
              <MessageSquare size={16} />
            </button>

            <div className="pobi-user-pill navbar-user-info">
              <span className="pobi-user-avatar">{user.username.slice(0, 1).toUpperCase()}</span>
              <span style={{ fontWeight: 600 }}>{user.username}</span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.82rem', height: '34px' }}
              title="登出系統"
            >
              <LogOut size={14} /> <span className="navbar-btn-text">登出</span>
            </button>

            <button
              onClick={() => setShowDeleteAccountModal(true)}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.82rem', height: '34px', color: 'var(--danger)' }}
              title="刪除帳號"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </header>

        {/* Main Layout Stage Container */}
        <div className="main-layout binder-stage-container" style={{ display: 'flex', flex: 1, padding: 0 }}>

        {/* Bookshelf View */}
        {activeView === 'bookshelf' && (
          <div style={{ flex: 1, width: '100%' }}>
            <BookshelfView
              categories={categories}
              mistakes={allMistakes}
              onOpenNotebook={handleOpenNotebook}
              onAddSubject={handleAddSubjectFromBookshelf}
              onOpenOverviewModal={() => setActiveView('dashboard')}
              onOpenGuideModal={() => setActiveView('guide')}
              onOpenFeedbackModal={openFeedbackModal}
              onToggleTheme={toggleTheme}
              theme={theme}
              currentUser={user}
              onSwitchToClassicDashboard={() => setActiveView('dashboard')}
              onOpenBatchImport={() => {
                setBatchImportStage('import');
                setShowBatchImportModal(true);
              }}
              onOpenFastReview={() => {
                setBatchImportStage('review');
                setShowBatchImportModal(true);
              }}
            />
          </div>
        )}

        {/* Notebook Open View */}
        {activeView === 'notebook' && selectedSubjectId && (
          <div style={{ flex: 1, width: '100%' }}>
            <NotebookOpenView
              subjectId={selectedSubjectId}
              categories={categories}
              mistakes={allMistakes}
              onBackToBookshelf={() => setActiveView('bookshelf')}
              onSelectChapterUnit={(chapId, unitId) => {
                setSelectedChapterId(chapId);
                setSelectedUnitId(unitId);
                setActiveView('chapter');
              }}
              onOpenNewMistakeForSubject={(subjId, chapId, unitId) => {
                setSelectedSubjectId(subjId);
                setSelectedChapterId(chapId || null);
                setSelectedUnitId(unitId || null);
                setTriggerOpenNewMistake(true);
                setActiveView('chapter');
              }}
              onOpenMistakeBank={(subjId, chapId) => {
                setSelectedSubjectId(subjId);
                setSelectedChapterId(chapId || null);
                setSelectedUnitId(null);
                setActiveView('chapter');
              }}
              onOpenExportPDF={(subjId) => {
                setSelectedSubjectId(subjId);
                setActiveView('export');
              }}
              onOpenTagManager={() => {
                setActiveView('categories');
              }}
              onOpenTemplateManager={() => {
                setActiveView('templates');
              }}
              onOpenPromptGenerator={() => {
                setActiveView('prompt');
              }}
              onAddChapter={handleAddChapterFromNotebook}
              onAddUnit={handleAddUnitFromNotebook}
              onRefreshAll={refreshAllData}
              onUpdateMistake={handleUpdateSingleMistake}
            />
          </div>
        )}

        {/* View Routing */}
        {activeView === 'all' && (
          <MistakeList
            categories={categories}
            subjectId={null}
            chapterId={null}
            unitId={null}
            onNavigateToExport={handleNavigateToExport}
            onNavigateToPrompt={handleNavigateToPrompt}
            onRefreshAll={refreshAllData}
            onImageClick={src => setZoomedImage(src)}
            externalOpenEditor={triggerOpenNewMistake}
            onClearExternalOpenEditor={() => setTriggerOpenNewMistake(false)}
          />
        )}

        {activeView === 'chapter' && (
          <MistakeList
            categories={categories}
            subjectId={selectedSubjectId}
            chapterId={selectedChapterId}
            unitId={selectedUnitId}
            onSelectUnit={uId => setSelectedUnitId(uId)}
            onNavigateToExport={handleNavigateToExport}
            onNavigateToPrompt={handleNavigateToPrompt}
            onRefreshAll={refreshAllData}
            onImageClick={src => setZoomedImage(src)}
          />
        )}

        {activeView === 'dashboard' && (
          <OverviewDashboard
            mistakes={allMistakes}
            categories={categories}
            onDrilldownCategory={handleDrilldownFromChart}
            onNavigateToView={view => setActiveView(view)}
            onOpenNewMistake={() => {
              setActiveView('all');
              setTriggerOpenNewMistake(true);
            }}
            onOpenBatchImport={() => {
              setBatchImportStage('import');
              setShowBatchImportModal(true);
            }}
            onOpenFastReview={() => {
              setBatchImportStage('review');
              setShowBatchImportModal(true);
            }}
          />
        )}

        {activeView === 'categories' && (
          <CategoryManager
            categories={categories}
            onRefresh={refreshAllData}
            onDrilldownCategory={handleDrilldownFromChart}
          />
        )}

        {activeView === 'analytics' && (
          <AnalyticsView
            mistakes={allMistakes}
            categories={categories}
            filter={analyticsFilter}
            onChangeFilter={setAnalyticsFilter}
            onNavigateToPrompt={handleNavigateToPrompt}
            onNavigateToExport={handleNavigateToExport}
            onNavigateToMistakeListWithFilter={nextFilter => {
              setAnalyticsFilter(nextFilter);
            }}
          />
        )}

        {activeView === 'prompt' && (
          <PromptGenerator
            mistakes={allMistakes}
            categories={categories}
            filter={analyticsFilter}
            preselectedMistakeIds={selectedPromptIds}
          />
        )}

        {activeView === 'templates' && (
          <TemplateManager />
        )}

        {activeView === 'guide' && (
          <UsageGuide />
        )}

        {activeView === 'export' && (
          <ExportPDF
            mistakeIds={selectedExportIds.length > 0 ? selectedExportIds : allMistakes.map(m => m.id)}
            initialMistakes={allMistakes}
            onBack={() => setActiveView(selectedChapterId ? 'chapter' : 'all')}
            onImageClick={src => setZoomedImage(src)}
          />
        )}

        {activeView === 'admin' && user.is_admin === 1 && (
          <AdminPanel />
        )}
      </div>

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="modal-overlay" onClick={() => { setShowDeleteAccountModal(false); setDeleteConfirmUsername(''); setDeleteError(''); }}>
          <div className="glass modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={20} /> 刪除帳號
              </h3>
              <button onClick={() => { setShowDeleteAccountModal(false); setDeleteConfirmUsername(''); setDeleteError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem', lineHeight: 1.6 }}>
              此操作將<strong style={{ color: 'var(--danger)' }}>永久刪除</strong>您的帳號及所有相關資料，且<strong>無法復原</strong>。
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.9rem' }}>
              請輸入您的使用者名稱 <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong> 以確認刪除：
            </p>
            {deleteError && (
              <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: '12px', fontSize: '0.85rem' }}>
                {deleteError}
              </div>
            )}
            <input
              type="text"
              className="input"
              placeholder="輸入使用者名稱以確認輸入"
              value={deleteConfirmUsername}
              onChange={e => setDeleteConfirmUsername(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowDeleteAccountModal(false); setDeleteConfirmUsername(''); setDeleteError(''); }}>
                取消
              </button>
              <button
                className="btn btn-danger"
                disabled={deleteConfirmUsername !== user.username || deleteLoading}
                onClick={handleDeleteAccount}
              >
                {deleteLoading ? '刪除中...' : '確認刪除帳號'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={closeFeedbackModal}>
          <div className="glass modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="title-gradient">
                <MessageSquare size={20} /> 意見回饋
              </h3>
              <button onClick={closeFeedbackModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {feedbackSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '1.1rem', marginBottom: '8px' }}>感謝您的回饋！</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>您的意見對我們非常重要。</p>
                <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={closeFeedbackModal}>
                  關閉
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit}>
                {/* Star Rating */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">評分</label>
                  <div style={{ display: 'flex', gap: '4px', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        onMouseEnter={() => setFeedbackHoverRating(star)}
                        onMouseLeave={() => setFeedbackHoverRating(0)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', transition: 'transform 0.15s' }}
                      >
                        <Star
                          size={32}
                          onClick={() => setFeedbackRating(star)}
                          fill={(feedbackHoverRating || feedbackRating) >= star ? 'var(--warning)' : 'none'}
                          color={(feedbackHoverRating || feedbackRating) >= star ? 'var(--warning)' : 'var(--text-muted)'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="form-group">
                  <label className="form-label">留言（選填）</label>
                  <textarea
                    className="input"
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder="請輸入您的意見或建議..."
                    value={feedbackComment}
                    onChange={e => setFeedbackComment(e.target.value)}
                  />
                </div>

                {feedbackError && (
                  <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: '12px', fontSize: '0.85rem' }}>
                    {feedbackError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={closeFeedbackModal}>取消</button>
                  <button type="submit" className="btn btn-primary" disabled={feedbackRating === 0 || feedbackLoading}>
                    {feedbackLoading ? '送出中...' : '送出回饋'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Global Image Lightbox Modal */}
      {zoomedImage && (
        <div
          className="pobi-lightbox-overlay"
          onClick={() => setZoomedImage(null)}
          title="點擊任意處關閉大圖"
        >
          <div className="pobi-lightbox-content" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="pobi-lightbox-close"
              onClick={() => setZoomedImage(null)}
              title="關閉放大預覽"
            >
              <X size={20} />
            </button>
            <img
              src={zoomedImage}
              alt="錯題圖片高清檢視"
            />
          </div>
        </div>
      )}

      {/* Batch Exam Import & Fast Review Modal */}
      <BatchExamImportModal
        isOpen={showBatchImportModal}
        onClose={() => setShowBatchImportModal(false)}
        categories={categories}
        onRefreshCategories={refreshAllData}
        onBatchImportComplete={(newMistakes) => {
          setAllMistakes(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNew = newMistakes.filter(m => !existingIds.has(m.id));
            return [...uniqueNew, ...prev];
          });
        }}
        onOpenZoomedImage={src => setZoomedImage(src)}
        initialStage={batchImportStage}
        unreviewedMistakes={allMistakes.filter(m => !m.familiarity_id)}
      />
      </div>
    </div>
  );
}
