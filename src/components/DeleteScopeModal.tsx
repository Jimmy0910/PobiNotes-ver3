import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Inbox, AlertTriangle } from 'lucide-react';

export interface DeleteScopeTarget {
  dimension: 'subject' | 'chapter' | 'unit';
  id: string;
  name: string;
  mistakeCount: number;
}

interface DeleteScopeModalProps {
  target: DeleteScopeTarget;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (choice: 'move_to_uncategorized' | 'purge') => Promise<void> | void;
}

const DIM_LABELS: Record<'subject' | 'chapter' | 'unit', string> = {
  subject: '錯題本（科目）',
  chapter: '章節',
  unit: '小單元'
};

export default function DeleteScopeModal({
  target,
  busy = false,
  onCancel,
  onConfirm
}: DeleteScopeModalProps) {
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const dimLabel = DIM_LABELS[target.dimension];

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 100060,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        data-testid="delete-scope-modal"
        className="pobi-surface-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          borderRadius: '14px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header with Top-Right Close Button */}
        <div
          style={{
            padding: '15px 20px',
            borderBottom: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem', color: 'var(--danger)' }}>
            <AlertTriangle size={18} />
            <span>刪除{dimLabel}確認</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
            title="關閉視窗"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--text-primary)' }}>
            確定要刪除{dimLabel}「<strong>{target.name}</strong>」嗎？
          </p>

          {target.mistakeCount > 0 ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--warning-border)',
                backgroundColor: 'var(--warning-bg)',
                color: 'var(--warning-text)',
                fontSize: '0.84rem',
                lineHeight: 1.6
              }}
            >
              此{dimLabel}底下目前包含 <strong>{target.mistakeCount} 道錯題</strong>，請選擇這些題目的處理方式：
            </div>
          ) : (
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              此{dimLabel}目前沒有任何錯題，刪除不會影響其他資料。
            </div>
          )}

          {/* Action Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            {target.mistakeCount > 0 ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onConfirm('move_to_uncategorized')}
                  data-testid="delete-scope-move-uncategorized-btn"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Inbox size={16} />
                  <span>刪除分類，將 {target.mistakeCount} 題放到「未分類區」</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onConfirm('purge')}
                  data-testid="delete-scope-purge-btn"
                  className="btn btn-danger"
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Trash2 size={16} />
                  <span>連同 {target.mistakeCount} 道題目一併永久刪除</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => onConfirm('move_to_uncategorized')}
                data-testid="delete-scope-confirm-empty-btn"
                className="btn btn-danger"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Trash2 size={16} />
                <span>確認刪除「{target.name}」</span>
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '9px 16px', fontSize: '0.86rem' }}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
