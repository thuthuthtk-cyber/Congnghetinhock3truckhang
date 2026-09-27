import React, { useState } from 'react';
import { 
  BookOpen, 
  Clock, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  Sparkles, 
  Eye, 
  Check, 
  BookMarked,
  X,
  Send,
  HelpCircle
} from 'lucide-react';
import { HomeworkAssignment, QuestionItem } from '../../types';

interface QuizTakingViewProps {
  assignment: HomeworkAssignment;
  onClose: () => void;
  onSubmit: (submission: {
    id: string;
    title: string;
    subject: string;
    rank: string;
    score: string;
    submittedTime: string;
    assignment: HomeworkAssignment;
    answers: Record<number, number>;
  }) => void;
  currentUserName?: string;
}

export const QuizTakingView: React.FC<QuizTakingViewProps> = ({
  assignment,
  onClose,
  onSubmit,
  currentUserName = 'Hà Việt Hoàng'
}) => {
  const [studentAnswers, setStudentAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const questions = assignment.questions || [];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(studentAnswers).length;
  const unansweredCount = totalQuestions - answeredCount;

  const handleSelectAnswer = (qIndex: number, optIndex: number) => {
    if (isSubmitted) return;
    setStudentAnswers(prev => ({
      ...prev,
      [qIndex]: optIndex
    }));
  };

  const scrollToQuestion = (index: number) => {
    const el = document.getElementById(`question-card-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFinalSubmit = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const studentOptIdx = studentAnswers[idx];
      const optLetter = studentOptIdx !== undefined ? String.fromCharCode(65 + studentOptIdx) : '';
      if (optLetter === q.correctAnswer || (q.options && q.options[studentOptIdx] === q.correctAnswer)) {
        correctCount++;
      }
    });

    const scoreNum = totalQuestions > 0 ? ((correctCount / totalQuestions) * 10).toFixed(1) : '10';
    const newSubmission = {
      id: `sub-${Date.now()}`,
      title: assignment.title,
      subject: assignment.subject || 'Toán',
      rank: 'Top 5 lớp 🌟',
      score: `${scoreNum} / 10`,
      submittedTime: 'Vừa xong',
      assignment: assignment,
      answers: { ...studentAnswers }
    };

    setIsSubmitted(true);
    onSubmit(newSubmission);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* 1. HEADER CỐ ĐỊNH (FIXED TOP) */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4338CA] flex items-center justify-center font-bold border border-indigo-100">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span className="text-indigo-600 font-extrabold">{assignment.subject || 'Môn học'}</span>
              <span>•</span>
              <span>{assignment.grade || 'Khối 3'}</span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate max-w-xl">
              {assignment.title}
            </h1>
          </div>
        </div>

        {/* Badge thống kê nhanh */}
        <div className="hidden md:flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Bài tập {totalQuestions}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Chưa làm {unansweredCount}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã làm {answeredCount}
          </span>
        </div>

        {/* Học sinh info & nút đóng */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-[#4338CA] text-white font-black flex items-center justify-center text-xs shadow-xs">
              {currentUserName.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900">{currentUserName}</div>
              <div className="text-[10px] text-slate-500 font-medium">Lớp 3A</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer border border-slate-200"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER: 2 COLUMNS (QUESTIONS + SIDEBAR) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 2. KHU VỰC CÂU HỎI (GIỮA, CUỘN DỌC) */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-100">
          <div className="max-w-3xl mx-auto space-y-6">
            {questions.map((q: QuestionItem, qIndex: number) => {
              const isAnswered = studentAnswers[qIndex] !== undefined;
              return (
                <div
                  key={q.id || qIndex}
                  id={`question-card-${qIndex}`}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5 transition-all hover:shadow-md"
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                        {qIndex + 1}
                      </div>
                      <span className="text-xs font-extrabold text-slate-800 tracking-wide uppercase">
                        CÂU HỎI {qIndex + 1}
                      </span>
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                        Trắc nghiệm đơn
                      </span>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                      isAnswered 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isAnswered ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                      {isAnswered ? 'Đã làm' : 'Chưa làm'}
                    </span>
                  </div>

                  {/* Question Content */}
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-relaxed">
                    {q.content}
                  </h3>

                  {/* Options List */}
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    {q.options?.map((opt: string, optIndex: number) => {
                      const isSelected = studentAnswers[qIndex] === optIndex;
                      const optLetter = String.fromCharCode(65 + optIndex);
                      return (
                        <div
                          key={optIndex}
                          onClick={() => handleSelectAnswer(qIndex, optIndex)}
                          className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 shadow-xs'
                              : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-300'
                            }`}>
                              {optLetter}
                            </div>
                            <span className="text-xs sm:text-sm font-bold leading-normal">{opt}</span>
                          </div>

                          {/* Radio button / Check indicator */}
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* 3. BẢNG ĐIỀU KHIỂN CỐ ĐỊNH (FIXED SIDEBAR PHẢI) */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-lg z-10">
          <div className="p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">Bảng điều khiển</span>
              <h3 className="text-xs font-extrabold text-slate-900 truncate mt-0.5">{assignment.title}</h3>
            </div>

            {/* 2 Ô thống kê cạnh nhau */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Điểm</div>
                <div className="text-lg font-black text-slate-900 mt-1">--</div>
                <div className="text-[9px] text-slate-400 mt-0.5">(Tính sau khi nộp)</div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 text-center shadow-xs bg-emerald-50/30">
                <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Đã làm</div>
                <div className="text-lg font-black text-emerald-700 mt-1">
                  {answeredCount}/{totalQuestions}
                </div>
                <div className="text-[9px] text-emerald-600 mt-0.5 font-bold">câu hỏi</div>
              </div>
            </div>
          </div>

          {/* DANH SÁCH CÂU HỎI GRID */}
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Danh sách câu hỏi</h4>
              <span className="text-[10px] text-slate-400">Click để chuyển câu</span>
            </div>

            {/* Chú thích màu */}
            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Đã làm ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-white"></span>
                <span>Chưa làm ({unansweredCount})</span>
              </div>
            </div>

            {/* Lưới ô số */}
            <div className="grid grid-cols-5 gap-2.5 pt-2">
              {questions.map((_, idx) => {
                const isAnswered = studentAnswers[idx] !== undefined;
                return (
                  <button
                    key={idx}
                    onClick={() => scrollToQuestion(idx)}
                    className={`h-11 rounded-2xl font-black text-xs transition-all flex flex-col items-center justify-center relative cursor-pointer border ${
                      isAnswered
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs hover:bg-emerald-100'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isAnswered ? 'bg-emerald-600' : 'bg-slate-300'}`}></span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* NÚT NỘP BÀI CỐ ĐỊNH Ở ĐÁY SIDEBAR */}
          <div className="p-4 bg-white border-t border-slate-200">
            <button
              onClick={() => {
                if (unansweredCount > 0) {
                  setShowConfirmModal(true);
                } else {
                  handleFinalSubmit();
                }
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Nộp bài & Hoàn thành</span>
            </button>
          </div>
        </aside>
      </div>

      {/* CONFIRM MODAL IF UNANSWERED QUESTIONS */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Vẫn còn câu hỏi chưa trả lời!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Em còn <strong className="text-amber-600 font-bold">{unansweredCount} câu hỏi</strong> chưa hoàn thành. Em có chắc chắn muốn nộp bài ngay bây giờ không?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleFinalSubmit();
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Vẫn nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
