import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ExamPaper, QuestionItem } from '../types';
import { INITIAL_EXAMS } from './mockData';
import { removeUndefined } from './teacherStorageService';
import { isOrderingQuestionType, resolveCanonicalOrderingSteps } from './questionStorageService';

const EXAMS_CACHE_KEY = 'eduplay_cached_exams';

function sanitizeExamOrderingQuestions(exam: ExamPaper): { exam: ExamPaper; changed: boolean } {
  if (!exam || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    return { exam: exam, changed: false };
  }
  let changed = false;
  const fixedQuestions: QuestionItem[] = exam.questions.map((q) => {
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
  return changed ? { exam: { ...exam, questions: fixedQuestions }, changed: true } : { exam: exam, changed: false };
}

/**
 * Deduplication helper for exam papers
 */
export function getExamDeduplicationKey(e: Partial<ExamPaper>): string {
  if (!e) return '';
  const cleanTitle = (e.title || '')
    .trim()
    .toLowerCase()
    .replace(/^đề kiểm tra:\s*/i, '')
    .replace(/\s+/g, ' ');
  const targetClass = (e.targetClass || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  const subject = (e.subject || '').trim().toLowerCase();
  const grade = (e.grade || '').trim().toLowerCase();
  const originalExamId = (e.originalExamId || '').trim();

  if (originalExamId && targetClass) {
    return `root_${originalExamId}__cls_${targetClass}`;
  }
  return `title_${cleanTitle}__cls_${targetClass}__sub_${subject}__grd_${grade}`;
}

export function deduplicateExams(exams: ExamPaper[]): ExamPaper[] {
  const seenIds = new Set<string>();
  const clean: ExamPaper[] = [];

  (exams || []).forEach(exam => {
    if (!exam || !exam.id) return;
    if (seenIds.has(exam.id)) return;

    seenIds.add(exam.id);
    clean.push(exam);
  });

  return clean;
}

/**
 * Quét và dọn dẹp các bản ghi đề thi trùng lặp trong cả LocalStorage và Firestore
 */
export async function cleanDuplicateExams(): Promise<void> {
  try {
    const cached = getLocalCachedExams();
    const cleanList = deduplicateExams(cached);
    if (cleanList.length !== cached.length) {
      console.log(`🧹 Đã dọn dẹp ${cached.length - cleanList.length} đề thi trùng lặp trong LocalStorage`);
      saveExamsToLocalStorage(cleanList);
    }
  } catch (err) {
    console.warn('Lỗi khi chạy cleanDuplicateExams:', err);
  }
}

// Chạy dọn dẹp tự động khi tải
if (typeof window !== 'undefined') {
  setTimeout(() => {
    cleanDuplicateExams().catch(console.error);
  }, 1000);
}

/**
 * Lấy danh sách đề thi từ LocalStorage Cache
 */
export function getLocalCachedExams(): ExamPaper[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(EXAMS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateExams(parsed);
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc cache đề thi từ LocalStorage:', e);
  }
  return [];
}

/**
 * Lưu danh sách đề thi vào LocalStorage Cache
 */
export function saveExamsToLocalStorage(exams: ExamPaper[]): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = deduplicateExams(exams);
    localStorage.setItem(EXAMS_CACHE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('Lỗi lưu cache đề thi vào LocalStorage:', e);
  }
}

/**
 * Lưu một Đề kiểm tra lên Firestore
 */
export async function saveExamToFirestore(exam: ExamPaper): Promise<void> {
  try {
    // Check if an existing record matches by ID only
    const current = getLocalCachedExams();
    const existsIdx = current.findIndex(e => e.id === exam.id);
    let updated: ExamPaper[];
    if (existsIdx >= 0) {
      updated = [...current];
      updated[existsIdx] = { ...current[existsIdx], ...exam };
    } else {
      updated = [exam, ...current];
    }
    saveExamsToLocalStorage(updated);

    if (!db) {
      console.warn('Firestore chưa sẵn sàng, lưu cache cục bộ');
      return;
    }

    const examRef = doc(db, 'exams', exam.id);
    const cleanedPayload = removeUndefined({
      ...exam,
      updatedAt: new Date().toISOString()
    });

    await setDoc(examRef, cleanedPayload, { merge: true });
    console.log(`💾 Đã lưu đề thi "${exam.title}" (ID: ${exam.id}) lên Cloud Firestore!`);
  } catch (error) {
    console.error("Lỗi khi lưu đề thi lên Firestore:", error);
  }
}

/**
 * Lấy toàn bộ danh sách Đề kiểm tra từ Firestore
 */
export async function getExamsFromFirestore(): Promise<ExamPaper[]> {
  try {
    if (!db) return getLocalCachedExams();

    const examsSnap = await getDocs(collection(db, 'exams'));
    if (!examsSnap.empty) {
      const exams: ExamPaper[] = [];
      examsSnap.forEach(docSnap => {
        exams.push({ id: docSnap.id, ...docSnap.data() } as ExamPaper);
      });
      saveExamsToLocalStorage(exams);
      return exams;
    }

    saveExamsToLocalStorage([]);
    return [];
  } catch (error) {
    console.warn("Lỗi đọc danh sách đề thi từ Firestore:", error);
    return getLocalCachedExams();
  }
}

/**
 * Đăng ký lắng nghe thời gian thực (Real-time listener) danh sách Đề kiểm tra từ Firestore
 */
export function subscribeToExamsFromFirestore(
  onUpdate: (exams: ExamPaper[]) => void,
  onError?: (err: any) => void
) {
  if (!db) {
    onUpdate(getLocalCachedExams());
    return () => {};
  }

  try {
    const examsColRef = collection(db, 'exams');
    return onSnapshot(
      examsColRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedExams: ExamPaper[] = [];
          snapshot.forEach((docSnap) => {
            const rawExam = { id: docSnap.id, ...docSnap.data() } as ExamPaper;
            const { exam: sanitized, changed } = sanitizeExamOrderingQuestions(rawExam);
            if (changed && db) {
              setDoc(doc(db, 'exams', docSnap.id), { questions: sanitized.questions }, { merge: true }).catch(() => {});
            }
            loadedExams.push(sanitized);
          });
          // Sắp xếp đề mới lên đầu và khử trùng lặp
          const cleanLoaded = deduplicateExams(loadedExams);
          cleanLoaded.sort((a, b) => (b.id > a.id ? 1 : -1));
          saveExamsToLocalStorage(cleanLoaded);
          onUpdate(cleanLoaded);
        } else {
          saveExamsToLocalStorage([]);
          onUpdate([]);
        }
      },
      (err) => {
        console.warn('Lỗi Firestore Live Exam listener:', err);
        if (onError) onError(err);
        onUpdate(getLocalCachedExams());
      }
    );
  } catch (err) {
    console.warn('Lỗi khởi tạo subscribeToExamsFromFirestore:', err);
    onUpdate(getLocalCachedExams());
    return () => {};
  }
}

/**
 * Xóa một Đề kiểm tra khỏi Firestore
 */
export async function deleteExamFromFirestore(examId: string): Promise<void> {
  try {
    if (db) {
      const examRef = doc(db, 'exams', examId);
      await deleteDoc(examRef);
      console.log(`🗑️ Đã xóa đề thi ID ${examId} trên Cloud Firestore!`);
    }

    // Cập nhật LocalStorage cache
    const current = getLocalCachedExams();
    const updated = current.filter(e => e.id !== examId);
    saveExamsToLocalStorage(updated);
  } catch (error) {
    console.error("Lỗi khi xóa đề thi khỏi Firestore:", error);
    const current = getLocalCachedExams();
    const updated = current.filter(e => e.id !== examId);
    saveExamsToLocalStorage(updated);
  }
}
