import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../utils/api';
import type { CategoriesBundle } from '../types';
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Sliders,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';

interface OnboardingModalProps {
  categories: CategoriesBundle;
  onComplete: () => Promise<void>;
  onSkip: () => void;
}

interface TrackPreset {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  subjects: Array<{ name: string; color: string }>;
  sampleChapter: string;
  sampleMistake: {
    title: string;
    qDesc: string;
    aDesc: string;
  };
}

const TRACK_PRESETS: TrackPreset[] = [
  {
    id: 'gsat',
    label: '高中學測 / 分科',
    subtitle: '自動建立國文、英文、數學、自然（物化生）書架',
    icon: GraduationCap,
    subjects: [
      { name: '數學', color: 'navy_ink|Calculator' },
      { name: '英文', color: 'crimson_leather|Languages' },
      { name: '物理', color: 'emerald_moss|Atom' },
      { name: '國文', color: 'kraft_camel|BookOpen' }
    ],
    sampleChapter: '多項式與不等式',
    sampleMistake: {
      title: '【範例】二次函數極值與區間限制判別',
      qDesc: '已知 f(x) = x^2 - 4x + 7，在閉區間 [0, 3] 上的最大值與最小值分別為何？（可於該科手帳的「每日複習」體驗 POBI 閃卡複習與自訂週期）',
      aDesc: '1. 先配方：f(x) = (x - 2)^2 + 3，頂點 x = 2 落在區間 [0, 3] 內。\n2. 最小值在 x = 2 處，f(2) = 3。\n3. 端點比較：f(0) = 7、f(3) = 4，故最大值為 7。\n【破題提醒】看到區間極值一定要先確認頂點是否落在區間內！'
    }
  },
  {
    id: 'cap',
    label: '國中會考',
    subtitle: '自動建立國文、英語、數學、自然、社會五科書架',
    icon: BookOpen,
    subjects: [
      { name: '數學', color: 'navy_ink|Calculator' },
      { name: '自然', color: 'emerald_moss|FlaskConical' },
      { name: '英語', color: 'crimson_leather|Languages' },
      { name: '國文', color: 'kraft_camel|BookOpen' },
      { name: '社會', color: 'amber_honey|Globe' }
    ],
    sampleChapter: '一元二次方程式',
    sampleMistake: {
      title: '【範例】判別式與實根個數關係',
      qDesc: '若方程式 x^2 - 6x + k = 0 有兩個相異實數解，求常數 k 的最大整數值。',
      aDesc: '判別式 D = (-6)^2 - 4(1)(k) = 36 - 4k > 0 => k < 9。\n因此 k 的最大整數值為 8。（注意：是「相異」實根，不等式不含等號！）'
    }
  },
  {
    id: 'civil',
    label: '公職 / 證照國考',
    subtitle: '適合法科、行政、財金與專業證照刷題整理',
    icon: Briefcase,
    subjects: [
      { name: '行政法', color: 'navy_ink|Scale' },
      { name: '法學緒論', color: 'crimson_leather|BookOpen' },
      { name: '專業科目一', color: 'emerald_moss|Layers' }
    ],
    sampleChapter: '行政處分與救濟',
    sampleMistake: {
      title: '【範例】行政處分無效與得撤銷之區別',
      qDesc: '下列何種瑕疵構成行政程序法第 111 條之「無效行政處分」，而非僅屬得撤銷？',
      aDesc: '行政程序法第 111 條採「重大明顯瑕疵說」，如不能由書面處分得知處分機關、內容對任何人均屬不能實現等，自始不生效力；一般程序違法原則上僅屬得撤銷。'
    }
  },
  {
    id: 'custom',
    label: '語言檢定 / 自訂',
    subtitle: '建立精簡起步書架，之後隨時於分類管理自由擴充',
    icon: Sliders,
    subjects: [
      { name: '英文檢定', color: 'navy_ink|Languages' },
      { name: '綜合筆記', color: 'kraft_camel|BookOpen' }
    ],
    sampleChapter: '核心文法與易錯題',
    sampleMistake: {
      title: '【範例】despite 與 although 的詞性差異',
      qDesc: '_____ the heavy rain, the outdoor concert continued as scheduled. (A) Although (B) Despite (C) Because (D) Even though',
      aDesc: '正解為 (B) Despite。後方接的是名詞片語 "the heavy rain" 而非完整子句，因此需使用介系詞 Despite（或 In spite of）。'
    }
  }
];

export default function OnboardingModal({ categories, onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('gsat');
  const [includeSampleMistake, setIncludeSampleMistake] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedTrack = TRACK_PRESETS.find(t => t.id === selectedTrackId) || TRACK_PRESETS[0];

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      let firstSubjectId = '';
      for (let i = 0; i < selectedTrack.subjects.length; i++) {
        const s = selectedTrack.subjects[i];
        const existing = categories.subjects.find(sub => sub.name.trim() === s.name);
        if (existing) {
          if (i === 0) firstSubjectId = existing.id;
          continue;
        }
        const res = await apiRequest('/api/subjects', {
          method: 'POST',
          body: { name: s.name, color: s.color }
        });
        const createdId = res?.id || res?.subject?.id || res?.item?.id;
        if (i === 0 && createdId) firstSubjectId = createdId;
      }

      if (includeSampleMistake && firstSubjectId) {
        const chapRes = await apiRequest('/api/chapters', {
          method: 'POST',
          body: { name: selectedTrack.sampleChapter, subjectId: firstSubjectId }
        });
        const chapterId = chapRes?.id || chapRes?.chapter?.id || chapRes?.item?.id || null;
        const stuckFam = categories.familiarities.find(f => f.name === '卡') || categories.familiarities[0];

        await apiRequest('/api/mistakes', {
          method: 'POST',
          body: {
            subjectId: firstSubjectId,
            chapterId,
            title: selectedTrack.sampleMistake.title,
            familiarityId: stuckFam?.id || null,
            templateId: 'default-exam',
            mistakeDate: new Date().toISOString().slice(0, 10),
            data: {
              questionData: { q_desc: selectedTrack.sampleMistake.qDesc },
              answerData: { a_desc: selectedTrack.sampleMistake.aDesc }
            }
          }
        });
      }

      await onComplete();
    } catch (err) {
      console.error('Onboarding setup error:', err);
      await onComplete();
    } finally {
      setSubmitting(false);
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
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        data-testid="onboarding-modal"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: 'min(88dvh, 88vh)',
          backgroundColor: 'var(--bg-secondary, #FFFFFF)',
          color: 'var(--text-primary, #1C1917)',
          borderRadius: '14px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#B45309', letterSpacing: '0.04em' }}>
              歡迎使用 POBI STUDIO · 步驟 {step} / 2
            </div>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.14rem', fontWeight: 700 }}>
              {step === 1 ? '選擇你的學習目標，快速配置書架' : '確認初始書架與範例題'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            title="先跳過引導"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {step === 1 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {TRACK_PRESETS.map(track => {
                const Icon = track.icon;
                const isSelected = selectedTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setSelectedTrackId(track.id)}
                    style={{
                      textAlign: 'left',
                      padding: '16px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #D97706' : '1px solid var(--glass-border)',
                      backgroundColor: isSelected ? '#FFFBEB' : 'var(--bg-primary, #FAF7F0)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'border-color 0.15s, background-color 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Icon size={20} style={{ color: isSelected ? '#B45309' : 'var(--text-secondary)' }} />
                      {isSelected && <CheckCircle2 size={17} style={{ color: '#D97706' }} />}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{track.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{track.subtitle}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'var(--bg-primary, #FAF7F0)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#92400E', marginBottom: '10px' }}>
                  將為你自動建立以下科目書架（後續皆可自由增減與更名）：
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedTrack.subjects.map(s => (
                    <span
                      key={s.name}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid rgba(217, 119, 6, 0.35)',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#1C1917'
                      }}
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={includeSampleMistake}
                  onChange={e => setIncludeSampleMistake(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ fontSize: '0.86rem', lineHeight: 1.55 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>預先建立 1 題示範錯題（推薦）</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    放入「{selectedTrack.subjects[0].name} / {selectedTrack.sampleChapter}」，方便立刻體驗查看錯題、POBI 每日複習與分析與工坊（AI 提詞包／A4 練習卷）。
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-primary, #FAF7F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <button type="button" onClick={onSkip} disabled={submitting} className="btn btn-text" style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            略過設定
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="btn btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <ArrowLeft size={14} /> 上一步
              </button>
            )}
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.86rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                data-testid="onboarding-next-btn"
              >
                下一步 <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={submitting}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.86rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                data-testid="onboarding-finish-btn"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>{submitting ? '建立書架中...' : '完成並開始使用'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
