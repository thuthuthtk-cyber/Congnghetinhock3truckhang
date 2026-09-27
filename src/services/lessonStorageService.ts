import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { Lesson5EPlan } from '../types';
import { INITIAL_LESSONS } from './mockData';

export const ELEARNING_LESSONS_STORAGE_KEY = 'eduplay_5e_lessons';
export const ELEARNING_LESSONS_COLLECTION = 'elearning_lessons';

/**
 * Get cached lessons from localStorage as fallback
 */
export function getLocalCachedLessons(): Lesson5EPlan[] {
  try {
    const saved = localStorage.getItem(ELEARNING_LESSONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Error reading local lessons cache:', err);
  }
  return [];
}

/**
 * Save Lesson to Firestore & Local Storage
 */
export async function saveLessonToFirestore(lesson: Lesson5EPlan): Promise<void> {
  // 1. Update local cache first for rapid UI responsiveness
  try {
    const current = getLocalCachedLessons();
    const updated = [lesson, ...current.filter(item => item.id !== lesson.id)];
    localStorage.setItem(ELEARNING_LESSONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to cache lesson locally:', e);
  }

  // 2. Persist to Firestore if connection exists
  if (db) {
    try {
      const ref = doc(db, ELEARNING_LESSONS_COLLECTION, lesson.id);
      // Ensure we convert any undefined values to null or omit them to prevent Firestore write crashes
      const sanitizedPayload = JSON.parse(JSON.stringify(lesson));
      await setDoc(ref, {
        ...sanitizedPayload,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Failed to save lesson to Firestore:', err);
      throw err;
    }
  }
}

/**
 * Delete Lesson from Firestore & Local Storage
 */
export async function deleteLessonFromFirestore(id: string): Promise<void> {
  // 1. Update local cache
  try {
    const current = getLocalCachedLessons();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(ELEARNING_LESSONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete lesson from cache:', e);
  }

  // 2. Delete from Firestore
  if (db) {
    try {
      const ref = doc(db, ELEARNING_LESSONS_COLLECTION, id);
      await deleteDoc(ref);
    } catch (err) {
      console.error('Failed to delete lesson from Firestore:', err);
      throw err;
    }
  }
}

/**
 * Subscribe to lessons from Firestore (Real-time sync)
 */
export function subscribeToLessonsFromFirestore(
  onUpdate: (lessons: Lesson5EPlan[]) => void,
  onError?: (err: Error) => void
) {
  if (!db) {
    // If no db, trigger update with cached data immediately
    onUpdate(getLocalCachedLessons());
    return () => {};
  }

  const q = query(collection(db, ELEARNING_LESSONS_COLLECTION));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const lessons: Lesson5EPlan[] = [];
      snapshot.forEach((docSnap) => {
        lessons.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Lesson5EPlan);
      });

      if (lessons.length > 0) {
        // Cache to local storage
        try {
          localStorage.setItem(ELEARNING_LESSONS_STORAGE_KEY, JSON.stringify(lessons));
        } catch (e) {
          console.warn('Error updating lessons cache during subscription:', e);
        }
        onUpdate(lessons);
      } else {
        localStorage.setItem(ELEARNING_LESSONS_STORAGE_KEY, JSON.stringify([]));
        onUpdate([]);
      }
    },
    (err) => {
      console.warn('Firestore subscription failed for lessons:', err);
      if (onError) onError(err);
      // Fallback
      onUpdate(getLocalCachedLessons());
    }
  );
}
