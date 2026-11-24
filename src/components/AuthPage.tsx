import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { LogIn, UserPlus, Key, User, ShieldCheck, Gamepad2, ChevronUp } from 'lucide-react';
import {
  GoldCornerOrnaments,
  GoldGeometricDivider,
  AcademicHandDrawnBackdrop
} from './PobiDesignElements';
import DinoGame from './DinoGame';

interface AuthPageProps {
  onLoginSuccess: (user: { id: string; username: string; is_admin: number }) => void;
  initialMode?: 'login' | 'register';
  initialError?: string;
}

export default function AuthPage({ onLoginSuccess, initialMode = 'login', initialError = '' }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerAsAdmin, setRegisterAsAdmin] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('light');
  const [showDinoGame, setShowDinoGame] = useState(false);

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  const handleGoogleLogin = () => {
    setError('');
    setSuccess('');
    setLoading(true);
    window.location.href = '/api/auth/google';
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const attr = document.documentElement.getAttribute('data-theme');
    const initialTheme = (saved === 'dark' || attr === 'dark') ? 'dark' : 'light';
    setCurrentTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: { username, password }
        });
        onLoginSuccess(res.user);
      } else {
        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: { username, password, ...(registerAsAdmin ? { registerAsAdmin: true } : {}) }
        });
        setSuccess('註冊成功！請直接登入。');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || '發生錯誤，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="binder-auth-stage">
      {/* 5. Academic Hand-Drawn Technical Sketches Background */}
      <AcademicHandDrawnBackdrop subject="all" />
      {/* 3. Gold Geometric Page Corner Ornaments */}
      <GoldCornerOrnaments size={68} inset={14} opacity={0.58} />

      {/* Expandable Offline Dino Game Above Login Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: showDinoGame ? '640px' : '460px',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          transition: 'max-width 0.2s ease',
        }}
      >
        <button
          type="button"
          onClick={() => setShowDinoGame((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '9px',
            minHeight: '46px',
            minWidth: '230px',
            padding: '10px 22px',
            borderRadius: '999px',
            fontSize: '0.94rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: currentTheme === 'dark' ? '#24201c' : '#faf6ee',
            border: `1px solid ${currentTheme === 'dark' ? '#463d34' : '#d8ccb8'}`,
            color: currentTheme === 'dark' ? '#e8dfd1' : '#3d342b',
            boxShadow: '0 4px 12px rgba(45, 35, 20, 0.1)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {showDinoGame ? (
            <>
              <ChevronUp size={18} />
              <span>收合小恐龍遊戲</span>
            </>
          ) : (
            <>
              <Gamepad2 size={18} />
              <span>休息一下 · 玩離線小恐龍</span>
            </>
          )}
        </button>

        {showDinoGame && (
          <div style={{ width: '100%' }}>
            <DinoGame theme={currentTheme} compact />
          </div>
        )}
      </div>

      <div className="binder-auth-wrapper" style={{ position: 'relative', zIndex: 2 }}>
        <div className="binder-auth-card" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* 3. Gold Geometric Corner Brackets on Dossier Card */}
          <GoldCornerOrnaments size={44} inset={8} opacity={0.62} corners={['tr', 'br']} />
          {/* Brass Binder Rings along the left gutter */}
          <div className="binder-auth-rings" aria-hidden="true">
            <div className="binder-auth-ring-hole" />
            <div className="binder-auth-ring-hole" />
            <div className="binder-auth-ring-hole" />
            <div className="binder-auth-ring-hole" />
          </div>

          {/* Dossier Header - Centered Logo */}
          <div
            className="binder-auth-header"
            style={{
              paddingLeft: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div
              className="binder-auth-logo-box"
              style={{
                width: '60px',
                height: '60px',
                padding: '5px',
                margin: '0 auto 12px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img src="/logo.png" alt="POBI STUDIO" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
            <h1 className="binder-auth-title">
              POBI STUDIO
            </h1>
            <p className="binder-auth-subtitle">
              {isLogin ? '數位錯題手帳 · Explore. Decode. Understand.' : '建立專屬數位活頁手帳帳戶'}
            </p>
            <GoldGeometricDivider style={{ marginTop: '12px' }} />
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div
              style={{
                marginLeft: '12px',
                marginBottom: '16px',
                padding: '9px 12px',
                borderRadius: '6px',
                fontSize: '0.84rem',
                fontWeight: 500,
                backgroundColor: currentTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                border: currentTheme === 'dark' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #ef4444',
                color: currentTheme === 'dark' ? '#fca5a5' : '#991b1b'
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                marginLeft: '12px',
                marginBottom: '16px',
                padding: '9px 12px',
                borderRadius: '6px',
                fontSize: '0.84rem',
                fontWeight: 500,
                backgroundColor: currentTheme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                border: currentTheme === 'dark' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid #22c55e',
                color: currentTheme === 'dark' ? '#86efac' : '#14532d'
              }}
            >
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="binder-auth-input-group">
              <label className="binder-auth-label">
                使用者名稱
              </label>
              <div className="binder-auth-input-wrapper">
                <span className="binder-auth-input-icon">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  className="binder-auth-input"
                  placeholder="請輸入使用者名稱"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="binder-auth-input-group">
              <label className="binder-auth-label">
                密碼
              </label>
              <div className="binder-auth-input-wrapper">
                <span className="binder-auth-input-icon">
                  <Key size={16} />
                </span>
                <input
                  type="password"
                  className="binder-auth-input"
                  placeholder={isLogin ? '請輸入密碼' : '請設定登入密碼'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            <button
              type="submit"
              className="binder-auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                '處理中...'
              ) : isLogin ? (
                <>
                  <span>翻開手帳登入</span>
                  <LogIn size={16} />
                </>
              ) : (
                <>
                  <span>立即建立帳戶</span>
                  <UserPlus size={16} />
                </>
              )}
            </button>
          </form>

          {/* OAuth Divider & Google Login Button */}
          <div className="binder-auth-divider" role="separator">
            <span>或</span>
          </div>

          <button
            type="button"
            className="binder-auth-google-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.29 14.29A7.18 7.18 0 0 1 4.91 12c0-.79.14-1.56.38-2.29v-3.1H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.39l4-3.1Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l4 3.1c.94-2.84 3.59-4.96 6.71-4.96Z"
              />
            </svg>
            <span>使用 Google 帳號繼續</span>
          </button>

          {/* Switch Login/Register */}
          <div
            style={{
              marginTop: '16px',
              paddingLeft: '12px',
              textAlign: 'center',
              fontSize: '0.84rem',
              color: 'var(--binder-text-muted)'
            }}
          >
            <span>{isLogin ? '初次使用？' : '已有手帳帳戶？'}</span>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--binder-accent)',
                cursor: 'pointer',
                fontWeight: 700,
                marginLeft: '6px',
                textDecoration: 'underline'
              }}
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
                setRegisterAsAdmin(false);
              }}
              disabled={loading}
            >
              {isLogin ? '建立新帳號' : '前往登入'}
            </button>
          </div>

          {/* Admin toggle if register */}
          {!isLogin && (
            <div
              style={{
                marginTop: '10px',
                paddingLeft: '12px',
                textAlign: 'center',
                fontSize: '0.8rem'
              }}
            >
              <button
                type="button"
                onClick={() => setRegisterAsAdmin(prev => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: registerAsAdmin ? 'var(--success)' : 'var(--binder-text-muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: registerAsAdmin ? 700 : 500
                }}
                disabled={loading}
              >
                <ShieldCheck size={14} />
                <span>{registerAsAdmin ? '已啟用管理員註冊' : '以管理員身份註冊'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
