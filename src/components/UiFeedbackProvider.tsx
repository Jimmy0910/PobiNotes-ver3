import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X, RotateCcw, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  undoLabel?: string;
  onUndo?: () => Promise<void> | void;
  durationMs?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface PromptOptions {
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  undoLabel?: string;
  onUndo?: () => Promise<void> | void;
}

interface UiFeedbackContextValue {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  confirmDialog: (options: ConfirmOptions) => Promise<boolean>;
  promptDialog: (options: PromptOptions) => Promise<string | null>;
}

const UiFeedbackContext = createContext<UiFeedbackContextValue | null>(null);

export function useUiFeedback(): UiFeedbackContextValue {
  const ctx = useContext(UiFeedbackContext);
  if (!ctx) {
    throw new Error('useUiFeedback must be used within UiFeedbackProvider');
  }
  return ctx;
}

export function UiFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimers = useRef<Record<string, number>>({});

  // Confirm Dialog state
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  // Prompt Dialog state
  const [promptState, setPromptState] = useState<{
    options: PromptOptions;
    value: string;
    resolve: (val: string | null) => void;
  } | null>(null);

  const dismissToast = useCallback((id: string) => {
    if (toastTimers.current[id]) {
      window.clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = options?.durationMs ?? (options?.onUndo ? 5500 : 3800);
      setToasts(prev => [...prev.slice(-3), { id, message, type, undoLabel: options?.undoLabel, onUndo: options?.onUndo }]);
      toastTimers.current[id] = window.setTimeout(() => {
        dismissToast(id);
      }, duration);
    },
    [dismissToast]
  );

  const confirmDialog = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const promptDialog = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise(resolve => {
      setPromptState({ options, value: options.defaultValue || '', resolve });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (!confirmState) return;
    const { resolve } = confirmState;
    setConfirmState(null);
    resolve(result);
  };

  const handlePromptClose = (result: string | null) => {
    if (!promptState) return;
    const { resolve } = promptState;
    setPromptState(null);
    resolve(result);
  };

  return (
    <UiFeedbackContext.Provider value={{ showToast, confirmDialog, promptDialog }}>
      {children}

      {/* Global Toast Stack */}
      {toasts.length > 0 &&
        createPortal(
          <div
            data-testid="ui-toast-stack"
            style={{
              position: 'fixed',
              bottom: 'max(20px, env(safe-area-inset-bottom))',
              right: '20px',
              left: 'auto',
              maxWidth: 'min(420px, calc(100vw - 32px))',
              zIndex: 100100,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              pointerEvents: 'none'
            }}
          >
            {toasts.map(t => {
              const colors =
                t.type === 'success'
                  ? { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: <CheckCircle2 size={17} /> }
                  : t.type === 'error'
                    ? { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: <AlertCircle size={17} /> }
                    : { bg: '#FFFBEB', border: '#D97706', text: '#92400E', icon: <Info size={17} /> };
              return (
                <div
                  key={t.id}
                  style={{
                    pointerEvents: 'auto',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    borderRadius: '10px',
                    padding: '11px 14px',
                    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    fontSize: '0.86rem',
                    fontWeight: 600
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ flexShrink: 0, display: 'flex' }}>{colors.icon}</span>
                    <span style={{ lineHeight: 1.45, wordBreak: 'break-word' }}>{t.message}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {t.onUndo && (
                      <button
                        type="button"
                        onClick={async () => {
                          const fn = t.onUndo;
                          dismissToast(t.id);
                          await fn?.();
                        }}
                        style={{
                          background: '#FFFFFF',
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                          borderRadius: '6px',
                          padding: '3px 9px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RotateCcw size={12} />
                        {t.undoLabel || '復原'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => dismissToast(t.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: colors.text,
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        opacity: 0.75
                      }}
                      title="關閉通知"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>,
          document.body
        )}

      {/* Global Confirm Dialog */}
      {confirmState &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100dvh',
              zIndex: 100080,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              boxSizing: 'border-box'
            }}
            onClick={e => {
              if (e.target === e.currentTarget) handleConfirmClose(false);
            }}
          >
            <div
              data-testid="ui-confirm-dialog"
              style={{
                width: '100%',
                maxWidth: '430px',
                backgroundColor: 'var(--bg-secondary, #FFFFFF)',
                color: 'var(--text-primary, #1C1917)',
                borderRadius: '14px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    backgroundColor: confirmState.options.danger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                    color: confirmState.options.danger ? '#DC2626' : '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  {confirmState.options.title}
                </h3>
              </div>

              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {confirmState.options.message}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="btn btn-secondary"
                  style={{ padding: '7px 14px', fontSize: '0.85rem' }}
                >
                  {confirmState.options.cancelText || '取消'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmClose(true)}
                  className={`btn ${confirmState.options.danger ? 'btn-danger' : 'btn-primary'}`}
                  style={{ padding: '7px 16px', fontSize: '0.85rem', fontWeight: 700 }}
                  data-testid="ui-confirm-ok-btn"
                >
                  {confirmState.options.confirmText || '確認'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Global Prompt Dialog */}
      {promptState &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100dvh',
              zIndex: 100080,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              boxSizing: 'border-box'
            }}
            onClick={e => {
              if (e.target === e.currentTarget) handlePromptClose(null);
            }}
          >
            <div
              data-testid="ui-prompt-dialog"
              style={{
                width: '100%',
                maxWidth: '430px',
                backgroundColor: 'var(--bg-secondary, #FFFFFF)',
                color: 'var(--text-primary, #1C1917)',
                borderRadius: '14px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                {promptState.options.title}
              </h3>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  handlePromptClose(promptState.value);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: 0 }}
              >
                <div>
                  {promptState.options.label && (
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      {promptState.options.label}
                    </label>
                  )}
                  <input
                    type="text"
                    autoFocus
                    className="input"
                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.9rem' }}
                    placeholder={promptState.options.placeholder || ''}
                    value={promptState.value}
                    onChange={e => setPromptState(prev => (prev ? { ...prev, value: e.target.value } : null))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handlePromptClose(null)}
                    className="btn btn-secondary"
                    style={{ padding: '7px 14px', fontSize: '0.85rem' }}
                  >
                    {promptState.options.cancelText || '取消'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '7px 16px', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    {promptState.options.confirmText || '確認'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </UiFeedbackContext.Provider>
  );
}
