import type { CategoriesBundle, MistakeRecord } from '../types';

export const DEMO_CATEGORIES: CategoriesBundle = {
  items: [],
  subjects: [
    {
      id: 'subj-chinese',
      dimension: 'subject',
      parent_id: null,
      name: '國文',
      color: 'color:green;icon:BookOpen',
      sort_order: 10,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'subj-english',
      dimension: 'subject',
      parent_id: null,
      name: '英文',
      color: 'color:brown;icon:Languages',
      sort_order: 20,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'subj-math',
      dimension: 'subject',
      parent_id: null,
      name: '數學',
      color: 'color:green;icon:Calculator',
      sort_order: 30,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'subj-science',
      dimension: 'subject',
      parent_id: null,
      name: '自然',
      color: 'color:green;icon:Atom',
      sort_order: 40,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'subj-social',
      dimension: 'subject',
      parent_id: null,
      name: '社會',
      color: 'color:red;icon:Compass',
      sort_order: 50,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    }
  ],
  chapters: [],
  units: [],
  familiarities: [
    {
      id: 'fam-shun',
      dimension: 'familiarity',
      parent_id: null,
      name: '順',
      color: 'success',
      sort_order: 10,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'fam-ka',
      dimension: 'familiarity',
      parent_id: null,
      name: '卡',
      color: 'warning',
      sort_order: 20,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'fam-buhui',
      dimension: 'familiarity',
      parent_id: null,
      name: '不會',
      color: 'danger',
      sort_order: 30,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'fam-wujie',
      dimension: 'familiarity',
      parent_id: null,
      name: '誤解',
      color: 'purple',
      sort_order: 40,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    }
  ],
  errorReasons: [
    {
      id: 'reason-calc',
      dimension: 'error_reason',
      parent_id: null,
      name: '計算粗心',
      color: 'warning',
      sort_order: 10,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'reason-concept',
      dimension: 'error_reason',
      parent_id: null,
      name: '觀念模糊',
      color: 'danger',
      sort_order: 20,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'reason-miss',
      dimension: 'error_reason',
      parent_id: null,
      name: '審題不清',
      color: 'warning',
      sort_order: 30,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    },
    {
      id: 'reason-unfamiliar',
      dimension: 'error_reason',
      parent_id: null,
      name: '題型生疏',
      color: 'danger',
      sort_order: 40,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    }
  ],
  errorReasonMode: 'multi'
};

export const DEMO_MISTAKES: MistakeRecord[] = [];
