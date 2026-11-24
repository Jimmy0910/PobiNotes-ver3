import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';
import type { CategoriesBundle } from '../types';
import type { AppViewType } from './Dashboard';
import type { NotebookOpenOptions } from './NotebookOpenView';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  Compass
} from 'lucide-react';

interface PobiTutorialModalProps {
  categories: CategoriesBundle;
  activeView: AppViewType;
  selectedSubjectId: string | null;
  onNavigateView: (view: AppViewType) => void;
  onOpenNotebook: (subjectId: string, options?: NotebookOpenOptions) => void;
  isNewUser?: boolean;
  onClose: () => void;
  onRefreshAll: () => Promise<void>;
}

interface SpotlightStep {
  id: string;
  title: string;
  tip: string;
  bullets?: string[];
  getTarget: () => HTMLElement | null;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_STEPS: SpotlightStep[] = [
  {
    id: 'create-book-cover',
    title: '1. 建立書封與錯題本',
    tip: '點書架上的「放置新錯題本」，可為每個科目建立獨立錯題本，自由挑選皮革色彩與徽章圖示。',
    bullets: [
      '點書封右上角「⋮」可分享錯題包、重新命名或安全刪除。',
      '想先看完整示範，也可點下方按鈕一鍵建立範例題本。'
    ],
    getTarget: () =>
      document.querySelector('[data-testid="bookshelf-add-book-card"]') as HTMLElement | null
  },
  {
    id: 'sidebar-overview',
    title: '2. 左側面板功能介紹',
    tip: '左側書脊導覽整合所有常用工作區，隨時一鍵切換：',
    bullets: [
      '我的書架：瀏覽各科錯題本與批次匯入考卷。',
      '每日複習：直接切換各科進行 POBI 閃卡複習與排程。',
      '未分類區：暫存刪除分類後保留的題目，可批次歸類。',
      '模板管理 / AI 提詞管理：自訂題目欄位與專屬 AI 指令。'
    ],
    getTarget: () => document.querySelector('[data-testid="sidebar-nav-list"]') as HTMLElement | null
  },
  {
    id: 'ai-batch-import',
    title: '3. AI 批次匯入 4 步驟',
    tip: '寫完模考免逐題手打，點「AI 考卷批次匯入」照 4 步驟快速入庫：',
    bullets: [
      '步驟 1 設計提詞：勾選本次考卷涵蓋的科目與章節。',
      '步驟 2 上傳圖片 / AI 分析：打包圖片交給 AI 辨識並貼回結果。',
      '步驟 3 調整配對：微調題目順序與一題多張解析圖。',
      '步驟 4 極速審核入庫：標記熟悉度後一鍵寫入錯題本。'
    ],
    getTarget: () => document.querySelector('[data-testid="bookshelf-batch-import-btn"]') as HTMLElement | null
  },
  {
    id: 'daily-review',
    title: '4. 每日複習（閃卡與自訂週期）',
    tip: '從左側面板直接點選「每日複習」，即可快速切換科目並開始 POBI 閃卡重測：',
    bullets: [
      '頂部可一鍵切換科目並查看各科今日待複習題數。',
      '自由勾選要複習的章節與小單元，並可自訂各熟悉度的間隔天數或設為「不再複習」。'
    ],
    getTarget: () =>
      document.querySelector('[data-testid="daily-review-hub-header"]') as HTMLElement | null
  },
  {
    id: 'weakness-charts',
    title: '5. 弱點圖表（分類占比與熱度圖）',
    tip: '在「分析與工坊」的步驟 2，提供兩種互動圖表幫你精準定位弱點：',
    bullets: [
      '1. 分類占比圖表：以長條圖或圓餅圖檢視各章節、單元、熟悉度、錯因或標籤題數分布。',
      '2. 視覺化弱點熱度圖：以 5 階暖色矩陣交叉找出失分集中熱區，一眼看穿最常卡關的組合。',
      '互動多選：直接點擊圖表項目或熱度方格可複選多個弱點，直接帶入步驟 3 匯出 AI 提詞包或練習卷。'
    ],
    getTarget: () =>
      document.querySelector('[data-testid="workshop-step2-chart-cards"]') as HTMLElement | null
  },
  {
    id: 'ai-prompt-pack',
    title: '6. 外部 AI 提示資料包（ZIP）',
    tip: '在「分析與工坊」步驟 3 確認好弱點題目後，點此「匯出外部 AI 提示資料包」：',
    bullets: [
      '挑選內建或自訂提詞範本，一鍵打包成單一 ZIP 檔。',
      'ZIP 內含提詞清單與所有題目／解析圖片，直接整包上傳給 ChatGPT / Gemini / Claude 即可分析。'
    ],
    getTarget: () =>
      document.querySelector('[data-testid="workshop-submode-ai-zip"]') as HTMLElement | null
  },
  {
    id: 'export-exam',
    title: '7. 匯出練習卷（A4 防跨頁切割）',
    tip: '在同一弱點範圍點此「匯出考卷」按鈕，即可快速印出專屬考前複習卷：',
    bullets: [
      '可選模擬練習卷、試卷附頁尾解析或完整解析卷。',
      '預設 A4 防跨頁切割排版，生成中可隨時取消，也支援手機／平板系統列印。'
    ],
    getTarget: () =>
      document.querySelector('[data-testid="workshop-submode-exam-paper"]') as HTMLElement | null
  }
];

export default function PobiTutorialModal({
  categories,
  selectedSubjectId,
  onNavigateView,
  onOpenNotebook,
  isNewUser = false,
  onClose,
  onRefreshAll
}: PobiTutorialModalProps) {
  const { showToast } = useUiFeedback();
  const [stepIdx, setStepIdx] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [seededDone, setSeededDone] = useState(false);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const initializedRef = useRef(false);
  const activeStepIdxRef = useRef(0);
  const stepRunIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  activeStepIdxRef.current = stepIdx;

  const clearScheduledTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter(t => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const pickPreferredSubjectId = useCallback((): string | null => {
    const demoSubj = categories.subjects.find(s => s.name === 'POBI 教學範例-數學');
    if (demoSubj) return demoSubj.id;
    if (selectedSubjectId && categories.subjects.some(s => s.id === selectedSubjectId)) {
      return selectedSubjectId;
    }
    return categories.subjects[0]?.id || null;
  }, [categories.subjects, selectedSubjectId]);

  const currentStep = SPOTLIGHT_STEPS[stepIdx];

  const measureTarget = useCallback((allowAutoScroll = false, explicitStepIdx?: number) => {
    const idx = explicitStepIdx ?? activeStepIdxRef.current;
    const step = SPOTLIGHT_STEPS[idx];
    if (!step) {
      setTargetRect(null);
      return;
    }
    const el = step.getTarget();
    if (!el) {
      setTargetRect(null);
      return;
    }
    let r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      setTargetRect(null);
      return;
    }
    // If target is outside visible viewport, programmatically scroll it into view
    const vhNow = window.innerHeight || 800;
    if (allowAutoScroll && (r.top < 16 || r.bottom > vhNow - 16)) {
      try {
        el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        r = el.getBoundingClientRect();
      } catch {}
    }
    const nextRect: TargetRect = {
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height
    };
    setTargetRect(prev => {
      if (
        prev &&
        Math.abs(prev.top - nextRect.top) < 0.5 &&
        Math.abs(prev.left - nextRect.left) < 0.5 &&
        Math.abs(prev.width - nextRect.width) < 0.5 &&
        Math.abs(prev.height - nextRect.height) < 0.5
      ) {
        return prev;
      }
      return nextRect;
    });
  }, []);

  // Helper: wait until an element appears in DOM (respecting step cancellation)
  const waitForElement = useCallback(
    (selector: string, runId: number, onFound: (el: HTMLElement) => void, attemptsLeft = 30) => {
      if (stepRunIdRef.current !== runId) return;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        onFound(el);
        return;
      }
      if (attemptsLeft <= 0) return;
      scheduleTimer(() => waitForElement(selector, runId, onFound, attemptsLeft - 1), 50);
    },
    [scheduleTimer]
  );

  // Navigate DIRECTLY to the exact target screen/stage in a single React state update (zero intermediate flashes!)
  const syncViewForStep = useCallback(
    (nextIdx: number) => {
      clearScheduledTimers();
      activeStepIdxRef.current = nextIdx;
      const runId = ++stepRunIdRef.current;
      setTargetRect(null);

      if (nextIdx <= 2) {
        onNavigateView('bookshelf');
        return;
      }

      if (nextIdx === 3) {
        onNavigateView('daily-review');
        return;
      }

      // Steps 5, 6, 7 open NotebookOpenView DIRECTLY on the exact workshop stage & submode (no 查看錯題 / Stage 1 flash!)
      const subjId = pickPreferredSubjectId();
      if (!subjId) return;

      const nonce = Date.now() + runId;
      if (nextIdx === 4) {
        // Step 5: 弱點圖表 (Stage 2 - Heatmap)
        onOpenNotebook(subjId, {
          hubTab: 'workshop',
          workshopPreset: { stage: 2, step2Tab: 'heatmap', nonce }
        });
        waitForElement('[data-testid="workshop-step2-chart-cards"]', runId, cardsEl => {
          try {
            cardsEl.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
          } catch {}
          measureTarget(true, nextIdx);
        }, 40);
      } else if (nextIdx === 5) {
        // Step 6: 外部 AI 提示資料包 (Stage 3 -> Export -> AI ZIP)
        onOpenNotebook(subjId, {
          hubTab: 'workshop',
          workshopPreset: { stage: 3, step3Tab: 'export', exportChoice: 'ai_zip', nonce }
        });
        waitForElement('[data-testid="workshop-submode-ai-zip"]', runId, aiBtn => {
          try {
            aiBtn.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
          } catch {}
          measureTarget(true, nextIdx);
        }, 40);
      } else if (nextIdx === 6) {
        // Step 7: 匯出練習卷 (Stage 3 -> Export -> Exam Paper)
        onOpenNotebook(subjId, {
          hubTab: 'workshop',
          workshopPreset: { stage: 3, step3Tab: 'export', exportChoice: 'exam_paper', nonce }
        });
        waitForElement('[data-testid="workshop-submode-exam-paper"]', runId, pdfBtn => {
          try {
            pdfBtn.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
          } catch {}
          measureTarget(true, nextIdx);
        }, 40);
      }
    },
    [clearScheduledTimers, measureTarget, onNavigateView, onOpenNotebook, pickPreferredSubjectId, waitForElement]
  );

  // On initial mount only, navigate cleanly to bookshelf for Step 1
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      onNavigateView('bookshelf');
    }
  }, [onNavigateView]);

  // Only clear scheduled timers when the tutorial modal actually unmounts
  useEffect(() => {
    return () => {
      clearScheduledTimers();
    };
  }, [clearScheduledTimers]);

  // Lock user wheel/touch/keyboard scroll while keeping programmatic scrollIntoView working
  useEffect(() => {
    const prevBodyTouch = document.body.style.touchAction;
    document.body.style.touchAction = 'none';

    const preventScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-testid="pobi-tutorial-coachmark"]')) return;
      e.preventDefault();
    };
    const preventScrollKeys = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'].includes(e.code)) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('keydown', preventScrollKeys, { passive: false });

    return () => {
      document.body.style.touchAction = prevBodyTouch;
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('keydown', preventScrollKeys);
    };
  }, []);

  // Scroll & measure synchronously before paint on step change so there is zero pit-stop or jump
  useLayoutEffect(() => {
    let scrolledOnce = false;
    let observedEl: HTMLElement | null = null;
    const handleMeasure = () => measureTarget(false);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleMeasure) : null;

    const syncAndObserve = () => {
      const el = currentStep.getTarget();
      if (el) {
        if (!scrolledOnce) {
          scrolledOnce = true;
          try {
            el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
          } catch {}
        }
        if (resizeObserver && observedEl !== el) {
          resizeObserver.disconnect();
          observedEl = el;
          resizeObserver.observe(el);
          if (el.parentElement) resizeObserver.observe(el.parentElement);
        }
        measureTarget(true);
      }
    };

    syncAndObserve();
    let ticks = 0;
    const settleInterval = window.setInterval(() => {
      syncAndObserve();
      ticks++;
      if (ticks >= 20) {
        window.clearInterval(settleInterval);
      }
    }, 80);

    window.addEventListener('resize', handleMeasure);
    window.addEventListener('scroll', handleMeasure, true);

    return () => {
      window.clearInterval(settleInterval);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleMeasure);
      window.removeEventListener('scroll', handleMeasure, true);
    };
  }, [currentStep, measureTarget]);

  // Escape key closes tour
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleGenerateTestData = async () => {
    if (seeding || seededDone) return;
    setSeeding(true);
    try {
      const demoSubjectName = 'POBI 教學範例-數學';
      let subjectId = categories.subjects.find(s => s.name === demoSubjectName)?.id || '';
      if (!subjectId) {
        const sRes = await apiRequest('/api/subjects', {
          method: 'POST',
          body: { name: demoSubjectName, color: 'color:green;icon:Calculator' }
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
      showToast('已生成《POBI 教學範例-數學》示範錯題本！', 'success');
      window.setTimeout(measureTarget, 150);
    } catch (err: any) {
      console.error('生成教學測試資料失敗:', err);
      showToast(err?.message || '生成示範錯題本失敗，請稍後再試', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // STRICT MANUAL PROGRESSION ONLY — NEVER AUTO-JUMPS!
  const handleNext = () => {
    if (stepIdx < SPOTLIGHT_STEPS.length - 1) {
      const nextIdx = stepIdx + 1;
      setStepIdx(nextIdx);
      syncViewForStep(nextIdx);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (stepIdx > 0) {
      const prevIdx = stepIdx - 1;
      setStepIdx(prevIdx);
      syncViewForStep(prevIdx);
    }
  };

  // Compute safe floating tooltip coordinates beside spotlight target
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cardW = Math.min(390, vw - 24);
  const estCardH = stepIdx === 0 ? 310 : 285;
  const pad = 8;

  let cardTop = Math.max(16, (vh - estCardH) / 2);
  let cardLeft = Math.max(12, (vw - cardW) / 2);

  if (targetRect) {
    const spaceBelow = vh - (targetRect.top + targetRect.height + pad);
    const spaceAbove = targetRect.top - pad;
    const spaceRight = vw - (targetRect.left + targetRect.width + pad);

    if (targetRect.left < 240 && spaceRight >= cardW + 24) {
      cardLeft = targetRect.left + targetRect.width + 20;
      cardTop = Math.min(Math.max(20, targetRect.top), vh - estCardH - 20);
    } else if (spaceBelow >= estCardH + 20) {
      cardTop = targetRect.top + targetRect.height + 16;
      cardLeft = Math.min(Math.max(12, targetRect.left + targetRect.width / 2 - cardW / 2), vw - cardW - 12);
    } else if (spaceAbove >= estCardH + 20) {
      cardTop = Math.max(16, targetRect.top - estCardH - 16);
      cardLeft = Math.min(Math.max(12, targetRect.left + targetRect.width / 2 - cardW / 2), vw - cardW - 12);
    } else if (spaceRight >= cardW + 20) {
      cardLeft = targetRect.left + targetRect.width + 16;
      cardTop = Math.min(Math.max(16, targetRect.top), vh - estCardH - 16);
    } else {
      cardLeft = Math.max(12, (vw - cardW) / 2);
      cardTop = Math.max(16, vh - estCardH - 20);
    }
  }

  return createPortal(
    <div data-testid="pobi-tutorial-root">
      {/* Transparent click & touch drag blocker backdrop so background cannot be dragged or clicked during tour */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100035,
          touchAction: 'none',
          overscrollBehavior: 'none',
          userSelect: 'none',
          backgroundColor: targetRect ? 'transparent' : 'rgba(10, 18, 28, 0.58)'
        }}
      />

      {/* Single Spotlight Cutout Ring (static shadow, no position morph transition, single DOM node guaranteed) */}
      {targetRect && (
        <div
          data-testid="pobi-spotlight-ring"
          style={{
            position: 'fixed',
            top: `${Math.max(0, targetRect.top - pad)}px`,
            left: `${Math.max(0, targetRect.left - pad)}px`,
            width: `${targetRect.width + pad * 2}px`,
            height: `${targetRect.height + pad * 2}px`,
            borderRadius: '11px',
            border: '3px solid #F59E0B',
            boxShadow: '0 0 0 9999px rgba(10, 18, 28, 0.58), 0 0 18px rgba(245, 158, 11, 0.55)',
            zIndex: 100040,
            pointerEvents: 'none'
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '-26px',
              left: '0px',
              padding: '2px 9px',
              borderRadius: '999px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              fontSize: '0.72rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.28)'
            }}
          >
            <Compass size={12} />
            步驟 {stepIdx + 1} / {SPOTLIGHT_STEPS.length}
          </span>
        </div>
      )}

      {/* Floating POBI Coachmark Card */}
      <div
        role="dialog"
        aria-label="POBI 步驟教學導覽"
        data-testid="pobi-tutorial-coachmark"
        className="glass"
        style={{
          position: 'fixed',
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          width: `${cardW}px`,
          maxWidth: 'calc(100vw - 24px)',
          borderRadius: '14px',
          border: '2px solid #D97706',
          boxShadow: '0 22px 50px rgba(0, 0, 0, 0.38)',
          zIndex: 100050,
          overflow: 'hidden'
        }}
      >
        {/* Header with POBI Avatar & Top-Right X */}
        <div
          style={{
            padding: '11px 14px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <img
              src="/pobi-mascot.jpg"
              alt="比熊 POBI"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                objectPosition: 'center 25%',
                border: '1.5px solid #D97706',
                flexShrink: 0
              }}
            />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706' }}>
                {isNewUser ? 'POBI 新手教學' : 'POBI 步驟導覽'} · {stepIdx + 1} / {SPOTLIGHT_STEPS.length}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {currentStep.title}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="結束教學"
            data-testid="pobi-tutorial-close-btn"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              border: '1px solid var(--glass-border)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Concise Step Content */}
        <div style={{ padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.58 }}>
            {currentStep.tip}
          </p>

          {currentStep.bullets && currentStep.bullets.length > 0 && (
            <ul
              style={{
                margin: 0,
                paddingLeft: '17px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.62,
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}
            >
              {currentStep.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}

          {/* Step 1 Optional Seed Demo Notebook Action */}
          {stepIdx === 0 && (
            <div style={{ paddingTop: '4px' }}>
              {seededDone ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--success)'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>已建立《POBI 教學範例-數學》示範題本！</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateTestData}
                  disabled={seeding}
                  data-testid="pobi-seed-test-data-btn"
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{seeding ? '建立示範錯題本中...' : '一鍵生成示範錯題本（含圖解）'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Manual Next / Prev Controls */}
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {SPOTLIGHT_STEPS.map((s, idx) => (
              <span
                key={s.id}
                style={{
                  width: idx === stepIdx ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '999px',
                  backgroundColor: idx === stepIdx ? '#D97706' : 'var(--glass-border)',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                data-testid="pobi-tutorial-prev-btn"
                className="btn btn-secondary"
                style={{ padding: '6px 11px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ArrowLeft size={13} /> 上一步
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              data-testid="pobi-tutorial-next-btn"
              className="btn btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{stepIdx === SPOTLIGHT_STEPS.length - 1 ? '完成教學' : '下一步'}</span>
              {stepIdx < SPOTLIGHT_STEPS.length - 1 ? <ArrowRight size={13} /> : <CheckCircle2 size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
