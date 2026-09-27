import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Lightbulb,
  Clock,
  Target
} from 'lucide-react';
import { VideoCheckpoint } from './InteractiveVideoPlayer';

export interface ExploreSummaryData {
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
}

interface ExploreSummaryModalProps {
  title?: string;
  checkpoints: VideoCheckpoint[];
  answeredCheckpoints: Record<string, { selected: any; correct: boolean; question: VideoCheckpoint }>;
  coreSummary?: string;
  onReplay: () => void;
  onComplete: (data?: ExploreSummaryData) => void;
}

const renderUserSelection = (item: { selected: any; question: VideoCheckpoint }) => {
  const q = item.question;
  const qType = q.type || 'multiple_choice';
  
  if (qType === 'multiple_choice') {
    const idx = typeof item.selected === 'number' ? item.selected : 0;
    const optText = q.options && q.options[idx] ? q.options[idx] : '';
    return `${String.fromCharCode(65 + idx)}. ${optText}`;
  }
  if (qType === 'multiple_response') {
    if (Array.isArray(item.selected)) {
      return item.selected.map((idx: number) => `${String.fromCharCode(65 + idx)}. ${q.options?.[idx] || ''}`).join('; ');
    }
    return String(item.selected);
  }
  if (qType === 'true_false') {
    return 'Các câu trả lời Đúng/Sai chưa chính xác hoàn toàn';
  }
  if (qType === 'fill_blank' || qType === 'essay') {
    return String(item.selected || '(Chưa nhập)');
  }
  if (qType === 'ordering') {
    return Array.isArray(item.selected) ? item.selected.join(' ➔ ') : 'Thứ tự chưa đúng';
  }
  if (qType === 'matching') {
    return 'Ghép nối các cặp chưa chính xác';
  }
  if (qType === 'classification') {
    return 'Phân loại các mục chưa chính xác';
  }
  return String(item.selected ?? 'Chưa trả lời');
};

const renderCorrectAnswer = (q: VideoCheckpoint) => {
  const qType = q.type || 'multiple_choice';
  if (qType === 'multiple_choice') {
    const idx = q.correctIndex ?? 0;
    const optText = q.options && q.options[idx] ? q.options[idx] : (q.correctAnswer || 'A');
    return `${String.fromCharCode(65 + idx)}. ${optText}`;
  }
  if (qType === 'multiple_response') {
    return q.correctAnswer || 'Đáp án theo hướng dẫn';
  }
  if (qType === 'fill_blank') {
    return q.correctAnswer || 'Đáp án chính xác';
  }
  if (qType === 'ordering') {
    return q.options ? q.options.join(' ➔ ') : 'Thứ tự chuẩn';
  }
  return q.correctAnswer || 'Xem giải thích chi tiết';
};

export const ExploreSummaryModal: React.FC<ExploreSummaryModalProps> = ({
  title = 'Bài học khám phá',
  checkpoints,
  answeredCheckpoints,
  coreSummary = 'Học sinh nắm vững các khái niệm trọng tâm, quan sát thí nghiệm mô phỏng và liên hệ thực tế.',
  onReplay,
  onComplete
}) => {
  const totalQuestions = checkpoints.length;
  const correctCount = Object.values(answeredCheckpoints).filter(item => item.correct).length;
  const incorrectItems = Object.values(answeredCheckpoints).filter(item => !item.correct);
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

  // Threshold coloring for percentage
  let progressColor = 'bg-emerald-500 text-emerald-400';
  let badgeBorder = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  if (percentage < 50) {
    progressColor = 'bg-rose-500 text-rose-400';
    badgeBorder = 'border-rose-500/30 bg-rose-500/10 text-rose-400';
  } else if (percentage < 80) {
    progressColor = 'bg-amber-500 text-amber-400';
    badgeBorder = 'border-amber-500/30 bg-amber-500/10 text-amber-400';
  }

  // Accordion open state for incorrect items
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setOpenAccordionId(openAccordionId === id ? null : id);
  };

  return (
    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-lg z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 overflow-y-auto">
      <div 
        className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 text-white my-auto relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing on modal click
      >
        
        {/* HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-amber-400/20 text-amber-400 border border-amber-400/30 items-center justify-center shadow-lg mb-1 animate-bounce">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Hoàn thành phần Khám phá!
          </h2>
          <p className="text-xs sm:text-sm text-indigo-300 font-medium">
            📖 {title}
          </p>
        </div>

        {/* SUMMARY STATS ROW (3 METRICS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
          
          {/* Metric 1: Correct count */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kết quả đúng</span>
              <span className="text-sm sm:text-base font-extrabold text-white">{correctCount} / {totalQuestions} câu</span>
            </div>
          </div>

          {/* Metric 2: Percentage progress */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-extrabold text-xs shrink-0 ${badgeBorder}`}>
              {percentage}%
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tỷ lệ chính xác</span>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          </div>

          {/* Metric 3: Completion time */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian học</span>
              <span className="text-xs sm:text-sm font-extrabold text-white">Hoàn tất mốc</span>
            </div>
          </div>

        </div>

        {/* CORE SUMMARY BOX ("NỘI DUNG GHI NHỚ") */}
        <div className="bg-indigo-950/60 border border-indigo-500/30 p-5 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-300 uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-300" /> 📌 Ghi nhớ nội dung Khám phá
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
            {coreSummary}
          </p>
        </div>

        {/* INCORRECT ANSWERS REVIEW OR PRAISE MESSAGE */}
        {incorrectItems.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️ Câu bạn cần xem lại ({incorrectItems.length} câu)</span>
              </span>
              <span className="text-[11px] text-slate-400">Bấm vào câu hỏi để xem chi tiết</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {incorrectItems.map((item, idx) => {
                const q = item.question;
                const isOpen = openAccordionId === q.id;
                return (
                  <div 
                    key={q.id || idx} 
                    className="bg-slate-800/90 border border-rose-500/30 rounded-xl overflow-hidden transition-all shadow-xs"
                  >
                    <button
                      onClick={() => toggleAccordion(q.id)}
                      className="w-full p-3 text-left flex items-center justify-between gap-3 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold shrink-0">
                          ✕
                        </div>
                        <span className="text-xs font-bold text-slate-200 truncate max-w-md">
                          {q.questionText}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-3 pt-0 border-t border-slate-700/60 bg-slate-900/60 space-y-2 text-xs">
                        <div className="space-y-1 pt-2">
                          <div className="flex items-start gap-2 text-rose-400 font-semibold">
                            <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>Bạn đã chọn: <strong className="text-rose-300">{renderUserSelection(item)}</strong></span>
                          </div>
                          <div className="flex items-start gap-2 text-emerald-400 font-semibold">
                            <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>Đáp án đúng: <strong className="text-emerald-300">{renderCorrectAnswer(q)}</strong></span>
                          </div>
                        </div>
                        {q.explanation && (
                          <div className="p-2.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] italic border border-slate-700">
                            💡 Giải thích: {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-1">
            <span className="text-sm font-extrabold text-emerald-400">
              🎉 Xuất sắc! Bạn đã trả lời đúng tất cả câu hỏi tương tác!
            </span>
            <p className="text-xs text-slate-300">
              Kiến thức cốt lõi của phần Khám phá đã được bạn nắm vững hoàn toàn.
            </p>
          </div>
        )}

        {/* ACTIONS FOOTER (2 BUTTONS) */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onReplay}
            className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>🔄 Học lại phần Khám phá</span>
          </button>

          <button
            onClick={() => onComplete({ accuracy: percentage, correctCount, totalQuestions })}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>✅ Hoàn tất & Tiếp tục</span>
          </button>
        </div>

      </div>
    </div>
  );
};
