import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  type CategoriesBundle,
  type MistakeRecord,
  buildNextReviewMeta,
  isMistakeDueForReview
} from '../types';
import {
  parseNotebookStyle,
  getNotebookPalette,
  getNotebookIcon
} from '../utils/notebookThemes';
import { apiRequest } from '../utils/api';
import MistakeEditor from './MistakeEditor';
import ImageAnnotatorModal from './ImageAnnotatorModal';
import HierarchyMoverModal, { type HierarchyMoveResult } from './HierarchyMoverModal';
import SharePackModal from './SharePackModal';
import DeleteScopeModal, { type DeleteScopeTarget } from './DeleteScopeModal';
import CategoryManager from './CategoryManager';
import SubjectDailyReviewPanel from './SubjectDailyReviewPanel';
import SubjectAnalyticsWorkshop from './SubjectAnalyticsWorkshop';
import DailyReviewModal from './DailyReviewModal';
import { useUiFeedback } from './UiFeedbackProvider';
import {
  GoldCornerOrnaments,
  AcademicHandDrawnBackdrop,
  resolveAcademicSketchSubject
} from './PobiDesignElements';
import {
  ArrowLeft,
  BookOpen,
  FolderPlus,
  FolderTree,
  Move,
  MoreVertical,
  ArrowUpRight,
  CheckCircle2,
  Share2,
  Tag,
  Plus,
  X,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  PenTool,
  Search,
  RotateCcw,
  BarChart3
} from 'lucide-react';

function resolveImg(key?: string): string {
  if (!key || typeof key !== 'string') return '';
  if (
    key.startsWith('data:') ||
    key.startsWith('blob:') ||
    key.startsWith('http://') ||
    key.startsWith('https://') ||
    key.startsWith('/')
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
  onOpenExportPDF?: (subjectId: string) => void;
  onOpenTagManager?: (subjectId: string) => void;
  onOpenTemplateManager?: (subjectId: string) => void;
  onOpenPromptGenerator?: (subjectId: string) => void;
  onAddChapter: (subjectId: string, name: string) => Promise<void>;
  onAddUnit: (subjectId: string, chapterId: string, name: string) => Promise<void>;
  onRefreshAll?: () => Promise<void>;
  onUpdateMistake?: (updated: MistakeRecord) => void;
  onScheduleChanged?: () => void;
}

export default function NotebookOpenView({
  subjectId,
  categories,
  mistakes,
  onBackToBookshelf,
  onAddChapter,
  onAddUnit,
  onRefreshAll,
  onUpdateMistake,
  onScheduleChanged
}: NotebookOpenViewProps) {
  // Subject Hub 3 main modes: 查看錯題 | 每日複習 | 分析與工坊
  const [hubTab, setHubTab] = useState<'browse' | 'review' | 'workshop'>('browse');
  const [activeReviewQueue, setActiveReviewQueue] = useState<MistakeRecord[] | null>(null);
  const [scheduleTick, setScheduleTick] = useState(0);

  // Navigation & Filter states
  const { showToast, confirmDialog, promptDialog } = useUiFeedback();
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [sharePackOverride, setSharePackOverride] = useState<{ title: string; mistakes: MistakeRecord[] } | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [chapterMenu, setChapterMenu] = useState<{ chapId: string; chapName: string; x: number; y: number } | null>(null);
  const [deleteScopeTarget, setDeleteScopeTarget] = useState<DeleteScopeTarget | null>(null);
  const [deletingScope, setDeletingScope] = useState(false);
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

  // Google Drive-style Hierarchy Mover Modal & Direct Rail Drag-and-Drop state
  const [moverModalOpen, setMoverModalOpen] = useState(false);
  const [moverFocusedItem, setMoverFocusedItem] = useState<{ dimension: 'chapter' | 'unit'; id: string } | null>(null);
  const [draggedRailItem, setDraggedRailItem] = useState<{ dimension: 'chapter' | 'unit'; id: string; name: string } | null>(null);
  const [railDropTarget, setRailDropTarget] = useState<string | null>(null);
  const [moveToast, setMoveToast] = useState<string | null>(null);

  const showTemporaryToast = (msg: string) => {
    setMoveToast(msg);
    window.setTimeout(() => {
      setMoveToast(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const openMoverFor = (item: { dimension: 'chapter' | 'unit'; id: string } | null) => {
    setMoverFocusedItem(item);
    setMoverModalOpen(true);
  };

  const handleRenameChapter = async (chapId: string, currentName: string) => {
    const nextName = await promptDialog({
      title: '重新命名章節',
      label: '請輸入新的章節名稱',
      defaultValue: currentName,
      confirmText: '儲存名稱'
    });
    if (!nextName || !nextName.trim() || nextName.trim() === currentName) return;
    try {
      await apiRequest('/api/chapters', {
        method: 'PUT',
        body: { id: chapId, name: nextName.trim() }
      });
      await onRefreshAll?.();
      showToast(`已將章節重新命名為「${nextName.trim()}」`, 'success');
    } catch (err: any) {
      showToast(err?.message || '重新命名失敗', 'error');
    }
  };

  const handleDeleteChapter = (chapId: string, chapName: string) => {
    const count = subjectMistakes.filter(m => m.chapter_id === chapId).length;
    setDeleteScopeTarget({
      dimension: 'chapter',
      id: chapId,
      name: chapName,
      mistakeCount: count
    });
  };

  const handleDeleteUnit = (unitId: string, unitName: string) => {
    const count = subjectMistakes.filter(m => m.unit_id === unitId).length;
    setDeleteScopeTarget({
      dimension: 'unit',
      id: unitId,
      name: unitName,
      mistakeCount: count
    });
  };

  const handleConfirmDeleteScope = async (choice: 'move_to_uncategorized' | 'purge') => {
    if (!deleteScopeTarget) return;
    setDeletingScope(true);
    try {
      const apiMode = choice === 'purge' ? 'purge' : 'move_to_uncategorized';
      if (deleteScopeTarget.dimension === 'chapter') {
        await apiRequest(`/api/chapters?id=${deleteScopeTarget.id}&mode=${apiMode}`, { method: 'DELETE' });
        if (selectedChapterId === deleteScopeTarget.id) {
          setSelectedChapterId(null);
          setSelectedUnitId(null);
        }
      } else if (deleteScopeTarget.dimension === 'unit') {
        await apiRequest(`/api/categories?id=${deleteScopeTarget.id}&dimension=unit&mode=${apiMode}`, { method: 'DELETE' });
        if (selectedUnitId === deleteScopeTarget.id) {
          setSelectedUnitId(null);
        }
      }
      const deletedName = deleteScopeTarget.name;
      const deletedDim = deleteScopeTarget.dimension === 'chapter' ? '章節' : '小單元';
      setDeleteScopeTarget(null);
      await onRefreshAll?.();
      showToast(
        choice === 'purge'
          ? `已永久刪除${deletedDim}「${deletedName}」及底下題目`
          : `已刪除${deletedDim}「${deletedName}」，題目已安全移至左側「未分類區」`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || '刪除失敗', 'error');
    } finally {
      setDeletingScope(false);
    }
  };

  const handleHierarchyMoved = async (result: HierarchyMoveResult) => {
    await onRefreshAll?.();
    if (result.newSubjectId !== subjectId) {
      if (selectedChapterId === result.sourceId || selectedUnitId === result.sourceId) {
        setSelectedChapterId(null);
        setSelectedUnitId(null);
      }
      return;
    }
    if (result.newDimension === 'chapter') {
      setSelectedChapterId(result.newId);
      setSelectedUnitId(null);
    } else if (result.newDimension === 'unit') {
      setSelectedChapterId(result.newParentId);
      setSelectedUnitId(result.newId);
    }
  };

  const handleDirectRailMove = async (
    source: { dimension: 'chapter' | 'unit'; id: string; name: string },
    targetDimension: 'subject' | 'chapter' | 'unit',
    targetId: string,
    placement: 'inside' | 'before' | 'after' = 'inside'
  ) => {
    if (source.dimension === targetDimension && source.id === targetId) return;
    try {
      const res = await apiRequest<{
        success: boolean;
        movedItem?: { id: string; dimension: 'chapter' | 'unit'; parent_id: string; subject_id: string; name: string };
      }>('/api/categories', {
        method: 'PUT',
        body: {
          action: 'move_hierarchy',
          sourceDimension: source.dimension,
          sourceId: source.id,
          targetDimension,
          targetId,
          placement
        }
      });
      await onRefreshAll?.();
      const moved = res.movedItem;
      if (moved) {
        if (source.dimension === 'unit' && moved.dimension === 'chapter') {
          setSelectedChapterId(moved.id);
          setSelectedUnitId(null);
          showTemporaryToast(`已將單元「${source.name}」提升為章節層級`);
        } else if (source.dimension === 'unit' && moved.dimension === 'unit') {
          setSelectedChapterId(moved.parent_id);
          setSelectedUnitId(moved.id);
          const targetChap = categories.chapters.find(c => c.id === moved.parent_id);
          showTemporaryToast(`已將單元「${source.name}」移至「${targetChap?.name || '目標章節'}」`);
        } else if (source.dimension === 'chapter' && moved.dimension === 'chapter') {
          showTemporaryToast(`已更新章節「${source.name}」順序`);
        }
      }
    } catch (err: any) {
      showToast(err?.message || '搬運失敗', 'error');
    } finally {
      setDraggedRailItem(null);
      setRailDropTarget(null);
    }
  };

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
    void scheduleTick;
    const total = subjectMistakes.length;
    let masteredCount = 0;
    let dueCount = 0;
    subjectMistakes.forEach(m => {
      const famName = m.familiarity_name || '';
      if (famName.includes('順') || famName.includes('精熟') || famName.includes('掌握')) {
        masteredCount++;
      }
      if (isMistakeDueForReview(m)) {
        dueCount++;
      }
    });
    const masteryPct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
    return { total, masteredCount, masteryPct, dueCount };
  }, [subjectMistakes, scheduleTick]);

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

  // Delete mistake with custom confirmation & 5-second Undo toast
  const handleDeleteMistake = async (mistake: MistakeRecord) => {
    const ok = await confirmDialog({
      title: '刪除錯題確認',
      message: `確定要刪除錯題「${mistake.title}」嗎？刪除後 5 秒內可於通知列點擊復原。`,
      confirmText: '確認刪除',
      cancelText: '取消',
      danger: true
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/mistakes?id=${mistake.id}`, {
        method: 'DELETE'
      });
      await onRefreshAll?.();
      showToast(`已刪除錯題「${mistake.title}」`, 'info', {
        undoLabel: '復原',
        onUndo: async () => {
          try {
            await apiRequest('/api/mistakes', {
              method: 'POST',
              body: {
                subjectId: mistake.subject_id,
                chapterId: mistake.chapter_id,
                unitId: mistake.unit_id,
                familiarityId: mistake.familiarity_id,
                errorReasonIds: mistake.error_reason_ids || [],
                tags: mistake.tags || [],
                mistakeDate: mistake.mistake_date,
                templateId: mistake.template_id || 'default-exam',
                title: mistake.title,
                data: mistake.data
              }
            });
            await onRefreshAll?.();
            showToast(`已復原錯題「${mistake.title}」`, 'success');
          } catch {
            showToast('復原錯題失敗', 'error');
          }
        }
      });
    } catch (err: any) {
      showToast('刪除失敗：' + (err.message || String(err)), 'error');
    }
  };

  // Cycle Familiarity directly on mistake card and append attempt history
  const handleCycleFamiliarity = async (mistake: MistakeRecord) => {
    const activeFams = categories.familiarities.filter(f => f.is_active === 1);
    if (activeFams.length === 0) return;

    const currentIndex = activeFams.findIndex(
      f => f.id === mistake.familiarity_id || f.name === mistake.familiarity_name
    );
    const nextIndex = (currentIndex + 1) % activeFams.length;
    const nextFam = activeFams[nextIndex];
    const nextReviewMeta = buildNextReviewMeta(mistake, nextFam.id, nextFam.name);
    const nextData = {
      ...mistake.data,
      reviewMeta: nextReviewMeta
    };

    const updated = {
      ...mistake,
      familiarity_id: nextFam.id,
      familiarity_name: nextFam.name,
      familiarity_color: nextFam.color,
      data: nextData
    };
    onUpdateMistake?.(updated);

    try {
      await apiRequest('/api/mistakes', {
        method: 'PUT',
        body: {
          id: mistake.id,
          familiarity_id: nextFam.id,
          data: nextData
        }
      });
      await onRefreshAll?.();
      showToast(`已更新掌握度為「${nextFam.name}」（下次複習：${nextReviewMeta.nextReviewDate}）`, 'success');
    } catch (e) {
      console.error('更新掌握度失敗', e);
      showToast('更新掌握度失敗', 'error');
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

  const renderAcademicSketch = (subjectName: string) => {
    const n = subjectName.toLowerCase();
    const commonProps = {
      'aria-hidden': true as const,
      viewBox: '0 0 180 90',
      style: {
        position: 'absolute' as const,
        right: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '160px',
        height: '80px',
        opacity: 0.065,
        pointerEvents: 'none' as const,
        color: '#81796E'
      }
    };
    if (n.includes('化')) {
      return (
        <svg {...commonProps}>
          <polygon points="50,15 72,27 72,53 50,65 28,53 28,27" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <polygon points="94,27 116,15 138,27 138,53 116,65 94,53" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
          <line x1="72" y1="40" x2="94" y2="40" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="50" cy="40" r="12" fill="none" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      );
    }
    if (n.includes('生')) {
      return (
        <svg {...commonProps}>
          <path d="M20,22 Q55,70 90,22 T160,22" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M20,66 Q55,18 90,66 T160,66" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <line x1="42" y1="36" x2="42" y2="52" stroke="currentColor" strokeWidth="1.1" />
          <line x1="68" y1="32" x2="68" y2="56" stroke="currentColor" strokeWidth="1.1" />
          <line x1="112" y1="32" x2="112" y2="56" stroke="currentColor" strokeWidth="1.1" />
          <line x1="138" y1="36" x2="138" y2="52" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      );
    }
    if (n.includes('地')) {
      return (
        <svg {...commonProps}>
          <ellipse cx="90" cy="45" rx="68" ry="26" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <ellipse cx="90" cy="45" rx="48" ry="18" fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="4 3" />
          <ellipse cx="90" cy="45" rx="26" ry="10" fill="none" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      );
    }
    if (n.includes('數') || n.includes('物') || n.includes('自')) {
      return (
        <svg {...commonProps}>
          <line x1="18" y1="68" x2="164" y2="68" stroke="currentColor" strokeWidth="1.2" />
          <line x1="36" y1="12" x2="36" y2="78" stroke="currentColor" strokeWidth="1.2" />
          <path d="M36,64 Q86,8 152,58" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="36" y1="68" x2="114" y2="24" stroke="currentColor" strokeWidth="1.1" strokeDasharray="3 3" />
        </svg>
      );
    }
    return (
      <svg {...commonProps}>
        <circle cx="115" cy="45" r="32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
        <circle cx="115" cy="45" r="18" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <line x1="40" y1="45" x2="165" y2="45" stroke="currentColor" strokeWidth="1" />
        <line x1="115" y1="8" x2="115" y2="82" stroke="currentColor" strokeWidth="1" />
      </svg>
    );
  };

  const sketchSubject = resolveAcademicSketchSubject(activeSubject.name);
  const isScienceOrMath = sketchSubject === 'physics_chem' || sketchSubject === 'math';

  return (
    <div
      className={isScienceOrMath ? 'pobi-paper-fiber pobi-engineering-grid' : 'pobi-paper-fiber'}
      style={{ position: 'relative', overflow: 'hidden', flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
    >
      {/* 5. Subject-Aware Academic Hand-Drawn Technical Sketches (理化/生物/地科/數學) */}
      <AcademicHandDrawnBackdrop subject={sketchSubject} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '1160px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* TOP TOOLBAR: BREADCRUMB, STATS, SECONDARY ACTIONS, AND PROMINENT "+ 新增錯題" BUTTON */}
        <div
          className="no-print"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            borderTop: '2.5px solid #C89A50',
            boxShadow: '0 2px 10px rgba(41, 37, 31, 0.045)'
          }}
        >
          {/* 3. Gold Geometric Corner Ornaments */}
          <GoldCornerOrnaments size={34} inset={5} opacity={0.58} corners={['tr', 'br']} />
          {renderAcademicSketch(activeSubject.name)}
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
                className="notebook-subject-badge-icon"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: palette.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}
              >
                <SubjectIcon size={16} color="#FFFFFF" stroke="#FFFFFF" />
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
            {hubTab === 'browse' && (
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
            )}

            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '0.84rem',
                fontWeight: 600
              }}
              title="管理本學科分類、章節、單元與錯因標籤"
              data-testid="notebook-open-category-manager-btn"
            >
              <Tag size={15} /> 分類與標籤管理
            </button>

            <button
              type="button"
              onClick={() => {
                if (filteredMistakes.length === 0) {
                  showToast('目前篩選範圍內沒有可分享的錯題', 'info');
                  return;
                }
                setShowShareModal(true);
              }}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '0.84rem',
                fontWeight: 600
              }}
              title="將目前範圍的錯題產生唯讀分享連結"
              data-testid="notebook-share-pack-btn"
            >
              <Share2 size={15} /> 分享錯題包
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

        {/* SUBJECT HUB 3-MODE SELECTOR: 查看錯題 | 每日複習 | 分析與工坊 */}
        <div
          className="no-print"
          data-testid="subject-hub-tabs"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '10px',
            padding: '10px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 2px 8px rgba(60, 40, 20, 0.04)'
          }}
        >
          {[
            {
              id: 'browse' as const,
              title: '查看錯題',
              sub: '章節與小單元管理瀏覽',
              icon: BookOpen,
              badge: `${stats.total} 題`
            },
            {
              id: 'review' as const,
              title: '每日複習',
              sub: 'POBI 閃卡複習與週期設定',
              icon: RotateCcw,
              badge: stats.dueCount > 0 ? `待複習 ${stats.dueCount}` : '已排程'
            },
            {
              id: 'workshop' as const,
              title: '分析與工坊',
              sub: '進階篩選、診斷、AI包與練習卷',
              icon: BarChart3,
              badge: '診斷 / 匯出'
            }
          ].map(tab => {
            const Icon = tab.icon;
            const active = hubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHubTab(tab.id)}
                data-testid={`subject-hub-tab-${tab.id}`}
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: active ? '2px solid #D97706' : '1px solid var(--glass-border)',
                  backgroundColor: active ? '#FFFBEB' : '#FAF7F0',
                  color: active ? '#92400E' : '#44403C',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? '0 3px 10px rgba(180, 83, 9, 0.14)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: active ? '#D97706' : 'rgba(139, 90, 43, 0.12)',
                      color: active ? '#FFFFFF' : '#8B5A2B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem', color: active ? '#92400E' : '#1C1917' }}>
                      {tab.title}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#57534E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tab.sub}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '12px',
                    backgroundColor: active ? '#FDE68A' : 'rgba(120, 113, 108, 0.12)',
                    color: active ? '#92400E' : '#57534E',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* HUB MODE 2: 每日複習（POBI 閃卡複習與本科熟悉度排程） */}
        {hubTab === 'review' && (
          <SubjectDailyReviewPanel
            subjectId={subjectId}
            subjectName={activeSubject.name}
            categories={categories}
            subjectMistakes={subjectMistakes}
            onStartReview={picked => setActiveReviewQueue(picked)}
            onScheduleChanged={() => {
              setScheduleTick(t => t + 1);
              onScheduleChanged?.();
            }}
          />
        )}

        {/* HUB MODE 3: 分析與工坊（進階篩選 -> 1.學習診斷 / 2.錯題清單與工坊） */}
        {hubTab === 'workshop' && (
          <SubjectAnalyticsWorkshop
            subjectId={subjectId}
            subjectName={activeSubject.name}
            categories={categories}
            subjectMistakes={subjectMistakes}
            onEditMistake={handleOpenEditMistake}
            onDeleteMistake={handleDeleteMistake}
            onImageClick={src => setLightboxImageUrl(src)}
          />
        )}

        {/* HUB MODE 1: 查看錯題（現有章節/單元瀏覽與編輯模式） */}
        {hubTab === 'browse' && (
        <>
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

        {/* MOVE TOAST NOTIFICATION */}
        {moveToast && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#047857',
              fontSize: '0.84rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{moveToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setMoveToast(null)}
              style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', padding: '2px' }}
              title="關閉提示"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ROW 3: CHAPTER HORIZONTAL TABS RAIL WITH INDEPENDENT MOVE & "+ 新增大章節" */}
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

          {/* Chapter Tabs (Draggable + Independent Move Button) */}
          {subjectChapters.map(chap => {
            const isSelected = selectedChapterId === chap.id;
            const count = subjectMistakes.filter(m => m.chapter_id === chap.id).length;
            const isDropHighlighted = railDropTarget === `chapter:${chap.id}`;
            return (
              <div
                key={chap.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', `chapter:${chap.id}`);
                  setDraggedRailItem({ dimension: 'chapter', id: chap.id, name: chap.name });
                }}
                onDragEnd={() => {
                  setDraggedRailItem(null);
                  setRailDropTarget(null);
                }}
                onDragOver={e => {
                  if (!draggedRailItem || (draggedRailItem.dimension === 'chapter' && draggedRailItem.id === chap.id)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setRailDropTarget(`chapter:${chap.id}`);
                }}
                onDragLeave={() => {
                  setRailDropTarget(prev => (prev === `chapter:${chap.id}` ? null : prev));
                }}
                onDrop={e => {
                  e.preventDefault();
                  if (!draggedRailItem) return;
                  if (draggedRailItem.dimension === 'unit') {
                    handleDirectRailMove(draggedRailItem, 'chapter', chap.id, 'inside');
                  } else if (draggedRailItem.dimension === 'chapter' && draggedRailItem.id !== chap.id) {
                    handleDirectRailMove(draggedRailItem, 'chapter', chap.id, 'before');
                  }
                }}
                style={{
                  flexShrink: 0,
                  borderRadius: '8px 8px 0 0',
                  border: isDropHighlighted
                    ? '2px dashed #D97706'
                    : isSelected
                      ? '1.5px solid #D97706'
                      : '1px solid var(--glass-border)',
                  borderBottom: isSelected ? '2px solid #FFFBEB' : '1px solid var(--glass-border)',
                  backgroundColor: isDropHighlighted
                    ? '#FEF3C7'
                    : isSelected
                      ? '#FFFBEB'
                      : '#FFFFFF',
                  color: isSelected ? '#92400E' : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxShadow: isSelected ? '0 -2px 6px rgba(180, 83, 9, 0.08)' : 'none',
                  opacity: draggedRailItem?.dimension === 'chapter' && draggedRailItem.id === chap.id ? 0.5 : 1,
                  transition: 'background-color 0.12s, border-color 0.12s'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapterId(chap.id);
                    setSelectedUnitId(null);
                  }}
                  style={{
                    padding: '8px 6px 8px 14px',
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{chap.name}</span>
                  <span style={{ fontSize: '0.74rem', opacity: 0.85 }}>({count})</span>
                </button>
                <button
                  type="button"
                  data-testid={`chapter-menu-${chap.id}`}
                  onClick={e => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setChapterMenu(prev =>
                      prev?.chapId === chap.id
                        ? null
                        : {
                            chapId: chap.id,
                            chapName: chap.name,
                            x: Math.min(rect.left, window.innerWidth - 190),
                            y: rect.bottom + 6
                          }
                    );
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px 8px 6px 4px',
                    color: isSelected ? '#B45309' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: '4px'
                  }}
                  title={`更多操作：分享、重新命名、搬移或刪除「${chap.name}」`}
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            );
          })}

          {/* DROP ZONE WHEN DRAGGING A UNIT: PROMOTE TO CHAPTER */}
          {draggedRailItem?.dimension === 'unit' && (
            <div
              data-testid="promote-unit-dropzone"
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setRailDropTarget('promote-to-chapter');
              }}
              onDragLeave={() => {
                setRailDropTarget(prev => (prev === 'promote-to-chapter' ? null : prev));
              }}
              onDrop={e => {
                e.preventDefault();
                if (draggedRailItem?.dimension === 'unit') {
                  handleDirectRailMove(draggedRailItem, 'subject', subjectId, 'inside');
                }
              }}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: '8px 8px 0 0',
                border: '2px dashed #D97706',
                backgroundColor: railDropTarget === 'promote-to-chapter' ? '#FDE68A' : '#FFFBEB',
                color: '#92400E',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'background-color 0.12s'
              }}
            >
              <ArrowUpRight size={15} />
              <span>拖曳至此提升為章節</span>
            </div>
          )}

          {/* RIGHT-ALIGNED RAIL ACTIONS: 架構搬運 + 新增大章節 */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexShrink: 0 }}>
            <button
              type="button"
              data-testid="open-hierarchy-mover-btn"
              onClick={() => openMoverFor(null)}
              className="btn btn-secondary"
              style={{
                padding: '6px 11px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#92400E',
                borderColor: 'rgba(217, 119, 6, 0.35)',
                backgroundColor: '#FFFBEB'
              }}
              title="開啟 Google Drive 風格架構搬運視窗，自由拖曳調整章節與單元層級"
            >
              <FolderTree size={14} />
              <span>架構搬運</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewItemName('');
                setShowAddChapterModal(true);
              }}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--accent-primary)'
              }}
              title="在此學科下新增一個大章節"
            >
              <FolderPlus size={15} />
              <span>+ 新增大章節</span>
            </button>
          </div>
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
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400E', marginRight: '4px', flexShrink: 0 }}>
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
              const isDropHighlighted = railDropTarget === `unit:${unit.id}`;
              return (
                <div
                  key={unit.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', `unit:${unit.id}`);
                    setDraggedRailItem({ dimension: 'unit', id: unit.id, name: unit.name });
                  }}
                  onDragEnd={() => {
                    setDraggedRailItem(null);
                    setRailDropTarget(null);
                  }}
                  onDragOver={e => {
                    if (!draggedRailItem || draggedRailItem.dimension !== 'unit' || draggedRailItem.id === unit.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setRailDropTarget(`unit:${unit.id}`);
                  }}
                  onDragLeave={() => {
                    setRailDropTarget(prev => (prev === `unit:${unit.id}` ? null : prev));
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    if (draggedRailItem?.dimension === 'unit' && draggedRailItem.id !== unit.id) {
                      handleDirectRailMove(draggedRailItem, 'unit', unit.id, 'before');
                    }
                  }}
                  style={{
                    flexShrink: 0,
                    borderRadius: '999px',
                    border: isDropHighlighted
                      ? '2px dashed #D97706'
                      : isSelected
                        ? '1.5px solid #D97706'
                        : '1px solid var(--glass-border)',
                    backgroundColor: isDropHighlighted
                      ? '#FEF3C7'
                      : isSelected
                        ? '#FDE68A'
                        : '#FFFFFF',
                    color: '#1C1917',
                    display: 'inline-flex',
                    alignItems: 'center',
                    opacity: draggedRailItem?.dimension === 'unit' && draggedRailItem.id === unit.id ? 0.5 : 1,
                    transition: 'background-color 0.12s, border-color 0.12s'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedUnitId(unit.id)}
                    style={{
                      padding: '4px 4px 4px 10px',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    {unit.name} ({count})
                  </button>
                  <button
                    type="button"
                    data-testid={`move-unit-${unit.id}`}
                    onClick={e => {
                      e.stopPropagation();
                      openMoverFor({ dimension: 'unit', id: unit.id });
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '3px 4px 3px 3px',
                      color: isSelected ? '#92400E' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    title={`搬運單元「${unit.name}」（支援提升為章節或移至其他章節）`}
                  >
                    <Move size={12} />
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-unit-${unit.id}`}
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteUnit(unit.id, unit.name);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '3px 8px 3px 2px',
                      color: '#DC2626',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    title={`刪除小單元「${unit.name}」`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
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
                        onClick={() => handleDeleteMistake(m)}
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
        </>
        )}
      </div>

      {/* SUBJECT DAILY FLASHCARD REVIEW MODAL */}
      {activeReviewQueue && activeReviewQueue.length > 0 && (
        <DailyReviewModal
          dueMistakes={activeReviewQueue}
          categories={categories}
          onClose={() => setActiveReviewQueue(null)}
          onReviewUpdated={updated => {
            onUpdateMistake?.(updated);
            setScheduleTick(t => t + 1);
          }}
          onRefreshAll={async () => {
            await onRefreshAll?.();
            setScheduleTick(t => t + 1);
          }}
        />
      )}

      {/* DELETE CHAPTER / UNIT SCOPE MODAL */}
      {deleteScopeTarget && (
        <DeleteScopeModal
          target={deleteScopeTarget}
          busy={deletingScope}
          onCancel={() => setDeleteScopeTarget(null)}
          onConfirm={handleConfirmDeleteScope}
        />
      )}

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
      {lightboxImageUrl &&
        createPortal(
          <div
            onClick={() => setLightboxImageUrl(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100dvh',
              zIndex: 100050,
              background: 'rgba(0, 0, 0, 0.88)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              cursor: 'zoom-out'
            }}
          >
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              style={{
                position: 'fixed',
                top: 'max(18px, env(safe-area-inset-top))',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.16)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                color: '#FFFFFF',
                borderRadius: '999px',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="關閉預覽"
            >
              <X size={20} />
            </button>
            <img
              src={lightboxImageUrl}
              alt="放大預覽"
              style={{ maxWidth: '95vw', maxHeight: '90dvh', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>,
          document.body
        )}

      {/* CHAPTER VERTICAL 3-DOT MENU PORTAL */}
      {chapterMenu &&
        createPortal(
          <div
            onClick={() => setChapterMenu(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 100030 }}
          >
            <div
              data-testid="chapter-context-menu"
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: `${chapterMenu.y}px`,
                left: `${Math.max(12, chapterMenu.x)}px`,
                minWidth: '180px',
                backgroundColor: 'var(--bg-secondary, #FFFFFF)',
                border: '1px solid var(--glass-border)',
                borderRadius: '10px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const chapMistakes = subjectMistakes.filter(m => m.chapter_id === chapterMenu.chapId);
                  const targetName = chapterMenu.chapName;
                  setChapterMenu(null);
                  if (chapMistakes.length === 0) {
                    showToast(`章節「${targetName}」內目前沒有錯題可供分享`, 'info');
                    return;
                  }
                  setSharePackOverride({
                    title: `${activeSubject.name} - ${targetName} 錯題分享包`,
                    mistakes: chapMistakes
                  });
                  setShowShareModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', borderRadius: '6px', fontSize: '0.84rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}
              >
                <Share2 size={14} style={{ color: '#2563EB' }} /> 分享此章節題目包
              </button>
              <button
                type="button"
                onClick={() => {
                  const { chapId, chapName } = chapterMenu;
                  setChapterMenu(null);
                  handleRenameChapter(chapId, chapName);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', borderRadius: '6px', fontSize: '0.84rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}
              >
                <Edit2 size={14} /> 重新命名
              </button>
              <button
                type="button"
                onClick={() => {
                  const { chapId } = chapterMenu;
                  setChapterMenu(null);
                  openMoverFor({ dimension: 'chapter', id: chapId });
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', borderRadius: '6px', fontSize: '0.84rem', color: '#92400E', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}
              >
                <Move size={14} /> 搬移
              </button>
              <button
                type="button"
                onClick={() => {
                  const { chapId, chapName } = chapterMenu;
                  setChapterMenu(null);
                  handleDeleteChapter(chapId, chapName);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', borderRadius: '6px', fontSize: '0.84rem', color: '#DC2626', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}
              >
                <Trash2 size={14} /> 刪除
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* EMBEDDED CATEGORY & TAG MANAGER MODAL (MERGED FROM SIDEBAR) */}
      {showCategoryModal &&
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
              zIndex: 100025,
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px',
              boxSizing: 'border-box'
            }}
            onClick={e => {
              if (e.target === e.currentTarget) setShowCategoryModal(false);
            }}
          >
            <div
              data-testid="embedded-category-manager-modal"
              style={{
                width: '100%',
                maxWidth: '1080px',
                height: 'min(88dvh, 88vh)',
                backgroundColor: 'var(--bg-primary, #FAF7F0)',
                borderRadius: '14px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-secondary, #FFFFFF)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.02rem' }}>
                  <FolderTree size={18} style={{ color: '#B45309' }} />
                  <span>分類與標籤管理</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                  title="關閉視窗"
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <CategoryManager
                  categories={categories}
                  onRefresh={async () => {
                    await onRefreshAll?.();
                  }}
                  onDrilldownCategory={() => {
                    setShowCategoryModal(false);
                  }}
                />
              </div>
            </div>
          </div>,
          document.body
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

      {/* GOOGLE DRIVE-STYLE HIERARCHY MOVER MODAL */}
      {moverModalOpen && (
        <HierarchyMoverModal
          categories={categories}
          initialSubjectId={subjectId}
          focusedItem={moverFocusedItem}
          onClose={() => {
            setMoverModalOpen(false);
            setMoverFocusedItem(null);
          }}
          onMoved={handleHierarchyMoved}
        />
      )}

      {/* SHARE READ-ONLY MISTAKE PACK MODAL */}
      {showShareModal && (
        <SharePackModal
          defaultTitle={
            sharePackOverride?.title ||
            `${activeSubject.name}${selectedChapterId ? ` - ${subjectChapters.find(c => c.id === selectedChapterId)?.name || ''}` : ''} 錯題分享包`
          }
          mistakes={sharePackOverride?.mistakes || filteredMistakes}
          onClose={() => {
            setShowShareModal(false);
            setSharePackOverride(null);
          }}
        />
      )}
    </div>
  );
}
