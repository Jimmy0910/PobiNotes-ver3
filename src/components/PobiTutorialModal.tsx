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
    title: '第 1 步：認識精簡側邊欄並生成含示範圖片的錯題本',
    icon: BookOpen,
    speech:
      '汪！你好，我是比熊 POBI！左側導覽精簡為「我的書架」、「未分類區」、「模板管理」、「AI 提詞管理」四大入口。點下方按鈕，我會立刻幫你建立《POBI 教學範例-數學》錯題本（含 2 題附真實題目圖與詳解圖的範例題）！',
    highlights: [
      '「我的書架」：點書封進入該科三大模式；右上角白色「⋮」可分享、更名或刪除（刪除時可選連同題目刪除或將題目移至未分類區）。',
      '「未分類區」：集中保管尚未歸類或刪除分類後保留的題目；「AI 提詞管理」專注自訂提詞範本，無須在管理頁勾選題目。'
    ]
  },
  {
    id: 2,
    title: '第 2 步：單題錄入規範與 4 階段 AI 考卷批次匯入',
    icon: Sparkles,
    speech:
      '新增錯題時，系統會強制提醒你勾選「熟悉度（順／卡／不會／誤解）」，並貼心提醒是否補充「錯因」（錯因非強制），讓後續統計更精準！寫完考卷也能用書架「AI 考卷批次匯入」4 階段快速建檔。',
    highlights: [
      '單題支援上傳題目圖與多張詳解圖，並可開啟紅筆手寫標註。',
      '4 階段批次匯入：1. 設計提詞 -> 2. 上傳圖片／打包 ZIP 交給外部 AI 分析 -> 3. 調整題目與多圖配對 -> 4. 極速審核入庫。'
    ]
  },
  {
    id: 3,
    title: '第 3 步：翻開單科錯題本 — 分頁 1「查看錯題」',
    icon: FolderTree,
    speech:
      '點擊任一本錯題本進入單科主頁，上方提供「查看錯題」、「每日複習」、「分析與工坊」三大分頁。在「查看錯題」中可用章節與小單元整理題目，刪除任一章節或小單元時都會貼心詢問要連同題目刪除還是放到「未分類區」！',
    highlights: [
      '章節直立三點「⋮」可分享此章節題目包、重新命名、跨層級搬移或刪除。',
      '內嵌「分類與標籤管理」並支援唯讀連結分享，收件人免登入即可依章節／小單元篩選瀏覽。'
    ]
  },
  {
    id: 4,
    title: '第 4 步：單科分頁 2「每日複習」— POBI 閃卡與各科排程',
    icon: RotateCcw,
    speech:
      '切換到「每日複習」，我會先幫你把本科所有章節與小單元「預設全選」，勾選範圍即可開始閃卡重測！不同科目可各自設定「不會／卡／誤解／順」幾天後重測，或直接設為「不再複習」。',
    highlights: [
      '預設複習週期：不會 (+1天)、卡 (+3天)、誤解 (+5天)、順 (+14天)，每科皆可獨立修改或停用排程。',
      '深淺色主題皆可一鍵切換，深色模式全面採深底白字保護雙眼。'
    ]
  },
  {
    id: 5,
    title: '第 5 步：單科分頁 3「分析與工坊」三步驟與備份還原',
    icon: Printer,
    speech:
      '「分析與工坊」採用清楚的三步驟流程：1. 選擇分析模式（章節與單元／熟悉度與錯因／自訂標籤） -> 2. 勾選範圍並檢視視覺化弱點熱度圖與占比圖表（圖表項目支援多選！） -> 3. 預覽題目與圖片縮圖，一鍵匯出外部 AI 提示資料包（ZIP）或 A4 防跨頁練習卷！',
    highlights: [
      '外部 AI 提示資料包 (.zip) 僅包裝 1 份完整提詞檔與所有題目／解析圖片，不重複打包，直接整包上傳給 ChatGPT／Gemini／Claude 即可分析。',
      'A4 練習卷與解析卷皆防跨頁切題並支援行動裝置系統列印；書架右上角「備份與還原」支援跨帳號上傳還原 ZIP／JSON，隨時可點「POBI 教學」重播本導覽！'
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
                q_desc: '已知 f(x) = x^2 - 4x + 7，求在閉區間 [0, 3] 上的最大值與最小值。',
                q_image: '/demo/parabola-q.png'
              },
              answerData: {
                a_desc: '配方得 f(x) = (x - 2)^2 + 3，頂點 x = 2 在 [0, 3] 內，最小值為 3；端點 f(0)=7, f(3)=4，最大值為 7。',
                a_image: '/demo/parabola-a.png'
              },
              reviewMeta: {
                nextReviewDate: yesterday,
                reviewCount: 0,
                history: []
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
                q_desc: '若 x^2 - 6x + k = 0 有兩個相異實數解，求常數 k 的最大整數值。',
                q_image: '/demo/discriminant-q.png'
              },
              answerData: {
                a_desc: '判別式 D = 36 - 4k > 0 => k < 9，故最大整數 k = 8。',
                a_image: '/demo/discriminant-a.png'
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
                  <strong>已成功生成《POBI 教學範例-數學》錯題本與 2 題附範例圖片之測試錯題！</strong>
                ) : (
                  <span>想要立刻實作體驗嗎？點此生成 1 本含章節、單元、範例題目圖與詳解圖的測試錯題本：</span>
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
