import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import JSZip from 'jszip';
import { apiRequest } from '../utils/api';
import type { CategoriesBundle, MistakeRecord } from '../types';
import { useUiFeedback } from './UiFeedbackProvider';
import {
  X,
  Download,
  Upload,
  Archive,
  FileJson,
  Loader2,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

interface BackupRestoreModalProps {
  categories: CategoriesBundle;
  mistakes: MistakeRecord[];
  onClose: () => void;
  onRestored: () => Promise<void>;
}

interface BackupPayload {
  version: number;
  exportedAt: string;
  categories: CategoriesBundle;
  mistakes: MistakeRecord[];
}

function collectImageKeys(obj: any, out: Set<string>) {
  if (!obj) return;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('/api/images/') ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(trimmed)
    ) {
      out.add(trimmed);
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach(item => collectImageKeys(item, out));
    return;
  }
  if (typeof obj === 'object') {
    Object.values(obj).forEach(val => collectImageKeys(val, out));
  }
}

function inferImageMime(pathOrKey: string): string {
  const lower = pathOrKey.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function replaceImageKeys(obj: any, map: Record<string, string>): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (map[trimmed]) return map[trimmed];
    const bare = trimmed.replace(/^\/api\/images\//, '');
    if (map[bare]) return map[bare];
    if (map[`/api/images/${bare}`]) return map[`/api/images/${bare}`];
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => replaceImageKeys(item, map));
  }
  if (typeof obj === 'object') {
    const copy: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      copy[k] = replaceImageKeys(v, map);
    }
    return copy;
  }
  return obj;
}

export default function BackupRestoreModal({
  categories,
  mistakes,
  onClose,
  onRestored
}: BackupRestoreModalProps) {
  const { showToast } = useUiFeedback();
  const [exporting, setExporting] = useState<'zip' | 'json' | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [parsedBackup, setParsedBackup] = useState<{
    payload: BackupPayload;
    zip?: JSZip;
    fileName: string;
  } | null>(null);
  const [progressText, setProgressText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    setExporting('json');
    try {
      const payload: BackupPayload = {
        version: 3,
        exportedAt: new Date().toISOString(),
        categories,
        mistakes
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      triggerDownload(blob, `PobiNotes-Backup-${dateStr}.json`);
      showToast('已匯出 JSON 備份檔', 'success');
    } catch (err: any) {
      showToast(err?.message || '匯出 JSON 失敗', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleExportZip = async () => {
    setExporting('zip');
    setProgressText('正在整理分類、錯題與圖片資源...');
    try {
      const zip = new JSZip();
      const payload: BackupPayload = {
        version: 3,
        exportedAt: new Date().toISOString(),
        categories,
        mistakes
      };

      const imageKeys = new Set<string>();
      mistakes.forEach(m => collectImageKeys(m.data, imageKeys));

      const imageManifest: Record<string, string> = {};
      const imgFolder = zip.folder('images');
      let imgIdx = 0;

      for (const rawKey of imageKeys) {
        imgIdx++;
        setProgressText(`正在打包圖片 (${imgIdx} / ${imageKeys.size})...`);
        try {
          if (rawKey.startsWith('data:image/')) {
            const match = rawKey.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            if (match && imgFolder) {
              const ext = match[1].split('/')[1]?.replace('jpeg', 'jpg') || 'png';
              const filename = `img_${imgIdx}.${ext}`;
              imgFolder.file(filename, match[2], { base64: true });
              imageManifest[rawKey] = `images/${filename}`;
            }
          } else {
            const fetchUrl = rawKey.startsWith('/api/images/') ? rawKey : `/api/images/${rawKey}`;
            const resp = await fetch(fetchUrl, { credentials: 'include' });
            if (resp.ok && imgFolder) {
              const blob = await resp.blob();
              const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
              const filename = `img_${imgIdx}.${ext}`;
              imgFolder.file(filename, blob);
              imageManifest[rawKey] = `images/${filename}`;
            }
          }
        } catch {
          // Skip unreachable image defensively
        }
      }

      zip.file('backup.json', JSON.stringify(payload, null, 2));
      zip.file('image_manifest.json', JSON.stringify(imageManifest, null, 2));

      setProgressText('正在壓縮產生 ZIP 檔案...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      triggerDownload(zipBlob, `PobiNotes-FullBackup-${dateStr}.zip`);
      showToast(`已匯出完整 ZIP 備份（含 ${Object.keys(imageManifest).length} 張圖片）`, 'success');
    } catch (err: any) {
      showToast(err?.message || '匯出 ZIP 備份失敗', 'error');
    } finally {
      setExporting(null);
      setProgressText('');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
        const zip = await JSZip.loadAsync(file);
        const backupFile = zip.file('backup.json') || zip.file(/backup\.json$/i)[0];
        if (!backupFile) {
          showToast('ZIP 壓縮檔內找不到 backup.json', 'error');
          return;
        }
        const jsonText = await backupFile.async('string');
        const payload = JSON.parse(jsonText) as BackupPayload;
        if (!payload?.categories || !Array.isArray(payload?.mistakes)) {
          showToast('備份檔格式不正確', 'error');
          return;
        }
        setParsedBackup({ payload, zip, fileName: file.name });
      } else {
        const text = await file.text();
        const payload = JSON.parse(text) as BackupPayload;
        if (!payload?.categories || !Array.isArray(payload?.mistakes)) {
          showToast('JSON 備份檔格式不正確', 'error');
          return;
        }
        setParsedBackup({ payload, fileName: file.name });
      }
    } catch (err: any) {
      showToast(err?.message || '解析備份檔失敗', 'error');
    }
  };

  const handleConfirmRestore = async () => {
    if (!parsedBackup || restoring) return;
    setRestoring(true);
    try {
      const { payload, zip } = parsedBackup;

      // 1. Restore image blobs if ZIP contains image_manifest.json (with explicit image/* Content-Type!)
      const remappedImages: Record<string, string> = {};
      if (zip) {
        const manifestFile = zip.file('image_manifest.json') || zip.file(/image_manifest\.json$/i)[0];
        if (manifestFile) {
          const manifest = JSON.parse(await manifestFile.async('string')) as Record<string, string>;
          const entries = Object.entries(manifest);
          for (let i = 0; i < entries.length; i++) {
            const [origKey, zipPath] = entries[i];
            setProgressText(`正在跨帳號還原圖片 (${i + 1} / ${entries.length})...`);
            const imgEntry = zip.file(zipPath);
            if (imgEntry) {
              const rawBlob = await imgEntry.async('blob');
              const mime = inferImageMime(zipPath);
              const typedBlob = new Blob([rawBlob], { type: mime });
              try {
                const upRes = await apiRequest<{ success: boolean; key: string }>('/api/images/upload', {
                  method: 'POST',
                  headers: { 'Content-Type': mime },
                  body: typedBlob
                });
                if (upRes?.key) {
                  const bareOrig = origKey.trim().replace(/^\/api\/images\//, '');
                  remappedImages[origKey.trim()] = upRes.key;
                  remappedImages[bareOrig] = upRes.key;
                  remappedImages[`/api/images/${bareOrig}`] = upRes.key;
                }
              } catch (imgErr) {
                console.warn('圖片還原上傳略過:', zipPath, imgErr);
              }
            }
          }
        }
      }

      // 2. Restore subjects (cross-account safe)
      setProgressText('正在還原科目、章節、小單元與錯因標籤...');
      const subjectIdMap: Record<string, string> = {};
      for (const s of payload.categories.subjects || []) {
        const existing = categories.subjects.find(cur => cur.name.trim() === s.name.trim());
        if (existing) {
          subjectIdMap[s.id] = existing.id;
        } else {
          const res = await apiRequest('/api/subjects', {
            method: 'POST',
            body: { name: s.name, color: s.color || 'default' }
          });
          subjectIdMap[s.id] = res?.id || res?.subject?.id || res?.item?.id || s.id;
        }
      }

      // 3. Restore chapters
      const chapterIdMap: Record<string, string> = {};
      for (const c of payload.categories.chapters || []) {
        const mappedSubjId = subjectIdMap[c.subject_id || c.parent_id || ''];
        if (!mappedSubjId) continue;
        const existing = categories.chapters.find(
          cur => (cur.subject_id || cur.parent_id) === mappedSubjId && cur.name.trim() === c.name.trim()
        );
        if (existing) {
          chapterIdMap[c.id] = existing.id;
        } else {
          const res = await apiRequest('/api/chapters', {
            method: 'POST',
            body: { name: c.name, subjectId: mappedSubjId, color: c.color || 'default' }
          });
          chapterIdMap[c.id] = res?.id || res?.chapter?.id || res?.item?.id || c.id;
        }
      }

      // 4. Restore units
      const unitIdMap: Record<string, string> = {};
      for (const u of payload.categories.units || []) {
        const mappedChapId = chapterIdMap[u.chapter_id || u.parent_id || ''];
        const mappedSubjId = subjectIdMap[u.subject_id || ''];
        if (!mappedChapId) continue;
        const existing = categories.units.find(
          cur => (cur.chapter_id || cur.parent_id) === mappedChapId && cur.name.trim() === u.name.trim()
        );
        if (existing) {
          unitIdMap[u.id] = existing.id;
        } else {
          const res = await apiRequest('/api/categories', {
            method: 'POST',
            body: { dimension: 'unit', name: u.name, parentId: mappedChapId, subjectId: mappedSubjId, color: u.color || 'default' }
          });
          unitIdMap[u.id] = res?.item?.id || u.id;
        }
      }

      // 4.5 Restore error reasons
      const errorReasonIdMap: Record<string, string> = {};
      for (const r of payload.categories.errorReasons || []) {
        const mappedParent = r.parent_id
          ? (chapterIdMap[r.parent_id] || subjectIdMap[r.parent_id] || null)
          : null;
        const existing = categories.errorReasons.find(
          cur => cur.name.trim() === r.name.trim() && (cur.parent_id || null) === mappedParent
        );
        if (existing) {
          errorReasonIdMap[r.id] = existing.id;
        } else {
          try {
            const res = await apiRequest('/api/categories', {
              method: 'POST',
              body: { dimension: 'error_reason', name: r.name, parentId: mappedParent, color: r.color || 'default' }
            });
            if (res?.item?.id) errorReasonIdMap[r.id] = res.item.id;
          } catch {}
        }
      }

      // 5. Restore mistakes (always bind to target account's template via templateId: null)
      const totalM = (payload.mistakes || []).length;
      let importedCount = 0;
      for (let i = 0; i < totalM; i++) {
        const m = payload.mistakes[i];
        setProgressText(`正在跨帳號匯入錯題 (${i + 1} / ${totalM})...`);
        const famMatch = categories.familiarities.find(f => f.name === m.familiarity_name);
        const mappedData = Object.keys(remappedImages).length > 0 ? replaceImageKeys(m.data, remappedImages) : m.data;
        const mappedReasons = Array.isArray(m.error_reason_ids)
          ? m.error_reason_ids.map(rid => errorReasonIdMap[rid]).filter(Boolean)
          : [];
        await apiRequest('/api/mistakes', {
          method: 'POST',
          body: {
            subjectId: m.subject_id ? (subjectIdMap[m.subject_id] || null) : null,
            chapterId: m.chapter_id ? (chapterIdMap[m.chapter_id] || null) : null,
            unitId: m.unit_id ? (unitIdMap[m.unit_id] || null) : null,
            familiarityId: famMatch?.id || null,
            errorReasonIds: mappedReasons,
            tags: Array.isArray(m.tags) ? m.tags : [],
            mistakeDate: m.mistake_date || new Date().toISOString().slice(0, 10),
            templateId: null,
            title: m.title || '匯入錯題',
            data: mappedData || { questionData: {}, answerData: {} }
          }
        });
        importedCount++;
      }

      await onRestored();
      showToast(`還原完成！共匯入 ${importedCount} 道錯題`, 'success');
      setParsedBackup(null);
      onClose();
    } catch (err: any) {
      showToast(err?.message || '還原過程發生錯誤', 'error');
    } finally {
      setRestoring(false);
      setProgressText('');
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
        if (e.target === e.currentTarget && !exporting && !restoring) onClose();
      }}
    >
      <div
        data-testid="backup-restore-modal"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: 'min(88dvh, 88vh)',
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
        {/* Header */}
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
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                backgroundColor: 'rgba(16, 185, 129, 0.14)',
                color: '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700 }}>個人資料完整備份與還原</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                隨時匯出所有科目、章節、錯題與圖片，資料完全掌握在自己手中
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!!exporting || restoring}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {progressText && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FFFBEB', border: '1px solid #F59E0B', color: '#92400E', fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={15} className="animate-spin" />
              <span>{progressText}</span>
            </div>
          )}

          {/* Export Section */}
          <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-primary, #FAF7F0)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} style={{ color: '#047857' }} /> 匯出個人備份
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                目前共 {categories.subjects.length} 科目 · {categories.chapters.length} 章節 · {mistakes.length} 道錯題
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                disabled={!!exporting || restoring}
                onClick={handleExportZip}
                className="btn btn-primary"
                style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
                data-testid="export-backup-zip-btn"
              >
                <Archive size={16} />
                <span>{exporting === 'zip' ? '打包 ZIP 中...' : '匯出完整 ZIP（含圖片）'}</span>
              </button>

              <button
                type="button"
                disabled={!!exporting || restoring}
                onClick={handleExportJson}
                className="btn btn-secondary"
                style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
                data-testid="export-backup-json-btn"
              >
                <FileJson size={16} />
                <span>{exporting === 'json' ? '匯出中...' : '匯出輕量 JSON 檔'}</span>
              </button>
            </div>
          </div>

          {/* Restore Section */}
          <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-secondary, #FFFFFF)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={16} style={{ color: '#B45309' }} /> 從備份檔還原（支援 .zip / .json）
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.json,application/json,application/zip"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {!parsedBackup ? (
              <button
                type="button"
                disabled={!!exporting || restoring}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '20px 14px',
                  borderRadius: '9px',
                  border: '1.5px dashed #D97706',
                  backgroundColor: '#FFFBEB',
                  color: '#92400E',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={17} />
                <span>選擇備份檔案（.zip 或 .json）</span>
              </button>
            ) : (
              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.35)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} /> 已讀取：{parsedBackup.fileName}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  包含 {parsedBackup.payload.categories.subjects?.length || 0} 個科目、{parsedBackup.payload.categories.chapters?.length || 0} 個章節、{parsedBackup.payload.mistakes?.length || 0} 道錯題（將以「增量匯入」方式合併至現有帳號，不覆蓋既有題目）。
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" onClick={() => setParsedBackup(null)} disabled={restoring} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    重新選擇
                  </button>
                  <button type="button" onClick={handleConfirmRestore} disabled={restoring} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700 }}>
                    {restoring ? '還原匯入中...' : '確認開始還原'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
