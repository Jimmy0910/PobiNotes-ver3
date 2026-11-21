export type CanonicalFamiliarityKey = '不會' | '卡' | '誤解' | '順';

export interface SubjectFamiliaritySchedule {
  不會: number | null;
  卡: number | null;
  誤解: number | null;
  順: number | null;
}

export const DEFAULT_SUBJECT_REVIEW_SCHEDULE: SubjectFamiliaritySchedule = {
  不會: 1,
  卡: 3,
  誤解: 5,
  順: 14
};

export const FAMILIARITY_SCHEDULE_META: Array<{
  key: CanonicalFamiliarityKey;
  label: string;
  desc: string;
  accentBg: string;
  accentBorder: string;
  accentColor: string;
}> = [
  {
    key: '不會',
    label: '不會',
    desc: '完全卡住或沒頭緒',
    accentBg: 'rgba(239, 68, 68, 0.1)',
    accentBorder: '#EF4444',
    accentColor: '#B91C1C'
  },
  {
    key: '卡',
    label: '卡',
    desc: '寫到一半卡關或算錯',
    accentBg: 'rgba(245, 158, 11, 0.12)',
    accentBorder: '#D97706',
    accentColor: '#92400E'
  },
  {
    key: '誤解',
    label: '誤解',
    desc: '題意或觀念解讀錯誤',
    accentBg: 'rgba(220, 38, 38, 0.1)',
    accentBorder: '#DC2626',
    accentColor: '#991B1B'
  },
  {
    key: '順',
    label: '順',
    desc: '已能順利獨立解出',
    accentBg: 'rgba(16, 185, 129, 0.12)',
    accentBorder: '#10B981',
    accentColor: '#047857'
  }
];

const STORAGE_KEY = 'pobi_subject_review_schedules_v1';

export function normalizeFamiliarityKey(familiarityName?: string | null): CanonicalFamiliarityKey {
  const name = (familiarityName || '').trim();
  if (name.includes('順') || name.includes('精熟') || name.includes('掌握') || name === '會') {
    return '順';
  }
  if (name.includes('誤解')) {
    return '誤解';
  }
  if (name.includes('卡') || name.includes('稍微')) {
    return '卡';
  }
  return '不會';
}

function sanitizeDays(val: unknown, fallback: number | null): number | null {
  if (val === null || val === 'never' || val === 'NEVER') return null;
  const num = Number(val);
  if (Number.isFinite(num) && num >= 1) {
    return Math.min(365, Math.round(num));
  }
  return fallback;
}

export function loadAllSubjectReviewSchedules(): Record<string, SubjectFamiliaritySchedule> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, SubjectFamiliaritySchedule> = {};
    for (const [subjId, val] of Object.entries(parsed)) {
      if (val && typeof val === 'object') {
        const v = val as Record<string, unknown>;
        out[subjId] = {
          不會: sanitizeDays(v['不會'], DEFAULT_SUBJECT_REVIEW_SCHEDULE['不會']),
          卡: sanitizeDays(v['卡'], DEFAULT_SUBJECT_REVIEW_SCHEDULE['卡']),
          誤解: sanitizeDays(v['誤解'], DEFAULT_SUBJECT_REVIEW_SCHEDULE['誤解']),
          順: sanitizeDays(v['順'], DEFAULT_SUBJECT_REVIEW_SCHEDULE['順'])
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function getSubjectReviewSchedule(subjectId?: string | null): SubjectFamiliaritySchedule {
  if (!subjectId) return { ...DEFAULT_SUBJECT_REVIEW_SCHEDULE };
  const all = loadAllSubjectReviewSchedules();
  return all[subjectId] ? { ...all[subjectId] } : { ...DEFAULT_SUBJECT_REVIEW_SCHEDULE };
}

export function saveSubjectReviewSchedule(
  subjectId: string,
  schedule: SubjectFamiliaritySchedule
): SubjectFamiliaritySchedule {
  const clean: SubjectFamiliaritySchedule = {
    不會: sanitizeDays(schedule['不會'], DEFAULT_SUBJECT_REVIEW_SCHEDULE['不會']),
    卡: sanitizeDays(schedule['卡'], DEFAULT_SUBJECT_REVIEW_SCHEDULE['卡']),
    誤解: sanitizeDays(schedule['誤解'], DEFAULT_SUBJECT_REVIEW_SCHEDULE['誤解']),
    順: sanitizeDays(schedule['順'], DEFAULT_SUBJECT_REVIEW_SCHEDULE['順'])
  };
  try {
    const all = loadAllSubjectReviewSchedules();
    all[subjectId] = clean;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
  return clean;
}

export function resetSubjectReviewSchedule(subjectId: string): SubjectFamiliaritySchedule {
  try {
    const all = loadAllSubjectReviewSchedules();
    delete all[subjectId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
  return { ...DEFAULT_SUBJECT_REVIEW_SCHEDULE };
}

export function getEffectiveReviewIntervalDays(
  familiarityName?: string | null,
  subjectId?: string | null
): number | null {
  const key = normalizeFamiliarityKey(familiarityName);
  const schedule = getSubjectReviewSchedule(subjectId);
  return schedule[key];
}

export function formatIntervalLabel(days: number | null): string {
  if (days === null) return '不再複習';
  return `${days} 天後重測`;
}
