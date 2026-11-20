import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../utils/api';
import type { MistakeRecord } from '../types';
import { useUiFeedback } from './UiFeedbackProvider';
import { X, Share2, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';

interface SharePackModalProps {
  defaultTitle: string;
  mistakes: MistakeRecord[];
  onClose: () => void;
}

function serializeMistakeForShare(m: MistakeRecord) {
  const qData = m.data?.questionData || {};
  const aData = m.data?.answerData || {};
  const qDesc = qData.q_desc || qData.desc || qData.q_text || qData.text || '';
  const aDesc = aData.a_desc || aData.desc || aData.a_text || aData.text || aData.key_concept || '';

  const qImages: string[] = [];
  if (Array.isArray(qData.q_images)) qData.q_images.forEach((x: any) => typeof x === 'string' && x.trim() && qImages.push(x.trim()));
  for (const k of ['q_image', 'q_img', 'image']) {
    if (typeof qData[k] === 'string' && qData[k].trim()) qImages.push(qData[k].trim());
  }

  const aImages: string[] = [];
  if (Array.isArray(aData.a_images)) aData.a_images.forEach((x: any) => typeof x === 'string' && x.trim() && aImages.push(x.trim()));
  for (const k of ['a_image', 'a_img']) {
    if (typeof aData[k] === 'string' && aData[k].trim()) aImages.push(aData[k].trim());
  }

  return {
    id: m.id,
    title: m.title,
    subjectName: m.subject_name || '',
    chapterName: m.chapter_name || '',
    unitName: m.unit_name || '',
    familiarityName: m.familiarity_name || '',
    errorReasons: Array.isArray(m.error_reason_names) ? m.error_reason_names : [],
    qDesc: typeof qDesc === 'string' ? qDesc.trim() : '',
    qImages: Array.from(new Set(qImages)),
    aDesc: typeof aDesc === 'string' ? aDesc.trim() : '',
    aImages: Array.from(new Set(aImages))
  };
}

export default function SharePackModal({ defaultTitle, mistakes, onClose }: SharePackModalProps) {
  const { showToast } = useUiFeedback();
  const [title, setTitle] = useState(defaultTitle);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => mistakes.slice(0, 20).map(m => m.id));
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleCreateLink = async () => {
    const picked = mistakes.filter(m => selectedIds.includes(m.id));
    if (picked.length === 0) {
      showToast('請至少勾選 1 道錯題', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await apiRequest<{ success: boolean; shareId: string }>('/api/share', {
        method: 'POST',
        body: {
          title: title.trim() || defaultTitle,
          items: picked.map(serializeMistakeForShare)
        }
      });
      if (res?.shareId) {
        const url = `${window.location.origin}${window.location.pathname}?share=${res.shareId}`;
        setShareUrl(url);
        showToast('已建立唯讀錯題分享連結', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || '建立分享連結失敗', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('已複製分享連結到剪貼簿', 'success');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('請手動選取並複製連結', 'info');
    }
  };

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
        zIndex: 100040,
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
        if (e.target === e.currentTarget && !creating) onClose();
      }}
    >
      <div
        data-testid="share-pack-modal"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: 'min(86dvh, 86vh)',
          backgroundColor: 'var(--bg-secondary, #FFFFFF)',
          color: 'var(--text-primary, #1C1917)',
          borderRadius: '14px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>建立錯題包唯讀分享連結</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                對方不須登入即可閱讀題目與解析，適合與同學討論或請家教老師批改
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {shareUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', fontSize: '0.86rem', fontWeight: 600 }}>
                唯讀分享連結已產生！任何擁有此連結的人都可檢視這 {selectedIds.length} 道錯題，但無法修改您的個人資料。
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="input"
                  style={{ flex: 1, fontSize: '0.84rem', padding: '8px 10px' }}
                  data-testid="share-pack-url-input"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copied ? '已複製' : '複製'}</span>
                </button>
              </div>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start', padding: '7px 14px', fontSize: '0.83rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <ExternalLink size={14} /> 在新分頁預覽分享頁面
              </a>
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  分享包標題
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.88rem' }}
                  placeholder="例：高二數學段考精華錯題包"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600 }}>勾選要包含的錯題（已選 {selectedIds.length} / {mistakes.length} 題）</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(mistakes.slice(0, 50).map(m => m.id))}
                      className="btn btn-text"
                      style={{ fontSize: '0.78rem', padding: '2px 6px' }}
                    >
                      全選
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="btn btn-text"
                      style={{ fontSize: '0.78rem', padding: '2px 6px' }}
                    >
                      清除
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {mistakes.map(m => {
                    const checked = selectedIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          backgroundColor: checked ? '#FFFBEB' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.84rem'
                        }}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(m.id)} />
                        <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.title}
                        </span>
                        {m.chapter_name && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {m.chapter_name}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.84rem' }}>
            {shareUrl ? '完成' : '取消'}
          </button>
          {!shareUrl && (
            <button
              type="button"
              onClick={handleCreateLink}
              disabled={creating || selectedIds.length === 0}
              className="btn btn-primary"
              style={{ padding: '7px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              data-testid="create-share-link-btn"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
              <span>{creating ? '產生連結中...' : '產生唯讀分享連結'}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
