import React from 'react';
import { Sparkles, Play, BookOpen, CheckCircle, HelpCircle, ArrowRight } from 'lucide-react';

interface PracticeIntroScreenProps {
  title: string;
  objective?: string;
  questionCount: number;
  onStart: () => void;
}

export const PracticeIntroScreen: React.FC<PracticeIntroScreenProps> = ({
  title,
  objective,
  questionCount,
  onStart
}) => {
  return (
    <div className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-yellow-500/10 border border-amber-500/30 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl max-w-2xl mx-auto my-8">
      <div className="inline-flex w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-500 border border-amber-500/30 items-center justify-center shadow-lg animate-bounce">
        <Sparkles className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 font-extrabold text-xs uppercase tracking-wider">
          PHẦN 3: LUYỆN TẬP (ELABORATE)
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Luyện tập: {title}
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto font-medium">
          {objective || 'Củng cố kiến thức trọng tâm bài học qua hệ thống câu hỏi tương tác, trắc nghiệm và bài tập củng cố.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto text-left">
        <div className="p-4 rounded-2xl bg-white/80 border border-amber-200/60 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Số lượng câu hỏi</span>
            <span className="text-base font-extrabold text-slate-800">{questionCount} câu hỏi</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 border border-amber-200/60 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hình thức</span>
            <span className="text-base font-extrabold text-slate-800">Trắc nghiệm & Sắp xếp</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-950/5 border border-amber-500/20 text-xs text-slate-700 font-medium max-w-lg mx-auto space-y-1">
        <div className="font-extrabold text-amber-800 flex items-center justify-center gap-1.5 mb-1">
          <HelpCircle className="w-4 h-4 text-amber-600" /> Hướng dẫn làm bài
        </div>
        <p>Đọc kỹ từng câu hỏi, suy nghĩ và chọn đáp án chính xác nhất. Hệ thống sẽ chấm điểm và cung cấp giải thích chi tiết sau khi hoàn thành.</p>
      </div>

      <div className="pt-2">
        <button
          onClick={onStart}
          className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3 mx-auto cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Bắt đầu luyện tập ngay</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
