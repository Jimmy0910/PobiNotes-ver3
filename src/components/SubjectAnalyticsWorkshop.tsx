import { useState, useMemo, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { apiRequest } from '../utils/api';
import {
  type CategoriesBundle,
  type CategoryDimension,
  type MistakeRecord,
  UNCATEGORIZED_ID,
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
  FolderTree,
  Activity,
  Tag,
  BarChart3,
  PieChart,
  Flame,
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
  HelpCircle,
  Search,
  RotateCcw,
  ArrowRight
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

type AnalysisMode = 'hierarchy' | 'diagnosis' | 'tags';
type HeatmapPair = 'chapter_fam' | 'chapter_reason' | 'unit_reason' | 'fam_reason' | 'tag_fam';

const CHART_COLORS = [
  '#D97706', // 琥珀橘
  '#145B38', // 經典森林綠
  '#C89A50', // 暖金色
  '#B45309', // 復古焦糖橘
  '#4D7C0F', // 苔蘚綠
  '#78716C', // 暖石炭灰
  '#991B1B', // 典雅酒紅
  '#334155', // 沉穩深岩灰
  '#0B402B', // 深森林綠
  '#A16207'  // 黃銅金
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

function getHeatLevel(val: number, maxVal: number): {
  tier: 0 | 1 | 2 | 3 | 4;
  label: string;
  className: string;
} {
  if (val <= 0 || maxVal <= 0) {
    return { tier: 0, label: '無', className: 'pobi-heat-cell-0' };
  }
  const ratio = val / maxVal;
  if (ratio >= 0.75) return { tier: 4, label: '高熱度', className: 'pobi-heat-cell-4' };
  if (ratio >= 0.45) return { tier: 3, label: '偏高', className: 'pobi-heat-cell-3' };
  if (ratio >= 0.2) return { tier: 2, label: '中等', className: 'pobi-heat-cell-2' };
  return { tier: 1, label: '輕微', className: 'pobi-heat-cell-1' };
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

  // =========================================================
  // STEP 1: Analysis Mode Selection
  // =========================================================
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('hierarchy');

  // STEP 2: Multi-select scope filter per mode
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedFamiliarityIds, setSelectedFamiliarityIds] = useState<string[]>([]);
  const [selectedErrorReasonIds, setSelectedErrorReasonIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');

  // STEP 2 -> Chart Visualization & Multi-select chart buckets
  const [distDimension, setDistDimension] = useState<CategoryDimension | 'tag'>('chapter');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [heatmapPair, setHeatmapPair] = useState<HeatmapPair>('chapter_fam');
  const [crossDenomMode, setCrossDenomMode] = useState<'total' | 'row'>('total');

  // Multi-select items clicked directly on the distribution chart or visual heatmap!
  // Each key looks like `dist:<dim>:<id>` or `heat:<rowDim>:<rowId>|<colDim>:<colId>`
  const [chartSelectedKeys, setChartSelectedKeys] = useState<string[]>([]);

  // STEP 3: Export choice (AI Prompt ZIP vs Exam Paper) + manual fine-tune checkboxes
  const [exportChoice, setExportChoice] = useState<'ai_zip' | 'exam_paper'>('ai_zip');
  const [manualUncheckedIds, setManualUncheckedIds] = useState<string[]>([]);

  // AI Prompt Template state
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

  // Reset selections when switching subject
  useEffect(() => {
    setSelectedChapterIds([]);
    setSelectedUnitIds([]);
    setSelectedFamiliarityIds([]);
    setSelectedErrorReasonIds([]);
    setSelectedTags([]);
    setKeyword('');
    setChartSelectedKeys([]);
    setManualUncheckedIds([]);
  }, [subjectId]);

  // Sync default chart dimension & heatmap pair when switching Step 1 mode
  const handleChangeAnalysisMode = (mode: AnalysisMode) => {
    setAnalysisMode(mode);
    setChartSelectedKeys([]);
    setManualUncheckedIds([]);
    if (mode === 'hierarchy') {
      setDistDimension('chapter');
      setHeatmapPair('chapter_fam');
    } else if (mode === 'diagnosis') {
      setDistDimension('familiarity');
      setHeatmapPair('fam_reason');
    } else {
      setDistDimension('tag');
      setHeatmapPair('tag_fam');
    }
  };

  const allPromptTemplates = useMemo(
    () => mergePromptTemplates(savedPromptTemplates),
    [savedPromptTemplates]
  );

  const selectedPromptTemplate = useMemo(
    () =>
      allPromptTemplates.find(t => t.id === activePromptTemplateId) ||
      allPromptTemplates[0] ||
      BUILTIN_PROMPT_TEMPLATES[0],
    [allPromptTemplates, activePromptTemplateId]
  );

  // Subject-scoped options
  const visibleChapters = useMemo(
    () =>
      categories.chapters
        .filter(c => c.parent_id === subjectId || c.subject_id === subjectId)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [categories.chapters, subjectId]
  );

  const visibleUnits = useMemo(() => {
    const realChaps = selectedChapterIds.filter(id => id !== UNCATEGORIZED_ID);
    if (realChaps.length > 0) {
      return categories.units.filter(u => u.parent_id && realChaps.includes(u.parent_id));
    }
    return categories.units.filter(
      u => u.subject_id === subjectId || visibleChapters.some(c => c.id === u.parent_id)
    );
  }, [categories.units, selectedChapterIds, subjectId, visibleChapters]);

  const visibleErrorReasons = useMemo(() => {
    return categories.errorReasons.filter(r => {
      if (!r.parent_id) return true;
      if (r.parent_id === subjectId || r.subject_id === subjectId) return true;
      if (visibleChapters.some(c => c.id === r.parent_id)) return true;
      return false;
    });
  }, [categories.errorReasons, subjectId, visibleChapters]);

  const allAvailableTags = useMemo(() => {
    const set = new Set<string>();
    subjectMistakes.forEach(m => {
      (m.tags || []).forEach(t => {
        if (t && t.trim()) set.add(t.trim());
      });
    });
    return Array.from(set);
  }, [subjectMistakes]);

  // Helper toggles for Step 2 multi-select scope
  const toggleItem = (list: string[], setList: (next: string[]) => void, id: string) => {
    setChartSelectedKeys([]);
    setManualUncheckedIds([]);
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  // STEP 2 filtered pool based on active Step 1 mode & multi-select scope
  const step2Mistakes = useMemo(() => {
    return subjectMistakes.filter(m => {
      if (analysisMode === 'hierarchy') {
        if (selectedChapterIds.length > 0) {
          const cid = m.chapter_id || UNCATEGORIZED_ID;
          if (!selectedChapterIds.includes(cid)) return false;
        }
        if (selectedUnitIds.length > 0) {
          const uid = m.unit_id || UNCATEGORIZED_ID;
          if (!selectedUnitIds.includes(uid)) return false;
        }
      } else if (analysisMode === 'diagnosis') {
        if (selectedFamiliarityIds.length > 0) {
          const fid = getEffectiveFamiliarityId(m, categories.familiarities) || UNCATEGORIZED_ID;
          if (!selectedFamiliarityIds.includes(fid)) return false;
        }
        if (selectedErrorReasonIds.length > 0) {
          const rIds =
            Array.isArray(m.error_reason_ids) && m.error_reason_ids.length > 0
              ? m.error_reason_ids
              : [UNCATEGORIZED_ID];
          if (!rIds.some(id => selectedErrorReasonIds.includes(id))) return false;
        }
      } else if (analysisMode === 'tags') {
        if (selectedTags.length > 0) {
          const mTags = Array.isArray(m.tags) && m.tags.length > 0 ? m.tags : [UNCATEGORIZED_ID];
          if (!mTags.some(t => selectedTags.includes(t))) return false;
        }
      }

      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const media = extractMistakeMediaAndText(m);
        const match =
          (m.title || '').toLowerCase().includes(kw) ||
          media.qDesc.toLowerCase().includes(kw) ||
          media.aDesc.toLowerCase().includes(kw) ||
          (m.chapter_name || '').toLowerCase().includes(kw) ||
          (m.tags || []).some(t => t.toLowerCase().includes(kw));
        if (!match) return false;
      }

      return true;
    });
  }, [
    subjectMistakes,
    analysisMode,
    selectedChapterIds,
    selectedUnitIds,
    selectedFamiliarityIds,
    selectedErrorReasonIds,
    selectedTags,
    keyword,
    categories.familiarities
  ]);

  // Helper: does mistake match a dimension & id?
  const mistakeMatchesDimValue = useCallback((m: MistakeRecord, dim: CategoryDimension | 'tag', itemId: string): boolean => {
    if (dim === 'chapter') return (m.chapter_id || UNCATEGORIZED_ID) === itemId;
    if (dim === 'unit') return (m.unit_id || UNCATEGORIZED_ID) === itemId;
    if (dim === 'familiarity') {
      return (getEffectiveFamiliarityId(m, categories.familiarities) || UNCATEGORIZED_ID) === itemId;
    }
    if (dim === 'error_reason') {
      const rIds = Array.isArray(m.error_reason_ids) && m.error_reason_ids.length > 0 ? m.error_reason_ids : [UNCATEGORIZED_ID];
      return rIds.includes(itemId);
    }
    if (dim === 'tag') {
      const mTags = Array.isArray(m.tags) && m.tags.length > 0 ? m.tags : [UNCATEGORIZED_ID];
      return mTags.includes(itemId);
    }
    return false;
  }, [categories.familiarities]);

  // Distribution Chart Data (based on step2Mistakes)
  const distributionData = useMemo(() => {
    const total = step2Mistakes.length;
    const rows: Array<{
      id: string;
      key: string;
      name: string;
      count: number;
      pct: number;
      pctText: string;
      color: string;
    }> = [];

    if (distDimension === 'tag') {
      const tagList = allAvailableTags;
      tagList.forEach((tag, idx) => {
        const count = step2Mistakes.filter(m => (m.tags || []).includes(tag)).length;
        rows.push({
          id: tag,
          key: `dist:tag:${tag}`,
          name: `#${tag}`,
          count,
          pct: total > 0 ? (count / total) * 100 : 0,
          pctText: formatPct(count, total),
          color: CHART_COLORS[idx % CHART_COLORS.length]
        });
      });
      const untagged = step2Mistakes.filter(m => !m.tags || m.tags.length === 0).length;
      rows.push({
        id: UNCATEGORIZED_ID,
        key: `dist:tag:${UNCATEGORIZED_ID}`,
        name: '未標記自訂標籤',
        count: untagged,
        pct: total > 0 ? (untagged / total) * 100 : 0,
        pctText: formatPct(untagged, total),
        color: '#64748B'
      });
      return rows;
    }

    if (distDimension === 'error_reason') {
      visibleErrorReasons.forEach((r, idx) => {
        const count = step2Mistakes.filter(m => (m.error_reason_ids || []).includes(r.id)).length;
        rows.push({
          id: r.id,
          key: `dist:error_reason:${r.id}`,
          name: r.name,
          count,
          pct: total > 0 ? (count / total) * 100 : 0,
          pctText: formatPct(count, total),
          color: CHART_COLORS[idx % CHART_COLORS.length]
        });
      });
      const unlabelled = step2Mistakes.filter(m => !m.error_reason_ids || m.error_reason_ids.length === 0).length;
      rows.push({
        id: UNCATEGORIZED_ID,
        key: `dist:error_reason:${UNCATEGORIZED_ID}`,
        name: '未標記錯因',
        count: unlabelled,
        pct: total > 0 ? (unlabelled / total) * 100 : 0,
        pctText: formatPct(unlabelled, total),
        color: '#64748B'
      });
      return rows;
    }

    const sourceList =
      distDimension === 'chapter'
        ? visibleChapters
        : distDimension === 'unit'
        ? visibleUnits
        : categories.familiarities;

    sourceList.forEach((item, idx) => {
      const count = step2Mistakes.filter(m => mistakeMatchesDimValue(m, distDimension, item.id)).length;
      let labelName = item.name;
      if (distDimension === 'unit') {
        const ch = visibleChapters.find(c => c.id === item.parent_id);
        if (ch) labelName = `${ch.name} / ${item.name}`;
      }
      rows.push({
        id: item.id,
        key: `dist:${distDimension}:${item.id}`,
        name: labelName,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
        pctText: formatPct(count, total),
        color: CHART_COLORS[idx % CHART_COLORS.length]
      });
    });

    const uncatCount = step2Mistakes.filter(m => mistakeMatchesDimValue(m, distDimension, UNCATEGORIZED_ID)).length;
    if (uncatCount > 0 || rows.length === 0) {
      rows.push({
        id: UNCATEGORIZED_ID,
        key: `dist:${distDimension}:${UNCATEGORIZED_ID}`,
        name: distDimension === 'familiarity' ? '尚未設定熟悉度' : '未分類',
        count: uncatCount,
        pct: total > 0 ? (uncatCount / total) * 100 : 0,
        pctText: formatPct(uncatCount, total),
        color: '#64748B'
      });
    }
    return rows;
  }, [distDimension, step2Mistakes, visibleChapters, visibleUnits, visibleErrorReasons, categories.familiarities, allAvailableTags, mistakeMatchesDimValue]);

  // Visual Heatmap Data + Top 3 Weakness Hotspots
  const heatmapData = useMemo(() => {
    const rowDim: CategoryDimension | 'tag' =
      heatmapPair === 'unit_reason'
        ? 'unit'
        : heatmapPair === 'fam_reason'
        ? 'familiarity'
        : heatmapPair === 'tag_fam'
        ? 'tag'
        : 'chapter';
    const colDim: CategoryDimension =
      heatmapPair === 'chapter_fam' || heatmapPair === 'tag_fam' ? 'familiarity' : 'error_reason';

    const rowItems =
      rowDim === 'tag'
        ? [
            ...allAvailableTags.map(t => ({ id: t, name: `#${t}` })),
            { id: UNCATEGORIZED_ID, name: '未標記標籤' }
          ]
        : [
            ...(rowDim === 'chapter'
              ? visibleChapters
              : rowDim === 'unit'
              ? visibleUnits
              : categories.familiarities
            ).map(i => ({ id: i.id, name: i.name })),
            { id: UNCATEGORIZED_ID, name: rowDim === 'familiarity' ? '未設定' : '未分類' }
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

    step2Mistakes.forEach(m => {
      const matchedRows = rowItems.filter(r => mistakeMatchesDimValue(m, rowDim, r.id));
      const matchedCols = colItems.filter(c => mistakeMatchesDimValue(m, colDim, c.id));
      matchedRows.forEach(r => {
        rowTotals[r.id] = (rowTotals[r.id] || 0) + 1;
        matchedCols.forEach(c => {
          matrix[r.id][c.id] = (matrix[r.id][c.id] || 0) + 1;
          if (matrix[r.id][c.id] > maxCellCount) maxCellCount = matrix[r.id][c.id];
        });
      });
    });

    // Only keep rows that have at least 1 mistake OR are non-uncategorized
    const visibleRowItems = rowItems.filter(r => r.id !== UNCATEGORIZED_ID || rowTotals[r.id] > 0);
    const visibleColItems = colItems.filter(
      c => c.id !== UNCATEGORIZED_ID || visibleRowItems.some(r => (matrix[r.id]?.[c.id] || 0) > 0)
    );

    // Compute Top 3 hotspots
    const hotspots: Array<{
      key: string;
      rowName: string;
      colName: string;
      count: number;
      pctText: string;
    }> = [];
    visibleRowItems.forEach(r => {
      visibleColItems.forEach(c => {
        const count = matrix[r.id]?.[c.id] || 0;
        if (count > 0) {
          hotspots.push({
            key: `heat:${rowDim}:${r.id}|${colDim}:${c.id}`,
            rowName: r.name,
            colName: c.name,
            count,
            pctText: formatPct(count, step2Mistakes.length)
          });
        }
      });
    });
    hotspots.sort((a, b) => b.count - a.count);

    return {
      rowDim,
      colDim,
      rowItems: visibleRowItems,
      colItems: visibleColItems,
      matrix,
      rowTotals,
      maxCellCount,
      topHotspots: hotspots.slice(0, 3)
    };
  }, [heatmapPair, step2Mistakes, visibleChapters, visibleUnits, visibleErrorReasons, categories.familiarities, allAvailableTags, mistakeMatchesDimValue]);

  const toggleChartSelectionKey = (key: string) => {
    setManualUncheckedIds([]);
    setChartSelectedKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  // STEP 3 Pool: mistakes matched by Step 2 AND (if user clicked any chart/heatmap items, union of those multi-selected buckets!)
  const chartFilteredMistakes = useMemo(() => {
    if (chartSelectedKeys.length === 0) return step2Mistakes;
    return step2Mistakes.filter(m => {
      return chartSelectedKeys.some(key => {
        if (key.startsWith('dist:')) {
          const rest = key.slice(5);
          const sep = rest.indexOf(':');
          const dim = rest.slice(0, sep) as CategoryDimension | 'tag';
          const itemId = rest.slice(sep + 1);
          return mistakeMatchesDimValue(m, dim, itemId);
        }
        if (key.startsWith('heat:')) {
          const rest = key.slice(5);
          const [rowPart, colPart] = rest.split('|');
          if (!rowPart || !colPart) return false;
          const rSep = rowPart.indexOf(':');
          const cSep = colPart.indexOf(':');
          const rDim = rowPart.slice(0, rSep) as CategoryDimension | 'tag';
          const rId = rowPart.slice(rSep + 1);
          const cDim = colPart.slice(0, cSep) as CategoryDimension | 'tag';
          const cId = colPart.slice(cSep + 1);
          return mistakeMatchesDimValue(m, rDim, rId) && mistakeMatchesDimValue(m, cDim, cId);
        }
        return false;
      });
    });
  }, [step2Mistakes, chartSelectedKeys, mistakeMatchesDimValue]);

  const finalExportMistakes = useMemo(() => {
    const uncheckedSet = new Set(manualUncheckedIds);
    return chartFilteredMistakes.filter(m => !uncheckedSet.has(m.id));
  }, [chartFilteredMistakes, manualUncheckedIds]);

  const finalExportIds = useMemo(() => finalExportMistakes.map(m => m.id), [finalExportMistakes]);

  const selectedMediaSummary = useMemo(() => {
    let qImgCount = 0;
    let aImgCount = 0;
    finalExportMistakes.forEach(m => {
      const media = extractMistakeMediaAndText(m);
      qImgCount += media.qImages.length;
      aImgCount += media.aImages.length;
    });
    return { qImgCount, aImgCount, totalImages: qImgCount + aImgCount };
  }, [finalExportMistakes]);

  const previewPromptText = useMemo(() => {
    return renderPromptWithMistakes(selectedPromptTemplate.content, finalExportMistakes, categories);
  }, [selectedPromptTemplate.content, finalExportMistakes, categories]);

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

  // FIXED: Package ONLY ONE prompt file (00_AI提詞與錯題清單.txt) + images/ + short README (zero duplicate prompt!)
  const handleDownloadAiPromptZip = async () => {
    if (finalExportMistakes.length === 0) {
      showToast('請先在上方圖表或清單確認至少一道錯題', 'info');
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

      for (let i = 0; i < finalExportMistakes.length; i++) {
        const m = finalExportMistakes[i];
        const qNum = String(i + 1).padStart(2, '0');
        const media = extractMistakeMediaAndText(m);
        const mapping: MistakeZipImageMapping = { questionFiles: [], answerFiles: [] };

        setZipProgress(`正在打包第 ${i + 1} / ${finalExportMistakes.length} 題的圖片素材...`);

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

      setZipProgress('正在寫入單一 AI 提詞檔並壓縮 ZIP...');

      const finalPromptText = renderPromptWithMistakes(
        selectedPromptTemplate.content,
        finalExportMistakes,
        categories,
        zipImageMap
      );

      // Single prompt file ONLY (fixes duplicate .txt + .md issue!)
      zip.file('00_AI提詞與錯題清單.txt', finalPromptText);
      zip.file(
        'README_上傳AI說明.txt',
        [
          '=== POBI STUDIO 外部 AI 提示資料包使用說明 ===',
          `科目：${subjectName}｜提詞範本：${selectedPromptTemplate.name}｜題數：${finalExportMistakes.length} 題｜圖片：${downloadedCount} 張`,
          '',
          '用法：直接將整份 .zip 檔上傳給 ChatGPT / Gemini / Claude，並輸入：',
          '「請閱讀壓縮檔中的 00_AI提詞與錯題清單.txt，並搭配 images 資料夾內的所有題目與解析圖片進行分析。」'
        ].join('\n')
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `PobiNotes_${subjectName}_AI提示資料包_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(
        failedCount > 0
          ? `外部 AI 提示資料包已下載（1 份提詞檔 + ${downloadedCount} 張圖片，${failedCount} 張外部圖片無法讀取）`
          : `外部 AI 提示資料包已下載（1 份提詞檔 + ${downloadedCount} 張圖片，無重複檔案）`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || '打包失敗，請重試', 'error');
    } finally {
      setPackingZip(false);
      setZipProgress('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} data-testid="subject-analytics-workshop">
      {/* =================================================================
          STEP 1: 詢問分析依據模式（章節與單元 / 熟悉度與錯因 / 自訂標籤）
         ================================================================= */}
      <section className="glass no-print" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="pobi-step-pill">步驟 1</span>
            <h3 style={{ margin: 0, fontSize: '1.06rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              您想以哪種方式分析《{subjectName}》的錯題？
            </h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            本科共 {subjectMistakes.length} 題
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {[
            {
              id: 'hierarchy' as AnalysisMode,
              title: '1. 章節與單元模式',
              desc: '依章節與細部小單元勾選範圍，檢視各單元弱點分布',
              icon: FolderTree
            },
            {
              id: 'diagnosis' as AnalysisMode,
              title: '2. 熟悉度與錯因模式',
              desc: '依熟悉度（順／卡／不會／誤解）與失分錯因精準篩選',
              icon: Activity
            },
            {
              id: 'tags' as AnalysisMode,
              title: '3. 自訂標籤模式',
              desc: '依您自訂的考點或考卷標籤（如 #段考、#必考）彙整',
              icon: Tag
            }
          ].map(card => {
            const Icon = card.icon;
            const active = analysisMode === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleChangeAnalysisMode(card.id)}
                data-testid={`workshop-mode-${card.id}`}
                className={`pobi-mode-card ${active ? 'is-selected' : ''}`}
                style={{
                  padding: '13px 15px',
                  borderRadius: '11px',
                  border: active ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                  backgroundColor: active ? 'var(--warning-bg)' : 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '11px'
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    backgroundColor: active ? 'var(--accent-secondary)' : 'var(--glass-highlight)',
                    color: active ? '#FFFFFF' : 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{card.title}</div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.45 }}>
                    {card.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =================================================================
          STEP 2: 勾選範圍（可多選）並查看統計圖表（可多選圖表項目）
         ================================================================= */}
      <section className="glass pobi-academic-grid no-print" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '2px solid rgba(200, 154, 80, 0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="pobi-step-pill">步驟 2</span>
            <h3 style={{ margin: 0, fontSize: '1.06rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              勾選分析範圍（可多選），並檢視統計圖表
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '180px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '30px', height: '34px', fontSize: '0.82rem' }}
                placeholder="關鍵字過濾..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
              />
            </div>
            <span className="pobi-tag-chip" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
              範圍共 {step2Mistakes.length} 題
            </span>
          </div>
        </div>

        {/* Dynamic Multi-Select Scope Pills based on Step 1 Mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 14px', borderRadius: '10px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--glass-border)' }}>
          {analysisMode === 'hierarchy' && (
            <>
              <MultiSelectPillRow
                label="章節（多選）"
                items={visibleChapters.map(c => ({ id: c.id, name: c.name }))}
                selectedIds={selectedChapterIds}
                uncategorizedLabel="未分類章節"
                onToggle={id => toggleItem(selectedChapterIds, setSelectedChapterIds, id)}
                onClear={() => {
                  setSelectedChapterIds([]);
                  setSelectedUnitIds([]);
                  setChartSelectedKeys([]);
                }}
              />
              {visibleUnits.length > 0 && (
                <MultiSelectPillRow
                  label="小單元（多選）"
                  items={visibleUnits.map(u => {
                    const ch = visibleChapters.find(c => c.id === u.parent_id);
                    return { id: u.id, name: ch ? `${ch.name} / ${u.name}` : u.name };
                  })}
                  selectedIds={selectedUnitIds}
                  uncategorizedLabel="未指定小單元"
                  onToggle={id => toggleItem(selectedUnitIds, setSelectedUnitIds, id)}
                  onClear={() => {
                    setSelectedUnitIds([]);
                    setChartSelectedKeys([]);
                  }}
                />
              )}
            </>
          )}

          {analysisMode === 'diagnosis' && (
            <>
              <MultiSelectPillRow
                label="熟悉度（多選）"
                items={categories.familiarities.map(f => ({ id: f.id, name: f.name }))}
                selectedIds={selectedFamiliarityIds}
                uncategorizedLabel="尚未設定熟悉度"
                onToggle={id => toggleItem(selectedFamiliarityIds, setSelectedFamiliarityIds, id)}
                onClear={() => {
                  setSelectedFamiliarityIds([]);
                  setChartSelectedKeys([]);
                }}
              />
              <MultiSelectPillRow
                label="錯因（多選）"
                items={visibleErrorReasons.map(r => ({ id: r.id, name: r.name }))}
                selectedIds={selectedErrorReasonIds}
                uncategorizedLabel="未標記錯因"
                onToggle={id => toggleItem(selectedErrorReasonIds, setSelectedErrorReasonIds, id)}
                onClear={() => {
                  setSelectedErrorReasonIds([]);
                  setChartSelectedKeys([]);
                }}
              />
            </>
          )}

          {analysisMode === 'tags' && (
            <MultiSelectPillRow
              label="自訂標籤（多選）"
              items={allAvailableTags.map(t => ({ id: t, name: `#${t}` }))}
              selectedIds={selectedTags}
              uncategorizedLabel="未標記標籤"
              onToggle={id => toggleItem(selectedTags, setSelectedTags, id)}
              onClear={() => {
                setSelectedTags([]);
                setChartSelectedKeys([]);
              }}
            />
          )}
        </div>

        {/* Chart Multi-Selection Status Bar */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--warning-border)',
            backgroundColor: 'var(--warning-bg)',
            color: 'var(--warning-text)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.83rem'
          }}
        >
          <div>
            <strong>互動多選提示：</strong>
            點擊下方「分類占比項目」或「熱度表方格」可<strong>複選多個弱點範圍</strong>送往步驟 3 匯出（目前：
            {chartSelectedKeys.length > 0
              ? `已於圖表勾選 ${chartSelectedKeys.length} 個項目 -> 共 ${chartFilteredMistakes.length} 題`
              : `尚未限定子項，預設帶入步驟 2 全部 ${step2Mistakes.length} 題`}
            ）。
          </div>
          {chartSelectedKeys.length > 0 && (
            <button
              type="button"
              onClick={() => setChartSelectedKeys([])}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              data-testid="workshop-clear-chart-selection-btn"
            >
              <RotateCcw size={13} /> 清除圖表多選
            </button>
          )}
        </div>

        {/* Chart A: Distribution Chart (Multi-selectable Bars / Donut) */}
        <div style={{ padding: '16px 18px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <BarChart3 size={17} style={{ color: 'var(--accent-secondary)' }} />
              <span>分類占比圖表（點擊項目可多選）</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {([
                { key: 'chapter', label: '章節' },
                { key: 'unit', label: '單元' },
                { key: 'familiarity', label: '熟悉度' },
                { key: 'error_reason', label: '錯因' },
                { key: 'tag', label: '自訂標籤' }
              ] as Array<{ key: CategoryDimension | 'tag'; label: string }>).map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDistDimension(d.key)}
                  className={`btn ${distDimension === d.key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  {d.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setChartType(chartType === 'bar' ? 'pie' : 'bar')}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                {chartType === 'bar' ? <PieChart size={14} /> : <BarChart3 size={14} />}
                <span>{chartType === 'bar' ? '切換圓餅圖' : '切換長條圖'}</span>
              </button>
            </div>
          </div>

          {step2Mistakes.length === 0 ? (
            <div style={{ padding: '26px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              <AlertCircle size={22} style={{ margin: '0 auto 6px auto', display: 'block' }} />
              此範圍目前尚無錯題資料
            </div>
          ) : chartType === 'bar' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {distributionData.map(row => {
                const isPicked = chartSelectedKeys.includes(row.key);
                return (
                  <div
                    key={row.key}
                    onClick={() => toggleChartSelectionKey(row.key)}
                    data-testid={`chart-dist-item-${row.id}`}
                    style={{
                      padding: '10px 13px',
                      borderRadius: '9px',
                      border: isPicked ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                      backgroundColor: isPicked ? 'var(--warning-bg)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                        {isPicked ? (
                          <CheckSquare size={15} style={{ color: 'var(--accent-secondary)' }} />
                        ) : (
                          <Square size={15} style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: row.color }} />
                        <span>{row.name}</span>
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{row.count} 題</strong>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({row.pctText})</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '7px', backgroundColor: 'rgba(148, 163, 184, 0.22)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, row.pct))}%`, height: '100%', backgroundColor: row.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
              <WorkshopDonutChart
                rows={distributionData}
                totalLabel={`${step2Mistakes.length} 題`}
                selectedKeys={chartSelectedKeys}
                onSelectKey={toggleChartSelectionKey}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', minWidth: '240px', flex: 1 }}>
                {distributionData.map(row => {
                  const isPicked = chartSelectedKeys.includes(row.key);
                  return (
                    <div
                      key={row.key}
                      onClick={() => toggleChartSelectionKey(row.key)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isPicked ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                        backgroundColor: isPicked ? 'var(--warning-bg)' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        {isPicked ? <CheckSquare size={14} style={{ color: 'var(--accent-secondary)' }} /> : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: row.color }} />
                        <span>{row.name}</span>
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{row.count} 題</strong> ({row.pctText})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart B: Visually Friendly Weakness Heatmap (Requirement 5) */}
        <div
          data-testid="workshop-visual-heatmap"
          style={{
            padding: '18px 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Flame size={18} style={{ color: '#EA580C' }} />
                <span>視覺化弱點熱度圖（點擊色塊可複選多組弱點）</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                色塊越暖越深代表失分集中度越高，可直接點選多個熱度格加入匯出範圍
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {([
                { key: 'chapter_fam', label: '章節 × 熟悉度' },
                { key: 'chapter_reason', label: '章節 × 錯因' },
                { key: 'unit_reason', label: '單元 × 錯因' },
                { key: 'fam_reason', label: '熟悉度 × 錯因' },
                { key: 'tag_fam', label: '標籤 × 熟悉度' }
              ] as Array<{ key: HeatmapPair; label: string }>).map(pair => (
                <button
                  key={pair.key}
                  type="button"
                  onClick={() => setHeatmapPair(pair.key)}
                  className={`btn ${heatmapPair === pair.key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                >
                  {pair.label}
                </button>
              ))}
              <select
                className="input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.76rem', height: '30px' }}
                value={crossDenomMode}
                onChange={e => setCrossDenomMode(e.target.value as 'total' | 'row')}
              >
                <option value="total">比例分母：總題數</option>
                <option value="row">比例分母：該列小計</option>
              </select>
            </div>
          </div>

          {/* Top 3 Hotspots Summary Cards */}
          {heatmapData.topHotspots.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {heatmapData.topHotspots.map((spot, idx) => {
                const isPicked = chartSelectedKeys.includes(spot.key);
                return (
                  <button
                    key={spot.key}
                    type="button"
                    onClick={() => toggleChartSelectionKey(spot.key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isPicked ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                      backgroundColor: isPicked ? 'var(--warning-bg)' : 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EA580C' }}>
                        最需優先補強 #{idx + 1}
                      </div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {spot.rowName} × {spot.colName}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{spot.count} 題</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{spot.pctText}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Visual Heat Scale Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700 }}>熱度色階：</span>
            {[
              { cls: 'pobi-heat-cell-0', text: '0 題' },
              { cls: 'pobi-heat-cell-1', text: '輕微' },
              { cls: 'pobi-heat-cell-2', text: '中等' },
              { cls: 'pobi-heat-cell-3', text: '偏高' },
              { cls: 'pobi-heat-cell-4', text: '高熱度弱點' }
            ].map(lg => (
              <span key={lg.cls} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className={lg.cls} style={{ width: '16px', height: '16px', borderRadius: '4px', display: 'inline-block', border: '1px solid var(--glass-border)' }} />
                <span>{lg.text}</span>
              </span>
            ))}
          </div>

          {/* Rounded Tile Heatmap Matrix */}
          {heatmapData.rowItems.length === 0 || heatmapData.colItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              尚無足夠資料可繪製弱點熱度圖
            </div>
          ) : (
            <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `minmax(130px, 180px) repeat(${heatmapData.colItems.length}, minmax(88px, 1fr)) 74px`,
                  gap: '8px',
                  alignItems: 'stretch',
                  minWidth: `${Math.max(520, 220 + heatmapData.colItems.length * 96)}px`
                }}
              >
                {/* Column Headers */}
                <div style={{ padding: '6px 8px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                  項目 \ 維度
                </div>
                {heatmapData.colItems.map(col => (
                  <div key={col.id} style={{ padding: '6px 4px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    {col.name}
                  </div>
                ))}
                <div style={{ padding: '6px 4px', textAlign: 'center', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  小計
                </div>

                {/* Rows */}
                {heatmapData.rowItems.map(row => {
                  const rowSum = heatmapData.rowTotals[row.id] || 0;
                  return (
                    <div key={row.id} style={{ display: 'contents' }}>
                      <div
                        style={{
                          padding: '10px 10px',
                          borderRadius: '9px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--glass-border)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          wordBreak: 'break-word'
                        }}
                      >
                        {row.name}
                      </div>

                      {heatmapData.colItems.map(col => {
                        const val = heatmapData.matrix[row.id]?.[col.id] || 0;
                        const denom = crossDenomMode === 'total' ? step2Mistakes.length : rowSum;
                        const heat = getHeatLevel(val, heatmapData.maxCellCount);
                        const cellKey = `heat:${heatmapData.rowDim}:${row.id}|${heatmapData.colDim}:${col.id}`;
                        const isPicked = chartSelectedKeys.includes(cellKey);
                        const pctVal = denom > 0 ? Math.min(100, Math.round((val / denom) * 100)) : 0;

                        return (
                          <button
                            key={cellKey}
                            type="button"
                            disabled={val === 0}
                            onClick={() => toggleChartSelectionKey(cellKey)}
                            data-testid={`heatmap-cell-${row.id}-${col.id}`}
                            className={`pobi-heat-tile ${heat.className} ${isPicked ? 'is-selected' : ''}`}
                            style={{
                              position: 'relative',
                              padding: '10px 6px',
                              borderRadius: '10px',
                              border: isPicked ? '2.5px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                              cursor: val > 0 ? 'pointer' : 'default',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              transition: 'transform 0.14s ease, box-shadow 0.14s ease',
                              fontVariantNumeric: 'tabular-nums'
                            }}
                            title={val > 0 ? `點擊切換選取「${row.name} × ${col.name}」(${val} 題)` : `${row.name} × ${col.name}：0 題`}
                          >
                            {isPicked && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--accent-secondary)',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Check size={10} strokeWidth={3} />
                              </span>
                            )}
                            <span style={{ fontSize: val > 0 ? '1.05rem' : '0.84rem', fontWeight: val > 0 ? 800 : 500, opacity: val > 0 ? 1 : 0.45 }}>
                              {val}
                            </span>
                            <span style={{ fontSize: '0.7rem', opacity: val > 0 ? 0.88 : 0.4 }}>
                              {val > 0 ? `${pctVal}%` : '-'}
                            </span>
                          </button>
                        );
                      })}

                      <div
                        style={{
                          padding: '8px 4px',
                          borderRadius: '9px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--glass-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {rowSum} 題
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =================================================================
          STEP 3: 根據圖表勾選範圍，確認題目（含圖片縮圖）並決定匯出 AI 資料包或考卷
         ================================================================= */}
      <section className="glass" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="workshop-step3-section">
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="pobi-step-pill">步驟 3</span>
            <h3 style={{ margin: 0, fontSize: '1.06rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              確認題目清單（已選 {finalExportMistakes.length} / {chartFilteredMistakes.length} 題），並匯出資料包或考卷
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={() => setManualUncheckedIds([])}
            >
              全選 ({chartFilteredMistakes.length})
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={() => setManualUncheckedIds(chartFilteredMistakes.map(m => m.id))}
            >
              取消全選
            </button>
          </div>
        </div>

        {/* Selectable Mistake Cards WITH Visible Question & Answer Image Thumbnails */}
        <div className="no-print">
          {chartFilteredMistakes.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem', border: '1px dashed var(--glass-border)', borderRadius: '10px' }}>
              目前範圍沒有符合的錯題，請於步驟 1 或步驟 2 調整篩選條件。
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {chartFilteredMistakes.map(m => {
                const checked = !manualUncheckedIds.includes(m.id);
                const media = extractMistakeMediaAndText(m);
                const imgTotal = media.qImages.length + media.aImages.length;

                return (
                  <div
                    key={m.id}
                    data-testid={`workshop-mistake-card-${m.id}`}
                    onClick={() =>
                      setManualUncheckedIds(prev =>
                        prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                      )
                    }
                    style={{
                      padding: '12px 13px',
                      borderRadius: '10px',
                      border: checked ? '1.5px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                      backgroundColor: checked ? 'var(--warning-bg)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', minWidth: 0 }}>
                        {checked ? (
                          <CheckSquare size={16} style={{ color: 'var(--accent-secondary)', flexShrink: 0, marginTop: '2px' }} />
                        ) : (
                          <Square size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                          {m.title}
                        </span>
                      </div>
                      <div style={{ display: 'inline-flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {onEditMistake && (
                          <button
                            type="button"
                            onClick={() => onEditMistake(m)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                            title="編輯錯題"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {onDeleteMistake && (
                          <button
                            type="button"
                            onClick={() => onDeleteMistake(m)}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }}
                            title="刪除錯題"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingLeft: '23px' }}>
                      {m.chapter_name && (
                        <span className="pobi-tag-chip">{m.chapter_name}{m.unit_name ? ` / ${m.unit_name}` : ''}</span>
                      )}
                      {m.familiarity_name && (
                        <span className="pobi-tag-chip">熟悉度：{m.familiarity_name}</span>
                      )}
                      {imgTotal > 0 && (
                        <span className="pobi-tag-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <ImageIcon size={11} /> {imgTotal} 張圖
                        </span>
                      )}
                    </div>

                    {media.qDesc && (
                      <div
                        style={{
                          paddingLeft: '23px',
                          fontSize: '0.79rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {media.qDesc}
                      </div>
                    )}

                    {imgTotal > 0 && (
                      <div
                        style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingLeft: '23px', paddingTop: '2px' }}
                        onClick={e => e.stopPropagation()}
                        data-testid={`workshop-mistake-images-${m.id}`}
                      >
                        {media.qImages.map((src, idx) => (
                          <div
                            key={`q-${idx}`}
                            onClick={() => onImageClick?.(src)}
                            title="點擊放大檢視題目圖片"
                            style={{
                              position: 'relative',
                              width: '84px',
                              height: '64px',
                              borderRadius: '7px',
                              overflow: 'hidden',
                              border: '1.5px solid #D97706',
                              backgroundColor: 'var(--bg-secondary)',
                              cursor: onImageClick ? 'zoom-in' : 'default',
                              flexShrink: 0
                            }}
                          >
                            <img src={src} alt={`題目圖 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <span style={{ position: 'absolute', left: '3px', bottom: '3px', fontSize: '0.64rem', fontWeight: 700, padding: '0 4px', borderRadius: '3px', backgroundColor: 'rgba(15, 23, 42, 0.82)', color: '#FFFFFF' }}>
                              題{media.qImages.length > 1 ? idx + 1 : ''}
                            </span>
                          </div>
                        ))}
                        {media.aImages.map((src, idx) => (
                          <div
                            key={`a-${idx}`}
                            onClick={() => onImageClick?.(src)}
                            title="點擊放大檢視解析圖片"
                            style={{
                              position: 'relative',
                              width: '84px',
                              height: '64px',
                              borderRadius: '7px',
                              overflow: 'hidden',
                              border: '1.5px solid #10B981',
                              backgroundColor: 'var(--bg-secondary)',
                              cursor: onImageClick ? 'zoom-in' : 'default',
                              flexShrink: 0
                            }}
                          >
                            <img src={src} alt={`解析圖 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <span style={{ position: 'absolute', left: '3px', bottom: '3px', fontSize: '0.64rem', fontWeight: 700, padding: '0 4px', borderRadius: '3px', backgroundColor: 'rgba(4, 120, 87, 0.88)', color: '#FFFFFF' }}>
                              解{media.aImages.length > 1 ? idx + 1 : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3 Export Choice Buttons */}
        <div
          className="no-print"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--glass-border)'
          }}
        >
          <button
            type="button"
            onClick={() => setExportChoice('ai_zip')}
            data-testid="workshop-submode-ai-zip"
            style={{
              padding: '13px 16px',
              borderRadius: '11px',
              border: exportChoice === 'ai_zip' ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
              backgroundColor: exportChoice === 'ai_zip' ? 'var(--warning-bg)' : 'var(--bg-primary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={19} style={{ color: 'var(--accent-secondary)' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>匯出外部 AI 提示資料包 (.zip)</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>單一提詞檔 + 所有題目／解析圖片打包</div>
              </div>
            </div>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => setExportChoice('exam_paper')}
            data-testid="workshop-submode-exam-paper"
            style={{
              padding: '13px 16px',
              borderRadius: '11px',
              border: exportChoice === 'exam_paper' ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
              backgroundColor: exportChoice === 'exam_paper' ? 'var(--warning-bg)' : 'var(--bg-primary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Printer size={19} style={{ color: 'var(--accent-secondary)' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>匯出考卷（A4 防跨頁切割）</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>練習卷／解析卷 PDF 與行動系統列印</div>
              </div>
            </div>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Export Option 1: External AI Prompt ZIP */}
        {exportChoice === 'ai_zip' && (
          <div className="no-print" style={{ padding: '16px 18px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '14px' }} data-testid="workshop-ai-zip-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Package size={17} style={{ color: 'var(--accent-secondary)' }} />
                  <span>外部 AI 提示資料包設定（共 {finalExportMistakes.length} 題 · {selectedMediaSummary.totalImages} 張圖）</span>
                </div>
                <div style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  內含 1 份完整提詞檔（<code>00_AI提詞與錯題清單.txt</code>，絕不重複包裝）與 <code>images/</code> 圖片資料夾。
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCopyPromptText}
                  disabled={finalExportMistakes.length === 0}
                  className="btn btn-secondary"
                  style={{ padding: '7px 13px', fontSize: '0.82rem' }}
                >
                  {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedPrompt ? '已複製文字' : '僅複製文字提詞'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadAiPromptZip}
                  disabled={packingZip || finalExportMistakes.length === 0}
                  data-testid="download-ai-prompt-zip-btn"
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.86rem', fontWeight: 700 }}
                >
                  {packingZip ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
                  <span>{packingZip ? zipProgress || '打包中...' : '打包下載外部 AI 提示資料包 (.zip)'}</span>
                </button>
              </div>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: '9px', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning-text)', fontSize: '0.8rem', lineHeight: 1.55, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <HelpCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                下載後免解壓縮，直接將整個 <code>.zip</code> 上傳到 ChatGPT／Gemini／Claude 並請 AI 閱讀裡面的 <code>00_AI提詞與錯題清單.txt</code> 與 <code>images/</code> 圖片即可！
              </span>
            </div>

            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                選擇提詞範本（可至左側「AI 提詞管理」新增或客製化）：
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
                {allPromptTemplates.map(tpl => {
                  const active = tpl.id === selectedPromptTemplate.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setActivePromptTemplateId(tpl.id)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '9px',
                        border: active ? '2px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                        backgroundColor: active ? 'var(--warning-bg)' : 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                        <span>{tpl.name}</span>
                        {tpl.isRecommended && <span className="badge-recommended-tag">推薦</span>}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{tpl.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Export Option 2: Exam Paper */}
        {exportChoice === 'exam_paper' && (
          <div data-testid="workshop-exam-paper-panel">
            <ExportPDF
              embedded
              mistakeIds={finalExportIds}
              initialMistakes={finalExportMistakes}
              defaultSubjectName={subjectName}
              onImageClick={onImageClick}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function MultiSelectPillRow({
  label,
  items,
  selectedIds,
  uncategorizedLabel,
  onToggle,
  onClear
}: {
  label: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  uncategorizedLabel: string;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '7px' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '88px', fontWeight: 700 }}>
        {label}：
      </span>
      <button
        type="button"
        onClick={onClear}
        className={`pobi-filter-pill ${selectedIds.length === 0 ? 'is-active' : ''}`}
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
            className={`pobi-filter-pill ${active ? 'is-active' : ''}`}
          >
            {item.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onToggle(UNCATEGORIZED_ID)}
        className={`pobi-filter-pill ${selectedIds.includes(UNCATEGORIZED_ID) ? 'is-active' : ''}`}
      >
        {uncategorizedLabel}
      </button>
    </div>
  );
}

function WorkshopDonutChart({
  rows,
  totalLabel,
  selectedKeys,
  onSelectKey
}: {
  rows: Array<{ key: string; name: string; count: number; color: string }>;
  totalLabel: string;
  selectedKeys: string[];
  onSelectKey: (key: string) => void;
}) {
  const sumCounts = rows.reduce((acc, r) => acc + r.count, 0);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <svg width="190" height="190" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r={radius} fill="transparent" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="26" />
      {sumCounts > 0 &&
        rows.map(row => {
          if (row.count <= 0) return null;
          const fraction = row.count / sumCounts;
          const dash = fraction * circumference;
          const offset = -accumulated * circumference;
          accumulated += fraction;
          const active = selectedKeys.includes(row.key);
          return (
            <circle
              key={row.key}
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke={row.color}
              strokeWidth={active ? '32' : '26'}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              transform="rotate(-90 100 100)"
              style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
              onClick={() => onSelectKey(row.key)}
            >
              <title>{`${row.name}: ${row.count} 題（點擊多選）`}</title>
            </circle>
          );
        })}
      <text x="100" y="96" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">
        範圍總計
      </text>
      <text x="100" y="118" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="bold">
        {totalLabel}
      </text>
    </svg>
  );
}
