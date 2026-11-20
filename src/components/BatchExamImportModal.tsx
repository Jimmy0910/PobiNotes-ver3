import { useState, useMemo, useRef, useEffect } from 'react';
import type { CategoriesBundle, MistakeRecord } from '../types';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';
import { compressImage } from '../utils/compress';
import { packageImagesToZip, triggerFileDownload } from '../utils/zipPacker';
import {
  Sparkles,
  Copy,
  Check,
  Upload,
  ArrowRight,
  ArrowLeft,
  X,
  HelpCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  Maximize2,
  RotateCcw,
  Zap,
  FolderPlus,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  RefreshCw,
  Archive,
  Download
} from 'lucide-react';

interface BatchExamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoriesBundle;
  onRefreshCategories: () => Promise<void>;
  onBatchImportComplete: (importedMistakes: MistakeRecord[]) => void;
  onOpenZoomedImage?: (url: string) => void;
  initialStage?: 'prompt' | 'import' | 'review';
  unreviewedMistakes?: MistakeRecord[];
}

interface UploadedImageItem {
  id: string;
  name: string;
  key: string; // Persistent storage key or data URL
  url: string; // Displayable URL
}

interface ParsedExamQuestion {
  id: string;
  index: number;
  title: string;
  subject_name: string;
  chapter_name: string;
  unit_name?: string;
  question_text?: string;
  question_image_index: number; // 1-based index into questionImages (0 = none)
  answer_image_indices: number[]; // 1-based indices into answerImages (supports multiple images per answer)
  key_concept?: string;
  is_new_subject?: boolean;
  is_new_chapter?: boolean;
}

interface ReviewItem {
  id: string;
  title: string;
  subject_id: string | null;
  subject_name: string;
  chapter_id: string | null;
  chapter_name: string;
  question_text?: string;
  question_image_key: string;
  question_image_url: string;
  answer_image_keys: string[];
  answer_image_urls: string[];
  familiarity_id: string | null;
  error_reason_ids: string[];
  is_new_chapter?: boolean;
  key_concept?: string;
}

function resolveDisplayUrl(key?: string): string {
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Sample SVG placeholder data for zero-friction 1-click test
const SAMPLE_QUESTION_IMG_1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%23FAF7F0"/><rect x="20" y="20" width="560" height="300" fill="%23FFFFFF" stroke="%23D4C9BA" stroke-width="2" rx="8"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%238B5A2B">第 1 題 [單選題]</text><text x="40" y="96" font-family="sans-serif" font-size="15" fill="%231E293B">設 f(x) 為三次實係數多項式，已知 f(1)=2, f(2)=5, f(3)=10，</text><text x="40" y="126" font-family="sans-serif" font-size="15" fill="%231E293B">且 f(x) 除以 (x-4) 之餘式為 23。試求 f(0) 之值為何？</text><text x="40" y="170" font-family="sans-serif" font-size="14" fill="%23526178">(A) -1   (B) 1   (C) 3   (D) 5   (E) 7</text><line x1="40" y1="210" x2="560" y2="210" stroke="%23E2D9CC" stroke-dasharray="4"/><text x="40" y="245" font-family="sans-serif" font-size="13" fill="%23B91C1C">作答紀錄：學生選 (A) [錯誤]</text></svg>`;

const SAMPLE_ANSWER_IMG_1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%23FAF7F0"/><rect x="20" y="20" width="560" height="300" fill="%23FFFFFF" stroke="%234D7C0F" stroke-width="2" rx="8"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%234D7C0F">第 1 題 詳解與評析 (步驟一)</text><text x="40" y="96" font-family="sans-serif" font-size="15" fill="%231E293B">正確答案：(B) 1</text><text x="40" y="130" font-family="sans-serif" font-size="14" fill="%231E293B">核心考點：牛頓插值法或差分設式。</text><text x="40" y="160" font-family="sans-serif" font-size="14" fill="%23526178">設 g(x) = f(x) - (x^2 + 1)，則 g(1)=g(2)=g(3)=0。</text><text x="40" y="190" font-family="sans-serif" font-size="14" fill="%23526178">得 g(x) = k(x-1)(x-2)(x-3)，代入 x=4 得 k=1，</text><text x="40" y="220" font-family="sans-serif" font-size="14" fill="%234D7C0F">故 f(0) = 1*(-1)*(-2)*(-3) + 1 = -5 ... [見下頁補充]</text></svg>`;

const SAMPLE_QUESTION_IMG_2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%23FAF7F0"/><rect x="20" y="20" width="560" height="300" fill="%23FFFFFF" stroke="%23D4C9BA" stroke-width="2" rx="8"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%238B5A2B">第 2 題 [多選題]</text><text x="40" y="96" font-family="sans-serif" font-size="15" fill="%231E293B">一質量為 m 之質點在光滑水平面上作簡諧運動，其週期為 T。</text><text x="40" y="126" font-family="sans-serif" font-size="15" fill="%231E293B">若將振幅加倍，則下列敘述何者正確？</text><text x="40" y="170" font-family="sans-serif" font-size="14" fill="%23526178">(A) 週期變為 2T   (B) 最大速率加倍   (C) 最大加速度加倍</text><text x="40" y="200" font-family="sans-serif" font-size="14" fill="%23526178">(D) 力學能變為 4 倍   (E) 最大動能維持不變</text><line x1="40" y1="230" x2="560" y2="230" stroke="%23E2D9CC" stroke-dasharray="4"/><text x="40" y="260" font-family="sans-serif" font-size="13" fill="%23B91C1C">作答紀錄：學生選 (A)(B) [錯誤：誤以為週期與振幅有關]</text></svg>`;

const SAMPLE_ANSWER_IMG_2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%23FAF7F0"/><rect x="20" y="20" width="560" height="300" fill="%23FFFFFF" stroke="%234D7C0F" stroke-width="2" rx="8"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%234D7C0F">第 2 題 詳解與評析</text><text x="40" y="96" font-family="sans-serif" font-size="15" fill="%231E293B">正確答案：(B)(C)(D)</text><text x="40" y="130" font-family="sans-serif" font-size="14" fill="%231E293B">核心考點：簡諧運動公式與等時性。</text><text x="40" y="160" font-family="sans-serif" font-size="14" fill="%23526178">1. 簡諧運動週期 T = 2π√(m/k) 具等時性，與振幅無關 (A 錯)。</text><text x="40" y="190" font-family="sans-serif" font-size="14" fill="%23526178">2. Vmax = ωR，振幅加倍則最大速率加倍 (B 對)。</text><text x="40" y="220" font-family="sans-serif" font-size="14" fill="%234D7C0F">3. E = 1/2 k R^2，振幅變為 2 倍則總能量變為 4 倍 (D 對)。</text></svg>`;

const SAMPLE_QUESTION_IMG_3 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%23FAF7F0"/><rect x="20" y="20" width="560" height="300" fill="%23FFFFFF" stroke="%23D4C9BA" stroke-width="2" rx="8"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%238B5A2B">第 3 題 [實驗題]</text><text x="40" y="96" font-family="sans-serif" font-size="15" fill="%231E293B">進行酸鹼中和滴定實驗時，以 0.1M 氫氧化鈉標準液滴定未知濃度醋酸。</text><text x="40" y="126" font-family="sans-serif" font-size="15" fill="%231E293B">若滴定管未潤洗即裝入 NaOH 溶液，則測定出醋酸濃度將：</text><text x="40" y="170" font-family="sans-serif" font-size="14" fill="%23526178">(A) 偏高   (B) 偏低   (C) 不受影響   (D) 先偏高後偏低</text><line x1="40" y1="210" x2="560" y2="210" stroke="%23E2D9CC" stroke-dasharray="4"/><text x="40" y="245" font-family="sans-serif" font-size="13" fill="%23B91C1C">作答紀錄：學生選 (B) [錯誤：倒反因果]</text></svg>`;

const SAMPLE_ANSWER_IMG_3 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%23FAF7F0"/><rect x="20" y="20" width="560" height="300" fill="%23FFFFFF" stroke="%234D7C0F" stroke-width="2" rx="8"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%234D7C0F">第 3 題 詳解與評析</text><text x="40" y="96" font-family="sans-serif" font-size="15" fill="%231E293B">正確答案：(A) 偏高</text><text x="40" y="130" font-family="sans-serif" font-size="14" fill="%231E293B">核心考點：實驗儀器潤洗對濃度計算之系統誤差。</text><text x="40" y="160" font-family="sans-serif" font-size="14" fill="%23526178">管內殘留水分稀釋 NaOH，使實際濃度下降，消耗體積 V 偏大，</text><text x="40" y="190" font-family="sans-serif" font-size="14" fill="%234D7C0F">依 C1*V1 = C2*V2，計算出的未知酸濃度 C2 偏高。</text></svg>`;

const SAMPLE_AI_JSON = `[
  {
    "index": 1,
    "title": "三次多項式插值與餘式定理",
    "subject_name": "數學",
    "chapter_name": "多項式函數",
    "question_image_index": 1,
    "answer_image_indices": [1],
    "key_concept": "牛頓插值法與多項式餘式條件：設 g(x)=f(x)-(x^2+1)，利用因式定理求餘式。"
  },
  {
    "index": 2,
    "title": "簡諧運動振幅加倍之週期與能量變化",
    "subject_name": "物理",
    "chapter_name": "運動&力",
    "question_image_index": 2,
    "answer_image_indices": [2],
    "key_concept": "簡諧運動週期 T=2π√(m/k) 具等時性與振幅無關；力學能 E=1/2 kR^2 與振幅平方成正比。"
  },
  {
    "index": 3,
    "title": "酸鹼滴定滴定管未潤洗之系統誤差分析",
    "subject_name": "化學",
    "chapter_name": "酸鹼反應與滴定",
    "question_image_index": 3,
    "answer_image_indices": [3],
    "key_concept": "容量分析與實驗儀器潤洗誤差：未潤洗導致滴定液被稀釋，消耗體積偏大，計算濃度偏高。"
  }
]`;

export default function BatchExamImportModal({
  isOpen,
  onClose,
  categories,
  onRefreshCategories,
  onBatchImportComplete,
  onOpenZoomedImage,
  initialStage = 'prompt',
  unreviewedMistakes = []
}: BatchExamImportModalProps) {
  const { showToast } = useUiFeedback();
  const [activeTab, setActiveTab] = useState<'prompt' | 'import' | 'review' | 'completed'>(initialStage);

  // Sync tab with initialStage when modal is reopened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialStage === 'review' ? 'review' : 'prompt');
    }
  }, [isOpen, initialStage]);

  // Auto-clear toggle for Step 1 & Step 2 after completing a batch
  const [autoClearAfterBatch, setAutoClearAfterBatch] = useState<boolean>(true);

  // Step 1: Multi-Select Subject & Chapter Scope State
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedChaptersBySubject, setSelectedChaptersBySubject] = useState<Record<string, string[]>>({});
  const [customScopePool, setCustomScopePool] = useState<Array<{ subjectName: string; chapters: string[] }>>([]);
  const [customSubjInput, setCustomSubjInput] = useState<string>('');
  const [customChapInput, setCustomChapInput] = useState<string>('');
  const [scopeInitialized, setScopeInitialized] = useState<boolean>(false);

  // Step 2 quick batch override fields (synced from Step 1 selection)
  const [targetSubjectName, setTargetSubjectName] = useState<string>(() => categories.subjects[0]?.name || '');
  const [targetChapterName, setTargetChapterName] = useState<string>('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Combined Subject & Chapter Pool (Database Categories + User Custom Scope Additions)
  const combinedScopePool = useMemo(() => {
    const map = new Map<string, string[]>();
    categories.subjects.forEach(s => {
      const chaps = categories.chapters
        .filter(c => c.subject_id === s.id || c.parent_id === s.id)
        .map(c => c.name);
      map.set(s.name, chaps);
    });
    customScopePool.forEach(custom => {
      const existing = map.get(custom.subjectName) || [];
      const merged = Array.from(new Set([...existing, ...custom.chapters]));
      map.set(custom.subjectName, merged);
    });
    return Array.from(map.entries()).map(([subjectName, chapters]) => ({
      subjectName,
      chapters
    }));
  }, [categories.subjects, categories.chapters, customScopePool]);

  // Initialize multi-select scope when categories first load
  useEffect(() => {
    if (!scopeInitialized && combinedScopePool.length > 0) {
      const allSubjs = combinedScopePool.map(item => item.subjectName);
      const chapMap: Record<string, string[]> = {};
      combinedScopePool.forEach(item => {
        chapMap[item.subjectName] = [...item.chapters];
      });
      setSelectedSubjects(allSubjs);
      setSelectedChaptersBySubject(chapMap);
      setScopeInitialized(true);
    }
  }, [combinedScopePool, scopeInitialized]);

  // Keep targetSubjectName / targetChapterName synced with first selected subject/chapter
  useEffect(() => {
    if (selectedSubjects.length > 0) {
      const firstSubj = selectedSubjects[0];
      setTargetSubjectName(firstSubj);
      const chaps = selectedChaptersBySubject[firstSubj] || [];
      if (chaps.length > 0) {
        setTargetChapterName(chaps[0]);
      }
    } else if (!targetSubjectName && categories.subjects.length > 0) {
      setTargetSubjectName(categories.subjects[0].name);
    }
  }, [selectedSubjects, selectedChaptersBySubject, categories.subjects, targetSubjectName]);

  // Multi-select helpers for Step 1
  const handleSelectAllScope = () => {
    const allSubjs = combinedScopePool.map(item => item.subjectName);
    const chapMap: Record<string, string[]> = {};
    combinedScopePool.forEach(item => {
      chapMap[item.subjectName] = [...item.chapters];
    });
    setSelectedSubjects(allSubjs);
    setSelectedChaptersBySubject(chapMap);
  };

  const handleClearStep1Scope = () => {
    setSelectedSubjects([]);
    setSelectedChaptersBySubject({});
    setCustomSubjInput('');
    setCustomChapInput('');
  };

  const handleToggleSubjectScope = (subjName: string) => {
    const poolItem = combinedScopePool.find(x => x.subjectName === subjName);
    const allChaps = poolItem ? poolItem.chapters : [];
    const isCurrentlySelected = selectedSubjects.includes(subjName);
    if (isCurrentlySelected) {
      setSelectedSubjects(prev => prev.filter(s => s !== subjName));
      setSelectedChaptersBySubject(prev => {
        const copy = { ...prev };
        delete copy[subjName];
        return copy;
      });
    } else {
      setSelectedSubjects(prev => [...prev, subjName]);
      setSelectedChaptersBySubject(prev => ({
        ...prev,
        [subjName]: [...allChaps]
      }));
    }
  };

  const handleToggleChapterScope = (subjName: string, chapName: string) => {
    const currentChaps = selectedChaptersBySubject[subjName] || [];
    const exists = currentChaps.includes(chapName);
    const nextChaps = exists
      ? currentChaps.filter(c => c !== chapName)
      : [...currentChaps, chapName];

    setSelectedChaptersBySubject(prev => ({
      ...prev,
      [subjName]: nextChaps
    }));

    if (!selectedSubjects.includes(subjName) && nextChaps.length > 0) {
      setSelectedSubjects(prev => [...prev, subjName]);
    }
  };

  const handleSelectAllChaptersOfSubject = (subjName: string, selectAll: boolean) => {
    const poolItem = combinedScopePool.find(x => x.subjectName === subjName);
    const allChaps = poolItem ? poolItem.chapters : [];
    if (selectAll) {
      if (!selectedSubjects.includes(subjName)) {
        setSelectedSubjects(prev => [...prev, subjName]);
      }
      setSelectedChaptersBySubject(prev => ({
        ...prev,
        [subjName]: [...allChaps]
      }));
    } else {
      setSelectedChaptersBySubject(prev => ({
        ...prev,
        [subjName]: []
      }));
    }
  };

  const handleAddCustomScopeItem = () => {
    const sName = customSubjInput.trim();
    const cName = customChapInput.trim();
    if (!sName) {
      showToast('請先輸入科目名稱', 'error');
      return;
    }
    setCustomScopePool(prev => {
      const existingIdx = prev.findIndex(x => x.subjectName === sName);
      if (existingIdx >= 0) {
        const copy = [...prev];
        const nextChaps = cName && !copy[existingIdx].chapters.includes(cName)
          ? [...copy[existingIdx].chapters, cName]
          : copy[existingIdx].chapters;
        copy[existingIdx] = { subjectName: sName, chapters: nextChaps };
        return copy;
      }
      return [...prev, { subjectName: sName, chapters: cName ? [cName] : [] }];
    });

    if (!selectedSubjects.includes(sName)) {
      setSelectedSubjects(prev => [...prev, sName]);
    }
    if (cName) {
      setSelectedChaptersBySubject(prev => {
        const cur = prev[sName] || [];
        return {
          ...prev,
          [sName]: cur.includes(cName) ? cur : [...cur, cName]
        };
      });
    }
    setCustomSubjInput('');
    setCustomChapInput('');
  };

  // Step 2: Dropzone & Upload State
  const [questionImages, setQuestionImages] = useState<UploadedImageItem[]>([]);
  const [answerImages, setAnswerImages] = useState<UploadedImageItem[]>([]);
  const [uploadingQ, setUploadingQ] = useState(false);
  const [uploadingA, setUploadingA] = useState(false);
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedExamQuestion[]>([]);

  // Packaging images into ZIP state
  const [packagingZip, setPackagingZip] = useState(false);
  const [zipProgressText, setZipProgressText] = useState('');
  const [zipSuccessMsg, setZipSuccessMsg] = useState('');

  // Handle packaging all current images into a single ZIP archive for external AI
  const handlePackageAndDownloadZip = async () => {
    if (questionImages.length === 0 && answerImages.length === 0) {
      showToast('請先在題目區或解析區上傳圖片，才能進行打包。', 'info');
      return;
    }
    setPackagingZip(true);
    setZipSuccessMsg('');
    try {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `考卷題目與解析圖片包_${todayStr}.zip`;
      const zipBlob = await packageImagesToZip(
        {
          questionImages,
          answerImages,
          promptText: generatedPrompt,
          zipFilename: filename
        },
        (current, total, message) => {
          setZipProgressText(`${message} (${current}/${total})`);
        }
      );
      triggerFileDownload(zipBlob, filename);
      setZipSuccessMsg(`已成功將 ${questionImages.length} 張題目圖與 ${answerImages.length} 張解析圖打包為 ${filename}！`);
      setTimeout(() => setZipSuccessMsg(''), 7000);
    } catch (err: any) {
      showToast('圖片打包失敗：' + (err.message || String(err)), 'error');
    } finally {
      setPackagingZip(false);
      setZipProgressText('');
    }
  };

  // Clear Step 2 helper
  const handleClearStep2Inputs = () => {
    setQuestionImages([]);
    setAnswerImages([]);
    setAiJsonInput('');
    setParsedQuestions([]);
    setParseError('');
  };

  // Clear both Step 1 and Step 2 after completing a batch
  const resetStep1AndStep2AfterBatch = () => {
    handleClearStep1Scope();
    handleClearStep2Inputs();
  };

  // Step 3: Fast Review Wizard State
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isErrorDrawerOpen, setIsErrorDrawerOpen] = useState(false);
  const [selectedErrorReasons, setSelectedErrorReasons] = useState<string[]>([]);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const questionInputRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);

  // Initialize review items from unreviewed mistakes if launching in review stage
  useEffect(() => {
    if (initialStage === 'review' && unreviewedMistakes.length > 0 && reviewItems.length === 0) {
      const items: ReviewItem[] = unreviewedMistakes.map(m => {
        const qKey = (m.data?.questionData?.q_image || m.data?.questionData?.q_img || '') as string;
        const aKeys: string[] = Array.isArray(m.data?.answerData?.a_images) && m.data.answerData.a_images.length > 0
          ? m.data.answerData.a_images
          : [(m.data?.answerData?.a_image || m.data?.answerData?.a_img || '') as string].filter(Boolean);
        return {
          id: m.id,
          title: m.title,
          subject_id: m.subject_id,
          subject_name: m.subject_name || '未分類科目',
          chapter_id: m.chapter_id,
          chapter_name: m.chapter_name || '一般章節',
          question_image_key: qKey,
          question_image_url: resolveDisplayUrl(qKey),
          answer_image_keys: aKeys,
          answer_image_urls: aKeys.map(resolveDisplayUrl),
          familiarity_id: m.familiarity_id,
          error_reason_ids: m.error_reason_ids || [],
          key_concept: (m.data?.answerData?.a_desc || m.data?.answerData?.key_concept || '') as string
        };
      });
      setReviewItems(items);
      setCurrentReviewIndex(0);
      setActiveTab('review');
    }
  }, [initialStage, unreviewedMistakes, reviewItems.length]);

  // Build selected scope description text for prompt injection
  const selectedScopeStructureText = useMemo(() => {
    if (selectedSubjects.length === 0) {
      return '- 尚未勾選特定科目與章節範圍（請由 AI 依題目內容自動判斷合適的學科與章節名稱）';
    }
    const lines: string[] = [];
    selectedSubjects.forEach(subjName => {
      const chaps = selectedChaptersBySubject[subjName] || [];
      if (chaps.length > 0) {
        lines.push(`- 科目【${subjName}】：限定／優先歸入章節 [${chaps.join('、')}]`);
      } else {
        lines.push(`- 科目【${subjName}】（不限章節，請依題目考點歸納章節名稱）`);
      }
    });
    return lines.join('\n');
  }, [selectedSubjects, selectedChaptersBySubject]);

  // Unified Multi-Select Scope Prompt Generator
  const generatedPrompt = useMemo(() => {
    const isSingleSubject = selectedSubjects.length === 1;
    const onlySubj = isSingleSubject ? selectedSubjects[0] : '';
    const onlySubjChaps = isSingleSubject ? (selectedChaptersBySubject[onlySubj] || []) : [];
    const isSingleTargetChapter = isSingleSubject && onlySubjChaps.length === 1;
    const onlyChap = isSingleTargetChapter ? onlySubjChaps[0] : '';

    const exampleSubj = onlySubj || selectedSubjects[0] || '數學';
    const exampleChap = onlyChap || (selectedChaptersBySubject[exampleSubj]?.[0]) || '多項式函數';

    const scopeInstruction = isSingleTargetChapter
      ? `1. 固定單一科目與章節範圍（使用者已指定單一目標）：
   - 請把這些錯題全部放在科目【${onlySubj}】的章節【${onlyChap}】底下！
   - 每一題輸出的 "subject_name" 欄位請固定填寫 "${onlySubj}"，"chapter_name" 欄位請固定填寫 "${onlyChap}"。`
      : `1. 多選科目與章節分類範圍（使用者自訂勾選範圍）：
${selectedScopeStructureText}
   - 請嚴格根據每道題目的考點，優先從上方使用者勾選的【科目】與【章節】範圍內挑選出最契合的 "subject_name" 與 "chapter_name"。
   - 若某題考點不在已勾選章節中，請在已勾選的科目底下給予簡明規範的章節名稱。`;

    return `你是一位專業的升學考試解題分析家。我將上傳一整份考卷或多道錯題的「題目照片」與「解析照片」。
請協助我逐題進行「題目與解析配對」（支援一題對應多張解析圖片）以及「依我選定的科目與章節範圍精準分類」。

${scopeInstruction}

2. 題目與解析圖片配對順序（支援一個解析對應多張圖片）：
   - 使用者上傳的題目照片依序編號為 1, 2, 3...，請填入 "question_image_index"（整數，例如第 1 張題目圖填 1）。
   - 使用者上傳的解析照片依序編號為 1, 2, 3...，請填入 "answer_image_indices"（整數陣列格式，例如對應第 1 張解析圖填 [1]；若該題詳解跨第 1、2 張解析圖，請填 [1, 2]）。

3. 題目核心題旨與解析重點說明：
   - "title"：提取 10 至 20 字以內的簡明核心題旨（例如：「力學能守恆與彈簧張力分析」）。
   - "key_concept"：請根據解析照片或題目內容，整理出正確答案、核心考點與破題關鍵步驟說明（將直接顯示於錯題本的解析文字區）。

4. 輸出格式限制：
   - 嚴格只回傳 JSON 陣列代碼區塊，不要輸出任何額外寒暄或開場白。

回傳 JSON 結構範例如下：
[
  {
    "index": 1,
    "title": "題目核心觀念題旨摘要",
    "subject_name": "${exampleSubj}",
    "chapter_name": "${exampleChap}",
    "question_image_index": 1,
    "answer_image_indices": [1],
    "key_concept": "正確答案與核心破題觀念說明"
  }
]`;
  }, [selectedSubjects, selectedChaptersBySubject, selectedScopeStructureText]);

  // Handle Copy Prompt
  const handleCopyPrompt = async (advanceToStep2 = false) => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // Fallback
    }
    if (advanceToStep2) {
      if (autoClearAfterBatch) {
        handleClearStep1Scope();
      }
      setActiveTab('import');
    }
  };

  // Helper to check if subject/chapter is new
  const computeNewFlags = (sName: string, cName: string) => {
    const existingSubj = categories.subjects.find(
      s => s.name.trim().toLowerCase() === sName.trim().toLowerCase()
    );
    const existingChap = categories.chapters.find(
      c =>
        c.name.trim().toLowerCase() === cName.trim().toLowerCase() &&
        (!existingSubj || c.subject_id === existingSubj.id || c.parent_id === existingSubj.id)
    );
    return {
      is_new_subject: !existingSubj,
      is_new_chapter: !existingChap
    };
  };

  // Handle File additions for Question & Answer zones (compresses and uploads for persistence!)
  const handleAddFiles = async (files: FileList | null, type: 'question' | 'answer') => {
    if (!files || files.length === 0) return;
    if (type === 'question') setUploadingQ(true);
    else setUploadingA(true);

    try {
      const newItems: UploadedImageItem[] = [];
      const fileArray = Array.from(files);
      for (let idx = 0; idx < fileArray.length; idx++) {
        const file = fileArray[idx];
        let persistentKey = '';
        try {
          const compressedBlob = await compressImage(file, 1400, 0.85);
          const res = await apiRequest('/api/images/upload', {
            method: 'POST',
            body: compressedBlob,
            headers: { 'Content-Type': 'image/jpeg' }
          });
          if (res?.key) {
            persistentKey = res.key;
          } else {
            persistentKey = await blobToDataUrl(compressedBlob);
          }
        } catch {
          persistentKey = await blobToDataUrl(file);
        }

        newItems.push({
          id: `${type}_${Date.now()}_${idx}`,
          name: file.name || `${type === 'question' ? '題目圖' : '解析圖'}_${idx + 1}`,
          key: persistentKey,
          url: resolveDisplayUrl(persistentKey)
        });
      }

      if (type === 'question') {
        setQuestionImages(prev => [...prev, ...newItems]);
      } else {
        setAnswerImages(prev => [...prev, ...newItems]);
      }
    } finally {
      if (type === 'question') setUploadingQ(false);
      else setUploadingA(false);
    }
  };

  // 1-Click Load Sample Demo Data
  const handleLoadSampleData = () => {
    setQuestionImages([
      { id: 'q_1', name: '數學考卷_第1題.png', key: SAMPLE_QUESTION_IMG_1, url: SAMPLE_QUESTION_IMG_1 },
      { id: 'q_2', name: '物理考卷_第2題.png', key: SAMPLE_QUESTION_IMG_2, url: SAMPLE_QUESTION_IMG_2 },
      { id: 'q_3', name: '化學考卷_第3題.png', key: SAMPLE_QUESTION_IMG_3, url: SAMPLE_QUESTION_IMG_3 }
    ]);
    setAnswerImages([
      { id: 'a_1', name: '數學詳解_第1題.png', key: SAMPLE_ANSWER_IMG_1, url: SAMPLE_ANSWER_IMG_1 },
      { id: 'a_2', name: '物理詳解_第2題.png', key: SAMPLE_ANSWER_IMG_2, url: SAMPLE_ANSWER_IMG_2 },
      { id: 'a_3', name: '化學詳解_第3題.png', key: SAMPLE_ANSWER_IMG_3, url: SAMPLE_ANSWER_IMG_3 }
    ]);
    setAiJsonInput(SAMPLE_AI_JSON);
    setParseError('');
  };

  // Parse AI JSON whenever aiJsonInput changes
  useEffect(() => {
    if (!aiJsonInput.trim()) {
      setParsedQuestions([]);
      setParseError('');
      return;
    }

    try {
      let cleaned = aiJsonInput.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        setParseError('輸入格式必須為 JSON 陣列 [ { ... } ]');
        return;
      }

      const enriched: ParsedExamQuestion[] = parsed.map((item, i) => {
        const sName = (
          item.subject_name ||
          item.subject ||
          targetSubjectName ||
          selectedSubjects[0] ||
          '未分類科目'
        ).trim();
        const cName = (
          item.chapter_name ||
          item.chapter ||
          targetChapterName ||
          '一般章節'
        ).trim();

        const qIdx =
          typeof item.question_image_index === 'number'
            ? item.question_image_index
            : i + 1;

        let aIndices: number[] = [];
        if (Array.isArray(item.answer_image_indices)) {
          aIndices = item.answer_image_indices
            .map((n: any) => Number(n))
            .filter((n: number) => !isNaN(n) && n > 0);
        } else if (typeof item.answer_image_index === 'number' && item.answer_image_index > 0) {
          aIndices = [item.answer_image_index];
        } else {
          aIndices = [i + 1];
        }

        const flags = computeNewFlags(sName, cName);
        return {
          id: `pq_${Date.now()}_${i}`,
          index: i + 1,
          title: item.title || item.unit || item.unit_name || item.question_title || `考卷第 ${i + 1} 題`,
          subject_name: sName,
          chapter_name: cName,
          unit_name: item.unit_name || item.unit,
          question_text: item.question_text || item.q_desc || item.question_desc || '',
          question_image_index: qIdx,
          answer_image_indices: aIndices,
          key_concept: item.key_concept || item.answer_text || item.explanation || item.a_desc || item.solution || '',
          ...flags
        };
      });

      setParsedQuestions(enriched);
      setParseError('');
    } catch {
      setParseError('JSON 語法解析錯誤，請確認 AI 產出格式正確');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiJsonInput]);

  // Manual Adjustment Helpers for Parsed Questions (Order & Pairing & Subject/Chapter)
  const handleMoveQuestion = (idx: number, direction: -1 | 1) => {
    setParsedQuestions(prev => {
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((q, i) => ({ ...q, index: i + 1 }));
    });
  };

  const handleDeleteParsedQuestion = (idx: number) => {
    setParsedQuestions(prev =>
      prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, index: i + 1 }))
    );
  };

  const handleAddManualQuestion = () => {
    setParsedQuestions(prev => {
      const nextIdx = prev.length + 1;
      const defaultSubj = targetSubjectName.trim() || categories.subjects[0]?.name || '未分類科目';
      const defaultChap = targetChapterName.trim() || '一般章節';
      const flags = computeNewFlags(defaultSubj, defaultChap);
      return [
        ...prev,
        {
          id: `pq_manual_${Date.now()}_${nextIdx}`,
          index: nextIdx,
          title: `第 ${nextIdx} 題`,
          subject_name: defaultSubj,
          chapter_name: defaultChap,
          question_image_index: Math.min(nextIdx, Math.max(questionImages.length, 1)),
          answer_image_indices: answerImages.length >= nextIdx ? [nextIdx] : answerImages.length > 0 ? [1] : [],
          key_concept: '',
          ...flags
        }
      ];
    });
  };

  const handleUpdateParsedQuestion = (idx: number, patch: Partial<ParsedExamQuestion>) => {
    setParsedQuestions(prev =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const nextSubj = patch.subject_name !== undefined ? patch.subject_name : q.subject_name;
        const nextChap = patch.chapter_name !== undefined ? patch.chapter_name : q.chapter_name;
        const flags = computeNewFlags(nextSubj, nextChap);
        return {
          ...q,
          ...patch,
          ...flags
        };
      })
    );
  };

  const handleToggleAnswerImageForQuestion = (qIdx: number, ansImgNumber: number) => {
    setParsedQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const exists = q.answer_image_indices.includes(ansImgNumber);
        const nextIndices = exists
          ? q.answer_image_indices.filter(n => n !== ansImgNumber)
          : [...q.answer_image_indices, ansImgNumber];
        return {
          ...q,
          answer_image_indices: nextIndices
        };
      })
    );
  };

  // Apply target subject & chapter to ALL parsed questions in 1 click
  const handleApplyTargetToAll = () => {
    const sName = targetSubjectName.trim();
    const cName = targetChapterName.trim();
    if (!sName) {
      showToast('請先輸入或選擇要套用的科目名稱', 'error');
      return;
    }
    const finalChap = cName || '一般章節';
    const flags = computeNewFlags(sName, finalChap);
    setParsedQuestions(prev =>
      prev.map(q => ({
        ...q,
        subject_name: sName,
        chapter_name: finalChap,
        ...flags
      }))
    );
  };

  // Proceed from Step 2 to Step 3: Launch Fast Review Wizard
  const handleStartReview = () => {
    if (parsedQuestions.length === 0) {
      setParseError('請先貼上 AI 分析結果、新增配對題目或點選載入測試範例');
      return;
    }

    const items: ReviewItem[] = parsedQuestions.map((q, idx) => {
      const qImgItem =
        q.question_image_index > 0 ? questionImages[q.question_image_index - 1] : undefined;
      const qKey = qImgItem?.key || '';
      const qUrl = qImgItem?.url || '';

      const matchedAnsItems = (q.answer_image_indices || [])
        .map(aNum => answerImages[aNum - 1])
        .filter((item): item is UploadedImageItem => !!item);

      const aKeys = matchedAnsItems.map(item => item.key);
      const aUrls = matchedAnsItems.map(item => item.url);

      const matchedSubj = categories.subjects.find(
        s => s.name.trim().toLowerCase() === q.subject_name.trim().toLowerCase()
      );
      const matchedChap = categories.chapters.find(
        c =>
          c.name.trim().toLowerCase() === q.chapter_name.trim().toLowerCase() &&
          (!matchedSubj || c.subject_id === matchedSubj.id || c.parent_id === matchedSubj.id)
      );

      return {
        id: `draft_${Date.now()}_${idx}`,
        title: q.title.trim() || `第 ${idx + 1} 題`,
        subject_id: matchedSubj?.id || null,
        subject_name: q.subject_name.trim() || '未分類科目',
        chapter_id: matchedChap?.id || null,
        chapter_name: q.chapter_name.trim() || '一般章節',
        question_text: q.question_text || '',
        question_image_key: qKey,
        question_image_url: qUrl,
        answer_image_keys: aKeys,
        answer_image_urls: aUrls,
        familiarity_id: null,
        error_reason_ids: [],
        is_new_chapter: q.is_new_chapter,
        key_concept: q.key_concept || ''
      };
    });

    setReviewItems(items);
    setCurrentReviewIndex(0);
    setIsErrorDrawerOpen(false);
    setSelectedErrorReasons([]);
    if (autoClearAfterBatch) {
      resetStep1AndStep2AfterBatch();
    }
    setActiveTab('review');
  };

  // Resolve virtual familiarity code ('fam_danger' | 'fam_warning' | 'fam_success') to real category ID
  const resolveRealFamiliarityId = (codeOrId: string | null): string | null => {
    if (!codeOrId) return categories.familiarities[0]?.id || null;
    const direct = categories.familiarities.find(f => f.id === codeOrId);
    if (direct) return direct.id;
    if (codeOrId === 'fam_danger') {
      const f =
        categories.familiarities.find(item => item.color === 'danger' || item.name.includes('不會') || item.name.includes('生疏')) ||
        categories.familiarities[0];
      return f?.id || null;
    }
    if (codeOrId === 'fam_warning') {
      const f =
        categories.familiarities.find(item => item.color === 'warning' || item.name.includes('卡') || item.name.includes('稍微')) ||
        categories.familiarities[1] ||
        categories.familiarities[0];
      return f?.id || null;
    }
    if (codeOrId === 'fam_success') {
      const f =
        categories.familiarities.find(item => item.color === 'success' || item.name.includes('順') || item.name.includes('熟練') || item.name.includes('精熟')) ||
        categories.familiarities[categories.familiarities.length - 1];
      return f?.id || null;
    }
    return categories.familiarities[0]?.id || null;
  };

  // Review Action: Choose Familiarity for current question (1-click fast advance)
  const handleAssignFamiliarity = (famCode: string) => {
    if (submittingBatch) return;
    const resolvedFamId = resolveRealFamiliarityId(famCode);

    const updatedItems = reviewItems.map((item, idx) =>
      idx === currentReviewIndex
        ? { ...item, familiarity_id: resolvedFamId, error_reason_ids: selectedErrorReasons }
        : item
    );
    setReviewItems(updatedItems);

    setIsErrorDrawerOpen(false);
    setSelectedErrorReasons([]);

    if (currentReviewIndex + 1 < reviewItems.length) {
      setCurrentReviewIndex(prev => prev + 1);
    } else {
      finishAllReviews(updatedItems);
    }
  };

  // Omnipresent Action: Mark all remaining as unfamiliar & finish immediately
  const handleMarkAllAsUnfamiliar = () => {
    if (submittingBatch) return;
    const lowestId = resolveRealFamiliarityId('fam_danger');

    const completed = reviewItems.map((item, idx) => {
      if (idx < currentReviewIndex && item.familiarity_id) {
        return item;
      }
      return {
        ...item,
        familiarity_id: lowestId,
        error_reason_ids: item.error_reason_ids || []
      };
    });

    finishAllReviews(completed);
  };

  // Finish review and ACTUALLY persist to D1 / LocalStorage via API
  const finishAllReviews = async (finalItems: ReviewItem[]) => {
    setSubmittingBatch(true);
    try {
      // 1. Ensure all subjects and chapters exist in DB / LocalStorage
      const subjectMap = new Map<string, string>();
      categories.subjects.forEach(s => {
        subjectMap.set(s.name.trim().toLowerCase(), s.id);
      });

      const chapterMap = new Map<string, string>();
      categories.chapters.forEach(c => {
        const sId = c.subject_id || c.parent_id || '';
        chapterMap.set(`${sId}::${c.name.trim().toLowerCase()}`, c.id);
      });

      const persistedMistakes: MistakeRecord[] = [];
      const todayStr = new Date().toISOString().slice(0, 10);

      for (let idx = 0; idx < finalItems.length; idx++) {
        const item = finalItems[idx];
        const sName = (item.subject_name || '未分類科目').trim();
        const cName = (item.chapter_name || '一般章節').trim();

        // Resolve or create Subject
        let resolvedSubjectId = item.subject_id || subjectMap.get(sName.toLowerCase()) || null;
        if (!resolvedSubjectId) {
          try {
            const createdSubj = await apiRequest('/api/subjects', {
              method: 'POST',
              body: { name: sName, color: 'kraft_camel|BookOpen' }
            });
            const newSubjId = createdSubj?.id || createdSubj?.subject?.id || createdSubj?.item?.id;
            if (newSubjId) {
              resolvedSubjectId = newSubjId;
              subjectMap.set(sName.toLowerCase(), newSubjId);
            }
          } catch (e) {
            console.warn('自動建立科目失敗:', e);
          }
        }

        // Resolve or create Chapter under Subject
        let resolvedChapterId =
          item.chapter_id ||
          (resolvedSubjectId ? chapterMap.get(`${resolvedSubjectId}::${cName.toLowerCase()}`) : null) ||
          null;
        if (resolvedSubjectId && !resolvedChapterId && cName) {
          try {
            const createdChap = await apiRequest('/api/chapters', {
              method: 'POST',
              body: { subjectId: resolvedSubjectId, name: cName }
            });
            const newChapId = createdChap?.id || createdChap?.chapter?.id || createdChap?.item?.id;
            if (newChapId) {
              resolvedChapterId = newChapId;
              chapterMap.set(`${resolvedSubjectId}::${cName.toLowerCase()}`, newChapId);
            }
          } catch (e) {
            console.warn('自動建立章節失敗:', e);
          }
        }

        const resolvedFamId = resolveRealFamiliarityId(item.familiarity_id);
        const primaryQKey = item.question_image_key || '';
        const allAKeys = item.answer_image_keys || [];
        const primaryAKey = allAKeys[0] || '';
        const explanationText = item.key_concept || '';
        const questionText = item.question_text || '';

        const payload = {
          title: item.title,
          subjectId: resolvedSubjectId,
          chapterId: resolvedChapterId,
          unitId: null,
          familiarityId: resolvedFamId,
          errorReasonIds: item.error_reason_ids || [],
          tags: ['考卷批次匯入'],
          mistakeDate: todayStr,
          templateId: 'default_template',
          data: {
            questionData: {
              q_desc: questionText,
              q_image: primaryQKey,
              q_img: primaryQKey
            },
            answerData: {
              a_desc: explanationText,
              key_concept: explanationText,
              a_image: primaryAKey,
              a_img: primaryAKey,
              a_images: allAKeys
            }
          }
        };

        // If the item already existed in DB (e.g., from unreviewed inbox), PUT it; otherwise POST new
        const isExistingRecord = !item.id.startsWith('draft_');
        if (isExistingRecord) {
          await apiRequest('/api/mistakes', {
            method: 'PUT',
            body: {
              id: item.id,
              familiarityId: resolvedFamId,
              errorReasonIds: item.error_reason_ids || [],
              data: payload.data
            }
          });
        } else {
          const created = await apiRequest('/api/mistakes', {
            method: 'POST',
            body: payload
          });
          persistedMistakes.push({
            id: created?.id || `mistake_batch_${Date.now()}_${idx}`,
            title: item.title,
            subject_id: resolvedSubjectId,
            subject_name: sName,
            chapter_id: resolvedChapterId,
            chapter_name: cName,
            unit_id: null,
            familiarity_id: resolvedFamId,
            error_reason_ids: item.error_reason_ids || [],
            tags: ['考卷批次匯入'],
            mistake_date: todayStr,
            template_id: 'default_template',
            template_fields: {
              questionFields: [
                { id: 'q_desc', type: 'text', label: '題目說明' },
                { id: 'q_img', type: 'image', label: '題目相片' }
              ],
              answerFields: [
                { id: 'a_desc', type: 'text', label: '解析說明' },
                { id: 'a_img', type: 'image', label: '解析相片' }
              ]
            },
            data: payload.data,
            created_at: Date.now() + idx
          });
        }
      }

      setSavedCount(finalItems.length);
      if (autoClearAfterBatch) {
        resetStep1AndStep2AfterBatch();
      }
      if (onRefreshCategories) {
        await onRefreshCategories();
      }
      onBatchImportComplete(persistedMistakes);
      setActiveTab('completed');
    } catch (err: any) {
      showToast('批次寫入錯題本時發生錯誤：' + (err.message || String(err)), 'error');
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Current item being reviewed
  const currentItem = reviewItems[currentReviewIndex];

  // Relevant error reasons for current item
  const relevantErrorReasons = useMemo(() => {
    if (!currentItem) return categories.errorReasons;
    return categories.errorReasons.filter(r => {
      if (!r.parent_id && !r.subject_id) return true;
      return r.parent_id === currentItem.subject_id || r.subject_id === currentItem.subject_id;
    });
  }, [categories.errorReasons, currentItem]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '12px'
      }}
    >
      <div
        className="notebook-page washi-tape-strip"
        style={{
          width: '100%',
          maxWidth: '1120px',
          maxHeight: '92vh',
          backgroundColor: 'var(--notebook-paper)',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 20px 48px rgba(60, 40, 20, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '3px solid var(--accent-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(180, 83, 9, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI 考卷批次歸納與極速審核
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                1. 多選科目與章節範圍設計提詞 -&gt; 2. 選圖與調整順序/多圖配對 -&gt; 3. 極速審核寫入錯題本
              </p>
            </div>
          </div>

          {/* Workflow Tabs Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: autoClearAfterBatch ? 'rgba(25, 122, 39, 0.08)' : 'rgba(180, 83, 9, 0.06)',
                border: '1px solid var(--glass-border)',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              title="勾選後，每次完成一份提詞或配對輸入後將自動清空第一、二階段設定，方便連續處理下一份考卷"
            >
              <input
                type="checkbox"
                checked={autoClearAfterBatch}
                onChange={e => setAutoClearAfterBatch(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              完成一份後自動清空第 1、2 階段
            </label>

            <div
              style={{
                display: 'flex',
                padding: '3px',
                backgroundColor: 'rgba(180, 83, 9, 0.08)',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('prompt')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'prompt' ? 700 : 500,
                  backgroundColor: activeTab === 'prompt' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'prompt' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'prompt' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer'
                }}
              >
                1. 設計提詞 (多選範圍)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'import' ? 700 : 500,
                  backgroundColor: activeTab === 'import' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'import' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'import' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer'
                }}
              >
                2. 選圖與調整配對
              </button>
              <button
                type="button"
                onClick={() => reviewItems.length > 0 && setActiveTab('review')}
                disabled={reviewItems.length === 0}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'review' ? 700 : 500,
                  backgroundColor: activeTab === 'review' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'review' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'review' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: reviewItems.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: reviewItems.length > 0 ? 1 : 0.6
                }}
              >
                3. 極速卡片審核
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="關閉"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* TAB 1: 多選科目／章節範圍提詞設計器 */}
          {activeTab === 'prompt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: 'rgba(180, 83, 9, 0.04)',
                  border: '1px dashed var(--glass-border)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 480px' }}>
                  <div style={{ color: 'var(--accent-primary)', marginTop: '2px' }}>
                    <HelpCircle size={20} />
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong>第一階段：自由多選科目／章節範圍，自動產生專屬 AI 辨識提詞</strong>
                    <br />
                    1. 在下方勾選本次考卷涵蓋的<strong>一個或多個科目與章節</strong>（若只勾選 1 個科目與 1 個章節，提詞會自動要求 AI 將全部錯題放入該章節；若勾選多個科目與章節，AI 會在您指定的範圍內精準分類）。
                    <br />
                    2. 點擊「複製提詞並前往第 2 步」，開啟外部 AI（ChatGPT、Gemini 或 Claude）上傳題目圖與解析圖並貼上提詞。
                    <br />
                    3. <strong>圖片較多時的推薦做法</strong>：若手邊有整份模擬考或多張照片，部分外部 AI 對話框有單次上傳張數限制，建議於第 2 步上傳後使用本系統內建的<strong>「打包全部圖片為 ZIP 壓縮檔」</strong>功能，一鍵打包下載後直接傳給外部 AI！
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleSelectAllScope}
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    全選所有科目與章節
                  </button>
                  <button
                    type="button"
                    onClick={handleClearStep1Scope}
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--danger)' }}
                  >
                    清空範圍重選
                  </button>
                </div>
              </div>

              {/* Quick Custom Subject / Chapter Addition Bar */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  新增自訂科目／章節至多選範圍：
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 380px', justifyContent: 'flex-end' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="輸入科目 (如：物理、生物)"
                    value={customSubjInput}
                    onChange={e => setCustomSubjInput(e.target.value)}
                    style={{ width: '160px', padding: '6px 10px', fontSize: '0.82rem' }}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="輸入章節 (選填，如：運動&力)"
                    value={customChapInput}
                    onChange={e => setCustomChapInput(e.target.value)}
                    style={{ width: '190px', padding: '6px 10px', fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomScopeItem}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    + 加入多選範圍
                  </button>
                </div>
              </div>

              {/* Multi-Select Subject & Chapter Cards Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    勾選本次考卷的科目與章節範圍（已選 {selectedSubjects.length} 個科目）：
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    可點選多個科目與多個章節自由組合範圍
                  </span>
                </div>

                {combinedScopePool.length === 0 ? (
                  <div
                    style={{
                      padding: '18px',
                      borderRadius: '10px',
                      border: '1px dashed var(--glass-border)',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem'
                    }}
                  >
                    目前尚無預設科目，請使用上方輸入框新增自訂科目與章節，或直接複製下方通用提詞。
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '12px'
                    }}
                  >
                    {combinedScopePool.map(({ subjectName, chapters }) => {
                      const isSubjChecked = selectedSubjects.includes(subjectName);
                      const checkedChaps = selectedChaptersBySubject[subjectName] || [];
                      return (
                        <div
                          key={subjectName}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: isSubjChecked ? '2px solid #D97706' : '1px solid var(--glass-border)',
                            backgroundColor: isSubjChecked ? '#FFFBEB' : '#FFFFFF',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 700,
                                fontSize: '0.92rem',
                                color: '#1C1917',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSubjChecked}
                                onChange={() => handleToggleSubjectScope(subjectName)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <span>科目：{subjectName}</span>
                            </label>

                            {chapters.length > 0 && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllChaptersOfSubject(subjectName, true)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    color: 'var(--accent-primary)',
                                    cursor: 'pointer',
                                    padding: '2px 4px'
                                  }}
                                >
                                  全選章節
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllChaptersOfSubject(subjectName, false)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '2px 4px'
                                  }}
                                >
                                  取消章節
                                </button>
                              </div>
                            )}
                          </div>

                          {chapters.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {chapters.map(chapName => {
                                const isChapSelected = checkedChaps.includes(chapName);
                                return (
                                  <button
                                    key={chapName}
                                    type="button"
                                    onClick={() => handleToggleChapterScope(subjectName, chapName)}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '999px',
                                      fontSize: '0.76rem',
                                      fontWeight: isChapSelected ? 700 : 500,
                                      border: isChapSelected ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                                      backgroundColor: isChapSelected ? '#FDE68A' : '#FAF7F0',
                                      color: '#1C1917',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    {isChapSelected && <Check size={12} />}
                                    {chapName}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              尚未建立細部章節（AI 將自動為此科目建議章節）
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    即時產生的多選科目／章節範圍 AI 提詞：
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(false)}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.84rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {copiedPrompt ? <Check size={15} /> : <Copy size={15} />}
                      {copiedPrompt ? '已複製至剪貼簿！' : '一鍵複製提詞'}
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  value={generatedPrompt}
                  style={{
                    width: '100%',
                    height: '220px',
                    padding: '14px',
                    fontFamily: 'monospace',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: '#1C1917',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearStep1Scope}
                  style={{ padding: '8px 14px', fontSize: '0.84rem' }}
                >
                  清空第一階段已選範圍
                </button>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleCopyPrompt(true)}
                    style={{ padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    複製提詞並前往第 2 步：選圖與配對 <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 雙區選圖、AI JSON 解析與手動順序/多圖配對調整工作台 */}
          {activeTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Action Bar with Sample Data Button & Auto-Clear Step 2 Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(25, 122, 39, 0.06)',
                  border: '1px solid rgba(25, 122, 39, 0.22)',
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={18} style={{ color: 'var(--success)' }} />
                  <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                    上傳考卷題目圖與解析圖並貼上外部 AI 回傳的 JSON（完成本份進入審核後將依上方設定自動清空暫存）：
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {(questionImages.length > 0 || answerImages.length > 0 || aiJsonInput || parsedQuestions.length > 0) && (
                    <button
                      type="button"
                      onClick={handleClearStep2Inputs}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--danger)'
                      }}
                    >
                      清空第二階段全部資料
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="btn btn-secondary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                    gap: '6px'
                  }}
                >
                    <Sparkles size={14} /> 載入測試範例資料
                  </button>
                </div>
              </div>

              {/* Dual Dropzone Containers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
                {/* Zone 1: Question Images */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
                      1. 題目圖片區（共 {questionImages.length} 張）
                    </label>
                    {questionImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setQuestionImages([])}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        清空題目圖
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={questionInputRef}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      handleAddFiles(e.target.files, 'question');
                      e.target.value = '';
                    }}
                  />

                  <div
                    onClick={() => questionInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--glass-border)',
                      borderRadius: '8px',
                      padding: '18px 14px',
                      textAlign: 'center',
                      backgroundColor: 'var(--notebook-paper)',
                      cursor: 'pointer'
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      handleAddFiles(e.dataTransfer.files, 'question');
                    }}
                  >
                    {uploadingQ ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: '#1C1917' }}>
                        <RefreshCw size={16} className="animate-spin" /> 題目圖片壓縮處理中...
                      </div>
                    ) : (
                      <>
                        <Upload size={22} style={{ color: 'var(--accent-primary)', margin: '0 auto 6px auto' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1C1917' }}>
                          點擊選取或拖曳「題目照片」至此（可多選）
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          依序編號為 題目圖 #1, #2, #3...
                        </div>
                      </>
                    )}
                  </div>

                  {/* Question Thumbnails row */}
                  {questionImages.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 2px' }}>
                      {questionImages.map((img, idx) => (
                        <div
                          key={img.id}
                          style={{
                            flexShrink: 0,
                            width: '76px',
                            height: '58px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid var(--glass-border)',
                            position: 'relative',
                            backgroundColor: '#FAF7F0'
                          }}
                        >
                          <img
                            src={img.url}
                            alt={`題目 ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => onOpenZoomedImage?.(img.url)}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '2px',
                              left: '2px',
                              backgroundColor: 'rgba(28, 25, 23, 0.85)',
                              color: '#FFFFFF',
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontWeight: 700
                            }}
                          >
                            題目 #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuestionImages(prev => prev.filter((_, i) => i !== idx))}
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              background: 'rgba(185, 28, 28, 0.85)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '50%',
                              width: '16px',
                              height: '16px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="移除此張題目圖"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Zone 2: Explanation Images */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      2. 解析圖片區（共 {answerImages.length} 張，單題可配對多張）
                    </label>
                    {answerImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAnswerImages([])}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        清空解析圖
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={answerInputRef}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      handleAddFiles(e.target.files, 'answer');
                      e.target.value = '';
                    }}
                  />

                  <div
                    onClick={() => answerInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--glass-border)',
                      borderRadius: '8px',
                      padding: '18px 14px',
                      textAlign: 'center',
                      backgroundColor: 'var(--notebook-paper)',
                      cursor: 'pointer'
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      handleAddFiles(e.dataTransfer.files, 'answer');
                    }}
                  >
                    {uploadingA ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: '#1C1917' }}>
                        <RefreshCw size={16} className="animate-spin" /> 解析圖片壓縮處理中...
                      </div>
                    ) : (
                      <>
                        <Upload size={22} style={{ color: 'var(--success)', margin: '0 auto 6px auto' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1C1917' }}>
                          點擊選取或拖曳「解析照片」至此（可多選）
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          依序編號為 解析圖 #1, #2, #3...（下方可自由勾選多張給同一題）
                        </div>
                      </>
                    )}
                  </div>

                  {/* Answer Thumbnails row */}
                  {answerImages.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 2px' }}>
                      {answerImages.map((img, idx) => (
                        <div
                          key={img.id}
                          style={{
                            flexShrink: 0,
                            width: '76px',
                            height: '58px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid var(--glass-border)',
                            position: 'relative',
                            backgroundColor: '#FAF7F0'
                          }}
                        >
                          <img
                            src={img.url}
                            alt={`解析 ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => onOpenZoomedImage?.(img.url)}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '2px',
                              left: '2px',
                              backgroundColor: 'rgba(25, 122, 39, 0.9)',
                              color: '#FFFFFF',
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontWeight: 700
                            }}
                          >
                            解析 #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAnswerImages(prev => prev.filter((_, i) => i !== idx))}
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              background: 'rgba(185, 28, 28, 0.85)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '50%',
                              width: '16px',
                              height: '16px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="移除此張解析圖"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Packaging Images into ZIP Archive for External AI */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '14px 18px',
                  backgroundColor: '#EFF6FF',
                  border: '1.5px solid #3B82F6',
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 360px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(37, 99, 235, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563EB',
                      flexShrink: 0
                    }}
                  >
                    <Archive size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E3A8A' }}>
                      圖片較多？一鍵打包為 ZIP 壓縮檔（自動附帶第 1 階段 AI 提詞說明）
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#1E40AF', marginTop: '3px', lineHeight: 1.5 }}>
                      當題目與解析照片數量較多時（如整份模擬考），直接拖曳到 ChatGPT / Claude / Gemini 常受限於單次貼圖張數限制。點擊右側即可將目前上傳的 <strong>{questionImages.length} 張題目圖</strong> 與 <strong>{answerImages.length} 張解析圖</strong> 依序分類打包為單一 ZIP 壓縮檔，並自動附帶提詞 txt 檔，直接傳給外部 AI 進行高速批次辨識！
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handlePackageAndDownloadZip}
                    disabled={packagingZip || (questionImages.length === 0 && answerImages.length === 0)}
                    className="btn btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#2563EB',
                      borderColor: '#1D4ED8',
                      color: '#FFFFFF',
                      opacity: (questionImages.length === 0 && answerImages.length === 0) ? 0.6 : 1,
                      cursor: (questionImages.length === 0 && answerImages.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                    title={
                      (questionImages.length === 0 && answerImages.length === 0)
                        ? '請先在上方題目區或解析區選取圖片後再進行打包'
                        : '點擊將目前全部題目與解析照片打包為 ZIP 壓縮檔'
                    }
                  >
                    {packagingZip ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                    {packagingZip
                      ? (zipProgressText || '正在打包圖片中...')
                      : `打包下載 ZIP 壓縮檔 (${questionImages.length + answerImages.length} 張)`}
                  </button>
                  <span style={{ fontSize: '0.72rem', color: '#3B82F6' }}>
                    內含：題目圖片/資料夾、解析圖片/資料夾、外部AI提詞說明.txt
                  </span>
                </div>
              </div>

              {/* ZIP Packaging Success Banner */}
              {zipSuccessMsg && (
                <div
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #10B981',
                    borderRadius: '8px',
                    color: '#065F46',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  className="animate-fade-in"
                >
                  <CheckCircle2 size={16} style={{ color: '#059669' }} />
                  {zipSuccessMsg}
                </div>
              )}

              {/* Paste AI JSON Textarea */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1C1917' }}>
                    3. 貼上外部 AI 分析結果 (JSON 代碼)，或直接點選右側「+ 手動新增配對題目」：
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {aiJsonInput && (
                      <span style={{ fontSize: '0.8rem', color: parseError ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                        {parseError ? parseError : `已成功載入 ${parsedQuestions.length} 道題目`}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleAddManualQuestion}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      <Plus size={14} /> 手動新增配對題目
                    </button>
                  </div>
                </div>
                <textarea
                  placeholder="請在此貼上 ChatGPT、Gemini 或 Claude 回傳的 JSON 陣列..."
                  value={aiJsonInput}
                  onChange={e => setAiJsonInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '92px',
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                    border: parseError ? '1px solid var(--danger)' : '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--notebook-paper)',
                    color: '#1C1917'
                  }}
                />
              </div>

              {/* Interactive Order & Multi-Image Pairing Workbench */}
              {parsedQuestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Quick Batch Target Bar: 把這些錯題全部放在 [某科目] [某章節] */}
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #D97706',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#78350F' }}>
                        一鍵把全部錯題放在指定科目與章節：
                      </span>
                      <input
                        type="text"
                        placeholder="科目名稱 (如：物理)"
                        value={targetSubjectName}
                        onChange={e => setTargetSubjectName(e.target.value)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #D97706',
                          backgroundColor: '#FFFFFF',
                          color: '#1C1917',
                          fontSize: '0.82rem',
                          width: '130px'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="章節名稱 (如：運動&力)"
                        value={targetChapterName}
                        onChange={e => setTargetChapterName(e.target.value)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #D97706',
                          backgroundColor: '#FFFFFF',
                          color: '#1C1917',
                          fontSize: '0.82rem',
                          width: '150px'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyTargetToAll}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      套用至下方全部 {parsedQuestions.length} 題
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      4. 調整題目順序與「題目圖 / 多張解析圖」配對（共 {parsedQuestions.length} 題）：
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      可上下移動順序、修改科目章節與說明，並為單一題目勾選多張解析圖片
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {parsedQuestions.map((q, idx) => {
                      const qThumb =
                        q.question_image_index > 0 ? questionImages[q.question_image_index - 1]?.url : '';
                      const pairedAnswers = (q.answer_image_indices || [])
                        .map(aNum => ({ num: aNum, item: answerImages[aNum - 1] }))
                        .filter(x => !!x.item);

                      return (
                        <div
                          key={q.id}
                          style={{
                            padding: '14px 16px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '10px',
                            border: '1px solid var(--glass-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 2px 6px rgba(60, 40, 20, 0.04)'
                          }}
                        >
                          {/* Row 1: Order Controls, Title, Subject & Chapter */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.88rem',
                                  color: '#FFFFFF',
                                  backgroundColor: '#8B5A2B',
                                  padding: '3px 9px',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                第 {idx + 1} 題
                              </span>

                              {/* Order Up / Down buttons */}
                              <div style={{ display: 'inline-flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleMoveQuestion(idx, -1)}
                                  disabled={idx === 0}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 6px', opacity: idx === 0 ? 0.4 : 1 }}
                                  title="上移此題順序"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveQuestion(idx, 1)}
                                  disabled={idx === parsedQuestions.length - 1}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 6px', opacity: idx === parsedQuestions.length - 1 ? 0.4 : 1 }}
                                  title="下移此題順序"
                                >
                                  <ArrowDown size={13} />
                                </button>
                              </div>

                              <input
                                type="text"
                                value={q.title}
                                onChange={e => handleUpdateParsedQuestion(idx, { title: e.target.value })}
                                placeholder="輸入題目名稱"
                                style={{
                                  flex: 1,
                                  minWidth: '160px',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--glass-border)',
                                  fontSize: '0.88rem',
                                  fontWeight: 600,
                                  color: '#1C1917',
                                  backgroundColor: '#FAF7F0'
                                }}
                              />
                            </div>

                            {/* Subject & Chapter Editable Inputs */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <input
                                type="text"
                                value={q.subject_name}
                                onChange={e => handleUpdateParsedQuestion(idx, { subject_name: e.target.value })}
                                placeholder="科目"
                                title="此題歸屬科目"
                                style={{
                                  width: '96px',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(180, 83, 9, 0.35)',
                                  backgroundColor: 'rgba(180, 83, 9, 0.08)',
                                  color: '#1C1917',
                                  fontSize: '0.8rem',
                                  fontWeight: 600
                                }}
                              />
                              <input
                                type="text"
                                value={q.chapter_name}
                                onChange={e => handleUpdateParsedQuestion(idx, { chapter_name: e.target.value })}
                                placeholder="章節"
                                title="此題歸屬章節"
                                style={{
                                  width: '126px',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(77, 124, 15, 0.35)',
                                  backgroundColor: 'rgba(77, 124, 15, 0.08)',
                                  color: '#1C1917',
                                  fontSize: '0.8rem',
                                  fontWeight: 600
                                }}
                              />
                              {q.is_new_chapter && (
                                <span
                                  style={{
                                    padding: '3px 7px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: 'var(--warning-bg)',
                                    color: 'var(--warning-text)',
                                    border: '1px solid var(--warning-border)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <FolderPlus size={11} /> 自動建章節
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteParsedQuestion(idx)}
                                className="btn btn-secondary"
                                style={{ padding: '5px 7px', color: 'var(--danger)' }}
                                title="刪除此題"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Editable Explanation / Key Concept */}
                          <div>
                            <input
                              type="text"
                              value={q.key_concept || ''}
                              onChange={e => handleUpdateParsedQuestion(idx, { key_concept: e.target.value })}
                              placeholder="解析說明文字 / 核心考點（將存入錯題解析說明，檢視題目時直接呈現）..."
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--glass-border)',
                                fontSize: '0.82rem',
                                color: '#1C1917',
                                backgroundColor: '#FFFFFF'
                              }}
                            />
                          </div>

                          {/* Row 3: Question Image Pairing & Multi-Image Answer Pairing */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                              gap: '12px',
                              paddingTop: '8px',
                              borderTop: '1px dashed var(--glass-border)'
                            }}
                          >
                            {/* Left: Question Image Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '68px',
                                  height: '52px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  border: '1px solid var(--glass-border)',
                                  backgroundColor: '#FAF7F0',
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {qThumb ? (
                                  <img
                                    src={qThumb}
                                    alt="題目預覽"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => onOpenZoomedImage?.(qThumb)}
                                  />
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>無題目圖</span>
                                )}
                              </div>

                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#1C1917', marginBottom: '4px' }}>
                                  配對題目圖：
                                </label>
                                <select
                                  value={q.question_image_index}
                                  onChange={e =>
                                    handleUpdateParsedQuestion(idx, { question_image_index: Number(e.target.value) })
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--glass-border)',
                                    fontSize: '0.8rem',
                                    backgroundColor: '#FFFFFF',
                                    color: '#1C1917'
                                  }}
                                >
                                  <option value={0}>不配對題目圖</option>
                                  {questionImages.map((img, i) => (
                                    <option key={img.id} value={i + 1}>
                                      題目圖 #{i + 1} ({img.name})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Right: Multi-Answer Image Selector (支援一個解析多張圖片) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1C1917' }}>
                                  配對解析圖（可點選多張，已選 {pairedAnswers.length} 張）：
                                </label>
                              </div>

                              {answerImages.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                  {answerImages.map((aImg, aIdx) => {
                                    const num = aIdx + 1;
                                    const isSelected = q.answer_image_indices.includes(num);
                                    const orderInSelection = q.answer_image_indices.indexOf(num) + 1;
                                    return (
                                      <button
                                        key={aImg.id}
                                        type="button"
                                        onClick={() => handleToggleAnswerImageForQuestion(idx, num)}
                                        style={{
                                          padding: '4px 9px',
                                          borderRadius: '6px',
                                          fontSize: '0.76rem',
                                          fontWeight: 700,
                                          border: isSelected ? '2px solid #4D7C0F' : '1px solid var(--glass-border)',
                                          backgroundColor: isSelected ? '#ECFDF5' : '#FAF7F0',
                                          color: '#1C1917',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        title="點擊切換是否將此解析圖配對給本題"
                                      >
                                        <span>解析 #{num}</span>
                                        {isSelected && (
                                          <span
                                            style={{
                                              backgroundColor: '#4D7C0F',
                                              color: '#FFFFFF',
                                              borderRadius: '999px',
                                              padding: '0 5px',
                                              fontSize: '0.68rem'
                                            }}
                                          >
                                            第{orderInSelection}張
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  尚未於上方上傳解析圖片
                                </span>
                              )}

                              {/* Thumbnails of paired answer images */}
                              {pairedAnswers.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                                  {pairedAnswers.map(({ num, item }, pIdx) => (
                                    <div
                                      key={`${num}_${pIdx}`}
                                      style={{
                                        width: '54px',
                                        height: '40px',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        border: '1.5px solid #4D7C0F',
                                        position: 'relative',
                                        backgroundColor: '#FAF7F0'
                                      }}
                                    >
                                      <img
                                        src={item.url}
                                        alt={`解析 #${num}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                        onClick={() => onOpenZoomedImage?.(item.url)}
                                      />
                                      <span
                                        style={{
                                          position: 'absolute',
                                          bottom: 0,
                                          right: 0,
                                          backgroundColor: 'rgba(25, 122, 39, 0.9)',
                                          color: '#FFFFFF',
                                          fontSize: '0.6rem',
                                          padding: '0 3px'
                                        }}
                                      >
                                        #{num}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Confirm Action */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '16px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('prompt')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={16} /> 返回查看提詞
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartReview}
                  disabled={parsedQuestions.length === 0}
                  style={{
                    padding: '10px 24px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  確認順序與配對，進入極速審核 <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 極速卡片審核精靈 (FAST REVIEW WIZARD) */}
          {activeTab === 'review' && currentItem && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
              {/* Wizard Top Status & Omnipresent Action Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '12px 18px',
                  backgroundColor: 'rgba(180, 83, 9, 0.05)',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('import')}
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  >
                    <ArrowLeft size={13} /> 返回調整配對
                  </button>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    審核進度：第 {currentReviewIndex + 1} / {reviewItems.length} 題
                  </span>
                </div>

                {/* Omnipresent Button: 全部一律標示為不會 */}
                <button
                  type="button"
                  onClick={handleMarkAllAsUnfamiliar}
                  disabled={submittingBatch}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--danger)',
                    backgroundColor: '#FFF5F5',
                    color: 'var(--danger)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: submittingBatch ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: submittingBatch ? 0.7 : 1
                  }}
                  title="點擊後，本批次所有尚未標記的題目將一律設為不會並直接寫入錯題本"
                >
                  {submittingBatch ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  {submittingBatch ? '正在寫入錯題索引與手帳...' : '全部一律標示為不會（一鍵寫入錯題本）'}
                </button>
              </div>

              {/* Central Card: Side-by-Side Question & Multi-Image Answer Visuals */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 4px 16px rgba(60, 40, 20, 0.06)'
                }}
              >
                {/* Meta Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 700, color: '#1C1917' }}>
                      {currentItem.title}
                    </h3>
                    {currentItem.key_concept && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#44403C' }}>
                        解析說明：{currentItem.key_concept}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(180, 83, 9, 0.1)',
                        color: 'var(--accent-primary)'
                      }}
                    >
                      {currentItem.subject_name}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(77, 124, 15, 0.1)',
                        color: 'var(--success)'
                      }}
                    >
                      {currentItem.chapter_name}
                    </span>
                  </div>
                </div>

                {/* Dual Column Image Previews */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px'
                  }}
                >
                  {/* Left Column: Question Image */}
                  <div
                    style={{
                      backgroundColor: 'var(--notebook-paper)',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(180, 83, 9, 0.08)',
                        borderBottom: '1px solid var(--glass-border)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>題目畫面</span>
                      {onOpenZoomedImage && currentItem.question_image_url && (
                        <button
                          type="button"
                          onClick={() => onOpenZoomedImage(currentItem.question_image_url)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                        >
                          <Maximize2 size={13} />
                        </button>
                      )}
                    </div>
                    <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                      {currentItem.question_image_url ? (
                        <img
                          src={currentItem.question_image_url}
                          alt="題目"
                          style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '4px' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>無題目圖檔</span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Answer Images (Supports Multiple Images) */}
                  <div
                    style={{
                      backgroundColor: 'var(--notebook-paper)',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(25, 122, 39, 0.05)',
                        borderBottom: '1px solid var(--glass-border)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>解析畫面（共 {currentItem.answer_image_urls.length} 張）</span>
                    </div>
                    <div
                      style={{
                        minHeight: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '8px'
                      }}
                    >
                      {currentItem.answer_image_urls.length > 0 ? (
                        currentItem.answer_image_urls.map((aUrl, aIdx) => (
                          <div key={aIdx} style={{ width: '100%', textAlign: 'center' }}>
                            {currentItem.answer_image_urls.length > 1 && (
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                                解析圖 ({aIdx + 1} / {currentItem.answer_image_urls.length})
                              </div>
                            )}
                            <img
                              src={aUrl}
                              alt={`解析 ${aIdx + 1}`}
                              onClick={() => onOpenZoomedImage?.(aUrl)}
                              style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '4px', cursor: 'pointer' }}
                            />
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>無解析圖檔</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Interaction: 1-Click Large Familiarity Buttons */}
                <div
                  style={{
                    borderTop: '1px solid var(--glass-border)',
                    paddingTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1C1917' }}>
                      單擊選擇熟悉度（點擊後自動切換下一題，最後一題自動寫入資料庫）：
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <button
                      type="button"
                      disabled={submittingBatch}
                      onClick={() => handleAssignFamiliarity('fam_danger')}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: '2px solid rgba(185, 28, 28, 0.4)',
                        backgroundColor: '#FFF5F5',
                        color: 'var(--danger)',
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        cursor: submittingBatch ? 'wait' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>不會 / 待加強</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 500, opacity: 0.85 }}>毫無頭緒 / 錯因嚴重</span>
                    </button>

                    <button
                      type="button"
                      disabled={submittingBatch}
                      onClick={() => handleAssignFamiliarity('fam_warning')}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: '2px solid rgba(217, 119, 6, 0.4)',
                        backgroundColor: '#FFFBEB',
                        color: '#B45309',
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        cursor: submittingBatch ? 'wait' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>卡 / 稍微理解</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 500, opacity: 0.85 }}>看詳解懂 / 計算粗心</span>
                    </button>

                    <button
                      type="button"
                      disabled={submittingBatch}
                      onClick={() => handleAssignFamiliarity('fam_success')}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: '2px solid rgba(25, 122, 39, 0.4)',
                        backgroundColor: '#F0FDF4',
                        color: 'var(--success)',
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        cursor: submittingBatch ? 'wait' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>順 / 熟練掌握</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 500, opacity: 0.85 }}>已完全弄懂 / 可自信作答</span>
                    </button>
                  </div>
                </div>

                {/* Optional Collapsible Drawer: 錯因分類標籤 */}
                <div
                  style={{
                    borderTop: '1px dashed var(--glass-border)',
                    paddingTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => setIsErrorDrawerOpen(!isErrorDrawerOpen)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 0',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Tag size={15} />
                      {isErrorDrawerOpen ? '收合錯因分類標籤' : '+ 標記錯因分類（選填）'}
                      {isErrorDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>

                  {isErrorDrawerOpen && (
                    <div
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--notebook-paper)',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      {relevantErrorReasons.map(reason => {
                        const isSelected = selectedErrorReasons.includes(reason.id);
                        return (
                          <button
                            key={reason.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedErrorReasons(prev => prev.filter(id => id !== reason.id));
                              } else {
                                setSelectedErrorReasons(prev => [...prev, reason.id]);
                              }
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '20px',
                              border: isSelected ? '1.5px solid #D97706' : '1px solid var(--glass-border)',
                              backgroundColor: isSelected ? '#FDE68A' : '#FFFFFF',
                              color: '#1C1917',
                              fontSize: '0.82rem',
                              fontWeight: isSelected ? 700 : 500,
                              cursor: 'pointer'
                            }}
                          >
                            {reason.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 完成歸檔畫面 (COMPLETED) */}
          {activeTab === 'completed' && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}
              className="animate-fade-in"
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(25, 122, 39, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--success)',
                  marginBottom: '8px'
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                整份考卷錯題已全數寫入錯題索引與手帳！
              </h3>
              <p style={{ margin: 0, fontSize: '0.94rem', color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.6 }}>
                本批共 <strong style={{ color: 'var(--accent-primary)', fontVariantNumeric: 'tabular-nums' }}>{savedCount || reviewItems.length} 道錯題</strong> 已同步寫入資料庫與「錯題索引」，包含題目圖片、多張解析圖片與解析說明文字。
              </p>

              <div style={{ display: 'flex', gap: '14px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onClose}
                  style={{ padding: '10px 24px', fontSize: '0.92rem', fontWeight: 600 }}
                >
                  完成並查看錯題本與索引
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    resetStep1AndStep2AfterBatch();
                    setReviewItems([]);
                    setActiveTab('prompt');
                  }}
                  style={{ padding: '10px 20px', fontSize: '0.92rem' }}
                >
                  繼續匯入下一份考卷（返回第 1 步）
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
