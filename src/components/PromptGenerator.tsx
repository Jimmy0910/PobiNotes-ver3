import { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';
import {
  BUILTIN_PROMPT_TEMPLATES,
  mergePromptTemplates,
  type PromptTemplateItem
} from '../utils/promptTemplates';
import {
  Sparkles,
  Copy,
  Check,
  Save,
  Plus,
  Trash2,
  RotateCcw,
  FileText
} from 'lucide-react';

const VARIABLE_TOKENS = [
  { token: '{{錯題總數}}', desc: '選取題數' },
  { token: '{{科目清單}}', desc: '所屬科目' },
  { token: '{{章節清單}}', desc: '所屬章節' },
  { token: '{{單元清單}}', desc: '所屬單元' },
  { token: '{{熟悉度分布}}', desc: '熟悉度統計' },
  { token: '{{主要錯因分布}}', desc: '錯因統計' },
  { token: '{{錯題完整清單}}', desc: '逐題題幹與解析' }
];

export default function PromptGenerator() {
  const { showToast, confirmDialog } = useUiFeedback();
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(BUILTIN_PROMPT_TEMPLATES[0].id);

  // Editable form state
  const [templateName, setTemplateName] = useState<string>(BUILTIN_PROMPT_TEMPLATES[0].name);
  const [templateDesc, setTemplateDesc] = useState<string>(BUILTIN_PROMPT_TEMPLATES[0].description);
  const [templateContent, setTemplateContent] = useState<string>(BUILTIN_PROMPT_TEMPLATES[0].content);

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSavedTemplates = async () => {
    try {
      const res = await apiRequest('/api/prompt-templates');
      setSavedTemplates(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('載入提詞範本失敗:', e);
    }
  };

  useEffect(() => {
    fetchSavedTemplates();
  }, []);

  const allTemplates = useMemo(
    () => mergePromptTemplates(savedTemplates),
    [savedTemplates]
  );

  const activeTemplate = useMemo(
    () => allTemplates.find(t => t.id === activeTemplateId) || allTemplates[0],
    [allTemplates, activeTemplateId]
  );

  const handleSelectTemplate = (tpl: PromptTemplateItem) => {
    setActiveTemplateId(tpl.id);
    setTemplateName(tpl.name);
    setTemplateDesc(tpl.description);
    setTemplateContent(tpl.content);
  };

  const handleCreateBlankCustom = () => {
    setActiveTemplateId('__NEW_CUSTOM__');
    setTemplateName('我的自訂 AI 提詞');
    setTemplateDesc('自訂分析與複習指示');
    setTemplateContent(
      `請根據我提供的 {{錯題總數}} 道錯題（科目：{{科目清單}}｜章節：{{章節清單}}｜熟悉度：{{熟悉度分布}}｜錯因：{{主要錯因分布}}），協助我進行重點診斷與複習規劃：\n\n{{錯題完整清單}}`
    );
  };

  const handleSaveTemplate = async (saveAsNew: boolean) => {
    if (!templateName.trim() || !templateContent.trim()) {
      showToast('請填寫提詞名稱與內容', 'error');
      return;
    }
    setSaving(true);
    try {
      const isCreatingNew = saveAsNew || activeTemplateId === '__NEW_CUSTOM__';
      const currentTpl = allTemplates.find(t => t.id === activeTemplateId);

      if (isCreatingNew) {
        const finalName =
          saveAsNew && currentTpl && templateName.trim() === currentTpl.name
            ? `${templateName.trim()} (自訂)`
            : templateName.trim();
        const res = await apiRequest('/api/prompt-templates', {
          method: 'POST',
          body: {
            baseKey: null,
            name: finalName,
            description: templateDesc.trim(),
            content: templateContent
          }
        });
        await fetchSavedTemplates();
        if (res?.template?.id) {
          setActiveTemplateId(res.template.id);
          setTemplateName(finalName);
        }
        showToast(`已新增自訂提詞「${finalName}」`, 'success');
      } else if (currentTpl?.isBuiltIn && !currentTpl.isModified) {
        const res = await apiRequest('/api/prompt-templates', {
          method: 'POST',
          body: {
            baseKey: currentTpl.base_key,
            name: templateName.trim(),
            description: templateDesc.trim(),
            content: templateContent
          }
        });
        await fetchSavedTemplates();
        if (res?.template?.id) {
          setActiveTemplateId(res.template.id);
        }
        showToast(`已儲存對「${templateName.trim()}」的自訂修改`, 'success');
      } else if (currentTpl) {
        await apiRequest('/api/prompt-templates', {
          method: 'PUT',
          body: {
            id: currentTpl.id,
            name: templateName.trim(),
            description: templateDesc.trim(),
            content: templateContent
          }
        });
        await fetchSavedTemplates();
        showToast(`已更新提詞「${templateName.trim()}」`, 'success');
      }
    } catch (e: any) {
      showToast(e?.message || '儲存提詞範本失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrReset = async (tpl: PromptTemplateItem) => {
    const ok = await confirmDialog({
      title: tpl.isBuiltIn ? '還原預設提詞' : '刪除自訂提詞',
      message: tpl.isBuiltIn
        ? `確定要將「${tpl.name}」還原為系統原始預設內容嗎？`
        : `確定要永久刪除自訂提詞「${tpl.name}」嗎？`,
      confirmText: tpl.isBuiltIn ? '確認還原' : '確認刪除',
      cancelText: '取消',
      danger: true
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/prompt-templates?id=${tpl.id}`, { method: 'DELETE' });
      await fetchSavedTemplates();
      handleSelectTemplate(BUILTIN_PROMPT_TEMPLATES[0]);
      showToast(tpl.isBuiltIn ? '已還原預設提詞內容' : '已刪除自訂提詞', 'success');
    } catch (e: any) {
      showToast(e?.message || '操作失敗', 'error');
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(templateContent);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = templateContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    showToast('已複製提詞範本內容', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const insertVariableToken = (token: string) => {
    setTemplateContent(prev => `${prev}${token}`);
  };

  return (
    <div
      data-testid="prompt-manager-view"
      style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', overflowY: 'auto' }}
      className="animate-fade-in"
    >
      <div style={{ width: '100%', maxWidth: '1120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header */}
        <div
          className="glass"
          style={{
            padding: '18px 22px',
            borderTop: '2.5px solid #C89A50',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.32rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '9px' }}>
              <Sparkles size={20} style={{ color: '#D97706' }} />
              <span>AI 提詞管理</span>
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              專注管理與自訂您的 AI 提詞範本；儲存後可於各科目「分析與工坊」勾選範圍時直接套用並打包成 ZIP。
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateBlankCustom}
            data-testid="prompt-create-custom-btn"
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>新增自訂提詞</span>
          </button>
        </div>

        {/* Two-Column Pure Prompt Template Manager */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(250px, 320px) minmax(0, 1fr)',
            gap: '16px',
            alignItems: 'start'
          }}
          className="guide-layout-grid"
        >
          {/* Left Column: Template List */}
          <div className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} />
              <span>提詞範本列表（{allTemplates.length}）</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allTemplates.map(tpl => {
                const isSelected = activeTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    data-testid={`prompt-template-item-${tpl.id}`}
                    style={{
                      padding: '11px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                      backgroundColor: isSelected ? 'var(--warning-bg)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'border-color 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {tpl.name}
                      </span>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {tpl.isRecommended && (
                          <span className="badge-recommended-tag">推薦</span>
                        )}
                        {!tpl.isBuiltIn && (
                          <span className="pobi-tag-chip" style={{ fontSize: '0.68rem' }}>自訂</span>
                        )}
                        {tpl.isBuiltIn && tpl.isModified && (
                          <span className="pobi-tag-chip" style={{ fontSize: '0.68rem' }}>已修改</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {tpl.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Template Editor */}
          <div className="glass" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeTemplateId === '__NEW_CUSTOM__' ? '建立新自訂提詞範本' : `編輯範本：${activeTemplate?.name || ''}`}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? '已複製' : '複製範本文字'}</span>
                </button>

                {activeTemplateId !== '__NEW_CUSTOM__' && activeTemplate && (!activeTemplate.isBuiltIn || activeTemplate.isModified) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOrReset(activeTemplate)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.82rem', color: 'var(--danger)' }}
                  >
                    {activeTemplate.isBuiltIn ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                    <span>{activeTemplate.isBuiltIn ? '還原預設' : '刪除範本'}</span>
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label className="form-label">範本名稱</label>
                <input
                  type="text"
                  className="input"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="輸入容易辨識的提詞名稱"
                  data-testid="prompt-name-input"
                />
              </div>
              <div>
                <label className="form-label">用途說明（選填）</label>
                <input
                  type="text"
                  className="input"
                  value={templateDesc}
                  onChange={e => setTemplateDesc(e.target.value)}
                  placeholder="簡述此提詞的適用情境"
                />
              </div>
            </div>

            {/* Variable Insertion Bar */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                點擊插入動態變數（於各科「分析與工坊」匯出時將自動替換為篩選後的錯題資料）：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {VARIABLE_TOKENS.map(v => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertVariableToken(v.token)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '999px' }}
                    title={`插入 ${v.desc}`}
                  >
                    <span>{v.token}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="form-label">提詞內容</label>
              <textarea
                className="input"
                value={templateContent}
                onChange={e => setTemplateContent(e.target.value)}
                style={{ minHeight: '280px', fontSize: '0.88rem', lineHeight: 1.65, fontFamily: 'inherit', resize: 'vertical' }}
                placeholder="在此編寫 AI 提詞指示..."
                data-testid="prompt-content-textarea"
              />
            </div>

            {/* Save Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--glass-border)' }}>
              {activeTemplateId !== '__NEW_CUSTOM__' && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveTemplate(true)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 600 }}
                >
                  <Plus size={15} />
                  <span>另存為新自訂範本</span>
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveTemplate(false)}
                data-testid="prompt-save-btn"
                className="btn btn-primary"
                style={{ padding: '9px 20px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                <Save size={15} />
                <span>{saving ? '儲存中...' : activeTemplateId === '__NEW_CUSTOM__' ? '建立自訂提詞' : '儲存範本變更'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
