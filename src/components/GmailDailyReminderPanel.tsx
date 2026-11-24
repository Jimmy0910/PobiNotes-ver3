import { useState, useMemo, useEffect } from 'react';
import { type MistakeRecord, addDaysToDateStr, getTodayDateStr } from '../types';
import {
  type SubjectFamiliaritySchedule,
  type CanonicalFamiliarityKey,
  DEFAULT_SUBJECT_REVIEW_SCHEDULE,
  FAMILIARITY_SCHEDULE_META,
  normalizeFamiliarityKey,
  saveSubjectReviewSchedule
} from '../utils/reviewSettings';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';
import {
  Mail,
  Bell,
  BellOff,
  CheckSquare,
  Square,
  Folder,
  FileText,
  CalendarClock,
  Ban,
  Clock,
  Save,
  Send,
  Loader2,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export interface ReminderScopeGroup {
  chapterId: string | null;
  chapterName: string;
  units: Array<{ key: string; unitId: string | null; label: string; mistakes: MistakeRecord[] }>;
  allKeys: string[];
  totalMistakes: MistakeRecord[];
}

export interface DailyReminderClientConfig {
  subjectId: string;
  enabled: boolean;
  scopeKeys: string[];
  schedule: SubjectFamiliaritySchedule;
  sendTime: string;
  daysOfWeek: number[];
  timezone: string;
  lastSentDate: string | null;
  updatedAt: number | null;
}

interface GmailDailyReminderPanelProps {
  subjectId: string;
  subjectName: string;
  userEmail: string;
  scopeGroups: ReminderScopeGroup[];
  allScopeKeys: string[];
  currentReviewScopeKeys: string[];
  currentSubjectSchedule: SubjectFamiliaritySchedule;
  initialConfig: DailyReminderClientConfig | null;
  loadingConfig: boolean;
  onConfigSaved: (saved: DailyReminderClientConfig) => void;
  onScheduleSynced: (nextSchedule: SubjectFamiliaritySchedule) => void;
}

const SEND_TIME_OPTIONS: string[] = Array.from({ length: 17 }, (_, idx) => {
  const hour = idx + 7; // 07:00 .. 23:00
  return `${String(hour).padStart(2, '0')}:00`;
});

const WEEKDAY_ITEMS: Array<{ day: number; shortLabel: string }> = [
  { day: 0, shortLabel: '日' },
  { day: 1, shortLabel: '一' },
  { day: 2, shortLabel: '二' },
  { day: 3, shortLabel: '三' },
  { day: 4, shortLabel: '四' },
  { day: 5, shortLabel: '五' },
  { day: 6, shortLabel: '六' }
];

function evaluateMistakeDueWithSchedule(
  m: MistakeRecord,
  schedule: SubjectFamiliaritySchedule,
  todayStr: string
): boolean {
  const key = normalizeFamiliarityKey(m.familiarity_name);
  const interval = schedule[key];
  if (interval === null) return false;
  const existing = m.data?.reviewMeta;
  if (existing && typeof existing.nextReviewDate === 'string') {
    if (existing.nextReviewDate === 'NEVER') return false;
    return existing.nextReviewDate <= todayStr;
  }
  const baseDate = m.mistake_date || new Date(m.created_at || Date.now()).toISOString().slice(0, 10);
  const nextDate = addDaysToDateStr(baseDate, interval);
  return nextDate <= todayStr;
}

export default function GmailDailyReminderPanel({
  subjectId,
  subjectName,
  userEmail,
  scopeGroups,
  allScopeKeys,
  currentReviewScopeKeys,
  currentSubjectSchedule,
  initialConfig,
  loadingConfig,
  onConfigSaved,
  onScheduleSynced
}: GmailDailyReminderPanelProps) {
  const { showToast } = useUiFeedback();

  const [enabled, setEnabled] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(allScopeKeys);
  const [schedule, setSchedule] = useState<SubjectFamiliaritySchedule>(currentSubjectSchedule);
  const [draftDays, setDraftDays] = useState<Record<CanonicalFamiliarityKey, string>>({
    不會: currentSubjectSchedule['不會'] === null ? '' : String(currentSubjectSchedule['不會']),
    卡: currentSubjectSchedule['卡'] === null ? '' : String(currentSubjectSchedule['卡']),
    誤解: currentSubjectSchedule['誤解'] === null ? '' : String(currentSubjectSchedule['誤解']),
    順: currentSubjectSchedule['順'] === null ? '' : String(currentSubjectSchedule['順'])
  });
  const [sendTime, setSendTime] = useState<string>('20:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const allKeysSig = useMemo(() => allScopeKeys.join('|'), [allScopeKeys]);

  const syncDraftsFromSchedule = (next: SubjectFamiliaritySchedule) => {
    setDraftDays({
      不會: next['不會'] === null ? '' : String(next['不會']),
      卡: next['卡'] === null ? '' : String(next['卡']),
      誤解: next['誤解'] === null ? '' : String(next['誤解']),
      順: next['順'] === null ? '' : String(next['順'])
    });
  };

  // Hydrate form state when subject or loaded server config changes
  useEffect(() => {
    if (initialConfig) {
      setEnabled(initialConfig.enabled);
      if (initialConfig.scopeKeys.includes('__ALL__')) {
        setSelectedKeys(allScopeKeys);
      } else {
        const validSet = new Set(allScopeKeys);
        const filtered = initialConfig.scopeKeys.filter(k => validSet.has(k));
        setSelectedKeys(filtered);
      }
      setSchedule(initialConfig.schedule);
      syncDraftsFromSchedule(initialConfig.schedule);
      setSendTime(
        SEND_TIME_OPTIONS.includes(initialConfig.sendTime) ? initialConfig.sendTime : '20:00'
      );
      setDaysOfWeek(
        initialConfig.daysOfWeek.length > 0 ? initialConfig.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]
      );
    } else {
      setEnabled(false);
      setSelectedKeys(allScopeKeys);
      setSchedule(currentSubjectSchedule);
      syncDraftsFromSchedule(currentSubjectSchedule);
      setSendTime('20:00');
      setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, initialConfig, allKeysSig]);

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const toggleSingleKey = (key: string) => {
    setSelectedKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const toggleGroupKeys = (keys: string[]) => {
    const allChecked = keys.every(k => selectedSet.has(k));
    if (allChecked) {
      setSelectedKeys(prev => prev.filter(k => !keys.includes(k)));
    } else {
      setSelectedKeys(prev => Array.from(new Set([...prev, ...keys])));
    }
  };

  const selectedMistakes = useMemo(() => {
    const seen = new Set<string>();
    const out: MistakeRecord[] = [];
    for (const group of scopeGroups) {
      if (group.units.length === 0) {
        if (selectedSet.has(group.allKeys[0])) {
          for (const m of group.totalMistakes) {
            if (!seen.has(m.id)) {
              seen.add(m.id);
              out.push(m);
            }
          }
        }
      } else {
        for (const u of group.units) {
          if (selectedSet.has(u.key)) {
            for (const m of u.mistakes) {
              if (!seen.has(m.id)) {
                seen.add(m.id);
                out.push(m);
              }
            }
          }
        }
      }
    }
    return out;
  }, [scopeGroups, selectedSet]);

  const previewDueCount = useMemo(() => {
    const today = getTodayDateStr();
    return selectedMistakes.filter(m => evaluateMistakeDueWithSchedule(m, schedule, today)).length;
  }, [selectedMistakes, schedule]);

  const handleScheduleModeChange = (key: CanonicalFamiliarityKey, value: number | null) => {
    setSchedule(prev => ({ ...prev, [key]: value }));
    setDraftDays(prev => ({ ...prev, [key]: value === null ? '' : String(value) }));
  };

  const handleDraftDaysChange = (key: CanonicalFamiliarityKey, rawInput: string) => {
    const digitsOnly = rawInput.replace(/[^\d]/g, '');
    setDraftDays(prev => ({ ...prev, [key]: digitsOnly }));
    if (digitsOnly !== '') {
      const parsed = parseInt(digitsOnly, 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        setSchedule(prev => ({ ...prev, [key]: parsed }));
      }
    }
  };

  const toggleWeekday = (day: number) => {
    setDaysOfWeek(prev => {
      if (prev.includes(day)) {
        if (prev.length <= 1) {
          showToast('請至少保留一天寄信星期', 'info');
          return prev;
        }
        return prev.filter(d => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const buildValidatedPayload = (): {
    scopeKeys: string[];
    schedule: SubjectFamiliaritySchedule;
  } | null => {
    const nextSchedule: SubjectFamiliaritySchedule = { ...schedule };
    for (const meta of FAMILIARITY_SCHEDULE_META) {
      if (nextSchedule[meta.key] !== null) {
        const raw = (draftDays[meta.key] || '').trim();
        const parsed = parseInt(raw, 10);
        if (!raw || !Number.isFinite(parsed) || parsed < 1) {
          showToast(`請為「${meta.label}」輸入大於 0 的間隔天數，或切換為「不再複習」`, 'error');
          return null;
        }
        nextSchedule[meta.key] = parsed;
      }
    }

    if (enabled && allScopeKeys.length > 0 && selectedKeys.length === 0) {
      showToast('開啟每日通知時，請至少勾選一個章節或單元範圍', 'error');
      return null;
    }

    const isAllSelected =
      allScopeKeys.length > 0 && allScopeKeys.every(k => selectedSet.has(k));
    const scopeKeysToSave = isAllSelected ? ['__ALL__'] : selectedKeys;

    return {
      scopeKeys: scopeKeysToSave,
      schedule: nextSchedule
    };
  };

  const handleSave = async () => {
    const validated = buildValidatedPayload();
    if (!validated) return;

    setSaving(true);
    try {
      const res = await apiRequest('/api/daily-reminder', {
        method: 'PUT',
        body: JSON.stringify({
          subjectId,
          enabled,
          scopeKeys: validated.scopeKeys,
          schedule: validated.schedule,
          sendTime,
          daysOfWeek
        })
      });

      // Keep local subject review schedule synced with saved reminder schedule
      const syncedLocal = saveSubjectReviewSchedule(subjectId, validated.schedule);
      setSchedule(syncedLocal);
      syncDraftsFromSchedule(syncedLocal);
      onScheduleSynced(syncedLocal);

      if (res?.reminder) {
        onConfigSaved(res.reminder);
      }

      showToast(
        enabled
          ? `已儲存並開啟《${subjectName}》GMAIL 每日通知（${sendTime}）`
          : `已儲存《${subjectName}》設定（每日通知目前為關閉狀態）`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || '儲存 GMAIL 每日通知設定失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    const validated = buildValidatedPayload();
    if (!validated) return;

    setSendingTest(true);
    try {
      const res = await apiRequest('/api/daily-reminder', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_test',
          subjectId,
          scopeKeys: validated.scopeKeys,
          schedule: validated.schedule,
          sendTime,
          daysOfWeek
        })
      });
      showToast(
        `測試通知信已寄出至 ${res?.sentTo || userEmail}（今日到期 ${res?.dueCount ?? previewDueCount} 題）`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || '寄送預覽信失敗，請稍後再試', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  const isEveryday = daysOfWeek.length === 7;
  const isWeekdaysOnly =
    daysOfWeek.length === 5 && daysOfWeek.join(',') === '1,2,3,4,5';

  return (
    <div
      data-testid="daily-review-gmail-panel"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--glass-border)',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}
    >
      {/* Top Bar: Title + Bound Gmail + Master Enable/Disable Switch */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--glass-border)'
        }}
      >
        <div style={{ minWidth: '220px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '1.02rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Mail size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>《{subjectName}》GMAIL 每日通知設定</span>
          </h3>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <span>收件信箱：{userEmail}</span>
            {initialConfig?.lastSentDate && (
              <span>· 上次自動寄信：{initialConfig.lastSentDate}</span>
            )}
          </p>
        </div>

        {/* ON / OFF Toggle */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)'
          }}
        >
          <button
            type="button"
            onClick={() => setEnabled(true)}
            data-testid="gmail-reminder-enable-btn"
            className={enabled ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{
              padding: '6px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Bell size={14} />
            <span>開啟每日通知</span>
          </button>
          <button
            type="button"
            onClick={() => setEnabled(false)}
            data-testid="gmail-reminder-disable-btn"
            className={!enabled ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{
              padding: '6px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <BellOff size={14} />
            <span>關閉通知</span>
          </button>
        </div>
      </div>

      {loadingConfig ? (
        <div
          style={{
            padding: '28px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem'
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          <span>正在載入您的 GMAIL 每日通知設定...</span>
        </div>
      ) : (
        <>
          {/* Section A: Notification Scope */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  1. 選擇通知範圍
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  已選範圍共 {selectedMistakes.length} 題 · 以目前週期計算今日到期 {previewDueCount} 題
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSelectedKeys(currentReviewScopeKeys)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 600 }}
                  data-testid="gmail-scope-sync-btn"
                >
                  套用上方複習範圍
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKeys(allScopeKeys)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 600 }}
                >
                  全選
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKeys([])}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 600 }}
                >
                  取消全選
                </button>
              </div>
            </div>

            {scopeGroups.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px dashed var(--glass-border)',
                  color: 'var(--text-muted)',
                  fontSize: '0.84rem',
                  textAlign: 'center'
                }}
              >
                《{subjectName}》尚無章節或錯題，未來新增錯題後將自動納入全選範圍。
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  paddingRight: '4px'
                }}
              >
                {scopeGroups.map(group => {
                  const groupAllChecked = group.allKeys.every(k => selectedSet.has(k));
                  const groupSomeChecked = group.allKeys.some(k => selectedSet.has(k));
                  return (
                    <div
                      key={group.chapterId || 'uncategorized'}
                      style={{
                        borderRadius: '10px',
                        border: groupSomeChecked
                          ? '1.5px solid var(--accent-secondary)'
                          : '1px solid var(--glass-border)',
                        backgroundColor: groupSomeChecked
                          ? 'var(--warning-bg)'
                          : 'var(--bg-secondary)',
                        padding: '9px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '7px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroupKeys(group.allKeys)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          width: '100%',
                          textAlign: 'left'
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {groupAllChecked ? (
                            <CheckSquare size={16} style={{ color: 'var(--accent-secondary)' }} />
                          ) : (
                            <Square
                              size={16}
                              style={{
                                color: groupSomeChecked
                                  ? 'var(--accent-secondary)'
                                  : 'var(--text-muted)'
                              }}
                            />
                          )}
                          <Folder size={14} style={{ color: 'var(--accent-secondary)' }} />
                          <span>{group.chapterName}</span>
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          共 {group.totalMistakes.length} 題
                        </span>
                      </button>

                      {group.units.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '22px' }}>
                          {group.units.map(u => {
                            const checked = selectedSet.has(u.key);
                            return (
                              <button
                                key={u.key}
                                type="button"
                                onClick={() => toggleSingleKey(u.key)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 9px',
                                  borderRadius: '8px',
                                  border: checked
                                    ? '1.5px solid var(--accent-secondary)'
                                    : '1px solid var(--glass-border)',
                                  backgroundColor: checked
                                    ? 'var(--bg-primary)'
                                    : 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.76rem',
                                  fontWeight: checked ? 700 : 500,
                                  cursor: 'pointer'
                                }}
                              >
                                {checked ? <CheckSquare size={12} /> : <Square size={12} />}
                                <FileText size={11} />
                                <span>{u.label}</span>
                                <span style={{ opacity: 0.8 }}>({u.mistakes.length})</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Familiarity Review Cycle */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingTop: '14px',
              borderTop: '1px dashed var(--glass-border)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  2. 設定熟悉度複習週期
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  儲存時將同步套用到本科閃卡複習與每日信件的到期計算
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const defaults = { ...DEFAULT_SUBJECT_REVIEW_SCHEDULE };
                  setSchedule(defaults);
                  syncDraftsFromSchedule(defaults);
                }}
                className="btn btn-secondary"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <RefreshCw size={12} />
                <span>恢復預設（1/3/5/14天）</span>
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '10px'
              }}
            >
              {FAMILIARITY_SCHEDULE_META.map(meta => {
                const val = schedule[meta.key];
                const isNever = val === null;
                return (
                  <div
                    key={meta.key}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: `1.5px solid ${meta.accentBorder}55`,
                      backgroundColor: 'var(--bg-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        熟悉度：{meta.label}
                      </span>
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                        {meta.desc}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleScheduleModeChange(meta.key, isNever ? 3 : val)}
                        className={!isNever ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{
                          padding: '4px 9px',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CalendarClock size={12} /> 間隔天數
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScheduleModeChange(meta.key, null)}
                        className={isNever ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{
                          padding: '4px 9px',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Ban size={12} /> 不再複習
                      </button>

                      {!isNever ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={draftDays[meta.key]}
                            onChange={e => handleDraftDaysChange(meta.key, e.target.value)}
                            data-testid={`gmail-schedule-days-${meta.key}`}
                            className="input"
                            style={{
                              width: '62px',
                              height: '28px',
                              padding: '2px 6px',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              textAlign: 'center',
                              fontVariantNumeric: 'tabular-nums'
                            }}
                          />
                          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            天
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                          不列入提醒
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C: Auto-Send Time & Weekly Schedule */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingTop: '14px',
              borderTop: '1px dashed var(--glass-border)'
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                3. 設定自動寄信時程（台灣時間 UTC+8）
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                系統將於指定星期與整點時段自動整理今日到期題目並寄送到您的 Gmail
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px'
              }}
            >
              {/* Send Time Picker */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <label
                  htmlFor={`gmail-send-time-${subjectId}`}
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Clock size={14} style={{ color: 'var(--accent-secondary)' }} />
                  <span>每日自動寄信時間</span>
                </label>
                <select
                  id={`gmail-send-time-${subjectId}`}
                  value={sendTime}
                  onChange={e => setSendTime(e.target.value)}
                  data-testid="gmail-send-time-select"
                  className="input"
                  style={{
                    height: '42px',
                    minHeight: '42px',
                    padding: '0 14px',
                    lineHeight: 'normal',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    fontVariantNumeric: 'tabular-nums',
                    boxSizing: 'border-box'
                  }}
                >
                  {SEND_TIME_OPTIONS.map(t => (
                    <option key={t} value={t}>
                      {t}（台灣時間 UTC+8）
                    </option>
                  ))}
                </select>
              </div>

              {/* Repeat Days Picker */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    每週寄信日
                  </span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      type="button"
                      onClick={() => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])}
                      className={isEveryday ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '2px 8px', fontSize: '0.73rem', fontWeight: 700 }}
                    >
                      每天
                    </button>
                    <button
                      type="button"
                      onClick={() => setDaysOfWeek([1, 2, 3, 4, 5])}
                      className={isWeekdaysOnly ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '2px 8px', fontSize: '0.73rem', fontWeight: 700 }}
                    >
                      僅平日
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {WEEKDAY_ITEMS.map(item => {
                    const active = daysOfWeek.includes(item.day);
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => toggleWeekday(item.day)}
                        data-testid={`gmail-weekday-${item.day}`}
                        className={active ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{
                          minWidth: '34px',
                          height: '32px',
                          padding: '0 8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          justifyContent: 'center'
                        }}
                      >
                        {item.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              paddingTop: '14px',
              borderTop: '1px solid var(--glass-border)'
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={14} style={{ color: enabled ? '#15803D' : 'var(--text-muted)' }} />
              <span>
                {enabled
                  ? `狀態：已開啟，將於排程時間自動寄送至 ${userEmail}`
                  : '狀態：目前已關閉（可先點「儲存設定」保留偏好）'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={sendingTest || saving}
                data-testid="gmail-send-test-btn"
                className="btn btn-secondary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{sendingTest ? '寄送測試信中...' : '立即寄送預覽信到我的 Gmail'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || sendingTest}
                data-testid="gmail-save-settings-btn"
                className="btn btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={15} />}
                <span>{saving ? '儲存中...' : '儲存 GMAIL 通知設定'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
