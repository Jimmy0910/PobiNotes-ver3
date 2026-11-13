import { useState, useMemo, useRef, useEffect } from 'react';
import type { CategoriesBundle, MistakeRecord } from '../types';
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
  FolderPlus
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

interface ParsedExamQuestion {
  index: number;
  title: string;
  subject_name: string;
  chapter_name: string;
  unit_name?: string;
  question_image_index: number;
  answer_image_index: number;
  key_concept?: string;
  is_new_subject?: boolean;
  is_new_chapter?: boolean;
}

// Sample SVG placeholder data for zero-friction 1-click test in localhost
const SAMPLE_QUESTION_IMG_1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%23FAF7F0"/><rect x="20" y="20" width="560" height="300" fill="%23FFFFFF" stroke="%23D4C9BA" stroke-width="2" rx="8"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%238B5A2B">第 1 題 [單選題]</text><text x="40" y="96" font-family="sans-serif" font-size="15" fill="%231E293B">設 f(x) 為三次實係數多項式，已知 f(1)=2, f(2)=5, f(3)=10，</text><text x="40" y="126" font-family="sans-serif" font-size="15" fill="%231E293B">且 f(x) 除以 (x-4) 之餘式為 23。試求 f(0) 之值為何？</text><text x="40" y="170" font-family="sans-serif" font-size="14" fill="%23526178">(A) -1   (B) 1   (C) 3   (D) 5   (E) 7</text><line x1="40" y1="210" x2="560" y2="210" stroke="%23E2D9CC" stroke-dasharray="4"/><text x="40" y="245" font-family="sans-serif" font-size="13" fill="%23B91C1C">作答紀錄：學生選 (A) [錯誤]</text></svg>`;

const SAMPLE_ANSWER_IMG_1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%23FAF7F0"/><rect x="20" y="20" width="560" height="300" fill="%23FFFFFF" stroke="%234D7C0F" stroke-width="2" rx="8"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%234D7C0F">第 1 題 詳解與評析</text><text x="40" y="96" font-family="sans-serif" font-size="15" fill="%231E293B">正確答案：(B) 1</text><text x="40" y="130" font-family="sans-serif" font-size="14" fill="%231E293B">核心考點：牛頓插值法或差分設式。</text><text x="40" y="160" font-family="sans-serif" font-size="14" fill="%23526178">設 g(x) = f(x) - (x^2 + 1)，則 g(1)=g(2)=g(3)=0。</text><text x="40" y="190" font-family="sans-serif" font-size="14" fill="%23526178">得 g(x) = k(x-1)(x-2)(x-3)，代入 x=4 得 k=1，</text><text x="40" y="220" font-family="sans-serif" font-size="14" fill="%234D7C0F">故 f(0) = 1*(-1)*(-2)*(-3) + 1 = -6 + 1 ... [計算修正: 1]</text></svg>`;

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
    "answer_image_index": 1,
    "key_concept": "牛頓插值法與多項式餘式條件"
  },
  {
    "index": 2,
    "title": "簡諧運動振幅加倍之週期與能量變化",
    "subject_name": "物理",
    "chapter_name": "波動與簡諧運動",
    "question_image_index": 2,
    "answer_image_index": 2,
    "key_concept": "簡諧運動週期等時性與力學能守恆"
  },
  {
    "index": 3,
    "title": "酸鹼滴定滴定管未潤洗之系統誤差分析",
    "subject_name": "化學",
    "chapter_name": "酸鹼反應與滴定",
    "question_image_index": 3,
    "answer_image_index": 3,
    "key_concept": "容量分析與實驗儀器潤洗誤差"
  }
]`;

export default function BatchExamImportModal({
  isOpen,
  onClose,
  categories,
  onRefreshCategories,
  onBatchImportComplete,
  onOpenZoomedImage,
  initialStage = 'import',
  unreviewedMistakes = []
}: BatchExamImportModalProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'import' | 'review' | 'completed'>(initialStage);
  
  // Sync tab with initialStage when modal is reopened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialStage);
    }
  }, [isOpen, initialStage]);
  
  // Step 1: Prompt Generator State
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Step 2: Dropzone & Upload State
  const [questionImages, setQuestionImages] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [answerImages, setAnswerImages] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedExamQuestion[]>([]);

  // Step 3: Fast Review Wizard State
  const [reviewItems, setReviewItems] = useState<Array<{
    id: string;
    title: string;
    subject_id: string | null;
    subject_name: string;
    chapter_id: string | null;
    chapter_name: string;
    question_image_url: string;
    answer_image_url: string;
    familiarity_id: string | null;
    error_reason_ids: string[];
    is_new_chapter?: boolean;
    key_concept?: string;
  }>>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isErrorDrawerOpen, setIsErrorDrawerOpen] = useState(false);
  const [selectedErrorReasons, setSelectedErrorReasons] = useState<string[]>([]);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  const questionInputRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);

  // Initialize review items from unreviewed mistakes if launching in review stage
  useEffect(() => {
    if (initialStage === 'review' && unreviewedMistakes.length > 0 && reviewItems.length === 0) {
      const items = unreviewedMistakes.map(m => ({
        id: m.id,
        title: m.title,
        subject_id: m.subject_id,
        subject_name: m.subject_name || '未分類科目',
        chapter_id: m.chapter_id,
        chapter_name: m.chapter_name || '一般章節',
        question_image_url: (m.data?.questionData?.q_img as string) || '',
        answer_image_url: (m.data?.answerData?.a_img as string) || '',
        familiarity_id: m.familiarity_id,
        error_reason_ids: m.error_reason_ids || []
      }));
      setReviewItems(items);
      setCurrentReviewIndex(0);
      setActiveTab('review');
    }
  }, [initialStage, unreviewedMistakes, reviewItems.length]);

  // Extract subjects and chapters for prompt injection
  const currentStructureText = useMemo(() => {
    const lines: string[] = [];
    categories.subjects.forEach(subj => {
      const chaps = categories.chapters.filter(c => c.subject_id === subj.id);
      if (chaps.length > 0) {
        lines.push(`- 科目【${subj.name}】：章節包含 [${chaps.map(c => c.name).join('、')}]`);
      } else {
        lines.push(`- 科目【${subj.name}】`);
      }
    });
    return lines.length > 0 ? lines.join('\n') : '- 尚未建立科目（請自由建議合適的學科與章節名稱）';
  }, [categories]);

  // Generate the specialized Exam Batch Import Prompt
  const generatedPrompt = useMemo(() => {
    return `你是一位專業的升學考試解題分析家。我將上傳一整份考卷的所有題目照片與解析照片。
請協助我逐題進行「題目與解析配對」以及「科目章節精準分類」。

目前我的錯題本中已存在的科目與章節架構如下：
${currentStructureText}

請依據下列原則進行分析：
1. 圖片配對順序：
   - 使用者將依序上傳多張「題目照片」與「解析照片」。
   - 請辨識並建立索引：例如第 1 題題目對應到題目照片清單中的第 1 張 (question_image_index: 1)，其解析對應到解析照片清單中的第 1 張 (answer_image_index: 1)。
2. 科目與章節對齊：
   - 請優先配對上述現有的科目與章節。
   - 若考卷題目的考點完全不屬於上述現有章節，請依高中課程標準自行給定簡明規範的科目與章節名稱。
3. 題目核心題旨摘要：
   - 提取 10 至 20 字以內的簡要觀念核心題旨（例如：「三次多項式插值與餘式定理」），不需要逐字謄打完整冗長題目或複雜數學公式。
4. 輸出格式限制：
   - 嚴格只回傳 JSON 陣列代碼區塊，不要輸出任何額外寒暄或開場白。

回傳 JSON 結構範例如下：
[
  {
    "index": 1,
    "title": "題目核心觀念題旨摘要",
    "subject_name": "數學",
    "chapter_name": "多項式函數",
    "question_image_index": 1,
    "answer_image_index": 1,
    "key_concept": "核心考點"
  }
]`;
  }, [currentStructureText]);

  // Handle Copy Prompt
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Handle File additions for Question & Answer zones
  const handleAddFiles = (files: FileList | null, type: 'question' | 'answer') => {
    if (!files || files.length === 0) return;
    const newItems: Array<{ id: string; name: string; url: string }> = [];
    Array.from(files).forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      newItems.push({
        id: `${type}_${Date.now()}_${idx}`,
        name: file.name || `${type === 'question' ? '題目圖' : '解析圖'}_${idx + 1}`,
        url
      });
    });

    if (type === 'question') {
      setQuestionImages(prev => [...prev, ...newItems]);
    } else {
      setAnswerImages(prev => [...prev, ...newItems]);
    }
  };

  // 1-Click Load Sample Demo Data
  const handleLoadSampleData = () => {
    setQuestionImages([
      { id: 'q_1', name: '數學考卷_第1題.png', url: SAMPLE_QUESTION_IMG_1 },
      { id: 'q_2', name: '物理考卷_第2題.png', url: SAMPLE_QUESTION_IMG_2 },
      { id: 'q_3', name: '化學考卷_第3題.png', url: SAMPLE_QUESTION_IMG_3 }
    ]);
    setAnswerImages([
      { id: 'a_1', name: '數學詳解_第1題.png', url: SAMPLE_ANSWER_IMG_1 },
      { id: 'a_2', name: '物理詳解_第2題.png', url: SAMPLE_ANSWER_IMG_2 },
      { id: 'a_3', name: '化學詳解_第3題.png', url: SAMPLE_ANSWER_IMG_3 }
    ]);
    setAiJsonInput(SAMPLE_AI_JSON);
    setParseError('');
  };

  // Real-time Parse JSON whenever input changes
  useEffect(() => {
    if (!aiJsonInput.trim()) {
      setParsedQuestions([]);
      setParseError('');
      return;
    }

    try {
      // Strip markdown code fences if present
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

      // Check existing subjects & chapters
      const existingSubjNames = new Set(categories.subjects.map(s => s.name.trim().toLowerCase()));
      const existingChapNames = new Set(categories.chapters.map(c => c.name.trim().toLowerCase()));

      const enriched: ParsedExamQuestion[] = parsed.map((item, i) => {
        const sName = (item.subject_name || '未分類科目').trim();
        const cName = (item.chapter_name || '一般章節').trim();
        return {
          index: item.index || i + 1,
          title: item.title || `考卷第 ${i + 1} 題`,
          subject_name: sName,
          chapter_name: cName,
          unit_name: item.unit_name,
          question_image_index: item.question_image_index || i + 1,
          answer_image_index: item.answer_image_index || i + 1,
          key_concept: item.key_concept,
          is_new_subject: !existingSubjNames.has(sName.toLowerCase()),
          is_new_chapter: !existingChapNames.has(cName.toLowerCase())
        };
      });

      setParsedQuestions(enriched);
      setParseError('');
    } catch (err: any) {
      setParseError('JSON 語法解析錯誤，請確認 AI 產出格式正確');
    }
  }, [aiJsonInput, categories]);

  // Proceed from Step 2 to Step 3: Launch Fast Review Wizard
  const handleStartReview = () => {
    if (parsedQuestions.length === 0) {
      setParseError('請先貼上 AI 分析結果或點選載入測試範例');
      return;
    }

    // Build review items pairing with actual loaded images
    const items = parsedQuestions.map((q, idx) => {
      // Find matching question image by index (1-based)
      const qImg = questionImages[q.question_image_index - 1]?.url || questionImages[idx]?.url || '';
      const aImg = answerImages[q.answer_image_index - 1]?.url || answerImages[idx]?.url || '';

      const matchedSubj = categories.subjects.find(s => s.name.trim().toLowerCase() === q.subject_name.trim().toLowerCase());
      const matchedChap = categories.chapters.find(c => c.name.trim().toLowerCase() === q.chapter_name.trim().toLowerCase());

      return {
        id: `draft_${Date.now()}_${idx}`,
        title: q.title,
        subject_id: matchedSubj?.id || null,
        subject_name: q.subject_name,
        chapter_id: matchedChap?.id || null,
        chapter_name: q.chapter_name,
        question_image_url: qImg,
        answer_image_url: aImg,
        familiarity_id: null,
        error_reason_ids: [],
        is_new_chapter: q.is_new_chapter,
        key_concept: q.key_concept
      };
    });

    setReviewItems(items);
    setCurrentReviewIndex(0);
    setIsErrorDrawerOpen(false);
    setSelectedErrorReasons([]);
    setActiveTab('review');
  };

  // Review Action: Choose Familiarity for current question (1-click fast advance)
  const handleAssignFamiliarity = (famId: string) => {
    setReviewItems(prev => {
      const updated = [...prev];
      if (updated[currentReviewIndex]) {
        updated[currentReviewIndex] = {
          ...updated[currentReviewIndex],
          familiarity_id: famId,
          error_reason_ids: selectedErrorReasons
        };
      }
      return updated;
    });

    // Reset error drawer for next question
    setIsErrorDrawerOpen(false);
    setSelectedErrorReasons([]);

    // Advance to next or complete
    if (currentReviewIndex + 1 < reviewItems.length) {
      setCurrentReviewIndex(prev => prev + 1);
    } else {
      finishAllReviews(reviewItems.map((item, idx) => 
        idx === currentReviewIndex 
          ? { ...item, familiarity_id: famId, error_reason_ids: selectedErrorReasons } 
          : item
      ));
    }
  };

  // Omnipresent Action: Mark all remaining as unfamiliar & finish immediately
  const handleMarkAllAsUnfamiliar = () => {
    // Find lowest familiarity (default: '完全生疏' or first familiarity)
    const lowestFam = categories.familiarities.find(f => f.color === 'danger') || categories.familiarities[0];
    const lowestId = lowestFam ? lowestFam.id : 'fam_unfamiliar';

    const completed = reviewItems.map((item, idx) => {
      if (idx < currentReviewIndex && item.familiarity_id) {
        return item; // Keep already marked
      }
      return {
        ...item,
        familiarity_id: lowestId,
        error_reason_ids: item.error_reason_ids || []
      };
    });

    finishAllReviews(completed);
  };

  // Finish review and persist to notebook
  const finishAllReviews = async (finalItems: typeof reviewItems) => {
    setSubmittingBatch(true);
    
    // Simulate D1 write / creation of new chapters
    try {
      if (onRefreshCategories) {
        await onRefreshCategories();
      }
      const newMistakes: MistakeRecord[] = finalItems.map((item, idx) => ({
        id: `mistake_batch_${Date.now()}_${idx}`,
        title: item.title,
        subject_id: item.subject_id,
        subject_name: item.subject_name,
        chapter_id: item.chapter_id,
        chapter_name: item.chapter_name,
        unit_id: null,
        familiarity_id: item.familiarity_id,
        error_reason_ids: item.error_reason_ids,
        tags: ['考卷批次匯入'],
        mistake_date: new Date().toISOString().split('T')[0],
        template_id: 'default_template',
        template_fields: {
          questionFields: [{ id: 'q_img', type: 'image', label: '題目截圖' }],
          answerFields: [{ id: 'a_img', type: 'image', label: '解析截圖' }]
        },
        data: {
          questionData: { q_img: item.question_image_url },
          answerData: { a_img: item.answer_image_url }
        },
        created_at: Date.now() + idx
      }));

      onBatchImportComplete(newMistakes);
      setActiveTab('completed');
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
      if (!r.parent_id) return true; // Universal
      return r.parent_id === currentItem.subject_id;
    });
  }, [categories.errorReasons, currentItem]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fade-in" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div className="notebook-page washi-tape-strip" style={{
        width: '100%',
        maxWidth: '1080px',
        maxHeight: '92vh',
        backgroundColor: 'var(--notebook-paper)',
        borderRadius: '16px',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 20px 48px rgba(60, 40, 20, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '3px solid var(--accent-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(180, 83, 9, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI 考卷批次匯入與極速審核
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                免付費 AI 智慧辨識分類 ➔ 雙區圖檔秒配對 ➔ 1-Click 極速熟悉度卡片審核
              </p>
            </div>
          </div>

          {/* Workflow Tabs Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              padding: '3px',
              backgroundColor: 'rgba(180, 83, 9, 0.08)',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)'
            }}>
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
                1. 取得提詞
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
                2. 雙區選圖與匯入
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* TAB 1: 專屬提詞產生器 */}
          {activeTab === 'prompt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '16px 20px',
                backgroundColor: 'rgba(180, 83, 9, 0.04)',
                border: '1px dashed var(--glass-border)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
              }}>
                <div style={{ color: 'var(--accent-primary)', marginTop: '2px' }}>
                  <HelpCircle size={20} />
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong>三步驟輕鬆完成：</strong><br />
                  1. 點擊下方按鈕複製專用提詞。<br />
                  2. 開啟任何免費 AI 網頁（如 ChatGPT、Gemini 或 Claude），同時上傳整份考卷照片並貼上提詞。<br />
                  3. 取得 AI 回覆的 JSON 代碼後，點擊「前往下一步：雙區選圖與匯入」貼上即可！
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    考卷批次分析專用提詞（已自動注入現有科目與章節清單）：
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="btn btn-secondary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: copiedPrompt ? 'var(--success)' : undefined,
                      color: copiedPrompt ? '#FFFFFF' : undefined,
                      borderColor: copiedPrompt ? 'var(--success)' : undefined
                    }}
                  >
                    {copiedPrompt ? <Check size={15} /> : <Copy size={15} />}
                    {copiedPrompt ? '已成功複製至剪貼簿！' : '一鍵複製提詞'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={generatedPrompt}
                  style={{
                    width: '100%',
                    height: '280px',
                    padding: '14px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveTab('import')}
                  style={{ padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  前往下一步：雙區選圖與匯入 <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 雙區選圖與 JSON 貼上面板 */}
          {activeTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Header Action Bar with Sample Data Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: 'rgba(25, 122, 39, 0.05)',
                border: '1px solid rgba(25, 122, 39, 0.2)',
                borderRadius: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={18} style={{ color: 'var(--success)' }} />
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    本地開發預覽模式：若手邊無考卷圖檔，可一鍵載入真實題解樣品資料立即體驗！
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    borderColor: 'var(--success)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={14} /> 載入測試範例資料（1-Click Sample）
                </button>
              </div>

              {/* Dual Dropzone Containers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                {/* Zone 1: Question Images */}
                <div style={{
                  padding: '18px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
                      1. 題目圖片放置區（共 {questionImages.length} 張）
                    </label>
                    {questionImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setQuestionImages([])}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        清空
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={questionInputRef}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleAddFiles(e.target.files, 'question')}
                  />

                  <div
                    onClick={() => questionInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--glass-border)',
                      borderRadius: '8px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      backgroundColor: 'var(--notebook-paper)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleAddFiles(e.dataTransfer.files, 'question');
                    }}
                  >
                    <Upload size={24} style={{ color: 'var(--accent-primary)', margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      點擊選取或拖曳考卷「題目照片」至此
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      支援手機相簿多選；依選取順序對齊題目索引 1, 2, 3...
                    </div>
                  </div>

                  {/* Thumbnails row */}
                  {questionImages.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto',
                      padding: '6px 2px'
                    }}>
                      {questionImages.map((img, idx) => (
                        <div key={img.id} style={{
                          flexShrink: 0,
                          width: '76px',
                          height: '56px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid var(--glass-border)',
                          position: 'relative'
                        }}>
                          <img src={img.url} alt={`題目 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <span style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            backgroundColor: 'rgba(28, 25, 23, 0.85)',
                            color: '#FFFFFF',
                            fontSize: '0.65rem',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Zone 2: Explanation Images */}
                <div style={{
                  padding: '18px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      2. 解析圖片放置區（共 {answerImages.length} 張）
                    </label>
                    {answerImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAnswerImages([])}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        清空
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={answerInputRef}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleAddFiles(e.target.files, 'answer')}
                  />

                  <div
                    onClick={() => answerInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--glass-border)',
                      borderRadius: '8px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      backgroundColor: 'var(--notebook-paper)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleAddFiles(e.dataTransfer.files, 'answer');
                    }}
                  >
                    <Upload size={24} style={{ color: 'var(--success)', margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      點擊選取或拖曳解答「解析照片」至此
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      支援手機相簿多選；依選取順序對齊解析索引 1, 2, 3...
                    </div>
                  </div>

                  {/* Thumbnails row */}
                  {answerImages.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto',
                      padding: '6px 2px'
                    }}>
                      {answerImages.map((img, idx) => (
                        <div key={img.id} style={{
                          flexShrink: 0,
                          width: '76px',
                          height: '56px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid var(--glass-border)',
                          position: 'relative'
                        }}>
                          <img src={img.url} alt={`解析 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <span style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            backgroundColor: 'rgba(25,122,39,0.85)',
                            color: '#FFFFFF',
                            fontSize: '0.65rem',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Paste AI JSON Textarea */}
              <div style={{
                padding: '18px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    3. 貼上外部 AI 分析結果 (JSON 代碼)：
                  </label>
                  {aiJsonInput && (
                    <span style={{ fontSize: '0.8rem', color: parseError ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {parseError ? parseError : `已成功辨識 ${parsedQuestions.length} 道題目`}
                    </span>
                  )}
                </div>
                <textarea
                  placeholder="請在此貼上 ChatGPT、Gemini 或 Claude 回傳的 JSON 陣列..."
                  value={aiJsonInput}
                  onChange={(e) => setAiJsonInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '110px',
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    border: parseError ? '1px solid var(--danger)' : '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--notebook-paper)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Matched Pairs Preview Grid */}
              {parsedQuestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      即時配對確認預覽（共 {parsedQuestions.length} 題）：
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      系統自動將照片與 AI 章節對應，並提示自動新建章節
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {parsedQuestions.map((q, idx) => {
                      const qThumb = questionImages[q.question_image_index - 1]?.url || questionImages[idx]?.url;
                      const aThumb = answerImages[q.answer_image_index - 1]?.url || answerImages[idx]?.url;

                      return (
                        <div key={q.index} style={{
                          padding: '12px 16px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid var(--glass-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '0.92rem',
                              color: 'var(--accent-primary)',
                              fontVariantNumeric: 'tabular-nums',
                              minWidth: '38px'
                            }}>
                              第 {q.index} 題
                            </span>

                            {/* Question Thumbnail */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '56px',
                                height: '42px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: '1px solid var(--glass-border)',
                                backgroundColor: '#FAF7F0'
                              }}>
                                {qThumb ? (
                                  <img src={qThumb} alt="題目縮圖" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '42px' }}>
                                    無圖
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>➔</span>
                              {/* Answer Thumbnail */}
                              <div style={{
                                width: '56px',
                                height: '42px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: '1px solid var(--glass-border)',
                                backgroundColor: '#FAF7F0'
                              }}>
                                {aThumb ? (
                                  <img src={aThumb} alt="解析縮圖" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '42px' }}>
                                    無圖
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Title & Key concept */}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {q.title}
                              </div>
                              {q.key_concept && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  考點：{q.key_concept}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Categories Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              backgroundColor: 'rgba(180, 83, 9, 0.1)',
                              color: 'var(--accent-primary)'
                            }}>
                              {q.subject_name}
                            </span>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              backgroundColor: 'rgba(77, 124, 15, 0.1)',
                              color: 'var(--success)'
                            }}>
                              {q.chapter_name}
                            </span>
                            {q.is_new_chapter && (
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: 'var(--warning-bg)',
                                color: 'var(--warning-text)',
                                border: '1px solid var(--warning-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <FolderPlus size={11} /> 將自動建章
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Confirm Action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
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
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(180, 83, 9, 0.22)'
                  }}
                >
                  確認配對，建檔並啟動極速審核 <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 極速卡片審核精靈 (FAST REVIEW WIZARD) */}
          {activeTab === 'review' && currentItem && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
              {/* Wizard Top Status & Omnipresent Action Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 18px',
                backgroundColor: 'rgba(180, 83, 9, 0.05)',
                borderRadius: '10px',
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    審核進度：第 {currentReviewIndex + 1} / {reviewItems.length} 題
                  </span>
                  {/* Subtle Progress Bar */}
                  <div style={{
                    width: '120px',
                    height: '8px',
                    backgroundColor: 'rgba(60, 40, 20, 0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${((currentReviewIndex + 1) / reviewItems.length) * 100}%`,
                      height: '100%',
                      backgroundColor: 'var(--accent-secondary)',
                      transition: 'width 0.3s'
                    }} />
                  </div>
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
                    boxShadow: '0 1px 3px rgba(185, 28, 28, 0.1)',
                    opacity: submittingBatch ? 0.7 : 1
                  }}
                  title="點擊後，本批次所有尚未標記的題目將一律設為完全生疏並直接完成歸檔"
                >
                  <RotateCcw size={14} /> 全部一律標示為不會（一鍵秒歸檔）
                </button>
              </div>

              {/* Central Card: Side-by-Side Question & Answer Visuals */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 16px rgba(60, 40, 20, 0.06)'
              }}>
                {/* Meta Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {currentItem.title}
                    </h3>
                    {currentItem.key_concept && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                        核心考點：{currentItem.key_concept}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(180, 83, 9, 0.1)',
                      color: 'var(--accent-primary)'
                    }}>
                      {currentItem.subject_name}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(77, 124, 15, 0.1)',
                      color: 'var(--success)'
                    }}>
                      {currentItem.chapter_name}
                    </span>
                  </div>
                </div>

                {/* Dual Column Image Previews */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px'
                }}>
                  {/* Left Column: Question Image */}
                  <div style={{
                    backgroundColor: 'var(--notebook-paper)',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(180, 83, 9, 0.08)',
                      borderBottom: '1px solid var(--glass-border)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>題目畫面</span>
                      {onOpenZoomedImage && (
                        <button
                          type="button"
                          onClick={() => onOpenZoomedImage(currentItem.question_image_url)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                        >
                          <Maximize2 size={13} />
                        </button>
                      )}
                    </div>
                    <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
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

                  {/* Right Column: Answer Image */}
                  <div style={{
                    backgroundColor: 'var(--notebook-paper)',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(25, 122, 39, 0.05)',
                      borderBottom: '1px solid var(--glass-border)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>解析畫面</span>
                      {onOpenZoomedImage && (
                        <button
                          type="button"
                          onClick={() => onOpenZoomedImage(currentItem.answer_image_url)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                        >
                          <Maximize2 size={13} />
                        </button>
                      )}
                    </div>
                    <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                      {currentItem.answer_image_url ? (
                        <img
                          src={currentItem.answer_image_url}
                          alt="解析"
                          style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '4px' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>無解析圖檔</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Interaction: 1-Click Large Familiarity Buttons */}
                <div style={{
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      單擊選擇熟悉度（點擊後自動秒存並切換下一題）：
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      快捷單擊速刷
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {/* Level 1: 完全生疏 */}
                    <button
                      type="button"
                      onClick={() => handleAssignFamiliarity('fam_danger')}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: '2px solid rgba(185, 28, 28, 0.4)',
                        backgroundColor: '#FFF5F5',
                        color: 'var(--danger)',
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s',
                        boxShadow: '0 2px 6px rgba(185, 28, 28, 0.08)'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--danger)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(185, 28, 28, 0.4)'; }}
                    >
                      <span>完全生疏</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 500, opacity: 0.85 }}>毫無頭緒 / 錯因嚴重</span>
                    </button>

                    {/* Level 2: 稍微理解 */}
                    <button
                      type="button"
                      onClick={() => handleAssignFamiliarity('fam_warning')}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: '2px solid rgba(217, 119, 6, 0.4)',
                        backgroundColor: '#FFFBEB',
                        color: '#B45309',
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s',
                        boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#D97706'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(217, 119, 6, 0.4)'; }}
                    >
                      <span>稍微理解</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 500, opacity: 0.85 }}>看詳解懂 / 計算粗心</span>
                    </button>

                    {/* Level 3: 熟練掌握 */}
                    <button
                      type="button"
                      onClick={() => handleAssignFamiliarity('fam_success')}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '10px',
                        border: '2px solid rgba(25, 122, 39, 0.4)',
                        backgroundColor: '#F0FDF4',
                        color: 'var(--success)',
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s',
                        boxShadow: '0 2px 6px rgba(25, 122, 39, 0.08)'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--success)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(25, 122, 39, 0.4)'; }}
                    >
                      <span>熟練掌握</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 500, opacity: 0.85 }}>已完全弄懂 / 可自信作答</span>
                    </button>
                  </div>
                </div>

                {/* Optional Collapsible Drawer: 錯因分類標籤 (可略過) */}
                <div style={{
                  borderTop: '1px dashed var(--glass-border)',
                  paddingTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
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
                      {isErrorDrawerOpen ? '收合錯因分類標籤' : '+ 標記錯因分類（非強制，可點此展開勾選）'}
                      {isErrorDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {isErrorDrawerOpen && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        點選標籤勾選，不選可直接按熟悉度跳過
                      </span>
                    )}
                  </div>

                  {isErrorDrawerOpen && (
                    <div style={{
                      padding: '14px',
                      backgroundColor: 'var(--notebook-paper)',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                                backgroundColor: isSelected ? 'var(--accent-primary)' : '#FFFFFF',
                                color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                                fontSize: '0.82rem',
                                fontWeight: isSelected ? 600 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {reason.name}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedErrorReasons([]);
                            setIsErrorDrawerOpen(false);
                          }}
                          style={{
                            padding: '4px 10px',
                            background: 'none',
                            border: 'none',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          略過錯因（不標記）
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 完成歸檔畫面 (COMPLETED) */}
          {activeTab === 'completed' && (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }} className="animate-fade-in">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(25, 122, 39, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
                marginBottom: '8px'
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                整份考卷錯題已全數建檔完成！
              </h3>
              <p style={{ margin: 0, fontSize: '0.94rem', color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.6 }}>
                本批共 <strong style={{ color: 'var(--accent-primary)', fontVariantNumeric: 'tabular-nums' }}>{reviewItems.length} 道錯題</strong> 已自動依學科與章節歸納入庫，並記錄專屬熟悉度狀態。
              </p>

              <div style={{ display: 'flex', gap: '14px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onClose}
                  style={{ padding: '10px 24px', fontSize: '0.92rem', fontWeight: 600 }}
                >
                  返回數位書架查看活頁手帳
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuestionImages([]);
                    setAnswerImages([]);
                    setAiJsonInput('');
                    setParsedQuestions([]);
                    setReviewItems([]);
                    setActiveTab('import');
                  }}
                  style={{ padding: '10px 20px', fontSize: '0.92rem' }}
                >
                  繼續匯入下一份考卷
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
