import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  X,
  BookOpen,
  School,
  Users,
  Star,
  Tag,
  FileEdit,
  Sparkles,
  Gamepad2,
  FileText,
  Check,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Info,
  HelpCircle,
  Plus,
  Clock,
  AlertCircle
} from 'lucide-react';
import { QuestionItem, CognitiveLevel } from '../../types';
import { SUBJECTS, GRADES, CLASSES_BY_GRADE, QUESTION_TYPES, EXAM_TYPES, getQuestionTypeLabel, matchesQuestionType } from '../../lib/constants';
import { useClassesList } from '../../services/classStorageService';
import { getLocalCachedQuestions, isGradeMatching, isSubjectMatching } from '../../services/questionStorageService';

export type TargetContext = 'exam' | 'assignment' | 'elaborate' | 'apply' | 'assessment' | 'game' | 'default';

interface UseQuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions?: QuestionItem[];
  targetContext?: TargetContext;
  mode?: 'default' | 'lesson_elaborate' | 'lesson_evaluate' | 'lesson_assessment';
  targetTitle?: string;
  initialSubject?: string;
  initialGrade?: string;
  initialTargetClass?: string;
  initialTitle?: string;
  onSelectQuestions?: (selectedQuestions: QuestionItem[]) => void;
  onAssignHomework?: (config: {
    title: string;
    subject: string;
    grade: string;
    classes: string[];
    dueDate?: string;
    maxAttempts?: string;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    questionCount: number;
    selectedQuestions: QuestionItem[];
  }) => void;
  onCreateExam?: (examData: {
    title: string;
    subject: string;
    grade: string;
    targetClasses: string[];
    questions: QuestionItem[];
    examType?: string;
    durationMinutes?: number;
    maxAttempts?: string;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    dueDate?: string;
  }) => void;
  onCreateGame?: (gameData: {
    title: string;
    subject: string;
    grade: string;
    questions: QuestionItem[];
  }) => void;
  onOpenGameRoomConfig?: (config: {
    title: string;
    subject: string;
    grade: string;
    classInfo?: string;
    questions: QuestionItem[];
  }) => void;
}

export const UseQuestionBankModal: React.FC<UseQuestionBankModalProps> = ({
  isOpen,
  onClose,
  questions,
  targetContext,
  mode = 'default',
  targetTitle,
  initialSubject,
  initialGrade,
  initialTargetClass,
  initialTitle,
  onSelectQuestions,
  onAssignHomework,
  onCreateExam,
  onCreateGame,
  onOpenGameRoomConfig,
}) => {
  const effectiveContext: TargetContext = useMemo(() => {
    if (targetContext) return targetContext;
    if (mode === 'lesson_elaborate') return 'elaborate';
    if (mode === 'lesson_evaluate') return 'apply';
    if (mode === 'lesson_assessment') return 'assessment';
    if (onOpenGameRoomConfig || onCreateGame) return 'game';
    if (mode === 'default' && onSelectQuestions && !onCreateExam && !onAssignHomework) return 'elaborate';
    return 'default';
  }, [targetContext, mode, onSelectQuestions, onCreateExam, onAssignHomework, onOpenGameRoomConfig, onCreateGame]);

  const isLessonMode = ['elaborate', 'apply', 'assessment'].includes(effectiveContext);
  const isExamMode = effectiveContext === 'exam';
  const isAssignmentMode = effectiveContext === 'assignment';
  const isGameMode = effectiveContext === 'game';

  // Navigation Tabs: 1 = Cấu hình chung, 2 = Chọn câu hỏi từ ngân hàng, 3 = Danh sách câu hỏi
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

  // Tab 1 States: General Config
  const defaultInitialTitle = isGameMode
    ? 'Bài tập tự luyện từ Ngân hàng câu hỏi'
    : isExamMode
    ? 'Đề kiểm tra từ Ngân hàng câu hỏi'
    : 'Bài tập tự luyện từ Ngân hàng câu hỏi';

  const { getClassesForGrade } = useClassesList();

  const [title, setTitle] = useState(initialTitle || defaultInitialTitle);
  const [isTitleTouched, setIsTitleTouched] = useState(false);
  const [subject, setSubject] = useState(initialSubject || 'Công nghệ');
  const [grade, setGrade] = useState(initialGrade || 'Khối 3');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classError, setClassError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [questionCount, setQuestionCount] = useState(10);
  const [examType, setExamType] = useState<string>(EXAM_TYPES[0] || 'Thường xuyên');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = React.useRef<boolean>(false);

  // Tab 2 States: Filter & Selection
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [tab2TypeFilter, setTab2TypeFilter] = useState('all');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const handleLessonChange = (newLesson: string) => {
    setSelectedLesson(newLesson);
    if (newLesson && newLesson !== 'all' && !isTitleTouched) {
      setTitle(newLesson);
    } else if (newLesson === 'all' && !isTitleTouched) {
      setTitle(defaultInitialTitle);
    }
  };

  // Synchronize when modal opens or initial props update
  React.useEffect(() => {
    if (isOpen) {
      setExamType(EXAM_TYPES[0] || 'Thường xuyên');
      setDurationMinutes(45);
      setSelectedClasses([]);
      setClassError(null);
      setActiveTab(1);
      setSelectedQuestionIds([]);
      setSelectedLesson('all');
      if (initialTitle) {
        setTitle(initialTitle);
        setIsTitleTouched(true);
      } else {
        setIsTitleTouched(false);
        setTitle(
          isGameMode
            ? 'Bài tập tự luyện từ Ngân hàng câu hỏi'
            : isExamMode
            ? 'Đề kiểm tra từ Ngân hàng câu hỏi'
            : 'Bài tập tự luyện từ Ngân hàng câu hỏi'
        );
      }
      if (initialSubject) setSubject(initialSubject);
      if (initialGrade) setGrade(initialGrade);
    } else {
      setSelectedClasses([]);
      setClassError(null);
      setSelectedQuestionIds([]);
    }
  }, [isOpen, initialTitle, initialSubject, initialGrade, isExamMode, isGameMode, defaultInitialTitle]);

  // Tab 3 State: Sub-filter by index
  const [tab3FilterIndex, setTab3FilterIndex] = useState<number | 'all'>('all');

  // Feedback Notification Toast
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Effective questions source
  const allBankQuestions = useMemo(() => {
    if (questions && questions.length > 0) return questions;
    return getLocalCachedQuestions();
  }, [questions]);

  // Available classes for selected grade
  const availableClasses = getClassesForGrade(grade).map(c => c.name);

  // Handle class toggle / addition
  const handleAddClass = (cls: string) => {
    if (cls && !selectedClasses.includes(cls)) {
      setSelectedClasses((prev) => [...prev, cls]);
      setClassError(null);
    }
  };

  const handleRemoveClass = (cls: string) => {
    setSelectedClasses((prev) => prev.filter((c) => c !== cls));
  };

  // Get available lessons based on subject and grade
  const availableLessons = useMemo(() => {
    const list = Array.from(
      new Set(
        allBankQuestions
          .filter((q) => isSubjectMatching(q.subject || (q as any).monHoc, subject) && isGradeMatching(q.grade || (q as any).khoiLop, grade))
          .map((q) => q.lessonName)
          .filter(Boolean)
      )
    ) as string[];

    if (list.length === 0) {
      if (subject === 'Công nghệ') {
        return ['Bài 1: Tự nhiên và công nghệ', 'Bài 2: Sử dụng đèn học', 'Bài 3: Sử dụng quạt điện'];
      }
      if (subject === 'Tin học') {
        return ['Thông tin và quyết định', 'Làm quen với máy tính', 'Bàn phím và chuột'];
      }
      return ['Bài 1: Tổng quan bài học', 'Bài 2: Kiến thức trọng tâm'];
    }
    return list;
  }, [allBankQuestions, subject, grade]);

  // Filter questions for Tab 2
  const filteredQuestions = useMemo(() => {
    return allBankQuestions.filter((q) => {
      // Subject match
      const matchSubject = isSubjectMatching(q.subject || (q as any).monHoc, subject);
      // Grade match
      const matchGrade = isGradeMatching(q.grade || (q as any).khoiLop, grade);
      // Lesson match
      const matchLesson =
        selectedLesson === 'all' ||
        !selectedLesson ||
        q.lessonName === selectedLesson ||
        (selectedLesson === 'Bài 1: Tự nhiên và công nghệ' && (!q.lessonName || q.lessonName.includes('Tự nhiên')));
      // Type match
      const matchType = matchesQuestionType(q.type, tab2TypeFilter);

      return matchSubject && matchGrade && matchLesson && matchType;
    });
  }, [allBankQuestions, subject, grade, selectedLesson, tab2TypeFilter]);

  // Selected questions objects
  const selectedQuestions = useMemo(() => {
    return allBankQuestions.filter((q) => selectedQuestionIds.includes(q.id));
  }, [allBankQuestions, selectedQuestionIds]);

  // Toggle selection of a question
  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Auto select all questions currently filtered
  const handleAutoAddQuestions = () => {
    const idsToAdd = filteredQuestions.map((q) => q.id);
    const combined = Array.from(new Set([...selectedQuestionIds, ...idsToAdd]));
    setSelectedQuestionIds(combined);
    showToast(`Đã tự động chọn ${idsToAdd.length} câu hỏi vào danh sách!`);
  };

  // Clear all selections
  const handleClearAllSelections = () => {
    setSelectedQuestionIds([]);
  };

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4000);
  };

  // Action: Thêm vào Luyện tập / Vận dụng / Đánh giá
  const handleAddToLesson = () => {
    const actionName = targetTitle || 'Thêm vào bài học';
    if (selectedQuestions.length === 0) {
      showToast(`Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng để ${actionName.toLowerCase()}!`);
      setActiveTab(2);
      return;
    }

    if (onSelectQuestions) {
      onSelectQuestions(selectedQuestions);
    }

    showToast(`🎉 Đã ${actionName.toLowerCase()} (${selectedQuestions.length} câu)!`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Action: Giao bài tập
  const handleAssign = () => {
    if (isSubmittingRef.current || isSubmitting) return;

    const uniqueClasses = Array.from(new Set(selectedClasses.map(c => c.trim()).filter(Boolean)));
    if (uniqueClasses.length === 0) {
      setClassError('Vui lòng chọn ít nhất một lớp để giao bài');
      showToast('⚠️ Vui lòng chọn ít nhất một lớp để giao bài!');
      setActiveTab(1);
      return;
    }

    if (selectedQuestions.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng trước khi giao bài!');
      setActiveTab(2);
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      if (onAssignHomework) {
        onAssignHomework({
          title: title || 'Bài tập tự luyện từ Ngân hàng câu hỏi',
          subject,
          grade,
          classes: uniqueClasses,
          dueDate: '2026-09-10T23:59',
          questionCount,
          selectedQuestions,
        });
      }

      if (onSelectQuestions) {
        onSelectQuestions(selectedQuestions);
      }

      showToast(`🎉 Giao bài tập "${title}" cho ${uniqueClasses.join(', ')} thành công (${selectedQuestions.length} câu hỏi)!`);
      setTimeout(() => {
        onClose();
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }, 600);
    } catch (err) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Action: Tạo đề kiểm tra
  const handleCreateTest = () => {
    if (isSubmittingRef.current || isSubmitting) return;

    const uniqueClasses = Array.from(new Set(selectedClasses.map(c => c.trim()).filter(Boolean)));
    if (uniqueClasses.length === 0) {
      setClassError('Vui lòng chọn ít nhất một lớp để tạo đề kiểm tra');
      showToast('⚠️ Vui lòng chọn ít nhất một lớp để tạo đề kiểm tra!');
      setActiveTab(1);
      return;
    }

    if (isExamMode || !isLessonMode) {
      if (!examType || !examType.trim()) {
        showToast('⚠️ Vui lòng chọn Loại bài kiểm tra (bắt buộc)!');
        setActiveTab(1);
        return;
      }
      if (!durationMinutes || Number(durationMinutes) <= 0) {
        showToast('⚠️ Vui lòng nhập Thời gian thi hợp lệ (lớn hơn 0 phút)!');
        setActiveTab(1);
        return;
      }
    }

    if (selectedQuestions.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 câu hỏi để tạo đề kiểm tra!');
      setActiveTab(2);
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const examTitle = title || 'Đề kiểm tra từ Ngân hàng câu hỏi';

      if (onCreateExam) {
        onCreateExam({
          title: examTitle,
          subject,
          grade,
          targetClasses: uniqueClasses,
          questions: selectedQuestions,
          examType: examType || 'Thường xuyên',
          durationMinutes: Number(durationMinutes) || 45,
        });
      }

      if (onSelectQuestions) {
        onSelectQuestions(selectedQuestions);
      }

      showToast(`📄 Đã tạo đề kiểm tra với ${selectedQuestions.length} câu hỏi chuẩn sư phạm!`);
      setTimeout(() => {
        onClose();
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }, 600);
    } catch (err) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Action: Tạo phòng thi đấu / trò chơi
  const handleCreateGameAction = () => {
    if (isSubmittingRef.current || isSubmitting) return;

    const uniqueClasses = Array.from(new Set(selectedClasses.map(c => c.trim()).filter(Boolean)));
    if (uniqueClasses.length === 0) {
      setClassError('Vui lòng chọn ít nhất một lớp để tạo phòng thi đấu');
      showToast('⚠️ Vui lòng chọn ít nhất một lớp để tạo phòng thi đấu!');
      setActiveTab(1);
      return;
    }

    if (selectedQuestions.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 câu hỏi để tạo phòng thi đấu!');
      setActiveTab(2);
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const roomTitle = title
        ? (title.startsWith('Luyện tập:') ? title : `Luyện tập: ${title}`)
        : (selectedLesson !== 'all' ? `Luyện tập: ${selectedLesson}` : 'Luyện tập: Bài tập tự luyện từ Ngân hàng câu hỏi');

      if (onOpenGameRoomConfig) {
        onOpenGameRoomConfig({
          title: roomTitle,
          subject: subject === 'all' || subject === 'Tất cả các môn' ? 'Công nghệ' : subject,
          grade: grade === 'all' || grade === 'Tất cả các khối' ? 'Khối 3' : grade,
          classInfo: uniqueClasses.join(', '),
          questions: selectedQuestions,
        });
        onClose();
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      if (onCreateGame) {
        onCreateGame({
          title: roomTitle,
          subject: subject === 'all' || subject === 'Tất cả các môn' ? 'Công nghệ' : subject,
          grade: grade === 'all' || grade === 'Tất cả các khối' ? 'Khối 3' : grade,
          questions: selectedQuestions,
        });
      }

      showToast(`🎮 Đã chuyển ${selectedQuestions.length} câu hỏi sang phân hệ Trò chơi học tập!`);
      setTimeout(() => {
        onClose();
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }, 800);
    } catch (err) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    const clean = (type || '').toLowerCase().trim();

    if (clean === 'multiple_response' || clean.includes('nhiều')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide uppercase bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
          CHỌN NHIỀU ĐÁP ÁN ĐÚNG
        </span>
      );
    }
    if (clean === 'multiple_choice' || clean.includes('trắc nghiệm')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-200">
          TRẮC NGHIỆM ĐƠN
        </span>
      );
    }
    if (clean === 'true_false' || clean.includes('đúng')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          CÂU HỎI ĐÚNG/SAI
        </span>
      );
    }
    if (clean === 'fill_blank' || clean.includes('khuyết') || clean.includes('ngắn')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200">
          ĐIỀN KHUYẾT / NGẮN
        </span>
      );
    }
    if (clean === 'ordering' || clean.includes('sắp xếp')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
          SẮP XẾP THỨ TỰ
        </span>
      );
    }
    if (clean === 'matching' || clean.includes('nối')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">
          NỐI CẶP / KÉO THẢ
        </span>
      );
    }
    if (clean === 'classification' || clean.includes('phân loại')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide uppercase bg-violet-50 text-violet-700 border border-violet-200">
          PHÂN LOẠI
        </span>
      );
    }
    if (clean === 'essay' || clean.includes('tự luận')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-300">
          TỰ LUẬN TỰ DO
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-200">
        {getQuestionTypeLabel(type)}
      </span>
    );
  };

  const getLevelLabelBadge = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            1. Nhận biết
          </span>
        );
      case 'thong_hieu':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            2. Thông hiểu
          </span>
        );
      case 'van_dung':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            3. Vận dụng
          </span>
        );
      case 'van_dung_cao':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            4. VD Cao
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Main Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col z-10 overflow-hidden font-sans text-slate-800"
      >
        {/* Toast Alert */}
        <AnimatePresence>
          {actionSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Top Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                Sử dụng câu hỏi từ Ngân hàng
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                isGameMode
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-teal-50 text-teal-700 border-teal-200'
              }`}>
                {isGameMode
                  ? 'TRÒ CHƠI HỌC TẬP AI'
                  : isExamMode
                  ? 'QUẢN LÝ ĐỀ KIỂM TRA'
                  : isAssignmentMode
                  ? 'QUẢN LÝ BÀI TẬP'
                  : isLessonMode
                  ? 'BÀI HỌC 5E'
                  : 'THIẾT LẬP BAN ĐẦU'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <span>Đóng quay lại</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-slate-50/40">
          <button
            onClick={() => setActiveTab(1)}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 1
                ? 'border-teal-600 text-teal-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Cấu hình chung</span>
          </button>

          <button
            onClick={() => setActiveTab(2)}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 2
                ? 'border-teal-600 text-teal-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Chọn câu hỏi từ ngân hàng</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                selectedQuestionIds.length > 0
                  ? 'bg-teal-50 text-teal-700 border-teal-200 font-bold'
                  : 'bg-slate-100 text-slate-500 border-slate-200 font-medium'
              }`}
            >
              {selectedQuestionIds.length} câu đã chọn
            </span>
          </button>

          <button
            onClick={() => setActiveTab(3)}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 3
                ? 'border-teal-600 text-teal-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Danh sách câu hỏi</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                selectedQuestionIds.length > 0
                  ? 'bg-teal-600 text-white border-teal-600 font-bold'
                  : 'bg-slate-100 text-slate-500 border-slate-200 font-medium'
              }`}
            >
              {selectedQuestionIds.length} câu đã chọn
            </span>
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: CẤU HÌNH CHUNG */}
          {activeTab === 1 && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                {/* Tiêu đề bài tập / đề thi / phòng trò chơi - Only shown in default, assignment, game or exam mode */}
                {!isLessonMode && (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      {isGameMode ? (
                        <Gamepad2 className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <FileEdit className="w-3.5 h-3.5 text-teal-600" />
                      )}
                      <span>
                        {isGameMode
                          ? 'Tiêu đề trò chơi / bài thi đấu'
                          : isExamMode
                          ? 'Tiêu đề đề kiểm tra / bài thi'
                          : 'Tiêu đề bài tập'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setIsTitleTouched(true);
                      }}
                      placeholder={
                        isGameMode
                          ? 'Bài tập tự luyện từ Ngân hàng câu hỏi'
                          : isExamMode
                          ? 'Đề kiểm tra định kỳ học kỳ 1...'
                          : 'Bài tập tự luyện từ Ngân hàng câu hỏi'
                      }
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                    />
                  </div>
                )}

                {/* Grid các trường cấu hình */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Môn học */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                      <span>Môn học</span>
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer"
                    >
                      <option value="Công nghệ">Công nghệ</option>
                      <option value="Tin học">Tin học</option>
                      <option value="Toán">Toán</option>
                      <option value="Tiếng Việt">Tiếng Việt</option>
                      <option value="Tự nhiên và Xã hội">Tự nhiên và Xã hội</option>
                      <option value="Khoa học">Khoa học</option>
                      <option value="Lịch sử và Địa lí">Lịch sử và Địa lí</option>
                      <option value="Đạo đức">Đạo đức</option>
                    </select>
                  </div>

                  {/* Khối lớp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-rose-500" />
                      <span>Khối lớp</span>
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Chọn lớp giao bài tập (chỉ hiển thị khi !isLessonMode) */}
                {!isLessonMode && (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                        <span>
                          {isGameMode
                            ? 'Chọn lớp tham gia thi đấu / trò chơi'
                            : isExamMode
                            ? 'Chọn lớp thi / giao đề kiểm tra'
                            : 'Chọn lớp giao bài tập'}{' '}
                          <span className="text-rose-500">*</span>
                        </span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        (Bắt buộc - Chọn ít nhất 1 lớp)
                      </span>
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="sm:w-64 shrink-0">
                        <select
                          onChange={(e) => handleAddClass(e.target.value)}
                          value=""
                          className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border ${
                            classError
                              ? 'border-rose-400 focus:ring-2 focus:ring-rose-400'
                              : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500'
                          } bg-white cursor-pointer`}
                        >
                          <option value="" disabled>
                            Chọn thêm lớp...
                          </option>
                          {availableClasses.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Selected Classes Chip list */}
                      <div
                        className={`flex flex-wrap gap-1.5 flex-1 items-center min-h-[38px] p-1.5 rounded-xl bg-slate-50 border ${
                          classError
                            ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-300'
                            : 'border-slate-200/70'
                        }`}
                      >
                        {selectedClasses.length === 0 ? (
                          <span className="text-xs text-slate-400 italic px-2">Chưa chọn lớp nào</span>
                        ) : (
                          selectedClasses.map((cls) => (
                            <span
                              key={cls}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200"
                            >
                              <span>{cls}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveClass(cls)}
                                className="hover:bg-teal-200/60 rounded-full p-0.5 transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    {classError && (
                      <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{classError}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Cấu hình đặc thù cho Đề kiểm tra: Loại bài kiểm tra & Thời gian thi */}
                {isExamMode && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-purple-600" />
                        <span>Thông số đề kiểm tra</span>
                      </span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                        * Bắt buộc
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Loại bài kiểm tra */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-purple-600" />
                          <span>Loại bài kiểm tra <span className="text-rose-500">*</span></span>
                        </label>
                        <select
                          value={examType}
                          onChange={(e) => setExamType(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer text-purple-900"
                        >
                          {EXAM_TYPES.map((et) => (
                            <option key={et} value={et}>{et}</option>
                          ))}
                        </select>
                      </div>

                      {/* Thời gian thi (phút) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          <span>Thời gian thi (phút) <span className="text-rose-500">*</span></span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={300}
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-24 px-3.5 py-2.5 text-xs font-black rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-800"
                          />
                          <div className="flex items-center gap-1 flex-wrap">
                            {[15, 30, 45, 60, 90].map((mins) => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => setDurationMinutes(mins)}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                  durationMinutes === mins
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                    : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100/60'
                                }`}
                              >
                                {mins}p
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid: Loại câu hỏi & Mức độ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Loại câu hỏi */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Loại câu hỏi</span>
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer"
                    >
                      <option value="all">Tất cả các dạng</option>
                      {QUESTION_TYPES.map((qt, idx) => (
                        <option key={qt.id} value={qt.id}>{idx + 1}. {qt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mức độ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span>Mức độ</span>
                    </label>
                    <select
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer"
                    >
                      <option value="all">Tất cả mức độ</option>
                      <option value="nhan_biet">1. Nhận biết</option>
                      <option value="thong_hieu">2. Thông hiểu</option>
                      <option value="van_dung">3. Vận dụng</option>
                      <option value="van_dung_cao">4. Vận dụng cao</option>
                    </select>
                  </div>
                </div>

                {/* Số câu hỏi */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <FileEdit className="w-3.5 h-3.5 text-rose-500" />
                    <span>Số câu hỏi mong muốn</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
                    className="w-full sm:w-64 px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Info Tip Banner */}
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-3.5 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-xs text-teal-950 leading-relaxed">
                  {isLessonMode ? (
                    <>
                      <span className="font-bold">Mẹo chọn câu hỏi cho bài học:</span> Bạn có thể chuyển sang tab{' '}
                      <span className="font-bold text-teal-800">"Chọn câu hỏi từ ngân hàng"</span> để lọc bài học, xem trước và tích chọn từng câu hỏi phù hợp nhất, sau đó nhấn nút{' '}
                      <span className="font-bold text-teal-800">"{targetTitle || 'Thêm vào Luyện tập'}"</span>.
                    </>
                  ) : isExamMode ? (
                    <>
                      <span className="font-bold">Mẹo tạo đề kiểm tra:</span> Bạn có thể chuyển sang tab{' '}
                      <span className="font-bold text-teal-800">"Chọn câu hỏi từ ngân hàng"</span> để lọc câu hỏi theo môn học, khối lớp và ma trận mức độ. Khi hoàn tất, nhấn nút{' '}
                      <span className="font-bold text-teal-800">"Tạo đề từ câu hỏi đã chọn"</span> để đưa vào quản lý đề kiểm tra.
                    </>
                  ) : isGameMode ? (
                    <>
                      <span className="font-bold">Mẹo tạo phòng thi đấu:</span> Bạn có thể chuyển sang tab{' '}
                      <span className="font-bold text-teal-800">"Chọn câu hỏi từ ngân hàng"</span> để lọc và chọn câu hỏi nhanh chóng. Khi hoàn tất, nhấn nút{' '}
                      <span className="font-bold text-teal-800">"Tạo phòng thi đấu"</span> để chuyển tiếp sang cấu hình phòng trò chơi trực quan cho học sinh.
                    </>
                  ) : (
                    <>
                      <span className="font-bold">Mẹo giao bài hiệu quả:</span> Bạn có thể chuyển sang tab{' '}
                      <span className="font-bold text-teal-800">"Chọn câu hỏi từ ngân hàng"</span> để xem trước và lựa chọn gói bài tập phù hợp nhất. Khi hoàn tất, nhấn nút{' '}
                      <span className="font-bold text-teal-800">"{isAssignmentMode ? 'Giao bài tập từ câu hỏi đã chọn' : 'Giao bài ngay'}"</span> để kích hoạt.
                    </>
                  )}
                </p>
              </div>

              {/* Tab 1 Footer */}
              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {isLessonMode
                      ? 'Thiết lập các tiêu chí lọc sau đó chuyển sang chọn câu hỏi'
                      : isExamMode
                      ? 'Thiết lập cấu hình đề thi và ma trận rồi chuyển sang chọn câu hỏi'
                      : isGameMode
                      ? 'Thiết lập thông tin trò chơi rồi chuyển sang chọn câu hỏi'
                      : 'Vui lòng kiểm tra kỹ các tùy chọn trước khi giao bài'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => setActiveTab(2)}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <span>Tiếp tục chọn câu hỏi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHỌN CÂU HỎI TỪ NGÂN HÀNG */}
          {activeTab === 2 && (
            <div className="space-y-4">
              {/* Filter Row with 2 selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Chọn bài học:</span>
                  </label>
                  <select
                    value={selectedLesson}
                    onChange={(e) => handleLessonChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">Tất cả bài học</option>
                    {availableLessons.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Loại câu hỏi:</span>
                  </label>
                  <select
                    value={tab2TypeFilter}
                    onChange={(e) => setTab2TypeFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">Tất cả các dạng</option>
                    {QUESTION_TYPES.map(qt => (
                      <option key={qt.id} value={qt.id}>{qt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-medium text-slate-500">
                      Không tìm thấy câu hỏi phù hợp với bộ lọc hiện tại.
                    </p>
                  </div>
                ) : (
                  filteredQuestions.map((q, idx) => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    const qNumber = idx + 1;

                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestionSelection(q.id)}
                        className={`border rounded-2xl p-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/10 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-teal-300'
                        }`}
                      >
                        {/* Question Card Header */}
                        <div className="flex items-center justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleQuestionSelection(q.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                            />
                            <span className="text-sm font-semibold text-slate-900">
                              Câu hỏi {qNumber}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              ({q.code || q.id})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {getQuestionTypeBadge(q.type)}
                            {q.level && getLevelLabelBadge(q.level)}
                          </div>
                        </div>

                        {/* Question Content */}
                        <p className="text-sm font-medium text-slate-800 mb-3 leading-relaxed">
                          {q.content}
                        </p>

                        {/* Multiple Choice Options Grid */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt, optIdx) => {
                              const labelLetter = String.fromCharCode(65 + optIdx); // A, B, C, D
                              const optText = opt.replace(/^[A-D]\.\s*/, '');
                              const isCorrect =
                                q.correctAnswer === labelLetter ||
                                (q.correctAnswer && q.correctAnswer.includes(labelLetter));

                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs transition-colors ${
                                    isCorrect
                                      ? 'border-teal-500 bg-teal-50/30 text-teal-950 font-medium'
                                      : 'border-slate-200 bg-slate-50/50 text-slate-700 font-normal'
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center shrink-0 ${
                                      isCorrect
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {labelLetter}
                                  </span>
                                  <span className="truncate">{optText}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* True/False Statements Table Preview */}
                        {q.statements && q.statements.length > 0 && (
                          <div className="space-y-1.5 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                            {q.statements.map((st, stIdx) => (
                              <div key={stIdx} className="flex items-center justify-between gap-2">
                                <span className="text-slate-700 font-normal">{st.statement}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    st.isCorrect
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {st.isCorrect ? 'ĐÚNG' : 'SAI'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tab 2 Footer Actions Bar */}
              <div className="border-t border-slate-100 pt-4 flex flex-col lg:flex-row items-center justify-between gap-3">
                <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <span>🎯 Đã chọn:</span>
                  <span className="font-semibold text-teal-700">
                    {selectedQuestionIds.length} câu hỏi
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end w-full lg:w-auto">
                  <button
                    onClick={onClose}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>

                  <button
                    onClick={handleAutoAddQuestions}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tự động chọn tất cả</span>
                  </button>

                  {isLessonMode ? (
                    <button
                      onClick={handleAddToLesson}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{targetTitle || 'Thêm vào Luyện tập'} ({selectedQuestions.length} câu)</span>
                    </button>
                  ) : isExamMode ? (
                    <button
                      onClick={handleCreateTest}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Tạo đề từ câu hỏi đã chọn ({selectedQuestions.length} câu)</span>
                    </button>
                  ) : isAssignmentMode ? (
                    <button
                      onClick={handleAssign}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Giao bài tập từ câu hỏi đã chọn ({selectedQuestions.length} câu)</span>
                    </button>
                  ) : isGameMode ? (
                    <button
                      onClick={handleCreateGameAction}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      <span>Tạo phòng thi đấu {selectedQuestions.length > 0 ? `(${selectedQuestions.length} câu)` : ''}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCreateGameAction}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>Tạo trò chơi</span>
                      </button>

                      <button
                        onClick={handleCreateTest}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Tạo đề kiểm tra</span>
                      </button>

                      <button
                        onClick={handleAssign}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Giao bài tập</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DANH SÁCH CÂU HỎI ĐÃ CHỌN */}
          {activeTab === 3 && (
            <div className="space-y-4">
              {/* Tab 3 Inner Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Danh sách câu hỏi đã chọn
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                    {selectedQuestions.length} câu đã chọn
                  </span>
                </div>

                {selectedQuestions.length > 0 && (
                  <button
                    onClick={handleClearAllSelections}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bỏ chọn tất cả</span>
                  </button>
                )}
              </div>

              {/* Question Sub-filter pills */}
              {selectedQuestions.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setTab3FilterIndex('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                      tab3FilterIndex === 'all'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Tất cả ({selectedQuestions.length})
                  </button>

                  {selectedQuestions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTab3FilterIndex(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                        tab3FilterIndex === i
                          ? 'bg-teal-800 text-white font-medium shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Câu {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Questions Container */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {selectedQuestions.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-medium text-slate-500">
                      Chưa có câu hỏi nào được chọn.
                    </p>
                    <button
                      onClick={() => setActiveTab(2)}
                      className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-medium hover:bg-teal-700 cursor-pointer"
                    >
                      Chọn câu hỏi từ ngân hàng
                    </button>
                  </div>
                ) : (
                  selectedQuestions
                    .filter((_, idx) => tab3FilterIndex === 'all' || tab3FilterIndex === idx)
                    .map((q, idx) => {
                      const displayIndex =
                        tab3FilterIndex === 'all' ? idx + 1 : Number(tab3FilterIndex) + 1;

                      return (
                        <div
                          key={q.id}
                          className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-3"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="border border-teal-300 text-teal-700 font-medium text-xs px-2.5 py-0.5 rounded-md">
                                Câu {displayIndex}
                              </span>
                              {getQuestionTypeBadge(q.type)}
                              {q.level && getLevelLabelBadge(q.level)}
                            </div>

                            <button
                              onClick={() => toggleQuestionSelection(q.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                              title="Bỏ câu hỏi này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Question Text */}
                          <p className="text-sm font-medium text-slate-800 leading-relaxed">
                            {q.content}
                          </p>

                          {/* Options */}
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {q.options.map((opt, optIdx) => {
                                const labelLetter = String.fromCharCode(65 + optIdx);
                                const optText = opt.replace(/^[A-D]\.\s*/, '');
                                const isCorrect =
                                  q.correctAnswer === labelLetter ||
                                  (q.correctAnswer && q.correctAnswer.includes(labelLetter));

                                return (
                                  <div
                                    key={optIdx}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs ${
                                      isCorrect
                                        ? 'border-teal-500 bg-teal-50/30 text-teal-950 font-medium'
                                        : 'border-slate-200 bg-slate-50/50 text-slate-700 font-normal'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center shrink-0 ${
                                        isCorrect
                                          ? 'bg-teal-600 text-white'
                                          : 'bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {labelLetter}
                                    </span>
                                    <span className="truncate">{optText}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>

              {/* Tab 3 Footer Actions Bar */}
              <div className="border-t border-slate-100 pt-4 flex flex-col lg:flex-row items-center justify-between gap-3">
                <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <span>🎯 Đã chọn:</span>
                  <span className="font-semibold text-teal-700">
                    {selectedQuestionIds.length} câu hỏi
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end w-full lg:w-auto">
                  <button
                    onClick={onClose}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>

                  <button
                    onClick={handleAutoAddQuestions}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tự động chọn tất cả</span>
                  </button>

                  {isLessonMode ? (
                    <button
                      onClick={handleAddToLesson}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{targetTitle || 'Thêm vào Luyện tập'} ({selectedQuestions.length} câu)</span>
                    </button>
                  ) : isExamMode ? (
                    <button
                      onClick={handleCreateTest}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Tạo đề từ câu hỏi đã chọn ({selectedQuestions.length} câu)</span>
                    </button>
                  ) : isAssignmentMode ? (
                    <button
                      onClick={handleAssign}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Giao bài tập từ câu hỏi đã chọn ({selectedQuestions.length} câu)</span>
                    </button>
                  ) : isGameMode ? (
                    <button
                      onClick={handleCreateGameAction}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      <span>Tạo phòng thi đấu {selectedQuestions.length > 0 ? `(${selectedQuestions.length} câu)` : ''}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCreateGameAction}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>Tạo trò chơi</span>
                      </button>

                      <button
                        onClick={handleCreateTest}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Tạo đề kiểm tra</span>
                      </button>

                      <button
                        onClick={handleAssign}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Giao bài tập</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

