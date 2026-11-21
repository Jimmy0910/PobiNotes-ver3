import { useState, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { apiRequest } from '../utils/api';
import {
  type CategoriesBundle,
  type CategoryDimension,
  type FilterState,
  type MistakeRecord,
  UNCATEGORIZED_ID,
  createEmptyFilterState,
  filterMistakes,
  formatPct,
  getEffectiveFamiliarityId
} from '../types';
import { extractMistakeMediaAndText } from '../utils/mistakeMedia';
import {
  BUILTIN_PROMPT_TEMPLATES,
  mergePromptTemplates,
  renderPromptWithMistakes,
  type MistakeZipImageMapping
} from '../utils/promptTemplates';
import { useUiFeedback } from './UiFeedbackProvider';
import ExportPDF from './ExportPDF';
import {
  Filter,
  RotateCcw,
  Search,
  BarChart3,
  PieChart,
  Grid,
  Sparkles,
  Printer,
  Package,
  Copy,
  Check,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
  Image as ImageIcon,
  ListChecks,
  HelpCircle
} from 'lucide-react';

interface SubjectAnalyticsWorkshopProps {
  subjectId: string;
  subjectName: string;
  categories: CategoriesBundle;
  subjectMistakes: MistakeRecord[];
  onEditMistake?: (m: MistakeRecord) => void;
  onDeleteMistake?: (m: MistakeRecord) => void;
  onImageClick?: (src: string) => void;
}

const CHART_COLORS = [
  '#8B5A2B',
  '#B45309',
  '#4D7C0F',
  '#D97706',
  '#C5221F',
  '#92400E',
  '#78350F',
  '#A16207',
  '#0d9488',
  '#ea580c'
];

function guessImageExt(url: string, mime?: string): string {
  if (mime) {
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  }
  const m = url.match(/\.(png|jpe?g|webp|gif)(\?.*)?$/i);
  if (m) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  return 'png';
}

async function fetchImageAsBlob(url: string): Promise<{ blob: Blob; ext: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const res = await fetch(url);
      const blob = await res.blob();
      return { blob, ext: guessImageExt(url, blob.type) };
    }
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return { blob, ext: guessImageExt(url, blob.type) };
  } catch {
    return null;
  }
}

export default function SubjectAnalyticsWorkshop({
  subjectId,
  subjectName,
  categories,
  subjectMistakes,
  onEditMistake,
  onDeleteMistake,
  onImageClick
}: SubjectAnalyticsWorkshopProps) {
  const { showToast } = useUiFeedback();

  // Scoped multi-dimensional filter (subject locked to current subjectId)
  const [filter, setFilter] = useState<FilterState>(() => ({
    ...createEmptyFilterState(),
    subjectIds: [subjectId]
  }));

  // Reset filter when switching subjects
  useEffect(() => {
    setFilter({
      ...createEmptyFilterState(),
      subjectIds: [subjectId]
    });
  }, [subjectId]);

  // Two primary modes after filtering:
  // 1. diagnostics: 學習診斷（分類占比 / 熱度表）
  // 2. workshop: 錯題清單與工坊（AI 提詞包 ZIP / 匯出練習卷）
  const [activeSection, setActiveSection] = useState<'diagnostics' | 'workshop'>('diagnostics');

  // Inside 錯題清單與工坊: two sub-modes
  const [workshopMode, setWorkshopMode] = useState<'ai_zip' | 'exam_paper'>('ai_zip');

  // Diagnostics visualization state
  const [distDimension, setDistDimension] = useState<CategoryDimension>('chapter');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [errorStatMode, setErrorStatMode] = useState<'involvement' | 'tag_share'>('involvement');
  const [crossPair, setCrossPair] = useState<'chapter_fam' | 'chapter_reason' | 'unit_reason'>('chapter_fam');
  const [crossDenomMode, setCrossDenomMode] = useState<'total' | 'row'>('total');

  // Prompt templates (for AI 提詞包 ZIP)
  const [savedPromptTemplates, setSavedPromptTemplates] = useState<any[]>([]);
  const [activePromptTemplateId, setActivePromptTemplateId] = useState<string>(BUILTIN_PROMPT_TEMPLATES[0].id);
  const [packingZip, setPackingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    apiRequest('/api/prompt-templates')
      .then(res => {
        if (Array.isArray(res)) setSavedPromptTemplates(res);
      })
      .catch(() => {});
  }, []);

  const allPromptTemplates = useMemo(
    () => mergePromptTemplates(savedPromptTemplates),
    [savedPromptTemplates]
  );

  const selectedPromptTemplate = useMemo(() => {
    return (
      allPromptTemplates.find(t => t.id === activePromptTemplateId) ||
      allPromptTemplates[0] ||
      BUILTIN_PROMPT_TEMPLATES[0]
    );
  }, [allPromptTemplates, activePromptTemplateId]);

  // Subject-scoped cascading options
  const visibleChapters = useMemo(() => {
    return categories.chapters
      .filter(c => c.parent_id === subjectId || c.subject_id === subjectId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories.chapters, subjectId]);

  const visibleUnits = useMemo(() => {
    const realChapterIds = filter.chapterIds.filter(id => id !== UNCATEGORIZED_ID);
    if (realChapterIds.length > 0) {
      return categories.units.filter(u => u.parent_id && realChapterIds.includes(u.parent_id));
    }
    return categories.units.filter(
      u => u.subject_id === subjectId || visibleChapters.some(c => c.id === u.parent_id)
    );
  }, [categories.units, filter.chapterIds, subjectId, visibleChapters]);

  const visibleErrorReasons = useMemo(() => {
    const realChapterIds = filter.chapterIds.filter(id => id !== UNCATEGORIZED_ID);
    return categories.errorReasons.filter(r => {
      if (!r.parent_id) return true;
      if (realChapterIds.length > 0 && realChapterIds.includes(r.parent_id)) return true;
      if (r.parent_id === subjectId || r.subject_id === subjectId) return true;
      return false;
    });
  }, [categories.errorReasons, filter.chapterIds, subjectId]);

  const allAvailableTags = useMemo(() => {
    const set = new Set<string>();
    subjectMistakes.forEach(m => {
      (m.tags || []).forEach(t => {
        if (t && t.trim()) set.add(t.trim());
      });
    });
    return Array.from(set);
  }, [subjectMistakes]);

  // Filtered mistakes within current subject
  const filteredMistakes = useMemo(
    () => filterMistakes(subjectMistakes, filter, categories),
    [subjectMistakes, filter, categories]
  );

  // Selected IDs for 錯題清單與工坊 (defaults to all filtered mistakes)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => filteredMistakes.map(m => m.id));

  useEffect(() => {
    setSelectedIds(filteredMistakes.map(m => m.id));
  }, [filteredMistakes]);

  const selectedMistakes = useMemo(() => {
    const idSet = new Set(selectedIds);
    return filteredMistakes.filter(m => idSet.has(m.id));
  }, [filteredMistakes, selectedIds]);

  const toggleSelectMistake = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleFilterId = (
    key: keyof Pick<FilterState, 'chapterIds' | 'unitIds' | 'familiarityIds' | 'errorReasonIds' | 'tags'>,
    id: string
  ) => {
    const current = filter[key];
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    const updated: FilterState = { ...filter, [key]: next };

    if (key === 'chapterIds') {
      const realChapters = next.filter(x => x !== UNCATEGORIZED_ID);
      if (realChapters.length > 0) {
        const validUnitIds = new Set(
          categories.units.filter(u => u.parent_id && realChapters.includes(u.parent_id)).map(u => u.id)
        );
        updated.unitIds = updated.unitIds.filter(uid => uid === UNCATEGORIZED_ID || validUnitIds.has(uid));
      }
    }
    setFilter(updated);
  };

  const resetFilters = () => {
    setFilter({
      ...createEmptyFilterState(),
      subjectIds: [subjectId]
    });
  };

  const hasAnySubFilter =
    filter.chapterIds.length > 0 ||
    filter.unitIds.length > 0 ||
    filter.familiarityIds.length > 0 ||
    filter.errorReasonIds.length > 0 ||
    filter.tags.length > 0 ||
    filter.fromDate !== '' ||
    filter.toDate !== '' ||
    filter.keyword.trim() !== '';

  // Overview stats
  const overviewStats = useMemo(() => {
    const total = filteredMistakes.length;
    let unsetFamiliarityCount = 0;
    const famCounts: Record<string, number> = {};
    categories.familiarities.forEach(f => {
      famCounts[f.id] = 0;
    });

    filteredMistakes.forEach(m => {
      const fId = getEffectiveFamiliarityId(m, categories.familiarities);
      if (!fId) {
        unsetFamiliarityCount++;
      } else {
        famCounts[fId] = (famCounts[fId] || 0) + 1;
      }
    });

    return { total, unsetFamiliarityCount, famCounts };
  }, [filteredMistakes, categories.familiarities]);

  // Distribution stats (分類占比)
  const distributionData = useMemo(() => {
    const totalMistakes = filteredMistakes.length;
    const rows: Array<{
      id: string;
      name: string;
      count: number;
      pct: number;
      pctText: string;
      color: string;
    }> = [];

    if (distDimension === 'error_reason') {
      const counts: Record<string, number> = {};
      visibleErrorReasons.forEach(r => {
        counts[r.id] = 0;
      });
      let unlabelledCount = 0;
      let totalTagOccurrences = 0;

      filteredMistakes.forEach(m => {
        const rIds = Array.isArray(m.error_reason_ids) ? m.error_reason_ids : [];
        if (rIds.length === 0) {
          unlabelledCount++;
        } else {
          rIds.forEach(id => {
            if (counts[id] !== undefined) {
              counts[id]++;
              totalTagOccurrences++;
            }
          });
        }
      });

      const effectiveMode = categories.errorReasonMode === 'single' ? 'involvement' : errorStatMode;
      const denom = effectiveMode === 'tag_share' ? totalTagOccurrences : totalMistakes;

      visibleErrorReasons.forEach((r, idx) => {
        const c = counts[r.id] || 0;
        rows.push({
          id: r.id,
          name: r.name,
          count: c,
          pct: denom > 0 ? (c / denom) * 100 : 0,
          pctText: formatPct(c, denom),
          color: CHART_COLORS[idx % CHART_COLORS.length]
        });
      });

      if (effectiveMode === 'involvement') {
        rows.push({
          id: UNCATEGORIZED_ID,
          name: '未標記錯因',
          count: unlabelledCount,
          pct: totalMistakes > 0 ? (unlabelledCount / totalMistakes) * 100 : 0,
          pctText: formatPct(unlabelledCount, totalMistakes),
          color: '#6b7280'
        });
      }

      return {
        rows,
        denominatorLabel:
          effectiveMode === 'tag_share'
            ? `所有錯因標籤出現總次數 (${totalTagOccurrences} 次)`
            : `篩選範圍錯題總數 (${totalMistakes} 題)`
      };
    }

    const sourceList =
      distDimension === 'chapter'
        ? visibleChapters
        : distDimension === 'unit'
        ? visibleUnits
        : categories.familiarities;

    const counts: Record<string, number> = {};
    sourceList.forEach(item => {
      counts[item.id] = 0;
    });
    let uncategorized = 0;

    filteredMistakes.forEach(m => {
      let valId: string | null = null;
      if (distDimension === 'chapter') valId = m.chapter_id;
      else if (distDimension === 'unit') valId = m.unit_id;
      else if (distDimension === 'familiarity') valId = getEffectiveFamiliarityId(m, categories.familiarities);

      if (!valId || counts[valId] === undefined) {
        uncategorized++;
      } else {
        counts[valId]++;
      }
    });

    sourceList.forEach((item, idx) => {
      const c = counts[item.id] || 0;
      let labelName = item.name;
      if (distDimension === 'unit') {
        const ch = visibleChapters.find(chap => chap.id === item.parent_id);
        if (ch) labelName = `${ch.name} / ${item.name}`;
      }
      rows.push({
        id: item.id,
        name: labelName,
        count: c,
        pct: totalMistakes > 0 ? (c / totalMistakes) * 100 : 0,
        pctText: formatPct(c, totalMistakes),
        color: CHART_COLORS[idx % CHART_COLORS.length]
      });
    });

    rows.push({
      id: UNCATEGORIZED_ID,
      name: distDimension === 'familiarity' ? '尚未設定熟悉度' : '未分類',
      count: uncategorized,
      pct: totalMistakes > 0 ? (uncategorized / totalMistakes) * 100 : 0,
      pctText: formatPct(uncategorized, totalMistakes),
      color: '#6b7280'
    });

    return {
      rows,
      denominatorLabel: `篩選範圍錯題總數 (${totalMistakes} 題)`
    };
  }, [distDimension, filteredMistakes, categories, visibleChapters, visibleUnits, visibleErrorReasons, errorStatMode]);

  // Cross-tabulation heatmap (熱度表)
  const crossData = useMemo(() => {
    const rowDim: CategoryDimension = crossPair === 'unit_reason' ? 'unit' : 'chapter';
    const colDim: CategoryDimension = crossPair === 'chapter_fam' ? 'familiarity' : 'error_reason';

    const rowItems = [
      ...(rowDim === 'chapter' ? visibleChapters : visibleUnits).map(i => ({ id: i.id, name: i.name })),
      { id: UNCATEGORIZED_ID, name: '未分類' }
    ];

    const colItems = [
      ...(colDim === 'familiarity' ? categories.familiarities : visibleErrorReasons).map(i => ({
        id: i.id,
        name: i.name
      })),
      { id: UNCATEGORIZED_ID, name: colDim === 'familiarity' ? '未設定' : '未標記' }
    ];

    const matrix: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    let maxCellCount = 0;

    rowItems.forEach(r => {
      matrix[r.id] = {};
      rowTotals[r.id] = 0;
      colItems.forEach(c => {
        matrix[r.id][c.id] = 0;
      });
    });

    filteredMistakes.forEach(m => {
      const rId = rowDim === 'chapter' ? (m.chapter_id || UNCATEGORIZED_ID) : (m.unit_id || UNCATEGORIZED_ID);
      if (!matrix[rId]) return;
      rowTotals[rId] = (rowTotals[rId] || 0) + 1;

      if (colDim === 'familiarity') {
        const cId = getEffectiveFamiliarityId(m, categories.familiarities) || UNCATEGORIZED_ID;
        if (matrix[rId][cId] !== undefined) {
          matrix[rId][cId]++;
          if (matrix[rId][cId] > maxCellCount) maxCellCount = matrix[rId][cId];
        }
      } else {
        const rIds =
          Array.isArray(m.error_reason_ids) && m.error_reason_ids.length > 0
            ? m.error_reason_ids
            : [UNCATEGORIZED_ID];
        rIds.forEach(cId => {
          if (matrix[rId][cId] !== undefined) {
            matrix[rId][cId]++;
            if (matrix[rId][cId] > maxCellCount) maxCellCount = matrix[rId][cId];
          }
        });
      }
    });

    return { rowDim, colDim, rowItems, colItems, matrix, rowTotals, maxCellCount };
  }, [crossPair, filteredMistakes, categories.familiarities, visibleChapters, visibleUnits, visibleErrorReasons]);

  const handleClickDistItem = (dim: CategoryDimension, itemId: string) => {
    const next = { ...filter };
    if (dim === 'chapter') next.chapterIds = [itemId];
    else if (dim === 'unit') next.unitIds = [itemId];
    else if (dim === 'familiarity') next.familiarityIds = [itemId];
    else if (dim === 'error_reason') next.errorReasonIds = [itemId];
    setFilter(next);
  };

  const handleClickCrossCell = (rowDim: CategoryDimension, rowId: string, colDim: CategoryDimension, colId: string) => {
    const next = { ...filter };
    if (rowDim === 'chapter') next.chapterIds = [rowId];
    else if (rowDim === 'unit') next.unitIds = [rowId];
    if (colDim === 'familiarity') next.familiarityIds = [colId];
    else if (colDim === 'error_reason') next.errorReasonIds = [colId];
    setFilter(next);
    setActiveSection('workshop');
  };

  // Count images in selected mistakes for AI Prompt ZIP preview
  const selectedMediaSummary = useMemo(() => {
    let qImgCount = 0;
    let aImgCount = 0;
    selectedMistakes.forEach(m => {
      const media = extractMistakeMediaAndText(m);
      qImgCount += media.qImages.length;
      aImgCount += media.aImages.length;
    });
    return { qImgCount, aImgCount, totalImages: qImgCount + aImgCount };
  }, [selectedMistakes]);

  const previewPromptText = useMemo(() => {
    return renderPromptWithMistakes(selectedPromptTemplate.content, selectedMistakes, categories);
  }, [selectedPromptTemplate.content, selectedMistakes, categories]);

  const handleCopyPromptText = async () => {
    try {
      await navigator.clipboard.writeText(previewPromptText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = previewPromptText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedPrompt(true);
    showToast('已複製純文字 AI 提詞', 'success');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleDownloadAiPromptZip = async () => {
    if (selectedMistakes.length === 0) {
      showToast('請先勾選至少一道錯題再打包 AI 提詞包', 'info');
      return;
    }

    setPackingZip(true);
    setZipProgress('正在收集題目與解析圖片...');
    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      const zipImageMap: Record<string, MistakeZipImageMapping> = {};
      let downloadedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < selectedMistakes.length; i++) {
        const m = selectedMistakes[i];
        const qNum = String(i + 1).padStart(2, '0');
        const media = extractMistakeMediaAndText(m);
        const mapping: MistakeZipImageMapping = { questionFiles: [], answerFiles: [] };

        setZipProgress(`正在打包第 ${i + 1} / ${selectedMistakes.length} 題的圖片素材...`);

        for (let qi = 0; qi < media.qImages.length; qi++) {
          const fetched = await fetchImageAsBlob(media.qImages[qi]);
          if (fetched && imagesFolder) {
            const filename = `Q${qNum}_題目圖${qi + 1}.${fetched.ext}`;
            imagesFolder.file(filename, fetched.blob);
            mapping.questionFiles.push(`images/${filename}`);
            downloadedCount++;
          } else {
            failedCount++;
          }
        }

        for (let ai = 0; ai < media.aImages.length; ai++) {
          const fetched = await fetchImageAsBlob(media.aImages[ai]);
          if (fetched && imagesFolder) {
            const filename = `Q${qNum}_解析圖${ai + 1}.${fetched.ext}`;
            imagesFolder.file(filename, fetched.blob);
            mapping.answerFiles.push(`images/${filename}`);
            downloadedCount++;
          } else {
            failedCount++;
          }
        }

        zipImageMap[m.id] = mapping;
      }

      setZipProgress('正在寫入 AI 提詞檔並壓縮 ZIP...');

      const finalPromptText = renderPromptWithMistakes(
        selectedPromptTemplate.content,
        selectedMistakes,
        categories,
        zipImageMap
      );

      zip.file('00_AI提詞與錯題清單.txt', finalPromptText);
      zip.file('00_AI提詞與錯題清單.md', finalPromptText);
      zip.file(
        '使用說明_如何丟給AI分析.txt',
        [
          '=== POBI STUDIO AI 提詞包使用說明 ===',
          '',
          `科目：${subjectName}`,
          `套用提詞模板：${selectedPromptTemplate.name}`,
          `收錄錯題數：${selectedMistakes.length} 題`,
          `附帶圖片數：${downloadedCount} 張（位於 images/ 資料夾內）`,
          '',
          '【推薦用法（免解壓縮直接上傳）】',
          '1. 開啟 ChatGPT、Gemini 或 Claude 對話視窗。',
          '2. 點擊「上傳檔案 / 迴紋針圖示」，直接選取整個 .zip 壓縮檔上傳。',
          '3. 在訊息框輸入：「請閱讀壓縮檔內的 00_AI提詞與錯題清單.txt，並結合 images 資料夾內的所有題目與解析圖片，依照提詞指示幫我深度分析。」',
          '',
          '【若使用的 AI 工具不支援直接上傳 ZIP】',
          '1. 先解壓縮本檔案。',
          '2. 複製 00_AI提詞與錯題清單.txt 內容貼到對話框，並將 images/ 裡的圖片一併附上即可。'
        ].join('\n')
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `PobiNotes_${subjectName}_AI提詞包_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (failedCount > 0) {
        showToast(
          `AI 提詞包 ZIP 已下載（含 ${selectedMistakes.length} 題與 ${downloadedCount} 張圖片，另有 ${failedCount} 張外部圖片無法讀取）`,
          'info'
        );
      } else {
        showToast(
          `AI 提詞包 ZIP 已下載（含 ${selectedMistakes.length} 題、${downloadedCount} 張題目/解析圖片與提詞檔）`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('打包 AI 提詞包失敗:', err);
      showToast(err?.message || '打包 AI 提詞包失敗，請重試', 'error');
    } finally {
      setPackingZip(false);
      setZipProgress('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="subject-analytics-workshop">
      {/* 1. Primary Screen: Advanced Multi-Dimensional Filter Panel (No-Print) */}
      <div className="glass no-print" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} style={{ color: '#B45309' }} />
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#1C1917' }}>
              《{subjectName}》進階多維度篩選
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {hasAnySubFilter && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={resetFilters}
                data-testid="workshop-reset-filters-btn"
              >
                <RotateCcw size={14} /> 重設篩選
              </button>
            )}
            <span
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #F59E0B',
                color: '#92400E',
                fontSize: '0.82rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              篩選範圍：{filteredMistakes.length} / {subjectMistakes.length} 題
            </span>
          </div>
        </div>

        {/* Keyword + Date Range */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '36px', height: '36px', fontSize: '0.86rem' }}
              placeholder="搜尋標題、題幹、解析或標籤關鍵字..."
              value={filter.keyword}
              onChange={e => setFilter({ ...filter, keyword: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>日期：</span>
            <input
              type="date"
              className="input"
              style={{ width: '140px', height: '36px', padding: '4px 8px', fontSize: '0.82rem' }}
              value={filter.fromDate}
              onChange={e => setFilter({ ...filter, fromDate: e.target.value })}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>至</span>
            <input
              type="date"
              className="input"
              style={{ width: '140px', height: '36px', padding: '4px 8px', fontSize: '0.82rem' }}
              value={filter.toDate}
              onChange={e => setFilter({ ...filter, toDate: e.target.value })}
            />
            {(filter.fromDate || filter.toDate) && (
              <button
                type="button"
                className="btn btn-text"
                style={{ fontSize: '0.78rem', padding: '4px 6px' }}
                onClick={() => setFilter({ ...filter, fromDate: '', toDate: '' })}
              >
                清除
              </button>
            )}
          </div>
        </div>

        {/* Cascading Multi-Select Pill Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
          <WorkshopFilterRow
            label="章節"
            items={visibleChapters.map(c => ({ id: c.id, name: c.name, inactive: c.is_active === 0 }))}
            selectedIds={filter.chapterIds}
            uncategorizedLabel="未分類章節"
            onToggle={id => toggleFilterId('chapterIds', id)}
            onClear={() => setFilter({ ...filter, chapterIds: [], unitIds: [] })}
          />

          {visibleUnits.length > 0 && (
            <WorkshopFilterRow
              label="單元"
              items={visibleUnits.map(u => {
                const chap = visibleChapters.find(c => c.id === u.parent_id);
                return {
                  id: u.id,
                  name: filter.chapterIds.length === 1 ? u.name : `${chap ? chap.name + ' / ' : ''}${u.name}`,
                  inactive: u.is_active === 0
                };
              })}
              selectedIds={filter.unitIds}
              uncategorizedLabel="未分類單元"
              onToggle={id => toggleFilterId('unitIds', id)}
              onClear={() => setFilter({ ...filter, unitIds: [] })}
            />
          )}

          <WorkshopFilterRow
            label="熟悉度"
            items={categories.familiarities.map(f => ({ id: f.id, name: f.name, inactive: f.is_active === 0 }))}
            selectedIds={filter.familiarityIds}
            uncategorizedLabel="尚未設定"
            onToggle={id => toggleFilterId('familiarityIds', id)}
            onClear={() => setFilter({ ...filter, familiarityIds: [] })}
          />

          <WorkshopFilterRow
            label="錯因"
            items={visibleErrorReasons.map(r => ({ id: r.id, name: r.name, inactive: r.is_active === 0 }))}
            selectedIds={filter.errorReasonIds}
            uncategorizedLabel="未標記錯因"
            onToggle={id => toggleFilterId('errorReasonIds', id)}
            onClear={() => setFilter({ ...filter, errorReasonIds: [] })}
          />

          {allAvailableTags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '7px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '56px', fontWeight: 600 }}>標籤：</span>
              {allAvailableTags.map(tag => {
                const active = filter.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFilterId('tags', tag)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      border: active ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                      background: active ? '#FDE68A' : 'var(--glass-bg)',
                      color: active ? '#1C1917' : 'var(--text-secondary)',
                      fontWeight: active ? 700 : 500
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Two Prominent Action Buttons right after Filtering */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            paddingTop: '12px',
            borderTop: '1.5px solid rgba(180, 83, 9, 0.16)'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSection('diagnostics')}
            data-testid="workshop-btn-diagnostics"
            style={{
              padding: '13px 16px',
              borderRadius: '11px',
              border: activeSection === 'diagnostics' ? '2px solid #D97706' : '1.5px solid var(--glass-border)',
              backgroundColor: activeSection === 'diagnostics' ? '#FFFBEB' : '#FAF7F0',
              color: activeSection === 'diagnostics' ? '#92400E' : '#44403C',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              textAlign: 'left',
              boxShadow: activeSection === 'diagnostics' ? '0 4px 12px rgba(180, 83, 9, 0.14)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={20} style={{ color: activeSection === 'diagnostics' ? '#B45309' : '#78716C', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>1. 學習診斷</div>
                <div style={{ fontSize: '0.76rem', color: '#57534E', marginTop: '2px' }}>分類占比圖表與雙維度熱度表</div>
              </div>
            </div>
            {activeSection === 'diagnostics' && <Check size={18} style={{ color: '#B45309', flexShrink: 0 }} />}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('workshop')}
            data-testid="workshop-btn-workshop"
            style={{
              padding: '13px 16px',
              borderRadius: '11px',
              border: activeSection === 'workshop' ? '2px solid #D97706' : '1.5px solid var(--glass-border)',
              backgroundColor: activeSection === 'workshop' ? '#FFFBEB' : '#FAF7F0',
              color: activeSection === 'workshop' ? '#92400E' : '#44403C',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              textAlign: 'left',
              boxShadow: activeSection === 'workshop' ? '0 4px 12px rgba(180, 83, 9, 0.14)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ListChecks size={20} style={{ color: activeSection === 'workshop' ? '#B45309' : '#78716C', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>2. 錯題清單與工坊（{filteredMistakes.length} 題）</div>
                <div style={{ fontSize: '0.76rem', color: '#57534E', marginTop: '2px' }}>AI 提詞包（打包 ZIP）與匯出 A4 練習卷</div>
              </div>
            </div>
            {activeSection === 'workshop' && <Check size={18} style={{ color: '#B45309', flexShrink: 0 }} />}
          </button>
        </div>
      </div>

      {/* =======================================================
          MODE 1: 學習診斷（分類占比 + 熱度表）
         ======================================================= */}
      {activeSection === 'diagnostics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="workshop-diagnostics-view">
          {/* Overview Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="glass" style={{ padding: '14px 16px', borderLeft: '4px solid #8B5A2B', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>篩選錯題總數</div>
              <div style={{ fontSize: '1.55rem', fontWeight: 800, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                {overviewStats.total} <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>題</span>
              </div>
            </div>
            {categories.familiarities
              .filter(f => f.is_active === 1)
              .map(f => {
                const count = overviewStats.famCounts[f.id] || 0;
                const borderColor =
                  f.color === 'success' ? '#4D7C0F' : f.color === 'warning' ? '#D97706' : f.color === 'danger' ? '#C5221F' : '#8B5A2B';
                return (
                  <div
                    key={f.id}
                    className="glass"
                    onClick={() => handleClickDistItem('familiarity', f.id)}
                    style={{ padding: '14px 16px', borderLeft: `4px solid ${borderColor}`, cursor: 'pointer', backgroundColor: '#FFFFFF' }}
                    title="點擊篩選此熟悉度錯題"
                  >
                    <div style={{ fontSize: '0.78rem', color: borderColor, fontWeight: 700 }}>熟悉度：{f.name}</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                      {count} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>題</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                        ({formatPct(count, overviewStats.total)})
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Category Distribution (分類占比) */}
          <div className="glass" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700 }}>分類占比統計</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  分母：{distributionData.denominatorLabel}｜點擊任一項目可直接套用篩選
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {([
                  { key: 'chapter', label: '按章節' },
                  { key: 'unit', label: '按單元' },
                  { key: 'familiarity', label: '按熟悉度' },
                  { key: 'error_reason', label: '按錯因' }
                ] as Array<{ key: CategoryDimension; label: string }>).map(d => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDistDimension(d.key)}
                    className={`btn ${distDimension === d.key ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '5px 11px', fontSize: '0.8rem' }}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '5px 9px', fontSize: '0.78rem' }}
                >
                  <BarChart3 size={14} /> 長條圖
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('pie')}
                  className={`btn ${chartType === 'pie' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '5px 9px', fontSize: '0.78rem' }}
                >
                  <PieChart size={14} /> 圓餅圖
                </button>
              </div>
            </div>

            {distDimension === 'error_reason' && categories.errorReasonMode === 'multi' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '0.8rem' }}>
                <span>
                  {errorStatMode === 'involvement'
                    ? '目前採用「涉及率（題數占比）」：單題可多選錯因，總和可能超過 100%。'
                    : '目前採用「標籤占比（次數占比）」：除以所有錯因標籤出現總次數，總和為 100%。'}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setErrorStatMode('involvement')}
                    className={`btn ${errorStatMode === 'involvement' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                  >
                    涉及率
                  </button>
                  <button
                    type="button"
                    onClick={() => setErrorStatMode('tag_share')}
                    className={`btn ${errorStatMode === 'tag_share' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                  >
                    標籤占比
                  </button>
                </div>
              </div>
            )}

            {filteredMistakes.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--glass-border)', borderRadius: '10px' }}>
                <AlertCircle size={24} style={{ margin: '0 auto 6px auto', display: 'block' }} />
                目前篩選條件尚無錯題資料
              </div>
            ) : chartType === 'bar' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {distributionData.rows.map(row => (
                  <div
                    key={row.id}
                    onClick={() => handleClickDistItem(distDimension, row.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#FAF7F0',
                      border: '1px solid var(--glass-border)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem' }}>
                      <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: row.color }} />
                        <span>{row.name}</span>
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{row.count} 題</strong>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({row.pctText})</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '7px', background: 'rgba(120, 113, 108, 0.14)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, row.pct))}%`, height: '100%', background: row.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
                <WorkshopDonutChart
                  rows={distributionData.rows}
                  totalLabel={`${filteredMistakes.length} 題`}
                  onSelectSlice={id => handleClickDistItem(distDimension, id)}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', minWidth: '240px', flex: 1 }}>
                  {distributionData.rows.map(row => (
                    <div
                      key={row.id}
                      onClick={() => handleClickDistItem(distDimension, row.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '7px 11px',
                        borderRadius: '7px',
                        backgroundColor: '#FAF7F0',
                        border: '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        fontSize: '0.84rem'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: row.color }} />
                        <span>{row.name}</span>
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{row.count} 題</strong> ({row.pctText})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Heatmap (雙維度交叉分析熱度表) */}
          <div className="glass" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Grid size={17} style={{ color: '#B45309' }} />
                  雙維度弱點熱度表
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  點擊任一熱度儲存格，立即篩選該弱點組合並切換至「錯題清單與工坊」
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {([
                  { key: 'chapter_fam', label: '章節 × 熟悉度' },
                  { key: 'chapter_reason', label: '章節 × 錯因' },
                  { key: 'unit_reason', label: '單元 × 錯因' }
                ] as const).map(pair => (
                  <button
                    key={pair.key}
                    type="button"
                    onClick={() => setCrossPair(pair.key)}
                    className={`btn ${crossPair === pair.key ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                  >
                    {pair.label}
                  </button>
                ))}
                <select
                  className="input"
                  style={{ width: 'auto', padding: '5px 9px', fontSize: '0.78rem', height: '32px' }}
                  value={crossDenomMode}
                  onChange={e => setCrossDenomMode(e.target.value as 'total' | 'row')}
                >
                  <option value="total">分母：篩選總題數</option>
                  <option value="row">分母：各列小計</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '9px', textAlign: 'left' }}>列 \ 欄</th>
                    {crossData.colItems.map(col => (
                      <th key={col.id} style={{ padding: '9px', textAlign: 'center' }}>{col.name}</th>
                    ))}
                    <th style={{ padding: '9px', textAlign: 'center' }}>小計</th>
                  </tr>
                </thead>
                <tbody>
                  {crossData.rowItems.map(row => {
                    const rowSum = crossData.rowTotals[row.id] || 0;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '9px', fontWeight: 600 }}>{row.name}</td>
                        {crossData.colItems.map(col => {
                          const val = crossData.matrix[row.id]?.[col.id] || 0;
                          const denom = crossDenomMode === 'total' ? filteredMistakes.length : rowSum;
                          const intensity = crossData.maxCellCount > 0 ? (val / crossData.maxCellCount) * 0.48 : 0;
                          return (
                            <td
                              key={col.id}
                              onClick={() => handleClickCrossCell(crossData.rowDim, row.id, crossData.colDim, col.id)}
                              style={{
                                padding: '9px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: val > 0 ? `rgba(217, 119, 6, ${0.08 + intensity})` : 'transparent',
                                border: '1px solid var(--glass-border)',
                                fontVariantNumeric: 'tabular-nums'
                              }}
                              title={`點擊篩選「${row.name} × ${col.name}」並進入工坊`}
                            >
                              <div style={{ fontWeight: val > 0 ? 700 : 400, color: val > 0 ? '#1C1917' : 'var(--text-muted)' }}>
                                {val} 題
                              </div>
                              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                {formatPct(val, denom)}
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ padding: '9px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {rowSum} 題
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          MODE 2: 錯題清單與工坊（1. AI 提詞包 ZIP / 2. 匯出練習卷）
         ======================================================= */}
      {activeSection === 'workshop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="workshop-action-view">
          {/* Selectable Mistake Scope List (No-Print) */}
          <div className="glass no-print" style={{ padding: '16px 20px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListChecks size={17} style={{ color: '#B45309' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  已篩選錯題清單（已勾選 {selectedMistakes.length} / {filteredMistakes.length} 題）
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                  onClick={() => setSelectedIds(filteredMistakes.map(m => m.id))}
                >
                  全選 ({filteredMistakes.length})
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                  onClick={() => setSelectedIds([])}
                >
                  取消全選
                </button>
              </div>
            </div>

            {filteredMistakes.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                目前篩選條件下沒有符合的錯題，請調整上方篩選條件。
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredMistakes.map(m => {
                  const checked = selectedIds.includes(m.id);
                  const media = extractMistakeMediaAndText(m);
                  const imgTotal = media.qImages.length + media.aImages.length;
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleSelectMistake(m.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '9px',
                        border: checked ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                        backgroundColor: checked ? '#FFFBEB' : '#FAF7F0',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', minWidth: 0 }}>
                          {checked ? (
                            <CheckSquare size={16} style={{ color: '#B45309', flexShrink: 0, marginTop: '2px' }} />
                          ) : (
                            <Square size={16} style={{ color: '#78716C', flexShrink: 0, marginTop: '2px' }} />
                          )}
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1C1917', wordBreak: 'break-word' }}>
                            {m.title}
                          </span>
                        </div>
                        <div style={{ display: 'inline-flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          {onEditMistake && (
                            <button
                              type="button"
                              onClick={() => onEditMistake(m)}
                              style={{ background: 'none', border: 'none', color: '#57534E', cursor: 'pointer', padding: '2px' }}
                              title="編輯錯題"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {onDeleteMistake && (
                            <button
                              type="button"
                              onClick={() => onDeleteMistake(m)}
                              style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
                              title="刪除錯題"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingLeft: '23px' }}>
                        {m.chapter_name && (
                          <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>
                            {m.chapter_name}{m.unit_name ? ` / ${m.unit_name}` : ''}
                          </span>
                        )}
                        {m.familiarity_name && (
                          <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#047857', fontWeight: 600 }}>
                            {m.familiarity_name}
                          </span>
                        )}
                        {imgTotal > 0 && (
                          <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <ImageIcon size={11} /> {imgTotal} 張圖
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Two Workshop Sub-Mode Switcher (No-Print) */}
          <div
            className="no-print"
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--glass-border)'
            }}
          >
            <button
              type="button"
              onClick={() => setWorkshopMode('ai_zip')}
              data-testid="workshop-submode-ai-zip"
              className={`btn ${workshopMode === 'ai_zip' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '9px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px'
              }}
            >
              <Sparkles size={16} />
              <span>1. AI 提詞包（圖片＋提詞打包 ZIP）</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkshopMode('exam_paper')}
              data-testid="workshop-submode-exam-paper"
              className={`btn ${workshopMode === 'exam_paper' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '9px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px'
              }}
            >
              <Printer size={16} />
              <span>2. 匯出練習卷（A4 防跨頁切割）</span>
            </button>
          </div>

          {/* Sub-Mode 1: AI 提詞包 (ZIP) */}
          {workshopMode === 'ai_zip' && (
            <div className="glass no-print" style={{ padding: '20px 22px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="workshop-ai-zip-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={18} style={{ color: '#B45309' }} />
                    AI 提詞包（題目 / 解析圖片＋提詞一鍵打包 ZIP）
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    已選 {selectedMistakes.length} 題，將自動打包 {selectedMediaSummary.qImgCount} 張題目圖、{selectedMediaSummary.aImgCount} 張解析圖與所選 AI 提詞至同一個 .zip 檔。
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCopyPromptText}
                    disabled={selectedMistakes.length === 0}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.84rem', fontWeight: 600 }}
                  >
                    {copiedPrompt ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedPrompt ? '已複製文字' : '僅複製純文字提詞'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadAiPromptZip}
                    disabled={packingZip || selectedMistakes.length === 0}
                    data-testid="download-ai-prompt-zip-btn"
                    className="btn btn-primary"
                    style={{
                      padding: '9px 18px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                      color: '#FFFFFF',
                      border: '1px solid #B45309',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px'
                    }}
                  >
                    {packingZip ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{zipProgress || '打包中...'}</span>
                      </>
                    ) : (
                      <>
                        <Package size={16} />
                        <span>打包下載 AI 提詞包 (.zip)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* How to feed ZIP to AI explanation */}
              <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '0.82rem', color: '#78350F', lineHeight: 1.6, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <HelpCircle size={17} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>如何把下載好的 ZIP 直接丟給 AI 分析？</strong>
                  下載後不需手動解壓縮，直接打開 ChatGPT / Gemini / Claude 對話框，點擊上傳檔案選擇這份 <code>.zip</code>，並輸入：「請閱讀裡面的 <code>00_AI提詞與錯題清單.txt</code>，並搭配 <code>images/</code> 的題目與解析圖片幫我分析」。
                </div>
              </div>

              {/* Select Prompt Template (synced with AI 提詞管理) */}
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1C1917', marginBottom: '8px' }}>
                  選擇要打包的 AI 提詞模板（可於左側「AI 提詞管理」新增或自訂模板）：
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                  {allPromptTemplates.map(tpl => {
                    const active = tpl.id === selectedPromptTemplate.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setActivePromptTemplateId(tpl.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '9px',
                          border: active ? '2px solid #D97706' : '1px solid var(--glass-border)',
                          backgroundColor: active ? '#FFFBEB' : '#FAF7F0',
                          color: '#1C1917',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: active ? '#92400E' : '#1C1917', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span>{tpl.name}</span>
                          {tpl.isRecommended && (
                            <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#D97706', color: '#FFFFFF' }}>推薦</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#57534E', lineHeight: 1.4 }}>{tpl.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Prompt Preview */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  提詞內容預覽（打包 ZIP 時會自動補上對應圖片路徑）：
                </div>
                <textarea
                  readOnly
                  value={previewPromptText}
                  className="input"
                  style={{ minHeight: '190px', fontSize: '0.82rem', lineHeight: 1.55, fontFamily: 'monospace', resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* Sub-Mode 2: 匯出練習卷 (A4, no cross-page cut, all images rendered, no quick-answer table) */}
          {workshopMode === 'exam_paper' && (
            <div data-testid="workshop-exam-paper-panel">
              <ExportPDF
                embedded
                mistakeIds={selectedIds}
                initialMistakes={selectedMistakes}
                defaultSubjectName={subjectName}
                onImageClick={onImageClick}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkshopFilterRow({
  label,
  items,
  selectedIds,
  uncategorizedLabel,
  onToggle,
  onClear
}: {
  label: string;
  items: Array<{ id: string; name: string; inactive?: boolean }>;
  selectedIds: string[];
  uncategorizedLabel: string;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '7px' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '56px', fontWeight: 600 }}>
        {label}：
      </span>
      <button
        type="button"
        onClick={onClear}
        style={{
          padding: '4px 10px',
          fontSize: '0.78rem',
          borderRadius: '14px',
          cursor: 'pointer',
          border: selectedIds.length === 0 ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
          background: selectedIds.length === 0 ? '#FDE68A' : 'var(--glass-bg)',
          color: selectedIds.length === 0 ? '#1C1917' : 'var(--text-secondary)',
          fontWeight: selectedIds.length === 0 ? 700 : 500
        }}
      >
        全部
      </button>
      {items.map(item => {
        const active = selectedIds.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            style={{
              padding: '4px 10px',
              fontSize: '0.78rem',
              borderRadius: '14px',
              cursor: 'pointer',
              border: active ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
              background: active ? '#FDE68A' : 'var(--glass-bg)',
              color: active ? '#1C1917' : 'var(--text-primary)',
              fontWeight: active ? 700 : 500,
              opacity: item.inactive ? 0.6 : 1
            }}
          >
            {item.name}
            {item.inactive ? ' (停用)' : ''}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onToggle(UNCATEGORIZED_ID)}
        style={{
          padding: '4px 10px',
          fontSize: '0.78rem',
          borderRadius: '14px',
          cursor: 'pointer',
          border: `1px solid ${selectedIds.includes(UNCATEGORIZED_ID) ? '#f59e0b' : 'var(--glass-border)'}`,
          background: selectedIds.includes(UNCATEGORIZED_ID) ? 'rgba(245, 158, 11, 0.2)' : 'var(--glass-bg)',
          color: selectedIds.includes(UNCATEGORIZED_ID) ? '#b45309' : 'var(--text-muted)'
        }}
      >
        {uncategorizedLabel}
      </button>
    </div>
  );
}

function WorkshopDonutChart({
  rows,
  totalLabel,
  onSelectSlice
}: {
  rows: Array<{ id: string; name: string; count: number; pct: number; color: string }>;
  totalLabel: string;
  onSelectSlice: (id: string) => void;
}) {
  const sumCounts = rows.reduce((acc, r) => acc + r.count, 0);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <svg width="190" height="190" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r={radius} fill="transparent" stroke="rgba(120, 113, 108, 0.14)" strokeWidth="26" />
      {sumCounts > 0 &&
        rows.map(row => {
          if (row.count <= 0) return null;
          const fraction = row.count / sumCounts;
          const dash = fraction * circumference;
          const offset = -accumulated * circumference;
          accumulated += fraction;
          return (
            <circle
              key={row.id}
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke={row.color}
              strokeWidth="26"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              transform="rotate(-90 100 100)"
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectSlice(row.id)}
            >
              <title>{`${row.name}: ${row.count} 題`}</title>
            </circle>
          );
        })}
      <text x="100" y="96" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">
        篩選總計
      </text>
      <text x="100" y="118" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="bold">
        {totalLabel}
      </text>
    </svg>
  );
}
