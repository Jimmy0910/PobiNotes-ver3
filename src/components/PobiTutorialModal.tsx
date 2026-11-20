import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../utils/api';
import type { CategoriesBundle } from '../types';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Sparkles,
  FolderTree,
  RotateCcw,
  Printer,
  Loader2,
  Play
} from 'lucide-react';

interface PobiTutorialModalProps {
  categories: CategoriesBundle;
  isNewUser?: boolean;
  onClose: () => void;
  onRefreshAll: () => Promise<void>;
}

const TUTORIAL_STEPS = [
  {
    id: 1,
    title: '第 1 步：從零生成你的第一本錯題本',
    icon: BookOpen,
    speech:
      '汪！你好，我是比熊 POBI！歡迎來到 POBI STUDIO 錯題手帳。點一下下方按鈕，我可以立刻用測試資料幫你建立一本《POBI 教學範例-數學》錯題本（含章節、小單元與 2 題示範錯題），讓你安心練習所有功能！',
    highlights: [
      '在「我的書架」可為各科目挑選精裝書封色彩與徽章。',
      '你可以先用測試資料體驗流程，之後隨時透過書封右上角「⋮」選單重新命名或刪除。'
    ]
  },
  {
    id: 2,
    title: '第 2 步：單題錄入與 4 階段 AI 考卷批次匯入',
    icon: Sparkles,
    speech:
      '寫完模擬考有一堆錯題怎麼辦？在書架點擊「AI 考卷批次匯入」，跟著 4 個清晰步驟：1. 設計提詞 -> 2. 上傳圖片／AI 分析（支援一鍵打包 ZIP） -> 3. 調整順序與多張解析圖配對 -> 4. 極速審核入庫！',
    highlights: [
      '單題可在手帳內點擊「+ 新增錯題」，也支援在圖片上開啟紅筆手寫標註。',
      '4 階段拆分後，上傳圖片與調整配對不再擠在同一頁，平板操作更流暢。'
    ]
  },
  {
    id: 3,
    title: '第 3 步：三點選單快速管理與跨層級架構搬運',
    icon: FolderTree,
    speech:
      '分類管理已經直接整合到錯題本裡面囉！現在每本書封與每個章節標籤都有直立三個點「⋮」選單，可以一鍵分享題目包、重新命名、搬移層級或刪除。',
    highlights: [
      '書封「⋮」：分享此錯題本、重新命名、刪除。',
      '章節「⋮」：分享此章節題目包、重新命名、搬移（科目／章節／小單元三層下拉選單）、刪除。'
    ]
  },
  {
    id: 4,
    title: '第 4 步：書架三大模式與學習成效分析',
    icon: RotateCcw,
    speech:
      '書架現在有三大書本模式可以自由切換！除了「檢視與編輯模式」，切換到「閃卡複習模式」時，我會一步一步問你今天想複習哪個科目與章節，並自動記錄你的進步軌跡！',
    highlights: [
      '間隔重複排程：不會 (+1天)、卡 (+3天)、誤解 (+5天)、順 (+14天)。',
      '左側「學習概覽」可檢視各科精熟率與錯因分布圖表，點擊圖表可直接下鑽弱點題目。'
    ]
  },
  {
    id: 5,
    title: '第 5 步：試卷工坊列印、外部 AI 家教與完整備份',
    icon: Printer,
    speech:
      '考前衝刺時，可以到「列印試卷」產出無答案 A4 練習卷重新實戰；遇到想不通的難題，切換書架到「外部 AI 學習家教」模式即可一鍵產出名師思維樹提詞給 ChatGPT / Gemini / Claude！',
    highlights: [
      '書架右上角提供「備份與還原」，支援一鍵下載完整 ZIP（含圖片）保存所有心血。',
      '隨時可從書架右上角的「POBI 教學」按鈕再次重播這份互動導覽！'
    ]
  }
];

export default function PobiTutorialModal({
  categories,
  isNewUser = false,
  onClose,
  onRefreshAll
}: PobiTutorialModalProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [seededDone, setSeededDone] = useState(false);

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

  const currentStep = TUTORIAL_STEPS[stepIdx];
  const StepIcon = currentStep.icon;

  const handleGenerateTestData = async () => {
    if (seeding || seededDone) return;
    setSeeding(true);
    try {
      const demoSubjectName = 'POBI 教學範例-數學';
      let subjectId = categories.subjects.find(s => s.name === demoSubjectName)?.id || '';
      if (!subjectId) {
        const sRes = await apiRequest('/api/subjects', {
          method: 'POST',
          body: { name: demoSubjectName, color: 'navy_ink|Calculator' }
        });
        subjectId = sRes?.id || sRes?.subject?.id || sRes?.item?.id || '';
      }

      if (subjectId) {
        const chapRes = await apiRequest('/api/chapters', {
          method: 'POST',
          body: { name: '二次函數與極值', subjectId }
        });
        const chapId = chapRes?.id || chapRes?.chapter?.id || chapRes?.item?.id || null;

        let unitId: string | null = null;
        if (chapId) {
          const uRes = await apiRequest('/api/categories', {
            method: 'POST',
            body: { dimension: 'unit', name: '閉區間極值判別', parentId: chapId, subjectId }
          });
          unitId = uRes?.item?.id || null;
        }

        const famStuck = categories.familiarities.find(f => f.name === '卡') || categories.familiarities[0];
        const famHard = categories.familiarities.find(f => f.name === '不會') || categories.familiarities[0];
        const yesterday = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);

        await apiRequest('/api/mistakes', {
          method: 'POST',
          body: {
            subjectId,
            chapterId: chapId,
            unitId,
            familiarityId: famStuck?.id || null,
            tags: ['POBI教學範例', '學測必考'],
            mistakeDate: yesterday,
            templateId: null,
            title: '【教學範例 1】二次函數閉區間極值',
            data: {
              questionData: {
                q_desc: '已知 f(x) = x^2 - 4x + 7，求在閉區間 [0, 3] 上的最大值與最小值。'
              },
              answerData: {
                a_desc: '配方得 f(x) = (x - 2)^2 + 3，頂點 x = 2 在 [0, 3] 內，最小值為 3；端點 f(0)=7, f(3)=4，最大值為 7。'
              },
              reviewMeta: {
                nextReviewDate: yesterday,
                reviewCount: 1,
                history: [{ date: yesterday, timestamp: Date.now() - 86400000 * 2, familiarityId: famHard?.id || null, familiarityName: '不會' }]
              }
            }
          }
        });

        await apiRequest('/api/mistakes', {
          method: 'POST',
          body: {
            subjectId,
            chapterId: chapId,
            unitId: null,
            familiarityId: famHard?.id || null,
            tags: ['POBI教學範例', '判別式'],
            mistakeDate: yesterday,
            templateId: null,
            title: '【教學範例 2】一元二次方程式相異實根條件',
            data: {
              questionData: {
                q_desc: '若 x^2 - 6x + k = 0 有兩個相異實數解，求常數 k 的最大整數值。'
              },
              answerData: {
                a_desc: '判別式 D = 36 - 4k > 0 => k < 9，故最大整數 k = 8。'
              },
              reviewMeta: {
                nextReviewDate: yesterday,
                reviewCount: 0,
                history: []
              }
            }
          }
        });
      }

      await onRefreshAll();
      setSeededDone(true);
    } catch (err) {
      console.error('生成教學測試資料失敗:', err);
    } finally {
      setSeeding(false);
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
        zIndex: 100050,
        background: 'rgba(15, 23, 42, 0.74)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !seeding) onClose();
      }}
    >
      <div
        data-testid="pobi-tutorial-modal"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: 'min(88dvh, 88vh)',
          backgroundColor: 'var(--bg-secondary, #FFFFFF)',
          color: 'var(--text-primary, #1C1917)',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header with Top-Right Close Button */}
        <div
          style={{
            padding: '15px 20px',
            borderBottom: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={16} style={{ color: '#B45309' }} />
            <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#92400E' }}>
              POBI 互動教學模式 {isNewUser ? '（新帳戶導覽）' : '（重播）'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={seeding}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
            title="關閉教學"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Progress Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {TUTORIAL_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIdx(idx)}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: idx <= stepIdx ? '#D97706' : 'var(--glass-border)',
                  cursor: 'pointer',
                  padding: 0
                }}
                title={s.title}
              />
            ))}
          </div>

          {/* Step Heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: 'rgba(217, 119, 6, 0.14)', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <StepIcon size={19} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 700 }}>{currentStep.title}</h3>
          </div>

          {/* POBI Bichon Speech Bubble */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: '2px solid #D97706',
                backgroundColor: '#FFFBEB',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(180, 83, 9, 0.16)'
              }}
            >
              <img src="/pobi-mascot.jpg" alt="比熊 POBI" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }} />
            </div>
            <div
              style={{
                flex: 1,
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '12px',
                padding: '13px 15px',
                fontSize: '0.9rem',
                lineHeight: 1.65,
                color: '#1C1917'
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#B45309', marginBottom: '4px' }}>
                比熊 POBI 導覽員
              </div>
              {currentStep.speech}
            </div>
          </div>

          {/* Interactive Test Data Seeder on Step 1 */}
          {stepIdx === 0 && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                border: seededDone ? '1.5px solid #10B981' : '1.5px dashed #D97706',
                backgroundColor: seededDone ? '#ECFDF5' : 'var(--bg-primary, #FAF7F0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ fontSize: '0.84rem', color: seededDone ? '#065F46' : 'var(--text-secondary)', lineHeight: 1.5 }}>
                {seededDone ? (
                  <strong>已成功生成《POBI 教學範例-數學》錯題本與 2 題測試錯題！</strong>
                ) : (
                  <span>想要立刻實作體驗嗎？點此生成 1 本含章節、單元與範例題的測試錯題本：</span>
                )}
              </div>
              {!seededDone && (
                <button
                  type="button"
                  onClick={handleGenerateTestData}
                  disabled={seeding}
                  className="btn btn-primary"
                  style={{ padding: '7px 14px', fontSize: '0.83rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  data-testid="pobi-seed-test-data-btn"
                >
                  {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{seeding ? '生成測試錯題本中...' : '一鍵生成測試錯題本'}</span>
                </button>
              )}
            </div>
          )}

          {/* Highlights */}
          <div style={{ backgroundColor: 'var(--bg-primary, #FAF7F0)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400E', marginBottom: '8px' }}>重點操作提醒</div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.86rem', color: 'var(--text-body)', lineHeight: 1.75 }}>
              {currentStep.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={seeding}
            className="btn btn-text"
            style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}
          >
            略過（後續可隨時重播）
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={() => setStepIdx(i => Math.max(0, i - 1))}
                className="btn btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <ArrowLeft size={14} /> 上一步
              </button>
            )}
            {stepIdx < TUTORIAL_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIdx(i => i + 1)}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                data-testid="pobi-tutorial-next-btn"
              >
                下一步 <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                data-testid="pobi-tutorial-finish-btn"
              >
                <CheckCircle2 size={15} /> 完成教學，開始使用
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
