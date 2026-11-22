import type { AppViewType } from './Dashboard';
import {
  BookOpen,
  Inbox,
  FileCode,
  Sparkles,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  CircleHelp,
  MessageSquare,
  LogOut,
  Trash2,
  Play
} from 'lucide-react';
import {
  GoldCornerOrnaments,
  GoldGeometricDivider,
  AcademicHandDrawnBackdrop
} from './PobiDesignElements';

interface BinderSpineNavProps {
  activeView: AppViewType;
  onNavigateView: (view: AppViewType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user: {
    id: string;
    username: string;
    is_admin: number;
  };
  uncategorizedCount?: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenGuide: () => void;
  onOpenPobiTutorial?: () => void;
  onOpenFeedback: () => void;
  onLogout: () => void;
  onOpenDeleteAccount: () => void;
}

export default function BinderSpineNav({
  activeView,
  onNavigateView,
  collapsed,
  onToggleCollapse,
  user,
  uncategorizedCount = 0,
  onOpenGuide,
  onOpenPobiTutorial,
  onOpenFeedback,
  onLogout,
  onOpenDeleteAccount
}: BinderSpineNavProps) {
  const navItems: Array<{
    id: string;
    label: string;
    testId: string;
    icon: React.ReactNode;
    active: boolean;
    badge?: number;
    onClick: () => void;
  }> = [
    {
      id: 'bookshelf',
      label: '我的書架',
      testId: 'nav-bookshelf',
      icon: <BookOpen size={18} strokeWidth={1.8} />,
      active: activeView === 'bookshelf' || activeView === 'notebook',
      onClick: () => onNavigateView('bookshelf')
    },
    {
      id: 'uncategorized',
      label: '未分類區',
      testId: 'nav-uncategorized',
      icon: <Inbox size={18} strokeWidth={1.8} />,
      active: activeView === 'uncategorized',
      badge: uncategorizedCount > 0 ? uncategorizedCount : undefined,
      onClick: () => onNavigateView('uncategorized')
    },
    {
      id: 'templates',
      label: '模板管理',
      testId: 'nav-templates',
      icon: <FileCode size={18} strokeWidth={1.8} />,
      active: activeView === 'templates',
      onClick: () => onNavigateView('templates')
    },
    {
      id: 'prompt',
      label: 'AI 提詞管理',
      testId: 'nav-prompt',
      icon: <Sparkles size={18} strokeWidth={1.8} />,
      active: activeView === 'prompt',
      onClick: () => onNavigateView('prompt')
    },
    {
      id: 'guide',
      label: '使用導引',
      testId: 'nav-guide',
      icon: <CircleHelp size={18} strokeWidth={1.8} />,
      active: activeView === 'guide',
      onClick: () => onOpenGuide()
    }
  ];

  if (onOpenPobiTutorial) {
    navItems.push({
      id: 'pobi-tutorial',
      label: 'POBI 教學',
      testId: 'nav-pobi-tutorial',
      icon: <Play size={18} strokeWidth={1.8} />,
      active: false,
      onClick: () => onOpenPobiTutorial()
    });
  }

  if (user.is_admin === 1) {
    navItems.push({
      id: 'admin',
      label: '控制台',
      testId: 'nav-admin',
      icon: <Shield size={18} strokeWidth={1.8} />,
      active: activeView === 'admin',
      onClick: () => onNavigateView('admin')
    });
  }

  return (
    <aside
      className={`sidebar-container binder-spine-nav no-print ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
      aria-label="手帳書脊主導航"
      style={{ overflow: 'hidden' }}
    >
      {/* Subtle Academic Hand-Drawn Sketch Background on Left Sidebar */}
      <AcademicHandDrawnBackdrop subject="all" opacity={0.075} />
      {/* Gold Geometric Corner Accents on Left Sidebar */}
      <GoldCornerOrnaments size={28} inset={4} opacity={0.5} corners={collapsed ? ['tl', 'bl'] : ['tl', 'bl', 'br']} />

      {/* Brand Header */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div className="binder-spine-header" style={{
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '8px 4px' : '10px 8px',
          gap: collapsed ? '6px' : '6px',
          borderBottom: '1px solid var(--binder-spine-border)'
        }}>
          <button
            type="button"
            className="binder-spine-brand navbar-brand"
            onClick={() => onNavigateView('bookshelf')}
            title="回到我的書架首頁"
            style={{ padding: 0, border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: '7px' }}
          >
            <div className="binder-spine-logo" style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="/logo.png" alt="POBI STUDIO" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
            </div>
            {!collapsed && (
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <span className="binder-spine-brand-title navbar-title" style={{ fontSize: '0.9rem' }}>POBI STUDIO</span>
                <span className="binder-spine-brand-sub" style={{ fontSize: '0.62rem' }}>錯題手帳本</span>
              </div>
            )}
          </button>

          {/* Single Toggle Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="btn btn-secondary toggle-btn"
            style={{
              padding: '4px',
              borderRadius: '5px',
              background: 'var(--binder-spine-hover)',
              border: '1px solid var(--binder-spine-border)',
              color: 'var(--binder-spine-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: collapsed ? '30px' : '26px',
              height: '26px'
            }}
            title={collapsed ? '展開側邊欄' : '收折側邊欄'}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            <span style={{ display: 'none' }}>{collapsed ? '展開' : '收折'}</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="binder-nav-list" data-testid="sidebar-nav-list" aria-label="主要功能">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              data-testid={item.testId}
              onClick={item.onClick}
              className={`binder-nav-item ${item.active ? 'active' : ''}`}
              title={item.label}
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '6px 0' : '6px 8px'
              }}
            >
              <span className="binder-nav-icon">{item.icon}</span>
              {!collapsed && <span className="binder-nav-label" style={{ flex: 1 }}>{item.label}</span>}
              {!collapsed && item.badge !== undefined && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--warning-bg)',
                    border: '1px solid var(--warning-border)',
                    color: 'var(--warning-text)',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* 手帳筆記狀態小卡 - 展開時顯示 */}
        {!collapsed && (
          <div style={{
            position: 'relative',
            margin: '10px 8px 6px 8px',
            padding: '9px 10px',
            borderRadius: '7px',
            background: 'rgba(20, 91, 56, 0.045)',
            border: '1px solid var(--binder-spine-border)',
            borderTop: '2px solid rgba(200, 154, 80, 0.55)',
            fontSize: '0.72rem',
            color: 'var(--binder-spine-text-muted)',
            lineHeight: 1.45
          }}>
            <div style={{ fontWeight: 700, color: 'var(--binder-spine-text)', marginBottom: '2px', letterSpacing: '0.02em' }}>
              數位錯題手帳
            </div>
            <div style={{ fontSize: '0.67rem', letterSpacing: '0.03em' }}>Explore. Decode. Understand.</div>
          </div>
        )}
      </div>

      {/* Subtle Vertical Geometric & Compass Ornament in Sidebar Breathing Space */}
      {!collapsed && (
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            minHeight: '36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.42,
            color: '#C89A50',
            padding: '12px 0'
          }}
        >
          <div style={{ width: '1px', flex: 1, maxHeight: '42px', background: 'linear-gradient(180deg, transparent, rgba(200, 154, 80, 0.6))' }} />
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ margin: '6px 0' }}>
            <circle cx="18" cy="18" r="13" stroke="currentColor" strokeWidth="0.9" strokeDasharray="3 3" />
            <circle cx="18" cy="18" r="7" stroke="currentColor" strokeWidth="0.85" />
            <path d="M18 2 V34 M2 18 H34" stroke="currentColor" strokeWidth="0.7" opacity="0.65" />
            <rect x="15.5" y="15.5" width="5" height="5" transform="rotate(45 18 18)" fill="currentColor" opacity="0.7" />
          </svg>
          <div style={{ width: '1px', flex: 1, maxHeight: '42px', background: 'linear-gradient(180deg, rgba(200, 154, 80, 0.6), transparent)' }} />
        </div>
      )}

      {/* Footer System Tools & User Profile */}
      <div className="binder-spine-footer navbar-actions" style={{ position: 'relative', zIndex: 2, padding: collapsed ? '8px 4px 10px 4px' : '8px 6px 10px 6px', gap: '6px', borderTop: 'none' }}>
        {!collapsed && <GoldGeometricDivider style={{ marginBottom: '4px' }} />}
        {/* User Card */}
        <div
          className="binder-spine-user-card navbar-user-info"
          title={`目前使用者：${user.username}`}
          style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '4px' : '5px 8px',
            borderRadius: '5px',
            display: 'flex'
          }}
        >
          <span className="binder-spine-avatar" style={{ width: '22px', height: '22px', fontSize: '0.7rem' }}>
            {user.username.slice(0, 1).toUpperCase()}
          </span>
          {!collapsed && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.78rem' }}>
              {user.username}
            </span>
          )}
        </div>

        {/* Quick Tools Row */}
        <div style={{
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: '4px'
        }}>
          {/* Guide */}
          <button
            type="button"
            onClick={onOpenGuide}
            className="btn btn-secondary pobi-icon-btn"
            style={{
              padding: '5px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: 'var(--binder-spine-text)',
              cursor: 'pointer'
            }}
            title="使用導引"
          >
            <CircleHelp size={14} />
          </button>

          {/* Feedback */}
          <button
            type="button"
            onClick={onOpenFeedback}
            className="btn btn-secondary pobi-icon-btn"
            style={{
              padding: '5px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: 'var(--binder-spine-text)',
              cursor: 'pointer'
            }}
            title="意見反饋"
          >
            <MessageSquare size={14} />
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-secondary"
            style={{
              padding: '5px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: 'var(--binder-spine-text)',
              cursor: 'pointer'
            }}
            title="登出系統"
          >
            <LogOut size={14} />
            <span className="navbar-btn-text" style={{ display: 'none' }}>登出</span>
          </button>

          {/* Delete Account */}
          <button
            type="button"
            onClick={onOpenDeleteAccount}
            className="btn btn-secondary"
            style={{
              padding: '5px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer'
            }}
            title="刪除帳號"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
