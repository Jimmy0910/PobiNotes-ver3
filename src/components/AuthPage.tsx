import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { LogIn, UserPlus, Key, User, ShieldCheck } from 'lucide-react';
import {
  GoldCornerOrnaments,
  GoldGeometricDivider,
  AcademicHandDrawnBackdrop
} from './PobiDesignElements';

interface AuthPageProps {
  onLoginSuccess: (user: { id: string; username: string; is_admin: number }) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthPage({ onLoginSuccess, initialMode = 'login' }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerAsAdmin, setRegisterAsAdmin] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('light');

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
