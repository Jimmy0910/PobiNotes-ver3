import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';
import type { CategoriesBundle } from '../types';
import type { AppViewType } from './Dashboard';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  MousePointerClick
} from 'lucide-react';

interface PobiTutorialModalProps {
  categories: CategoriesBundle;
  activeView: AppViewType;
  selectedSubjectId: string | null;
  onNavigateView: (view: AppViewType) => void;
  onOpenNotebook: (subjectId: string) => void;
  isNewUser?: boolean;
  onClose: () => void;
  onRefreshAll: () => Promise<void>;
}

interface SpotlightStep {
  id: string;
  title: string;
  tip: string;
  actionHint: string;
  getTarget: () => HTMLElement | null;
  advanceOnTargetClick?: boolean;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_STEPS: SpotlightStep[] = [
  {
    id: 'bookshelf-open',
    title: '點擊翻開錯題本',
    tip: '點任一本錯題本封面即可進入；也可先點下方按鈕，一鍵建立附圖解的示範錯題本。',
    actionHint: '點擊發亮書封（或按「下一步」自動翻開）',
    getTarget: () =>
      (document.querySelector('[data-pobi-demo-book="1"]') as HTMLElement | null) ||
      (document.querySelector('[data-testid^="book-card-"]') as HTMLElement | null) ||
      (document.querySelector('[data-testid="bookshelf-add-book-card"]') as HTMLElement | null),
    advanceOnTargetClick: true
  },
  {
    id: 'notebook-add',
    title: '新增錯題',
    tip: '點「新增錯題」拍照或貼上題目與解析圖，並必選「熟悉度」以便追蹤複習。',
    actionHint: '認識此按鈕位置後，按「下一步」繼續',
    getTarget: () => document.querySelector('[data-testid="notebook-add-mistake-btn"]') as HTMLElement | null,
    advanceOnTargetClick: false
  },
  {
    id: 'hub-review',
    title: '切換「每日複習」',
    tip: '點此進入閃卡複習室，可自選章節單元，並設定各科熟悉度的間隔複習天數。',
    actionHint: '點擊「每日複習」分頁（或按「下一步」）',
    getTarget: () => document.querySelector('[data-testid="subject-hub-tab-review"]') as HTMLElement | null,
    advanceOnTargetClick: true
  },
  {
    id: 'hub-workshop',
    title: '切換「分析與工坊」',
    tip: '查看弱點熱度圖並多選範圍，一鍵匯出 AI 提示資料包（ZIP）或 A4 防切題考卷。',
    actionHint: '點擊「分析與工坊」分頁（或按「下一步」）',
    getTarget: () => document.querySelector('[data-testid="subject-hub-tab-workshop"]') as HTMLElement | null,
    advanceOnTargetClick: true
  },
  {
    id: 'nav-uncategorized',
    title: '未分類區（暫存題庫）',
    tip: '刪除科目、章節或單元時選擇保留的題目會暫存在這裡，隨時可批次歸類。',
    actionHint: '點擊左側「未分類區」或按「下一步」',
    getTarget: () => document.querySelector('[data-testid="nav-uncategorized"]') as HTMLElement | null,
    advanceOnTargetClick: true
  },
  {
    id: 'nav-prompt',
    title: 'AI 提詞管理',
    tip: '在這裡管理與自訂 AI 解題提詞，匯出 AI 資料包時可直接套用。開始整理錯題吧！',
    actionHint: '點擊「完成教學」結束導覽',
    getTarget: () => document.querySelector('[data-testid="nav-prompt"]') as HTMLElement | null,
    advanceOnTargetClick: false
  }
];

export default function PobiTutorialModal({
  categories,
  activeView,
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
  const targetElRef = useRef<HTMLElement | null>(null);

  const pickPreferredSubjectId = useCallback((): string | null => {
    const demoSubj = categories.subjects.find(s => s.name === 'POBI 教學範例-數學');
    if (demoSubj) return demoSubj.id;
    if (selectedSubjectId && categories.subjects.some(s => s.id === selectedSubjectId)) {
      return selectedSubjectId;
    }
    return categories.subjects[0]?.id || null;
  }, [categories.subjects, selectedSubjectId]);

  const currentStep = SPOTLIGHT_STEPS[stepIdx];

  // Ensure the page is on the right view for the current step
  useEffect(() => {
    if (stepIdx === 0 && activeView !== 'bookshelf') {
      onNavigateView('bookshelf');
    } else if (stepIdx >= 1 && stepIdx <= 3 && activeView !== 'notebook') {
      const subjId = pickPreferredSubjectId();
      if (subjId) {
        onOpenNotebook(subjId);
      }
    }
  }, [stepIdx, activeView, onNavigateView, onOpenNotebook, pickPreferredSubjectId]);

  // Measure target element rect dynamically on scroll, resize, or DOM changes
  const measureTarget = useCallback(() => {
    const el = currentStep.getTarget();
    targetElRef.current = el;
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      setTargetRect(null);
      return;
    }
    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height
    });
  }, [currentStep]);

  useEffect(() => {
    // Scroll target into view smoothly on step change, then measure
    const timer = window.setTimeout(() => {
      const el = currentStep.getTarget();
      if (el) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch {}
      }
      measureTarget();
    }, 120);

    const interval = window.setInterval(measureTarget, 260);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [currentStep, measureTarget]);

  // Interactive Click-to-Advance on the real spotlighted element
  useEffect(() => {
    if (!currentStep.advanceOnTargetClick) return;
    const handleDocClick = (e: MouseEvent) => {
      const targetEl = targetElRef.current;
      if (!targetEl) return;
      if (targetEl.contains(e.target as Node)) {
        window.setTimeout(() => {
          setStepIdx(prev => (prev < SPOTLIGHT_STEPS.length - 1 ? prev + 1 : prev));
        }, 180);
      }
    };
    document.addEventListener('click', handleDocClick, true);
    return () => document.removeEventListener('click', handleDocClick, true);
  }, [currentStep.advanceOnTargetClick]);

  // Keyboard Escape to exit tour
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

  const handleNext = () => {
    if (stepIdx === 0) {
      const subjId = pickPreferredSubjectId();
      if (subjId) {
        onOpenNotebook(subjId);
      }
      setStepIdx(1);
      return;
    }
    if (stepIdx === 2) {
      const el = document.querySelector('[data-testid="subject-hub-tab-review"]') as HTMLElement | null;
      if (el) el.click();
      setStepIdx(3);
      return;
    }
    if (stepIdx === 3) {
      const el = document.querySelector('[data-testid="subject-hub-tab-workshop"]') as HTMLElement | null;
      if (el) el.click();
      setStepIdx(4);
      return;
    }
    if (stepIdx < SPOTLIGHT_STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (stepIdx === 1) {
      onNavigateView('bookshelf');
    }
    if (stepIdx > 0) {
      setStepIdx(stepIdx - 1);
    }
  };

  // Compute safe floating tooltip card coordinates near targetRect
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cardW = Math.min(350, vw - 24);
  const estCardH = stepIdx === 0 ? 275 : 215;
  const pad = 8;

  let cardTop = Math.max(16, (vh - estCardH) / 2);
  let cardLeft = Math.max(12, (vw - cardW) / 2);

  if (targetRect) {
    const spaceBelow = vh - (targetRect.top + targetRect.height + pad);
    const spaceAbove = targetRect.top - pad;
    const spaceRight = vw - (targetRect.left + targetRect.width + pad);

    if (targetRect.left < 240 && spaceRight >= cardW + 20) {
      // Sidebar item -> place card cleanly to the right
      cardLeft = targetRect.left + targetRect.width + 18;
      cardTop = Math.min(Math.max(16, targetRect.top - 12), vh - estCardH - 16);
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
      cardLeft = Math.max(12, targetRect.left - cardW - 16);
      cardTop = Math.min(Math.max(16, targetRect.top), vh - estCardH - 16);
    }
  }

  return createPortal(
    <>
      <style>{`
        @keyframes pobiSpotlightPulse {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(10, 18, 28, 0.56), 0 0 0 3px #F59E0B, 0 0 18px rgba(245, 158, 11, 0.72); }
          50% { box-shadow: 0 0 0 9999px rgba(10, 18, 28, 0.56), 0 0 0 6px #FBBF24, 0 0 26px rgba(251, 191, 36, 0.92); }
        }
      `}</style>

      {/* Spotlight Cutout Frame — pointerEvents: none so the actual highlighted button remains 100% clickable! */}
      {targetRect ? (
        <div
          data-testid="pobi-spotlight-ring"
          style={{
            position: 'fixed',
            top: `${Math.max(0, targetRect.top - pad)}px`,
            left: `${Math.max(0, targetRect.left - pad)}px`,
            width: `${targetRect.width + pad * 2}px`,
            height: `${targetRect.height + pad * 2}px`,
            borderRadius: '11px',
            border: '2.5px solid #F59E0B',
            zIndex: 100040,
            pointerEvents: 'none',
            transition: 'all 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
            animation: 'pobiSpotlightPulse 1.8s ease-in-out infinite'
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '-26px',
              left: '0px',
              padding: '2px 8px',
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
            <MousePointerClick size={12} />
            步驟 {stepIdx + 1}
          </span>
        </div>
      ) : (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 18, 28, 0.54)',
            zIndex: 100040,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Floating Interactive POBI Coachmark Card */}
      <div
        role="dialog"
        aria-label="POBI 互動教學引導"
        data-testid="pobi-tutorial-coachmark"
        className="glass animate-fade-in"
        style={{
          position: 'fixed',
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          width: `${cardW}px`,
          maxWidth: 'calc(100vw - 24px)',
          borderRadius: '14px',
          border: '2px solid #D97706',
          boxShadow: '0 22px 50px rgba(0, 0, 0, 0.35)',
          zIndex: 100050,
          overflow: 'hidden',
          transition: 'top 0.24s cubic-bezier(0.22, 1, 0.36, 1), left 0.24s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {/* Header with POBI Bichon Avatar & Top-Right Close X */}
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
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                objectFit: 'cover',
                objectPosition: 'center 25%',
                border: '1.5px solid #D97706',
                flexShrink: 0
              }}
            />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706' }}>
                {isNewUser ? 'POBI 新手引導' : 'POBI 互動導覽'} · {stepIdx + 1} / {SPOTLIGHT_STEPS.length}
              </div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)' }}>
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

        {/* Concise Body */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {currentStep.tip}
          </p>

          <div
            style={{
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <MousePointerClick size={13} style={{ color: '#D97706', flexShrink: 0 }} />
            <span>{currentStep.actionHint}</span>
          </div>

          {/* Step 1 Optional Seed Demo Notebook Action */}
          {stepIdx === 0 && (
            <div style={{ paddingTop: '2px' }}>
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
                  <span>已建立《POBI 教學範例-數學》，可直接點擊書封翻開！</span>
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

        {/* Footer Controls */}
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
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
                padding: '6px 12px',
                fontSize: '0.8rem',
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
    </>,
    document.body
  );
}
