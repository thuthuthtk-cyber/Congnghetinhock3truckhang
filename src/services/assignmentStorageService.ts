import { db, auth } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { HomeworkAssignment, AssignmentSubmission, QuestionItem } from '../types';
import { removeUndefined, resolveCurrentTeacherProfile } from './teacherStorageService';
import { isOrderingQuestionType, resolveCanonicalOrderingSteps } from './questionStorageService';
import { getStudentsFromLocalStorage } from './studentStorageService';

const ASSIGNMENTS_CACHE_KEY = 'eduplay_cached_assignments';
const HW_SUBMISSIONS_PREFIX = 'eduplay_homework_submissions_';

/**
 * Extract canonical student code (e.g. "st-3c-32" -> "3c32", "3C32" -> "3c32")
 */
export function extractCanonicalStudentCode(rawIdOrCode?: string): string {
  if (!rawIdOrCode) return '';
  const clean = String(rawIdOrCode).trim().toLowerCase();
  const stMatch = clean.match(/^st(?:d)?-([1-5][a-z])-(\d+)$/i);
  if (stMatch) {
    return `${stMatch[1].toLowerCase()}${stMatch[2]}`;
  }
  const stdClassMatch = clean.match(/^std-lop([1-5][a-z])-(\d+)$/i);
  if (stdClassMatch) {
    return `${stdClassMatch[1].toLowerCase()}${stdClassMatch[2]}`;
  }
  return clean;
}

/**
 * Check if two submission records or a submission and student record belong to the same student
 */
export function isSameStudentSubmission(
  sub: Partial<AssignmentSubmission>,
  student: { id?: string; code?: string; username?: string; name?: string; fullName?: string }
): boolean {
  if (!sub || !student) return false;

  const subCode = extractCanonicalStudentCode(sub.studentCode || sub.studentId);
  const subRawId = String(sub.studentRecordId || sub.studentId || '').trim().toLowerCase();
  const subName = String(sub.studentName || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const stCode = extractCanonicalStudentCode(student.code || student.username || student.id);
  const stRawId = String(student.id || '').trim().toLowerCase();
  const stName = String(student.fullName || student.name || '').trim().toLowerCase().replace(/\s+/g, ' ');

  if (subCode && stCode && subCode === stCode) return true;
  if (subRawId && stRawId && subRawId === stRawId) return true;
  if (subRawId && stCode && subRawId === stCode) return true;
  if (subCode && stRawId && subCode === stRawId) return true;
  if (subName && stName && subName !== 'học sinh' && subName === stName) return true;

  return false;
}

/**
 * Deduplicate an array of AssignmentSubmission per student, keeping the most recent or highest-info record
 */
export function deduplicateSubmissionsPerStudent(submissions: AssignmentSubmission[]): AssignmentSubmission[] {
  if (!Array.isArray(submissions) || submissions.length === 0) return [];
  const result: AssignmentSubmission[] = [];

  submissions.forEach((sub) => {
    if (!sub) return;
    const existingIdx = result.findIndex((existing) =>
      isSameStudentSubmission(sub, {
        id: existing.studentRecordId || existing.studentId,
        code: existing.studentCode || existing.studentId,
        name: existing.studentName
      })
    );

    if (existingIdx >= 0) {
      const existing = result[existingIdx];
      const existingTime = existing.submittedAtIso || existing.submittedAt || '';
      const newTime = sub.submittedAtIso || sub.submittedAt || '';
      const merged: AssignmentSubmission = {
        ...existing,
        ...sub,
        answers: (sub.answers && Object.keys(sub.answers).length > 0) ? sub.answers : existing.answers,
        questionResults: (sub.questionResults && sub.questionResults.length > 0) ? sub.questionResults : existing.questionResults,
        score: sub.score !== undefined ? sub.score : existing.score,
        submittedAt: (newTime >= existingTime ? sub.submittedAt : existing.submittedAt) || sub.submittedAt || existing.submittedAt,
        submittedAtIso: (newTime >= existingTime ? sub.submittedAtIso : existing.submittedAtIso) || sub.submittedAtIso || existing.submittedAtIso
      };
      result[existingIdx] = merged;
    } else {
      result.push(sub);
    }
  });

  return result;
}

function sanitizeAssignmentOrderingQuestions(as: HomeworkAssignment): { assignment: HomeworkAssignment; changed: boolean } {
  if (!as || !Array.isArray(as.questions) || as.questions.length === 0) {
    return { assignment: as ? { ...as, homeworkId: as.homeworkId || as.id } : as, changed: false };
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
  const baseAs = { ...as, homeworkId: as.homeworkId || as.id };
  return changed ? { assignment: { ...baseAs, questions: fixedQuestions }, changed: true } : { assignment: baseAs, changed: false };
}

/**
 * Deduplication helper for homework assignments
 */
export function getAssignmentDeduplicationKey(a: Partial<HomeworkAssignment>): string {
  if (!a) return '';
  if (a.id) return `id_${a.id.trim()}`;
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
    const dedupedSubs = deduplicateSubmissionsPerStudent(sanitized.submissions || []);
    clean.push({
      ...sanitized,
      homeworkId: sanitized.id,
      submissions: dedupedSubs,
      completedCount: Math.max(sanitized.completedCount || 0, dedupedSubs.length)
    });
  });

  return clean;
}

/**
 * Quét và dọn dẹp các bản ghi bài tập trùng lặp trong LocalStorage
 */
export async function cleanDuplicateAssignments(): Promise<void> {
  try {
    const cached = getLocalCachedAssignments();
    const cleanList = deduplicateAssignments(cached);
    if (cleanList.length !== cached.length) {
      saveAssignmentsToLocalStorage(cleanList);
    }
  } catch (err) {
    console.warn('Lỗi khi chạy cleanDuplicateAssignments:', err);
  }
}

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
    const canonicalHomeworkId = (assignment.id || assignment.homeworkId || `hw-${Date.now()}`).trim();
    assignment.id = canonicalHomeworkId;
    assignment.homeworkId = canonicalHomeworkId;

    const currentEmail = (
      assignment.teacherEmail ||
      (auth && auth.currentUser ? auth.currentUser.email : null) ||
      (typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_email') : null) ||
      ''
    ).toLowerCase().trim();

    const profile = resolveCurrentTeacherProfile(currentEmail);

    const isInvalidTeacherId =
      !assignment.teacherId ||
      assignment.teacherId === 'u-4' ||
      assignment.teacherId === 'gv-temp' ||
      assignment.teacherId.length > 10 ||
      (currentEmail.includes('thuthuthtk') && assignment.teacherId !== 'gv-12');

    if (isInvalidTeacherId) {
      assignment.teacherId = profile.id;
    }

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

    assignment.teacherEmail = profile.email || currentEmail;

    if (assignment.createdBy && assignment.createdBy.length > 10) {
      assignment.createdBy = profile.id;
    } else if (!assignment.createdBy) {
      assignment.createdBy = profile.id;
    }

    // Sync totalStudents dynamically from the real class roster if available
    if (assignment.targetClass && !assignment.targetClass.includes(',')) {
      const classRoster = getStudentsFromLocalStorage(assignment.targetClass);
      if (classRoster && classRoster.length > 0) {
        assignment.totalStudents = classRoster.length;
      }
    }

    // Preserve any existing submissions already recorded for this homeworkId
    const current = getLocalCachedAssignments();
    const existsIdx = current.findIndex(a => a.id === canonicalHomeworkId);
    const existingSubmissions = existsIdx >= 0 ? (current[existsIdx].submissions || []) : [];
    const incomingSubmissions = Array.isArray(assignment.submissions) ? assignment.submissions : [];
    const mergedSubmissions = deduplicateSubmissionsPerStudent([...existingSubmissions, ...incomingSubmissions]);

    assignment.submissions = mergedSubmissions;
    assignment.completedCount = mergedSubmissions.length;

    let updated: HomeworkAssignment[];
    if (existsIdx >= 0) {
      updated = [...current];
      updated[existsIdx] = { ...current[existsIdx], ...assignment };
    } else {
      updated = [assignment, ...current];
    }
    saveAssignmentsToLocalStorage(updated);

    if (!db) {
      return;
    }

    const assignRef = doc(db, 'assignments', canonicalHomeworkId);
    const cleanedPayload = removeUndefined({
      ...assignment,
      id: canonicalHomeworkId,
      homeworkId: canonicalHomeworkId,
      submissions: mergedSubmissions,
      completedCount: mergedSubmissions.length,
      updatedAt: new Date().toISOString()
    });

    await setDoc(assignRef, cleanedPayload, { merge: true });
    console.log(`💾 Đã lưu bài tập "${assignment.title}" (homeworkId: ${canonicalHomeworkId}) lên Cloud Firestore!`);
  } catch (error) {
    console.error('Lỗi khi lưu bài tập lên Firestore:', error);
  }
}

/**
 * Save a Student Homework Submission to Firestore & LocalStorage using the single canonical homeworkId
 */
export async function saveHomeworkSubmissionToFirestore(params: {
  homeworkId: string;
  assignmentTitle?: string;
  subject?: string;
  grade?: string;
  targetClass?: string;
  studentId: string;
  studentCode?: string;
  studentRecordId?: string;
  studentName: string;
  className?: string;
  score: number | string;
  scoreText?: string;
  answers?: Record<number, any>;
  questionResults?: ('pass' | 'fail' | 'none')[];
  correctCount?: number;
  totalQuestions?: number;
  submittedAt?: string;
  timeSpentSeconds?: number;
}): Promise<AssignmentSubmission | null> {
  const homeworkId = String(params.homeworkId || '').trim();
  if (!homeworkId) {
    console.warn('⚠️ saveHomeworkSubmissionToFirestore: Thiếu homeworkId!');
    return null;
  }

  const canonicalCode = extractCanonicalStudentCode(params.studentCode || params.studentId);
  const studentRecordId = String(params.studentRecordId || params.studentId || canonicalCode).trim();
  const studentName = String(params.studentName || 'Học sinh').trim();
  const numericScore = typeof params.score === 'number'
    ? Math.round(params.score * 10) / 10
    : Math.round((parseFloat(String(params.score)) || 0) * 10) / 10;
  const nowFormatted = params.submittedAt || new Date().toLocaleString('vi-VN');
  const nowIso = new Date().toISOString();

  const submissionRecord: AssignmentSubmission = {
    id: `sub_${homeworkId}_${canonicalCode || studentRecordId}`,
    homeworkId,
    assignmentId: homeworkId,
    studentId: canonicalCode || studentRecordId,
    studentCode: canonicalCode || studentRecordId,
    studentRecordId,
    studentName,
    className: params.className || params.targetClass || '',
    submittedAt: nowFormatted,
    submittedAtIso: nowIso,
    content: JSON.stringify(params.answers || {}),
    score: numericScore,
    scoreText: params.scoreText || `${numericScore.toFixed(1)} / 10`,
    answers: params.answers || {},
    questionResults: params.questionResults || [],
    correctCount: params.correctCount ?? (params.questionResults ? params.questionResults.filter(r => r === 'pass').length : 0),
    totalQuestions: params.totalQuestions ?? (params.questionResults ? params.questionResults.length : 0),
    timeSpentSeconds: params.timeSpentSeconds || 120,
    status: 'graded'
  };

  console.log('📤 [Homework Submission] Ghi bài nộp với homeworkId:', homeworkId, {
    studentCode: submissionRecord.studentCode,
    studentName: submissionRecord.studentName,
    score: submissionRecord.score,
    questionResults: submissionRecord.questionResults
  });

  // 1. Save to per-homework LocalStorage cache
  if (typeof window !== 'undefined') {
    try {
      const localKey = `${HW_SUBMISSIONS_PREFIX}${homeworkId}`;
      const existingRaw = localStorage.getItem(localKey);
      const existingList: AssignmentSubmission[] = existingRaw ? JSON.parse(existingRaw) : [];
      const mergedLocal = deduplicateSubmissionsPerStudent([
        ...(Array.isArray(existingList) ? existingList : []),
        submissionRecord
      ]);
      localStorage.setItem(localKey, JSON.stringify(mergedLocal));
    } catch (e) {
      console.warn('Lỗi lưu cache bài nộp cục bộ:', e);
    }

    // 2. Update cached assignments in LocalStorage
    try {
      const cachedAssignments = getLocalCachedAssignments();
      const targetIdx = cachedAssignments.findIndex(a => a.id === homeworkId);
      if (targetIdx >= 0) {
        const targetAs = cachedAssignments[targetIdx];
        const mergedSubs = deduplicateSubmissionsPerStudent([
          ...(targetAs.submissions || []),
          submissionRecord
        ]);
        cachedAssignments[targetIdx] = {
          ...targetAs,
          submissions: mergedSubs,
          completedCount: mergedSubs.length
        };
        saveAssignmentsToLocalStorage(cachedAssignments);
      }
    } catch (e) {
      console.warn('Lỗi cập nhật eduplay_cached_assignments:', e);
    }

    window.dispatchEvent(
      new CustomEvent('eduplay_homework_submission_saved', {
        detail: { homeworkId, submission: submissionRecord }
      })
    );
  }

  // 3. Persist to Cloud Firestore across:
  //    (a) quiz_live_sessions (permitted for unauthenticated/PIN students via existing Firestore rules)
  //    (b) homework_submissions (dedicated collection keyed by homeworkId + studentCode)
  //    (c) assignments/{homeworkId} (embedded submissions array)
  if (db) {
    const cleanHwKey = homeworkId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanStKey = (canonicalCode || studentRecordId || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanedSubmission = removeUndefined(submissionRecord);

    // 3a. Write to quiz_live_sessions (guaranteed write permission in live Firestore rules)
    try {
      const liveSessionDocId = `${cleanHwKey}_${cleanStKey}`;
      await setDoc(
        doc(db, 'quiz_live_sessions', liveSessionDocId),
        removeUndefined({
          id: liveSessionDocId,
          targetId: homeworkId,
          homeworkId,
          assignmentId: homeworkId,
          submissionType: 'assignment',
          targetTitle: params.assignmentTitle || '',
          subject: params.subject || '',
          grade: params.grade || '',
          studentId: submissionRecord.studentCode,
          studentCode: submissionRecord.studentCode,
          studentRecordId: submissionRecord.studentRecordId,
          studentName: submissionRecord.studentName,
          studentClass: submissionRecord.className || '',
          status: 'completed',
          score: numericScore,
          scoreStr: submissionRecord.scoreText,
          answers: submissionRecord.answers,
          questionResults: submissionRecord.questionResults,
          correctCount: submissionRecord.correctCount,
          totalQuestions: submissionRecord.totalQuestions || 5,
          answeredCount: submissionRecord.totalQuestions || 5,
          submittedAt: submissionRecord.submittedAt,
          submittedAtIso: submissionRecord.submittedAtIso,
          timeSpentSeconds: submissionRecord.timeSpentSeconds || 120,
          completedAt: Date.now(),
          updatedAt: Date.now()
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Lỗi lưu bài nộp vào quiz_live_sessions:', err);
    }

    // 3b. Write to homework_submissions collection
    try {
      const hwSubDocId = `${cleanHwKey}__${cleanStKey}`;
      await setDoc(
        doc(db, 'homework_submissions', hwSubDocId),
        {
          ...cleanedSubmission,
          id: hwSubDocId,
          homeworkId,
          assignmentId: homeworkId,
          assignmentTitle: params.assignmentTitle || '',
          subject: params.subject || '',
          grade: params.grade || '',
          targetClass: params.targetClass || params.className || '',
          updatedAt: nowIso
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Lỗi lưu bài nộp vào homework_submissions:', err);
    }

    // 3c. Write to submissions collection
    try {
      const subDocId = `${cleanHwKey}__${cleanStKey}`;
      await setDoc(
        doc(db, 'submissions', subDocId),
        removeUndefined({
          id: subDocId,
          studentId: submissionRecord.studentCode || canonicalCode || studentRecordId,
          studentCode: submissionRecord.studentCode || canonicalCode,
          studentRecordId: submissionRecord.studentRecordId || studentRecordId,
          studentName: submissionRecord.studentName || params.studentName,
          homeworkId,
          assignmentId: homeworkId,
          classId: params.targetClass || params.className || '',
          className: params.className || params.targetClass || '',
          assignmentTitle: params.assignmentTitle || '',
          subject: params.subject || '',
          grade: params.grade || '',
          score: numericScore,
          scoreText: submissionRecord.scoreText,
          answers: submissionRecord.answers,
          questionResults: submissionRecord.questionResults,
          correctCount: submissionRecord.correctCount,
          totalQuestions: submissionRecord.totalQuestions || 5,
          submittedAt: submissionRecord.submittedAt,
          submittedAtIso: submissionRecord.submittedAtIso,
          timeSpentSeconds: submissionRecord.timeSpentSeconds || 120,
          updatedAt: nowIso
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Lỗi lưu bài nộp vào submissions:', err);
    }

    // 3d. Update assignments/{homeworkId} document
    try {
      const assignRef = doc(db, 'assignments', homeworkId);
      let existingSubs: AssignmentSubmission[] = [];
      try {
        const snap = await getDoc(assignRef);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.submissions)) {
            existingSubs = data.submissions as AssignmentSubmission[];
          }
        }
      } catch {}

      const mergedCloudSubs = deduplicateSubmissionsPerStudent([
        ...existingSubs,
        cleanedSubmission
      ]);

      await setDoc(
        assignRef,
        removeUndefined({
          submissions: mergedCloudSubs,
          completedCount: mergedCloudSubs.length,
          updatedAt: nowIso
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Lỗi cập nhật trực tiếp assignments/{homeworkId} (đã lưu qua quiz_live_sessions & homework_submissions):', err);
    }
  }

  return submissionRecord;
}

/**
 * Scan LocalStorage for any student submissions (`eduplay_student_submissions_*` and `eduplay_homework_submissions_*`)
 * so that submissions made on the same browser are always recovered and matched by homeworkId
 */
export function getLocalHomeworkSubmissionsByAssignment(): Record<string, AssignmentSubmission[]> {
  if (typeof window === 'undefined') return {};
  const map: Record<string, AssignmentSubmission[]> = {};
  const cachedAssignments = getLocalCachedAssignments();

  const addRecord = (hwId: string, sub: AssignmentSubmission) => {
    const cleanId = String(hwId || '').trim();
    if (!cleanId) return;
    if (!map[cleanId]) map[cleanId] = [];
    map[cleanId].push(sub);
  };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(HW_SUBMISSIONS_PREFIX)) {
        const hwId = key.replace(HW_SUBMISSIONS_PREFIX, '').trim();
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((s: any) => {
              if (s && (s.studentId || s.studentCode || s.studentName)) {
                addRecord(s.homeworkId || s.assignmentId || hwId, s as AssignmentSubmission);
              }
            });
          }
        }
      } else if (key.startsWith('eduplay_student_submissions_')) {
        const studentKeyFromStorage = key.replace('eduplay_student_submissions_', '').trim();
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (!item || item.type === 'exam' || item.submissionType === 'exam') return;
              const hwId = String(item.homeworkId || item.assignmentId || item.assignment?.id || item.id || '').trim();
              if (!hwId) return;

              const targetAs = cachedAssignments.find(a => a.id === hwId);
              const targetClass = String(item.className || item.assignment?.targetClass || targetAs?.targetClass || '').trim();
              const targetPrefixMatch = targetClass.match(/([1-5][a-z])/i);
              const targetPrefix = targetPrefixMatch ? targetPrefixMatch[1].toLowerCase() : '';

              let studentCode = extractCanonicalStudentCode(item.studentCode || item.studentId || studentKeyFromStorage);
              // Repair legacy 5b<N> studentCode if assignment belongs to another class (e.g., 3c)
              if (targetPrefix && targetPrefix !== '5b' && /^5b(\d+)$/i.test(studentCode)) {
                const sttNum = studentCode.replace(/^5b/i, '');
                studentCode = `${targetPrefix}${sttNum}`;
              }

              let resolvedName = String(item.studentName || '').trim();
              let resolvedRecordId = String(item.studentRecordId || item.studentId || studentCode).trim();
              if (targetClass && studentCode) {
                const roster = getStudentsFromLocalStorage(targetClass);
                const matchedSt = roster.find(
                  s => extractCanonicalStudentCode(s.code || s.id) === studentCode ||
                       (resolvedName && (s.fullName || s.name || '').trim().toLowerCase() === resolvedName.toLowerCase())
                );
                if (matchedSt) {
                  resolvedName = matchedSt.fullName || matchedSt.name || resolvedName;
                  resolvedRecordId = matchedSt.id || resolvedRecordId;
                  studentCode = extractCanonicalStudentCode(matchedSt.code || studentCode);
                }
              }

              const numericScore = typeof item.score === 'number'
                ? item.score
                : (parseFloat(String(item.score)) || 0);

              const converted: AssignmentSubmission = {
                id: item.id || `sub_${hwId}_${studentCode}`,
                homeworkId: hwId,
                assignmentId: hwId,
                studentId: studentCode || item.studentId || studentKeyFromStorage,
                studentCode: studentCode || item.studentId || studentKeyFromStorage,
                studentRecordId: resolvedRecordId,
                studentName: resolvedName,
                className: targetClass,
                submittedAt: item.submittedTime || item.submittedAt || '',
                submittedAtIso: item.submittedAtIso || '',
                content: typeof item.content === 'string' ? item.content : JSON.stringify(item.answers || {}),
                score: Math.round(numericScore * 10) / 10,
                scoreText: typeof item.score === 'string' ? item.score : `${numericScore.toFixed(1)} / 10`,
                answers: item.answers || {},
                questionResults: Array.isArray(item.questionResults) ? item.questionResults : undefined,
                correctCount: item.correctCount,
                totalQuestions: item.totalQuestions,
                status: 'graded'
              };
              addRecord(hwId, converted);
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc bài nộp cục bộ từ LocalStorage:', err);
  }

  Object.keys(map).forEach((hwId) => {
    map[hwId] = deduplicateSubmissionsPerStudent(map[hwId]);
  });

  return map;
}

/**
 * Subscribe in real-time to all homework submissions from Firestore (`homework_submissions` & `quiz_live_sessions`)
 * merged with LocalStorage submissions, grouped by homeworkId
 */
export function subscribeToAllHomeworkSubmissionsFromFirestore(
  onUpdate: (submissionsByHomeworkId: Record<string, AssignmentSubmission[]>) => void
): () => void {
  let hwSubsMap: Record<string, AssignmentSubmission[]> = {};
  let liveSessionSubsMap: Record<string, AssignmentSubmission[]> = {};

  const emitMerged = () => {
    const localMap = getLocalHomeworkSubmissionsByAssignment();
    const allHwIds = new Set<string>([
      ...Object.keys(localMap),
      ...Object.keys(hwSubsMap),
      ...Object.keys(liveSessionSubsMap)
    ]);

    const combined: Record<string, AssignmentSubmission[]> = {};
    allHwIds.forEach((hwId) => {
      const list = [
        ...(localMap[hwId] || []),
        ...(liveSessionSubsMap[hwId] || []),
        ...(hwSubsMap[hwId] || [])
      ];
      combined[hwId] = deduplicateSubmissionsPerStudent(list);
    });

    onUpdate(combined);
  };

  // Initial emit from local storage
  emitMerged();

  if (!db) {
    return () => {};
  }

  let unsubHw: (() => void) | null = null;
  let unsubLive: (() => void) | null = null;

  try {
    unsubHw = onSnapshot(
      collection(db, 'homework_submissions'),
      (snap) => {
        const nextMap: Record<string, AssignmentSubmission[]> = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const hwId = String(data.homeworkId || data.assignmentId || '').trim();
          if (!hwId) return;
          if (!nextMap[hwId]) nextMap[hwId] = [];
          const numericScore = typeof data.score === 'number'
            ? data.score
            : (parseFloat(String(data.score)) || 0);
          nextMap[hwId].push({
            id: docSnap.id,
            homeworkId: hwId,
            assignmentId: hwId,
            studentId: extractCanonicalStudentCode(data.studentCode || data.studentId) || data.studentId,
            studentCode: extractCanonicalStudentCode(data.studentCode || data.studentId) || data.studentCode,
            studentRecordId: data.studentRecordId || data.studentId,
            studentName: data.studentName || 'Học sinh',
            className: data.className || data.targetClass || '',
            submittedAt: data.submittedAt || '',
            submittedAtIso: data.submittedAtIso || data.updatedAt || '',
            content: data.content || JSON.stringify(data.answers || {}),
            score: Math.round(numericScore * 10) / 10,
            scoreText: data.scoreText || `${numericScore.toFixed(1)} / 10`,
            answers: data.answers || {},
            questionResults: Array.isArray(data.questionResults) ? data.questionResults : undefined,
            correctCount: data.correctCount,
            totalQuestions: data.totalQuestions,
            timeSpentSeconds: data.timeSpentSeconds,
            feedback: data.feedback,
            status: 'graded'
          });
        });
        hwSubsMap = nextMap;
        emitMerged();
      },
      (err) => {
        console.warn('Firestore homework_submissions listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to homework_submissions:', err);
  }

  try {
    unsubLive = onSnapshot(
      collection(db, 'quiz_live_sessions'),
      (snap) => {
        const nextMap: Record<string, AssignmentSubmission[]> = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data.status !== 'completed') return;
          const hwId = String(data.homeworkId || data.assignmentId || data.targetId || '').trim();
          if (!hwId) return;
          if (!nextMap[hwId]) nextMap[hwId] = [];
          const numericScore = typeof data.score === 'number'
            ? data.score
            : (parseFloat(String(data.scoreStr || data.score)) || 0);
          nextMap[hwId].push({
            id: docSnap.id,
            homeworkId: hwId,
            assignmentId: hwId,
            studentId: extractCanonicalStudentCode(data.studentCode || data.studentId) || data.studentId,
            studentCode: extractCanonicalStudentCode(data.studentCode || data.studentId) || data.studentId,
            studentRecordId: data.studentRecordId || data.studentId,
            studentName: data.studentName || 'Học sinh',
            className: data.studentClass || data.className || '',
            submittedAt: data.submittedAt || (data.completedAt ? new Date(data.completedAt).toLocaleString('vi-VN') : ''),
            submittedAtIso: data.submittedAtIso || (data.completedAt ? new Date(data.completedAt).toISOString() : ''),
            content: JSON.stringify(data.answers || {}),
            score: Math.round(numericScore * 10) / 10,
            scoreText: data.scoreStr || `${numericScore.toFixed(1)} / 10`,
            answers: data.answers || {},
            questionResults: Array.isArray(data.questionResults) ? data.questionResults : undefined,
            correctCount: data.correctCount,
            totalQuestions: data.totalQuestions,
            timeSpentSeconds: data.timeSpentSeconds,
            status: 'graded'
          });
        });
        liveSessionSubsMap = nextMap;
        emitMerged();
      },
      (err) => {
        console.warn('Firestore quiz_live_sessions listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to quiz_live_sessions:', err);
  }

  const handleLocalEvent = () => emitMerged();
  if (typeof window !== 'undefined') {
    window.addEventListener('eduplay_homework_submission_saved', handleLocalEvent);
    window.addEventListener('eduplay_student_submissions_updated', handleLocalEvent);
  }

  return () => {
    if (unsubHw) unsubHw();
    if (unsubLive) unsubLive();
    if (typeof window !== 'undefined') {
      window.removeEventListener('eduplay_homework_submission_saved', handleLocalEvent);
      window.removeEventListener('eduplay_student_submissions_updated', handleLocalEvent);
    }
  };
}

/**
 * Resolve all submissions for a specific HomeworkAssignment by its canonical homeworkId (assignment.id)
 */
export function resolveSubmissionsForAssignment(
  assignment: HomeworkAssignment | null | undefined,
  submissionsByHomeworkId: Record<string, AssignmentSubmission[]> = {},
  allAssignments: HomeworkAssignment[] = []
): AssignmentSubmission[] {
  if (!assignment || !assignment.id) return [];

  const canonicalId = assignment.id.trim();
  const rootId = (assignment.originalAssignmentId || '').trim();

  const collected: AssignmentSubmission[] = [
    ...(Array.isArray(assignment.submissions) ? assignment.submissions : []),
    ...(submissionsByHomeworkId[canonicalId] || [])
  ];

  if (rootId && rootId !== canonicalId && submissionsByHomeworkId[rootId]) {
    collected.push(...submissionsByHomeworkId[rootId]);
  }

  // If duplicate assignment records with identical (title, subject, targetClass) exist in allAssignments,
  // also check their submissions so no student submission is ever orphaned
  const normTitle = (assignment.title || '').trim().toLowerCase();
  const normClass = (assignment.targetClass || '').trim().toLowerCase();
  const normSubject = (assignment.subject || '').trim().toLowerCase();

  (allAssignments || []).forEach((other) => {
    if (!other || !other.id || other.id === canonicalId) return;
    const sameTitle = (other.title || '').trim().toLowerCase() === normTitle;
    const sameClass = (other.targetClass || '').trim().toLowerCase() === normClass;
    const sameSubject = (other.subject || '').trim().toLowerCase() === normSubject;
    if (sameTitle && sameClass && sameSubject) {
      if (Array.isArray(other.submissions) && other.submissions.length > 0) {
        collected.push(...other.submissions);
      }
      if (submissionsByHomeworkId[other.id]) {
        collected.push(...submissionsByHomeworkId[other.id]);
      }
    }
  });

  return deduplicateSubmissionsPerStudent(collected);
}

/**
 * Delete a specific student's homework submission from Firestore & LocalStorage
 */
export async function deleteHomeworkSubmissionFromFirestore(
  homeworkId: string,
  studentCodeOrId: string,
  studentName?: string
): Promise<void> {
  if (!homeworkId) return;
  const canonicalCode = extractCanonicalStudentCode(studentCodeOrId);
  const cleanHwKey = homeworkId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStKey = (canonicalCode || studentCodeOrId).replace(/[^a-zA-Z0-9_-]/g, '_');

  if (typeof window !== 'undefined') {
    try {
      const localKey = `${HW_SUBMISSIONS_PREFIX}${homeworkId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const list: AssignmentSubmission[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          const filtered = list.filter(
            (s) => !isSameStudentSubmission(s, { id: studentCodeOrId, code: canonicalCode, name: studentName })
          );
          localStorage.setItem(localKey, JSON.stringify(filtered));
        }
      }
    } catch {}
  }

  if (db) {
    try {
      await deleteDoc(doc(db, 'quiz_live_sessions', `${cleanHwKey}_${cleanStKey}`));
    } catch {}
    try {
      await deleteDoc(doc(db, 'homework_submissions', `${cleanHwKey}__${cleanStKey}`));
    } catch {}
  }
}

/**
 * Subscribe to a specific student's homework submissions from Firestore & LocalStorage
 */
export function subscribeToStudentHomeworkSubmissions(
  studentIdOrCode: string,
  onUpdate: (submissions: AssignmentSubmission[]) => void,
  studentName?: string
): () => void {
  const canonicalCode = extractCanonicalStudentCode(studentIdOrCode);

  const getFilteredLocal = (): AssignmentSubmission[] => {
    const allLocal = getLocalHomeworkSubmissionsByAssignment();
    const collected: AssignmentSubmission[] = [];
    Object.values(allLocal).forEach((list) => {
      list.forEach((sub) => {
        if (
          isSameStudentSubmission(sub, {
            id: studentIdOrCode,
            code: canonicalCode,
            username: canonicalCode,
            name: studentName,
            fullName: studentName
          })
        ) {
          collected.push(sub);
        }
      });
    });
    return deduplicateSubmissionsPerStudent(collected);
  };

  let firestoreSubs: AssignmentSubmission[] = [];

  const emit = () => {
    const localList = getFilteredLocal();
    const merged = deduplicateSubmissionsPerStudent([...localList, ...firestoreSubs]);
    merged.sort((a, b) => (b.submittedAtIso || b.submittedAt || '').localeCompare(a.submittedAtIso || a.submittedAt || ''));
    onUpdate(merged);
  };

  // Immediate emit from local storage
  emit();

  const handleLocalEvent = () => emit();
  if (typeof window !== 'undefined') {
    window.addEventListener('eduplay_homework_submission_saved', handleLocalEvent);
    window.addEventListener('eduplay_student_submissions_updated', handleLocalEvent);
  }

  if (!db) {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('eduplay_homework_submission_saved', handleLocalEvent);
        window.removeEventListener('eduplay_student_submissions_updated', handleLocalEvent);
      }
    };
  }

  let unsubHw: (() => void) | null = null;
  let unsubLive: (() => void) | null = null;

  try {
    unsubHw = onSnapshot(
      collection(db, 'homework_submissions'),
      (snap) => {
        const list: AssignmentSubmission[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const sub: AssignmentSubmission = {
            id: docSnap.id,
            homeworkId: data.homeworkId || data.assignmentId,
            assignmentId: data.assignmentId || data.homeworkId,
            studentId: extractCanonicalStudentCode(data.studentCode || data.studentId) || data.studentId,
            studentCode: extractCanonicalStudentCode(data.studentCode || data.studentId) || data.studentCode,
            studentRecordId: data.studentRecordId || data.studentId,
            studentName: data.studentName || 'Học sinh',
            className: data.className || data.targetClass || '',
            submittedAt: data.submittedAt || '',
            submittedAtIso: data.submittedAtIso || data.updatedAt || '',
            content: data.content || JSON.stringify(data.answers || {}),
            score: typeof data.score === 'number' ? data.score : parseFloat(String(data.score)) || 0,
            scoreText: data.scoreText || `${data.score} / 10`,
            answers: data.answers || {},
            questionResults: Array.isArray(data.questionResults) ? data.questionResults : undefined,
            correctCount: data.correctCount,
            totalQuestions: data.totalQuestions,
            timeSpentSeconds: data.timeSpentSeconds,
            feedback: data.feedback,
            status: 'graded'
          };
          if (
            isSameStudentSubmission(sub, {
              id: studentIdOrCode,
              code: canonicalCode,
              username: canonicalCode,
              name: studentName,
              fullName: studentName
            })
          ) {
            list.push(sub);
          }
        });
        firestoreSubs = list;
        emit();
      },
      (err) => console.warn('Firestore student homework_submissions listener warning:', err)
    );
  } catch (err) {
    console.warn('Could not subscribe to student homework_submissions:', err);
  }

  try {
    unsubLive = onSnapshot(
      collection(db, 'quiz_live_sessions'),
      (snap) => {
        const list: AssignmentSubmission[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data.status !== 'completed') return;
          const sub: AssignmentSubmission = {
            id: docSnap.id,
            homeworkId: data.homeworkId || data.assignmentId || data.targetId,
            assignmentId: data.assignmentId || data.homeworkId || data.targetId,
            studentId: extractCanonicalStudentCode(data.studentCode || data.studentId) || data.studentId,
            studentCode: extractCanonicalStudentCode(data.studentCode || data.studentId) || data.studentId,
            studentRecordId: data.studentRecordId || data.studentId,
            studentName: data.studentName || 'Học sinh',
            className: data.studentClass || data.className || '',
            submittedAt: data.submittedAt || (data.completedAt ? new Date(data.completedAt).toLocaleString('vi-VN') : ''),
            submittedAtIso: data.submittedAtIso || (data.completedAt ? new Date(data.completedAt).toISOString() : ''),
            content: JSON.stringify(data.answers || {}),
            score: typeof data.score === 'number' ? data.score : parseFloat(String(data.scoreStr || data.score)) || 0,
            scoreText: data.scoreStr || `${data.score} / 10`,
            answers: data.answers || {},
            questionResults: Array.isArray(data.questionResults) ? data.questionResults : undefined,
            correctCount: data.correctCount,
            totalQuestions: data.totalQuestions,
            timeSpentSeconds: data.timeSpentSeconds,
            status: 'graded'
          };
          if (
            isSameStudentSubmission(sub, {
              id: studentIdOrCode,
              code: canonicalCode,
              username: canonicalCode,
              name: studentName,
              fullName: studentName
            })
          ) {
            list.push(sub);
          }
        });
        firestoreSubs = deduplicateSubmissionsPerStudent([...firestoreSubs, ...list]);
        emit();
      },
      (err) => console.warn('Firestore student quiz_live_sessions listener warning:', err)
    );
  } catch (err) {
    console.warn('Could not subscribe to student quiz_live_sessions:', err);
  }

  return () => {
    if (unsubHw) unsubHw();
    if (unsubLive) unsubLive();
    if (typeof window !== 'undefined') {
      window.removeEventListener('eduplay_homework_submission_saved', handleLocalEvent);
      window.removeEventListener('eduplay_student_submissions_updated', handleLocalEvent);
    }
  };
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
        const data = docSnap.data();
        items.push({
          ...data,
          id: docSnap.id,
          homeworkId: docSnap.id
        } as HomeworkAssignment);
      });
      saveAssignmentsToLocalStorage(items);
      return deduplicateAssignments(items);
    }

    saveAssignmentsToLocalStorage([]);
    return [];
  } catch (error) {
    console.warn('Lỗi đọc danh sách bài tập từ Firestore:', error);
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
            const data = docSnap.data();
            // Always enforce docSnap.id as the single canonical id & homeworkId
            const rawAs = {
              ...data,
              id: docSnap.id,
              homeworkId: docSnap.id
            } as HomeworkAssignment;
            const { assignment: sanitized, changed } = sanitizeAssignmentOrderingQuestions(rawAs);
            if (changed && db) {
              setDoc(doc(db, 'assignments', docSnap.id), { questions: sanitized.questions }, { merge: true }).catch(() => {});
            }
            loaded.push(sanitized);
          });
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
    console.error('Lỗi khi xóa bài tập khỏi Firestore:', error);
  }
}
