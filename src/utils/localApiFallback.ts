import { DEMO_CATEGORIES } from './demoData';
import type { CategoriesBundle, MistakeRecord } from '../types';

const STORAGE_KEYS = {
  MISTAKES: 'pobi_local_mistakes',
  CATEGORIES: 'pobi_local_categories',
  TEMPLATES: 'pobi_local_templates',
  USER: 'pobi_local_user',
  USERS_LIST: 'pobi_local_users_list',
  AUTH_TOKEN: 'pobi_auth_token',
};

interface LocalUserItem {
  id: string;
  username: string;
  is_admin: number;
  created_at: number;
}

function getLocalUsersList(): LocalUserItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    { id: 'u-jimmy', username: 'jimmy', is_admin: 1, created_at: Date.now() }
  ];
}

function saveLocalUsersList(list: LocalUserItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(list));
  } catch {}
}

function upsertLocalUser(user: { id: string; username: string; is_admin: number; created_at?: number }): LocalUserItem {
  const list = getLocalUsersList();
  const idx = list.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
  const isJimmy = user.username.toLowerCase() === 'jimmy';
  const entry: LocalUserItem = {
    id: idx !== -1 ? list[idx].id : user.id,
    username: user.username,
    is_admin: isJimmy ? 1 : user.is_admin,
    created_at: idx !== -1 ? list[idx].created_at : (user.created_at || Date.now()),
  };
  if (idx !== -1) {
    list[idx] = entry;
  } else {
    list.unshift(entry);
  }
  saveLocalUsersList(list);
  return entry;
}

// Helper: Read or initialize local mistakes
function getLocalMistakes(): MistakeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MISTAKES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalMistakes(list: MistakeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save mistakes to local storage:', e);
  }
}

// Helper: Read or initialize local categories
function getLocalCategories(): CategoriesBundle {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.subjects)) return parsed;
    }
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEMO_CATEGORIES));
  } catch {}
  return JSON.parse(JSON.stringify(DEMO_CATEGORIES));
}

function saveLocalCategories(cat: CategoriesBundle): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cat));
  } catch (e) {
    console.error('Failed to save categories to local storage:', e);
  }
}

// Helper: Convert Blob / File to base64 DataURL
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Local Fallback Handler for Offline / Demo / Dev Mode (Prevents 404)
export async function handleLocalFallback<T = any>(
  endpoint: string,
  method: string,
  bodyData: any
): Promise<T> {
  const urlObj = new URL(endpoint, 'http://localhost');
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // 1. Mistakes API (/api/mistakes)
  if (pathname === '/api/mistakes') {
    const mistakes = getLocalMistakes();
    const categories = getLocalCategories();

    if (method === 'GET') {
      const id = searchParams.get('id');
      if (id) {
        const item = mistakes.find(m => m.id === id);
        return (item || null) as any as T;
      }
      return mistakes as any as T;
    }

    if (method === 'POST') {
      const newId = `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = Date.now();
      const subject = categories.subjects.find(s => s.id === bodyData.subjectId);
      const chapter = categories.chapters.find(c => c.id === bodyData.chapterId);
      const unit = categories.units.find(u => u.id === bodyData.unitId);
      const familiarity = categories.familiarities.find(f => f.id === bodyData.familiarityId);
      const errorReasons = (bodyData.errorReasonIds || [])
        .map((rid: string) => categories.errorReasons.find(r => r.id === rid)?.name)
        .filter(Boolean);

      let currentUserId = 'user-default';
      try {
        const rawU = localStorage.getItem(STORAGE_KEYS.USER);
        if (rawU) currentUserId = JSON.parse(rawU)?.id || currentUserId;
      } catch {}

      const newRecord: MistakeRecord = {
        id: newId,
        user_id: currentUserId,
        template_id: bodyData.templateId || 'default-exam',
        template_fields: {
          questionFields: [
            { id: 'q_desc', label: '題幹內容 / 詳述', type: 'textarea' },
            { id: 'q_image', label: '題目圖檔 / 照片', type: 'image' },
          ],
          answerFields: [
            { id: 'a_desc', label: '答案與完整詳解', type: 'textarea' },
            { id: 'a_image', label: '解題圖檔 / 板書紀錄', type: 'image' },
          ]
        },
        subject_id: bodyData.subjectId || null,
        subject_name: subject?.name,
        chapter_id: bodyData.chapterId || null,
        chapter_name: chapter?.name,
        unit_id: bodyData.unitId || null,
        unit_name: unit?.name,
        title: bodyData.title || '無標題題目',
        familiarity_id: bodyData.familiarityId || null,
        familiarity_name: familiarity?.name,
        familiarity_color: familiarity?.color,
        error_reason_ids: bodyData.errorReasonIds || [],
        error_reason_names: errorReasons,
        tags: bodyData.tags || [],
        mistake_date: bodyData.mistakeDate || new Date().toISOString().slice(0, 10),
        data: bodyData.data || { questionData: {}, answerData: {} },
        created_at: now,
        updated_at: now,
      };

      mistakes.unshift(newRecord);
      saveLocalMistakes(mistakes);
      return { success: true, id: newId, mistake: newRecord } as any as T;
    }

    if (method === 'PUT') {
      const targetId = bodyData.id;
      const index = mistakes.findIndex(m => m.id === targetId);
      if (index !== -1) {
        const existing = mistakes[index];
        const nextSubjectId = bodyData.subjectId !== undefined ? bodyData.subjectId : bodyData.subject_id;
        const nextChapterId = bodyData.chapterId !== undefined ? bodyData.chapterId : bodyData.chapter_id;
        const nextUnitId = bodyData.unitId !== undefined ? bodyData.unitId : bodyData.unit_id;
        const nextFamiliarityId = bodyData.familiarityId !== undefined ? bodyData.familiarityId : bodyData.familiarity_id;

        const subject = nextSubjectId !== undefined
          ? categories.subjects.find(s => s.id === nextSubjectId)
          : undefined;
        const chapter = nextChapterId !== undefined
          ? categories.chapters.find(c => c.id === nextChapterId)
          : undefined;
        const unit = nextUnitId !== undefined
          ? categories.units.find(u => u.id === nextUnitId)
          : undefined;
        const familiarity = nextFamiliarityId !== undefined
          ? categories.familiarities.find(f => f.id === nextFamiliarityId)
          : undefined;

        const updated: MistakeRecord = {
          ...existing,
          ...bodyData,
          subject_id: nextSubjectId !== undefined ? nextSubjectId : existing.subject_id,
          chapter_id: nextChapterId !== undefined ? nextChapterId : existing.chapter_id,
          unit_id: nextUnitId !== undefined ? nextUnitId : existing.unit_id,
          familiarity_id: nextFamiliarityId !== undefined ? nextFamiliarityId : existing.familiarity_id,
          subject_name: subject !== undefined ? subject?.name : existing.subject_name,
          chapter_name: chapter !== undefined ? chapter?.name : existing.chapter_name,
          unit_name: unit !== undefined ? unit?.name : existing.unit_name,
          familiarity_name: familiarity !== undefined ? familiarity?.name : existing.familiarity_name,
          familiarity_color: familiarity !== undefined ? familiarity?.color : existing.familiarity_color,
          updated_at: Date.now(),
        };
        mistakes[index] = updated;
        saveLocalMistakes(mistakes);
      }
      return { success: true } as any as T;
    }

    if (method === 'DELETE') {
      if (searchParams.get('all') === 'true') {
        saveLocalMistakes([]);
        return { success: true, message: 'All mistakes cleared.' } as any as T;
      }
      const targetId = searchParams.get('id') || bodyData?.id;
      if (targetId) {
        const filtered = mistakes.filter(m => m.id !== targetId);
        saveLocalMistakes(filtered);
      }
      return { success: true } as any as T;
    }
  }

  // 2. Categories API (/api/categories, /api/subjects, /api/chapters)
  if (pathname === '/api/categories') {
    const categories = getLocalCategories();
    if (method === 'GET') {
      return categories as any as T;
    }
    if (method === 'POST') {
      const { dimension, name, parentId, subjectId, color } = bodyData || {};
      const newItem = {
        id: `local-${dimension}-${Date.now()}`,
        dimension,
        parent_id: parentId || null,
        subject_id: subjectId || null,
        name,
        color: color || 'default',
        sort_order: 10,
        is_active: 1,
        created_at: Date.now(),
        updated_at: Date.now(),
        mistake_count: 0
      };
      if (dimension === 'subject') categories.subjects.push(newItem);
      else if (dimension === 'chapter') categories.chapters.push(newItem);
      else if (dimension === 'unit') categories.units.push(newItem);
      else if (dimension === 'error_reason') categories.errorReasons.push(newItem);
      else if (dimension === 'familiarity') categories.familiarities.push(newItem);
      categories.items = [
        ...categories.subjects,
        ...categories.chapters,
        ...categories.units,
        ...categories.familiarities,
        ...categories.errorReasons
      ];
      saveLocalCategories(categories);
      return { success: true, item: newItem } as any as T;
    }
    if (method === 'PUT') {
      const now = Date.now();
      const syncItems = () => {
        categories.items = [
          ...categories.subjects,
          ...categories.chapters,
          ...categories.units,
          ...categories.familiarities,
          ...categories.errorReasons
        ];
        saveLocalCategories(categories);
      };

      if (bodyData?.action === 'reorder') {
        const { dimension, orderedIds } = bodyData;
        const list =
          dimension === 'subject' ? categories.subjects
          : dimension === 'chapter' ? categories.chapters
          : dimension === 'unit' ? categories.units
          : dimension === 'familiarity' ? categories.familiarities
          : categories.errorReasons;
        if (Array.isArray(orderedIds)) {
          orderedIds.forEach((oid: string, idx: number) => {
            const item = list.find(i => i.id === oid);
            if (item) {
              item.sort_order = (idx + 1) * 10;
              item.updated_at = now;
            }
          });
          list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          syncItems();
        }
        return { success: true } as any as T;
      }

      if (bodyData?.action === 'move_hierarchy') {
        const {
          sourceDimension,
          sourceId,
          targetDimension,
          targetId,
          placement = 'inside'
        } = bodyData;
        const mistakes = getLocalMistakes();

        const reorderLocalChapters = (subjId: string, movedId: string, anchorId: string, pos: 'before' | 'after') => {
          const peers = categories.chapters
            .filter(c => (c.subject_id || c.parent_id) === subjId && c.id !== movedId)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          const movedObj = categories.chapters.find(c => c.id === movedId);
          if (!movedObj) return;
          const idx = peers.findIndex(c => c.id === anchorId);
          if (idx === -1) peers.push(movedObj);
          else peers.splice(pos === 'before' ? idx : idx + 1, 0, movedObj);
          peers.forEach((c, i) => {
            c.sort_order = (i + 1) * 10;
            c.updated_at = now;
          });
          categories.chapters.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        };

        const reorderLocalUnits = (chapId: string, movedId: string, anchorId: string, pos: 'before' | 'after') => {
          const peers = categories.units
            .filter(u => (u.chapter_id || u.parent_id) === chapId && u.id !== movedId)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          const movedObj = categories.units.find(u => u.id === movedId);
          if (!movedObj) return;
          const idx = peers.findIndex(u => u.id === anchorId);
          if (idx === -1) peers.push(movedObj);
          else peers.splice(pos === 'before' ? idx : idx + 1, 0, movedObj);
          peers.forEach((u, i) => {
            u.sort_order = (i + 1) * 10;
            u.updated_at = now;
          });
          categories.units.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        };

        if (sourceDimension === 'unit') {
          const uIdx = categories.units.findIndex(u => u.id === sourceId);
          if (uIdx === -1) throw new Error('找不到指定的來源單元');
          const sourceUnit = categories.units[uIdx];

          if (targetDimension === 'subject' || (targetDimension === 'chapter' && (placement === 'before' || placement === 'after'))) {
            const targetChap = targetDimension === 'chapter' ? categories.chapters.find(c => c.id === targetId) : null;
            const targetSubjectId = targetDimension === 'chapter' ? (targetChap?.subject_id || targetChap?.parent_id || '') : targetId;
            const targetSubj = categories.subjects.find(s => s.id === targetSubjectId);
            if (!targetSubj) throw new Error('找不到指定的目標科目');

            const newChapterId = `local-chapter-${now}-${Math.random().toString(36).slice(2, 6)}`;
            const maxOrder = categories.chapters
              .filter(c => (c.subject_id || c.parent_id) === targetSubjectId)
              .reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0);

            const newChapter = {
              id: newChapterId,
              dimension: 'chapter' as const,
              parent_id: targetSubjectId,
              subject_id: targetSubjectId,
              name: sourceUnit.name,
              color: sourceUnit.color || 'default',
              sort_order: maxOrder + 10,
              is_active: sourceUnit.is_active ?? 1,
              created_at: sourceUnit.created_at || now,
              updated_at: now,
              mistake_count: sourceUnit.mistake_count || 0
            };

            categories.chapters.push(newChapter);
            categories.units.splice(uIdx, 1);

            mistakes.forEach(m => {
              if (m.unit_id === sourceId) {
                m.subject_id = targetSubjectId;
                m.subject_name = targetSubj.name;
                m.chapter_id = newChapterId;
                m.chapter_name = newChapter.name;
                m.unit_id = null;
                m.unit_name = null;
                m.updated_at = now;
              }
            });

            if (targetChap && (placement === 'before' || placement === 'after')) {
              reorderLocalChapters(targetSubjectId, newChapterId, targetChap.id, placement);
            }

            saveLocalMistakes(mistakes);
            syncItems();
            return {
              success: true,
              movedItem: { id: newChapterId, dimension: 'chapter', parent_id: targetSubjectId, subject_id: targetSubjectId, name: newChapter.name }
            } as any as T;
          }

          // Move unit into chapter or alongside another unit
          const targetUnit = targetDimension === 'unit' ? categories.units.find(u => u.id === targetId) : null;
          const targetChapterId = targetUnit ? (targetUnit.chapter_id || targetUnit.parent_id || '') : targetId;
          const targetChap = categories.chapters.find(c => c.id === targetChapterId);
          if (!targetChap) throw new Error('找不到指定的目標章節');
          const targetSubjectId = targetChap.subject_id || targetChap.parent_id || '';
          const targetSubj = categories.subjects.find(s => s.id === targetSubjectId);

          sourceUnit.parent_id = targetChapterId;
          sourceUnit.chapter_id = targetChapterId;
          sourceUnit.subject_id = targetSubjectId;
          sourceUnit.updated_at = now;

          mistakes.forEach(m => {
            if (m.unit_id === sourceId) {
              m.subject_id = targetSubjectId;
              m.subject_name = targetSubj?.name || m.subject_name;
              m.chapter_id = targetChapterId;
              m.chapter_name = targetChap.name;
              m.updated_at = now;
            }
          });

          if (targetUnit) {
            reorderLocalUnits(targetChapterId, sourceId, targetUnit.id, placement === 'before' ? 'before' : 'after');
          }

          saveLocalMistakes(mistakes);
          syncItems();
          return {
            success: true,
            movedItem: { id: sourceId, dimension: 'unit', parent_id: targetChapterId, subject_id: targetSubjectId, name: sourceUnit.name }
          } as any as T;
        }

        if (sourceDimension === 'chapter') {
          const cIdx = categories.chapters.findIndex(c => c.id === sourceId);
          if (cIdx === -1) throw new Error('找不到指定的來源章節');
          const sourceChap = categories.chapters[cIdx];

          if (targetDimension === 'subject' || (targetDimension === 'chapter' && (placement === 'before' || placement === 'after'))) {
            const targetChap = targetDimension === 'chapter' ? categories.chapters.find(c => c.id === targetId) : null;
            const targetSubjectId = targetDimension === 'chapter' ? (targetChap?.subject_id || targetChap?.parent_id || '') : targetId;
            const targetSubj = categories.subjects.find(s => s.id === targetSubjectId);
            if (!targetSubj) throw new Error('找不到指定的目標科目');

            sourceChap.parent_id = targetSubjectId;
            sourceChap.subject_id = targetSubjectId;
            sourceChap.updated_at = now;

            categories.units.forEach(u => {
              if (u.parent_id === sourceId || u.chapter_id === sourceId) {
                u.subject_id = targetSubjectId;
                u.updated_at = now;
              }
            });

            mistakes.forEach(m => {
              if (m.chapter_id === sourceId) {
                m.subject_id = targetSubjectId;
                m.subject_name = targetSubj.name;
                m.updated_at = now;
              }
            });

            if (targetChap && (placement === 'before' || placement === 'after')) {
              reorderLocalChapters(targetSubjectId, sourceId, targetChap.id, placement);
            }

            saveLocalMistakes(mistakes);
            syncItems();
            return {
              success: true,
              movedItem: { id: sourceId, dimension: 'chapter', parent_id: targetSubjectId, subject_id: targetSubjectId, name: sourceChap.name }
            } as any as T;
          }

          // Demote chapter -> unit
          const targetUnit = targetDimension === 'unit' ? categories.units.find(u => u.id === targetId) : null;
          const targetChapterId = targetUnit ? (targetUnit.chapter_id || targetUnit.parent_id || '') : targetId;
          if (targetChapterId === sourceId) throw new Error('不可將章節併入自己底下');
          const targetChap = categories.chapters.find(c => c.id === targetChapterId);
          if (!targetChap) throw new Error('找不到指定的目標章節');
          const targetSubjectId = targetChap.subject_id || targetChap.parent_id || '';
          const targetSubj = categories.subjects.find(s => s.id === targetSubjectId);

          const newUnitId = `local-unit-${now}-${Math.random().toString(36).slice(2, 6)}`;
          const maxUnitOrder = categories.units
            .filter(u => (u.chapter_id || u.parent_id) === targetChapterId)
            .reduce((m, u) => Math.max(m, u.sort_order ?? 0), 0);

          const newUnit = {
            id: newUnitId,
            dimension: 'unit' as const,
            parent_id: targetChapterId,
            chapter_id: targetChapterId,
            subject_id: targetSubjectId,
            name: sourceChap.name,
            color: sourceChap.color || 'default',
            sort_order: maxUnitOrder + 10,
            is_active: sourceChap.is_active ?? 1,
            created_at: sourceChap.created_at || now,
            updated_at: now,
            mistake_count: sourceChap.mistake_count || 0
          };

          categories.units.push(newUnit);

          let movedChildUnitCount = 0;
          categories.units.forEach(u => {
            if (u.id !== newUnitId && (u.parent_id === sourceId || u.chapter_id === sourceId)) {
              u.parent_id = targetChapterId;
              u.chapter_id = targetChapterId;
              u.subject_id = targetSubjectId;
              u.updated_at = now;
              movedChildUnitCount++;
            }
          });

          mistakes.forEach(m => {
            if (m.chapter_id === sourceId) {
              m.subject_id = targetSubjectId;
              m.subject_name = targetSubj?.name || m.subject_name;
              m.chapter_id = targetChapterId;
              m.chapter_name = targetChap.name;
              if (!m.unit_id) {
                m.unit_id = newUnitId;
                m.unit_name = newUnit.name;
              }
              m.updated_at = now;
            }
          });

          categories.chapters.splice(cIdx, 1);

          if (targetUnit) {
            reorderLocalUnits(targetChapterId, newUnitId, targetUnit.id, placement === 'before' ? 'before' : 'after');
          }

          saveLocalMistakes(mistakes);
          syncItems();
          return {
            success: true,
            movedItem: { id: newUnitId, dimension: 'unit', parent_id: targetChapterId, subject_id: targetSubjectId, name: newUnit.name },
            movedChildUnitCount
          } as any as T;
        }
      }

      return { success: true } as any as T;
    }

    if (method === 'DELETE') {
      const id = searchParams.get('id') || bodyData?.id;
      const dimension = searchParams.get('dimension') || bodyData?.dimension;
      const mode = searchParams.get('mode') || bodyData?.mode || 'unassign';
      const mistakes = getLocalMistakes();
      if (dimension === 'unit' || categories.units.some(u => u.id === id)) {
        if (mode === 'purge') {
          saveLocalMistakes(mistakes.filter(m => m.unit_id !== id));
        } else if (mode === 'move_to_uncategorized') {
          saveLocalMistakes(
            mistakes.map(m =>
              m.unit_id === id
                ? { ...m, subject_id: null, subject_name: null, chapter_id: null, chapter_name: null, unit_id: null, unit_name: null }
                : m
            )
          );
        } else {
          saveLocalMistakes(mistakes.map(m => (m.unit_id === id ? { ...m, unit_id: null, unit_name: null } : m)));
        }
        categories.units = categories.units.filter(u => u.id !== id);
        categories.items = categories.items.filter(it => it.id !== id);
        saveLocalCategories(categories);
      } else if (dimension === 'chapter' || categories.chapters.some(c => c.id === id)) {
        if (mode === 'purge') {
          saveLocalMistakes(mistakes.filter(m => m.chapter_id !== id));
        } else {
          saveLocalMistakes(
            mistakes.map(m =>
              m.chapter_id === id
                ? {
                    ...m,
                    ...(mode === 'move_to_uncategorized' ? { subject_id: null, subject_name: null } : {}),
                    chapter_id: null,
                    chapter_name: null,
                    unit_id: null,
                    unit_name: null
                  }
                : m
            )
          );
        }
        categories.units = categories.units.filter(u => u.chapter_id !== id && u.parent_id !== id);
        categories.chapters = categories.chapters.filter(c => c.id !== id);
        categories.items = categories.items.filter(it => it.id !== id && it.parent_id !== id);
        saveLocalCategories(categories);
      } else if (dimension === 'subject' || categories.subjects.some(s => s.id === id)) {
        const chapIds = new Set(categories.chapters.filter(c => c.subject_id === id || c.parent_id === id).map(c => c.id));
        if (mode === 'purge') {
          saveLocalMistakes(mistakes.filter(m => m.subject_id !== id && (!m.chapter_id || !chapIds.has(m.chapter_id))));
        } else {
          saveLocalMistakes(
            mistakes.map(m =>
              m.subject_id === id || (m.chapter_id && chapIds.has(m.chapter_id))
                ? { ...m, subject_id: null, subject_name: null, chapter_id: null, chapter_name: null, unit_id: null, unit_name: null }
                : m
            )
          );
        }
        categories.units = categories.units.filter(u => u.subject_id !== id && !chapIds.has(u.parent_id || ''));
        categories.chapters = categories.chapters.filter(c => !chapIds.has(c.id));
        categories.subjects = categories.subjects.filter(s => s.id !== id);
        categories.items = categories.items.filter(it => it.id !== id && !chapIds.has(it.id));
        saveLocalCategories(categories);
      }
      return { success: true } as any as T;
    }
  }

  if (pathname === '/api/subjects' && method === 'DELETE') {
    const id = searchParams.get('id');
    const mode = searchParams.get('mode') || 'unassign';
    const categories = getLocalCategories();
    const mistakes = getLocalMistakes();
    const chapIds = new Set(categories.chapters.filter(c => c.subject_id === id || c.parent_id === id).map(c => c.id));
    if (mode === 'purge') {
      saveLocalMistakes(mistakes.filter(m => m.subject_id !== id && (!m.chapter_id || !chapIds.has(m.chapter_id))));
    } else {
      saveLocalMistakes(
        mistakes.map(m =>
          m.subject_id === id || (m.chapter_id && chapIds.has(m.chapter_id))
            ? { ...m, subject_id: null, subject_name: null, chapter_id: null, chapter_name: null, unit_id: null, unit_name: null }
            : m
        )
      );
    }
    categories.units = categories.units.filter(u => u.subject_id !== id && !chapIds.has(u.parent_id || ''));
    categories.chapters = categories.chapters.filter(c => !chapIds.has(c.id));
    categories.subjects = categories.subjects.filter(s => s.id !== id);
    categories.items = categories.items.filter(it => it.id !== id && !chapIds.has(it.id));
    saveLocalCategories(categories);
    return { success: true } as any as T;
  }

  if (pathname === '/api/chapters' && method === 'DELETE') {
    const id = searchParams.get('id');
    const mode = searchParams.get('mode') || 'unassign';
    const categories = getLocalCategories();
    const mistakes = getLocalMistakes();
    if (mode === 'purge') {
      saveLocalMistakes(mistakes.filter(m => m.chapter_id !== id));
    } else {
      saveLocalMistakes(
        mistakes.map(m =>
          m.chapter_id === id
            ? {
                ...m,
                ...(mode === 'move_to_uncategorized' ? { subject_id: null, subject_name: null } : {}),
                chapter_id: null,
                chapter_name: null,
                unit_id: null,
                unit_name: null
              }
            : m
        )
      );
    }
    categories.units = categories.units.filter(u => u.chapter_id !== id && u.parent_id !== id);
    categories.chapters = categories.chapters.filter(c => c.id !== id);
    categories.items = categories.items.filter(it => it.id !== id && it.parent_id !== id);
    saveLocalCategories(categories);
    return { success: true } as any as T;
  }

  if (pathname === '/api/subjects' && method === 'POST') {
    const categories = getLocalCategories();
    const trimmedName = (bodyData.name || '').trim();
    const existing = categories.subjects.find(
      s => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return { success: true, id: existing.id, subject: existing, item: existing } as any as T;
    }
    const newSubject = {
      id: `local-subject-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dimension: 'subject' as const,
      parent_id: null,
      name: trimmedName,
      color: bodyData.color || 'color:emerald;icon:Book',
      sort_order: (categories.subjects.length + 1) * 10,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    };
    categories.subjects.push(newSubject);
    saveLocalCategories(categories);
    return { success: true, id: newSubject.id, subject: newSubject, item: newSubject } as any as T;
  }

  if (pathname === '/api/chapters' && method === 'POST') {
    const categories = getLocalCategories();
    const trimmedName = (bodyData.name || '').trim();
    const existing = categories.chapters.find(
      c =>
        (c.subject_id === bodyData.subjectId || c.parent_id === bodyData.subjectId) &&
        c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return { success: true, id: existing.id, chapter: existing, item: existing } as any as T;
    }
    const newChapter = {
      id: `local-chapter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dimension: 'chapter' as const,
      parent_id: bodyData.subjectId,
      subject_id: bodyData.subjectId,
      name: trimmedName,
      color: 'default',
      sort_order: 10,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      mistake_count: 0
    };
    categories.chapters.push(newChapter);
    saveLocalCategories(categories);
    return { success: true, id: newChapter.id, chapter: newChapter, item: newChapter } as any as T;
  }

  // 3. Image Upload (/api/images/upload)
  if (pathname === '/api/images/upload' && method === 'POST') {
    let dataUrl = '';
    if (bodyData instanceof Blob) {
      dataUrl = await blobToDataUrl(bodyData);
    } else if (typeof bodyData === 'string' && bodyData.startsWith('data:')) {
      dataUrl = bodyData;
    }
    return { success: true, key: dataUrl } as any as T;
  }

  // 4. Templates & Prompt Templates
  if (pathname === '/api/templates') {
    return [
      {
        id: 'default-exam',
        name: '高中大考標準題型模板',
        fields: {
          questionFields: [
            { id: 'q_desc', label: '題幹內容 / 詳述', type: 'textarea' },
            { id: 'q_image', label: '題目圖檔 / 照片', type: 'image' },
          ],
          answerFields: [
            { id: 'a_desc', label: '答案與完整詳解', type: 'textarea' },
            { id: 'a_image', label: '解題圖檔 / 板書紀錄', type: 'image' },
          ]
        }
      }
    ] as any as T;
  }

  if (pathname === '/api/prompt-templates') {
    const PT_KEY = 'pobi_local_prompt_templates';
    const readPT = (): any[] => {
      try {
        const raw = localStorage.getItem(PT_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    };
    const writePT = (list: any[]) => {
      try {
        localStorage.setItem(PT_KEY, JSON.stringify(list));
      } catch {}
    };
    if (method === 'GET') {
      return readPT() as any as T;
    }
    if (method === 'POST') {
      const list = readPT();
      const tpl = {
        id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        base_key: bodyData?.baseKey || null,
        name: bodyData?.name || '自訂提詞',
        description: bodyData?.description || '',
        content: bodyData?.content || ''
      };
      list.push(tpl);
      writePT(list);
      return { success: true, template: tpl } as any as T;
    }
    if (method === 'PUT') {
      const list = readPT().map(t =>
        t.id === bodyData?.id
          ? { ...t, name: bodyData.name, description: bodyData.description, content: bodyData.content }
          : t
      );
      writePT(list);
      return { success: true } as any as T;
    }
    if (method === 'DELETE') {
      const id = searchParams.get('id');
      writePT(readPT().filter(t => t.id !== id));
      return { success: true } as any as T;
    }
    return [] as any as T;
  }

  // 5. Auth & User Profile
  if (pathname === '/api/auth/register' && method === 'POST') {
    const { username, registerAsAdmin, is_admin } = bodyData || {};
    const trimmed = (username || '').trim();
    const isJimmy = trimmed.toLowerCase() === 'jimmy';
    const rawUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: trimmed || '學生同學',
      is_admin: (isJimmy || registerAsAdmin || is_admin) ? 1 : 0,
      created_at: Date.now()
    };
    const savedUser = upsertLocalUser(rawUser);
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(savedUser));
    } catch {}
    return { success: true, message: '註冊成功', user: savedUser } as any as T;
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const { username } = bodyData || {};
    const trimmed = (username || '').trim();
    const isJimmy = trimmed.toLowerCase() === 'jimmy';
    const existingInList = getLocalUsersList().find(u => u.username.toLowerCase() === trimmed.toLowerCase());
    const userToSave = existingInList || {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: trimmed || '學生同學',
      is_admin: isJimmy ? 1 : 0,
      created_at: Date.now()
    };
    const currentUser = upsertLocalUser(userToSave);
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } catch {}
    return { success: true, user: currentUser } as any as T;
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
    return { success: true } as any as T;
  }

  if (pathname === '/api/auth/me') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.id && u.username) {
          if (String(u.username).toLowerCase() === 'jimmy') {
            u.is_admin = 1;
            try { localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u)); } catch {}
          }
          upsertLocalUser(u);
          return { success: true, user: u } as any as T;
        }
      }
    } catch {}
    return { success: false, user: null } as any as T;
  }

  // 6. Admin API fallbacks
  if (pathname === '/api/admin/users' && method === 'GET') {
    let currentUser: any = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      if (raw) currentUser = JSON.parse(raw);
    } catch {}
    if (currentUser && currentUser.id && currentUser.username) {
      upsertLocalUser(currentUser);
    }
    return getLocalUsersList() as any as T;
  }

  if (pathname === '/api/admin/users' && method === 'POST') {
    const { username, is_admin } = bodyData || {};
    const trimmed = (username || '').trim();
    if (!trimmed) {
      throw new Error('請輸入有效的使用者名稱');
    }
    const existing = getLocalUsersList().find(u => u.username.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      throw new Error('此使用者名稱已被註冊，請使用其他名稱。');
    }
    const created = upsertLocalUser({
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: trimmed,
      is_admin: is_admin ? 1 : 0,
      created_at: Date.now()
    });
    return { success: true, user: created } as any as T;
  }

  if (pathname.startsWith('/api/admin/users/') && method === 'DELETE') {
    const targetUserId = pathname.replace('/api/admin/users/', '').trim();
    const filtered = getLocalUsersList().filter(u => u.id !== targetUserId);
    saveLocalUsersList(filtered);
    return { success: true } as any as T;
  }

  if (pathname === '/api/share') {
    const SHARE_KEY = 'pobi_local_shared_packs';
    const SHARE_TTL_DAYS = 30;
    const SHARE_TTL_MS = SHARE_TTL_DAYS * 24 * 60 * 60 * 1000;
    const readPacks = (): Record<string, any> => {
      try {
        const raw = localStorage.getItem(SHARE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    };
    if (method === 'POST') {
      const packs = readPacks();
      const now = Date.now();
      for (const [k, v] of Object.entries(packs)) {
        const exp = typeof v?.expiresAt === 'number' ? v.expiresAt : (Number(v?.createdAt) || 0) + SHARE_TTL_MS;
        if (now > exp) delete packs[k];
      }
      const shareId = `demo${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      let creatorName = 'PobiNotes 學習者';
      try {
        const rawU = localStorage.getItem(STORAGE_KEYS.USER);
        if (rawU) creatorName = JSON.parse(rawU)?.username || creatorName;
      } catch {}
      const expiresAt = now + SHARE_TTL_MS;
      packs[shareId] = {
        id: shareId,
        title: String(bodyData?.title || '精華錯題分享包').trim(),
        creatorName,
        createdAt: now,
        expiresAt,
        ttlDays: SHARE_TTL_DAYS,
        items: Array.isArray(bodyData?.items) ? bodyData.items : []
      };
      try {
        localStorage.setItem(SHARE_KEY, JSON.stringify(packs));
      } catch {}
      return { success: true, shareId, expiresAt, ttlDays: SHARE_TTL_DAYS } as any as T;
    }
    if (method === 'GET') {
      const id = searchParams.get('id') || '';
      const packs = readPacks();
      if (packs[id]) {
        const p = packs[id];
        const expiresAt = typeof p.expiresAt === 'number' ? p.expiresAt : (Number(p.createdAt) || 0) + SHARE_TTL_MS;
        if (Date.now() > expiresAt) {
          delete packs[id];
          try {
            localStorage.setItem(SHARE_KEY, JSON.stringify(packs));
          } catch {}
          throw new Error('此錯題分享連結已超過 30 天有效期限，系統已自動失效並清除。');
        }
        return { success: true, pack: { ...p, expiresAt, ttlDays: SHARE_TTL_DAYS } } as any as T;
      }
      throw new Error('找不到此錯題分享連結，或連結已超過 30 天效期而自動失效');
    }
  }

  if (pathname === '/api/feedback') {
    return [] as any as T;
  }

  // Default fallback response
  return { success: true } as any as T;
}
