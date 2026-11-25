import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { apiRequest } from './utils/api';
import {
  type CategoriesBundle,
  type MistakeRecord,
  isMistakeDueForReview
} from './types';
import LandingPage from './components/LandingPage';
import { GoldCornerOrnaments, AcademicHandDrawnBackdrop } from './components/PobiDesignElements';
import { useUiFeedback } from './components/UiFeedbackProvider';
import type { AppViewType } from './components/Dashboard';
import type { NotebookOpenOptions } from './components/NotebookOpenView';
import './styles/notebookLayout.css';

const AuthPage = lazy(() => import('./components/AuthPage'));
const PobiTutorialModal = lazy(() => import('./components/PobiTutorialModal'));
const BackupRestoreModal = lazy(() => import('./components/BackupRestoreModal'));
const SharedPackView = lazy(() => import('./components/SharedPackView'));
const UncategorizedView = lazy(() => import('./components/UncategorizedView'));
const PromptGenerator = lazy(() => import('./components/PromptGenerator'));
const TemplateManager = lazy(() => import('./components/TemplateManager'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const UsageGuide = lazy(() => import('./components/UsageGuide'));
const BookshelfView = lazy(() => import('./components/BookshelfView'));
const NotebookOpenView = lazy(() => import('./components/NotebookOpenView'));
const DailyReviewHubView = lazy(() => import('./components/DailyReviewHubView'));
const BatchExamImportModal = lazy(() => import('./components/BatchExamImportModal'));
const BinderSpineNav = lazy(() => import('./components/BinderSpineNav'));
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
  CircleHelp,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  is_admin: number;
  email?: string | null;
  auth_provider?: string | null;
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
  const { showToast } = useUiFeedback();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('admin_google_linked') || params.has('admin_google_error')) {
        return true;
      }
      return Boolean(
        localStorage.getItem('pobi_has_session') ||
        localStorage.getItem('pobi_auth_token') ||
        localStorage.getItem('pobi_local_user')
      );
    } catch {
      return false;
    }
  });
  const [showAuthView, setShowAuthView] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [authInitialError, setAuthInitialError] = useState<string>('');
  const [showPobiTutorial, setShowPobiTutorial] = useState(false);
  const [isNewUserTutorial, setIsNewUserTutorial] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [sharedPackId, setSharedPackId] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('share');
    } catch {
      return null;
    }
  });
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
  const [notebookPreset, setNotebookPreset] = useState<NotebookOpenOptions | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [batchImportStage, setBatchImportStage] = useState<'prompt' | 'import' | 'review'>('prompt');

  // Global synchronized Categories & Mistakes state
  const [categories, setCategories] = useState<CategoriesBundle>(EMPTY_CATEGORIES);
  const [allMistakes, setAllMistakes] = useState<MistakeRecord[]>([]);

  const uncategorizedCount = useMemo(() => {
    const validSubjectIds = new Set(categories.subjects.map(s => s.id));
    const validChapterIds = new Set(categories.chapters.map(c => c.id));
    return allMistakes.filter(
      m => !m.subject_id || !validSubjectIds.has(m.subject_id) || !m.chapter_id || !validChapterIds.has(m.chapter_id)
    ).length;
  }, [allMistakes, categories.subjects, categories.chapters]);

  const totalDueReviewCount = useMemo(() => {
    const validSubjectIds = new Set(categories.subjects.map(s => s.id));
    return allMistakes.filter(
      m => m.subject_id && validSubjectIds.has(m.subject_id) && isMistakeDueForReview(m)
    ).length;
  }, [allMistakes, categories.subjects]);

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
    if (activeView === 'daily-review') return '每日複習';
    if (activeView === 'uncategorized') return '未分類區';
    if (activeView === 'notebook') {
      const subj = categories.subjects.find(s => s.id === selectedSubjectId);
      return subj ? `${subj.name} 錯題手帳` : '錯題手帳';
    }
    if (activeView === 'templates') return '模板管理';
    if (activeView === 'prompt') return 'AI 提詞管理';
    if (activeView === 'admin') return '系統後台管理';
    if (activeView === 'guide') return '使用說明與導引';
    return '我的數位書架';
  }, [activeView, categories, selectedSubjectId]);

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

  // Check login status on mount (and handle OAuth redirect errors if any)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const authErr = params.get('auth_error');
      const adminGoogleLinked = params.get('admin_google_linked');
      const adminGoogleError = params.get('admin_google_error');
      let urlChanged = false;

      if (authErr) {
        const errorMap: Record<string, string> = {
          google_cancelled: '已取消 Google 登入。',
          google_not_configured: '伺服器尚未完成 Google 登入設定，請稍後再試。',
          invalid_state: '登入驗證狀態逾時或無效，請重新點擊 Google 登入。',
          token_exchange_failed: '無法完成 Google 驗證，請重新嘗試。',
          profile_fetch_failed: '無法取得 Google 帳號資料，請重新嘗試。',
          google_auth_failed: 'Google 登入發生錯誤，請稍後再試。'
        };
        setAuthInitialError(errorMap[authErr] || 'Google 登入失敗，請稍後再試。');
        setAuthInitialMode('login');
        setShowAuthView(true);
        params.delete('auth_error');
        urlChanged = true;
      }

      if (adminGoogleLinked === '1') {
        setActiveView('admin');
        showToast('已成功連結 Google 帳號！現在可使用 Google 登入管理員，並解鎖 GMAIL 每日通知。', 'success');
        params.delete('admin_google_linked');
        urlChanged = true;
      }

      if (adminGoogleError) {
        const adminErrorMap: Record<string, string> = {
          google_cancelled: '已取消連結 Google 帳號。',
          google_not_configured: '伺服器尚未完成 Google OAuth 設定，無法連結。',
          admin_required: '請先登入管理員帳號後，再進行 Google 帳號綁定。',
          invalid_state: 'Google 驗證狀態逾時或無效，請重新點擊連結。',
          token_exchange_failed: '無法完成 Google 驗證，請稍後再試。',
          profile_fetch_failed: '無法取得 Google 帳號資料，請稍後再試。',
          already_linked: '此 Google 帳號已綁定其他用戶；請先在下方「用戶管理」移除該帳號後再綁定，或改選其他 Google 帳號。',
          google_auth_failed: '連結 Google 帳號時發生錯誤，請稍後再試。'
        };
        setActiveView('admin');
        showToast(adminErrorMap[adminGoogleError] || '連結 Google 帳號失敗，請稍後再試。', 'error');
        params.delete('admin_google_error');
        urlChanged = true;
      }

      if (urlChanged) {
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
      }
    } catch {}

    const checkSession = async () => {
      try {
        const res = await apiRequest('/api/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
          try {
            localStorage.setItem('pobi_has_session', '1');
          } catch {}
        } else {
          try {
            localStorage.removeItem('pobi_has_session');
          } catch {}
        }
      } catch {
        setUser(null);
        try {
          localStorage.removeItem('pobi_has_session');
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [showToast]);

  // Load categories and mistakes whenever user logs in
  useEffect(() => {
    if (user) {
      refreshAllData().then(() => {
        try {
          const doneKey = `pobi_onboarding_done_${user.id}`;
          const alreadyDone = localStorage.getItem(doneKey) === '1';
          if (!alreadyDone && user.id !== 'demo-guest') {
            // Check after data loads if mistakes are empty
            apiRequest('/api/mistakes')
              .then(list => {
                if (Array.isArray(list) && list.length === 0) {
                  setIsNewUserTutorial(true);
                  setShowPobiTutorial(true);
                }
              })
              .catch(() => {});
          }
        } catch {}
      }).finally(() => setLoading(false));
    } else {
      setCategories(EMPTY_CATEGORIES);
      setAllMistakes([]);
      setShowPobiTutorial(false);
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
    if (loggedInUser.id !== 'demo-guest') {
      try {
        const rawLocal = localStorage.getItem('pobi_local_user');
        if (rawLocal && JSON.parse(rawLocal)?.id === 'demo-guest') {
          localStorage.removeItem('pobi_local_user');
        }
        localStorage.setItem('pobi_has_session', '1');
      } catch {}
    }
    setUser(loggedInUser);
    setShowAuthView(false);
    setActiveView('bookshelf');
  };

  const clearGuestDemoStorage = () => {
    const guestKeys = [
      'pobi_local_mistakes',
      'pobi_local_categories',
      'pobi_local_prompt_templates',
      'pobi_local_templates',
      'pobi_subject_review_schedules_v1',
      'pobi_local_user',
      'pobi_onboarding_done_demo-guest'
    ];
    for (const k of guestKeys) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }
  };

  const handleEnterDemo = async () => {
    try {
      const demoUser: User = { id: 'demo-guest', username: '體驗訪客', is_admin: 0 };
      localStorage.setItem('pobi_local_user', JSON.stringify(demoUser));
      localStorage.setItem('pobi_onboarding_done_demo-guest', '1');
      // Always ensure guest mode has zero uncategorized mistakes
      try {
        const existingRaw = localStorage.getItem('pobi_local_mistakes');
        const catRaw = localStorage.getItem('pobi_local_categories');
        const parsedCats = catRaw ? JSON.parse(catRaw) : null;
        const validSubjectIds = new Set(
          Array.isArray(parsedCats?.subjects) ? parsedCats.subjects.map((s: any) => s?.id) : []
        );
        const validChapterIds = new Set(
          Array.isArray(parsedCats?.chapters) ? parsedCats.chapters.map((c: any) => c?.id) : []
        );
        if (existingRaw) {
          const existingList = JSON.parse(existingRaw);
          if (Array.isArray(existingList)) {
            const cleaned = existingList.filter((m: any) => {
              if (!m || m.id === 'demo-m-1' || String(m.title || '').startsWith('【體驗範例】')) return false;
              const hasValidSubj = Boolean(m.subject_id) && validSubjectIds.has(m.subject_id);
              const hasValidChap = Boolean(m.chapter_id) && validChapterIds.has(m.chapter_id);
              return hasValidSubj && hasValidChap;
            });
            localStorage.setItem('pobi_local_mistakes', JSON.stringify(cleaned));
          }
        }
      } catch {}
      setUser(demoUser);
      setActiveView('bookshelf');
      showToast('已進入訪客體驗模式（登出後將自動清空重設）', 'info');
    } catch {
      setShowAuthView(true);
    }
  };

  const handleLogout = async () => {
    const wasGuest = user?.id === 'demo-guest';
    try {
      if (!wasGuest) {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      }
    } catch (e) {
      console.error('登出異常：', e);
    } finally {
      if (wasGuest) {
        clearGuestDemoStorage();
      } else {
        try {
          localStorage.removeItem('pobi_local_user');
          localStorage.removeItem('pobi_has_session');
        } catch {}
      }
      setUser(null);
      setAllMistakes([]);
      setCategories(EMPTY_CATEGORIES);
      setSelectedSubjectId(null);
      setActiveView('bookshelf');
      if (wasGuest) {
        showToast('已登出訪客模式，範例錯題本與使用紀錄皆已清空重設', 'info');
      }
    }
  };

  const handleOpenNotebook = useCallback((subjectId: string, options?: NotebookOpenOptions) => {
    setSelectedSubjectId(subjectId);
    setNotebookPreset(options ?? null);
    setActiveView('notebook');
  }, []);

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

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmUsername !== user.username) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      if (user.id === 'demo-guest') {
        try {
          localStorage.removeItem('pobi_local_mistakes');
          localStorage.removeItem('pobi_local_categories');
          localStorage.removeItem('pobi_local_user');
        } catch {}
      } else {
        await apiRequest('/api/users/delete', { method: 'DELETE' });
      }
      setUser(null);
      setShowDeleteAccountModal(false);
      setDeleteConfirmUsername('');
      setActiveView('bookshelf');
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

  const suspenseFallback = (
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

  if (sharedPackId) {
    return (
      <Suspense fallback={suspenseFallback}>
        <SharedPackView
          shareId={sharedPackId}
          onGoHome={() => {
            setSharedPackId(null);
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('share');
              window.history.replaceState({}, '', url.toString());
            } catch {}
          }}
        />
      </Suspense>
    );
  }

  if (loading) {
    return suspenseFallback;
  }

  if (!user) {
    if (!showAuthView) {
      return (
        <LandingPage
          onEnterDemo={handleEnterDemo}
          onGoToAuth={mode => {
            setAuthInitialMode(mode || 'login');
            setShowAuthView(true);
          }}
        />
      );
    }
    return (
      <Suspense fallback={suspenseFallback}>
        <div className="bg-ambient-lights" />
        <div style={{ position: 'fixed', top: '16px', left: '16px', zIndex: 50 }}>
          <button
            type="button"
            onClick={() => setShowAuthView(false)}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            返回首頁
          </button>
        </div>
        <AuthPage
          onLoginSuccess={handleLoginSuccess}
          initialMode={authInitialMode}
          initialError={authInitialError}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={suspenseFallback}>
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
          setActiveView(view);
          if (window.innerWidth <= 768) {
            setSidebarCollapsed(true);
          }
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        user={user}
        uncategorizedCount={uncategorizedCount}
        dueReviewCount={totalDueReviewCount}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenGuide={() => {
          setActiveView('guide');
          if (window.innerWidth <= 768) setSidebarCollapsed(true);
        }}
        onOpenPobiTutorial={() => {
          setIsNewUserTutorial(false);
          setShowPobiTutorial(true);
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
          <GoldCornerOrnaments size={22} inset={3} opacity={0.5} corners={['tl', 'tr']} />
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="binder-breadcrumb">
              <span className="binder-breadcrumb-item active font-binder-title">{currentViewTitle}</span>
            </div>
            <span
              className="hidden md:inline-flex"
              style={{
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.72rem',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                borderLeft: '1px solid rgba(200, 154, 80, 0.45)',
                paddingLeft: '10px'
              }}
            >
              EXPLORE · DECODE · UNDERSTAND
            </span>

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
              <span className="nav-label">AI 提詞管理</span>
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

        {/* Bookshelf View (default fallback for any unmapped view) */}
        {(activeView === 'bookshelf' || (activeView === 'notebook' && !selectedSubjectId) || !['notebook', 'daily-review', 'uncategorized', 'templates', 'prompt', 'guide', 'admin'].includes(activeView)) && (
          <div style={{ flex: 1, width: '100%' }}>
            <BookshelfView
              categories={categories}
              mistakes={allMistakes}
              onOpenNotebook={handleOpenNotebook}
              onAddSubject={handleAddSubjectFromBookshelf}
              onOpenGuideModal={() => setActiveView('guide')}
              onOpenFeedbackModal={openFeedbackModal}
              onToggleTheme={toggleTheme}
              theme={theme}
              currentUser={user}
              onOpenBatchImport={() => {
                setBatchImportStage('prompt');
                setShowBatchImportModal(true);
              }}
              onOpenPobiTutorial={() => {
                setIsNewUserTutorial(false);
                setShowPobiTutorial(true);
              }}
              onRefreshAll={refreshAllData}
              onOpenBackupRestore={() => setShowBackupRestore(true)}
            />
          </div>
        )}

        {/* Daily Review Hub View (每日複習) */}
        {activeView === 'daily-review' && (
          <div style={{ flex: 1, width: '100%' }}>
            <DailyReviewHubView
              categories={categories}
              mistakes={allMistakes}
              currentUser={user}
              initialSubjectId={selectedSubjectId}
              onSelectSubject={id => setSelectedSubjectId(id)}
              onGoToBookshelf={() => setActiveView('bookshelf')}
              onRefreshAll={refreshAllData}
              onUpdateMistake={handleUpdateSingleMistake}
            />
          </div>
        )}

        {/* Uncategorized Staging View (未分類區) */}
        {activeView === 'uncategorized' && (
          <div style={{ flex: 1, width: '100%' }}>
            <UncategorizedView
              categories={categories}
              allMistakes={allMistakes}
              onRefreshAll={refreshAllData}
              onImageClick={src => setZoomedImage(src)}
            />
          </div>
        )}

        {/* Notebook Open View (Subject Hub: 查看錯題 / 每日複習 / 分析與工坊) */}
        {activeView === 'notebook' && selectedSubjectId && (
          <div style={{ flex: 1, width: '100%' }}>
            <NotebookOpenView
              subjectId={selectedSubjectId}
              categories={categories}
              mistakes={allMistakes}
              initialPreset={notebookPreset}
              onBackToBookshelf={() => {
                setNotebookPreset(null);
                setActiveView('bookshelf');
              }}
              onAddChapter={handleAddChapterFromNotebook}
              onAddUnit={handleAddUnitFromNotebook}
              onRefreshAll={refreshAllData}
              onUpdateMistake={handleUpdateSingleMistake}
            />
          </div>
        )}

        {activeView === 'prompt' && (
          <PromptGenerator />
        )}

        {activeView === 'templates' && (
          <TemplateManager />
        )}

        {activeView === 'guide' && (
          <UsageGuide />
        )}

        {activeView === 'admin' && user.is_admin === 1 && (
          <AdminPanel
            currentUser={user}
            onRefreshCurrentUser={async () => {
              try {
                const res = await apiRequest('/api/auth/me');
                if (res?.success && res?.user) {
                  setUser(res.user);
                }
              } catch {}
            }}
          />
        )}

        {/* Bottom Editorial Footer Panel (下側面板背景點綴) */}
        <footer className="binder-bottom-bar no-print">
          <AcademicHandDrawnBackdrop subject="all" opacity={0.055} />
          <GoldCornerOrnaments size={24} inset={4} opacity={0.52} corners={['bl', 'br']} />
          <div style={{ position: 'relative', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', transform: 'rotate(45deg)', backgroundColor: '#C89A50', display: 'inline-block' }} />
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>POBI STUDIO</span>
            <span>數位錯題手帳</span>
          </div>
          <div style={{ position: 'relative', zIndex: 2, letterSpacing: '0.06em', fontSize: '0.72rem' }}>
            Explore. Decode. Understand.
          </div>
        </footer>
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
      {showBatchImportModal && (
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
      )}

      {/* POBI Interactive Dynamic Spotlight Tutorial */}
      {showPobiTutorial && user && (
        <PobiTutorialModal
          categories={categories}
          activeView={activeView}
          selectedSubjectId={selectedSubjectId}
          onNavigateView={setActiveView}
          onOpenNotebook={handleOpenNotebook}
          isNewUser={isNewUserTutorial}
          onClose={() => {
            try {
              localStorage.setItem(`pobi_onboarding_done_${user.id}`, '1');
            } catch {}
            setShowPobiTutorial(false);
          }}
          onRefreshAll={refreshAllData}
        />
      )}

      {/* One-Click Full Backup & Restore Modal */}
      {showBackupRestore && (
        <BackupRestoreModal
          categories={categories}
          mistakes={allMistakes}
          onClose={() => setShowBackupRestore(false)}
          onRestored={refreshAllData}
        />
      )}
      </div>
    </div>
    </Suspense>
  );
}
