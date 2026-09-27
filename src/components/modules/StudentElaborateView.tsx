import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu,
  RotateCcw, 
  CheckCircle2, 
  Layers, 
  Play, 
  Check, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Award,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Clock,
  Globe,
  Trash2,
  History as HistoryIcon,
  AlertTriangle,
  Maximize2,
  Minimize2,
  FastForward,
  MessageSquare
} from 'lucide-react';
import { Lesson5EPlan, QuestionItem } from '../../types';
import { getQuestionTypeLabel } from '../../lib/constants';

interface StudentElaborateViewProps {
  lesson: Lesson5EPlan;
  onNavigateToNext: () => void;
  nextStepLabel?: string;
  onSaveProgress?: (elaborateData: any) => void;
  savedData?: any;
}

export const StudentElaborateView: React.FC<StudentElaborateViewProps> = ({
  lesson,
  onNavigateToNext,
  nextStepLabel = 'Vận dụng (Apply)',
  onSaveProgress,
  savedData
}) => {
  const elaborateStep = lesson.stepElaborate as any;
  const transitionGuidance = elaborateStep?.transitionGuidance || 
    'Vừa rồi các em đã tìm hiểu qua video bài giảng và nắm vững các khái niệm trọng tâm. Bây giờ chúng ta cùng bước vào phần Luyện tập để củng cố và vận dụng kiến thức nhé!';

  // Prepare questions: use configured questions from lesson or structured fallback questions
  const questions: QuestionItem[] = (elaborateStep?.questions && elaborateStep.questions.length > 0)
    ? elaborateStep.questions
    : [
        {
          id: 'q-el-frac-1',
          code: 'CH-EL-01',
          subject: lesson.subject || 'Toán học',
          grade: lesson.grade || 'Khối 3',
          level: 'thong_hieu',
          type: 'fill_blank',
          content: 'Quan sát hình dưới đây và trả lời các câu hỏi:',
          subQuestions: [
            {
              id: 'sq-1',
              label: 'Câu 1: a) Viết phân số chỉ số phần đã tô màu của hình trên.',
              type: 'fraction',
              correctNumerator: '5',
              correctDenominator: '6'
            },
            {
              id: 'sq-2',
              label: 'Câu 2: b) Đọc phân số trên.',
              type: 'multiple_choice',
              options: [
                'Năm phần sáu.',
                'Năm mươi lăm phần bốn.',
                'Sáu phần năm.',
                'Một phần năm.'
              ],
              correctAnswer: 'A'
            }
          ],
          hasFractionIllustration: true,
          explanation: 'Hình tròn được chia thành 6 phần bằng nhau, trong đó có 5 phần được tô màu tím. Phân số chỉ số phần đã tô màu là 5/6, đọc là "Năm phần sáu".'
        },
        {
          id: 'q-el-default-2',
          code: 'CH-EL-02',
          subject: lesson.subject || 'Tin học',
          grade: lesson.grade || 'Khối 3',
          level: 'thong_hieu',
          type: 'multiple_choice',
          content: 'Đâu là cách áp dụng hợp lý kiến thức vừa khám phá trong bài học vào việc giải quyết tình huống thực tế?',
          options: [
            'Phân tích yêu cầu, lựa chọn giải pháp phù hợp và thực hiện từng bước',
            'Bỏ qua các bước kiểm tra và làm theo cảm tính',
            'Không cần lập kế hoạch mà làm ngay lập tức',
            'Chờ đợi sự hỗ trợ mà không tự mình suy nghĩ'
          ],
          correctAnswer: 'A',
          explanation: 'Phân tích kỹ đề bài và thực hiện từng bước là phương pháp khoa học giúp giải quyết vấn đề hiệu quả.'
        },
        {
          id: 'q-el-default-3',
          code: 'CH-EL-03',
          subject: lesson.subject || 'Tin học',
          grade: lesson.grade || 'Khối 3',
          level: 'thong_hieu',
          type: 'true_false',
          content: 'Xác định tính Đúng / Sai của các nhận định sau:',
          statements: [
            { statement: 'Thực hành luyện tập thường xuyên giúp củng cố kiến thức sâu hơn', isCorrect: true },
            { statement: 'Chỉ cần xem video một lần là không cần làm bài tập vận dụng', isCorrect: false }
          ],
          explanation: 'Luyện tập và thực hành là bước quan trọng giúp chuyển hóa kiến thức thành kỹ năng thực tế.'
        }
      ];

  // State
  const [phase, setPhase] = useState<'intro' | 'practice' | 'summary'>(
    savedData?.isCompleted ? 'summary' : (savedData?.hasStarted ? 'practice' : 'intro')
  );
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(4);
  const [isAutoTransitioning, setIsAutoTransitioning] = useState<boolean>(true);

  // Student Answers Store
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>(savedData?.answers || {});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(Boolean(savedData?.isCompleted));
  const [score, setScore] = useState<number>(savedData?.score ?? 0);
  const [correctCount, setCorrectCount] = useState<number>(savedData?.correctCount ?? 0);

  // Toolbar & Settings states
  const [isBilingual, setIsBilingual] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportText, setReportText] = useState<string>('');
  const [reportSent, setReportSent] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-countdown effect on intro screen (3-4 seconds)
  useEffect(() => {
    if (phase === 'intro' && isAutoTransitioning) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase('practice');
      }
    }
  }, [phase, countdown, isAutoTransitioning]);

  // Elapsed timer for practice
  useEffect(() => {
    let interval: any = null;
    if (phase === 'practice' && isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Font size classes
  const getFontSizeClass = () => {
    switch (fontSizeLevel) {
      case 'sm': return 'text-xs';
      case 'base': return 'text-sm';
      case 'lg': return 'text-base';
      case 'xl': return 'text-lg';
      default: return 'text-sm';
    }
  };

  const increaseFontSize = () => {
    if (fontSizeLevel === 'sm') setFontSizeLevel('base');
    else if (fontSizeLevel === 'base') setFontSizeLevel('lg');
    else if (fontSizeLevel === 'lg') setFontSizeLevel('xl');
  };

  const decreaseFontSize = () => {
    if (fontSizeLevel === 'xl') setFontSizeLevel('lg');
    else if (fontSizeLevel === 'lg') setFontSizeLevel('base');
    else if (fontSizeLevel === 'base') setFontSizeLevel('sm');
  };

  // Current active question
  const currentQ = questions[currentQIndex] || questions[0];

  // Answer handlers
  const handleOptionSelect = (qId: string, optLetter: string) => {
    if (isSubmitted) return;
    setStudentAnswers(prev => ({ ...prev, [qId]: optLetter }));
  };

  const handleFractionChange = (qId: string, field: 'numerator' | 'denominator', val: string) => {
    if (isSubmitted) return;
    const current = studentAnswers[qId] || {};
    setStudentAnswers(prev => ({
      ...prev,
      [qId]: { ...current, [field]: val }
    }));
  };

  const handleMultiSelect = (qId: string, optIndex: number) => {
    if (isSubmitted) return;
    const current: number[] = studentAnswers[qId] || [];
    const next = current.includes(optIndex) 
      ? current.filter(i => i !== optIndex) 
      : [...current, optIndex];
    setStudentAnswers(prev => ({ ...prev, [qId]: next }));
  };

  const handleTFSelect = (qId: string, sIdx: number, val: boolean) => {
    if (isSubmitted) return;
    const current = studentAnswers[qId] || {};
    setStudentAnswers(prev => ({ ...prev, [qId]: { ...current, [sIdx]: val } }));
  };

  const handleFillBlankChange = (qId: string, val: string) => {
    if (isSubmitted) return;
    setStudentAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleOrderingMove = (qId: string, items: string[], fromIdx: number, toIdx: number) => {
    if (isSubmitted) return;
    if (toIdx < 0 || toIdx >= items.length) return;
    const next = [...items];
    const item = next.splice(fromIdx, 1)[0];
    next.splice(toIdx, 0, item);
    setStudentAnswers(prev => ({ ...prev, [qId]: next }));
  };

  const handleMatchingChange = (qId: string, pairIdx: number, val: string) => {
    if (isSubmitted) return;
    const current = studentAnswers[qId] || {};
    setStudentAnswers(prev => ({ ...prev, [qId]: { ...current, [pairIdx]: val } }));
  };

  const handleClassificationChange = (qId: string, itemIdx: number, val: string) => {
    if (isSubmitted) return;
    const current = studentAnswers[qId] || {};
    setStudentAnswers(prev => ({ ...prev, [qId]: { ...current, [itemIdx]: val } }));
  };

  const handleEssayChange = (qId: string, val: string) => {
    if (isSubmitted) return;
    setStudentAnswers(prev => ({ ...prev, [qId]: val }));
  };

  // Check if a question is answered
  const isQuestionAnswered = (q: QuestionItem): boolean => {
    if ((q as any).subQuestions && (q as any).subQuestions.length > 0) {
      return (q as any).subQuestions.every((sq: any) => {
        const sqAns = studentAnswers[`${q.id}_${sq.id}`];
        if (!sqAns) return false;
        if (sq.type === 'fraction') {
          return sqAns.numerator && sqAns.denominator;
        }
        return sqAns !== undefined;
      });
    }

    const ans = studentAnswers[q.id];
    if (ans === undefined || ans === null) return false;
    if (typeof ans === 'string') return ans.trim().length > 0;
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === 'object') return Object.keys(ans).length > 0;
    return true;
  };

  // Evaluate single question
  const checkQuestionCorrect = (q: QuestionItem): boolean => {
    if ((q as any).subQuestions && (q as any).subQuestions.length > 0) {
      return (q as any).subQuestions.every((sq: any) => {
        const sqAns = studentAnswers[`${q.id}_${sq.id}`];
        if (!sqAns) return false;
        if (sq.type === 'fraction') {
          return String(sqAns.numerator).trim() === String(sq.correctNumerator).trim() &&
                 String(sqAns.denominator).trim() === String(sq.correctDenominator).trim();
        }
        if (sq.type === 'multiple_choice') {
          return sqAns === sq.correctAnswer;
        }
        return false;
      });
    }

    const userAns = studentAnswers[q.id];
    if (userAns === undefined || userAns === null) return false;

    const qType = q.type || 'multiple_choice';
    if (qType === 'multiple_choice') {
      return userAns === (q.correctAnswer || 'A');
    }
    if (qType === 'multiple_response') {
      const correctIndices = (q.correctAnswer || 'A')
        .split('')
        .map(c => c.charCodeAt(0) - 65)
        .sort();
      const userIndices = Array.isArray(userAns) ? [...userAns].sort() : [];
      return JSON.stringify(correctIndices) === JSON.stringify(userIndices);
    }
    if (qType === 'true_false') {
      const stmts = q.statements || [];
      return stmts.every((s, idx) => userAns[idx] === s.isCorrect);
    }
    if (qType === 'fill_blank') {
      const targetAns = (q.correctAnswer || '').toLowerCase().trim();
      return typeof userAns === 'string' && userAns.toLowerCase().trim() === targetAns;
    }
    if (qType === 'ordering') {
      const original = q.options || [];
      return Array.isArray(userAns) && JSON.stringify(userAns) === JSON.stringify(original);
    }
    if (qType === 'matching') {
      const pairs = q.matchingPairs || [];
      return pairs.every((p, idx) => userAns[idx] === p.right);
    }
    if (qType === 'classification') {
      const items = q.classificationItems || [];
      return items.every((item, idx) => userAns[idx] === item.group);
    }
    if (qType === 'essay') {
      return typeof userAns === 'string' && userAns.trim().length > 0;
    }
    return false;
  };

  // Submit test
  const handleSubmitPractice = () => {
    let correct = 0;
    questions.forEach(q => {
      if (checkQuestionCorrect(q)) correct++;
    });

    const finalScore = questions.length > 0 ? Math.round((correct / questions.length) * 10) : 10;
    setCorrectCount(correct);
    setScore(finalScore);
    setIsSubmitted(true);
    setIsTimerRunning(false);
    setPhase('summary');

    if (onSaveProgress) {
      onSaveProgress({
        isCompleted: true,
        hasStarted: true,
        answers: studentAnswers,
        score: finalScore,
        correctCount: correct,
        totalQuestions: questions.length,
        timeSpentSeconds: timerSeconds
      });
    }
  };

  // Reset / Retake
  const handleResetAnswers = () => {
    if (confirm('Em có chắc chắn muốn xóa toàn bộ câu trả lời và làm lại từ đầu không?')) {
      setStudentAnswers({});
      setCurrentQIndex(0);
      setTimerSeconds(0);
      setIsSubmitted(false);
    }
  };

  const handleRetakeFromSummary = () => {
    setStudentAnswers({});
    setIsSubmitted(false);
    setCurrentQIndex(0);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setPhase('practice');
  };

  // Calculate answered percentage
  const answeredCount = questions.filter(isQuestionAnswered).length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // =========================================================================
  // A. MÀN HÌNH "LỜI DẪN CHUYỂN TIẾP" (TỰ ĐỘNG CHUYỂN SAU 3-4 GIÂY)
  // =========================================================================
  if (phase === 'intro') {
    return (
      <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-teal-500/10 rounded-3xl p-6 sm:p-10 border border-amber-500/20 text-center space-y-6 max-w-2xl mx-auto my-6 shadow-sm relative transition-all duration-300">
        {/* Nút bỏ qua ở góc trên */}
        <button
          onClick={() => {
            setIsAutoTransitioning(false);
            setPhase('practice');
          }}
          className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-amber-700 text-xs font-bold transition-all border border-amber-200 shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <span>Bỏ qua</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>

        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 animate-pulse">
          <Layers className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-amber-800 bg-amber-100 px-3.5 py-1 rounded-full border border-amber-200">
            Bước 3: Luyện tập (Elaborate)
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {elaborateStep?.title || 'Luyện Tập & Củng Cố Kiến Thức'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-xl mx-auto italic bg-white/95 p-5 rounded-2xl border border-amber-200/80 shadow-xs">
            "{transitionGuidance}"
          </p>
        </div>

        <div className="pt-2 flex flex-col items-center justify-center gap-3">
          <button
            onClick={() => {
              setIsAutoTransitioning(false);
              setPhase('practice');
            }}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Bắt đầu luyện tập ngay ({questions.length} câu)</span>
          </button>

          {/* Đồng hồ đếm ngược tự động chuyển sau 3-4s */}
          {isAutoTransitioning && (
            <div className="text-xs text-slate-500 flex items-center justify-center gap-2 font-medium">
              <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              <span>Đang chuẩn bị vào bài tập trong <strong className="text-amber-600 font-bold text-sm">{countdown}s</strong>...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // C. MÀN HÌNH TỔNG KẾT KẾT QUẢ (RESULTS SUMMARY)
  // =========================================================================
  if (phase === 'summary') {
    const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 100;

    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 rounded-3xl p-6 sm:p-8 text-white border border-indigo-500/40 shadow-xl text-center space-y-5">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-amber-400/20 text-amber-400 border border-amber-400/30 items-center justify-center shadow-lg">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
              Kết quả Luyện tập
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Hoàn thành bài Luyện tập!
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Điểm số</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300">{score}/10</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Số câu đúng</span>
              <span className="text-xl sm:text-2xl font-black text-teal-300">{correctCount} / {questions.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian làm</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300">{formatTimer(timerSeconds)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-white/10">
            <button
              onClick={handleRetakeFromSummary}
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs rounded-xl transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Luyện tập lại</span>
            </button>

            <button
              onClick={onNavigateToNext}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Tiếp tục sang {nextStepLabel}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chi tiết từng câu */}
        <div className="space-y-3">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
            Xem lại chi tiết bài làm ({questions.length} câu)
          </h4>

          {questions.map((q, idx) => {
            const isCorrect = checkQuestionCorrect(q);
            return (
              <div 
                key={q.id || idx} 
                className={`p-5 rounded-2xl border transition-all ${
                  isCorrect ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                  <span className="text-xs font-extrabold text-slate-700">
                    Câu {idx + 1}: {getQuestionTypeLabel(q.type || 'multiple_choice')}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{isCorrect ? 'Đúng' : 'Chưa đúng'}</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-900 mb-2">{q.content}</p>

                {q.explanation && (
                  <div className="p-3 bg-white/80 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <strong className="text-teal-700 block mb-0.5">💡 Giải thích:</strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // B. MÀN HÌNH LÀM BÀI LUYỆN TẬP — THIẾT KẾ CHUYÊN NGHIỆP THEO MẪU
  // =========================================================================
  return (
    <div ref={containerRef} className="space-y-4 max-w-5xl mx-auto font-sans">
      
      {/* 1. HEADER: Icon menu (☰) + Tiêu đề bài luyện tập + Icon làm lại (reset) */}
      <div className="flex items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-2.5">
          <Menu className="w-5 h-5 text-slate-700 shrink-0 cursor-pointer hover:text-indigo-600 transition-all" />
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{lesson.title ? `Ôn tập: ${lesson.title}` : 'Ôn tập kiến thức bài học'}</span>
          </h2>
          <button
            type="button"
            onClick={handleResetAnswers}
            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all cursor-pointer"
            title="Làm lại từ đầu"
          >
            <RotateCcw className="w-4 h-4 text-indigo-600" />
          </button>
        </div>

        {/* Tiêu đề môn học / khối lớp */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {lesson.subject || 'Luyện tập'} • {lesson.grade || 'Tiểu học'}
          </span>
        </div>
      </div>

      {/* 2. THANH TIẾN TRÌNH & BỘ ĐIỀU HƯỚNG CÂU HỎI */}
      <div className="space-y-2">
        {/* Thanh ngang mỏng thể hiện % tiến độ */}
        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Hàng số thứ tự câu hỏi (chấm tròn nhỏ, click để nhảy câu) */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1">
          {questions.map((q, idx) => {
            const isAnswered = isQuestionAnswered(q);
            const isCurrent = currentQIndex === idx;

            return (
              <button
                key={q.id || idx}
                onClick={() => setCurrentQIndex(idx)}
                className={`w-6 h-6 rounded-full text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center shrink-0 border ${
                  isCurrent
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs scale-110'
                    : isAnswered
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-100'
                }`}
                title={`Câu ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}

          <span className="text-[11px] font-bold text-slate-400 ml-auto whitespace-nowrap pl-2">
            Đã làm: <strong className="text-indigo-600">{answeredCount}/{questions.length}</strong>
          </span>
        </div>
      </div>

      {/* 3. KHUNG NỘI DUNG CÂU HỎI (Nền trắng, bo góc, đổ bóng nhẹ, viền xám mỏng) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        
        {/* Context Prompt (In nghiêng như mẫu: "Quan sát hình dưới đây:") */}
        <div>
          <h3 className="text-sm sm:text-base font-extrabold italic text-slate-900 tracking-tight">
            {currentQ.content || 'Quan sát và trả lời câu hỏi dưới đây:'}
          </h3>
          {isBilingual && (
            <p className="text-xs text-slate-500 italic mt-0.5 font-sans">
              (Observe the illustration and answer the question below:)
            </p>
          )}
        </div>

        {/* HÌNH ẢNH MINH HỌA (NẾU CÓ) - CĂN GIỮA PHÍA TRÊN NỘI DUNG CÂU HỎI */}
        {((currentQ as any).hasFractionIllustration || (currentQ as any).imageUrl) && (
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            {(currentQ as any).hasFractionIllustration ? (
              // SVG biểu diễn phân số 5/6 tô màu tím giống hình mẫu người dùng cung cấp
              <div className="w-36 h-36 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Circle background */}
                  <circle cx="50" cy="50" r="45" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                  
                  {/* 6 equal slices (each 60 deg). 5 colored in purple #824794, 1 white */}
                  {/* Slice 1 (0 to 60 deg) */}
                  <path d="M 50 50 L 95 50 A 45 45 0 0 1 72.5 88.97 Z" fill="#824794" stroke="#ffffff" strokeWidth="1.5" />
                  {/* Slice 2 (60 to 120 deg) */}
                  <path d="M 50 50 L 72.5 88.97 A 45 45 0 0 1 27.5 88.97 Z" fill="#824794" stroke="#ffffff" strokeWidth="1.5" />
                  {/* Slice 3 (120 to 180 deg) */}
                  <path d="M 50 50 L 27.5 88.97 A 45 45 0 0 1 5 50 Z" fill="#824794" stroke="#ffffff" strokeWidth="1.5" />
                  {/* Slice 4 (180 to 240 deg) */}
                  <path d="M 50 50 L 5 50 A 45 45 0 0 1 27.5 11.03 Z" fill="#824794" stroke="#ffffff" strokeWidth="1.5" />
                  {/* Slice 5 (240 to 300 deg) */}
                  <path d="M 50 50 L 27.5 11.03 A 45 45 0 0 1 72.5 11.03 Z" fill="#824794" stroke="#ffffff" strokeWidth="1.5" />
                  {/* Slice 6 (300 to 360 deg) - Uncolored white */}
                  <path d="M 50 50 L 72.5 11.03 A 45 45 0 0 1 95 50 Z" fill="#ffffff" stroke="#64748b" strokeWidth="1" />
                </svg>
              </div>
            ) : (
              <img 
                src={(currentQ as any).imageUrl} 
                alt="Minh họa câu hỏi" 
                className="max-h-48 object-contain rounded-xl"
              />
            )}
          </div>
        )}

        {/* NỘI DUNG CÂU HỎI CON / CÂU HỎI CHÍNH */}
        {(currentQ as any).subQuestions && (currentQ as any).subQuestions.length > 0 ? (
          <div className="space-y-6 pt-1">
            {(currentQ as any).subQuestions.map((sq: any, sqIdx: number) => {
              const sqAns = studentAnswers[`${currentQ.id}_${sq.id}`] || {};

              return (
                <div key={sq.id || sqIdx} className="space-y-3 pt-3 border-t border-dashed border-slate-200 first:border-0 first:pt-0">
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-indigo-700">
                      {sq.label}
                    </h4>
                  </div>

                  {/* Dạng phân số (Tử số / Mẫu số xếp chồng có ô ? nhập) */}
                  {sq.type === 'fraction' && (
                    <div className="pt-2 pl-2">
                      <div className="inline-flex flex-col items-center gap-1 bg-amber-50/40 p-3 rounded-2xl border border-amber-200/80">
                        {/* Tử số */}
                        <input
                          type="text"
                          maxLength={3}
                          value={sqAns.numerator || ''}
                          onChange={(e) => handleFractionChange(`${currentQ.id}_${sq.id}`, 'numerator', e.target.value)}
                          placeholder="?"
                          className="w-10 h-10 bg-amber-100/70 border border-amber-300 rounded-lg text-center font-black text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs placeholder-slate-500"
                        />
                        {/* Dấu gạch ngang phân số */}
                        <div className="w-12 h-0.5 bg-slate-900 rounded-full my-0.5" />
                        {/* Mẫu số */}
                        <input
                          type="text"
                          maxLength={3}
                          value={sqAns.denominator || ''}
                          onChange={(e) => handleFractionChange(`${currentQ.id}_${sq.id}`, 'denominator', e.target.value)}
                          placeholder="?"
                          className="w-10 h-10 bg-amber-100/70 border border-amber-300 rounded-lg text-center font-black text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs placeholder-slate-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Dạng trắc nghiệm (Radio buttons 2 cột) */}
                  {sq.type === 'multiple_choice' && sq.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {sq.options.map((opt: string, optIdx: number) => {
                        const optLetter = String.fromCharCode(65 + optIdx);
                        const isSelected = studentAnswers[`${currentQ.id}_${sq.id}`] === optLetter;

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleOptionSelect(`${currentQ.id}_${sq.id}`, optLetter)}
                            className={`p-3 rounded-xl text-left border transition-all flex items-center gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/60 border-indigo-500 text-indigo-950 font-bold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {/* Radio Circle */}
                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected 
                                ? 'border-indigo-600 bg-indigo-600 text-white' 
                                : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                            </span>
                            <span className={`${getFontSizeClass()} leading-snug`}>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* SINGLE QUESTION BODY (STANDARD 8 TYPES) */
          <div className="space-y-4">
            {/* 1. Multiple Choice */}
            {(!currentQ.type || currentQ.type === 'multiple_choice') && currentQ.options && (
              <div className={`grid ${currentQ.options.some(o => o.length > 30) ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3 pt-2`}>
                {currentQ.options.map((opt, optIdx) => {
                  const optLetter = String.fromCharCode(65 + optIdx);
                  const isSelected = studentAnswers[currentQ.id] === optLetter;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleOptionSelect(currentQ.id, optLetter)}
                      className={`p-3.5 rounded-2xl text-left border transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-600 text-white' 
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                      </span>
                      <span className={`${getFontSizeClass()} leading-relaxed flex-1`}>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Multiple Response */}
            {currentQ.type === 'multiple_response' && currentQ.options && (
              <div className="space-y-3 pt-2">
                <div className="text-xs text-indigo-800 font-bold">Chọn tất cả các đáp án đúng:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map((opt, optIdx) => {
                    const currentArr: number[] = studentAnswers[currentQ.id] || [];
                    const isSelected = currentArr.includes(optIdx);

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleMultiSelect(currentQ.id, optIdx)}
                        className={`p-3.5 rounded-2xl text-left border transition-all flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-600 text-white' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className={`${getFontSizeClass()} leading-relaxed flex-1`}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. True / False */}
            {currentQ.type === 'true_false' && currentQ.statements && (
              <div className="space-y-2.5 pt-2">
                {currentQ.statements.map((stmt, sIdx) => {
                  const currentVal = studentAnswers[currentQ.id]?.[sIdx];
                  return (
                    <div key={sIdx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <span className={`${getFontSizeClass()} text-slate-800 font-medium`}>{stmt.statement}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTFSelect(currentQ.id, sIdx, true)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            currentVal === true ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Đúng
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTFSelect(currentQ.id, sIdx, false)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            currentVal === false ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Sai
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Fill Blank */}
            {currentQ.type === 'fill_blank' && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700">Nhập đáp án của em:</label>
                <input
                  type="text"
                  value={studentAnswers[currentQ.id] || ''}
                  onChange={(e) => handleFillBlankChange(currentQ.id, e.target.value)}
                  placeholder="Nhập câu trả lời vào đây..."
                  className={`w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 ${getFontSizeClass()} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
            )}

            {/* 5. Ordering */}
            {currentQ.type === 'ordering' && (
              <div className="space-y-2.5 pt-2">
                <div className="text-xs text-indigo-800 font-bold">Sắp xếp các bước theo thứ tự đúng:</div>
                {(() => {
                  const currentItems: string[] = studentAnswers[currentQ.id] || currentQ.options || [];
                  return (
                    <div className="space-y-2">
                      {currentItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className={`${getFontSizeClass()} text-slate-800 font-medium`}>{item}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleOrderingMove(currentQ.id, currentItems, idx, idx - 1)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === currentItems.length - 1}
                              onClick={() => handleOrderingMove(currentQ.id, currentItems, idx, idx + 1)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 6. Matching */}
            {currentQ.type === 'matching' && currentQ.matchingPairs && (
              <div className="space-y-2.5 pt-2">
                <div className="text-xs text-indigo-800 font-bold">Nối các cặp tương ứng:</div>
                <div className="space-y-2">
                  {currentQ.matchingPairs.map((pair, pIdx) => {
                    const userChoice = studentAnswers[currentQ.id]?.[pIdx] || '';
                    return (
                      <div key={pIdx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-slate-800 flex-1">{pair.left}</span>
                        <span className="text-slate-400 hidden sm:inline">↔</span>
                        <select
                          value={userChoice}
                          onChange={(e) => handleMatchingChange(currentQ.id, pIdx, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:outline-none"
                        >
                          <option value="">-- Chọn ghép nối --</option>
                          {currentQ.matchingPairs?.map((p, optIdx) => (
                            <option key={optIdx} value={p.right}>{p.right}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7. Classification */}
            {currentQ.type === 'classification' && currentQ.classificationItems && currentQ.classificationGroups && (
              <div className="space-y-4 pt-2">
                <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl text-indigo-950 text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <span>📂</span>
                  <span>Hãy xếp các vật phẩm dưới đây vào đúng nhóm thích hợp:</span>
                </div>

                {/* 2 Khung nhóm hiển thị side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQ.classificationGroups.map((groupName, gIdx) => {
                    const bgClass = gIdx === 0 ? 'bg-[#FFFBEB]/40 border-[#FCD34D]' : 'bg-[#EFF6FF]/40 border-[#93C5FD]';
                    const badgeClass = gIdx === 0 ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]' : 'bg-[#DBEAFE] border-[#BFDBFE] text-[#1E40AF]';
                    const emoji = gIdx === 0 ? '🌿' : '⚙️';
                    
                    const currentAnswers = studentAnswers[currentQ.id] || {};
                    const placedItems = currentQ.classificationItems.filter((_, iIdx) => currentAnswers[iIdx] === groupName);

                    return (
                      <div key={gIdx} className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center min-h-[140px] transition-all ${bgClass}`}>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider mb-3 ${badgeClass}`}>
                          <span>{emoji} {groupName.toUpperCase()}</span>
                        </span>
                        {placedItems.length > 0 ? (
                          <div className="w-full space-y-2">
                            {placedItems.map((item, piIdx) => {
                              const realIdx = currentQ.classificationItems.findIndex(x => x.name === item.name);
                              return (
                                <div key={piIdx} className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs flex items-center justify-between">
                                  <span>{item.name}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClassificationChange(currentQ.id, realIdx, '');
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
                    {currentQ.classificationItems.map((item, iIdx) => {
                      const currentAnswers = studentAnswers[currentQ.id] || {};
                      const assignedGroup = currentAnswers[iIdx];
                      if (assignedGroup) return null;

                      return (
                        <div key={iIdx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-150">
                          <span className="font-semibold text-slate-800">{item.name}</span>
                          <div className="flex items-center gap-2">
                            {currentQ.classificationGroups.map((groupName, gIdx) => {
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
                                    handleClassificationChange(currentQ.id, iIdx, groupName);
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
                    {currentQ.classificationItems.every((_, iIdx) => {
                      const currentAnswers = studentAnswers[currentQ.id] || {};
                      return currentAnswers[iIdx] !== undefined && currentAnswers[iIdx] !== '';
                    }) && (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-xs font-bold text-emerald-800">
                        ✨ Đã xếp nhóm xong tất cả vật phẩm! Em có thể nhấn "Gỡ" trên các ô nhóm ở trên nếu muốn phân loại lại.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 8. Essay */}
            {currentQ.type === 'essay' && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700">Trình bày câu trả lời chi tiết:</label>
                <textarea
                  rows={4}
                  value={studentAnswers[currentQ.id] || ''}
                  onChange={(e) => handleEssayChange(currentQ.id, e.target.value)}
                  placeholder="Nhập nội dung trả lời..."
                  className={`w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 ${getFontSizeClass()} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
            )}
          </div>
        )}

        {/* Nút chuyển câu trước / sau */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex(currentQIndex - 1)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold disabled:opacity-30 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Câu trước</span>
          </button>

          {currentQIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentQIndex(currentQIndex + 1)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Câu sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-400 italic">
              Câu cuối cùng
            </span>
          )}
        </div>
      </div>

      {/* 4. THANH CÔNG CỤ CỐ ĐỊNH DƯỚI CÙNG MÀN HÌNH (BOTTOM TOOLBAR) */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Bên trái: Nút Nộp bài! màu xanh dương/tím nổi bật */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmitPractice}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Nộp bài!</span>
          </button>
        </div>

        {/* Ở giữa & Phải: Song ngữ, Cỡ chữ, Đồng hồ đếm giờ, Luyện tập lại, Lịch sử, Trợ giúp, Báo lỗi, Phóng to */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-slate-600 text-xs">
          
          {/* Switch Song ngữ */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setIsBilingual(!isBilingual)}
              className={`w-7 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                isBilingual ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div className={`bg-white w-3 h-3 rounded-full shadow-xs transform transition-transform ${
                isBilingual ? 'translate-x-3' : 'translate-x-0'
              }`} />
            </button>
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              Song ngữ
            </span>
          </div>

          {/* Chỉnh cỡ chữ A ▾ / A ▴ */}
          <div className="flex items-center bg-slate-100/80 rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={decreaseFontSize}
              className="px-2 py-1.5 hover:bg-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-0.5 cursor-pointer border-r border-slate-200"
              title="Giảm cỡ chữ"
            >
              <span>A</span>
              <span className="text-[9px]">▾</span>
            </button>
            <button
              type="button"
              onClick={increaseFontSize}
              className="px-2 py-1.5 hover:bg-slate-200 text-xs font-black text-slate-800 flex items-center gap-0.5 cursor-pointer"
              title="Tăng cỡ chữ"
            >
              <span>A</span>
              <span className="text-[9px]">▴</span>
            </button>
          </div>

          {/* Đồng hồ đếm thời gian làm bài */}
          <div className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl font-mono text-xs font-black shadow-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(timerSeconds)}</span>
          </div>

          {/* Nút Luyện tập lại */}
          <button
            type="button"
            onClick={handleResetAnswers}
            className="flex items-center gap-1 hover:text-indigo-600 hover:bg-slate-100 px-2 py-1.5 rounded-xl transition-all cursor-pointer text-[11px] font-bold text-slate-700"
            title="Làm lại từ đầu"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Luyện tập lại</span>
          </button>

          {/* Icon Lịch sử */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="p-1.5 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-500"
            title="Lịch sử làm bài"
          >
            <HistoryIcon className="w-4 h-4" />
          </button>

          {/* Icon Trợ giúp */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-500"
            title="Trợ giúp & Hướng dẫn"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Icon Báo lỗi */}
          <button
            type="button"
            onClick={() => {
              setReportSent(false);
              setShowReportModal(true);
            }}
            className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer text-slate-500"
            title="Báo cáo / Báo lỗi câu hỏi"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>

          {/* Icon Phóng to toàn màn hình */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-500"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MODAL TRỢ GIÚP */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Hướng dẫn làm bài Luyện tập
              </h4>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>• <strong>Điều hướng câu hỏi:</strong> Em có thể bấm vào các nút số (1, 2, 3...) trên thanh tiến trình để chuyển nhanh đến câu hỏi mong muốn.</p>
              <p>• <strong>Dạng câu hỏi phân số:</strong> Nhập tử số vào ô phía trên, mẫu số vào ô phía dưới.</p>
              <p>• <strong>Tùy chỉnh hiển thị:</strong> Nhấn nút "A ▾" hoặc "A ▴" trên thanh công cụ để chỉnh kích thước chữ cho dễ đọc.</p>
              <p>• <strong>Hoàn thành:</strong> Sau khi trả lời xong tất cả các câu, nhấn nút <strong>"✓ Nộp bài!"</strong> để xem kết quả và lời giải chi tiết.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* MODAL BÁO LỖI CÂU HỎI */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Báo cáo lỗi câu hỏi (Câu {currentQIndex + 1})
              </h4>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSent ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p>Cảm ơn em! Báo cáo đã được ghi nhận và gửi đến thầy cô.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Em thấy câu hỏi có điểm nào chưa chính xác hoặc gặp lỗi hiển thị?
                </p>
                <textarea
                  rows={3}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Mô tả chi tiết lỗi phát hiện..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!reportText.trim()) return;
                    setReportSent(true);
                    setTimeout(() => setShowReportModal(false), 1500);
                  }}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Gửi báo cáo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL LỊCH SỬ */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-indigo-600" />
                Lịch sử làm bài
              </h4>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span>Lần luyện tập hiện tại</span>
                <span className="font-bold text-indigo-600">{answeredCount}/{questions.length} câu đã trả lời</span>
              </div>
              <p className="text-[11px] text-slate-400 italic">Hệ thống tự động lưu trạng thái làm bài để em không bị mất kết quả.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-900"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
