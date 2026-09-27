import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileCheck2, 
  Clock, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  Sparkles, 
  Eye, 
  Lock, 
  Ban, 
  Zap, 
  Calendar, 
  Filter,
  BookOpen,
  Bookmark,
  Check,
  AlertTriangle,
  Send
} from 'lucide-react';
import { getSubjectColorStyles } from '../../utils/subjectColors';
import { ExamPaper, QuestionItem } from '../../types';
import { awardExamReward, awardAssignmentReward } from '../../config/rewardConfig';
import { matchesQuestionType, isMultipleResponse } from '../../lib/constants';
import { getStudentGameProfile } from '../../services/studentGameStoreService';
import { getEffectiveStudentClassAndGrade } from '../../services/studentSessionService';
import {
  saveHomeworkSubmissionToFirestore,
  extractCanonicalStudentCode
} from '../../services/assignmentStorageService';
import {
  resolveCanonicalOrderingSteps,
  createShuffledOrderingSteps,
  getLocalCachedQuestions,
  subscribeToQuestionsFromFirestore,
} from '../../services/questionStorageService';

let liveQuestionsBankModuleCache: QuestionItem[] = [];

const normalizeQuestionMatchText = (s?: string): string =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const findLatestQuestionInBank = (
  qi: QuestionItem,
  bankOverride?: QuestionItem[]
): QuestionItem | undefined => {
  if (!qi) return undefined;
  const activeBank =
    bankOverride && bankOverride.length > 0
      ? bankOverride
      : liveQuestionsBankModuleCache.length > 0
      ? liveQuestionsBankModuleCache
      : getLocalCachedQuestions();
  if (!activeBank || activeBank.length === 0) return undefined;

  const targetContent = normalizeQuestionMatchText(qi.content || (qi as any).question || (qi as any).title);

  // 1. Exact ID match
  if (qi.id) {
    const byId = activeBank.find(item => item.id === qi.id);
    if (byId) return byId;
  }
  // 2. Code + content match
  if (qi.code && targetContent) {
    const byCodeAndContent = activeBank.find(
      item => item.code === qi.code && normalizeQuestionMatchText(item.content) === targetContent
    );
    if (byCodeAndContent) return byCodeAndContent;
  }
  // 3. Exact normalized content match
  if (targetContent) {
    const byContent = activeBank.find(item => normalizeQuestionMatchText(item.content) === targetContent);
    if (byContent) return byContent;
  }
  return undefined;
};

export const getCanonicalOrderingStepsForGrading = (
  qi: QuestionItem,
  bankOverride?: QuestionItem[]
): string[] => {
  if (!qi) return [];
  const stripStepPrefix = (s: string) =>
    String(s ?? '')
      .trim()
      .replace(/^(?:bước\s*\d+|\d+)[\.\:\)\-\s]+/i, '')
      .trim();

  const bankQuestion = findLatestQuestionInBank(qi, bankOverride);
  const sourceQ = bankQuestion || qi;

  // 1. Read structured orderingSteps with updated index/order if available
  if (Array.isArray(sourceQ.orderingSteps) && sourceQ.orderingSteps.length > 0) {
    const ordered = [...sourceQ.orderingSteps]
      .sort((a, b) => (a.order ?? a.index ?? 0) - (b.order ?? b.index ?? 0))
      .map(s => stripStepPrefix(s.text))
      .filter(Boolean);
    if (ordered.length > 0) {
      return sourceQ.teacherEditedOrder
        ? ordered
        : resolveCanonicalOrderingSteps({ ...sourceQ, options: ordered, canonicalOptions: ordered });
    }
  }

  // 2. Read canonicalOptions or correctOrder
  if (Array.isArray(sourceQ.canonicalOptions) && sourceQ.canonicalOptions.length > 0) {
    const clean = sourceQ.canonicalOptions.map(stripStepPrefix).filter(Boolean);
    return sourceQ.teacherEditedOrder
      ? clean
      : resolveCanonicalOrderingSteps({ ...sourceQ, options: clean, canonicalOptions: clean });
  }
  if (Array.isArray(sourceQ.correctOrder) && sourceQ.correctOrder.length > 0) {
    const clean = sourceQ.correctOrder.map(stripStepPrefix).filter(Boolean);
    return sourceQ.teacherEditedOrder
      ? clean
      : resolveCanonicalOrderingSteps({ ...sourceQ, options: clean, canonicalOptions: clean });
  }

  // 3. If found in Question Bank, bankQuestion.options is the unshuffled canonical array
  if (bankQuestion && Array.isArray(bankQuestion.options) && bankQuestion.options.length > 0) {
    const clean = bankQuestion.options.map(stripStepPrefix).filter(Boolean);
    return bankQuestion.teacherEditedOrder
      ? clean
      : resolveCanonicalOrderingSteps(bankQuestion);
  }

  // 4. Read correctAnswer string ("step1 -> step2" or "step1||step2")
  if (
    typeof sourceQ.correctAnswer === 'string' &&
    (sourceQ.correctAnswer.includes('->') || sourceQ.correctAnswer.includes('||'))
  ) {
    const sep = sourceQ.correctAnswer.includes('||') ? '||' : '->';
    const parts = sourceQ.correctAnswer.split(sep).map(stripStepPrefix).filter(Boolean);
    if (parts.length > 1 && !parts.every(p => /^\d+$/.test(p))) {
      return sourceQ.teacherEditedOrder
        ? parts
        : resolveCanonicalOrderingSteps({ ...sourceQ, options: parts, canonicalOptions: parts });
    }
  }

  // 5. Fallback to resolveCanonicalOrderingSteps
  return resolveCanonicalOrderingSteps(sourceQ);
};

export interface ExamSubmissionItem {
  id: string;
  type: 'exam';
  submissionType?: 'exam';
  examId: string;
  studentId?: string;
  title: string;
  subject: string;
  rank: string;
  score: string;
  submittedTime: string;
  exam: ExamPaper;
  answers: Record<number, any>;
}

const isExamSubmission = (sub: any): boolean => {
  if (!sub) return false;
  if (sub.type === 'assignment' || sub.submissionType === 'assignment') return false;
  if (sub.type === 'exam' || sub.submissionType === 'exam') return true;

  const title = (sub.title || sub.exam?.title || '').toLowerCase().trim();
  if (
    title.startsWith('bài tập tự luyện') || 
    title.startsWith('bài tập:') || 
    title.startsWith('luyện tập:') ||
    title.includes('bài tập rèn luyện')
  ) {
    return false;
  }

  if (sub.assignment && !sub.exam) {
    return false;
  }

  return true;
};

export const checkQuestionCorrectLocal = (qi: QuestionItem, choice: any): boolean => {
  if (!qi) return false;
  try {
    if (isMatchingQuestion(qi)) {
      const studentPairs = (typeof choice === 'object' && choice !== null) ? choice : {};
      const pairs = qi.matchingPairs || [];
      if (pairs.length === 0) return false;
      return pairs.every((pair, pIdx) => {
        const studentSelected = studentPairs[pIdx] !== undefined ? studentPairs[pIdx] : studentPairs[pair.left];
        if (studentSelected === undefined || studentSelected === null || studentSelected === '') return false;

        const correctRightStr = String(pair.right || '').trim().toLowerCase();

        // 1. So sánh trực tiếp chuỗi nội dung vế phải đã cấu hình trong ngân hàng câu hỏi
        if (String(studentSelected).trim().toLowerCase() === correctRightStr) {
          return true;
        }

        // 2. Trường hợp lựa chọn là số index tương ứng
        if (typeof studentSelected === 'number') {
          if (studentSelected === pIdx) return true;
          if (pairs[studentSelected] && String(pairs[studentSelected].right || '').trim().toLowerCase() === correctRightStr) {
            return true;
          }
        }

        // 3. Dự phòng trường hợp học sinh chỉ chọn ký tự tiền tố (a, b, c, d...)
        const rightPrefixMatch = correctRightStr.match(/^([a-z0-9])[\.\:\)\-]/i);
        if (rightPrefixMatch && String(studentSelected).trim().toLowerCase() === rightPrefixMatch[1].toLowerCase()) {
          return true;
        }

        return false;
      });
    }

    if (isOrderingQuestion(qi)) {
      const stripStepPrefix = (s: string) =>
        String(s ?? '')
          .trim()
          .replace(/^(?:bước\s*\d+|\d+)[\.\:\)\-\s]+/i, '')
          .trim();
      const studentOrder = (Array.isArray(choice) ? choice : []).map(stripStepPrefix).filter(Boolean);
      const correctOrder = getCanonicalOrderingStepsForGrading(qi).map(stripStepPrefix).filter(Boolean);
      console.log('[checkQuestionCorrectLocal - Ordering Question Answer Check]', {
        questionId: qi.id,
        questionCode: qi.code,
        content: qi.content,
        correctOrderFromQuestionBank: correctOrder,
        studentOrder,
      });
      if (correctOrder.length === 0) return true;
      if (studentOrder.length !== correctOrder.length) return false;
      return studentOrder.every((item, i) => item.toLowerCase() === correctOrder[i].toLowerCase());
    }

    if (isClassificationQuestion(qi)) {
      const studentAnswers = (typeof choice === 'object' && choice !== null) ? choice : {};
      const items = qi.classificationItems || [];
      if (items.length === 0) return false;
      return items.every((item, iIdx) => {
        const studentSelectedGroup = studentAnswers[iIdx];
        return studentSelectedGroup === item.group;
      });
    }

    if (isTrueFalseQuestion(qi)) {
      if (qi.statements && qi.statements.length > 0) {
        const studentStmts = (typeof choice === 'object' && choice !== null) ? choice : {};
        return qi.statements.every((st, sIdx) => studentStmts[sIdx] === st.isCorrect);
      }
      const sChoice = choice as number;
      const sLetter = sChoice !== undefined && typeof sChoice === 'number' ? String.fromCharCode(65 + sChoice) : '';
      const isCorrectAnswerTrue = qi.correctAnswer === 'A' || String(qi.correctAnswer || '').toLowerCase().includes('đúng') || qi.correctAnswer === 'true' || (qi.correctAnswer as any) === true;
      const studentSelectedTrue = sLetter === 'A' || sChoice === 0 || String(choice).toLowerCase().includes('đúng') || (choice as any) === true;
      return isCorrectAnswerTrue === studentSelectedTrue;
    }

    if (isMultipleResponseQuestion(qi)) {
      const correctLetters = String(qi.correctAnswer || '')
        .toUpperCase()
        .split(/[,;\s]+/)
        .map(s => s.trim())
        .filter(Boolean);
      const studentIndices = Array.isArray(choice) ? choice : (typeof choice === 'number' ? [choice] : []);
      const studentLetters = studentIndices.map(i => String.fromCharCode(65 + i));
      
      if (correctLetters.length === 0 && studentLetters.length === 0) return false;
      if (correctLetters.length !== studentLetters.length) return false;
      return correctLetters.every(l => studentLetters.includes(l));
    }

    if (isFillBlankQuestion(qi)) {
      if (choice === undefined || choice === null) return false;
      const sStr = String(choice).trim().toLowerCase();
      if (!sStr) return false;
      const cStr = String(qi.correctAnswer || '').trim().toLowerCase();
      if (sStr === cStr) return true;
      if (qi.options && qi.options.some(opt => String(opt).trim().toLowerCase() === sStr)) return true;
      return false;
    }

    if (isEssayQuestion(qi)) {
      if (choice === undefined || choice === null) return false;
      if (qi.correctAnswer && String(choice).trim().toLowerCase() === String(qi.correctAnswer).trim().toLowerCase()) {
        return true;
      }
      return String(choice).trim().length > 0;
    }

    if (choice === undefined || choice === null) return false;

    // Single choice MCQ (number index or string)
    if (typeof choice === 'number') {
      const sLetter = String.fromCharCode(65 + choice);
      if (sLetter === qi.correctAnswer) return true;
      if (qi.options && qi.options[choice] !== undefined && String(qi.options[choice]).trim().toLowerCase() === String(qi.correctAnswer || '').trim().toLowerCase()) {
        return true;
      }
      return false;
    }

    const strChoice = String(choice).trim();
    if (strChoice.toUpperCase() === String(qi.correctAnswer || '').trim().toUpperCase()) return true;
    if (qi.options) {
      const optIdx = qi.options.findIndex(o => String(o).trim().toLowerCase() === strChoice.toLowerCase());
      if (optIdx !== -1 && String.fromCharCode(65 + optIdx) === String(qi.correctAnswer || '').trim().toUpperCase()) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

export const isMatchingQuestion = (q: QuestionItem): boolean => {
  if (!q) return false;
  if (q.statements && Array.isArray(q.statements) && q.statements.length > 0) {
    return false;
  }
  const typeStr = (q.type || '').trim().toLowerCase();
  if (matchesQuestionType(typeStr, 'matching') || 
      typeStr === 'matching' || 
      typeStr === 'noi_cap' || 
      typeStr === 'ghep_noi' || 
      typeStr === 'ghép nối' || 
      typeStr === 'nối cặp' ||
      typeStr === 'nối cặp / kéo thả' ||
      typeStr === 'kéo thả'
  ) {
    return true;
  }
  if (q.matchingPairs && Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0) {
    return true;
  }
  return false;
};

const isEssayQuestion = (q: QuestionItem): boolean => {
  if (!q) return false;
  const typeStr = (q.type || '').trim().toLowerCase();
  return matchesQuestionType(typeStr, 'essay') || 
         typeStr === 'essay' || 
         typeStr === 'tu_luan' || 
         typeStr === 'tự luận' || 
         typeStr === 'tự luận tự do';
};

const isTrueFalseQuestion = (q: QuestionItem): boolean => {
  if (!q) return false;
  const typeStr = (q.type || '').trim().toLowerCase();
  return matchesQuestionType(typeStr, 'true_false') || 
         typeStr === 'true_false' || 
         typeStr === 'đúng/sai' || 
         typeStr === 'đúng / sai' || 
         typeStr === 'dung_sai' || 
         (q.statements && Array.isArray(q.statements) && q.statements.length > 0);
};

const isMultipleResponseQuestion = (q: QuestionItem): boolean => {
  if (!q) return false;
  const typeStr = (q.type || '').trim().toLowerCase();
  return matchesQuestionType(typeStr, 'multiple_response') || 
         typeStr === 'multiple_response' || 
         typeStr === 'chọn nhiều đáp án' || 
         typeStr === 'nhiều đáp án' || 
         typeStr === 'chọn nhiều đáp án đúng' || 
         typeStr === 'multiple_choice_multi' || 
         typeStr === 'multi_choice';
};

const isFillBlankQuestion = (q: QuestionItem): boolean => {
  if (!q) return false;
  const typeStr = (q.type || '').trim().toLowerCase();
  return matchesQuestionType(typeStr, 'fill_blank') || 
         typeStr === 'fill_blank' || 
         typeStr === 'điền khuyết' || 
         typeStr === 'dien_khuyet' || 
         typeStr === 'điền khuyết / ngắn' || 
         typeStr === 'short_answer';
};

const isOrderingQuestion = (q: QuestionItem): boolean => {
  if (!q) return false;
  const typeStr = (q.type || '').trim().toLowerCase();
  return matchesQuestionType(typeStr, 'ordering') || 
         typeStr === 'ordering' || 
         typeStr === 'sắp xếp' || 
         typeStr === 'sap_xep' || 
         typeStr === 'sắp xếp thứ tự';
};

const isClassificationQuestion = (q: QuestionItem): boolean => {
  if (!q) return false;
  const typeStr = (q.type || '').trim().toLowerCase();
  return matchesQuestionType(typeStr, 'classification') || 
         typeStr === 'classification' || 
         typeStr === 'phân loại' || 
         typeStr === 'phan_loai';
};

const isMultipleChoiceQuestion = (q: QuestionItem): boolean => {
  if (!q) return false;
  const typeStr = (q.type || '').trim().toLowerCase();
  if (matchesQuestionType(typeStr, 'multiple_choice') || 
      typeStr === 'multiple_choice' || 
      typeStr === 'single_choice' || 
      typeStr === 'trắc nghiệm đơn' || 
      typeStr === 'trắc nghiệm'
  ) {
    return true;
  }
  if (!isMatchingQuestion(q) && !isEssayQuestion(q) && !isTrueFalseQuestion(q) && 
      !isMultipleResponseQuestion(q) && !isFillBlankQuestion(q) && !isOrderingQuestion(q) && 
      !isClassificationQuestion(q) && q.options && q.options.length > 0) {
    return true;
  }
  return false;
};

interface StudentExamModuleProps {
  exams: ExamPaper[];
  questionsBank?: QuestionItem[];
  currentUserId?: string;
  currentUserName?: string;
  initialActiveExam?: ExamPaper;
  onCloseExam?: () => void;
  onSubmitted?: (submission: any) => void;
  isPreviewMode?: boolean;
  mode?: 'exam' | 'assignment';
  allowMultipleAttempts?: boolean;
}

export const StudentExamModule: React.FC<StudentExamModuleProps> = ({
  exams = [],
  questionsBank = [],
  currentUserId = 'u-4',
  currentUserName = 'Lê Minh Anh',
  initialActiveExam,
  onCloseExam,
  onSubmitted,
  isPreviewMode = false,
  mode = 'exam',
  allowMultipleAttempts
}) => {
  const [liveBank, setLiveBank] = useState<QuestionItem[]>(() =>
    questionsBank && questionsBank.length > 0 ? questionsBank : getLocalCachedQuestions()
  );

  useEffect(() => {
    if (questionsBank && questionsBank.length > 0) {
      liveQuestionsBankModuleCache = questionsBank;
      setLiveBank(questionsBank);
    }
  }, [questionsBank]);

  useEffect(() => {
    const unsub = subscribeToQuestionsFromFirestore(loaded => {
      if (loaded && loaded.length > 0) {
        liveQuestionsBankModuleCache = loaded;
        setLiveBank(loaded);
      }
    });
    return () => unsub();
  }, []);
  const [activeTab, setActiveTab] = useState<'todo' | 'history'>('todo');
  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả');
  const [filterUrgent, setFilterUrgent] = useState<boolean>(false);
  const [detailSubmission, setDetailSubmission] = useState<{
    exam: ExamPaper;
    score: string;
    time: string;
    answers: Record<number, any>;
    title: string;
    subject: string;
    rank: string;
  } | null>(null);

  const hasAutoStartedExamIdRef = useRef<string | null>(null);

  // Active exam taking state
  const [activeExamSession, setActiveExamSession] = useState<{
    exam: ExamPaper;
    startTime: number;
    durationMinutes: number;
    answers: Record<number, any>;
    bookmarked: Record<number, boolean>;
    currentQuestionIndex: number;
  } | null>(null);

  // Alert Modal for time out or warning / restriction
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    type: 'timeout' | 'submitted_success' | 'restricted' | 'confirm_submit' | 'confirm_exit';
    examToView?: ExamPaper;
    answersToView?: Record<number, any>;
    scoreToView?: string;
    timeToView?: string;
    onConfirm?: () => void;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Real clock state
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Exam history / submissions for student - Tách riêng biệt độc lập cho Đề kiểm tra (type === 'exam')
  const [examHistory, setExamHistory] = useState<Array<ExamSubmissionItem>>(() => {
    try {
      const saved = localStorage.getItem(`eduplay_student_exam_subs_${currentUserId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const onlyExams: ExamSubmissionItem[] = parsed
            .filter(isExamSubmission)
            .map((s: any) => ({
              ...s,
              type: 'exam' as const,
              submissionType: 'exam' as const,
              examId: s.examId || s.id || 'ex-legacy',
              exam: s.exam || {
                id: s.examId || s.id || 'ex-legacy',
                title: s.title || 'Đề kiểm tra',
                subject: s.subject || 'Môn học',
                questions: s.questions || []
              }
            }));
          return onlyExams;
        }
      }
    } catch {}
    return [];
  });

  const examSubmissions = examHistory;
  const setExamSubmissions = setExamHistory;

  // Re-sync submissions when student user switches & sanitize any polluted records
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`eduplay_student_exam_subs_${currentUserId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const onlyExams: ExamSubmissionItem[] = parsed
            .filter(isExamSubmission)
            .map((s: any) => ({
              ...s,
              type: 'exam' as const,
              submissionType: 'exam' as const,
              examId: s.examId || s.id || 'ex-legacy',
              exam: s.exam || {
                id: s.examId || s.id || 'ex-legacy',
                title: s.title || 'Đề kiểm tra',
                subject: s.subject || 'Môn học',
                questions: s.questions || []
              }
            }));
          setExamHistory(onlyExams);
          if (onlyExams.length !== parsed.length) {
            localStorage.setItem(`eduplay_student_exam_subs_${currentUserId}`, JSON.stringify(onlyExams));
          }
          return;
        }
      }
      setExamHistory([]);
    } catch {}
  }, [currentUserId]);

  // Auto start exam/assignment when initialActiveExam is passed (only once per initial exam ID)
  useEffect(() => {
    if (initialActiveExam && initialActiveExam.id) {
      if (hasAutoStartedExamIdRef.current !== initialActiveExam.id) {
        hasAutoStartedExamIdRef.current = initialActiveExam.id;
        handleStartExam(initialActiveExam);
      }
    }
  }, [initialActiveExam?.id]);

  // Real clock ticker
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('vi-VN'));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Exam session timer countdown & auto-submit when remainingSeconds <= 0
  useEffect(() => {
    if (!activeExamSession) return;

    const exam = activeExamSession.exam;
    const isAssignment = mode === 'assignment' || 
      (exam.title && (exam.title.toLowerCase().includes('bài tập') || exam.title.toLowerCase().includes('luyện tập') || exam.title.toLowerCase().includes('rèn luyện'))) ||
      exam.examType === 'Luyện tập' ||
      exam.examType === 'Bài tập';

    // Không áp đặt giới hạn đếm ngược & tự động nộp bài cho Bài tập rèn luyện
    if (isAssignment) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeExamSession.startTime) / 1000);
      const totalSecs = (activeExamSession.durationMinutes || 15) * 60;
      const left = totalSecs - elapsed;

      if (left <= 0) {
        clearInterval(timer);
        setRemainingSeconds(0);
        handleAutoSubmitTimeout();
      } else {
        setRemainingSeconds(left);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExamSession, mode]);

  const handleAutoSubmitTimeout = () => {
    if (!activeExamSession) return;
    const exam = activeExamSession.exam;
    const answers = activeExamSession.answers;
    
    // Calculate score
    const questions = exam.questions || [];
    let correct = 0;
    const questionResults: ('pass' | 'fail' | 'none')[] = [];
    questions.forEach((q, idx) => {
      const studentChoice = answers[idx];
      if (studentChoice === undefined || studentChoice === null || studentChoice === '') {
        questionResults.push('none');
        return;
      }
      if (isTrueFalseQuestion(q) && q.statements && q.statements.length > 0) {
        const studentStmts = studentChoice || {};
        let qCorrectCount = 0;
        q.statements.forEach((st, sIdx) => {
          if (studentStmts[sIdx] === st.isCorrect) {
            qCorrectCount++;
          }
        });
        correct += qCorrectCount / q.statements.length;
        questionResults.push(qCorrectCount === q.statements.length ? 'pass' : 'fail');
      } else {
        const isOk = checkQuestionCorrectLocal(q, studentChoice);
        if (isOk) {
          correct++;
        }
        questionResults.push(isOk ? 'pass' : 'fail');
      }
    });
    const totalQ = questions.length || 1;
    const scoreVal = ((correct / totalQ) * 10).toFixed(1) + ' / 10';
    const nowTimeStr = new Date().toLocaleTimeString('vi-VN') + ', ' + new Date().toLocaleDateString('vi-VN');
    const scoreNumber = totalQ > 0 ? (correct / totalQ) * 10 : 0;
    const scorePercentage = Math.round((scoreNumber / 10) * 100);

    const rankTier = scoreNumber >= 9.0 
      ? 'Xuất Sắc 🏆' 
      : scoreNumber >= 7.0 
        ? 'Tốt 🥈' 
        : scoreNumber >= 5.0 
          ? 'Đã Hoàn Thành 👍' 
          : 'Cần Ôn Lại 📚';

    const isAssignment = mode === 'assignment' || 
      (exam.title && (exam.title.toLowerCase().includes('bài tập') || exam.title.toLowerCase().includes('luyện tập') || exam.title.toLowerCase().includes('rèn luyện'))) ||
      exam.examType === 'Luyện tập' ||
      exam.examType === 'Bài tập';

    if (!isPreviewMode) {
      if (isAssignment) {
        const sessionInfo = getEffectiveStudentClassAndGrade();
        const canonicalHomeworkId = String(exam.id || '').trim();
        const canonicalCode = extractCanonicalStudentCode(currentUserId || sessionInfo.studentId);
        const resolvedStudentName = currentUserName || sessionInfo.studentName || 'Học sinh';
        const resolvedClass = studentClass || sessionInfo.studentClass || (exam as any).targetClass || '';

        const hwSub = {
          id: `sub_${canonicalHomeworkId}_${canonicalCode || currentUserId}`,
          homeworkId: canonicalHomeworkId,
          assignmentId: canonicalHomeworkId,
          type: 'assignment' as const,
          submissionType: 'assignment' as const,
          studentId: canonicalCode || currentUserId,
          studentCode: canonicalCode || currentUserId,
          studentRecordId: sessionInfo.studentId || currentUserId,
          studentName: resolvedStudentName,
          className: resolvedClass,
          title: exam.title,
          subject: exam.subject || 'Môn học',
          rank: rankTier,
          score: scoreVal,
          submittedTime: nowTimeStr,
          questionResults,
          assignment: {
            id: canonicalHomeworkId,
            homeworkId: canonicalHomeworkId,
            title: exam.title,
            subject: exam.subject,
            grade: exam.grade,
            targetClass: (exam as any).targetClass || resolvedClass,
            questions: exam.questions
          },
          answers
        };
        try {
          const savedHw = localStorage.getItem(`eduplay_student_submissions_${currentUserId}`);
          const parsedHw = savedHw ? JSON.parse(savedHw) : [];
          const updatedHw = [
            hwSub, 
            ...(Array.isArray(parsedHw) ? parsedHw.filter((s: any) => s.id !== hwSub.id && s.assignment?.id !== canonicalHomeworkId && s.homeworkId !== canonicalHomeworkId) : [])
          ];
          localStorage.setItem(`eduplay_student_submissions_${currentUserId}`, JSON.stringify(updatedHw));
          window.dispatchEvent(new Event('eduplay_student_submissions_updated'));
        } catch (err) {
          console.error('Error saving assignment store on timeout:', err);
        }

        if (canonicalHomeworkId) {
          saveHomeworkSubmissionToFirestore({
            homeworkId: canonicalHomeworkId,
            assignmentTitle: exam.title,
            subject: exam.subject,
            grade: exam.grade,
            targetClass: (exam as any).targetClass || resolvedClass,
            studentId: canonicalCode || currentUserId,
            studentCode: canonicalCode || currentUserId,
            studentRecordId: sessionInfo.studentId || currentUserId,
            studentName: resolvedStudentName,
            className: resolvedClass,
            score: scoreNumber,
            scoreText: scoreVal,
            answers,
            questionResults,
            correctCount: Math.round(correct),
            totalQuestions: questions.length,
            submittedAt: nowTimeStr
          }).catch(err => console.warn('Error saving timeout homework submission to Firestore:', err));
        }

        // Thưởng bài tập
        let correctCount = 0;
        questions.forEach((q, idx) => {
          if (checkQuestionCorrectLocal(q, answers[idx])) correctCount++;
        });
        awardAssignmentReward(currentUserId, exam.id || 'as-timeout', exam.title, correctCount, questions.length || 1);
      } else {
        // Lưu riêng biệt chỉ vào kho Đề kiểm tra (examHistory / eduplay_student_exam_subs_${currentUserId})
        const examSub: ExamSubmissionItem = {
          id: 'sub-' + Date.now(),
          type: 'exam',
          submissionType: 'exam',
          examId: exam.id || 'ex-auto',
          studentId: currentUserId,
          title: exam.title,
          subject: exam.subject || 'Môn học',
          rank: rankTier,
          score: scoreVal,
          submittedTime: nowTimeStr,
          exam,
          answers
        };
        const updatedSubmissions = [examSub, ...examHistory.filter(s => s.examId !== examSub.examId)];
        setExamHistory(updatedSubmissions);
        try {
          localStorage.setItem(`eduplay_student_exam_subs_${currentUserId}`, JSON.stringify(updatedSubmissions));
          window.dispatchEvent(new Event('eduplay_student_submissions_updated'));
        } catch (err) {
          console.error('Error saving exam submission on timeout:', err);
        }

        // Thưởng đề kiểm tra
        awardExamReward(currentUserId, exam.id || 'ex-auto', exam.title, scoreNumber);
      }
    }

    setActiveExamSession(null);

    setAlertModal({
      title: '⏰ Hết giờ làm bài',
      message: 'Đã hết thời gian làm bài. Hệ thống đã tự động nộp bài của em với các câu đã trả lời tính đến thời điểm này.',
      type: 'timeout',
      examToView: exam,
      answersToView: answers,
      scoreToView: scoreVal,
      timeToView: nowTimeStr
    });
  };

  // Helper matching student class & grade
  const isTargetingStudent = (targetClass?: string, targetGrade?: string, currentCls?: string, currentGrd?: string): boolean => {
    if (!targetClass || targetClass.trim() === '' || targetClass === 'all' || targetClass.toLowerCase().includes('tất cả')) {
      if (!targetGrade || !currentGrd) return true;
      return targetGrade.trim().toLowerCase() === currentGrd.trim().toLowerCase();
    }

    const rawTarget = targetClass.trim().toLowerCase().replace(/\s+/g, '');
    const rawCurrent = (currentCls || '').trim().toLowerCase().replace(/\s+/g, '');

    // Direct class match (e.g. "lớp5c" contains "5c" or "lớp5c")
    if (rawTarget === rawCurrent || rawTarget.includes(rawCurrent) || rawCurrent.includes(rawTarget)) {
      return true;
    }

    // Target contains comma-separated classes
    if (targetClass.includes(',')) {
      const classList = targetClass.split(',').map(c => c.trim().toLowerCase().replace(/\s+/g, ''));
      if (classList.some(c => c === rawCurrent || rawCurrent.includes(c) || c.includes(rawCurrent))) {
        return true;
      }
    }

    // Whole grade target (e.g. "toànkhối5", "khối5", "k5")
    if (currentGrd) {
      const rawGrade = currentGrd.trim().toLowerCase().replace(/\s+/g, ''); // "khối5"
      const gradeNum = currentGrd.replace(/\D/g, ''); // "5"
      if (rawTarget.includes(rawGrade) || rawTarget === `khối${gradeNum}` || rawTarget === `k${gradeNum}` || rawTarget === `toànkhối${gradeNum}` || rawTarget === gradeNum) {
        return true;
      }
    }

    if (targetGrade && currentGrd && targetGrade.trim().toLowerCase() === currentGrd.trim().toLowerCase()) {
      if (rawTarget.includes('khối') || rawTarget.includes('k')) {
        return true;
      }
    }

    return false;
  };

  // Determine current student class & grade
  const { studentClass, studentGrade } = useMemo(() => {
    let cls = '';
    try {
      const sessionStr = localStorage.getItem('eduplay_student_session');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed?.className) cls = parsed.className.trim();
      }
    } catch {}
    if (!cls) {
      cls = (localStorage.getItem('eduplay_current_class') || localStorage.getItem('eduplay_active_class') || 'Lớp 3A').trim();
    }
    const gradeMatch = cls.match(/\b([1-5])\b|lớp\s*([1-5])|khối\s*([1-5])/i);
    const grNum = gradeMatch ? (gradeMatch[1] || gradeMatch[2] || gradeMatch[3]) : '';
    return {
      studentClass: cls,
      studentGrade: grNum ? `Khối ${grNum}` : ''
    };
  }, []);

  // Lọc riêng biệt chỉ các bài làm thuộc loại đề kiểm tra (type === 'exam')
  const filteredExamHistory = useMemo(() => {
    return (examHistory || []).filter(sub => {
      if (sub.type !== 'exam') return false;
      return true;
    });
  }, [examHistory]);

  // Diagnostic Audit Log for storage & real-time exams
  useEffect(() => {
    console.groupCollapsed(`🔍 [EXAM AUDIT] Đề kiểm tra & Bài nộp của học sinh ${currentUserName} (${currentUserId})`);
    console.log(`Lớp: ${studentClass} | Khối: ${studentGrade}`);
    console.log(`Tổng số đề kiểm tra nhận được: ${exams.length}`);
    console.log(`Lịch sử bài kiểm tra nộp (${filteredExamHistory.length} bài):`, filteredExamHistory);
    exams.forEach((ex, idx) => {
      const isSub = filteredExamHistory.some(sub => (sub.examId && sub.examId === ex.id) || (sub.exam?.id && sub.exam.id === ex.id));
      console.log(`[#${idx + 1}] ID: ${ex.id} | Title: "${ex.title}" | Target: "${ex.targetClass}" | Grade: "${ex.grade}" | IsSubmitted: ${isSub}`);
    });
    console.groupEnd();
  }, [exams, filteredExamHistory, currentUserName, currentUserId, studentClass, studentGrade]);

  // Helper parsing date strings like "HH:mm - DD/MM/YYYY", "YYYY-MM-DDTHH:mm", "DD/MM/YYYY"
  const parseExamDateTime = (dtStr?: string): Date | null => {
    if (!dtStr) return null;
    try {
      if (dtStr.includes('T')) {
        const d = new Date(dtStr);
        if (!isNaN(d.getTime())) return d;
      }
      const match = dtStr.match(/(\d{1,2}):(\d{1,2})\s*[-–]?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [_, hh, mm, dd, MM, yyyy] = match;
        return new Date(Number(yyyy), Number(MM) - 1, Number(dd), Number(hh), Number(mm));
      }
      const dateMatch = dtStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        const [_, dd, MM, yyyy] = dateMatch;
        return new Date(Number(yyyy), Number(MM) - 1, Number(dd), 23, 59, 59);
      }
    } catch {}
    return null;
  };

  // Robust, unified status calculation function (no index-based hardcoding)
  const getExamStatus = (
    exam: ExamPaper,
    isSubmitted: boolean,
    now: Date
  ): 'open' | 'upcoming' | 'closed' | 'submitted' => {
    if (isSubmitted) return 'submitted';
    if (exam.status === 'completed') return 'closed';
    if (exam.status === 'draft') return 'upcoming';

    const startDate = parseExamDateTime(exam.startTime);
    const endDate = parseExamDateTime(exam.endTime);

    if (startDate && now.getTime() < startDate.getTime()) {
      return 'upcoming';
    }

    if (endDate && now.getTime() > endDate.getTime()) {
      return 'closed';
    }

    return 'open';
  };

  // Filter exams for student with class matching & strict deduplication
  const todoExams = useMemo(() => {
    const now = new Date();

    // 1. Filter by subject and class matching
    const filtered = (exams || []).filter(ex => {
      if (!ex || !ex.id) return false;
      if (selectedSubject !== 'Tất cả' && ex.subject !== selectedSubject) return false;

      if (!isTargetingStudent(ex.targetClass, ex.grade, studentClass, studentGrade)) {
        return false;
      }

      return true;
    });

    // 2. Strict deduplication by ID and semantic signature (title + subject + grade + targetClass)
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const deduplicated: ExamPaper[] = [];

    filtered.forEach(ex => {
      if (seenIds.has(ex.id)) return;
      const cleanTitle = (ex.title || '')
        .trim()
        .toLowerCase()
        .replace(/^đề kiểm tra:\s*/i, '')
        .replace(/\s+/g, ' ');
      const clsKey = (ex.targetClass || '').trim().toLowerCase().replace(/\s+/g, '');
      const semanticKey = `${cleanTitle}__${ex.subject || ''}__${ex.grade || ''}__${clsKey}`;

      if (seenKeys.has(semanticKey)) return;

      seenIds.add(ex.id);
      seenKeys.add(semanticKey);
      deduplicated.push(ex);
    });

    // 3. Filter urgent if active
    if (filterUrgent) {
      return deduplicated.filter(ex => {
        const isSub = filteredExamHistory.some(sub => (sub.examId && sub.examId === ex.id) || (sub.exam?.id && sub.exam.id === ex.id));
        const status = getExamStatus(ex, isSub, now);
        if (status !== 'open') return false;
        const endDate = parseExamDateTime(ex.endTime);
        if (endDate) {
          const hoursLeft = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursLeft <= 48 && hoursLeft > 0;
        }
        return true;
      });
    }

    return deduplicated;
  }, [exams, selectedSubject, studentClass, studentGrade, filterUrgent, filteredExamHistory]);

  // Thống kê 4 ô cho Phân hệ Đề kiểm tra
  const examStats = useMemo(() => {
    const totalCount = todoExams.length;
    const completedCount = filteredExamHistory.length;
    const pendingCount = todoExams.filter(
      ex => !filteredExamHistory.some(sub => (sub.examId && sub.examId === ex.id) || (sub.exam?.id && sub.exam.id === ex.id))
    ).length;

    let avgScoreStr = '0 / 10';
    if (filteredExamHistory.length > 0) {
      const sum = filteredExamHistory.reduce((acc, curr) => {
        const s = typeof curr.score === 'number' ? curr.score : parseFloat(String(curr.score)) || 0;
        return acc + s;
      }, 0);
      const avg = sum / filteredExamHistory.length;
      avgScoreStr = `${(Math.round(avg * 10) / 10).toFixed(1)} / 10`;
    }

    return {
      totalCount,
      completedCount,
      pendingCount,
      avgScoreStr,
    };
  }, [todoExams, filteredExamHistory]);

  const handleStartExam = (exam: ExamPaper) => {
    const isAssignment = mode === 'assignment' || 
      (exam.title && (exam.title.toLowerCase().includes('bài tập') || exam.title.toLowerCase().includes('luyện tập') || exam.title.toLowerCase().includes('rèn luyện'))) ||
      exam.examType === 'Luyện tập' ||
      exam.examType === 'Bài tập';
    const canRetake = allowMultipleAttempts !== undefined ? allowMultipleAttempts : isAssignment;

    // Check if already submitted strictly by ID (only apply single-attempt restriction for formal exams)
    if (!canRetake) {
      const isSubmitted = filteredExamHistory.some(sub => (sub.examId && sub.examId === exam.id) || (sub.exam?.id && sub.exam.id === exam.id));
      if (isSubmitted) {
        setAlertModal({
          title: isAssignment ? '📌 Đã hoàn thành bài tập' : '📌 Đã hoàn thành bài kiểm tra',
          message: isAssignment 
            ? 'Em đã hoàn thành bài tập này rồi.'
            : 'Em đã hoàn thành bài kiểm tra này rồi. Đề kiểm tra chỉ được làm 1 lần duy nhất.',
          type: 'restricted'
        });
        return;
      }
    }

    // Check time constraints
    const startTime = Date.now();
    const duration = exam.durationMinutes || (isAssignment ? 45 : 15);
    const initialAnswers: Record<number, any> = {};

    const preparedQuestions = (exam.questions || []).map((q, idx) => {
      const bankMatch = findLatestQuestionInBank(q, liveBank);
      const mergedQ: QuestionItem = bankMatch
        ? {
            ...q,
            ...bankMatch,
            id: q.id || bankMatch.id,
          }
        : q;

      if (isOrderingQuestion(mergedQ)) {
        const canonicalSteps = getCanonicalOrderingStepsForGrading(mergedQ, liveBank);
        const shuffledForStudent = createShuffledOrderingSteps(canonicalSteps);
        initialAnswers[idx] = shuffledForStudent;
        return {
          ...mergedQ,
          options: canonicalSteps,
          canonicalOptions: canonicalSteps,
          correctOrder: canonicalSteps,
          orderingSteps: canonicalSteps.map((text, sIdx) => ({
            text,
            index: sIdx,
            order: sIdx + 1,
          })),
          correctAnswer: canonicalSteps.join(' -> '),
        };
      }
      return mergedQ;
    });

    setActiveExamSession({
      exam: {
        ...exam,
        questions: preparedQuestions,
      },
      startTime,
      durationMinutes: duration,
      answers: initialAnswers,
      bookmarked: {},
      currentQuestionIndex: 0
    });
    setRemainingSeconds(duration * 60);
  };

  const handleManualSubmitConfirm = () => {
    if (!activeExamSession) return;
    const exam = activeExamSession.exam;
    const answers = activeExamSession.answers;
    const questions = exam.questions || [];
    const isAssignment = mode === 'assignment' || 
      (exam.title && (exam.title.toLowerCase().includes('bài tập') || exam.title.toLowerCase().includes('luyện tập') || exam.title.toLowerCase().includes('rèn luyện'))) ||
      exam.examType === 'Luyện tập' ||
      exam.examType === 'Bài tập';
    
    let unansweredCount = 0;
    const unansweredIndices: number[] = [];
    questions.forEach((q, idx) => {
      const ans = answers[idx];
      const isAns = (() => {
        if (ans === undefined || ans === null) return false;
        if (isMatchingQuestion(q)) {
          const keys = Object.keys(ans);
          return keys.length > 0 && keys.some(k => ans[k] !== '');
        }
        if (isOrderingQuestion(q)) {
          return Array.isArray(ans) && ans.length > 0;
        }
        if (typeof ans === 'string') return ans.trim() !== '';
        return true;
      })();
      if (!isAns) {
        unansweredCount++;
        unansweredIndices.push(idx + 1);
      }
    });

    if (unansweredCount > 0) {
      setAlertModal({
        title: '⚠️ Chưa hoàn thành bài tập!',
        message: `Bạn chưa hoàn thành hết tất cả câu hỏi! Vui lòng làm xong các câu còn thiếu trước khi nộp bài. Các câu chưa làm: ${unansweredIndices.join(', ')}.`,
        type: 'timeout'
      });
      return;
    }

    setAlertModal({
      title: isAssignment ? 'Xác nhận nộp bài tập' : 'Xác nhận nộp bài kiểm tra',
      message: isAssignment ? 'Em có chắc chắn muốn nộp bài tập rèn luyện này không?' : 'Em có chắc chắn muốn nộp bài kiểm tra không?',
      type: 'confirm_submit',
      onConfirm: () => {
        executeSubmitExam();
      }
    });
  };

  const executeSubmitExam = async () => {
    if (!activeExamSession || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const exam = activeExamSession.exam;
      const answers = { ...(activeExamSession.answers || {}) };
      
      const questions = exam.questions || [];
      let correct = 0;
      const questionResults: ('pass' | 'fail' | 'none')[] = [];

      questions.forEach((q, idx) => {
        try {
          const studentChoice = answers[idx];
          if (studentChoice === undefined || studentChoice === null || studentChoice === '') {
            questionResults.push('none');
            return;
          }
          if (isTrueFalseQuestion(q) && q.statements && q.statements.length > 0) {
            const studentStmts = (typeof studentChoice === 'object' && studentChoice !== null) ? studentChoice : {};
            let qCorrectCount = 0;
            q.statements.forEach((st, sIdx) => {
              if (studentStmts[sIdx] === st.isCorrect) {
                qCorrectCount++;
              }
            });
            correct += (q.statements.length > 0 ? (qCorrectCount / q.statements.length) : 0);
            questionResults.push(qCorrectCount === q.statements.length ? 'pass' : 'fail');
          } else {
            const isOk = checkQuestionCorrectLocal(q, studentChoice);
            if (isOk) {
              correct++;
            }
            questionResults.push(isOk ? 'pass' : 'fail');
          }
        } catch (err) {
          console.error(`Error scoring question ${idx}:`, err);
          questionResults.push('fail');
        }
      });
      const totalQ = Math.max(1, questions.length);
      const scoreNumber = Math.min(10, Math.max(0, (correct / totalQ) * 10));
      const scoreVal = scoreNumber.toFixed(1) + ' / 10';
      const scorePercentage = Math.round((scoreNumber / 10) * 100);
      const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const rankTier = scoreNumber >= 9.0 
        ? 'Xuất Sắc 🏆' 
        : scoreNumber >= 7.0 
          ? 'Tốt 🥈' 
          : scoreNumber >= 5.0 
            ? 'Đã Hoàn Thành 👍' 
            : 'Cần Ôn Lại 📚';

      const isAssignment = mode === 'assignment' || 
        (exam.title && (exam.title.toLowerCase().includes('bài tập') || exam.title.toLowerCase().includes('luyện tập') || exam.title.toLowerCase().includes('rèn luyện'))) ||
        exam.examType === 'Luyện tập' ||
        exam.examType === 'Bài tập';

      if (!isPreviewMode) {
        if (isAssignment) {
          const sessionInfo = getEffectiveStudentClassAndGrade();
          const canonicalHomeworkId = String(exam.id || '').trim();
          const canonicalCode = extractCanonicalStudentCode(currentUserId || sessionInfo.studentId);
          const resolvedStudentName = currentUserName || sessionInfo.studentName || 'Học sinh';
          const resolvedClass = studentClass || sessionInfo.studentClass || (exam as any).targetClass || '';
          const timeSpentSec = Math.max(1, Math.round((Date.now() - (activeExamSession.startTime || Date.now())) / 1000));

          const hwSub = {
            id: `sub_${canonicalHomeworkId}_${canonicalCode || currentUserId}`,
            homeworkId: canonicalHomeworkId,
            assignmentId: canonicalHomeworkId,
            type: 'assignment' as const,
            submissionType: 'assignment' as const,
            studentId: canonicalCode || currentUserId,
            studentCode: canonicalCode || currentUserId,
            studentRecordId: sessionInfo.studentId || currentUserId,
            studentName: resolvedStudentName,
            className: resolvedClass,
            title: exam.title,
            subject: exam.subject || 'Môn học',
            rank: rankTier,
            score: scoreVal,
            submittedTime: 'Hôm nay, ' + nowTimeStr,
            questionResults,
            assignment: {
              id: canonicalHomeworkId,
              homeworkId: canonicalHomeworkId,
              title: exam.title,
              subject: exam.subject,
              grade: exam.grade,
              targetClass: (exam as any).targetClass || resolvedClass,
              questions: exam.questions
            },
            answers
          };
          try {
            const savedHw = localStorage.getItem(`eduplay_student_submissions_${currentUserId}`);
            const parsedHw = savedHw ? JSON.parse(savedHw) : [];
            const updatedHw = [
              hwSub, 
              ...(Array.isArray(parsedHw) ? parsedHw.filter((s: any) => s.id !== hwSub.id && s.assignment?.id !== canonicalHomeworkId && s.homeworkId !== canonicalHomeworkId) : [])
            ];
            localStorage.setItem(`eduplay_student_submissions_${currentUserId}`, JSON.stringify(updatedHw));
            window.dispatchEvent(new Event('eduplay_student_submissions_updated'));
          } catch (err) {
            console.error('Error saving assignment store:', err);
          }

          if (canonicalHomeworkId) {
            try {
              await saveHomeworkSubmissionToFirestore({
                homeworkId: canonicalHomeworkId,
                assignmentTitle: exam.title,
                subject: exam.subject,
                grade: exam.grade,
                targetClass: (exam as any).targetClass || resolvedClass,
                studentId: canonicalCode || currentUserId,
                studentCode: canonicalCode || currentUserId,
                studentRecordId: sessionInfo.studentId || currentUserId,
                studentName: resolvedStudentName,
                className: resolvedClass,
                score: scoreNumber,
                scoreText: scoreVal,
                answers,
                questionResults,
                correctCount: Math.round(correct),
                totalQuestions: questions.length,
                submittedAt: 'Hôm nay, ' + nowTimeStr,
                timeSpentSeconds: timeSpentSec
              });
            } catch (err) {
              console.warn('Error saving homework submission to Firestore:', err);
            }
          }

          // Thưởng bài tập
          let correctCount = 0;
          questions.forEach((q, idx) => {
            if (checkQuestionCorrectLocal(q, answers[idx])) correctCount++;
          });
          awardAssignmentReward(currentUserId, exam.id || 'as-submit', exam.title, correctCount, questions.length || 1);

          if (onSubmitted) {
            try {
              onSubmitted(hwSub);
            } catch (err) {
              console.error('Error invoking onSubmitted callback:', err);
            }
          }
        } else {
          // Lưu riêng biệt chỉ vào kho Đề kiểm tra (eduplay_student_exam_subs_${currentUserId})
          const examSub: ExamSubmissionItem = {
            id: 'sub-' + Date.now(),
            type: 'exam',
            submissionType: 'exam',
            examId: exam.id || 'ex-manual',
            studentId: currentUserId,
            title: exam.title,
            subject: exam.subject || 'Môn học',
            rank: rankTier,
            score: scoreVal,
            submittedTime: 'Hôm nay, ' + nowTimeStr,
            exam,
            answers
          };
          const updatedSubmissions = [examSub, ...examHistory.filter(s => s.examId !== examSub.examId)];
          setExamHistory(updatedSubmissions);
          try {
            localStorage.setItem(`eduplay_student_exam_subs_${currentUserId}`, JSON.stringify(updatedSubmissions));
            window.dispatchEvent(new Event('eduplay_student_submissions_updated'));
          } catch (err) {
            console.error('Error saving exam submission:', err);
          }

          // Thưởng đề kiểm tra
          try {
            awardExamReward(currentUserId, exam.id || 'ex-manual', exam.title, scoreNumber);
          } catch (err) {
            console.error('Error awarding exam reward:', err);
          }

          if (onSubmitted) {
            try {
              onSubmitted(examSub);
            } catch (err) {
              console.error('Error invoking onSubmitted callback:', err);
            }
          }
        }
      }

      setActiveExamSession(null);

      setDetailSubmission({
        exam,
        score: scoreVal,
        time: 'Hôm nay, ' + nowTimeStr,
        answers,
        title: exam.title,
        subject: exam.subject || 'Môn học',
        rank: rankTier
      });
    } catch (err) {
      console.error('Fatal error during executeSubmitExam:', err);
      setAlertModal({
        title: '❌ Có lỗi khi nộp bài',
        message: 'Đã xảy ra lỗi trong quá trình nộp bài. Vui lòng thử lại.',
        type: 'timeout'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRemainingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const mm = m < 10 ? '0' + m : m;
    const ss = s < 10 ? '0' + s : s;
    return `${mm}:${ss}`;
  };

  // If student is actively taking an exam, render the Exam Taking Workspace overlay
  if (activeExamSession) {
    const exam = activeExamSession.exam;
    const questions = exam.questions || [];
    const currentIdx = activeExamSession.currentQuestionIndex;
    const currentQ = questions[currentIdx] || {
      id: 'q1', content: 'Câu hỏi mẫu', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A'
    };

    // Calculate answered count accurately based on question types
    const answeredCount = questions.filter((qItem, qIdx) => {
      const ans = activeExamSession.answers[qIdx];
      if (ans === undefined || ans === null) return false;
      if (isMatchingQuestion(qItem)) {
        const keys = Object.keys(ans);
        return keys.length > 0 && keys.some(k => ans[k] !== '');
      }
      if (typeof ans === 'string') return ans.trim() !== '';
      return true;
    }).length;
    const totalQ = questions.length || 1;
    const progressPercent = Math.round((answeredCount / totalQ) * 100);

    const isAssignment = mode === 'assignment' || 
      (exam.title && (exam.title.toLowerCase().includes('bài tập') || exam.title.toLowerCase().includes('luyện tập') || exam.title.toLowerCase().includes('rèn luyện'))) ||
      exam.examType === 'Luyện tập' ||
      exam.examType === 'Bài tập';

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Top Sticky Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              📝
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate max-w-md">
                {exam.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Đã làm: <b className="text-indigo-600">{answeredCount}/{totalQ}</b></span>
                <span>•</span>
                <span>Hoàn thành: <b className="text-emerald-600">{progressPercent}%</b></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Chỉ hiển thị đồng hồ đếm ngược và giờ thực tế đối với Đề kiểm tra (exam), ẩn hoàn toàn khi làm bài tập (assignment) */}
            {!isAssignment && (
              <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-3 text-xs font-extrabold text-slate-700 shadow-inner">
                <span>🕒 GIỜ THỰC TẾ: <span className="text-indigo-600 font-mono">{currentTimeStr}</span></span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1.5 text-red-600 font-mono">
                  <Clock className="w-4 h-4 animate-pulse" />
                  CÒN LẠI: {formatRemainingTime(remainingSeconds)}
                </span>
              </div>
            )}

            <button
              onClick={() => {
                setAlertModal({
                  title: isAssignment ? 'Tạm dừng làm bài tập' : 'Xác nhận thoát bài kiểm tra',
                  message: isAssignment
                    ? 'Em có chắc chắn muốn quay lại danh sách bài tập không? Bài làm sẽ không được lưu nếu chưa nộp.'
                    : 'Em có chắc chắn muốn thoát? Quá trình làm bài sẽ không được lưu nếu chưa nộp.',
                  type: 'confirm_exit',
                  onConfirm: () => {
                    setActiveExamSession(null);
                    if (onCloseExam) {
                      onCloseExam();
                    }
                  }
                });
              }}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer font-bold relative z-20"
              title="Đóng / Thoát"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-1.5 shrink-0">
          <div 
            className="bg-indigo-600 h-1.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Main Content Area: Left Question Navigator, Right Question List */}
        <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-6 w-full mx-auto">
          
          {/* Left Question Navigator */}
          <div className="w-64 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 hidden lg:flex flex-col shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Danh sách câu hỏi</span>
              <span className="text-[11px] font-bold text-indigo-600">{totalQ} câu</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Group Trắc nghiệm */}
              {questions.some(q => !isEssayQuestion(q)) && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">TRẮC NGHIỆM</span>
                  <div className="grid grid-cols-4 gap-2">
                    {questions.map((q, idx) => {
                      if (isEssayQuestion(q)) return null;
                      const isAnswered = (() => {
                        const ans = activeExamSession.answers[idx];
                        if (ans === undefined || ans === null) return false;
                        if (isMatchingQuestion(q)) {
                          const keys = Object.keys(ans);
                          return keys.length > 0 && keys.some(k => ans[k] !== '');
                        }
                        if (isClassificationQuestion(q)) {
                          const keys = Object.keys(ans);
                          return keys.length > 0 && keys.some(k => ans[k] !== '');
                        }
                        if (isTrueFalseQuestion(q) && q.statements && q.statements.length > 0) {
                          const keys = Object.keys(ans);
                          return keys.length > 0 && keys.some(k => ans[k] !== undefined && ans[k] !== null);
                        }
                        if (typeof ans === 'string') return ans.trim() !== '';
                        return true;
                      })();
                      const isCurrent = currentIdx === idx;
                      const isBookmarked = activeExamSession.bookmarked[idx];

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveExamSession(prev => prev ? { ...prev, currentQuestionIndex: idx } : null);
                            document.getElementById(`question-card-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className={`h-10 w-10 rounded-xl text-xs font-extrabold transition-all relative flex items-center justify-center cursor-pointer border ${
                            isCurrent
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-300'
                              : isAnswered
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{idx + 1}</span>
                          {isBookmarked && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full text-[8px] flex items-center justify-center font-black shadow-xs">
                              ★
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group Tự luận */}
              {questions.some(q => isEssayQuestion(q)) && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">TỰ LUẬN</span>
                  <div className="grid grid-cols-4 gap-2">
                    {questions.map((q, idx) => {
                      if (!isEssayQuestion(q)) return null;
                      const isAnswered = (() => {
                        const ans = activeExamSession.answers[idx];
                        if (ans === undefined || ans === null) return false;
                        if (typeof ans === 'string') return ans.trim() !== '';
                        return true;
                      })();
                      const isCurrent = currentIdx === idx;
                      const isBookmarked = activeExamSession.bookmarked[idx];

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveExamSession(prev => prev ? { ...prev, currentQuestionIndex: idx } : null);
                            document.getElementById(`question-card-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className={`h-10 w-10 rounded-xl text-xs font-extrabold transition-all relative flex items-center justify-center cursor-pointer border ${
                            isCurrent
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-300'
                              : isAnswered
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{idx + 1}</span>
                          {isBookmarked && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full text-[8px] flex items-center justify-center font-black shadow-xs">
                              ★
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 space-y-2 text-[11px] font-bold text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-lg bg-emerald-100 border border-emerald-300 inline-block"></span> Đã làm</span>
                <span>{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-lg bg-slate-100 border border-slate-300 inline-block"></span> Chưa làm</span>
                <span>{totalQ - answeredCount}</span>
              </div>
            </div>
          </div>

          {/* Right Question List - Container of stacked cards */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-xs">
            
            {/* Scrollable list of questions */}
            <div className="flex-1 overflow-y-auto space-y-6 p-6 bg-slate-50/50">
              {questions.map((q, idx) => {
                const isAnswered = (() => {
                  const ans = activeExamSession.answers[idx];
                  if (ans === undefined || ans === null) return false;
                  if (isMatchingQuestion(q)) {
                    const keys = Object.keys(ans);
                    return keys.length > 0 && keys.some(k => ans[k] !== '');
                  }
                  if (isClassificationQuestion(q)) {
                    const keys = Object.keys(ans);
                    return keys.length > 0 && keys.some(k => ans[k] !== '');
                  }
                  if (isTrueFalseQuestion(q) && q.statements && q.statements.length > 0) {
                    const keys = Object.keys(ans);
                    return keys.length > 0 && keys.some(k => ans[k] !== undefined && ans[k] !== null);
                  }
                  if (typeof ans === 'string') return ans.trim() !== '';
                  return true;
                })();
                const isCurrent = currentIdx === idx;
                const isBookmarked = activeExamSession.bookmarked[idx];

                return (
                  <div 
                    key={idx}
                    id={`question-card-${idx}`}
                    onClick={() => {
                      setActiveExamSession(prev => prev ? { ...prev, currentQuestionIndex: idx } : null);
                    }}
                    className={`bg-white rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden cursor-pointer ${
                      isCurrent 
                        ? 'border-indigo-500 shadow-lg shadow-indigo-100 ring-2 ring-indigo-100' 
                        : 'border-slate-200 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    
                    {/* Question Header Info */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider">
                          Câu {idx + 1} / {totalQ}
                        </span>
                        <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide">
                          {isEssayQuestion(q) ? 'Tự luận' : 
                           isMatchingQuestion(q) ? 'Ghép nối' : 
                           isMultipleResponseQuestion(q) ? 'Chọn nhiều đáp án đúng' :
                           isTrueFalseQuestion(q) ? 'Câu hỏi Đúng/Sai' :
                           isFillBlankQuestion(q) ? 'Điền khuyết / Ngắn' :
                           isOrderingQuestion(q) ? 'Sắp xếp thứ tự' :
                           isClassificationQuestion(q) ? 'Phân loại' :
                           'Trắc nghiệm đơn'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Bookmark Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveExamSession(prev => {
                              if (!prev) return null;
                              const bookmarked = { ...prev.bookmarked };
                              bookmarked[idx] = !bookmarked[idx];
                              return { ...prev, bookmarked };
                            });
                          }}
                          className={`px-3 py-1 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1 border cursor-pointer ${
                            isBookmarked
                              ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Bookmark className="w-3 h-3" />
                          <span>{isBookmarked ? 'Đã đánh dấu' : 'Đánh dấu câu khó'}</span>
                        </button>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                          <span className={`w-1.5 h-1.5 rounded-full ${isAnswered ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          <span className={isAnswered ? 'text-emerald-700' : 'text-slate-500'}>
                            {isAnswered ? 'Đã làm' : 'Chưa làm'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Question Content & Options */}
                    <div className="p-5 sm:p-7 space-y-5">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-relaxed">
                        {q.content}
                      </h3>

                      <div className="space-y-2.5 pt-1">
                        {isMatchingQuestion(q) ? (
                          <div className="space-y-4">
                            <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl text-indigo-950 text-xs sm:text-sm font-semibold flex items-center gap-2">
                              <span>🔗</span>
                              <span>Hãy chọn ghép nối tương ứng cho mỗi khái niệm dưới đây:</span>
                            </div>
                            <div className="space-y-3">
                              {(q.matchingPairs || []).map((pair, pIdx) => {
                                const currentAnswers = activeExamSession.answers[idx] || {};
                                const selectedRightVal = currentAnswers[pIdx] || '';
                                return (
                                  <div key={pIdx} className="p-4 bg-white border-2 border-slate-100 hover:border-slate-200 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-all">
                                    <div className="flex-1 flex items-start gap-3">
                                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                                        {pIdx + 1}
                                      </div>
                                      <span className="text-xs sm:text-sm font-bold text-slate-800">{pair.left}</span>
                                    </div>
                                    <div className="text-slate-300 hidden md:block">➔</div>
                                    <div className="flex-1">
                                      <select
                                        value={selectedRightVal}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setActiveExamSession(prev => {
                                            if (!prev) return null;
                                            const answers = { ...prev.answers };
                                            const currentAns = answers[idx] && typeof answers[idx] === 'object' ? answers[idx] : {};
                                            const updatedMatching = { ...currentAns, [pIdx]: val };
                                            answers[idx] = updatedMatching;
                                            return { ...prev, answers, currentQuestionIndex: idx };
                                          });
                                        }}
                                        className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none transition-all cursor-pointer"
                                      >
                                        <option value="" className="font-bold text-slate-400">-- Chọn đáp án ghép nối --</option>
                                        {(q.matchingPairs || []).map((p, optIdx) => (
                                          <option key={optIdx} value={p.right} className="font-semibold text-slate-700">
                                            {p.right}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : isMultipleResponseQuestion(q) && q.options && q.options.length > 0 ? (
                          <div className="space-y-3">
                            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-indigo-950 text-xs font-semibold flex items-center gap-2">
                              <span>☑️</span>
                              <span>Chọn tất cả các đáp án đúng (Có thể chọn nhiều):</span>
                            </div>
                            {q.options.map((opt: string, optIdx: number) => {
                              const optionLetter = String.fromCharCode(65 + optIdx);
                              const currentArr: number[] = Array.isArray(activeExamSession.answers[idx])
                                ? activeExamSession.answers[idx]
                                : (typeof activeExamSession.answers[idx] === 'number' ? [activeExamSession.answers[idx]] : []);
                              const isSelected = currentArr.includes(optIdx);

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveExamSession(prev => {
                                      if (!prev) return null;
                                      const answers = { ...prev.answers };
                                      const prevArr: number[] = Array.isArray(answers[idx])
                                        ? answers[idx]
                                        : (typeof answers[idx] === 'number' ? [answers[idx]] : []);
                                      
                                      let newArr: number[];
                                      if (prevArr.includes(optIdx)) {
                                        newArr = prevArr.filter((i: number) => i !== optIdx);
                                      } else {
                                        newArr = [...prevArr, optIdx].sort((a, b) => a - b);
                                      }
                                      answers[idx] = newArr;
                                      return { ...prev, answers, currentQuestionIndex: idx };
                                    });
                                  }}
                                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3.5 cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-50/80 border-indigo-600 text-indigo-900 shadow-sm'
                                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50/50'
                                  }`}
                                >
                                  <div className={`w-7.5 h-7.5 rounded-md border flex items-center justify-center font-black text-[11px] shrink-0 transition-all ${
                                    isSelected
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    {isSelected ? <Check className="w-4 h-4" /> : optionLetter}
                                  </div>
                                  <span className="text-xs sm:text-sm font-semibold flex-1">{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : isOrderingQuestion(q) ? (
                          <div className="space-y-3 pt-1">
                            <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl text-indigo-950 text-xs sm:text-sm font-semibold flex items-center gap-2">
                              <span>↕️</span>
                              <span>Hãy sắp xếp các thao tác / bước dưới đây theo đúng thứ tự (dùng nút ▲ / ▼):</span>
                            </div>
                            {(() => {
                              const currentAnswers = activeExamSession.answers[idx];
                              const currentOrder: string[] = Array.isArray(currentAnswers)
                                ? currentAnswers
                                : (q.options || []);

                              return (
                                <div className="space-y-2.5">
                                  {currentOrder.map((item, oIdx) => (
                                    <div key={oIdx} className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                                      <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                                          {oIdx + 1}
                                        </span>
                                        <span className="text-xs sm:text-sm font-semibold text-slate-800">{item}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          disabled={oIdx === 0}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newOrder = [...currentOrder];
                                            const temp = newOrder[oIdx];
                                            newOrder[oIdx] = newOrder[oIdx - 1];
                                            newOrder[oIdx - 1] = temp;
                                            setActiveExamSession(prev => {
                                              if (!prev) return null;
                                              const answers = { ...prev.answers, [idx]: newOrder };
                                              return { ...prev, answers, currentQuestionIndex: idx };
                                            });
                                          }}
                                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer font-extrabold text-xs flex items-center justify-center transition-all"
                                          title="Chuyển lên"
                                        >
                                          ▲
                                        </button>
                                        <button
                                          type="button"
                                          disabled={oIdx === currentOrder.length - 1}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newOrder = [...currentOrder];
                                            const temp = newOrder[oIdx];
                                            newOrder[oIdx] = newOrder[oIdx + 1];
                                            newOrder[oIdx + 1] = temp;
                                            setActiveExamSession(prev => {
                                              if (!prev) return null;
                                              const answers = { ...prev.answers, [idx]: newOrder };
                                              return { ...prev, answers, currentQuestionIndex: idx };
                                            });
                                          }}
                                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer font-extrabold text-xs flex items-center justify-center transition-all"
                                          title="Chuyển xuống"
                                        >
                                          ▼
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        ) : q.options && q.options.length > 0 ? (
                          q.options.map((opt: string, optIdx: number) => {
                            const optionLetter = String.fromCharCode(65 + optIdx);
                            const isSelected = activeExamSession.answers[idx] === optIdx;

                            return (
                              <button
                                key={optIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveExamSession(prev => {
                                    if (!prev) return null;
                                    const answers = { ...prev.answers };
                                    answers[idx] = optIdx;
                                    return { ...prev, answers, currentQuestionIndex: idx };
                                  });
                                }}
                                className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-50/80 border-indigo-600 text-indigo-900 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50/50'
                                }`}
                              >
                                <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {optionLetter}
                                </div>
                                <span className="text-xs sm:text-sm font-semibold flex-1">{opt}</span>
                                {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                              </button>
                            );
                          })
                        ) : isClassificationQuestion(q) ? (
                          <div className="space-y-4">
                            <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl text-indigo-950 text-xs sm:text-sm font-semibold flex items-center gap-2">
                              <span>📂</span>
                              <span>Hãy xếp các vật phẩm dưới đây vào đúng nhóm thích hợp:</span>
                            </div>

                            {/* 2 Khung nhóm hiển thị side-by-side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(q.classificationGroups || ['Nhóm 1', 'Nhóm 2']).map((groupName, gIdx) => {
                                const bgClass = gIdx === 0 ? 'bg-[#FFFBEB]/40 border-[#FCD34D]' : 'bg-[#EFF6FF]/40 border-[#93C5FD]';
                                const badgeClass = gIdx === 0 ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]' : 'bg-[#DBEAFE] border-[#BFDBFE] text-[#1E40AF]';
                                const emoji = gIdx === 0 ? '🌿' : '⚙️';
                                
                                const currentAnswers = activeExamSession.answers[idx] || {};
                                const placedItems = (q.classificationItems || []).filter((_, iIdx) => currentAnswers[iIdx] === groupName);

                                return (
                                  <div key={gIdx} className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center min-h-[140px] transition-all ${bgClass}`}>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider mb-3 ${badgeClass}`}>
                                      <span>{emoji} {groupName.toUpperCase()}</span>
                                    </span>
                                    {placedItems.length > 0 ? (
                                      <div className="w-full space-y-2">
                                        {placedItems.map((item, piIdx) => {
                                          const realIdx = (q.classificationItems || []).findIndex(x => x.name === item.name);
                                          return (
                                            <div key={piIdx} className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs flex items-center justify-between">
                                              <span>{item.name}</span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveExamSession(prev => {
                                                    if (!prev) return null;
                                                    const answers = { ...prev.answers };
                                                    const currentAns = answers[idx] && typeof answers[idx] === 'object' ? answers[idx] : {};
                                                    const updatedAns = { ...currentAns };
                                                    delete updatedAns[realIdx];
                                                    answers[idx] = updatedAns;
                                                    return { ...prev, answers, currentQuestionIndex: idx };
                                                  });
                                                }}
                                                className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer text-[10px]"
                                              >
                                                ✕ Gỡ
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-slate-400 text-xs italic font-medium my-auto">
                                        Bấm phân nhóm vật phẩm bên dưới...
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Danh sách vật phẩm chờ xếp nhóm */}
                            <div className="space-y-2.5">
                              <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
                                Vật phẩm chờ xếp nhóm:
                              </div>
                              <div className="space-y-2">
                                {(q.classificationItems || []).map((item, iIdx) => {
                                  const currentAnswers = activeExamSession.answers[idx] || {};
                                  const assignedGroup = currentAnswers[iIdx];
                                  if (assignedGroup) return null;

                                  return (
                                    <div key={iIdx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-150">
                                      <span className="font-semibold text-slate-800">{item.name}</span>
                                      <div className="flex items-center gap-2">
                                        {(q.classificationGroups || ['Nhóm 1', 'Nhóm 2']).map((groupName, gIdx) => {
                                          const emoji = gIdx === 0 ? '🌿' : '⚙️';
                                          const btnClass = gIdx === 0 
                                            ? 'bg-amber-50 hover:bg-[#FEF3C7] border-amber-200 text-[#92400E]' 
                                            : 'bg-blue-50 hover:bg-[#DBEAFE] border-blue-200 text-[#1E40AF]';
                                          
                                          return (
                                            <button
                                              key={gIdx}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveExamSession(prev => {
                                                  if (!prev) return null;
                                                  const answers = { ...prev.answers };
                                                  const currentAns = answers[idx] && typeof answers[idx] === 'object' ? answers[idx] : {};
                                                  const updatedAns = { ...currentAns, [iIdx]: groupName };
                                                  answers[idx] = updatedAns;
                                                  return { ...prev, answers, currentQuestionIndex: idx };
                                                });
                                              }}
                                              className={`px-3 py-1.5 rounded-lg border text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 font-bold cursor-pointer hover:scale-102 active:scale-98 ${btnClass}`}
                                            >
                                              <span>{emoji} + {groupName.split(' ')[0] || groupName}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Khi đã xếp hết tất cả vật phẩm */}
                                {(q.classificationItems || []).every((_, iIdx) => {
                                  const currentAnswers = activeExamSession.answers[idx] || {};
                                  return currentAnswers[iIdx] !== undefined;
                                }) && (
                                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-xs font-bold text-emerald-800">
                                    ✨ Đã xếp nhóm xong tất cả vật phẩm! Em có thể nhấn "Gỡ" trên các ô nhóm ở trên nếu muốn phân loại lại.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : isTrueFalseQuestion(q) ? (
                          q.statements && q.statements.length > 0 ? (
                            <div className="space-y-4">
                              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-emerald-950 text-xs sm:text-sm font-semibold flex items-center gap-2">
                                <span>🌿</span>
                                <span>Đọc kỹ các nhận định dưới đây và chọn Đúng hoặc Sai độc lập cho mỗi ý:</span>
                              </div>
                              <div className="space-y-3">
                                {q.statements.map((st, sIdx) => {
                                  const currentAnswers = activeExamSession.answers[idx] || {};
                                  const ansState = currentAnswers[sIdx]; // true, false, or undefined

                                  return (
                                    <div key={sIdx} className="p-4 bg-white border border-slate-150 hover:border-slate-250 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-all">
                                      <div className="flex-1 flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                                          {sIdx + 1}
                                        </div>
                                        <span className="text-xs sm:text-sm font-bold text-slate-800">{st.statement}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveExamSession(prev => {
                                              if (!prev) return null;
                                              const answers = { ...prev.answers };
                                              const currentAns = answers[idx] && typeof answers[idx] === 'object' ? answers[idx] : {};
                                              const updatedAns = { ...currentAns, [sIdx]: true };
                                              answers[idx] = updatedAns;
                                              return { ...prev, answers, currentQuestionIndex: idx };
                                            });
                                          }}
                                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                                            ansState === true
                                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-600/25'
                                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          ✓ Đúng
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveExamSession(prev => {
                                              if (!prev) return null;
                                              const answers = { ...prev.answers };
                                              const currentAns = answers[idx] && typeof answers[idx] === 'object' ? answers[idx] : {};
                                              const updatedAns = { ...currentAns, [sIdx]: false };
                                              answers[idx] = updatedAns;
                                              return { ...prev, answers, currentQuestionIndex: idx };
                                            });
                                          }}
                                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                                            ansState === false
                                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs shadow-rose-600/25'
                                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          ✗ Sai
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveExamSession(prev => {
                                    if (!prev) return null;
                                    const answers = { ...prev.answers };
                                    answers[idx] = 0; // 0 for Đúng
                                    return { ...prev, answers, currentQuestionIndex: idx };
                                  });
                                }}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 cursor-pointer ${
                                  activeExamSession.answers[idx] === 0
                                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50/50'
                                }`}
                              >
                                <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${
                                  activeExamSession.answers[idx] === 0
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  A
                                </div>
                                <span className="text-xs sm:text-sm font-bold flex-1">Đúng</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveExamSession(prev => {
                                    if (!prev) return null;
                                    const answers = { ...prev.answers };
                                    answers[idx] = 1; // 1 for Sai
                                    return { ...prev, answers, currentQuestionIndex: idx };
                                  });
                                }}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 cursor-pointer ${
                                  activeExamSession.answers[idx] === 1
                                    ? 'bg-rose-50 border-rose-600 text-rose-900 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50/50'
                                }`}
                              >
                                <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${
                                  activeExamSession.answers[idx] === 1
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  B
                                </div>
                                <span className="text-xs sm:text-sm font-bold flex-1">Sai</span>
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="space-y-3">
                            <textarea
                              value={activeExamSession.answers[idx] !== undefined ? activeExamSession.answers[idx] : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setActiveExamSession(prev => {
                                  if (!prev) return null;
                                  const answers = { ...prev.answers };
                                  answers[idx] = val as any;
                                  return { ...prev, answers, currentQuestionIndex: idx };
                                });
                              }}
                              placeholder="Nhập câu trả lời tự luận của em tại đây..."
                              className="w-full h-32 border-2 border-slate-200 rounded-2xl p-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 resize-none"
                            ></textarea>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Bottom Nav & Submit Bar */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0 rounded-b-3xl">
              <button
                id="btn-submit-exam-or-assignment"
                onClick={handleManualSubmitConfirm}
                disabled={(() => {
                  if (!activeExamSession) return true;
                  const answers = activeExamSession.answers;
                  const questions = activeExamSession.exam.questions || [];
                  return questions.some((q, idx) => {
                    const ans = answers[idx];
                    if (ans === undefined || ans === null) return true;
                    if (isMatchingQuestion(q)) {
                      const keys = Object.keys(ans);
                      return keys.length === 0 || !keys.some(k => ans[k] !== '');
                    }
                    if (isOrderingQuestion(q)) {
                      return !Array.isArray(ans) || ans.length === 0;
                    }
                    if (typeof ans === 'string') return ans.trim() === '';
                    return false;
                  });
                })()}
                className="py-3 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-98 relative z-20 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>
                  {mode === 'assignment' || 
                   (activeExamSession.exam.title && (activeExamSession.exam.title.toLowerCase().includes('bài tập') || activeExamSession.exam.title.toLowerCase().includes('luyện tập') || activeExamSession.exam.title.toLowerCase().includes('rèn luyện'))) ||
                   activeExamSession.exam.examType === 'Luyện tập' ||
                   activeExamSession.exam.examType === 'Bài tập'
                    ? 'Nộp bài tập' 
                    : 'Nộp bài kiểm tra'}
                </span>
              </button>
            </div>

          </div>

        </div>

        {/* RENDER ALERT/POPUP MODAL HERE TOO, SO IT WORKS PERFECTLY DURING EXAM */}
        {alertModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-slate-200 text-slate-800">
              <div className={`p-5 flex items-center gap-3 ${
                alertModal.type === 'timeout' ? 'bg-red-600 text-white' :
                alertModal.type === 'submitted_success' ? 'bg-emerald-600 text-white' :
                alertModal.type === 'confirm_submit' ? 'bg-indigo-600 text-white' :
                'bg-amber-600 text-white'
              }`}>
                <AlertTriangle className="w-6 h-6 text-yellow-300 shrink-0" />
                <h3 className="text-base font-extrabold uppercase tracking-wide">{alertModal.title}</h3>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  {alertModal.message}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                {alertModal.type === 'confirm_submit' || alertModal.type === 'confirm_exit' ? (
                  <>
                    <button
                      onClick={() => setAlertModal(null)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Tiếp tục làm bài
                    </button>
                    <button
                      onClick={() => {
                        const cb = alertModal.onConfirm;
                        setAlertModal(null);
                        if (cb) cb();
                      }}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer"
                    >
                      {alertModal.type === 'confirm_exit' ? 'Xác nhận thoát' : 'Xác nhận nộp bài'}
                    </button>
                  </>
                ) : alertModal.type === 'timeout' || alertModal.type === 'submitted_success' ? (
                  <button
                    onClick={() => {
                      const exam = alertModal.examToView;
                      const answers = alertModal.answersToView || {};
                      const score = alertModal.scoreToView || '10 / 10';
                      const time = alertModal.timeToView || 'Hôm nay';
                      setAlertModal(null);
                      if (exam) {
                        setDetailSubmission({
                          exam,
                          score,
                          time,
                          answers,
                          title: exam.title,
                          subject: exam.subject || 'Môn học',
                          rank: 'Hoàn thành 🎯'
                        });
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> Xem kết quả chi tiết
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const isRestricted = alertModal.type === 'restricted';
                      setAlertModal(null);
                      if (isRestricted && (mode === 'assignment' || initialActiveExam) && onCloseExam) {
                        onCloseExam();
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer"
                  >
                    Đã hiểu và quay lại
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submitting Loading Overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-indigo-100 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
              <h3 className="text-lg font-black text-slate-900">Đang nộp bài và chấm điểm...</h3>
              <p className="text-xs text-slate-600 font-medium">Hệ thống đang đồng bộ kết quả lên máy chủ và lưu lịch sử bài nộp của em. Vui lòng không đóng trình duyệt.</p>
            </div>
          </div>
        )}

      </div>
    );
  }

  // In assignment mode, when not actively taking an assignment or viewing results/alerts, do not render Exam list
  if (mode === 'assignment' && !activeExamSession && !detailSubmission && !alertModal) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-700 rounded-[28px] p-7 sm:p-9 text-white shadow-2xl relative overflow-hidden border border-sky-400/40 min-h-[170px] flex items-center">
        {/* Background Ambient Glows & Sparkles Decor */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-200 via-sky-400 to-transparent pointer-events-none" />
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-cyan-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-56 h-56 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
        
        {/* Subtle background star sparkles */}
        <div className="absolute top-4 right-1/4 text-cyan-200/30 text-lg pointer-events-none select-none">✦</div>
        <div className="absolute bottom-4 left-1/4 text-sky-200/30 text-base pointer-events-none select-none">✧</div>
        <div className="absolute top-1/2 right-1/3 text-amber-300/25 text-sm pointer-events-none select-none">★</div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full">
          {/* Left Content Area */}
          <div className="space-y-3 max-w-2xl">
            {/* Top Badges Row: Distinct separated tags */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/35 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                <span className="text-amber-300">🎯</span> PHÒNG KHẢO THÍ CHÍNH THỨC
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/30 backdrop-blur-md border border-sky-300/30 text-sky-100 text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Học sinh: <strong className="text-white font-extrabold">{currentUserName}</strong></span>
              </span>
            </div>

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white drop-shadow-sm flex items-center gap-3">
                <span>Đề Kiểm Tra Của Tôi</span>
                <span className="text-xl sm:text-2xl animate-bounce">🎖️</span>
              </h1>
              <p className="text-sky-100 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
                Em hãy tập trung làm bài thi, tự tin đạt điểm cao để nhận thật nhiều Xu thưởng và EXP nhé!
              </p>
            </div>
          </div>

          {/* Right Mascot / Exam 3D Stage (Takes ~1/4 width) */}
          <div className="hidden sm:flex items-center justify-center relative shrink-0">
            <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-3xl bg-gradient-to-tr from-white/10 via-white/25 to-cyan-300/30 backdrop-blur-md border border-white/40 shadow-2xl flex items-center justify-center relative transform hover:scale-105 transition-transform duration-300 group">
              <div className="relative flex flex-col items-center justify-center">
                <FileCheck2 className="w-12 h-12 lg:w-14 lg:h-14 text-cyan-200 drop-shadow-[0_6px_16px_rgba(56,189,248,0.6)] animate-pulse" />
                
                {/* Floating Micro Badges */}
                <span className="absolute -top-3.5 -right-3.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 font-black text-[9px] shadow-md border border-amber-100 tracking-wider">
                  {todoExams.length} ĐỀ THI 🔥
                </span>
                
                <span className="absolute -bottom-3 px-2 py-0.5 rounded-full bg-blue-900/90 text-amber-300 font-black text-[9px] shadow-md border border-blue-400/50 backdrop-blur-xs whitespace-nowrap">
                  Tối Đa 50 Xu 💎
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('todo')}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'todo'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Đề Kiểm Tra Cần Làm</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'todo' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
            }`}>
              {todoExams.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Nhật Ký & Lịch Sử Bài Làm</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {filteredExamHistory.length}
            </span>
          </button>
        </div>

        {/* FILTERS BAR (ONLY ON TODO TAB) */}
        {activeTab === 'todo' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setFilterUrgent(!filterUrgent)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                filterUrgent
                  ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>🔥 Sắp đến hạn</span>
            </button>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              <option value="Tất cả">Tất cả môn học</option>
              <option value="Toán">Toán</option>
              <option value="Tiếng Việt">Tiếng Việt</option>
              <option value="Công nghệ">Công nghệ</option>
              <option value="Tin học">Tin học</option>
              <option value="Khoa học">Khoa học</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: ĐỀ KIỂM TRA CẦN LÀM */}
      {activeTab === 'todo' && (
        <div className="space-y-4">
          {todoExams.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Không có đề kiểm tra nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hiện tại không có đề kiểm tra nào phù hợp với bộ lọc của em. Hãy kiểm tra lại sau nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {todoExams.map((ex, idx) => {
                const isAlreadySubmitted = filteredExamHistory.some(sub => (sub.examId && sub.examId === ex.id) || (sub.exam?.id && sub.exam.id === ex.id));
                const stateType = getExamStatus(ex, isAlreadySubmitted, new Date());
                const subjColor = getSubjectColorStyles(ex.subject);

                return (
                  <div
                    key={ex.id || idx}
                    className={`bg-white rounded-3xl p-6 border border-slate-200 ${subjColor.cardBorderHover} shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-all pointer-events-none"></div>

                    <div className="space-y-3 relative z-10">
                      {/* Tags */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase ${subjColor.badgeClass}`}>
                            {ex.subject || subjColor.name}
                          </span>
                          <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                            {ex.grade || 'Khối 3'}
                          </span>
                          <span className="bg-purple-50 text-purple-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-purple-100">
                            {ex.examType || 'Thường xuyên'}
                          </span>
                        </div>

                        {/* Status badge */}
                        {stateType === 'open' && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Đang mở
                          </span>
                        )}
                        {stateType === 'submitted' && (
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Đã nộp bài
                          </span>
                        )}
                        {stateType === 'upcoming' && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Sắp mở
                          </span>
                        )}
                        {stateType === 'closed' && (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Đã đóng
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                        {ex.title}
                      </h3>

                      {/* Time & Duration Info items */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-slate-600">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>⏱ <b>{ex.durationMinutes || 15} phút</b></span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">📅 Mở: <b>{ex.startTime || '08:00 - 02/09/2026'}</b></span>
                        </div>
                        <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 flex items-center gap-2 text-red-700">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="truncate">Hạn: <b>{ex.endTime || '23:59 - 05/09/2026'}</b></span>
                        </div>
                      </div>

                      <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between px-1">
                        <span>Số câu hỏi: <strong className="text-slate-800">{ex.questions?.length || 10} câu</strong></span>
                        <span className="text-purple-600 font-semibold">Hình thức: Trắc nghiệm Online ⚡</span>
                      </div>
                    </div>

                    {/* Action Button depending on cases */}
                    <div className="pt-3 relative z-10">
                      {stateType === 'open' && (
                        <button
                          onClick={() => handleStartExam(ex)}
                          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-extrabold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          <Zap className="w-4 h-4 text-amber-300" />
                          <span>Bắt đầu làm bài</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      {stateType === 'submitted' && (
                        <button
                          disabled
                          className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 text-slate-500 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Đã nộp bài</span>
                        </button>
                      )}

                      {stateType === 'upcoming' && (
                        <button
                          onClick={() => {
                            setAlertModal({
                              title: '🔒 Đề kiểm tra chưa mở',
                              message: `Đề kiểm tra sẽ mở lúc ${ex.startTime || '08:00 - 02/09/2026'}. Em vui lòng quay lại đúng giờ nhé!`,
                              type: 'restricted'
                            });
                          }}
                          className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer border border-slate-200 transition-all"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Chưa mở (Xem thông báo)</span>
                        </button>
                      )}

                      {stateType === 'closed' && (
                        <button
                          onClick={() => {
                            setAlertModal({
                              title: '⛔ Đã hết hạn làm bài',
                              message: `Đề kiểm tra đã hết hạn làm bài vào lúc ${ex.endTime || '23:59 - 05/09/2026'}. Em vui lòng liên hệ giáo viên nếu cần hỗ trợ.`,
                              type: 'restricted'
                            });
                          }}
                          className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer border border-slate-200 transition-all"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Đã đóng (Xem thông báo)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NHẬT KÝ & LỊCH SỬ BÀI LÀM */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredExamHistory.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-2xl">
                📋
              </div>
              <h3 className="text-base font-bold text-slate-800">Chưa có lịch sử làm bài kiểm tra</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Em chưa hoàn thành bài kiểm tra nào. Khi các đề kiểm tra được mở và hoàn thành, kết quả sẽ hiển thị ở đây!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-4 px-6">STT</th>
                    <th className="py-4 px-6">Tên đề kiểm tra</th>
                    <th className="py-4 px-6">Môn học</th>
                    <th className="py-4 px-6 text-center">Xếp thứ</th>
                    <th className="py-4 px-6 text-center">Điểm số</th>
                    <th className="py-4 px-6">Thời gian nộp</th>
                    <th className="py-4 px-6 text-center">Xem chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {filteredExamHistory.map((sub, index) => {
                    const subjColor = getSubjectColorStyles(sub.subject);
                    return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-500">#{index + 1}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">{sub.title}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${subjColor.badgeClass}`}>
                          {sub.subject}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="bg-amber-100 text-amber-900 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                          {sub.rank}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full text-xs">
                          {sub.score}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500">{sub.submittedTime}</td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setDetailSubmission({
                            exam: sub.exam,
                            score: sub.score,
                            time: sub.submittedTime,
                            answers: sub.answers,
                            title: sub.title,
                            subject: sub.subject,
                            rank: sub.rank
                          })}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ALERT / POPUP MODAL (TIMEOUT, SUBMITTED SUCCESS, RESTRICTED, CONFIRM) */}
      {alertModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-slate-200">
            <div className={`p-5 flex items-center gap-3 ${
              alertModal.type === 'timeout' ? 'bg-red-600 text-white' :
              alertModal.type === 'submitted_success' ? 'bg-emerald-600 text-white' :
              alertModal.type === 'confirm_submit' ? 'bg-indigo-600 text-white' :
              'bg-amber-600 text-white'
            }`}>
              <AlertTriangle className="w-6 h-6 text-yellow-300 shrink-0" />
              <h3 className="text-base font-extrabold uppercase tracking-wide">{alertModal.title}</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-slate-700 leading-relaxed">
                {alertModal.message}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              {alertModal.type === 'confirm_submit' || alertModal.type === 'confirm_exit' ? (
                <>
                  <button
                    onClick={() => setAlertModal(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Tiếp tục làm bài
                  </button>
                  <button
                    onClick={() => {
                      const cb = alertModal.onConfirm;
                      setAlertModal(null);
                      if (cb) cb();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer"
                  >
                    {alertModal.type === 'confirm_exit' ? 'Xác nhận thoát' : 'Xác nhận nộp bài'}
                  </button>
                </>
              ) : alertModal.type === 'timeout' || alertModal.type === 'submitted_success' ? (
                <button
                  onClick={() => {
                    const exam = alertModal.examToView;
                    const answers = alertModal.answersToView || {};
                    const score = alertModal.scoreToView || '10 / 10';
                    const time = alertModal.timeToView || 'Hôm nay';
                    setAlertModal(null);
                    if (exam) {
                      setDetailSubmission({
                        exam,
                        score,
                        time,
                        answers,
                        title: exam.title,
                        subject: exam.subject || 'Môn học',
                        rank: 'Hoàn thành 🎯'
                      });
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Xem kết quả chi tiết
                </button>
              ) : (
                <button
                  onClick={() => {
                    const isRestricted = alertModal.type === 'restricted';
                    setAlertModal(null);
                    if (isRestricted && (mode === 'assignment' || initialActiveExam) && onCloseExam) {
                      onCloseExam();
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer"
                >
                  Đã hiểu và quay lại
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL SUBMISSION MODAL */}
      {detailSubmission && (() => {
        const questionsList = detailSubmission.exam.questions || [];
        const totalQ = Math.max(1, questionsList.length);
        
        let correctCount = 0;
        questionsList.forEach((q: QuestionItem, idx: number) => {
          try {
            const studentChoice = detailSubmission.answers[idx];
            if (isTrueFalseQuestion(q) && q.statements && q.statements.length > 0) {
              const studentStmts = (typeof studentChoice === 'object' && studentChoice !== null) ? studentChoice : {};
              let qCorrectCount = 0;
              q.statements.forEach((st, sIdx) => {
                if (studentStmts[sIdx] === st.isCorrect) {
                  qCorrectCount++;
                }
              });
              correctCount += (q.statements.length > 0 ? (qCorrectCount / q.statements.length) : 0);
            } else {
              if (checkQuestionCorrectLocal(q, studentChoice)) {
                correctCount++;
              }
            }
          } catch (err) {
            console.error(`Error checking question ${idx} in detail modal:`, err);
          }
        });

        const scoreParts = detailSubmission.score.split('/');
        const numericScore = parseFloat(scoreParts[0]) || ((correctCount / totalQ) * 10);
        const maxScore = parseFloat(scoreParts[1]) || 10;
        const ratio = numericScore / maxScore;
        const isHighRatio = ratio >= 0.8;

        const correctQuestionNums: number[] = [];
        const incorrectQuestionIndices: number[] = [];
        questionsList.forEach((q: QuestionItem, idx: number) => {
          const studentChoice = detailSubmission.answers[idx];
          const isCorrect = checkQuestionCorrectLocal(q, studentChoice);
          if (isCorrect) {
            correctQuestionNums.push(idx + 1);
          } else {
            incorrectQuestionIndices.push(idx);
          }
        });

        const mcqScore = (correctCount * (10 / totalQ)).toFixed(1).replace('.0', '');

        const getIncorrectFeedback = (q: QuestionItem, studentChoice?: any) => {
          if (isMatchingQuestion(q)) {
            const pairs = q.matchingPairs || [];
            const studentPairs = (typeof studentChoice === 'object' && studentChoice !== null) ? studentChoice : {};
            const wrongIndices: number[] = [];
            pairs.forEach((pair, pIdx) => {
              const studentSelected = studentPairs[pIdx] !== undefined ? studentPairs[pIdx] : studentPairs[pair.left];
              const correctRightStr = String(pair.right || '').trim().toLowerCase();
              let matchOk = false;
              if (studentSelected !== undefined && studentSelected !== null && studentSelected !== '') {
                if (String(studentSelected).trim().toLowerCase() === correctRightStr) {
                  matchOk = true;
                } else if (typeof studentSelected === 'number') {
                  if (studentSelected === pIdx || (pairs[studentSelected] && String(pairs[studentSelected].right || '').trim().toLowerCase() === correctRightStr)) {
                    matchOk = true;
                  }
                } else {
                  const rightPrefixMatch = correctRightStr.match(/^([a-z0-9])[\.\:\)\-]/i);
                  if (rightPrefixMatch && String(studentSelected).trim().toLowerCase() === rightPrefixMatch[1].toLowerCase()) {
                    matchOk = true;
                  }
                }
              }
              if (!matchOk) wrongIndices.push(pIdx + 1);
            });
            if (wrongIndices.length > 0 && wrongIndices.length < pairs.length) {
              return `Chưa chính xác. Em chưa nối đúng ở cặp: ${wrongIndices.map(i => `(${i})`).join(', ')}. Hãy quan sát kỹ bảng đáp án chuẩn để sửa lại nhé!`;
            }
            return 'Chưa chính xác. Em chưa nối đúng tất cả các cặp theo bảng đáp án chuẩn.';
          }
          if (isOrderingQuestion(q)) {
            return 'Chưa chính xác. Thứ tự các bước sắp xếp chưa đúng với đáp án chuẩn.';
          }
          if (isClassificationQuestion(q)) {
            return 'Chưa chính xác. Một số vật phẩm chưa được xếp vào đúng nhóm phân loại.';
          }
          if (isTrueFalseQuestion(q)) {
            if (q.statements && q.statements.length > 0) {
              return 'Chưa chính xác. Em chưa nhận định đúng tất cả các câu phát biểu.';
            }
            return 'Chưa chính xác. Đáp án nhận định chưa đúng.';
          }
          if (isMultipleResponseQuestion(q)) {
            return 'Chưa chính xác. Em chưa chọn đúng và đủ tất cả các đáp án chính xác.';
          }
          if (isEssayQuestion(q)) {
            return 'Chưa hoàn thành hoặc chưa đạt yêu cầu nội dung trình bày.';
          }
          if (q.correctAnswer && q.options && q.correctAnswer.length === 1) {
            const code = q.correctAnswer.charCodeAt(0);
            if (code >= 65 && code <= 90) {
              const optIdx = code - 65;
              if (q.options[optIdx]) {
                return `Chưa chính xác. Đáp án chuẩn xác là ${q.correctAnswer} (${q.options[optIdx]}).`;
              }
            }
          }
          return `Chưa chính xác. Đáp án chuẩn xác là ${q.correctAnswer || 'theo hệ thống'}.`;
        };

        const getCorrectAnswerFull = (q: QuestionItem) => {
          if (isMatchingQuestion(q)) {
            const pairs = q.matchingPairs || [];
            return pairs.map((pair, pIdx) => {
              return `(${pIdx + 1}) ${pair.left} ➔ ${pair.right}`;
            }).join('\n');
          }

          if (isOrderingQuestion(q)) {
            const correctOrder = getCanonicalOrderingStepsForGrading(q, liveBank);
            // Hiển thị đúng thứ tự chuẩn từ 1 đến N mà không bị lặp tiền tố số cũ
            return correctOrder.map((opt, oIdx) => {
                const cleanOpt = String(opt).replace(/^\d+\.\s*/, '');
                return `${oIdx + 1}. ${cleanOpt}`;
            }).join('\n');
          }

          if (isClassificationQuestion(q)) {
            const groups = q.classificationGroups || [];
            const items = q.classificationItems || [];
            if (groups.length === 0 || items.length === 0) return q.correctAnswer || 'Chưa xác định';
            return groups.map(grp => {
              const matchedItems = items.filter(item => item.group === grp).map(item => item.name);
              return `${grp}: ${matchedItems.length > 0 ? matchedItems.join(', ') : '(Không có)'}`;
            }).join('\n');
          }

          if (isTrueFalseQuestion(q)) {
            if (q.statements && q.statements.length > 0) {
              return q.statements.map((st, sIdx) => `${sIdx + 1}. ${st.statement}: ${st.isCorrect ? 'Đúng' : 'Sai'}`).join('\n');
            }
            return q.correctAnswer === 'A' || q.correctAnswer?.toLowerCase().includes('đúng') ? 'Đúng' : 'Sai';
          }

          if (!q.correctAnswer) return 'Chưa xác định';
          if (q.options && q.correctAnswer.length === 1) {
            const code = q.correctAnswer.charCodeAt(0);
            if (code >= 65 && code <= 90) {
              const optIdx = code - 65;
              if (q.options[optIdx]) {
                return `${q.correctAnswer}. ${q.options[optIdx]}`;
              }
            }
          }
          return q.correctAnswer;
        };

        const getStudentAnswerFull = (q: QuestionItem, idx: number) => {
          const studentChoice = detailSubmission.answers[idx];
          if (studentChoice === undefined) return 'Em chưa làm câu này';
          
          if (isMatchingQuestion(q)) {
            const studentPairs = (typeof studentChoice === 'object' && studentChoice !== null) ? studentChoice : {};
            const pairs = q.matchingPairs || [];
            if (Object.keys(studentPairs).length === 0) return 'Em chưa ghép cặp nào';
            return pairs.map((pair, pIdx) => {
              const matchedVal = studentPairs[pIdx] !== undefined ? studentPairs[pIdx] : studentPairs[pair.left];
              let displayVal = matchedVal;
              if (typeof matchedVal === 'number' && pairs[matchedVal]) {
                displayVal = pairs[matchedVal].right;
              }
              return `(${pIdx + 1}) ${pair.left} ➔ ${displayVal || '(Chưa nối)'}`;
            }).join('\n');
          }

          if (isOrderingQuestion(q)) {
            const studentOrder = studentChoice;
            if (!Array.isArray(studentOrder) || studentOrder.length === 0) return 'Em chưa sắp xếp thứ tự';
            // Bỏ tiền tố số cũ (nếu có) trước khi hiển thị lại
            return studentOrder.map((opt, oIdx) => {
                const cleanOpt = String(opt).replace(/^\d+\.\s*/, '');
                return `${oIdx + 1}. ${cleanOpt}`;
            }).join('\n');
          }

          if (isClassificationQuestion(q)) {
            const studentAnswers = studentChoice || {};
            const groups = q.classificationGroups || [];
            const items = q.classificationItems || [];
            if (Object.keys(studentAnswers).length === 0) return 'Em chưa phân loại mục nào';
            return groups.map(grp => {
              const placedItemNames = items
                .map((item, iIdx) => ({ item, iIdx }))
                .filter(({ iIdx }) => studentAnswers[iIdx] === grp)
                .map(({ item }) => item.name);
              return `${grp}: ${placedItemNames.length > 0 ? placedItemNames.join(', ') : '(Chưa xếp mục nào)'}`;
            }).join('\n');
          }

          if (isTrueFalseQuestion(q)) {
            if (q.statements && q.statements.length > 0) {
              const studentStmts = studentChoice || {};
              return q.statements.map((st, sIdx) => {
                const ans = studentStmts[sIdx];
                return `${sIdx + 1}. ${st.statement}: ${ans === true ? 'Đúng' : ans === false ? 'Sai' : '(Chưa chọn)'}`;
              }).join('\n');
            }
            const sChoice = studentChoice as number;
            if (sChoice === 0 || studentChoice === 'A' || studentChoice === true || String(studentChoice).toLowerCase().includes('đúng')) return 'Đúng';
            if (sChoice === 1 || studentChoice === 'B' || studentChoice === false || String(studentChoice).toLowerCase().includes('sai')) return 'Sai';
            return 'Chưa chọn';
          }

          if (isMultipleResponseQuestion(q) || Array.isArray(studentChoice)) {
            const studentIndices = Array.isArray(studentChoice) ? studentChoice : (typeof studentChoice === 'number' ? [studentChoice] : []);
            if (studentIndices.length === 0) return 'Em chưa chọn đáp án nào';
            return studentIndices.map(i => {
              const l = String.fromCharCode(65 + i);
              return q.options && q.options[i] ? `${l}. ${q.options[i]}` : l;
            }).join(', ');
          }

          if (isEssayQuestion(q)) {
            return String(studentChoice);
          }

          if (typeof studentChoice !== 'number') {
            return String(studentChoice);
          }

          const studentLetter = String.fromCharCode(65 + studentChoice);
          if (q.options && q.options[studentChoice] !== undefined) {
            return `${studentLetter}. ${q.options[studentChoice]}`;
          }
          return studentLetter;
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header modal */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  {(() => {
                    const isAssignmentResult = mode === 'assignment' || 
                      (detailSubmission.title && (detailSubmission.title.toLowerCase().includes('bài tập') || detailSubmission.title.toLowerCase().includes('luyện tập') || detailSubmission.title.toLowerCase().includes('rèn luyện'))) ||
                      detailSubmission.exam?.examType === 'Luyện tập' ||
                      detailSubmission.exam?.examType === 'Bài tập';
                    return (
                      <span className={`${isAssignmentResult ? 'bg-teal-600' : 'bg-indigo-600'} text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm`}>
                        {isAssignmentResult ? '📝 KẾT QUẢ BÀI TẬP RÈN LUYỆN' : '⚡ KẾT QUẢ KIỂM TRA CHÍNH THỨC'}
                      </span>
                    );
                  })()}
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {detailSubmission.title}
                  </h2>
                </div>
                <button
                  id="btn-close-result-modal-x"
                  onClick={() => {
                    hasAutoStartedExamIdRef.current = null;
                    setDetailSubmission(null);
                    setActiveExamSession(null);
                    if (onCloseExam) onCloseExam();
                  }}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer border border-slate-200 font-bold hover:scale-105 active:scale-95"
                  title="Đóng và quay lại"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                
                {/* Score Banner matching image_18.png purple/indigo design */}
                <div className="bg-[#4C1D95] rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 relative overflow-hidden">
                  <div className="space-y-2 z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">ĐIỂM SỐ ĐẠT ĐƯỢC</span>
                    <div className="text-4xl sm:text-5xl font-black tracking-tight flex items-center gap-3">
                      <span>{detailSubmission.score}</span>
                      <span className="text-2xl sm:text-3xl">
                        {numericScore >= 9.0 ? '🏆' : numericScore >= 7.0 ? '🥈' : numericScore >= 5.0 ? '👍' : '📚'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Đã chấm xong hoàn thành
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-xs ${
                        numericScore >= 9.0 
                          ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-amber-500/20' 
                          : numericScore >= 7.0 
                            ? 'bg-cyan-400 text-cyan-950 border-cyan-300' 
                            : numericScore >= 5.0 
                              ? 'bg-emerald-400 text-emerald-950 border-emerald-300' 
                              : 'bg-rose-400 text-rose-950 border-rose-300'
                      }`}>
                        <span>{detailSubmission.rank || (numericScore >= 9.0 ? 'Xuất Sắc 🏆' : numericScore >= 7.0 ? 'Tốt 🥈' : numericScore >= 5.0 ? 'Đã Hoàn Thành 👍' : 'Cần Ôn Lại 📚')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score Allocation boxes on the right */}
                  <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/15 space-y-3 md:w-64 z-10 flex items-center justify-between gap-4">
                    <div className="flex-1 text-center">
                      <span className="block text-[10px] font-black text-indigo-200 uppercase tracking-wider">TRẮC NGHIỆM</span>
                      <strong className="block text-2xl sm:text-3xl font-black text-white mt-1">{mcqScore}</strong>
                    </div>
                    <div className="w-px h-8 bg-white/20"></div>
                    <div className="flex-1 text-center">
                      <span className="block text-[10px] font-black text-indigo-200 uppercase tracking-wider">TỰ LUẬN</span>
                      <strong className="block text-2xl sm:text-3xl font-black text-white mt-1">0</strong>
                    </div>
                  </div>

                  {/* Decorative faint background element */}
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                </div>

                {/* Nhận xét chung Box style matching image_18.png exactly */}
                <div className="bg-[#F0FDFA] border border-teal-200 rounded-2xl p-5 space-y-2">
                  <h4 className="text-xs sm:text-sm font-extrabold text-teal-950 flex items-center gap-2 uppercase tracking-wider">
                    <span>💬</span> Nhận xét chung:
                  </h4>
                  <div className="text-xs sm:text-sm text-teal-900 leading-relaxed font-semibold space-y-2">
                    <p className="flex items-start gap-2">
                      <span>👏</span>
                      <span>Khen ngợi em đã hoàn thành đúng {correctCount}/{totalQ} câu. {correctQuestionNums.length > 0 && <>Em làm rất tốt các câu: <strong className="text-teal-950 font-black">Câu {correctQuestionNums.join(', ')}</strong>.</>}</span>
                    </p>
                    {incorrectQuestionIndices.length > 0 && (
                      <p className="flex items-start gap-2 text-amber-800 font-semibold border-t border-teal-200/50 pt-2">
                        <span>⚠️</span>
                        <span>Em cần lưu ý xem lại bài và ôn tập kỹ hơn ở các câu chưa chính xác: <strong className="text-amber-950 font-black">Câu {incorrectQuestionIndices.map(i => i + 1).join(', ')}</strong>.</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Detailed Questions Breakdown */}
                <div className="space-y-4 pt-2 border-t border-slate-200/60">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <span>📋</span> CHI TIẾT TỪNG CÂU HỎI
                  </h3>
                  
                  <div className="space-y-5">
                    {questionsList.map((q: QuestionItem, idx: number) => {
                      const studentChoice = detailSubmission.answers[idx];
                      const isCorrect = checkQuestionCorrectLocal(q, studentChoice);

                      return (
                        <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 transition-all hover:shadow-md">
                          
                          {/* Question header card with Points */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="px-3 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                              Câu {idx + 1}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 border ${
                              isCorrect 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}>
                              {isCorrect ? '✓ Đúng' : '✗ Chưa đúng'}
                              <span className="mx-1 text-slate-300">•</span>
                              Điểm: {isCorrect ? (10 / totalQ).toFixed(1).replace('.0', '') : '0'}
                            </span>
                          </div>

                          {/* Question content */}
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-relaxed">
                            {q.content}
                          </h4>

                          {/* Side-by-side or stacked grid layout matching image_18.png and image_19.png */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                            
                            {/* Student's Choice box */}
                            <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[75px] ${
                              isCorrect 
                                ? 'bg-emerald-50/30 border-emerald-100' 
                                : 'bg-red-50/30 border-red-100'
                            }`}>
                              <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block mb-1">BÀI LÀM CỦA EM:</span>
                              <span className={`font-extrabold block text-slate-900 ${isCorrect ? 'text-emerald-800' : 'text-red-700'} whitespace-pre-line`}>
                                {getStudentAnswerFull(q, idx)}
                              </span>
                            </div>

                            {/* Correct Answer box */}
                            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 flex flex-col justify-between min-h-[75px]">
                              <span className="text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider block mb-1">ĐÁP ÁN CHUẨN:</span>
                              <span className="font-extrabold block text-indigo-950 whitespace-pre-line">
                                {getCorrectAnswerFull(q)}
                              </span>
                            </div>

                          </div>

                          {/* Nhận xét / gợi ý giải box at bottom of each question card */}
                          <div className={`p-4 rounded-xl border text-xs sm:text-sm space-y-1 ${
                            isCorrect 
                              ? 'bg-emerald-50/20 border-emerald-100/60 text-emerald-900' 
                              : 'bg-amber-50/30 border-amber-100 text-amber-900'
                          }`}>
                            <span className="font-black flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-slate-500">
                              <span>📝</span> NHẬN XÉT / GỢI Ý GIẢI:
                            </span>
                            <p className="font-semibold leading-relaxed">
                              {isCorrect ? (
                                <span className="text-emerald-800 flex items-center gap-1 font-bold">
                                  <span>✨</span> Đáp án hoàn toàn chính xác!
                                </span>
                              ) : (
                                <span className="text-amber-800 font-bold block">
                                  {getIncorrectFeedback(q, studentChoice)}
                                </span>
                              )}
                              {q.explanation && (
                                <span className="block mt-1.5 text-slate-600 font-medium bg-white/60 p-2.5 rounded-lg border border-slate-100">
                                  {q.explanation}
                                </span>
                              )}
                            </p>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Footer modal matching layout with closing action */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-4 shrink-0">
                <button
                  id="btn-close-result-modal-footer"
                  onClick={() => {
                    hasAutoStartedExamIdRef.current = null;
                    setDetailSubmission(null);
                    setActiveExamSession(null);
                    if (onCloseExam) onCloseExam();
                  }}
                  className="py-3 px-6 rounded-2xl bg-[#4C1D95] hover:bg-[#3B1275] text-white text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md shadow-indigo-950/20 active:scale-98"
                >
                  Đóng và quay lại
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
