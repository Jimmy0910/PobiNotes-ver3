import {
  type CategoriesBundle,
  type MistakeRecord,
  formatPct,
  getEffectiveFamiliarityName
} from '../types';
import { extractMistakeMediaAndText } from './mistakeMedia';

export interface PromptTemplateItem {
  id: string;
  base_key?: string | null;
  name: string;
  description: string;
  content: string;
  isBuiltIn?: boolean;
  isModified?: boolean;
  isRecommended?: boolean;
}

export const BUILTIN_PROMPT_TEMPLATES: PromptTemplateItem[] = [
  {
    id: 'builtin_gsat_science_recommended',
    base_key: 'gsat_science_recommended',
    name: '跨科目通用診斷與複習',
    description: '依題目實際科目、章節與單元調整分析方法；保留證據，不預設學科分類',
    isBuiltIn: true,
    isRecommended: true,
    content: `請根據我提供的錯題紀錄，協助我診斷理解落差並安排有效複習。請先辨識每題所屬科目、章節、單元與題型，再選擇適合該學科的分析方式；不得把單一科目的分類或解題框架套用到其他科目。

範圍：{{科目清單}}／{{章節清單}}／{{單元清單}}
錯題總數：{{錯題總數}}
熟悉度分布：{{熟悉度分布}}
已標記錯因：{{主要錯因分布}}

完整錯題資料：
{{錯題完整清單}}

請依下列原則整理：
1. 以題目、作答紀錄、答案解析和使用者標記為依據。保留資料中的原科目、章節、單元、題號與專業用語；不可只憑單元名稱推定考點。
2. 依各科內容選擇合適方法。例如：數學與自然科檢查概念、條件、公式、推理步驟、圖表或單位；語文科檢查文本證據、語意、語法、修辭或表達；社會與其他科目則依資料中的概念、史料、地圖、制度或證據分析。只採用與題目相關的項目，不要硬套範例。
3. 分開記錄「資料明示的錯因」與「根據作答推測的可能原因」。沒有足夠證據時標示「待確認」；缺少題目、作答或解析時標示「資料不足」，並指出需要補充的內容。
4. 依實際教材層級整理成科目 → 章節 → 單元 → 題號。合併重複考點，但保留每題的關鍵條件與差異；不要自行新增不存在的章節或考點。
5. 為每個考點提供簡明正確觀念、易混淆處、可操作的訂正步驟，以及一道同概念但改變條件或問法的練習方向。不要在缺少依據時猜測標準答案。
6. 依錯題數量、錯因標記與熟悉度提出複習順序，並註明每項判斷所依據的題號。不同科目分段整理，輸出使用繁體中文。

輸出順序：範圍摘要、科目與章節考點整理、逐題診斷與證據、待確認／資料不足項目、訂正與變式練習、複習優先順序。`
  },
  {
    id: 'builtin_active_recall',
    base_key: 'active_recall',
    name: '主動回想模板',
    description: '遮蔽解答、引導自己逐步回想核心觀念與解題線索的蘇格拉底式提問',
    isBuiltIn: true,
    content: `請扮演一位擅長「主動回想（Active Recall）」與蘇格拉底式引導的家教老師。
我目前整理了 {{錯題總數}} 道錯題（涵蓋科目：{{科目清單}}｜章節：{{章節清單}}｜單元：{{單元清單}}）。

請針對以下錯題，**先不要直接告訴我最終答案**，而是：
1. 針對每道題目的核心觀念提出 2～3 個引導式問題，測試我是否真正理解。
2. 根據我標記的「錯因（{{主要錯因分布}}）」與「熟悉度（{{熟悉度分布}}）」，提醒我作答時最容易踩到的陷阱。
3. 最後再提供結構化的觀念檢核清單。

=== 錯題資料明細 ===
{{錯題完整清單}}`
  },
  {
    id: 'builtin_error_analysis',
    base_key: 'error_analysis',
    name: '錯因分析模板',
    description: '深入剖析錯誤原因（如觀念不清、圖表判讀、忽略條件）並給出具體修正對策',
    isBuiltIn: true,
    content: `請協助我進行「錯題錯因深度診斷」。
本次篩選共 {{錯題總數}} 題，涉及科目：{{科目清單}}，熟悉度分布為：{{熟悉度分布}}，主要錯因分布為：{{主要錯因分布}}。

請根據以下錯題紀錄與我標記的錯因，幫我分析：
1. 這些錯題背後反映出的共同思維盲點或知識斷層是什麼？
2. 針對每個錯因類別（特別是出現頻率最高的原因），制定具體的「解題標準檢查步驟（SOP）」。
3. 設計 2 道同觀念但改變問法的變形練習題，幫助我確認是否已克服該錯因。

=== 錯題資料明細 ===
{{錯題完整清單}}`
  },
  {
    id: 'builtin_chapter_review',
    base_key: 'chapter_review',
    name: '依章節複習模板',
    description: '依科目、章節與單元階層整理重點觀念樹與知識地圖',
    isBuiltIn: true,
    content: `請幫我將以下 {{錯題總數}} 道錯題依照「科目 -> 章節 -> 單元」階層進行系統化複習整理（目前範圍：{{科目清單}} / {{章節清單}} / {{單元清單}}）。

請輸出：
1. 各章節與單元的核心考點摘要與觀念關聯表。
2. 每道錯題對應的「必備公式／原理」與「常見迷思澄清」。
3. 依照目前熟悉度（{{熟悉度分布}}），排列出建議的複習優先順序。

=== 錯題資料明細 ===
{{錯題完整清單}}`
  },
  {
    id: 'builtin_exam_summary',
    base_key: 'exam_summary',
    name: '考前錯題統整模板',
    description: '濃縮成考前 15 分鐘快速掃描的必考重點、易錯警示與搶分口訣',
    isBuiltIn: true,
    content: `我即將參加考試，請將以下 {{錯題總數}} 道錯題濃縮成一份「考前極速衝刺複習講義」（科目：{{科目清單}}｜錯因統計：{{主要錯因分布}}）。

請包含：
1. 【考前 3 分鐘必看警示】：從我的錯因與「不會／卡」題目中提煉出最關鍵的 5 個避坑提醒。
2. 【觀念對照速記表】：將容易混淆的定義、條件或圖表判讀重點整理成 Markdown 表格。
3. 【逐題一語道破】：用一到兩句話總結每道錯題的破題關鍵。

=== 錯題資料明細 ===
{{錯題完整清單}}`
  },
  {
    id: 'builtin_custom_blank',
    base_key: 'custom_blank',
    name: '完全自訂模板',
    description: '自由編寫提詞結構並插入錯題變數標籤',
    isBuiltIn: true,
    content: `請根據以下我整理的 {{錯題總數}} 道錯題（科目：{{科目清單}}｜章節：{{章節清單}}｜熟悉度：{{熟悉度分布}}｜錯因：{{主要錯因分布}}），協助我整理重點與複習建議：

{{錯題完整清單}}`
  }
];

export function mergePromptTemplates(savedTemplates: any[]): PromptTemplateItem[] {
  const safeSaved = Array.isArray(savedTemplates) ? savedTemplates : [];
  const mergedBuiltIns = BUILTIN_PROMPT_TEMPLATES.map(b => {
    const override = safeSaved.find(s => s.base_key === b.base_key);
    if (override) {
      return {
        id: override.id,
        base_key: b.base_key,
        name: override.name,
        description: override.description || b.description,
        content: override.content,
        isBuiltIn: true,
        isModified: true,
        isRecommended: b.isRecommended
      };
    }
    return b;
  });

  const pureCustom = safeSaved
    .filter(s => !s.base_key)
    .map(s => ({
      id: s.id,
      base_key: null,
      name: s.name,
      description: s.description || '使用者自訂提詞模板',
      content: s.content,
      isBuiltIn: false
    }));

  return [...mergedBuiltIns, ...pureCustom];
}

export interface MistakeZipImageMapping {
  questionFiles: string[];
  answerFiles: string[];
}

export function renderPromptWithMistakes(
  templateContent: string,
  selectedMistakes: MistakeRecord[],
  categories: CategoriesBundle,
  zipImageMap?: Record<string, MistakeZipImageMapping>
): string {
  const count = selectedMistakes.length;
  const subjectsSet = new Set<string>();
  const chaptersSet = new Set<string>();
  const unitsSet = new Set<string>();
  const famCounts: Record<string, number> = {};
  const reasonCounts: Record<string, number> = {};

  selectedMistakes.forEach(m => {
    subjectsSet.add(m.subject_name || '未分類科目');
    chaptersSet.add(m.chapter_name || '未分類章節');
    if (m.unit_name) unitsSet.add(m.unit_name);

    const famName = getEffectiveFamiliarityName(m, categories.familiarities) || '尚未設定熟悉度';
    famCounts[famName] = (famCounts[famName] || 0) + 1;

    const rNames = Array.isArray(m.error_reason_names) && m.error_reason_names.length > 0
      ? m.error_reason_names
      : ['未標記錯因'];
    rNames.forEach(rn => {
      reasonCounts[rn] = (reasonCounts[rn] || 0) + 1;
    });
  });

  const subjectListStr = Array.from(subjectsSet).join('、') || '無';
  const chapterListStr = Array.from(chaptersSet).join('、') || '無';
  const unitListStr = Array.from(unitsSet).join('、') || '無指定單元';

  const famDistStr = Object.entries(famCounts)
    .map(([k, v]) => `${k} ${v} 題 (${formatPct(v, count)})`)
    .join('、') || '尚無資料';

  const reasonDistStr = Object.entries(reasonCounts)
    .map(([k, v]) => `${k} ${v} 題 (${formatPct(v, count)})`)
    .join('、') || '尚無資料';

  const detailsBlocks = selectedMistakes.map((m, idx) => {
    const media = extractMistakeMediaAndText(m);
    const famName = getEffectiveFamiliarityName(m, categories.familiarities) || '尚未設定';
    const reasonsStr = (m.error_reason_names && m.error_reason_names.length > 0)
      ? m.error_reason_names.join('、')
      : '未標記';
    const tagsStr = (m.tags && m.tags.length > 0) ? m.tags.join('、') : '無';
    const mapped = zipImageMap?.[m.id];

    let questionBody = media.qDesc || '';
    if (mapped && mapped.questionFiles.length > 0) {
      const refLine = `附帶題目圖片檔案：${mapped.questionFiles.join('、')}`;
      questionBody = questionBody ? `${questionBody}\n${refLine}` : `[請檢視壓縮包內題目圖片] ${refLine}`;
    } else if (!questionBody && media.qImages.length > 0) {
      questionBody = '[注意：此題目僅有圖片而無題目文字，純文字提詞未包含圖片內容，請搭配壓縮包內圖片檔分析]';
    } else if (!questionBody) {
      questionBody = '（無題目文字）';
    } else if (media.qImages.length > 0) {
      questionBody += `\n[提示：此題另附有 ${media.qImages.length} 張題目圖片]`;
    }

    let answerBody = media.aDesc || '';
    if (mapped && mapped.answerFiles.length > 0) {
      const refLine = `附帶解析圖片檔案：${mapped.answerFiles.join('、')}`;
      answerBody = answerBody ? `${answerBody}\n${refLine}` : `[請檢視壓縮包內解析圖片] ${refLine}`;
    } else if (!answerBody && media.aImages.length > 0) {
      answerBody = `[此題附有 ${media.aImages.length} 張解析圖片]`;
    } else if (!answerBody) {
      answerBody = '（無文字解析）';
    } else if (media.aImages.length > 0) {
      answerBody += `\n[提示：此題另附有 ${media.aImages.length} 張解析圖片]`;
    }

    return [
      `【第 ${idx + 1} 題】${m.title}`,
      `- 分類：科目「${m.subject_name || '未分類'}」＞ 章節「${m.chapter_name || '未分類'}」${m.unit_name ? `＞ 單元「${m.unit_name}」` : ''}`,
      `- 熟悉度：${famName} ｜ 錯因：${reasonsStr} ｜ 日期：${m.mistake_date || new Date(m.created_at).toLocaleDateString()} ｜ 標籤：${tagsStr}`,
      `- 題目內容：\n${questionBody}`,
      `- 答案與解析：\n${answerBody}`
    ].join('\n');
  }).join('\n\n----------------------------------------\n\n');

  const replacements: Record<string, string> = {
    '{{錯題總數}}': String(count),
    '{{科目清單}}': subjectListStr,
    '{{章節清單}}': chapterListStr,
    '{{單元清單}}': unitListStr,
    '{{熟悉度分布}}': famDistStr,
    '{{主要錯因分布}}': reasonDistStr,
    '{{錯題完整清單}}': detailsBlocks || '（尚未勾選任何錯題）'
  };

  let output = templateContent;
  for (const [token, val] of Object.entries(replacements)) {
    output = output.split(token).join(val);
  }

  if (!templateContent.includes('{{錯題完整清單}}') && detailsBlocks) {
    output += `\n\n=== 錯題資料明細 ===\n${detailsBlocks}`;
  }

  return output;
}
