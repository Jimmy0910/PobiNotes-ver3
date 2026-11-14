import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type {
  CategoriesBundle,
  CategoryItem,
  MistakeRecord
} from '../types';
import {
  parseNotebookStyle,
  getNotebookPalette,
  getNotebookIcon
} from '../utils/notebookThemes';
import { apiRequest } from '../utils/api';
import { compressImage } from '../utils/compress';
import ImageAnnotatorModal from './ImageAnnotatorModal';
import {
  ArrowLeft,
  BookOpen,
  FolderPlus,
  Tag,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ListFilter,
  Plus,
  X,
  Folder,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Edit2,
  Trash2,
  RefreshCw,
  Upload,
  Check,
  Maximize2,
  PenTool
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
  const primaryAText =
    aData.a_desc || aData.desc || aData.a_text || aData.text || aData.key_concept || aData.explanation || '';
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

  // Extract Answer Images (supports multiple images per answer)
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
  onSelectChapterUnit: (chapterId: string | null, unitId: string | null) => void;
  onOpenNewMistakeForSubject: (subjectId: string, chapterId?: string | null, unitId?: string | null) => void;
  onOpenMistakeBank: (subjectId: string, chapterId?: string | null) => void;
  onOpenExportPDF: (subjectId: string) => void;
  onOpenTagManager: (subjectId: string) => void;
  onOpenTemplateManager: (subjectId: string) => void;
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
  onOpenExportPDF: _onOpenExportPDF,
  onOpenTagManager,
  onOpenTemplateManager,
  onOpenPromptGenerator,
  onAddChapter,
  onAddUnit,
  onRefreshAll,
  onUpdateMistake
}: NotebookOpenViewProps) {
  // Right-page View Mode: 'directory' (目錄) | 'reader' (完整錯題閱讀) | 'editor' (書本內寫題剪貼)
  const [rightPageView, setRightPageView] = useState<'directory' | 'reader' | 'editor'>('directory');

  // Mobile tab toggle: 'stats' or 'right'
  const [mobileActiveTab, setMobileActiveTab] = useState<'stats' | 'right'>('right');

  // Directory expand/collapse state
  const [expandedChapterIds, setExpandedChapterIds] = useState<Record<string, boolean>>({});

  // Add Chapter / Unit modal state
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reader mode state (完整查看題目圖片與解析)
  const [readerChapterFilter, setReaderChapterFilter] = useState<string | null>(null);
  const [revealAllAnswers, setRevealAllAnswers] = useState<boolean>(true); // 預設完整展開解析
  const [expandedMistakeIds, setExpandedMistakeIds] = useState<Record<string, boolean>>({});

  // In-Book Editor state (在牛皮書本內新增與編輯)
  const [editingMistakeId, setEditingMistakeId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorChapterId, setEditorChapterId] = useState('');
  const [editorUnitId, setEditorUnitId] = useState('');
  const [editorQuestionText, setEditorQuestionText] = useState('');
  const [editorQuestionImage, setEditorQuestionImage] = useState('');
  const [editorAnswerText, setEditorAnswerText] = useState('');
  const [editorAnswerImages, setEditorAnswerImages] = useState<string[]>([]);
  const [editorFamiliarityId, setEditorFamiliarityId] = useState('');
  const [editorErrorReasonIds, setEditorErrorReasonIds] = useState<string[]>([]);
  const [isUploadingQImg, setIsUploadingQImg] = useState(false);
  const [isUploadingAImg, setIsUploadingAImg] = useState(false);
  const [isSavingMistake, setIsSavingMistake] = useState(false);

  // Full-screen Image Lightbox state
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Image Annotator State (手帳紅筆與手寫標註)
  const [annotatingData, setAnnotatingData] = useState<{
    mistake: MistakeRecord;
    fieldKey: string;
    isQuestion: boolean;
    imageUrl: string;
    answerIndex?: number;
  } | null>(null);

  const handleOpenAnnotator = (m: MistakeRecord, fieldKey: string, isQuestion: boolean, imgUrl: string, answerIndex?: number) => {
    setAnnotatingData({ mistake: m, fieldKey, isQuestion, imageUrl: imgUrl, answerIndex });
  };

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

    // Update parent and local state immediately
    onUpdateMistake?.(updatedMistake);

    try {
      await apiRequest('/api/mistakes', {
        method: 'PUT',
        body: {
          id: mistake.id,
          data: {
            questionData: currentQData,
            answerData: currentAData
          }
        }
      });
      await onRefreshAll?.();
    } catch (e: any) {
      console.warn('後端同步略過（本機錯題標註已立即套用完成）：', e);
    }
  };

  // Active Subject details
  const activeSubject = useMemo(() => {
    return categories.subjects.find(s => s.id === subjectId) || {
      id: subjectId,
      name: '學科錯題手帳',
      color: 'default'
    } as CategoryItem;
  }, [categories.subjects, subjectId]);

  const style = useMemo(() => {
    return parseNotebookStyle(activeSubject.color, activeSubject.name);
  }, [activeSubject]);

  const palette = useMemo(() => {
    return getNotebookPalette(style.paletteId);
  }, [style.paletteId]);

  const SubjectIcon = useMemo(() => {
    return getNotebookIcon(style.iconId);
  }, [style.iconId]);

  // Subject-specific mistakes
  const subjectMistakes = useMemo(() => {
    return mistakes.filter(m => m.subject_id === subjectId);
  }, [mistakes, subjectId]);

  // Subject-specific chapters
  const subjectChapters = useMemo(() => {
    return categories.chapters.filter(c => c.parent_id === subjectId || c.subject_id === subjectId);
  }, [categories.chapters, subjectId]);

  // Subject-specific units map by chapter_id
  const unitsByChapter = useMemo(() => {
    const map: Record<string, CategoryItem[]> = {};
    categories.units.forEach(u => {
      const cId = u.parent_id || u.chapter_id;
      if (cId) {
        if (!map[cId]) map[cId] = [];
        map[cId].push(u);
      }
    });
    return map;
  }, [categories.units]);

  // Reader mistakes filter
  const readerMistakes = useMemo(() => {
    if (!readerChapterFilter) return subjectMistakes;
    return subjectMistakes.filter(m => m.chapter_id === readerChapterFilter);
  }, [subjectMistakes, readerChapterFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = subjectMistakes.length;
    let masteredCount = 0;
    let reviewingCount = 0;
    let urgentCount = 0;

    const errorReasonTally: Record<string, { name: string; count: number; color?: string }> = {};

    subjectMistakes.forEach(m => {
      const fName = m.familiarity_name || '';
      const isMastered = fName.includes('精熟') || fName.includes('熟練') || m.familiarity_color === 'success';
      const isUrgent = fName.includes('待加強') || fName.includes('生疏') || m.familiarity_color === 'danger';

      if (isMastered) masteredCount++;
      else if (isUrgent) urgentCount++;
      else reviewingCount++;

      // Error reasons count
      if (Array.isArray(m.error_reason_items) && m.error_reason_items.length > 0) {
        m.error_reason_items.forEach(r => {
          if (!errorReasonTally[r.id]) {
            errorReasonTally[r.id] = { name: r.name, count: 0, color: r.color };
          }
          errorReasonTally[r.id].count += 1;
        });
      } else if (Array.isArray(m.error_reason_names) && m.error_reason_names.length > 0) {
        m.error_reason_names.forEach((name) => {
          if (!errorReasonTally[name]) {
            errorReasonTally[name] = { name, count: 0 };
          }
          errorReasonTally[name].count += 1;
        });
      }
    });

    const masteryPct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
    const reviewingPct = total > 0 ? Math.round((reviewingCount / total) * 100) : 0;
    const urgentPct = total > 0 ? Math.round((urgentCount / total) * 100) : 0;

    const topReasons = Object.values(errorReasonTally)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      masteredCount,
      reviewingCount,
      urgentCount,
      masteryPct,
      reviewingPct,
      urgentPct,
      topReasons
    };
  }, [subjectMistakes]);

  // Toggle chapter collapse in directory
  const toggleChapter = (chapterId: string) => {
    setExpandedChapterIds(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Open Reader with specific chapter filter
  const handleOpenReader = (chapterId: string | null = null) => {
    setReaderChapterFilter(chapterId);
    setRightPageView('reader');
    setMobileActiveTab('right');
  };

  // Open in-book editor for creating new mistake
  const handleStartCreateMistake = (chapId?: string | null, uId?: string | null) => {
    setEditingMistakeId(null);
    setEditorTitle('');
    setEditorChapterId(chapId || (subjectChapters[0]?.id || ''));
    setEditorUnitId(uId || '');
    setEditorQuestionText('');
    setEditorQuestionImage('');
    setEditorAnswerText('');
    setEditorAnswerImages([]);
    setEditorFamiliarityId(categories.familiarities[0]?.id || '');
    setEditorErrorReasonIds([]);
    setRightPageView('editor');
    setMobileActiveTab('right');
  };

  // Open in-book editor to edit an existing mistake
  const handleStartEditMistake = (m: MistakeRecord) => {
    const extracted = extractMistakeMediaAndText(m);
    setEditingMistakeId(m.id);
    setEditorTitle(m.title);
    setEditorChapterId(m.chapter_id || '');
    setEditorUnitId(m.unit_id || '');
    setEditorQuestionText(extracted.qDesc);
    setEditorQuestionImage(
      m.data?.questionData?.q_image ||
        m.data?.questionData?.q_img ||
        m.data?.questionData?.image ||
        extracted.qImages[0] ||
        ''
    );
    setEditorAnswerText(extracted.aDesc);
    const rawAnsImgs = Array.isArray(m.data?.answerData?.a_images) && m.data.answerData.a_images.length > 0
      ? m.data.answerData.a_images
      : [m.data?.answerData?.a_image || m.data?.answerData?.a_img || m.data?.answerData?.image || extracted.aImages[0]].filter(Boolean);
    setEditorAnswerImages(rawAnsImgs);
    setEditorFamiliarityId(m.familiarity_id || '');
    setEditorErrorReasonIds(m.error_reason_ids || []);
    setRightPageView('editor');
    setMobileActiveTab('right');
  };

  // Handle Image Upload for In-Book Editor
  const handleUploadImageFile = async (file: File, type: 'question' | 'answer') => {
    if (type === 'question') setIsUploadingQImg(true);
    else setIsUploadingAImg(true);

    try {
      const compressedBlob = await compressImage(file, 1400, 0.85);
      const res = await apiRequest('/api/images/upload', {
        method: 'POST',
        body: compressedBlob,
        headers: {
          'Content-Type': 'image/jpeg'
        }
      });
      if (res?.key) {
        if (type === 'question') {
          setEditorQuestionImage(res.key);
        } else {
          setEditorAnswerImages(prev => [...prev, res.key]);
        }
      }
    } catch (err: any) {
      alert('圖片上傳失敗：' + (err.message || String(err)));
    } finally {
      if (type === 'question') setIsUploadingQImg(false);
      else setIsUploadingAImg(false);
    }
  };

  // Paste Event Handler for In-Book Editor
  const handleEditorPaste = (e: React.ClipboardEvent, type: 'question' | 'answer') => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadImageFile(file, type);
          break;
        }
      }
    }
  };

  // Save Mistake inside the Notebook
  const handleSaveInBookMistake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorTitle.trim()) {
      alert('請輸入題目名稱');
      return;
    }

    setIsSavingMistake(true);
    try {
      const primaryAnsImg = editorAnswerImages[0] || '';
      const payload = {
        title: editorTitle.trim(),
        subjectId,
        chapterId: editorChapterId || null,
        unitId: editorUnitId || null,
        familiarityId: editorFamiliarityId || null,
        errorReasonIds: editorErrorReasonIds,
        mistakeDate: new Date().toISOString().slice(0, 10),
        data: {
          questionData: {
            q_desc: editorQuestionText,
            q_image: editorQuestionImage,
            q_img: editorQuestionImage
          },
          answerData: {
            a_desc: editorAnswerText,
            a_image: primaryAnsImg,
            a_img: primaryAnsImg,
            a_images: editorAnswerImages
          }
        }
      };

      if (editingMistakeId) {
        await apiRequest('/api/mistakes', {
          method: 'PUT',
          body: { id: editingMistakeId, ...payload }
        });
      } else {
        await apiRequest('/api/mistakes', {
          method: 'POST',
          body: payload
        });
      }

      await onRefreshAll?.();
      setRightPageView('reader');
      setRevealAllAnswers(true);
    } catch (err: any) {
      alert('儲存失敗：' + (err.message || String(err)));
    } finally {
      setIsSavingMistake(false);
    }
  };

  // Cycle Familiarity directly on card
  const handleCycleFamiliarity = async (mistake: MistakeRecord) => {
    const activeFams = categories.familiarities.filter(f => f.is_active === 1);
    if (activeFams.length === 0) return;

    const currentIndex = activeFams.findIndex(
      f => f.id === mistake.familiarity_id || f.name === mistake.familiarity_name
    );
    const nextIndex = (currentIndex + 1) % activeFams.length;
    const nextFam = activeFams[nextIndex];

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

  // Delete mistake in notebook
  const handleDeleteMistake = async (id: string, title: string) => {
    if (!confirm(`確定要刪除「${title}」嗎？`)) return;
    try {
      await apiRequest(`/api/mistakes?id=${id}`, {
        method: 'DELETE'
      });
      await onRefreshAll?.();
    } catch (err: any) {
      alert('刪除失敗：' + (err.message || String(err)));
    }
  };

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

  return (
    <div className="notebook-backdrop animate-fade-in">
      {/* Top Bar with Navigation & Subject Info */}
      <div className="notebook-top-bar">
        <div className="notebook-breadcrumb">
          <button
            type="button"
            onClick={onBackToBookshelf}
            className="notebook-breadcrumb-back"
            title="返回書架首頁"
          >
            <ArrowLeft className="w-4 h-4" />
            返回書架
          </button>
          <span className="text-text-muted">/</span>
          <div className="flex items-center gap-2 text-text-primary font-bold">
            <SubjectIcon className="w-4 h-4 text-amber-800 dark:text-amber-400" />
            <span>《{activeSubject.name}》手帳</span>
          </div>
        </div>

        {/* Top View Toggle in Notebook */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRightPageView('directory')}
            className={`notebook-tool-btn ${rightPageView === 'directory' ? 'border-amber-600 font-bold' : ''}`}
            title="章節目錄樹"
          >
            <Folder className="w-3.5 h-3.5" />
            目錄視角
          </button>

          <button
            type="button"
            onClick={() => handleOpenReader(null)}
            className={`notebook-tool-btn ${rightPageView === 'reader' ? 'border-amber-600 font-bold' : ''}`}
            title="完整題目圖片與解析閱讀"
          >
            <BookOpen className="w-3.5 h-3.5" />
            題目與解析 ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => handleStartCreateMistake()}
            className="notebook-tool-btn notebook-primary-btn"
            title="在手帳紙上直接寫題剪貼"
          >
            <Plus className="w-3.5 h-3.5" />
            新增此學科錯題
          </button>
        </div>
      </div>

      {/* Main Open Notebook Spread */}
      <div className="notebook-spread-outer">
        {/* Leather Hardcover Border Shadow */}
        <div
          className="notebook-hardcover-edge"
          style={{ background: palette.primary }}
        />

        {/* Notebook Body */}
        <div className="notebook-book-body">
          {/* Mobile & Tablet Portrait Tab Toggle */}
          <div className="w-full notebook-tablet-toggle-container p-3 pb-0">
            <div className="notebook-mobile-toggle">
              <button
                type="button"
                onClick={() => setMobileActiveTab('right')}
                className={`notebook-mobile-toggle-btn ${mobileActiveTab === 'right' ? 'active' : ''}`}
              >
                {rightPageView === 'directory' ? '章節目錄' : rightPageView === 'reader' ? '題目與詳解' : '書本內寫題'}
              </button>
              <button
                type="button"
                onClick={() => setMobileActiveTab('stats')}
                className={`notebook-mobile-toggle-btn ${mobileActiveTab === 'stats' ? 'active' : ''}`}
              >
                掌握度統計
              </button>
            </div>
          </div>

          {/* LEFT PAGE: MISTAKE STATISTICS */}
          <div
            className={`notebook-page-left notebook-page-lined ${
              mobileActiveTab === 'stats' ? 'tablet-page-active block' : 'hidden md:flex'
            }`}
          >
            {/* Subject Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-glass-border">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ background: palette.coverTexture }}
                >
                  <SubjectIcon className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <div className="editorial-badge">
                    ACADEMIC AUDIT · VOL. 01
                  </div>
                  <h2 className="text-xl font-bold text-text-primary m-0 tracking-tight">
                    {activeSubject.name}
                  </h2>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-glass-highlight border border-glass-border text-text-primary">
                全冊 {stats.total} 題
              </span>
            </div>

            {/* Top Stat Summary Grid with Editorial Hairlines */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-bg-secondary/90 border border-glass-border mb-3.5 shadow-sm">
              <div className="text-center py-1">
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-1 notebook-stat-label">熟練掌握</div>
                <div className="text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
                  {stats.masteredCount}
                </div>
                <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 mt-0.5 notebook-stat-pct">
                  占比 {stats.masteryPct}%
                </div>
              </div>

              <div className="text-center py-1 border-x border-glass-border">
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-1 notebook-stat-label">一般複習</div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                  {stats.reviewingCount}
                </div>
                <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 mt-0.5 notebook-stat-pct">
                  占比 {stats.reviewingPct}%
                </div>
              </div>

              <div className="text-center py-1">
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-1 notebook-stat-label">重點待加強</div>
                <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                  {stats.urgentCount}
                </div>
                <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 mt-0.5 notebook-stat-pct">
                  占比 {stats.urgentPct}%
                </div>
              </div>
            </div>

            {/* Familiarity Distribution Progress Bar */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-bg-secondary/80 border border-glass-border mb-3.5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-text-primary mb-2">
                <span>整體熟練進度</span>
                <span className="font-bold text-amber-800 dark:text-amber-400">{stats.masteryPct}% 掌握率</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-glass-highlight overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                  style={{ width: `${stats.masteryPct}%` }}
                  title={`熟練掌握：${stats.masteredCount} 題`}
                />
                <div
                  className="h-full bg-amber-500 dark:bg-amber-400 transition-all"
                  style={{ width: `${stats.reviewingPct}%` }}
                  title={`一般複習：${stats.reviewingCount} 題`}
                />
                <div
                  className="h-full bg-rose-600 dark:bg-rose-500 transition-all"
                  style={{ width: `${stats.urgentPct}%` }}
                  title={`重點待加強：${stats.urgentCount} 題`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-muted mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  <span className="text-stone-700 dark:text-stone-300 font-medium">精熟 ({stats.masteredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                  <span className="text-stone-700 dark:text-stone-300 font-medium">普通 ({stats.reviewingCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-400" />
                  <span className="text-stone-700 dark:text-stone-300 font-medium">待加強 ({stats.urgentCount})</span>
                </div>
              </div>
            </div>

            {/* Top Error Reasons Ranking */}
            <div className="p-4 rounded-xl bg-bg-secondary/80 border border-glass-border mb-3.5 shadow-sm flex-1 min-h-[120px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-glass-border">
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  主要錯因分佈排行
                </h4>
                <button
                  type="button"
                  onClick={() => onOpenTagManager(subjectId)}
                  className="notebook-tag-manage-btn"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>管理標籤</span>
                </button>
              </div>

              {stats.topReasons.length > 0 ? (
                <div className="space-y-3">
                  {stats.topReasons.map((reason, index) => {
                    const pct = stats.total > 0 ? Math.round((reason.count / stats.total) * 100) : 0;
                    return (
                      <div key={reason.name} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">{index + 1}.</span>
                            {reason.name}
                          </span>
                          <span className="leader-line" />
                          <span className="text-stone-600 dark:text-stone-300 font-medium whitespace-nowrap">
                            {reason.count} 題 ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-glass-highlight overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-600 dark:bg-amber-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  尚未標註具體錯因，可於右頁點選「錯因標籤」建立此學科專屬分類。
                </div>
              )}
            </div>

            {/* Bottom Study Tip Card */}
            <div className="p-3.5 rounded-xl bg-glass-highlight/70 border border-glass-border flex items-start gap-3 text-xs text-stone-600 dark:text-stone-300 mt-auto shrink-0 mb-0 leading-relaxed">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900 dark:text-stone-100 block mb-1">複習建言：</strong>
                建議優先複習標記為「重點待加強」的錯題，並使用 AI 提詞產生器針對高頻錯因進行深度概念診斷。
              </div>
            </div>
          </div>

          {/* CENTER SEAM & METAL BINDER RINGS */}
          <div className="notebook-center-seam">
            <div className="binder-ring" />
            <div className="binder-ring" />
            <div className="binder-ring" />
            <div className="binder-ring" />
            <div className="binder-ring" />
            <div className="binder-ring" />
          </div>

          {/* RIGHT PAGE: DYNAMIC VIEWS (DIRECTORY / READER / EDITOR) */}
          <div
            className={`notebook-page-right notebook-page-lined ${
              mobileActiveTab === 'right' ? 'tablet-page-active block' : 'hidden md:flex'
            }`}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* VIEW 1: DIRECTORY MODE (章節目錄) */}
            {rightPageView === 'directory' && (
              <>
                {/* Right Page Header with Tools */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-glass-border flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary m-0">
                      章節與單元目錄
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      點選章節查看題目，或展開單元建立錯題
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenTagManager(subjectId)}
                      className="notebook-tool-btn"
                      title="管理此學科專屬錯因標籤"
                    >
                      <Tag className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      錯因標籤
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenTemplateManager(subjectId)}
                      className="notebook-tool-btn"
                      title="管理與自訂錯題欄位模板"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
                      錯題模板
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPromptGenerator(subjectId)}
                      className="notebook-tool-btn notebook-prompt-btn"
                      title="啟動此學科通用 AI 提詞產生器"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      AI 提詞
                    </button>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNewItemName('');
                      setShowAddChapterModal(true);
                    }}
                    className="notebook-header-add-btn"
                  >
                    <FolderPlus className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span>新增大章節</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReader(null)}
                    className="notebook-all-mistakes-btn"
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>瀏覽全部題目 ({stats.total})</span>
                  </button>
                </div>

                {/* Chapter & Unit Directory Tree */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                  {subjectChapters.length > 0 ? (
                    subjectChapters.map((chapter) => {
                      const isExpanded = !!expandedChapterIds[chapter.id];
                      const units = unitsByChapter[chapter.id] || [];
                      const chapterMistakesCount = subjectMistakes.filter(
                        m => m.chapter_id === chapter.id
                      ).length;

                      return (
                        <div
                          key={chapter.id}
                          className="rounded-xl border border-glass-border bg-bg-secondary shadow-sm overflow-hidden"
                        >
                          <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-glass-highlight/50 transition-colors">
                            <div
                              className="flex items-center gap-2.5 flex-1 cursor-pointer mr-1"
                              onClick={() => toggleChapter(chapter.id)}
                            >
                              <span className="text-text-muted shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </span>
                              <Folder className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                              <span className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug break-words" title={chapter.name}>
                                {chapter.name}
                              </span>
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-glass-highlight text-stone-600 dark:text-stone-300 font-semibold shrink-0 ml-1">
                                {chapterMistakesCount} 題
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewItemName('');
                                  setShowAddUnitModal(chapter.id);
                                }}
                                className="notebook-chapter-plus-btn"
                                title="在此章節新增小單元"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReader(chapter.id)}
                                className="notebook-chapter-action-btn"
                                title="查看此章節題目"
                              >
                                檢視題目
                              </button>
                            </div>
                          </div>

                          {/* Units Sub-list */}
                          {isExpanded && (
                            <div className="border-t border-glass-border/60 bg-notebook-paper/40 px-4 py-3 space-y-2">
                              {units.length > 0 ? (
                                units.map((unit) => {
                                  const unitMistakesCount = subjectMistakes.filter(
                                    m => m.unit_id === unit.id
                                  ).length;
                                  return (
                                    <div
                                      key={unit.id}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 px-2.5 rounded-lg hover:bg-glass-highlight/80 transition-colors text-xs"
                                    >
                                      <div className="flex items-center gap-2.5 text-text-secondary flex-1 mr-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-700 dark:bg-amber-400 shrink-0" />
                                        <span className="font-medium break-words leading-snug" title={unit.name}>{unit.name}</span>
                                        <span className="text-text-muted shrink-0 ml-1">
                                          ({unitMistakesCount} 題)
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleStartCreateMistake(chapter.id, unit.id)}
                                        className="text-amber-800 dark:text-amber-400 font-semibold hover:underline shrink-0 whitespace-nowrap px-1.5 py-0.5"
                                      >
                                        + 記錯題
                                      </button>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="py-3 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                                  <span>此章節尚無小單元</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewItemName('');
                                      setShowAddUnitModal(chapter.id);
                                    }}
                                    className="text-amber-800 dark:text-amber-400 font-medium hover:underline"
                                  >
                                    立即新增
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-16 text-center text-text-muted">
                      <Folder className="w-12 h-12 mx-auto text-glass-border mb-3.5 opacity-60" />
                      <p className="text-sm font-bold text-text-primary mb-1.5">
                        尚未建立章節目錄
                      </p>
                      <p className="text-xs text-text-muted mb-5 leading-relaxed">
                        點擊上方「新增大章節」或下方按鈕建立此手帳的第一個章節
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemName('');
                          setShowAddChapterModal(true);
                        }}
                        className="notebook-primary-btn"
                        style={{
                          minHeight: '44px',
                          padding: '10px 28px',
                          fontSize: '14px',
                          borderRadius: '10px'
                        }}
                      >
                        <FolderPlus className="w-4 h-4 mr-1.5" />
                        <span>建立第一個章節</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* VIEW 2: READER MODE (在牛皮書本內完整查看題目圖片與解析) */}
            {rightPageView === 'reader' && (
              <>
                {/* Reader Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-glass-border flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRightPageView('directory')}
                      className="notebook-tool-btn"
                      title="返回目錄"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      回目錄
                    </button>
                    <div>
                      <h3 className="text-base font-bold text-text-primary m-0">
                        {readerChapterFilter
                          ? (categories.chapters.find(c => c.id === readerChapterFilter)?.name || '章節題目')
                          : '全冊錯題與解析'}
                      </h3>
                      <p className="text-[11px] text-text-muted m-0">
                        共 {readerMistakes.length} 題 · 完整呈現題目圖、解答與解析
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Reveal All vs Self-Test */}
                    <button
                      type="button"
                      onClick={() => setRevealAllAnswers(!revealAllAnswers)}
                      className="notebook-tool-btn"
                      title={revealAllAnswers ? '切換為自測模式（收合解答）' : '切換為完整查看（展開解答）'}
                    >
                      {revealAllAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{revealAllAnswers ? '自測模式' : '完整查看解析'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartCreateMistake(readerChapterFilter)}
                      className="notebook-tool-btn notebook-primary-btn"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      新增題目
                    </button>
                  </div>
                </div>

                {/* Chapter Filter Tabs in Reader */}
                {subjectChapters.length > 0 && (
                  <div className="binder-index-tabs-rail no-print">
                    <button
                      type="button"
                      className={`binder-index-tab ${!readerChapterFilter ? 'active' : ''}`}
                      onClick={() => setReaderChapterFilter(null)}
                    >
                      全部 ({subjectMistakes.length})
                    </button>
                    {subjectChapters.map(c => {
                      const cCount = subjectMistakes.filter(m => m.chapter_id === c.id).length;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`binder-index-tab ${readerChapterFilter === c.id ? 'active' : ''}`}
                          onClick={() => setReaderChapterFilter(c.id)}
                        >
                          {c.name} ({cCount})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Mistakes Reader List (完整圖文展示) */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {readerMistakes.length > 0 ? (
                    readerMistakes.map(m => {
                      const isExpanded = revealAllAnswers || !!expandedMistakeIds[m.id];
                      const { qDesc, qImages, aDesc, aImages } = extractMistakeMediaAndText(m);
                      const famName = m.familiarity_name || '';

                      return (
                        <div key={m.id} className="binder-question-card">
                          {/* Card Title & Meta row */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h4 className="text-base font-bold text-text-primary m-0 tracking-tight">
                                {m.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {m.chapter_name && (
                                  <span className="binder-pill-tag bg-glass-highlight border border-glass-border text-text-secondary">
                                    {m.chapter_name}
                                  </span>
                                )}
                                {m.unit_name && (
                                  <span className="binder-pill-tag bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                    {m.unit_name}
                                  </span>
                                )}

                                {/* Cycle Familiarity Button */}
                                <button
                                  type="button"
                                  onClick={() => handleCycleFamiliarity(m)}
                                  className={`binder-fam-cycle-btn ${
                                    m.familiarity_color === 'success' || famName.includes('順') ? 'fam-success' :
                                    m.familiarity_color === 'warning' || famName.includes('卡') ? 'fam-warning' :
                                    'fam-danger'
                                  }`}
                                  title="點擊切換掌握度"
                                >
                                  <span>掌握度：{famName || '未標註'}</span>
                                  <RefreshCw size={10} className="opacity-70" />
                                </button>

                                {(m.error_reason_names || []).map(rn => (
                                  <span key={rn} className="binder-pill-tag badge-warning-contrast">
                                    錯因：{rn}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Card Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditMistake(m)}
                                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-glass-highlight"
                                title="在書本內編輯此題"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMistake(m.id, m.title)}
                                className="p-1 rounded text-danger hover:bg-glass-highlight"
                                title="刪除題目"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Question Text */}
                          {qDesc && (
                            <div className="text-sm text-text-body my-2 whitespace-pre-wrap leading-relaxed">
                              {qDesc}
                            </div>
                          )}

                          {/* Full Question Images */}
                          {qImages.map((qImg, qIdx) => (
                            <div key={qIdx} className="binder-full-image-wrapper">
                              <img
                                src={qImg}
                                alt={`題目圖片 ${qIdx + 1}`}
                                className="binder-full-image cursor-pointer"
                                onClick={() => setLightboxImageUrl(qImg)}
                              />
                              <div className="binder-image-action-bar">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAnnotator(m, 'q_image', true, qImg);
                                  }}
                                  className="binder-image-annotate-btn"
                                  title="使用手帳紅筆、螢光筆標記題目盲點"
                                >
                                  <PenTool size={13} />
                                  <span>紅筆標註</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLightboxImageUrl(qImg)}
                                  className="binder-image-zoom-btn"
                                  title="全螢幕放大查看"
                                >
                                  <Maximize2 size={13} />
                                  <span>全螢幕</span>
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Answer & Explanation Section */}
                          <div className="mt-3 pt-2 border-t border-glass-border">
                            {!revealAllAnswers && (
                              <div
                                className={`binder-reveal-bar ${isExpanded ? 'is-expanded' : ''}`}
                                onClick={() => {
                                  setExpandedMistakeIds(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                                }}
                              >
                                <span>{isExpanded ? '收合答案與詳解' : '手動拉開解答與詳解'}</span>
                                {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                              </div>
                            )}

                            {isExpanded && (
                              <div className="binder-answer-dossier mt-2 space-y-2">
                                <div className="text-xs font-bold text-success uppercase tracking-wider">
                                  解答與完整解析 {aImages.length > 1 ? `(共 ${aImages.length} 張解析圖)` : ''}
                                </div>
                                {aDesc ? (
                                  <div className="text-sm text-text-body whitespace-pre-wrap leading-relaxed">
                                    {aDesc}
                                  </div>
                                ) : aImages.length === 0 ? (
                                  <div className="text-xs text-text-muted flex items-center justify-between gap-2">
                                    <span>尚無解析文字與圖片</span>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditMistake(m)}
                                      className="text-amber-800 dark:text-amber-400 font-semibold hover:underline"
                                    >
                                      點擊補充題目圖或詳解
                                    </button>
                                  </div>
                                ) : null}

                                {/* Full Answer Images (Supports Multiple Images per Answer) */}
                                {aImages.map((aImg, aIdx) => (
                                  <div key={aIdx} className="binder-full-image-wrapper">
                                    {aImages.length > 1 && (
                                      <div className="text-[11px] font-bold text-text-muted px-2 py-1 border-b border-glass-border bg-glass-highlight/60">
                                        解析圖片 ({aIdx + 1} / {aImages.length})
                                      </div>
                                    )}
                                    <img
                                      src={aImg}
                                      alt={`解析圖片 ${aIdx + 1}`}
                                      className="binder-full-image cursor-pointer"
                                      onClick={() => setLightboxImageUrl(aImg)}
                                    />
                                    <div className="binder-image-action-bar">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenAnnotator(m, 'a_image', false, aImg, aIdx);
                                        }}
                                        className="binder-image-annotate-btn"
                                        title="使用手帳紅筆、螢光筆標記解析重點"
                                      >
                                        <PenTool size={13} />
                                        <span>紅筆標註</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setLightboxImageUrl(aImg)}
                                        className="binder-image-zoom-btn"
                                        title="全螢幕放大查看"
                                      >
                                        <Maximize2 size={13} />
                                        <span>全螢幕</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-16 text-center text-text-muted">
                      <BookOpen className="w-10 h-10 mx-auto text-glass-border mb-3" />
                      <p className="text-sm font-semibold text-text-primary mb-1">
                        在此分類中尚未新增錯題
                      </p>
                      <p className="text-xs text-text-muted mb-4">
                        直接點擊下方按鈕，在牛皮紙上寫下第一筆題目與解析！
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartCreateMistake(readerChapterFilter)}
                        className="notebook-primary-btn px-4 py-2 text-xs font-semibold rounded-lg"
                      >
                        在手帳內新增題目
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* VIEW 3: IN-BOOK EDITOR MODE (在牛皮書本內新增與編輯題目) */}
            {rightPageView === 'editor' && (
              <form onSubmit={handleSaveInBookMistake} className="binder-inbook-editor flex-1 overflow-y-auto pr-1">
                {/* Editor Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-glass-border">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRightPageView(subjectMistakes.length > 0 ? 'reader' : 'directory')}
                      className="notebook-tool-btn"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      取消
                    </button>
                    <h3 className="text-base font-bold text-text-primary m-0">
                      {editingMistakeId ? '編輯錯題與解析' : '在牛皮書本內新增題目'}
                    </h3>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingMistake}
                    className="notebook-primary-btn px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>{isSavingMistake ? '儲存中...' : '儲存貼入手帳'}</span>
                  </button>
                </div>

                {/* 1. Title */}
                <div className="binder-form-group">
                  <label className="binder-form-label">題目標題 / 題號 *</label>
                  <input
                    type="text"
                    required
                    value={editorTitle}
                    onChange={e => setEditorTitle(e.target.value)}
                    placeholder="例：112 年學測指考英文閱讀題組第 3 題"
                    className="binder-form-input"
                  />
                </div>

                {/* 2. Chapter & Unit Select */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="binder-form-group">
                    <label className="binder-form-label">章節歸屬</label>
                    <select
                      value={editorChapterId}
                      onChange={e => {
                        setEditorChapterId(e.target.value);
                        setEditorUnitId('');
                      }}
                      className="binder-form-select"
                    >
                      <option value="">未指定章節</option>
                      {subjectChapters.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="binder-form-group">
                    <label className="binder-form-label">單元歸屬</label>
                    <select
                      value={editorUnitId}
                      onChange={e => setEditorUnitId(e.target.value)}
                      className="binder-form-select"
                      disabled={!editorChapterId}
                    >
                      <option value="">未指定單元</option>
                      {(unitsByChapter[editorChapterId] || []).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Question Image & Description */}
                <div className="binder-form-group">
                  <label className="binder-form-label">題目圖片 (支援點擊上傳或鍵盤 Ctrl+V 貼上截圖)</label>
                  <div
                    className="binder-paste-zone"
                    tabIndex={0}
                    onPaste={e => handleEditorPaste(e, 'question')}
                    onClick={() => document.getElementById('q-img-input')?.click()}
                  >
                    <input
                      id="q-img-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImageFile(file, 'question');
                      }}
                    />
                    {isUploadingQImg ? (
                      <div className="text-xs text-text-muted py-2 flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>圖片壓縮上傳中...</span>
                      </div>
                    ) : editorQuestionImage ? (
                      <div className="relative inline-block">
                        <img
                          src={resolveImg(editorQuestionImage)}
                          alt="題目預覽"
                          className="max-h-40 rounded border mx-auto"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditorQuestionImage('');
                          }}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"
                          title="移除題目圖片"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted py-2 flex flex-col items-center gap-1">
                        <Upload size={18} className="text-amber-800 dark:text-amber-400" />
                        <span>點擊上傳題目圖片，或直接在此處貼上 (Ctrl+V)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="binder-form-group">
                  <label className="binder-form-label">題目文字說明 / 題幹</label>
                  <textarea
                    rows={3}
                    value={editorQuestionText}
                    onChange={e => setEditorQuestionText(e.target.value)}
                    placeholder="輸入題目完整文字敘述..."
                    className="binder-form-textarea"
                  />
                </div>

                {/* 4. Answer Text & Image */}
                <div className="binder-form-group">
                  <label className="binder-form-label">解答與詳細解析文字</label>
                  <textarea
                    rows={4}
                    value={editorAnswerText}
                    onChange={e => setEditorAnswerText(e.target.value)}
                    placeholder="輸入詳細解析、破題核心技巧與解題步驟..."
                    className="binder-form-textarea"
                  />
                </div>

                <div className="binder-form-group">
                  <label className="binder-form-label">解析圖片 (支援上傳多張解析圖片，可點擊選取多檔或鍵盤 Ctrl+V 連續貼上)</label>
                  {editorAnswerImages.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-2">
                      {editorAnswerImages.map((imgKey, idx) => (
                        <div key={idx} className="relative inline-block border border-glass-border rounded-lg p-1 bg-bg-secondary">
                          <div className="text-[10px] font-bold text-text-muted mb-1 text-center">
                            解析圖 #{idx + 1}
                          </div>
                          <img
                            src={resolveImg(imgKey)}
                            alt={`解析預覽 ${idx + 1}`}
                            className="max-h-32 rounded mx-auto object-contain"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditorAnswerImages(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"
                            title="移除此張解析圖片"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    className="binder-paste-zone"
                    tabIndex={0}
                    onPaste={e => handleEditorPaste(e, 'answer')}
                    onClick={() => document.getElementById('a-img-input')?.click()}
                  >
                    <input
                      id="a-img-input"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async e => {
                        const files = Array.from(e.target.files || []);
                        for (const file of files) {
                          await handleUploadImageFile(file, 'answer');
                        }
                        e.target.value = '';
                      }}
                    />
                    {isUploadingAImg ? (
                      <div className="text-xs text-text-muted py-2 flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>圖片壓縮上傳中...</span>
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted py-2 flex flex-col items-center gap-1">
                        <ImageIcon size={18} className="text-amber-800 dark:text-amber-400" />
                        <span>點擊新增詳解圖片（可多選），或在此處貼上 (Ctrl+V)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Familiarity */}
                <div className="binder-form-group">
                  <label className="binder-form-label" style={{ fontSize: '0.92rem', fontWeight: 650 }}>掌握度</label>
                  <div className="flex gap-3 flex-wrap">
                    {categories.familiarities.filter(f => f.is_active === 1).map(f => {
                      const isSelected = editorFamiliarityId === f.id;
                      const isMastered = f.name.includes('精熟') || f.name.includes('熟練');
                      const isUrgent = f.name.includes('加強') || f.name.includes('不熟');
                      
                      let variantClass = '';
                      if (isSelected) {
                        if (isMastered) variantClass = 'selected-mastered';
                        else if (isUrgent) variantClass = 'selected-urgent';
                        else variantClass = 'selected-reviewing';
                      }

                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setEditorFamiliarityId(f.id)}
                          className={`notebook-fam-btn ${variantClass}`}
                        >
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Error Reasons */}
                <div className="binder-form-group">
                  <label className="binder-form-label" style={{ fontSize: '0.92rem', fontWeight: 650 }}>錯因標籤 (可多選)</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {categories.errorReasons.map(r => {
                      const isSelected = editorErrorReasonIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setEditorErrorReasonIds(prev =>
                              isSelected ? prev.filter(id => id !== r.id) : [...prev, r.id]
                            );
                          }}
                          className={`notebook-reason-btn ${isSelected ? 'selected' : ''}`}
                        >
                          {r.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button bar */}
                <div className="pt-5 pb-3 border-t border-glass-border flex justify-end items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setRightPageView(subjectMistakes.length > 0 ? 'reader' : 'directory')}
                    className="notebook-cancel-btn"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingMistake}
                    className="notebook-submit-btn"
                  >
                    <Check size={16} />
                    <span>{isSavingMistake ? '儲存中...' : '儲存貼入本手帳'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal (全螢幕相簿燈箱) */}
      {lightboxImageUrl && (
        <div
          className="binder-lightbox-overlay"
          onClick={() => setLightboxImageUrl(null)}
          title="點擊背景關閉燈箱"
        >
          <div
            className="binder-lightbox-content"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="binder-lightbox-close-btn"
              onClick={() => setLightboxImageUrl(null)}
            >
              <X size={16} />
              <span>關閉放大</span>
            </button>
            <img
              src={lightboxImageUrl}
              alt="全螢幕查看圖片"
              className="binder-lightbox-img"
            />
          </div>
        </div>
      )}

      {/* MODAL: ADD CHAPTER */}
      {showAddChapterModal && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="notebook-dialog-card bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl" style={{ width: '100%', maxWidth: '440px', padding: '24px', borderRadius: '14px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', marginBottom: '18px', borderBottom: '1px solid rgba(150, 150, 150, 0.2)' }}>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 m-0">新增大章節</h3>
              <button
                type="button"
                onClick={() => setShowAddChapterModal(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateChapter} style={{ display: 'flex', flexDirection: 'column', gap: '18px', margin: 0, width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <label className="text-sm font-semibold text-stone-800 dark:text-stone-200 block m-0">
                  章節名稱
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="例：第一章 三角函數與向量"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="notebook-dialog-input"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '6px', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setShowAddChapterModal(false)}
                  className="notebook-dialog-cancel-btn"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="notebook-dialog-submit-btn"
                >
                  {submitting ? '新增中...' : '確認新增'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: ADD UNIT */}
      {showAddUnitModal && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="notebook-dialog-card bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl" style={{ width: '100%', maxWidth: '440px', padding: '24px', borderRadius: '14px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', marginBottom: '18px', borderBottom: '1px solid rgba(150, 150, 150, 0.2)' }}>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 m-0">新增小單元</h3>
              <button
                type="button"
                onClick={() => setShowAddUnitModal(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUnit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', margin: 0, width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <label className="text-sm font-semibold text-stone-800 dark:text-stone-200 block m-0">
                  單元名稱
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="例：單元 1 正弦定理與餘弦定理"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="notebook-dialog-input"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '6px', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(null)}
                  className="notebook-dialog-cancel-btn"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="notebook-dialog-submit-btn"
                >
                  {submitting ? '新增中...' : '確認新增'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* Image Annotator Modal (手帳紅筆與手寫標註畫布) */}
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
