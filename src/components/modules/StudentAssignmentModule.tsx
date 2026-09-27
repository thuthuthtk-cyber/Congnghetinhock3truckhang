import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  Award, 
  CheckCircle2, 
  FileText, 
  ChevronRight, 
  Sparkles, 
  Eye, 
  Check, 
  BookMarked
} from 'lucide-react';
import { HomeworkAssignment, QuestionItem, ExamPaper } from '../../types';
import { getSubjectColorStyles } from '../../utils/subjectColors';
import { QuizTakingView } from './QuizTakingView';
import { 
  StudentExamModule, 
  checkQuestionCorrectLocal,
  isMatchingQuestion,
  getCanonicalOrderingStepsForGrading
} from './StudentExamModule';
import { normalizeQuestionType } from '../../lib/constants';
import { awardAssignmentReward } from '../../config/rewardConfig';
import {
  getEffectiveStudentClassAndGrade,
  isTargetingStudent
} from '../../services/studentSessionService';

interface StudentAssignmentModuleProps {
  assignments: HomeworkAssignment[];
  questionsBank?: QuestionItem[];
  onSaveAssignment: (assignment: HomeworkAssignment) => void;
  currentUserId?: string;
  currentUserName?: string;
  isPreviewMode?: boolean;
  onExitPreview?: () => void;
}

export interface AssignmentSubmissionItem {
  id: string;
  type: 'assignment';
  submissionType?: 'assignment';
  studentId?: string;
  title: string;
  subject: string;
  rank: string;
  score: string;
  submittedTime: string;
  assignment: HomeworkAssignment;
  answers: Record<number, any>;
}

const isAssignmentSubmission = (sub: any): boolean => {
  if (!sub) return false;
  if (sub.type === 'exam' || sub.submissionType === 'exam') return false;
  if (sub.type === 'assignment' || sub.submissionType === 'assignment') return true;
  
  // Title inspection: exclude any exam-specific title
  const title = (sub.title || sub.assignment?.title || '').toLowerCase().trim();
  if (
    title.startsWith('đề kiểm tra') || 
    title.includes('kiểm tra 15 phút') || 
    title.includes('kiểm tra 1 tiết') || 
    title.includes('kiểm tra học kì') || 
    title.includes('kiểm tra giữa kì')
  ) {
    return false;
  }
  
  if (sub.exam && !sub.assignment) {
    const examType = sub.exam.examType;
    if (examType && examType !== 'Luyện tập' && examType !== 'Bài tập') return false;
  }
  return true;
};

export const StudentAssignmentModule: React.FC<StudentAssignmentModuleProps> = ({
  assignments = [],
  questionsBank = [],
  currentUserId,
  currentUserName,
  isPreviewMode = false,
  onExitPreview
}) => {
  const {
    studentClass,
    studentGrade,
    studentName,
    studentId
  } = useMemo(() => {
    return getEffectiveStudentClassAndGrade();
  }, []);

  const effectiveUserId = currentUserId || studentId || 'u-4';
  const effectiveUserName = currentUserName || studentName || 'Học sinh';

  const [activeTab, setActiveTab] = useState<'todo' | 'history'>('todo');
  const [solvingAssignment, setSolvingAssignment] = useState<HomeworkAssignment | null>(null);
  const [detailSubmission, setDetailSubmission] = useState<{ assignment: HomeworkAssignment; score: string; time: string; answers: Record<number, any>; title: string; subject: string; rank: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Student assignment history - Tách riêng biệt độc lập cho Bài tập (type === 'assignment')
  const [assignmentHistory, setAssignmentHistory] = useState<Array<AssignmentSubmissionItem>>(() => {
    try {
      const saved = localStorage.getItem(`eduplay_student_submissions_${effectiveUserId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const onlyAssignments: AssignmentSubmissionItem[] = parsed
            .filter(isAssignmentSubmission)
            .map((s: any) => ({
              ...s,
              type: 'assignment' as const,
              submissionType: 'assignment' as const,
              assignment: s.assignment || {
                id: s.id || 'as-legacy',
                title: s.title || 'Bài tập tự luyện',
                subject: s.subject || 'Môn học',
                questions: s.exam?.questions || []
              }
            }));
          return onlyAssignments;
        }
      }
    } catch {}
    return [];
  });

  // Re-sync assignment history when student user changes & auto-clean any legacy polluted exam records
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`eduplay_student_submissions_${effectiveUserId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const onlyAssignments: AssignmentSubmissionItem[] = parsed
            .filter(isAssignmentSubmission)
            .map((s: any) => ({
              ...s,
              type: 'assignment' as const,
              submissionType: 'assignment' as const,
              assignment: s.assignment || {
                id: s.id || 'as-legacy',
                title: s.title || 'Bài tập tự luyện',
                subject: s.subject || 'Môn học',
                questions: s.exam?.questions || []
              }
            }));
          setAssignmentHistory(onlyAssignments);
          if (onlyAssignments.length !== parsed.length) {
            localStorage.setItem(`eduplay_student_submissions_${effectiveUserId}`, JSON.stringify(onlyAssignments));
          }
          return;
        }
      }
      setAssignmentHistory([]);
    } catch {}
  }, [effectiveUserId]);

  // Diagnostic Audit Log for storage & real-time assignments
  useEffect(() => {
    console.group(`🔍 [STUDENT ASSIGNMENTS AUDIT] Danh sách bài tập của học sinh ${effectiveUserName} (${effectiveUserId})`);
    console.log(`Lớp: ${studentClass} | Khối: ${studentGrade}`);
    console.log(`Tổng số bản ghi đầu vào: ${assignments.length}`);
    console.log(`Lịch sử bài tập nộp (${assignmentHistory.length} bài):`, assignmentHistory);
    assignments.forEach((as, idx) => {
      const targeted = isTargetingStudent(as.targetClass, as.grade, studentClass, studentGrade);
      console.log(`[#${idx + 1}] ID: ${as.id} | Title: "${as.title}" | TargetClass: "${as.targetClass}" | Grade: "${as.grade}" | TargetedForMe: ${targeted}`);
    });
    console.groupEnd();
  }, [assignments, assignmentHistory, effectiveUserName, effectiveUserId, studentClass, studentGrade]);

  const handleAddNewSubmission = (newSub: {
    id: string;
    studentId?: string;
    title: string;
    subject: string;
    rank: string;
    score: string;
    submittedTime: string;
    assignment: HomeworkAssignment;
    answers: Record<number, any>;
  }) => {
    const subWithStudent: AssignmentSubmissionItem = { 
      ...newSub, 
      type: 'assignment',
      submissionType: 'assignment',
      studentId: effectiveUserId 
    };
    const updatedList = [
      subWithStudent, 
      ...assignmentHistory.filter(s => (s.assignment?.id && s.assignment.id !== newSub.assignment?.id) || (s.id && s.id !== newSub.id))
    ];
    setAssignmentHistory(updatedList);
    try {
      localStorage.setItem(`eduplay_student_submissions_${effectiveUserId}`, JSON.stringify(updatedList));
      window.dispatchEvent(new Event('eduplay_student_submissions_updated'));
    } catch (err) {
      console.error('Error saving student assignment submission:', err);
    }

    // Calculate correct answers
    const questions = newSub.assignment.questions || [];
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const studentChoice = newSub.answers[idx];
      if (checkQuestionCorrectLocal(q, studentChoice)) {
        correctCount++;
      }
    });
    const totalQuestions = questions.length || 1;

    // Automatic reward calculation (+10 Xu / +5 EXP, bonus +5 Xu if >=80% correct, first-time only)
    awardAssignmentReward(
      effectiveUserId,
      newSub.assignment.id,
      newSub.title,
      correctCount,
      totalQuestions
    );

    showToast(`🎉 Nộp bài thành công! Điểm số của em: ${newSub.score}`);
  };

  // Phân loại dữ liệu độc lập: loại trừ các bài giảng E-Learning, lọc theo lớp học và khử trùng lặp triệt để
  const todoAssignments = useMemo(() => {
    // 1. Loại trừ e-learning và lọc theo lớp học
    const filtered = (assignments || []).filter((as) => {
      if (!as || !as.id) return false;
      const itemType = ((as as any).type || (as as any).category || (as as any).contentType || '').toLowerCase();
      if (itemType === 'elearning' || itemType === 'bai_giang' || itemType === 'lesson_5e' || as.id.startsWith('elearn-')) {
        return false;
      }

      if (!isPreviewMode && !isTargetingStudent(as.targetClass, as.grade, studentClass, studentGrade)) {
        return false;
      }
      return true;
    });

    // 2. Khử trùng lặp theo ID và chữ ký ngữ nghĩa (title + subject + grade + class + dueDate)
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const cleanList: HomeworkAssignment[] = [];

    filtered.forEach(as => {
      if (seenIds.has(as.id)) return;
      const cleanTitle = (as.title || '')
        .trim()
        .toLowerCase()
        .replace(/^bài tập tự luyện:\s*/i, '')
        .replace(/^bài tập:\s*/i, '')
        .replace(/\s+/g, ' ');
      const clsKey = (as.targetClass || '').trim().toLowerCase().replace(/\s+/g, '');
      const semanticKey = `${cleanTitle}__${as.subject || ''}__${as.grade || ''}__${clsKey}__${as.dueDate || ''}`;

      if (seenKeys.has(semanticKey)) return;

      seenIds.add(as.id);
      seenKeys.add(semanticKey);
      cleanList.push(as);
    });

    return cleanList;
  }, [assignments, studentClass, studentGrade, isPreviewMode]);

  const historySubmissions = useMemo(() => {
    return (assignmentHistory || []).filter((sub) => {
      if (sub.type !== 'assignment') return false;
      const as = sub.assignment;
      if (!as) return true;
      const itemType = ((as as any).type || (as as any).category || (as as any).contentType || '').toLowerCase();
      if (itemType === 'elearning' || itemType === 'bai_giang' || itemType === 'lesson_5e' || (as.id && as.id.startsWith('elearn-'))) {
        return false;
      }
      return true;
    });
  }, [assignmentHistory]);

  // Thống kê 4 ô cho Phân hệ Nhiệm vụ học tập
  const assignmentStats = useMemo(() => {
    const totalCount = todoAssignments.length;
    const completedCount = historySubmissions.length;
    const pendingCount = todoAssignments.filter(
      as => !historySubmissions.some(sub => (sub.assignment?.id && sub.assignment.id === as.id) || (sub.id && sub.id === as.id))
    ).length;

    let avgScoreStr = '0 / 10';
    if (historySubmissions.length > 0) {
      const sum = historySubmissions.reduce((acc, curr) => {
        const s = typeof curr.score === 'number' ? curr.score : parseFloat(String(curr.score)) || 0;
        return acc + s;
      }, 0);
      const avg = sum / historySubmissions.length;
      avgScoreStr = `${(Math.round(avg * 10) / 10).toFixed(1)} / 10`;
    }

    return {
      totalCount,
      completedCount,
      pendingCount,
      avgScoreStr,
    };
  }, [todoAssignments, historySubmissions]);

  // Nếu đang làm bài, render component StudentExamModule chuyên biệt để hỗ trợ đầy đủ các dạng câu hỏi (phân loại, ghép nối...)
  if (solvingAssignment) {
    const examFromAssignment: ExamPaper = {
      id: solvingAssignment.id,
      title: solvingAssignment.title,
      subject: solvingAssignment.subject || 'Toán',
      grade: solvingAssignment.grade || 'Khối 3',
      durationMinutes: 45,
      matrix: { nhanBiet: 0, thongHieu: 0, vanDung: 0, vanDungCao: 0 },
      questions: solvingAssignment.questions || [],
      createdBy: solvingAssignment.teacherName || 'Giáo viên',
      createdAt: solvingAssignment.createdAt || new Date().toISOString()
    };

    return (
      <div className="relative">
        {isPreviewMode && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-1.5 text-center text-[11px] font-black uppercase tracking-wider shadow-md">
            ⚡ Đang làm thử bài tập: {solvingAssignment.title} (Kết quả không lưu)
          </div>
        )}
        <StudentExamModule
          exams={[examFromAssignment]}
          questionsBank={questionsBank}
          currentUserId={effectiveUserId}
          currentUserName={effectiveUserName}
          initialActiveExam={examFromAssignment}
          mode="assignment"
          allowMultipleAttempts={true}
          onCloseExam={() => {
            setSolvingAssignment(null);
            setActiveTab('history');
          }}
          onSubmitted={(newSub) => {
            handleAddNewSubmission({
              id: newSub.id,
              studentId: effectiveUserId,
              title: newSub.title,
              subject: newSub.subject,
              rank: newSub.rank,
              score: newSub.score,
              submittedTime: newSub.submittedTime,
              assignment: solvingAssignment,
              answers: newSub.answers || {}
            });
          }}
          isPreviewMode={isPreviewMode}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {isPreviewMode && (
        <div className="bg-amber-500/15 border-2 border-dashed border-amber-500/40 text-amber-900 rounded-2xl p-4 text-xs font-black flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <span>
              <strong>CHẾ ĐỘ XEM THỬ:</strong> Đây là bản demo cách học sinh nhìn thấy và làm bài tập này. Kết quả làm thử sẽ KHÔNG được lưu thật vào cơ sở dữ liệu.
            </span>
          </div>
          {onExitPreview && (
            <button
              onClick={onExitPreview}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <span>Quay lại Góc nhìn Giáo viên</span>
              <span>🚪</span>
            </button>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-rose-500 rounded-[28px] p-5 sm:p-6 lg:p-7 text-white shadow-xl relative overflow-hidden border border-orange-300/40 min-h-[140px] flex items-center">
        {/* Background Ambient Glows & Sparkles Decor */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-200 via-orange-400 to-transparent pointer-events-none" />
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-56 h-56 bg-rose-400/20 rounded-full blur-2xl pointer-events-none" />
        
        {/* Subtle background star sparkles */}
        <div className="absolute top-4 right-1/4 text-yellow-200/30 text-lg pointer-events-none select-none">✦</div>
        <div className="absolute bottom-4 left-1/4 text-orange-200/30 text-base pointer-events-none select-none">✧</div>
        <div className="absolute top-1/2 right-1/3 text-amber-300/20 text-sm pointer-events-none select-none">★</div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full">
          {/* Left Content Area */}
          <div className="space-y-3 max-w-2xl">
            {/* Top Badges Row: Distinct separated tags */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/35 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                <span className="text-amber-300">📝</span> NHIỆM VỤ RÈN LUYỆN
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/30 backdrop-blur-md border border-amber-300/30 text-amber-100 text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
                <span>Học sinh: <strong className="text-white font-extrabold">{effectiveUserName} ({studentClass})</strong></span>
              </span>
            </div>

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white drop-shadow-sm flex items-center gap-3">
                <span>Bài Tập Của Tôi</span>
                <span className="text-xl sm:text-2xl animate-bounce">✍️</span>
              </h1>
              <p className="text-orange-100 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
                Hoàn thành các phiếu rèn luyện tự học để tích lũy Xu và tăng cấp EXP mỗi ngày nhé!
              </p>
            </div>
          </div>

          {/* Right Mascot / Assignment 3D Stage (Takes ~1/4 width) */}
          <div className="hidden sm:flex items-center justify-center relative shrink-0">
            <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-3xl bg-gradient-to-tr from-white/10 via-white/25 to-amber-300/30 backdrop-blur-md border border-white/40 shadow-2xl flex items-center justify-center relative transform hover:scale-105 transition-transform duration-300 group">
              <div className="relative flex flex-col items-center justify-center">
                <BookMarked className="w-12 h-12 lg:w-14 lg:h-14 text-amber-200 drop-shadow-[0_6px_16px_rgba(251,191,36,0.6)] animate-pulse" />
                
                {/* Floating Micro Badges */}
                <span className="absolute -top-3.5 -right-3.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 font-black text-[9px] shadow-md border border-amber-100 tracking-wider">
                  +{todoAssignments.length} BÀI 🎯
                </span>
                
                <span className="absolute -bottom-3 px-2 py-0.5 rounded-full bg-amber-900/90 text-amber-300 font-black text-[9px] shadow-md border border-amber-400/50 backdrop-blur-xs whitespace-nowrap">
                  +30 Xu / Bài 🪙
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('todo')}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
            activeTab === 'todo'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Bài Tập Cần Làm</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'todo' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-800'
          }`}>
            {todoAssignments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Nhật Ký & Lịch Sử Nộp Bài</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {historySubmissions.length}
          </span>
        </button>
      </div>

      {/* TAB 1: BÀI TẬP CẦN LÀM */}
      {activeTab === 'todo' && (
        <div className="space-y-4">
          {todoAssignments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Tuyệt vời! Em đã hoàn thành tất cả bài tập</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Không có bài tập rèn luyện nào đang chờ. Hãy sang mục Đấu Trường Tri Thức hoặc Phòng Kiểm Tra để luyện tập thêm nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {todoAssignments.map((as) => {
                const subjColor = getSubjectColorStyles(as.subject);
                const existingSub = historySubmissions.find(
                  sub => (sub.assignment?.id && sub.assignment.id === as.id) || (sub.id && sub.id === as.id)
                );
                const isDone = Boolean(existingSub);

                return (
                <div 
                  key={as.id}
                  className={`bg-white rounded-3xl p-6 border ${isDone ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/20 to-white' : 'border-slate-200'} ${subjColor.cardBorderHover} shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-all pointer-events-none"></div>

                  <div className="space-y-3 relative z-10">
                    {/* Tags */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase ${subjColor.badgeClass}`}>
                          {as.subject || subjColor.name}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                          {as.grade || 'Khối 3'}
                        </span>
                      </div>
                      {isDone ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã hoàn thành ({existingSub?.score})
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Đang chờ làm
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {as.title}
                    </h3>

                    {/* Meta info */}
                    <div className="pt-1.5 text-xs text-slate-600">
                      <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span>Số câu: <b>{as.questions?.length || 5} câu</b></span>
                      </div>
                    </div>

                    <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between px-1">
                      <span>Cho phép làm lại: <strong className="text-slate-800">Nhiều lần ♾️</strong></span>
                      <span className="text-indigo-600 font-semibold">Tự chấm điểm AI ⚡</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-2 relative z-10">
                    <button
                      onClick={() => setSolvingAssignment(as)}
                      className={`w-full py-3 px-4 rounded-2xl text-white text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                        isDone
                          ? 'bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 shadow-teal-600/20'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20'
                      }`}
                    >
                      <span>{isDone ? '🔄 Luyện tập lại bài này' : '⚡ Bắt đầu làm bài tập'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NHẬT KÝ & LỊCH SỬ NỘP BÀI */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {historySubmissions.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-2xl">
                💤
              </div>
              <h3 className="text-base font-bold text-slate-800">Chưa có lịch sử nộp bài</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Em chưa hoàn thành bài tập rèn luyện nào gần đây. Hãy chọn một bài ở danh sách bên trên để bứt phá điểm số nhé!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-4 px-6">STT</th>
                    <th className="py-4 px-6">Tên bài luyện tập</th>
                    <th className="py-4 px-6">Môn học</th>
                    <th className="py-4 px-6 text-center">Xếp thứ</th>
                    <th className="py-4 px-6 text-center">Điểm số</th>
                    <th className="py-4 px-6">Thời gian nộp</th>
                    <th className="py-4 px-6 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {historySubmissions.map((sub, index) => {
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
                            assignment: sub.assignment,
                            score: sub.score,
                            time: sub.submittedTime,
                            answers: sub.answers,
                            title: sub.title,
                            subject: sub.subject,
                            rank: sub.rank
                          })}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
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

      {/* DETAIL SUBMISSION MODAL */}
      {detailSubmission && (() => {
        const questionsList = detailSubmission.assignment.questions || [];
        const totalQ = questionsList.length || 1;
        
        // Calculate correct count
        let correctCount = 0;
        const correctQuestionNums: number[] = [];
        const incorrectQuestionIndices: number[] = [];

        questionsList.forEach((q, idx) => {
          const studentChoice = detailSubmission.answers[idx];
          const isCorrect = checkQuestionCorrectLocal(q, studentChoice);
          if (isCorrect) {
            correctCount++;
            correctQuestionNums.push(idx + 1);
          } else {
            incorrectQuestionIndices.push(idx);
          }
        });

        // Extract numeric score from string e.g. "9.0 / 10" or calculate ratio
        const scoreParts = detailSubmission.score.split('/');
        const numericScore = parseFloat(scoreParts[0]) || ((correctCount / totalQ) * 10);
        const maxScore = parseFloat(scoreParts[1]) || 10;
        const ratio = numericScore / maxScore;
        const isHighRatio = ratio >= 0.8;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              
              {/* 1. HEADER MODAL */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                    🏆 CHI TIẾT BÀI LUYỆN TẬP ĐÃ LÀM
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {detailSubmission.title}
                  </h2>
                </div>
                <button
                  onClick={() => setDetailSubmission(null)}
                  className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer border border-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
                
                {/* 2. KHỐI ĐIỂM SỐ NỔI BẬT (BANNER XANH LÁ ĐẬM) */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">ĐIỂM SỐ ĐẠT ĐƯỢC</span>
                    <div className="text-2xl sm:text-3xl font-black">
                      {detailSubmission.score}
                    </div>
                    <p className="text-xs text-emerald-100 font-medium">
                      Đúng {correctCount} trên tổng số {totalQ} câu
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 space-y-1.5 text-xs text-emerald-50 w-full md:w-auto">
                    <div className="flex items-center justify-between gap-4">
                      <span>Trạng thái:</span>
                      <strong className="text-white font-bold bg-emerald-500/30 px-2 py-0.5 rounded-full">Đã nộp bài</strong>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Số lượt làm:</span>
                      <strong className="text-white">1 lượt</strong>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Thời gian:</span>
                      <strong className="text-white">{detailSubmission.time}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. KHỐI ĐÁNH GIÁ VÀ NHẬN XÉT */}
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Đánh giá và nhận xét từ hệ thống</h3>
                  
                  {/* Nếu tỉ lệ >= 80%: Khối Khen Ngợi */}
                  {isHighRatio && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                        <span>🎉</span>
                        <span>KHEN NGỢI ĐIỂM TỐT</span>
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed font-medium">
                        Khen ngợi em đã hoàn thành đúng {correctCount}/{totalQ} câu. Em làm rất tốt các câu: <strong className="text-emerald-900 font-bold">{correctQuestionNums.join(', ')}</strong>.
                      </p>
                    </div>
                  )}

                  {/* Luôn hiển thị nếu còn câu sai */}
                  {incorrectQuestionIndices.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                        <span>💡</span>
                        <span>NỘI DUNG CẦN CHÚ Ý ÔN TẬP</span>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-800 leading-relaxed font-medium">
                        Em còn {incorrectQuestionIndices.length} câu chưa chính xác (Câu: <strong className="text-amber-900 font-bold">{incorrectQuestionIndices.map(i => i + 1).join(', ')}</strong>). Hãy ôn tập lại lý thuyết và làm lại để đạt điểm tuyệt đối nhé!
                      </p>
                    </div>
                  )}

                  {/* Lời khuyên động viên của giáo viên (AI) */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
                      <span>💬</span>
                      <span>LỜI KHUYÊN ĐỘNG VIÊN CỦA GIÁO VIÊN</span>
                    </div>
                    <p className="text-xs sm:text-sm text-indigo-800 leading-relaxed font-medium">
                      {isHighRatio 
                        ? "Thầy cô rất tự hào vì tinh thần học tập và kết quả xuất sắc của em. Hãy tiếp tục phát huy sự tập trung và phong độ tuyệt vời này trong các bài luyện tập tiếp theo nhé!"
                        : "Em đã có gắng rất nhiều! Đừng nản lòng khi gặp câu hỏi khó nhé, đây là cơ hội tuyệt vời để em ôn tập sâu hơn. Thầy cô tin rằng với một chút chú ý, lần luyện tập sau em sẽ bứt phá điểm số cao hơn."
                      }
                    </p>
                  </div>
                </div>

                {/* 4. KHỐI ĐÁP ÁN VÀ KẾT QUẢ GIẢI CHI TIẾT */}
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Đáp án và kết quả giải chi tiết từng câu:</h3>
                  
                  <div className="space-y-4">
                    {questionsList.map((q: QuestionItem, idx: number) => {
                      const studentChoice = detailSubmission.answers[idx];
                      const isCorrect = checkQuestionCorrectLocal(q, studentChoice);

                      let studentAnswerText = 'Chưa chọn / Chưa làm';
                      let correctAnswerText = q.correctAnswer || 'Xem hướng dẫn giải';

                      if (isMatchingQuestion(q)) {
                        const pairs = q.matchingPairs || [];
                        correctAnswerText = pairs.map((p, pIdx) => `(${pIdx + 1}) ${p.left} ➔ ${p.right}`).join('\n');
                        const sPairs = (typeof studentChoice === 'object' && studentChoice !== null) ? studentChoice : {};
                        if (Object.keys(sPairs).length === 0) {
                          studentAnswerText = 'Chưa nối cặp nào';
                        } else {
                          studentAnswerText = pairs.map((p, pIdx) => {
                            const val = sPairs[pIdx] !== undefined ? sPairs[pIdx] : sPairs[p.left];
                            let displayVal = val;
                            if (typeof val === 'number' && pairs[val]) {
                              displayVal = pairs[val].right;
                            }
                            return `(${pIdx + 1}) ${p.left} ➔ ${displayVal || '(Chưa nối)'}`;
                          }).join('\n');
                        }
                      } else if (normalizeQuestionType(q.type) === 'ordering') {
                        const canonicalOrder = getCanonicalOrderingStepsForGrading(q, questionsBank);
                        correctAnswerText = canonicalOrder
                          .map((opt, oIdx) => `${oIdx + 1}. ${String(opt).replace(/^\d+\.\s*/, '')}`)
                          .join('\n');
                        if (Array.isArray(studentChoice) && studentChoice.length > 0) {
                          studentAnswerText = studentChoice
                            .map((opt, oIdx) => `${oIdx + 1}. ${String(opt).replace(/^\d+\.\s*/, '')}`)
                            .join('\n');
                        } else {
                          studentAnswerText = 'Chưa sắp xếp thứ tự';
                        }
                      } else if (studentChoice !== undefined && studentChoice !== null) {
                        if (typeof studentChoice === 'number') {
                          const letter = String.fromCharCode(65 + studentChoice);
                          studentAnswerText = q.options && q.options[studentChoice] ? `${letter}. ${q.options[studentChoice]}` : letter;
                        } else if (Array.isArray(studentChoice)) {
                          studentAnswerText = studentChoice.map((item, oIdx) => typeof item === 'number' ? String.fromCharCode(65 + item) : String(item)).join(', ');
                        } else if (typeof studentChoice === 'object') {
                          studentAnswerText = Object.keys(studentChoice).length > 0 ? 'Đã hoàn thành các mục' : 'Chưa hoàn thành';
                        } else {
                          studentAnswerText = String(studentChoice);
                        }
                      }

                      return (
                        <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-700 uppercase">
                              CÂU HỎI {idx + 1}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                              isCorrect 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}>
                              {isCorrect ? 'Đúng ✓' : 'Chưa đúng ✗'}
                            </span>
                          </div>

                          <h4 className="text-sm font-extrabold text-slate-900 leading-relaxed">
                            {q.content}
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                              <span className="text-slate-500 font-semibold mb-1">Đáp án em chọn:</span>
                              <span className={`font-extrabold whitespace-pre-line ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
                                {studentAnswerText}
                              </span>
                            </div>

                            <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 flex flex-col justify-between">
                              <span className="text-indigo-600 font-semibold mb-1">Đáp án chuẩn:</span>
                              <span className="font-extrabold text-indigo-900 whitespace-pre-line">
                                {correctAnswerText}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* 5. FOOTER MODAL */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    const assignmentToRetry = detailSubmission.assignment;
                    setDetailSubmission(null);
                    setSolvingAssignment(assignmentToRetry);
                  }}
                  className="py-3 px-5 rounded-2xl border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2"
                >
                  🔄 Luyện tập lại bài này
                </button>

                <button
                  onClick={() => setDetailSubmission(null)}
                  className="py-3 px-6 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-extrabold transition-all cursor-pointer"
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
