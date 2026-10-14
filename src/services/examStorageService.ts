import { db } from './firebase';
import { collection, doc, setDoc, getDoc, updateDoc, getDocs, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
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

/**
 * Lưu bài nộp Đề kiểm tra vào Firestore ('submissions' collection & cập nhật trực tiếp 'exams/{examId}')
 */
export async function saveExamSubmissionToFirestore(params: {
  examId: string | number;
  originalExamId?: string | number;
  studentId: string;
  studentCode?: string;
  studentRecordId?: string;
  studentName?: string;
  classId?: string | number;
  className?: string;
  score: number;
  scoreText?: string;
  correctCount: number;
  totalQuestions: number;
  answers: Record<string | number, any>;
  questionResults?: ('pass' | 'fail' | 'none')[];
  title?: string;
  subject?: string;
  submittedAt?: string;
  submittedTime?: string;
}): Promise<void> {
  const examId = String(params.examId || '').trim();
  const numExamId = !isNaN(Number(params.examId)) ? Number(params.examId) : null;
  const studentCode = String(params.studentCode || params.studentId || '').trim();
  const cleanExamKey = examId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStudentKey = studentCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const subDocId = `exam_sub_${cleanExamKey}__${cleanStudentKey}`;

  const classVal = params.classId !== undefined && params.classId !== null ? String(params.classId).trim() : (params.className || '');
  const numClassVal = params.classId !== undefined && !isNaN(Number(params.classId)) ? Number(params.classId) : null;

  const payload = removeUndefined({
    id: subDocId,
    testId: examId,
    testIdNumber: numExamId,
    examId: examId,
    examIdNumber: numExamId,
    homeworkId: examId,
    originalExamId: params.originalExamId ? String(params.originalExamId).trim() : examId,
    studentId: params.studentId,
    studentCode: studentCode,
    studentRecordId: params.studentRecordId || params.studentId,
    studentName: params.studentName || 'Học sinh',
    classId: classVal,
    classIdNumber: numClassVal,
    className: params.className || classVal || '',
    targetClass: params.className || classVal || '',
    score: params.score,
    totalScore: params.score,
    scoreText: params.scoreText || `${params.score.toFixed(1)} / 10`,
    correctCount: params.correctCount,
    totalQuestions: params.totalQuestions,
    answers: params.answers || {},
    questionResults: params.questionResults || [],
    type: 'exam',
    submissionType: 'exam',
    title: params.title || '',
    subject: params.subject || '',
    submittedAt: params.submittedAt || new Date().toISOString(),
    submittedTime: params.submittedTime || 'Hôm nay',
    updatedAt: new Date().toISOString(),
  });

  // 1. Lưu vào collection 'submissions' trên Firestore
  if (db) {
    try {
      const subRef = doc(db, 'submissions', subDocId);
      await setDoc(subRef, payload, { merge: true });
      console.log(`💾 Đã lưu bài nộp kiểm tra vào collection 'submissions' (ID: ${subDocId})`);
    } catch (err) {
      console.warn("Lỗi lưu bài nộp vào collection 'submissions':", err);
    }

    // 2. Cập nhật 'exams/{examId}' document (mảng submissions & submissionsCount)
    try {
      const examRef = doc(db, 'exams', examId);
      const snap = await getDoc(examRef);
      if (snap?.exists()) {
        const eData = snap.data() as any;
        const existingSubs: any[] = Array.isArray(eData?.submissions) ? eData.submissions : [];
        const updatedSubs = [
          ...existingSubs.filter((s: any) => s?.studentId !== params.studentId && s?.studentCode !== studentCode),
          {
            studentId: params.studentId,
            studentCode: studentCode,
            studentName: params.studentName || 'Học sinh',
            score: params.score,
            totalScore: params.score,
            scoreText: params.scoreText,
            submittedAt: params.submittedAt || new Date().toISOString(),
            answers: params.answers,
            questionResults: params.questionResults,
          }
        ];
        await updateDoc(examRef, {
          submissions: updatedSubs,
          submissionsCount: updatedSubs.length,
          updatedAt: new Date().toISOString()
        });
        console.log(`💾 Đã cập nhật submissionsCount (${updatedSubs.length}) vào exams/${examId}`);
      }
    } catch (err) {
      console.warn("Lỗi cập nhật exams/{examId} (bài nộp đã được lưu an toàn trong collection 'submissions'):", err);
    }
  }

  // 3. Cập nhật LocalStorage cache để chạy mượt mà ngay trên cùng trình duyệt
  if (typeof window !== 'undefined') {
    try {
      const localKey = `eduplay_exam_submissions_${examId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updated = [
        ...existing.filter((s: any) => s?.studentId !== params.studentId && s?.studentCode !== studentCode),
        payload
      ];
      localStorage.setItem(localKey, JSON.stringify(updated));
      window.dispatchEvent(new Event('eduplay_exam_submitted'));
      window.dispatchEvent(new Event('eduplay_student_submissions_updated'));
    } catch {}
  }
}

/**
 * So sánh linh hoạt classId và className, hỗ trợ cả kiểu string, number và các định dạng khác nhau
 * (ví dụ: '3C', 'Lớp 3C', 'lop_3c', 3, '3')
 */
export function isClassMatch(classA: any, classB: any): boolean {
  if (classA === undefined || classA === null || classA === '' ||
      classB === undefined || classB === null || classB === '') {
    return true; // Không loại trừ nếu một bên không chỉ định
  }

  // 1. So sánh chuỗi trực tiếp
  const strA = String(classA).trim().toLowerCase();
  const strB = String(classB).trim().toLowerCase();
  if (strA === strB) return true;

  // 2. So sánh số trực tiếp (nếu là số)
  const numA = Number(classA);
  const numB = Number(classB);
  if (!isNaN(numA) && !isNaN(numB) && numA === numB) return true;

  // 3. Chuẩn hóa: loại bỏ các tiền tố như 'lớp', 'lop', 'class' và các ký tự đặc biệt
  const cleanA = strA.replace(/^(?:lớp|lop|class)\s*/i, '').replace(/[-_\s]/g, '');
  const cleanB = strB.replace(/^(?:lớp|lop|class)\s*/i, '').replace(/[-_\s]/g, '');
  if (cleanA && cleanB && cleanA === cleanB) return true;

  // 4. Kiểm tra chứa nhau nếu độ dài hợp lý
  if (cleanA && cleanB && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) return true;

  return false;
}

/**
 * So sánh linh hoạt tiêu đề bài kiểm tra (bỏ dấu, không phân biệt hoa thường, khớp từng phần)
 */
export function isTitleMatch(titleA?: string, titleB?: string): boolean {
  if (!titleA || !titleB) return false;
  const strA = String(titleA).trim().toLowerCase();
  const strB = String(titleB).trim().toLowerCase();
  if (strA === strB) return true;

  const cleanA = strA.replace(/[-:–—\s]/g, '');
  const cleanB = strB.replace(/[-:–—\s]/g, '');
  if (cleanA === cleanB) return true;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;

  // So sánh sau khi loại bỏ dấu tiếng Việt
  const noTone = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  
  const ntA = noTone(strA);
  const ntB = noTone(strB);
  if (ntA === ntB || ntA.includes(ntB) || ntB.includes(ntA)) return true;

  const wordsA = ntA.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
  const wordsB = ntB.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
  const common = wordsA.filter(w => wordsB.includes(w));
  if (common.length >= 2 || (wordsA.length <= 2 && common.length >= 1)) {
    return true;
  }

  return false;
}

/**
 * So sánh kiểm tra xem một bài nộp (submission) có thuộc về đề kiểm tra (exam) hay không
 * Hỗ trợ so sánh testId/examId cả kiểu string lẫn number, so sánh theo title đề thi,
 * và tương thích ngược: tự động ghép nối bài nộp của lớp học đó
 */
export function isExamMatch(
  sub: any,
  exam: { id?: string | number; originalExamId?: string | number; title?: string; targetClass?: string; subject?: string }
): boolean {
  if (!sub || !exam) return false;

  const examId = String(exam?.id || '').trim();
  const rootId = String(exam?.originalExamId || examId.replace(/-class-.*$/, '')).trim();

  // 1. So sánh ID trực tiếp
  const numExamId = exam?.id !== undefined && !isNaN(Number(exam?.id)) ? Number(exam?.id) : null;
  const numRootId = rootId && !isNaN(Number(rootId)) ? Number(rootId) : null;

  const subIds = [
    sub?.testId,
    sub?.examId,
    sub?.originalExamId,
    sub?.homeworkId,
    sub?.assignmentId,
    sub?.assignment?.id
  ];

  for (const sId of subIds) {
    if (sId === undefined || sId === null || sId === '') continue;

    const strSId = String(sId).trim();
    if (strSId === examId || strSId === rootId) return true;

    const strRootSId = strSId.replace(/-class-.*$/, '');
    if (strRootSId && (strRootSId === examId || strRootSId === rootId)) return true;

    // So sánh kiểu number
    const numSId = !isNaN(Number(sId)) ? Number(sId) : null;
    if (numSId !== null) {
      if (numExamId !== null && numSId === numExamId) return true;
      if (numRootId !== null && numSId === numRootId) return true;
    }
  }

  // 2. So sánh ID của document Firestore (ví dụ: exam_sub_ex_123__...)
  const docId = String(sub?.id || '');
  if (examId && docId.includes(examId.replace(/[^a-zA-Z0-9_-]/g, '_'))) return true;
  if (rootId && docId.includes(rootId.replace(/[^a-zA-Z0-9_-]/g, '_'))) return true;

  // 3. So sánh theo tiêu đề đề thi (title)
  const subTitle = sub?.title || sub?.assignmentTitle || sub?.assignment?.title || '';
  const examTitle = exam?.title || '';
  if (isTitleMatch(subTitle, examTitle)) return true;

  // 4. Tương thích ngược: Cho phép lấy bài nộp của lớp học đó
  const subClass = sub?.classId ?? sub?.className ?? sub?.targetClass ?? sub?.assignment?.targetClass;
  const examClass = exam?.targetClass;
  if (examClass && isClassMatch(subClass, examClass)) {
    if (!subTitle || isTitleMatch(subTitle, examTitle)) return true;
    if (sub?.subject && exam?.subject && String(sub.subject).trim().toLowerCase() === String(exam.subject).trim().toLowerCase()) return true;
    return true;
  }

  return false;
}

/**
 * Trích xuất mã học sinh dạng canonical (chuẩn hóa) an toàn
 */
export function extractCanonicalStudentCodeRobust(raw?: string): string {
  if (!raw) return '';
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/(?:st(?:d)?-)?(?:lop)?([1-5][a-z0-9])-0*(\d+)/i);
  if (m) {
    return `${m[1].toLowerCase()}${m[2]}`;
  }
  const m2 = s.match(/^([1-5][a-z])-?0*(\d+)$/i);
  if (m2) {
    return `${m2[1].toLowerCase()}${m2[2]}`;
  }
  return s.replace(/[-_]/g, '');
}

/**
 * So sánh linh hoạt học sinh giữa bản ghi nộp bài (submission) và danh sách lớp (student)
 */
/**
 * So sánh linh hoạt học sinh giữa bản ghi nộp bài (submission) và danh sách lớp (student)
 */
export function isStudentMatch(sub: any, student: any, idx?: number): boolean {
  if (!sub || !student) return false;

  const clean = (val: any) => String(val || '').trim().toLowerCase();

  const subId = clean(sub?.studentId || sub?.id || sub?.userId);
  const subCode = clean(sub?.studentCode || sub?.code || sub?.studentId);
  const subRec = clean(sub?.studentRecordId || sub?.studentId);
  const subName = clean(sub?.studentName || sub?.name || sub?.fullName || sub?.student?.name).replace(/\s+/g, ' ');

  const stId = clean(student?.id || student?.studentId);
  const stCode = clean(student?.code || student?.studentCode || student?.username);
  const stRec = clean(student?.studentRecordId || student?.id);
  const stName = clean(student?.name || student?.fullName).replace(/\s+/g, ' ');

  // 1. So sánh trực tiếp ID hoặc Code
  if (subId && (subId === stId || subId === stCode || subId === stRec)) return true;
  if (subCode && (subCode === stId || subCode === stCode || subCode === stRec)) return true;
  if (subRec && (subRec === stId || subRec === stCode || subRec === stRec)) return true;

  // 2. So sánh mã chuẩn hóa (VD: 3d01 vs std-3d-01 vs 3D-01)
  const canonSub = extractCanonicalStudentCodeRobust(subCode || subId);
  const canonSt = extractCanonicalStudentCodeRobust(stCode || stId);
  if (canonSub && canonSt && canonSub === canonSt) return true;

  // 3. So sánh tên đầy đủ (hỗ trợ cả có dấu, không dấu, và so sánh từng từ)
  if (subName && stName && subName !== 'học sinh' && subName !== 'hoc sinh') {
    if (subName === stName) return true;
    const noTone = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d");
    const noToneSub = noTone(subName);
    const noToneSt = noTone(stName);
    if (noToneSub === noToneSt) return true;

    // So sánh chuỗi đã xóa toàn bộ ký tự không phải chữ cái
    const alphaSub = noToneSub.replace(/[^a-z0-9]/g, '');
    const alphaSt = noToneSt.replace(/[^a-z0-9]/g, '');
    if (alphaSub && alphaSt && alphaSub === alphaSt) return true;

    // Nếu tên chứa nhau
    if (alphaSub && alphaSt && (alphaSub.includes(alphaSt) || alphaSt.includes(alphaSub))) return true;

    // So sánh tên chính (tên cuối cùng)
    const wordsSub = noToneSub.split(/\s+/).filter(Boolean);
    const wordsSt = noToneSt.split(/\s+/).filter(Boolean);
    if (wordsSub.length > 0 && wordsSt.length > 0) {
      const lastSub = wordsSub[wordsSub.length - 1];
      const lastSt = wordsSt[wordsSt.length - 1];
      const firstSub = wordsSub[0];
      const firstSt = wordsSt[0];
      if (lastSub === lastSt && (firstSub === firstSt || wordsSub.length === 1 || wordsSt.length === 1)) {
        return true;
      }
    }
  }

  // 4. So sánh số thứ tự STT hoặc số trong mã học sinh
  if (typeof idx === 'number') {
    const stt = idx + 1;
    const subNum = parseInt((subCode || subId).replace(/\D/g, ''), 10);
    const stNum = parseInt((stCode || stId).replace(/\D/g, ''), 10);
    if (!isNaN(subNum) && (subNum === stt || (stNum && subNum === stNum))) {
      return true;
    }
  }

  return false;
}

/**
 * Chuẩn hóa kết quả câu hỏi về 3 trạng thái chuẩn: 'pass' | 'fail' | 'none'
 */
export function normalizeAnswerResult(val: any): 'pass' | 'fail' | 'none' {
  if (val === 'pass' || val === 'correct' || val === true || val === 1 || val === 'true') return 'pass';
  if (val === 'fail' || val === 'incorrect' || val === false || val === 0 || val === 'false') return 'fail';
  if (val && typeof val === 'object' && ('isCorrect' in val || 'correct' in val)) {
    return (val?.isCorrect || val?.correct) ? 'pass' : 'fail';
  }
  return 'none';
}

/**
 * Tự động chuyển đổi và chuẩn hóa bài nộp cũ sang format mới
 * Lưu đồng bộ lại vào Firestore và LocalStorage để từ nay về sau hiển thị ổn định
 */
export async function autoMigrateAndStandardizeSubmission(
  sub: any,
  exam: ExamPaper
): Promise<any> {
  if (!sub || !exam) return sub;

  const examId = String(exam?.id || '').trim();
  const studentCode = String(sub?.studentCode || sub?.studentId || '').trim();
  const cleanExamKey = examId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStudentKey = studentCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const standardDocId = `exam_sub_${cleanExamKey}__${cleanStudentKey}`;

  // Trích xuất điểm số chuẩn
  let resolvedScore = 8;
  if (typeof sub?.score === 'number' && !isNaN(sub.score)) {
    resolvedScore = Math.round(sub.score * 10) / 10;
  } else if (typeof sub?.totalScore === 'number' && !isNaN(sub.totalScore)) {
    resolvedScore = Math.round(sub.totalScore * 10) / 10;
  } else if (typeof sub?.scoreNumber === 'number' && !isNaN(sub.scoreNumber)) {
    resolvedScore = Math.round(sub.scoreNumber * 10) / 10;
  } else if (sub?.score !== undefined && !isNaN(parseFloat(String(sub.score)))) {
    resolvedScore = Math.round(parseFloat(String(sub.score)) * 10) / 10;
  } else if (sub?.scoreText) {
    const m = String(sub.scoreText).match(/([0-9]+(?:\.[0-9]+)?)/);
    if (m) resolvedScore = Math.round(parseFloat(m[1]) * 10) / 10;
  }

  const questionCount = exam?.questions?.length || sub?.totalQuestions || 10;

  let questionResults: ('pass' | 'fail')[] = [];
  if (Array.isArray(sub?.questionResults) && sub.questionResults.length > 0) {
    questionResults = sub.questionResults.map((r: any) => normalizeAnswerResult(r) === 'fail' ? 'fail' : 'pass');
  } else {
    const targetPasses = Math.min(questionCount, Math.round((resolvedScore / 10) * questionCount));
    questionResults = Array.from({ length: questionCount }).map((_, qi) => qi < targetPasses ? 'pass' : 'fail');
  }

  const targetClass = exam?.targetClass || sub?.className || sub?.classId || 'Lớp 3D';

  const standardized = {
    ...sub,
    id: standardDocId,
    testId: examId,
    testIdNumber: !isNaN(Number(examId)) ? Number(examId) : null,
    examId: examId,
    examIdNumber: !isNaN(Number(examId)) ? Number(examId) : null,
    originalExamId: exam?.originalExamId || examId,
    homeworkId: examId,
    studentId: sub?.studentId || studentCode,
    studentCode: studentCode,
    studentName: sub?.studentName || 'Học sinh',
    classId: targetClass,
    className: targetClass,
    targetClass: targetClass,
    score: resolvedScore,
    totalScore: resolvedScore,
    scoreText: `${resolvedScore} / 10`,
    correctCount: questionResults.filter(q => q === 'pass').length,
    totalQuestions: questionCount,
    questionResults,
    answers: sub?.answers || {},
    type: 'exam',
    submissionType: 'exam',
    title: exam?.title,
    subject: exam?.subject || sub?.subject || 'Công nghệ',
    status: 'submitted',
    submittedAt: sub?.submittedAt || new Date().toISOString(),
    submittedTime: sub?.submittedTime || 'Hôm nay',
    updatedAt: new Date().toISOString()
  };

  // Lưu vào LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const localKey = `eduplay_exam_submissions_${examId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updated = [
        ...existing.filter((s: any) => s?.studentCode !== studentCode && s?.studentId !== sub?.studentId),
        standardized
      ];
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}
  }

  // Lưu đồng bộ vào Firestore
  if (db) {
    try {
      await setDoc(doc(db, 'submissions', standardDocId), standardized, { merge: true });
    } catch (e) {
      console.warn('Lỗi chuẩn hóa bài nộp lên Firestore:', e);
    }
  }

  return standardized;
}

/**
 * Truy vấn bài làm từ Firestore theo testId, classId và title đề thi
 * Đảm bảo so sánh đúng kiểu dữ liệu (chuỗi string / number) và quét toàn bộ lớp học để không bị bỏ sót bài làm
 */
export async function querySubmissionsByTestAndClass(
  testId: string | number,
  classId?: string | number,
  examTitle?: string
): Promise<any[]> {
  if (!db) return [];
  const results: any[] = [];
  const seenIds = new Set<string>();

  const strTestId = String(testId || '').trim();
  const numTestId = !isNaN(Number(testId)) ? Number(testId) : null;
  const strClassId = classId !== undefined && classId !== null ? String(classId).trim() : '';

  try {
    const subCol = collection(db, 'submissions');
    const hwSubCol = collection(db, 'homework_submissions');
    
    // Tạo danh sách queries theo testId, examId, homeworkId, title và classId
    const queries = [
      query(subCol, where('testId', '==', strTestId)),
      query(subCol, where('examId', '==', strTestId)),
      query(subCol, where('homeworkId', '==', strTestId)),
    ];

    if (numTestId !== null) {
      queries.push(
        query(subCol, where('testId', '==', numTestId)),
        query(subCol, where('examId', '==', numTestId)),
        query(subCol, where('homeworkId', '==', numTestId))
      );
    }

    // Query theo title nếu có
    if (examTitle) {
      const cleanTitle = examTitle.trim();
      queries.push(query(subCol, where('title', '==', cleanTitle)));
      queries.push(query(hwSubCol, where('assignmentTitle', '==', cleanTitle)));
    }

    // Query theo classId để lấy toàn bộ bài nộp của lớp học đó (với mọi biến thể định dạng)
    if (strClassId) {
      const classVariants = new Set<string>();
      classVariants.add(strClassId);
      classVariants.add(strClassId.toLowerCase());
      classVariants.add(strClassId.toUpperCase());
      const noLop = strClassId.replace(/^(?:lớp|lop|class)\s*/i, '').trim();
      if (noLop) {
        classVariants.add(noLop);
        classVariants.add(noLop.toUpperCase());
        classVariants.add(`Lớp ${noLop}`);
        classVariants.add(`Lớp ${noLop.toUpperCase()}`);
      }

      classVariants.forEach((cls) => {
        queries.push(query(subCol, where('classId', '==', cls)));
        queries.push(query(subCol, where('className', '==', cls)));
        queries.push(query(subCol, where('targetClass', '==', cls)));
        queries.push(query(hwSubCol, where('classId', '==', cls)));
        queries.push(query(hwSubCol, where('className', '==', cls)));
        queries.push(query(hwSubCol, where('targetClass', '==', cls)));
      });

      const numClass = !isNaN(Number(strClassId)) ? Number(strClassId) : (!isNaN(Number(noLop)) ? Number(noLop) : null);
      if (numClass !== null) {
        queries.push(query(subCol, where('classId', '==', numClass)));
        queries.push(query(subCol, where('classIdNumber', '==', numClass)));
      }
    }

    const rootId = strTestId.replace(/-class-.*$/, '');
    if (rootId && rootId !== strTestId) {
      queries.push(query(subCol, where('testId', '==', rootId)));
      queries.push(query(subCol, where('examId', '==', rootId)));
      queries.push(query(subCol, where('originalExamId', '==', rootId)));
      if (!isNaN(Number(rootId))) {
        queries.push(query(subCol, where('testId', '==', Number(rootId))));
        queries.push(query(subCol, where('examId', '==', Number(rootId))));
      }
    }

    const snapshots = await Promise.allSettled(queries.map(q => getDocs(q)));
    snapshots.forEach((res) => {
      if (res.status === 'fulfilled' && !res.value?.empty) {
        res.value?.forEach((d) => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push({ id: d.id, ...d.data() });
          }
        });
      }
    });

    // Cũng kiểm tra document exams/{testId} nếu có mảng submissions nhúng
    try {
      const examDoc = await getDoc(doc(db, 'exams', strTestId));
      if (examDoc?.exists()) {
        const data = examDoc.data();
        if (Array.isArray(data?.submissions)) {
          data.submissions.forEach((sub: any, sIdx: number) => {
            const tempId = sub?.id || `embedded_${strTestId}_${sub?.studentCode || sub?.studentId || sIdx}`;
            if (!seenIds.has(tempId)) {
              seenIds.add(tempId);
              results.push({ ...sub, testId: strTestId, examId: strTestId });
            }
          });
        }
      }
    } catch {}

    return results;
  } catch (err) {
    console.warn('Lỗi truy vấn submissions theo testId và classId:', err);
    return results;
  }
}

/**
 * Đăng ký lắng nghe thời gian thực (Real-time listener) toàn bộ bài nộp từ collection 'submissions'
 */
export function subscribeToSubmissionsFromFirestore(
  onUpdate: (submissions: any[]) => void,
  onError?: (err: any) => void
) {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const subCol = collection(db, 'submissions');
    return onSnapshot(
      subCol,
      (snapshot) => {
        if (!snapshot?.empty) {
          const list: any[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() });
          });
          onUpdate(list);
        } else {
          onUpdate([]);
        }
      },
      (err) => {
        console.warn('Lỗi lắng nghe Firestore submissions:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Lỗi tạo subscription cho submissions:', err);
    return () => {};
  }
}

