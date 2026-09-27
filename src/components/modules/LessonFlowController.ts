import { Lesson5EPlan } from '../../types';
import { checkHasEngageVideo, checkHasEngageGame } from './StudentEngageView';
import { db } from '../../firebaseConfig';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

export const ELEARNING_STUDENT_PROGRESS_COLLECTION = 'elearning_student_progress';

export const getCleanProgressDocId = (studentId: string, lessonId: string): string => {
  const s = String(studentId || 'unknown_student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const l = String(lessonId || 'unknown_lesson').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${s}___${l}`;
};

export type Standard5ETabKey = 
  | 'engage' 
  | 'explore' 
  | 'elaborate' 
  | 'apply' 
  | 'assessment';

export type LessonStepKey = 
  | 'engage' 
  | 'intro' 
  | 'objectives' 
  | 'explore' 
  | 'elaborate' 
  | 'apply' 
  | 'assessment' 
  | 'review';

/**
 * Standard 5E Navigation items for the top progress bar.
 * Exactly 5 tabs representing the 5E framework:
 * 1. Khởi động (Engage)
 * 2. Khám phá (Explore)
 * 3. Luyện tập (Elaborate)
 * 4. Vận dụng (Apply)
 * 5. Đánh giá (Assessment)
 */
export interface Standard5ETabItem {
  key: Standard5ETabKey;
  stepNumber: number;
  label: string;
  badge: string;
}

export const STANDARD_5E_TABS: Standard5ETabItem[] = [
  { key: 'engage', stepNumber: 1, label: 'Khởi động', badge: 'Engage' },
  { key: 'explore', stepNumber: 2, label: 'Khám phá', badge: 'Explore' },
  { key: 'elaborate', stepNumber: 3, label: 'Luyện tập', badge: 'Elaborate' },
  { key: 'apply', stepNumber: 4, label: 'Vận dụng', badge: 'Apply' },
  { key: 'assessment', stepNumber: 5, label: 'Đánh giá', badge: 'Assessment' }
];

/**
 * Maps any internal learning step (including intro, objectives, review)
 * to its parent 5E tab key for highlighting in the top standard 5E navigation bar.
 */
export const mapStepToStandard5ETab = (step: LessonStepKey): Standard5ETabKey => {
  switch (step) {
    case 'engage':
    case 'intro':
    case 'objectives':
      return 'engage';
    case 'explore':
      return 'explore';
    case 'elaborate':
      return 'elaborate';
    case 'apply':
      return 'apply';
    case 'assessment':
    case 'review':
      return 'assessment';
    default:
      return 'engage';
  }
};

/**
 * Check if Bước 1 (Mục Khởi động) is active:
 * - Must be enabled (not turned off)
 * - Must have at least Video link OR Game/Quiz link
 */
export const checkIsEngageActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isEngageEnabled ?? (lesson.stepEngage as any)?.isEnabled ?? true;
  return isEnabled;
};

/**
 * Check if Bước 2 (Mục Giới thiệu bài) is active:
 * - Must be enabled (not turned off)
 * - Must have content (video link or text)
 */
export const checkIsIntroActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isIntroEnabled ?? true;
  if (!isEnabled) return false;
  const content = (lesson as any).introContent;
  return Boolean(content && typeof content === 'string' && content.trim() !== '');
};

/**
 * Check if Bước 3 (Mục Mục tiêu) is active:
 * - Must be enabled (not turned off)
 * - Must have content
 */
export const checkIsObjectivesActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isObjectivesEnabled ?? true;
  if (!isEnabled) return false;
  const content = (lesson as any).objectivesContent || lesson.objectivesContent;
  return Boolean(content && typeof content === 'string' && content.trim() !== '');
};

/**
 * Check if Mục Khám phá (Explore) is active
 */
export const checkIsExploreActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isExploreEnabled ?? (lesson.stepExplore as any)?.isEnabled ?? true;
  return isEnabled;
};

/**
 * Check if Mục Luyện tập (Elaborate) is active
 */
export const checkIsElaborateActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isElaborateEnabled ?? (lesson.stepElaborate as any)?.isEnabled ?? true;
  return isEnabled;
};

/**
 * Check if Mục Vận dụng (Apply) is active
 */
export const checkIsApplyActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isApplyEnabled ?? (lesson as any).isEvaluateEnabled ?? (lesson.stepEvaluate as any)?.isEnabled ?? true;
  return isEnabled;
};

/**
 * Check if Mục Đánh giá (Assessment) is active
 */
export const checkIsAssessmentActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isAssessmentEnabled ?? true;
  return isEnabled;
};

/**
 * Check if Mục Nhận xét / Vinh danh (Review) is active
 */
export const checkIsReviewActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isFeedbackEnabled ?? (lesson as any).isReviewEnabled ?? true;
  return isEnabled;
};

/**
 * Returns list of all active steps with labels and metadata
 */
export interface FlowStepItem {
  key: LessonStepKey;
  label: string;
  badge: string;
  orderNumber: number;
}

export const getLessonFlowSteps = (lesson?: Lesson5EPlan | null): FlowStepItem[] => {
  const steps: FlowStepItem[] = [];
  let order = 1;

  if (checkIsEngageActive(lesson)) {
    steps.push({ key: 'engage', label: 'Khởi động', badge: 'Engage', orderNumber: order++ });
  }
  if (checkIsIntroActive(lesson)) {
    steps.push({ key: 'intro', label: 'Giới thiệu bài', badge: 'Intro', orderNumber: order++ });
  }
  if (checkIsObjectivesActive(lesson)) {
    steps.push({ key: 'objectives', label: 'Mục tiêu', badge: 'Objectives', orderNumber: order++ });
  }
  if (checkIsExploreActive(lesson)) {
    steps.push({ key: 'explore', label: 'Khám phá', badge: 'Explore', orderNumber: order++ });
  }
  if (checkIsElaborateActive(lesson)) {
    steps.push({ key: 'elaborate', label: 'Luyện tập', badge: 'Elaborate', orderNumber: order++ });
  }
  if (checkIsApplyActive(lesson)) {
    steps.push({ key: 'apply', label: 'Vận dụng', badge: 'Apply', orderNumber: order++ });
  }
  if (checkIsAssessmentActive(lesson)) {
    steps.push({ key: 'assessment', label: 'Đánh giá', badge: 'Assessment', orderNumber: order++ });
  }
  if (checkIsReviewActive(lesson)) {
    steps.push({ key: 'review', label: 'Nhận xét & Vinh danh', badge: 'Review', orderNumber: order++ });
  }

  return steps;
};

/**
 * Determine the initial step when a student starts a lesson
 */
export const getInitialLessonStep = (lesson?: Lesson5EPlan | null): LessonStepKey => {
  const steps = getLessonFlowSteps(lesson);
  return steps.length > 0 ? steps[0].key : 'explore';
};

/**
 * Determine the next enabled step in sequence
 */
export const getNextStepInLessonFlow = (
  currentStep: LessonStepKey,
  lesson?: Lesson5EPlan | null
): LessonStepKey => {
  const steps = getLessonFlowSteps(lesson);
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  if (currentIndex >= 0 && currentIndex < steps.length - 1) {
    return steps[currentIndex + 1].key;
  }
  return currentStep;
};

/**
 * Determine the previous enabled step in sequence
 */
export const getPrevStepInLessonFlow = (
  currentStep: LessonStepKey,
  lesson?: Lesson5EPlan | null
): LessonStepKey => {
  const steps = getLessonFlowSteps(lesson);
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  if (currentIndex > 0) {
    return steps[currentIndex - 1].key;
  }
  return currentStep;
};

/**
 * Human-friendly label for the next step button
 */
export const getNextStepLabel = (
  currentStep: LessonStepKey,
  lesson?: Lesson5EPlan | null
): string => {
  const next = getNextStepInLessonFlow(currentStep, lesson);
  switch (next) {
    case 'engage':
      return 'Khởi động (Engage)';
    case 'intro':
      return 'Giới thiệu bài';
    case 'objectives':
      return 'Mục tiêu bài học';
    case 'explore':
      return 'Khám phá (Explore)';
    case 'elaborate':
      return 'Luyện tập (Elaborate)';
    case 'apply':
      return 'Vận dụng (Apply)';
    case 'assessment':
      return 'Đánh giá (Assessment)';
    case 'review':
      return 'Nhận xét & Vinh danh (Review)';
    default:
      return 'Tiếp tục bài học';
  }
};

/**
 * Storage and Firestore persistence for Student Lesson Progress
 */
const STORAGE_PREFIX = 'viet_elearning_student_progress_';

export const saveStudentLessonProgress = (
  studentId: string,
  lessonId: string,
  progressData: any
) => {
  try {
    const key = `${STORAGE_PREFIX}${studentId}_${lessonId}`;
    const existing = getStudentLessonProgress(studentId, lessonId) || {};
    const updated = {
      ...existing,
      ...progressData,
      studentId,
      lessonId,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(updated));

    // Also persist to Firestore collection
    if (db && studentId && lessonId) {
      const docId = getCleanProgressDocId(studentId, lessonId);
      const docRef = doc(db, ELEARNING_STUDENT_PROGRESS_COLLECTION, docId);
      setDoc(docRef, updated, { merge: true }).catch((err) => {
        console.warn('Firestore saveStudentLessonProgress sync warning:', err);
      });
    }
  } catch (err) {
    console.warn('Failed to save student lesson progress to localStorage/Firestore', err);
  }
};

export const getStudentLessonProgress = (
  studentId: string,
  lessonId: string
): any | null => {
  try {
    const key = `${STORAGE_PREFIX}${studentId}_${lessonId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to read student lesson progress from localStorage', err);
    return null;
  }
};

export const fetchStudentLessonProgressAsync = async (
  studentId: string,
  lessonId: string
): Promise<any | null> => {
  try {
    if (db && studentId && lessonId) {
      const docId = getCleanProgressDocId(studentId, lessonId);
      const docRef = doc(db, ELEARNING_STUDENT_PROGRESS_COLLECTION, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const firestoreData = snap.data();
        const key = `${STORAGE_PREFIX}${studentId}_${lessonId}`;
        const local = getStudentLessonProgress(studentId, lessonId) || {};
        const merged = { ...local, ...firestoreData };
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch student lesson progress from Firestore', err);
  }
  return getStudentLessonProgress(studentId, lessonId);
};

export const subscribeStudentLessonProgress = (
  studentId: string,
  lessonId: string,
  callback: (data: any | null) => void
): (() => void) => {
  // Send current local data immediately
  const local = getStudentLessonProgress(studentId, lessonId);
  callback(local);

  if (!db || !studentId || !lessonId) {
    return () => {};
  }

  try {
    const docId = getCleanProgressDocId(studentId, lessonId);
    const docRef = doc(db, ELEARNING_STUDENT_PROGRESS_COLLECTION, docId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const firestoreData = snap.data();
          const key = `${STORAGE_PREFIX}${studentId}_${lessonId}`;
          const currentLocal = getStudentLessonProgress(studentId, lessonId) || {};
          const merged = { ...currentLocal, ...firestoreData };
          try {
            localStorage.setItem(key, JSON.stringify(merged));
          } catch {}
          callback(merged);
        }
      },
      (err) => {
        console.warn('Firestore subscribeStudentLessonProgress error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore snapshot for student progress:', err);
    return () => {};
  }
};

export const clearStudentLessonProgress = (
  studentId: string,
  lessonId: string
) => {
  try {
    const key = `${STORAGE_PREFIX}${studentId}_${lessonId}`;
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to clear student lesson progress from localStorage', err);
  }
};
