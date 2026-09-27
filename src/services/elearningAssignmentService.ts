import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Lesson5EPlan } from '../types';

export const ELEARNING_ASSIGNMENT_STORAGE_KEY = 'eduplay_assigned_elearning_lessons';
export const ELEARNING_ASSIGNMENT_COLLECTION = 'assigned_elearning';

export interface AssignedELearningLesson {
  id: string;
  lessonId: string;
  lessonTitle: string;
  title: string;
  subject: string;
  grade: string;
  targetClass: string; // e.g. "Lớp 3A"
  assignedTo: 'all' | 'individual';
  startDate: string;
  dueDate: string;
  isUnlimited: boolean;
  allowRetake: boolean;
  requireInteractiveVideo: boolean;
  assignedAt: string;
  assignedBy?: string;
  lessonData?: Lesson5EPlan;
  originalLessonAssignmentId?: string;
  type?: 'elearning' | string;
  category?: 'elearning' | string;
  contentType?: 'elearning' | string;
}

/**
 * Generate semantic deduplication key for assigned E-Learning lessons.
 * Ensures that 1 lesson assigned to 1 class with same title/due date always resolves to 1 single record.
 */
export function getELearningDeduplicationKey(lesson: Partial<AssignedELearningLesson>): string {
  if (!lesson) return '';
  const cleanLessonId = (lesson.lessonId || '').trim();
  const cleanTitle = (lesson.lessonTitle || lesson.title || '')
    .toLowerCase()
    .replace(/^e-learning:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanClass = (lesson.targetClass || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
  const cleanDueDate = (lesson.dueDate || '').trim().toLowerCase();

  if (cleanLessonId && cleanClass) {
    return `les_${cleanLessonId}__cls_${cleanClass}`;
  }
  return `title_${cleanTitle}__cls_${cleanClass}__due_${cleanDueDate}`;
}

/**
 * Normalizes and strictly deduplicates assigned lessons.
 * Also expands multi-class strings (e.g. "Lớp 3A, Lớp 3B") into distinct single-class records.
 */
export function normalizeAssignedELearningLessons(lessons: AssignedELearningLesson[]): AssignedELearningLesson[] {
  const expanded: AssignedELearningLesson[] = [];
  (lessons || []).forEach(lesson => {
    if (!lesson || !lesson.id) return;
    const enrichedLesson: AssignedELearningLesson = {
      ...lesson,
      type: lesson.type || 'elearning',
      category: lesson.category || 'elearning',
      contentType: lesson.contentType || 'elearning'
    };
    if (enrichedLesson.targetClass && enrichedLesson.targetClass.includes(',')) {
      const classes = enrichedLesson.targetClass.split(',').map(c => c.trim()).filter(Boolean);
      if (classes.length > 0) {
        const rootId = enrichedLesson.originalLessonAssignmentId || enrichedLesson.id.replace(/-class-.*$/, '');
        classes.forEach((cls, idx) => {
          expanded.push({
            ...enrichedLesson,
            id: idx === 0 ? enrichedLesson.id : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            targetClass: cls,
            originalLessonAssignmentId: rootId,
          });
        });
      } else {
        expanded.push(enrichedLesson);
      }
    } else {
      expanded.push(enrichedLesson);
    }
  });

  // Strict Deduplication Pass by ID and Semantic Key
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const uniqueResult: AssignedELearningLesson[] = [];

  expanded.forEach(item => {
    if (!item.id || seenIds.has(item.id)) return;
    const semanticKey = getELearningDeduplicationKey(item);
    if (seenKeys.has(semanticKey)) return;

    seenIds.add(item.id);
    seenKeys.add(semanticKey);
    uniqueResult.push(item);
  });

  return uniqueResult;
}

/**
 * Initial sample seed for smooth initial preview
 */
export const DEFAULT_ASSIGNED_ELEARNING_SEEDS: AssignedELearningLesson[] = [
  {
    id: 'elearn-seed-1',
    lessonId: 'les-1',
    lessonTitle: 'Bài 1: Tự nhiên và công nghệ (Môn Công nghệ lớp 3)',
    title: 'E-Learning: Bài 1: Tự nhiên và công nghệ (Môn Công nghệ lớp 3)',
    subject: 'Công nghệ',
    grade: 'Khối 3',
    targetClass: 'Lớp 3C',
    assignedTo: 'all',
    startDate: '01/09/2026 08:00 AM',
    dueDate: '30/10/2026 11:59 PM',
    isUnlimited: false,
    allowRetake: true,
    requireInteractiveVideo: true,
    assignedAt: '01/09/2026',
    assignedBy: 'Cô Nguyễn Thị Hoa',
    type: 'elearning',
    category: 'elearning',
    contentType: 'elearning'
  }
];

/**
 * Get cached assigned lessons from localStorage with strict deduplication
 */
export function getLocalCachedAssignedELearning(): AssignedELearningLesson[] {
  let combined: AssignedELearningLesson[] = [];
  try {
    const saved = localStorage.getItem(ELEARNING_ASSIGNMENT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        combined = parsed.map(p => ({
          ...p,
          type: 'elearning',
          category: 'elearning',
          contentType: 'elearning'
        }));
      }
    }
  } catch (err) {
    console.warn('Error reading local assigned elearning cache:', err);
  }

  // Also check if any elearning items exist in assignments cache and incorporate them (with key matching)
  try {
    const cachedAssignmentsStr = localStorage.getItem('eduplay_cached_assignments');
    if (cachedAssignmentsStr) {
      const parsedAssignments = JSON.parse(cachedAssignmentsStr);
      if (Array.isArray(parsedAssignments)) {
        const existingKeys = new Set(combined.map(item => getELearningDeduplicationKey(item)));
        const existingIds = new Set(combined.map(item => item.id));

        parsedAssignments.forEach((as: any) => {
          const type = (as.type || as.category || as.contentType || '').toLowerCase();
          if (type === 'elearning' || type === 'bai_giang' || (as.id && as.id.startsWith('elearn-'))) {
            const mappedItem: AssignedELearningLesson = {
              id: as.id,
              lessonId: as.lessonId || as.id,
              lessonTitle: as.lessonTitle || (as.title ? as.title.replace(/^E-Learning:\s*/i, '') : 'Bài giảng E-Learning'),
              title: as.title || 'Bài giảng E-Learning',
              subject: as.subject || 'Công nghệ',
              grade: as.grade || 'Khối 3',
              targetClass: as.targetClass || 'Lớp 3A',
              assignedTo: as.assignedTo || 'all',
              startDate: as.startDate || '01/09/2026 08:00 AM',
              dueDate: as.dueDate || '30/10/2026 11:59 PM',
              isUnlimited: as.isUnlimited ?? false,
              allowRetake: as.allowRetake ?? true,
              requireInteractiveVideo: as.requireInteractiveVideo ?? true,
              assignedAt: as.assignedDate || as.assignedAt || new Date().toLocaleDateString('vi-VN'),
              assignedBy: as.teacherName || as.assignedBy || 'Thầy/Cô Giáo',
              lessonData: as.lessonData,
              type: 'elearning',
              category: 'elearning',
              contentType: 'elearning'
            };

            const itemKey = getELearningDeduplicationKey(mappedItem);
            if (!existingIds.has(mappedItem.id) && !existingKeys.has(itemKey)) {
              existingIds.add(mappedItem.id);
              existingKeys.add(itemKey);
              combined.push(mappedItem);
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Error scanning cached assignments for elearning items:', err);
  }

  if (combined.length === 0) {
    combined = DEFAULT_ASSIGNED_ELEARNING_SEEDS;
  }

  return normalizeAssignedELearningLessons(combined);
}

/**
 * Clean existing duplicate assigned lessons from local storage and Firestore
 */
export async function cleanDuplicateAssignedELearningLessons(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(ELEARNING_ASSIGNMENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const clean = normalizeAssignedELearningLessons(parsed);
        if (clean.length !== parsed.length) {
          console.log(`🧹 Đã dọn dẹp ${parsed.length - clean.length} bản ghi bài giảng E-Learning bị trùng lặp trong bộ nhớ!`);
          localStorage.setItem(ELEARNING_ASSIGNMENT_STORAGE_KEY, JSON.stringify(clean));
          window.dispatchEvent(new CustomEvent('eduplay_elearning_assigned_updated', { detail: clean }));
        }
      }
    }

    // Remote Firestore cleanup of duplicates
    if (db) {
      const snap = await getDocs(collection(db, ELEARNING_ASSIGNMENT_COLLECTION));
      if (!snap.empty) {
        const seenRemoteKeys = new Map<string, string>(); // key -> docId to keep
        const docsToDelete: string[] = [];

        snap.forEach(docSnap => {
          const data = docSnap.data() as AssignedELearningLesson;
          const key = getELearningDeduplicationKey({ ...data, id: docSnap.id });
          if (seenRemoteKeys.has(key)) {
            docsToDelete.push(docSnap.id);
          } else {
            seenRemoteKeys.set(key, docSnap.id);
          }
        });

        for (const duplicateId of docsToDelete) {
          try {
            await deleteDoc(doc(db, ELEARNING_ASSIGNMENT_COLLECTION, duplicateId));
            console.log(`🗑️ Đã xóa bản ghi E-Learning trùng lặp trên Cloud Firestore: ${duplicateId}`);
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn('cleanDuplicateAssignedELearningLessons warning:', e);
  }
}

// Auto-run deduplication cleanup on initialization
if (typeof window !== 'undefined') {
  setTimeout(() => {
    cleanDuplicateAssignedELearningLessons();
  }, 500);
}

/**
 * Save assigned lesson to Firestore & Local Storage with duplicate protection
 */
export async function saveAssignedELearningLesson(assignment: AssignedELearningLesson): Promise<void> {
  const normalizedRecord: AssignedELearningLesson = {
    ...assignment,
    type: 'elearning',
    category: 'elearning',
    contentType: 'elearning'
  };
  const targetKey = getELearningDeduplicationKey(normalizedRecord);

  // 1. Update local cache first with semantic deduplication
  try {
    const current = getLocalCachedAssignedELearning();
    // Check if an existing record matches by ID or by semantic deduplication key
    const existingIdx = current.findIndex(item =>
      item.id === normalizedRecord.id ||
      getELearningDeduplicationKey(item) === targetKey
    );

    let updated: AssignedELearningLesson[];
    if (existingIdx >= 0) {
      // Update existing record in-place to avoid duplicate
      const existingId = current[existingIdx].id;
      normalizedRecord.id = existingId;
      updated = [...current];
      updated[existingIdx] = { ...current[existingIdx], ...normalizedRecord };
    } else {
      updated = [normalizedRecord, ...current];
    }

    const cleanList = normalizeAssignedELearningLessons(updated);
    localStorage.setItem(ELEARNING_ASSIGNMENT_STORAGE_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(new CustomEvent('eduplay_elearning_assigned_updated', { detail: cleanList }));
  } catch (e) {
    console.warn('Failed to cache assigned elearning lesson:', e);
  }

  // 2. Persist to Firestore
  try {
    if (db) {
      const ref = doc(db, ELEARNING_ASSIGNMENT_COLLECTION, normalizedRecord.id);
      await setDoc(ref, {
        ...normalizedRecord,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Also persist to 'assignments' collection with strictly explicit elearning type tags
      try {
        const assignRef = doc(db, 'assignments', normalizedRecord.id);
        await setDoc(assignRef, {
          id: normalizedRecord.id,
          title: normalizedRecord.title,
          subject: normalizedRecord.subject,
          grade: normalizedRecord.grade,
          targetClass: normalizedRecord.targetClass,
          teacherName: normalizedRecord.assignedBy || 'Thầy/Cô Giáo',
          dueDate: normalizedRecord.dueDate,
          assignedDate: normalizedRecord.assignedAt,
          description: `Bài học E-Learning: ${normalizedRecord.lessonTitle}`,
          totalStudents: 35,
          completedCount: 0,
          isApproved: true,
          type: 'elearning',
          category: 'elearning',
          contentType: 'elearning',
          lessonId: normalizedRecord.lessonId,
          lessonData: normalizedRecord.lessonData || null,
          createdAt: new Date().toISOString(),
          submissions: []
        }, { merge: true });
      } catch (err) {
        console.warn('Cross-write to assignments collection skipped:', err);
      }
    }
  } catch (err) {
    console.error('Error saving assigned elearning to Firestore:', err);
  }
}

/**
 * Delete an assigned lesson from Firestore & Local Storage
 */
export async function deleteAssignedELearningLesson(id: string): Promise<void> {
  try {
    const current = getLocalCachedAssignedELearning();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(ELEARNING_ASSIGNMENT_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('eduplay_elearning_assigned_updated', { detail: updated }));
  } catch (e) {
    console.warn('Failed to remove from local cache:', e);
  }

  try {
    if (db) {
      const ref = doc(db, ELEARNING_ASSIGNMENT_COLLECTION, id);
      await deleteDoc(ref);

      try {
        const assignRef = doc(db, 'assignments', id);
        await deleteDoc(assignRef);
      } catch {}
    }
  } catch (err) {
    console.error('Error deleting assigned elearning from Firestore:', err);
  }
}

/**
 * Fetch all assigned lessons from Firestore, fallback to localStorage
 */
export async function fetchAssignedELearningLessons(): Promise<AssignedELearningLesson[]> {
  try {
    if (db) {
      const snap = await getDocs(collection(db, ELEARNING_ASSIGNMENT_COLLECTION));
      if (!snap.empty) {
        const items: AssignedELearningLesson[] = [];
        snap.forEach(docSnap => {
          items.push(docSnap.data() as AssignedELearningLesson);
        });
        localStorage.setItem(ELEARNING_ASSIGNMENT_STORAGE_KEY, JSON.stringify(items));
        return items;
      }
    }
  } catch (err) {
    console.warn('Firestore fetch failed, returning local cache:', err);
  }
  return getLocalCachedAssignedELearning();
}

/**
 * Realtime listener for assigned lessons
 */
export function subscribeAssignedELearningLessons(callback: (lessons: AssignedELearningLesson[]) => void): () => void {
  // Call immediately with local cache
  callback(getLocalCachedAssignedELearning());

  let unsubscribeFirestore: (() => void) | null = null;
  try {
    if (db) {
      const qRef = collection(db, ELEARNING_ASSIGNMENT_COLLECTION);
      unsubscribeFirestore = onSnapshot(qRef, (snapshot) => {
        const items: AssignedELearningLesson[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as AssignedELearningLesson);
        });
        if (items.length > 0) {
          localStorage.setItem(ELEARNING_ASSIGNMENT_STORAGE_KEY, JSON.stringify(items));
          callback(normalizeAssignedELearningLessons(items));
        } else {
          // If firestore is empty, also check local cache
          callback(getLocalCachedAssignedELearning());
        }
      }, (err) => {
        console.warn('Firestore onSnapshot error for assigned elearning:', err);
        callback(getLocalCachedAssignedELearning());
      });
    }
  } catch (err) {
    console.warn('Failed to attach firestore listener:', err);
  }

  // Also listen for local custom events (e.g. from same window / tabs)
  const handleLocalUpdate = (e: Event) => {
    const customEvt = e as CustomEvent<AssignedELearningLesson[]>;
    if (customEvt.detail) {
      callback(normalizeAssignedELearningLessons(customEvt.detail));
    } else {
      callback(getLocalCachedAssignedELearning());
    }
  };

  window.addEventListener('eduplay_elearning_assigned_updated', handleLocalUpdate);

  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
    window.removeEventListener('eduplay_elearning_assigned_updated', handleLocalUpdate);
  };
}
