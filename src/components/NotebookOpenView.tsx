import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type {
  CategoriesBundle,
  MistakeRecord
} from '../types';
import {
  parseNotebookStyle,
  getNotebookPalette,
  getNotebookIcon
} from '../utils/notebookThemes';
import { apiRequest } from '../utils/api';
import MistakeEditor from './MistakeEditor';
import ImageAnnotatorModal from './ImageAnnotatorModal';
import {
  ArrowLeft,
  BookOpen,
  FolderPlus,
  Tag,
  Printer,
  Sparkles,
  Plus,
  X,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  PenTool,
  Search
} from 'lucide-react';

function resolveImg(key?: string): string {
  if (!key || typeof key !== 'string') return '';
  if (
    key.startsWith('data:') ||
    key.startsWith('blob:') ||
    key.startsWith('http://') ||
    key.startsWith('https://') ||
    key.startsWith('/api/images/')
  ) {
    return key;
  }
  return `/api/images/${key}`;
}

function isLikelyImageValue(val: unknown): boolean {
  if (typeof val !== 'string' || !val.trim()) return false;
  return (
    val.startsWith('data:image/') ||
    val.startsWith('blob:') ||
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('/api/images/') ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(val) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(val)
  );
}

function extractMistakeMediaAndText(m: MistakeRecord): {
  qDesc: string;
  qImages: string[];
  aDesc: string;
  aImages: string[];
} {
  const qData = m.data?.questionData || {};
  const aData = m.data?.answerData || {};

  // Extract Question Text
  const qTextParts: string[] = [];
  const primaryQText = qData.q_desc || qData.desc || qData.q_text || qData.text || '';
  if (typeof primaryQText === 'string' && primaryQText.trim()) {
    qTextParts.push(primaryQText.trim());
  }
  if (m.template_fields?.questionFields) {
    for (const f of m.template_fields.questionFields) {
      if (f.type === 'text') {
        const val = qData[f.id];
        if (typeof val === 'string' && val.trim() && !qTextParts.includes(val.trim())) {
          qTextParts.push(val.trim());
        }
      }
    }
  }
  if (qTextParts.length === 0) {
    for (const [k, v] of Object.entries(qData)) {
      if (
        typeof v === 'string' &&
        v.trim() &&
        !isLikelyImageValue(v) &&
        !k.includes('img') &&
        !k.includes('image')
      ) {
        qTextParts.push(v.trim());
      }
    }
  }

  // Extract Question Images
  const rawQImages: string[] = [];
  if (Array.isArray(qData.q_images)) {
    qData.q_images.forEach((img: unknown) => {
      if (typeof img === 'string' && img.trim()) rawQImages.push(img.trim());
    });
  }
  for (const key of ['q_image', 'q_img', 'image', 'image_url']) {
    const val = qData[key];
    if (typeof val === 'string' && val.trim()) rawQImages.push(val.trim());
  }
  if (m.template_fields?.questionFields) {
    for (const f of m.template_fields.questionFields) {
      if (f.type === 'image') {
        const val = qData[f.id];
        if (typeof val === 'string' && val.trim()) rawQImages.push(val.trim());
      }
    }
  }
  for (const [k, v] of Object.entries(qData)) {
    if ((k.includes('img') || k.includes('image') || isLikelyImageValue(v)) && typeof v === 'string' && v.trim()) {
      rawQImages.push(v.trim());
    }
  }
  const qImages = Array.from(new Set(rawQImages.map(resolveImg).filter(Boolean)));

  // Extract Answer Text
  const aTextParts: string[] = [];
  const primaryAText = aData.a_desc || aData.desc || aData.a_text || aData.text || aData.key_concept || '';
  if (typeof primaryAText === 'string' && primaryAText.trim()) {
    aTextParts.push(primaryAText.trim());
  }
  if (m.template_fields?.answerFields) {
    for (const f of m.template_fields.answerFields) {
      if (f.type === 'text') {
        const val = aData[f.id];
        if (typeof val === 'string' && val.trim() && !aTextParts.includes(val.trim())) {
          aTextParts.push(val.trim());
        }
      }
    }
  }
  if (aTextParts.length === 0) {
    for (const [k, v] of Object.entries(aData)) {
      if (
        typeof v === 'string' &&
        v.trim() &&
        !isLikelyImageValue(v) &&
        !k.includes('img') &&
        !k.includes('image')
      ) {
        aTextParts.push(v.trim());
      }
    }
  }

  // Extract Answer Images (Support multiple images per answer)
  const rawAImages: string[] = [];
  if (Array.isArray(aData.a_images)) {
    aData.a_images.forEach((img: unknown) => {
      if (typeof img === 'string' && img.trim()) rawAImages.push(img.trim());
    });
  }
  for (const key of ['a_image', 'a_img', 'image', 'image_url']) {
    const val = aData[key];
    if (typeof val === 'string' && val.trim()) rawAImages.push(val.trim());
  }
  if (m.template_fields?.answerFields) {
    for (const f of m.template_fields.answerFields) {
      if (f.type === 'image') {
        const val = aData[f.id];
        if (typeof val === 'string' && val.trim()) rawAImages.push(val.trim());
      }
    }
  }
  for (const [k, v] of Object.entries(aData)) {
    if ((k.includes('img') || k.includes('image') || isLikelyImageValue(v)) && typeof v === 'string' && v.trim()) {
      rawAImages.push(v.trim());
    }
  }
  const aImages = Array.from(new Set(rawAImages.map(resolveImg).filter(Boolean)));

  return {
    qDesc: qTextParts.join('\n\n'),
    qImages,
    aDesc: aTextParts.join('\n\n'),
    aImages
  };
}

interface NotebookOpenViewProps {
  subjectId: string;
  categories: CategoriesBundle;
  mistakes: MistakeRecord[];
  onBackToBookshelf: () => void;
  onSelectChapterUnit?: (chapterId: string | null, unitId: string | null) => void;
  onOpenNewMistakeForSubject?: (subjectId: string, chapterId?: string | null, unitId?: string | null) => void;
  onOpenMistakeBank?: (subjectId: string, chapterId?: string | null) => void;
  onOpenExportPDF: (subjectId: string) => void;
  onOpenTagManager: (subjectId: string) => void;
  onOpenTemplateManager?: (subjectId: string) => void;
  onOpenPromptGenerator: (subjectId: string) => void;
  onAddChapter: (subjectId: string, name: string) => Promise<void>;
  onAddUnit: (subjectId: string, chapterId: string, name: string) => Promise<void>;
  onRefreshAll?: () => Promise<void>;
  onUpdateMistake?: (updated: MistakeRecord) => void;
}

export default function NotebookOpenView({
  subjectId,
  categories,
  mistakes,
  onBackToBookshelf,
  onOpenExportPDF,
  onOpenTagManager,
  onOpenPromptGenerator,
  onAddChapter,
  onAddUnit,
  onRefreshAll,
  onUpdateMistake
}: NotebookOpenViewProps) {
  // Navigation & Filter states
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selfTestMode, setSelfTestMode] = useState<boolean>(false); // 自測模式：預設展開解析，切換後隱藏解析
  const [expandedMistakeIds, setExpandedMistakeIds] = useState<Record<string, boolean>>({});

  // Full MistakeEditor Modal state
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingMistake, setEditingMistake] = useState<MistakeRecord | null>(null);

  // Add Chapter / Unit modal state
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lightbox & Annotator state
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [annotatingData, setAnnotatingData] = useState<{
    mistake: MistakeRecord;
    fieldKey: string;
    isQuestion: boolean;
    imageUrl: string;
    answerIndex?: number;
  } | null>(null);

  // Active Subject & Chapters
  const activeSubject = useMemo(() => {
    return categories.subjects.find(s => s.id === subjectId) || {
      id: subjectId,
      name: '理化模考',
      color: 'kraft_camel|BookOpen'
    };
  }, [categories.subjects, subjectId]);

  const styleConfig = useMemo(() => parseNotebookStyle(activeSubject.color, activeSubject.name), [activeSubject.color, activeSubject.name]);
  const palette = useMemo(() => getNotebookPalette(styleConfig.paletteId), [styleConfig.paletteId]);
  const SubjectIcon = useMemo(() => getNotebookIcon(styleConfig.iconId), [styleConfig.iconId]);

  const subjectChapters = useMemo(() => {
    return categories.chapters.filter(c => c.subject_id === subjectId || c.parent_id === subjectId);
  }, [categories.chapters, subjectId]);

  // Sub-units of currently selected chapter
  const currentChapterUnits = useMemo(() => {
    if (!selectedChapterId) return [];
    return categories.units.filter(u => u.chapter_id === selectedChapterId || u.parent_id === selectedChapterId);
  }, [categories.units, selectedChapterId]);

  // All mistakes belonging to this subject
  const subjectMistakes = useMemo(() => {
    return mistakes.filter(m => m.subject_id === subjectId);
  }, [mistakes, subjectId]);

  // Filtered mistakes according to chapter, unit, and search query
  const filteredMistakes = useMemo(() => {
    return subjectMistakes.filter(m => {
      if (selectedChapterId && m.chapter_id !== selectedChapterId) {
        return false;
      }
      if (selectedUnitId && m.unit_id !== selectedUnitId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const extracted = extractMistakeMediaAndText(m);
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesQ = extracted.qDesc.toLowerCase().includes(q);
        const matchesA = extracted.aDesc.toLowerCase().includes(q);
        const matchesChapter = (m.chapter_name || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesQ && !matchesA && !matchesChapter) {
          return false;
        }
      }
      return true;
    });
  }, [subjectMistakes, selectedChapterId, selectedUnitId, searchQuery]);

  // Subject Statistics Summary
  const stats = useMemo(() => {
    const total = subjectMistakes.length;
    let masteredCount = 0;
    subjectMistakes.forEach(m => {
      const famName = m.familiarity_name || '';
      if (famName.includes('順') || famName.includes('精熟') || famName.includes('掌握')) {
        masteredCount++;
      }
    });
    const masteryPct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
    return { total, masteredCount, masteryPct };
  }, [subjectMistakes]);

  // Open Full Editor for New Mistake
  const handleOpenAddMistake = () => {
    setEditingMistake(null);
    setShowEditor(true);
  };

  // Open Full Editor for Editing Existing Mistake
  const handleOpenEditMistake = (m: MistakeRecord) => {
    setEditingMistake(m);
    setShowEditor(true);
  };

  // Delete mistake with confirmation
  const handleDeleteMistake = async (id: string, title: string) => {
    if (!confirm(`確定要刪除錯題「${title}」嗎？此動作將移至回收桶。`)) return;
    try {
      await apiRequest(`/api/mistakes?id=${id}`, {
        method: 'DELETE'
      });
      await onRefreshAll?.();
    } catch (err: any) {
      alert('刪除失敗：' + (err.message || String(err)));
    }
  };

  // Cycle Familiarity directly on mistake card
  const handleCycleFamiliarity = async (mistake: MistakeRecord) => {
    const activeFams = categories.familiarities.filter(f => f.is_active === 1);
    if (activeFams.length === 0) return;

    const currentIndex = activeFams.findIndex(
      f => f.id === mistake.familiarity_id || f.name === mistake.familiarity_name
    );
    const nextIndex = (currentIndex + 1) % activeFams.length;
    const nextFam = activeFams[nextIndex];

    const updated = {
      ...mistake,
      familiarity_id: nextFam.id,
      familiarity_name: nextFam.name,
      familiarity_color: nextFam.color
    };
    onUpdateMistake?.(updated);

    try {
      await apiRequest('/api/mistakes', {
        method: 'PUT',
        body: {
          id: mistake.id,
          familiarity_id: nextFam.id
        }
      });
      await onRefreshAll?.();
    } catch (e) {
      console.error('更新掌握度失敗', e);
    }
  };

  // Create Big Chapter
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setSubmitting(true);
    try {
      await onAddChapter(subjectId, newItemName.trim());
      setShowAddChapterModal(false);
      setNewItemName('');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Sub-Unit
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !showAddUnitModal) return;
    setSubmitting(true);
    try {
      await onAddUnit(subjectId, showAddUnitModal, newItemName.trim());
      setShowAddUnitModal(null);
      setNewItemName('');
    } finally {
      setSubmitting(false);
    }
  };

  // Save Annotated Image from Modal
  const handleSaveAnnotatedImage = async (newImgKey: string) => {
    if (!annotatingData) return;
    const { mistake, fieldKey, isQuestion, answerIndex } = annotatingData;
    const currentQData = { ...(mistake.data?.questionData || {}) };
    const currentAData = { ...(mistake.data?.answerData || {}) };

    if (isQuestion) {
      currentQData[fieldKey] = newImgKey;
      currentQData.q_image = newImgKey;
      currentQData.q_img = newImgKey;
    } else {
      const existingList = Array.isArray(currentAData.a_images)
        ? [...currentAData.a_images]
        : [currentAData.a_image || currentAData.a_img].filter(Boolean);
      if (typeof answerIndex === 'number' && answerIndex >= 0 && answerIndex < existingList.length) {
        existingList[answerIndex] = newImgKey;
      } else {
        existingList[0] = newImgKey;
      }
      currentAData.a_images = existingList;
      currentAData.a_image = existingList[0] || newImgKey;
      currentAData.a_img = existingList[0] || newImgKey;
    }

    const updatedMistake: MistakeRecord = {
      ...mistake,
      data: {
        ...mistake.data,
        questionData: currentQData,
        answerData: currentAData
      }
    };

    onUpdateMistake?.(updatedMistake);

    try {
      await apiRequest('/api/mistakes', {
        method: 'PUT',
        body: {
          id: mistake.id,
          data: updatedMistake.data
        }
      });
      await onRefreshAll?.();
    } catch (e) {
      console.error('儲存標註圖片失敗', e);
    } finally {
      setAnnotatingData(null);
    }
  };

  // Helper for Familiarity Display styling
  const getFamiliarityBadgeStyle = (m: MistakeRecord) => {
    const famName = m.familiarity_name || '';
    if (famName.includes('順') || famName.includes('精熟') || famName.includes('熟練')) {
      return {
        bg: 'rgba(25, 122, 39, 0.12)',
        border: '1px solid rgba(25, 122, 39, 0.4)',
        color: '#14532D',
        label: '掌握度：順 (精熟)'
      };
    }
    if (famName.includes('卡') || famName.includes('稍微')) {
      return {
        bg: 'rgba(217, 119, 6, 0.12)',
        border: '1px solid rgba(217, 119, 6, 0.4)',
        color: '#92400E',
        label: '掌握度：卡 (卡頓)'
      };
    }
    if (famName.includes('誤解')) {
      return {
        bg: 'rgba(220, 38, 38, 0.12)',
        border: '1px solid rgba(220, 38, 38, 0.4)',
        color: '#991B1B',
        label: '掌握度：誤解 (審題)'
      };
    }
    return {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.4)',
      color: '#B91C1C',
      label: '掌握度：不會 (生疏)'
    };
  };

  return (
    <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ width: '100%', maxWidth: '1160px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* TOP TOOLBAR: BREADCRUMB, STATS, SECONDARY ACTIONS, AND PROMINENT "+ 新增錯題" BUTTON */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 2px 8px rgba(60, 40, 20, 0.05)'
          }}
        >
          {/* Left: Back button & Subject Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onBackToBookshelf}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: 'var(--text-secondary)'
              }}
              title="返回書架首頁"
            >
              <ArrowLeft size={16} /> 返回書架
            </button>

            <span style={{ color: 'var(--text-muted)' }}>/</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: palette.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: palette.primary
                }}
              >
                <SubjectIcon size={16} />
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1C1917' }}>
                《{activeSubject.name}》手帳
              </span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(180, 83, 9, 0.08)',
                border: '1px solid rgba(180, 83, 9, 0.2)',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#92400E'
              }}
            >
              <span>共 {stats.total} 題</span>
              <span>·</span>
              <span>精熟率 {stats.masteryPct}%</span>
            </div>
          </div>

          {/* Right: Actions with High-Contrast Prominent "+ 新增錯題" */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelfTestMode(!selfTestMode)}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '0.84rem',
                fontWeight: 600
              }}
              title={selfTestMode ? '切換為完整顯示解析' : '切換為隱藏解答自測模式'}
            >
              {selfTestMode ? <Eye size={15} /> : <EyeOff size={15} />}
              {selfTestMode ? '自測中 (解析隱藏)' : '顯示全部解析'}
            </button>

            <button
              type="button"
              onClick={() => onOpenExportPDF(subjectId)}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '0.84rem',
                fontWeight: 600
              }}
              title="匯出 A4 練習卷或解析卷"
            >
              <Printer size={15} /> 試卷工坊
            </button>

            <button
              type="button"
              onClick={() => onOpenPromptGenerator(subjectId)}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '0.84rem',
                fontWeight: 600
              }}
              title="產生名師引導思考樹提詞"
            >
              <Sparkles size={15} /> AI 提詞
            </button>

            <button
              type="button"
              onClick={() => onOpenTagManager(subjectId)}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '0.84rem',
                fontWeight: 600
              }}
              title="管理本學科專屬錯因標籤"
            >
              <Tag size={15} /> 錯因標籤
            </button>

            {/* HIGH-CONTRAST PRIMARY ACTION: + 新增錯題 (PROMINENT AND UNMISTAKABLE) */}
            <button
              type="button"
              onClick={handleOpenAddMistake}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '0.92rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                color: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(180, 83, 9, 0.35)',
                border: '1px solid #B45309',
                cursor: 'pointer'
              }}
              title="開啟完整錯題編輯彈窗錄入題目"
            >
              <Plus size={18} strokeWidth={2.6} />
              <span>新增錯題</span>
            </button>
          </div>
        </div>

        {/* ROW 2: SEARCH & KEYWORD FILTER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '10px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid var(--glass-border)'
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '38px', height: '36px', width: '100%', fontSize: '0.86rem' }}
              placeholder="搜尋本學科錯題題旨、解析關鍵字..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            目前篩選呈現：<strong style={{ color: '#B45309', fontVariantNumeric: 'tabular-nums' }}>{filteredMistakes.length}</strong> / {stats.total} 題
          </div>
        </div>

        {/* ROW 3: CHAPTER HORIZONTAL TABS RAIL WITH DEDICATED "+ 新增大章節" BUTTON AT THE END */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            padding: '6px 2px',
            borderBottom: '2px solid rgba(180, 83, 9, 0.2)'
          }}
        >
          {/* Tab: 全部章節 */}
          <button
            type="button"
            onClick={() => {
              setSelectedChapterId(null);
              setSelectedUnitId(null);
            }}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: selectedChapterId === null ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
              borderBottom: selectedChapterId === null ? '2px solid #FFFBEB' : '1px solid var(--glass-border)',
              backgroundColor: selectedChapterId === null ? '#FFFBEB' : '#FFFFFF',
              color: selectedChapterId === null ? '#92400E' : 'var(--text-secondary)',
              fontWeight: selectedChapterId === null ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: selectedChapterId === null ? '0 -2px 6px rgba(180, 83, 9, 0.08)' : 'none'
            }}
          >
            <span>全部 ({subjectMistakes.length})</span>
          </button>

          {/* Chapter Tabs */}
          {subjectChapters.map(chap => {
            const isSelected = selectedChapterId === chap.id;
            const count = subjectMistakes.filter(m => m.chapter_id === chap.id).length;
            return (
              <button
                key={chap.id}
                type="button"
                onClick={() => {
                  setSelectedChapterId(chap.id);
                  setSelectedUnitId(null);
                }}
                style={{
                  flexShrink: 0,
                  padding: '8px 16px',
                  borderRadius: '8px 8px 0 0',
                  border: isSelected ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                  borderBottom: isSelected ? '2px solid #FFFBEB' : '1px solid var(--glass-border)',
                  backgroundColor: isSelected ? '#FFFBEB' : '#FFFFFF',
                  color: isSelected ? '#92400E' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isSelected ? '0 -2px 6px rgba(180, 83, 9, 0.08)' : 'none'
                }}
              >
                <span>{chap.name}</span>
                <span style={{ fontSize: '0.74rem', opacity: 0.85 }}>({count})</span>
              </button>
            );
          })}

          {/* DEDICATED DISTINCT BUTTON: + 新增大章節 (SEPARATED AT THE END) */}
          <button
            type="button"
            onClick={() => {
              setNewItemName('');
              setShowAddChapterModal(true);
            }}
            className="btn btn-secondary"
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent-primary)',
              marginLeft: 'auto'
            }}
            title="在此學科下新增一個大章節"
          >
            <FolderPlus size={15} />
            <span>+ 新增大章節</span>
          </button>
        </div>

        {/* ROW 4: SUB-UNITS TABS RAIL (ONLY WHEN A CHAPTER IS SELECTED) */}
        {selectedChapterId && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              padding: '8px 12px',
              backgroundColor: 'rgba(180, 83, 9, 0.04)',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400E', marginRight: '4px' }}>
              細部單元：
            </span>

            <button
              type="button"
              onClick={() => setSelectedUnitId(null)}
              style={{
                flexShrink: 0,
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: selectedUnitId === null ? 700 : 500,
                border: selectedUnitId === null ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                backgroundColor: selectedUnitId === null ? '#FDE68A' : '#FFFFFF',
                color: '#1C1917',
                cursor: 'pointer'
              }}
            >
              全部單元
            </button>

            {currentChapterUnits.map(unit => {
              const isSelected = selectedUnitId === unit.id;
              const count = subjectMistakes.filter(m => m.unit_id === unit.id).length;
              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setSelectedUnitId(unit.id)}
                  style={{
                    flexShrink: 0,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 700 : 500,
                    border: isSelected ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                    backgroundColor: isSelected ? '#FDE68A' : '#FFFFFF',
                    color: '#1C1917',
                    cursor: 'pointer'
                  }}
                >
                  {unit.name} ({count})
                </button>
              );
            })}

            {/* DEDICATED DISTINCT BUTTON: + 新增小單元 (SEPARATED AT THE END) */}
            <button
              type="button"
              onClick={() => {
                setNewItemName('');
                setShowAddUnitModal(selectedChapterId);
              }}
              style={{
                flexShrink: 0,
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: '1px dashed #D97706',
                backgroundColor: '#FFFFFF',
                color: '#92400E',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: 'auto'
              }}
              title="在此章節下建立細部單元"
            >
              <Plus size={13} />
              <span>+ 新增小單元</span>
            </button>
          </div>
        )}

        {/* ROW 5: MISTAKE CARDS STREAM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMistakes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '56px 20px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px dashed var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(180, 83, 9, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)'
                }}
              >
                <BookOpen size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {searchQuery ? '沒有找到相符的錯題記錄' : '此範圍內尚未收錄錯題'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.6 }}>
                點擊上方醒目的「<strong>＋ 新增錯題</strong>」按鈕，立即錄入您的第一道難題與詳解！
              </p>
              <button
                type="button"
                onClick={handleOpenAddMistake}
                className="btn btn-primary"
                style={{
                  marginTop: '8px',
                  padding: '8px 20px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} /> 立即新增錯題
              </button>
            </div>
          ) : (
            filteredMistakes.map(m => {
              const extracted = extractMistakeMediaAndText(m);
              const badgeStyle = getFamiliarityBadgeStyle(m);
              const isAnswerExpanded = selfTestMode ? !!expandedMistakeIds[m.id] : true;

              return (
                <div
                  key={m.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 2px 8px rgba(60, 40, 20, 0.04)',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  {/* Card Header: Title, Chapter tag, Mastery Badge, and Edit/Delete controls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1C1917' }}>
                        {m.title}
                      </h3>

                      {m.chapter_name && (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#FEF3C7',
                            border: '1px solid #FDE68A',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            color: '#92400E'
                          }}
                        >
                          {m.chapter_name}
                          {m.unit_name ? ` · ${m.unit_name}` : ''}
                        </span>
                      )}

                      {/* Clickable Familiarity Badge (Cycles to next familiarity on click) */}
                      <button
                        type="button"
                        onClick={() => handleCycleFamiliarity(m)}
                        style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          backgroundColor: badgeStyle.bg,
                          border: badgeStyle.border,
                          color: badgeStyle.color,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="點擊切換掌握度"
                      >
                        {badgeStyle.label}
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Edit Button -> Opens full MistakeEditor */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditMistake(m)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.82rem', fontWeight: 600 }}
                        title="使用完整編輯器編輯此題"
                      >
                        <Edit2 size={14} /> 編輯
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteMistake(m.id, m.title)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 8px', color: 'var(--danger)' }}
                        title="刪除此錯題"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Question Content (Text & Images) */}
                  {(extracted.qDesc || extracted.qImages.length > 0) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {extracted.qDesc && (
                        <p style={{ margin: 0, fontSize: '0.92rem', color: '#1C1917', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {extracted.qDesc}
                        </p>
                      )}

                      {extracted.qImages.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {extracted.qImages.map((src, iIdx) => (
                            <div
                              key={iIdx}
                              style={{
                                width: '130px',
                                height: '94px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid var(--glass-border)',
                                position: 'relative',
                                backgroundColor: '#FAF7F0'
                              }}
                            >
                              <img
                                src={src}
                                alt="題目圖片"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => setLightboxImageUrl(src)}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setAnnotatingData({
                                    mistake: m,
                                    fieldKey: 'q_image',
                                    isQuestion: true,
                                    imageUrl: src
                                  })
                                }
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  backgroundColor: 'rgba(28, 25, 23, 0.75)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '3px 5px',
                                  cursor: 'pointer'
                                }}
                                title="手帳紅筆標註"
                              >
                                <PenTool size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Answer & Explanation Section */}
                  <div
                    style={{
                      borderTop: '1px dashed var(--glass-border)',
                      paddingTop: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#B45309' }}>
                        解答與完整解析
                      </span>

                      {selfTestMode && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMistakeIds(prev => ({
                              ...prev,
                              [m.id]: !prev[m.id]
                            }))
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--accent-primary)',
                            cursor: 'pointer'
                          }}
                        >
                          {isAnswerExpanded ? '隱藏解析' : '點擊查看解析'}
                        </button>
                      )}
                    </div>

                    {isAnswerExpanded ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {extracted.aDesc ? (
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#44403C', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {extracted.aDesc}
                          </p>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>尚未填寫解析文字</span>
                        )}

                        {/* Multiple Answer Images */}
                        {extracted.aImages.length > 0 && (
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {extracted.aImages.map((src, aIdx) => (
                              <div
                                key={aIdx}
                                style={{
                                  width: '130px',
                                  height: '94px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: '1.5px solid #10B981',
                                  position: 'relative',
                                  backgroundColor: '#FAF7F0'
                                }}
                              >
                                <img
                                  src={src}
                                  alt={`解析圖 #${aIdx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                  onClick={() => setLightboxImageUrl(src)}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAnnotatingData({
                                      mistake: m,
                                      fieldKey: 'a_image',
                                      isQuestion: false,
                                      imageUrl: src,
                                      answerIndex: aIdx
                                    })
                                  }
                                  style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    backgroundColor: 'rgba(25, 122, 39, 0.85)',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '3px 5px',
                                    cursor: 'pointer'
                                  }}
                                  title="手帳紅筆標註"
                                >
                                  <PenTool size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Error Reasons Tags */}
                        {Array.isArray(m.error_reason_names) && m.error_reason_names.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {m.error_reason_names.map((rName, rIdx) => (
                              <span
                                key={rIdx}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#F3F4F6',
                                  border: '1px solid #E5E7EB',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  color: '#374151'
                                }}
                              >
                                {rName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() =>
                          setExpandedMistakeIds(prev => ({
                            ...prev,
                            [m.id]: true
                          }))
                        }
                        style={{
                          padding: '12px',
                          backgroundColor: '#F5F5F4',
                          borderRadius: '6px',
                          border: '1px dashed var(--glass-border)',
                          textAlign: 'center',
                          fontSize: '0.84rem',
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        已處於自測模式，點擊展開此題解析
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FULL MISTAKE EDITOR MODAL (POPUP LIKE MISTAKE LIST) */}
      {showEditor && (
        <MistakeEditor
          categories={categories}
          initialSubjectId={subjectId}
          chapterId={selectedChapterId}
          initialUnitId={selectedUnitId}
          mistake={editingMistake}
          onClose={() => setShowEditor(false)}
          onSaveSuccess={async () => {
            setShowEditor(false);
            await onRefreshAll?.();
          }}
          onImageClick={src => setLightboxImageUrl(src)}
        />
      )}

      {/* MODAL: ADD CHAPTER */}
      {showAddChapterModal &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100000,
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '440px',
                padding: '24px',
                borderRadius: '14px',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1C1917' }}>
                  新增大章節
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddChapterModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateChapter} style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: 0 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1C1917', marginBottom: '6px' }}>
                    大章節名稱
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="例：運動與力學、化學反應"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddChapterModal(false)}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting ? '新增中...' : '確認新增大章節'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: ADD UNIT */}
      {showAddUnitModal &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100000,
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '440px',
                padding: '24px',
                borderRadius: '14px',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1C1917' }}>
                  新增細部小單元
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateUnit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: 0 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1C1917', marginBottom: '6px' }}>
                    小單元名稱
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="例：單元 1 正弦定理與餘弦定理"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddUnitModal(null)}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting ? '新增中...' : '確認新增小單元'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* LIGHTBOX FOR FULL IMAGE PREVIEW */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(0, 0, 0, 0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out'
          }}
        >
          <img
            src={lightboxImageUrl}
            alt="放大預覽"
            style={{ maxWidth: '95vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}

      {/* IMAGE ANNOTATOR MODAL (RED PEN & HIGHLIGHTER) */}
      {annotatingData && (
        <ImageAnnotatorModal
          imageUrl={annotatingData.imageUrl}
          title={`手帳紅筆標註｜${annotatingData.mistake.title}（${annotatingData.isQuestion ? '題目圖' : '詳解圖'}）`}
          onClose={() => setAnnotatingData(null)}
          onSaveAnnotatedImage={handleSaveAnnotatedImage}
        />
      )}
    </div>
  );
}
