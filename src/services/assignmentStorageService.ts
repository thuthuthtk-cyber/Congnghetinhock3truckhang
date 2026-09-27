import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { HomeworkAssignment, QuestionItem } from '../types';
import { INITIAL_ASSIGNMENTS } from './mockData';
import { removeUndefined, getCurrentTeacherProfile, resolveCurrentTeacherProfile } from './teacherStorageService';
import { isOrderingQuestionType, resolveCanonicalOrderingSteps } from './questionStorageService';

const ASSIGNMENTS_CACHE_KEY = 'eduplay_cached_assignments';

function sanitizeAssignmentOrderingQuestions(as: HomeworkAssignment): { assignment: HomeworkAssignment; changed: boolean } {
  if (!as || !Array.isArray(as.questions) || as.questions.length === 0) {
    return { assignment: as, changed: false };
  }
  let changed = false;
  const fixedQuestions: QuestionItem[] = as.questions.map((q) => {
    if (!q || !isOrderingQuestionType(q)) return q;
    const canonical = resolveCanonicalOrderingSteps(q);
    if (canonical.length === 0) return q;
    const canonicalAns = canonical.join(' -> ');
    const currentOpts = Array.isArray(q.options) ? q.options : [];
    if (JSON.stringify(currentOpts) !== JSON.stringify(canonical) || q.correctAnswer !== canonicalAns) {
      changed = true;
      return {
        ...q,
        options: canonical,
        correctAnswer: canonicalAns
      };
    }
    return q;
  });
  return changed ? { assignment: { ...as, questions: fixedQuestions }, changed: true } : { assignment: as, changed: false };
}

/**
 * Deduplication helper for homework assignments
 */
export function getAssignmentDeduplicationKey(a: Partial<HomeworkAssignment>): string {
  if (!a) return '';
  const cleanTitle = (a.title || '')
    .trim()
    .toLowerCase()
    .replace(/^bài tập tự luyện:\s*/i, '')
    .replace(/^bài tập:\s*/i, '')
    .replace(/\s+/g, ' ');
  const targetClass = (a.targetClass || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  const subject = (a.subject || '').trim().toLowerCase();
  const grade = (a.grade || '').trim().toLowerCase();
  const dueDate = (a.dueDate || '').trim().toLowerCase();
  const originalAssignmentId = (a.originalAssignmentId || '').trim();

  if (originalAssignmentId && targetClass) {
    return `root_${originalAssignmentId}__cls_${targetClass}`;
  }
  return `title_${cleanTitle}__cls_${targetClass}__sub_${subject}__grd_${grade}__due_${dueDate}`;
}

export function deduplicateAssignments(assignments: HomeworkAssignment[]): HomeworkAssignment[] {
  const seenIds = new Set<string>();
  const clean: HomeworkAssignment[] = [];

  (assignments || []).forEach(as => {
    if (!as || !as.id) return;
    if (seenIds.has(as.id)) return;

    seenIds.add(as.id);
    const { assignment: sanitized } = sanitizeAssignmentOrderingQuestions(as);
    clean.push(sanitized);
  });

  return clean;
}

/**
 * Quét và dọn dẹp các bản ghi bài tập trùng lặp trong cả LocalStorage và Firestore
 */
export async function cleanDuplicateAssignments(): Promise<void> {
  try {
    const cached = getLocalCachedAssignments();
    const cleanList = deduplicateAssignments(cached);
    if (cleanList.length !== cached.length) {
      console.log(`🧹 Đã dọn dẹp ${cached.length - cleanList.length} bài tập trùng lặp trong LocalStorage`);
      saveAssignmentsToLocalStorage(cleanList);
    }
  } catch (err) {
    console.warn('Lỗi khi chạy cleanDuplicateAssignments:', err);
  }
}

// Chạy dọn dẹp tự động khi tải
if (typeof window !== 'undefined') {
  setTimeout(() => {
    cleanDuplicateAssignments().catch(console.error);
  }, 1000);
}

/**
 * Get assignments from LocalStorage Cache
 */
export function getLocalCachedAssignments(): HomeworkAssignment[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(ASSIGNMENTS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateAssignments(parsed);
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc cache bài tập từ LocalStorage:', e);
  }
  return [];
}

/**
 * Save assignments to LocalStorage Cache
 */
export function saveAssignmentsToLocalStorage(assignments: HomeworkAssignment[]): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = deduplicateAssignments(assignments);
    localStorage.setItem(ASSIGNMENTS_CACHE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('Lỗi lưu cache bài tập vào LocalStorage:', e);
  }
}

/**
 * Save a HomeworkAssignment to Firestore
 */
export async function saveAssignmentToFirestore(assignment: HomeworkAssignment): Promise<void> {
  try {
    // 0. Resolve the authentic teacher profile using resolveCurrentTeacherProfile (SSOT)
    const currentEmail = (
      assignment.teacherEmail ||
      (auth && auth.currentUser ? auth.currentUser.email : null) ||
      (typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_email') : null) ||
      ''
    ).toLowerCase().trim();

    const profile = resolveCurrentTeacherProfile(currentEmail);

    // Strictly enforce teacherId: MUST be business ID (e.g. 'gv-12'), NEVER Firebase Auth UID!
    const isInvalidTeacherId =
      !assignment.teacherId ||
      assignment.teacherId === 'u-4' ||
      assignment.teacherId === 'gv-temp' ||
      assignment.teacherId.length > 10 || // Firebase Auth UIDs are 28 characters long
      (currentEmail.includes('thuthuthtk') && assignment.teacherId !== 'gv-12');

    if (isInvalidTeacherId) {
      assignment.teacherId = profile.id;
    }

    // Strictly enforce teacherName: MUST match authentic profile
    const isMismatchedName =
      !assignment.teacherName ||
      assignment.teacherName === 'Lê Minh Anh' ||
      assignment.teacherName === 'Nguyễn Thị Thủ' ||
      assignment.teacherName === 'Nguyễn Thị Thủ (ADMIN)' ||
      (currentEmail.includes('thuthuthtk') && assignment.teacherName !== 'Nguyễn Thị Thu') ||
      (!currentEmail.includes('vanquan') && assignment.teacherName.includes('Văn Quân'));

    if (isMismatchedName) {
      assignment.teacherName = profile.name;
    }

    // Ensure teacherEmail is populated
    assignment.teacherEmail = profile.email || currentEmail;

    // Ensure createdBy is business ID, NEVER Auth UID
    if (assignment.createdBy && assignment.createdBy.length > 10) {
      assignment.createdBy = profile.id;
    } else if (!assignment.createdBy) {
      assignment.createdBy = profile.id;
    }

    // 1. Always update local cache first (strict ID matching only, never overwrite different assignments)
    const current = getLocalCachedAssignments();
    const existsIdx = current.findIndex(a => a.id === assignment.id);
    let updated: HomeworkAssignment[];
    if (existsIdx >= 0) {
      updated = [...current];
      updated[existsIdx] = { ...current[existsIdx], ...assignment };
    } else {
      updated = [assignment, ...current];
    }
    saveAssignmentsToLocalStorage(updated);

    if (!db) {
      console.warn('Firestore chưa sẵn sàng, lưu cache cục bộ bài tập');
      return;
    }

    const assignRef = doc(db, 'assignments', assignment.id);
    const cleanedPayload = removeUndefined({
      ...assignment,
      updatedAt: new Date().toISOString()
    });

    await setDoc(assignRef, cleanedPayload, { merge: true });
    console.log(`💾 Đã lưu bài tập "${assignment.title}" (ID: ${assignment.id}) lên Cloud Firestore!`);
  } catch (error) {
    console.error("Lỗi khi lưu bài tập lên Firestore:", error);
  }
}

/**
 * Fetch all assignments from Firestore
 */
export async function getAssignmentsFromFirestore(): Promise<HomeworkAssignment[]> {
  try {
    if (!db) return getLocalCachedAssignments();

    const snap = await getDocs(collection(db, 'assignments'));
    if (!snap.empty) {
      const items: HomeworkAssignment[] = [];
      snap.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as HomeworkAssignment);
      });
      saveAssignmentsToLocalStorage(items);
      return items;
    }

    saveAssignmentsToLocalStorage([]);
    return [];
  } catch (error) {
    console.warn("Lỗi đọc danh sách bài tập từ Firestore:", error);
    return getLocalCachedAssignments();
  }
}

/**
 * Subscribe to Real-time listener for assignments collection from Firestore
 */
export function subscribeToAssignmentsFromFirestore(
  onUpdate: (assignments: HomeworkAssignment[]) => void,
  onError?: (err: any) => void
) {
  if (!db) {
    onUpdate(getLocalCachedAssignments());
    return () => {};
  }

  try {
    const colRef = collection(db, 'assignments');
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: HomeworkAssignment[] = [];
          snapshot.forEach((docSnap) => {
            const rawAs = { id: docSnap.id, ...docSnap.data() } as HomeworkAssignment;
            const { assignment: sanitized, changed } = sanitizeAssignmentOrderingQuestions(rawAs);
            if (changed && db) {
              setDoc(doc(db, 'assignments', docSnap.id), { questions: sanitized.questions }, { merge: true }).catch(() => {});
            }
            loaded.push(sanitized);
          });
          // Sort newest first and strictly deduplicate
          const cleanLoaded = deduplicateAssignments(loaded);
          cleanLoaded.sort((a, b) => (b.id > a.id ? 1 : -1));
          saveAssignmentsToLocalStorage(cleanLoaded);
          onUpdate(cleanLoaded);
        } else {
          saveAssignmentsToLocalStorage([]);
          onUpdate([]);
        }
      },
      (err) => {
        console.warn('Lỗi Firestore Live Assignments listener:', err);
        if (onError) onError(err);
        onUpdate(getLocalCachedAssignments());
      }
    );
  } catch (err) {
    console.warn('Lỗi khởi tạo subscribeToAssignmentsFromFirestore:', err);
    onUpdate(getLocalCachedAssignments());
    return () => {};
  }
}

/**
 * Delete an assignment from Firestore
 */
export async function deleteAssignmentFromFirestore(assignmentId: string): Promise<void> {
  try {
    const current = getLocalCachedAssignments();
    const updated = current.filter(a => a.id !== assignmentId);
    saveAssignmentsToLocalStorage(updated);

    if (db) {
      const ref = doc(db, 'assignments', assignmentId);
      await deleteDoc(ref);
      console.log(`🗑️ Đã xóa bài tập ID ${assignmentId} trên Cloud Firestore!`);
    }
  } catch (error) {
    console.error("Lỗi khi xóa bài tập khỏi Firestore:", error);
  }
}
