import React from 'react';
import { Target, Sparkles, ArrowRight, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import { Lesson5EPlan } from '../../types';

// Check if Objectives is enabled and has valid content
export const checkIsObjectivesActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isObjectivesEnabled ?? true;
  if (!isEnabled) return false;
  const content = (lesson as any).objectivesContent || lesson.objectivesContent;
  return Boolean(content && typeof content === 'string' && content.trim() !== '');
};

// Helper to determine the next step after Engage
export const getNextStepAfterEngage = (lesson?: Lesson5EPlan | null, isIntroActive?: boolean, isObjectivesActive?: boolean): 'intro' | 'objectives' | 'explore' => {
  if (isIntroActive) return 'intro';
  if (isObjectivesActive) return 'objectives';
  return 'explore';
};

// Helper to determine the next step after Intro
export const getNextStepAfterIntro = (isObjectivesActive?: boolean): 'objectives' | 'explore' => {
  if (isObjectivesActive) return 'objectives';
  return 'explore';
};

interface StudentObjectivesViewProps {
  lesson: Lesson5EPlan;
  onNavigateToNext: () => void;
}

export const StudentObjectivesView: React.FC<StudentObjectivesViewProps> = ({
  lesson,
  onNavigateToNext
}) => {
  const objectivesContent = ((lesson as any).objectivesContent || lesson.objectivesContent || '').trim();
  const objectiveLines = objectivesContent.split('\n').filter((l: string) => l.trim() !== '');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header section */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold shrink-0 border border-indigo-200/60 shadow-xs">
          🎯
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
            Mục Tiêu Bài Học
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
            Kiến Thức & Năng Lực Cần Đạt Được
          </h3>
        </div>
      </div>

      {/* Objectives List Cards */}
      <div className="space-y-3 max-w-3xl mx-auto">
        <div className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600" />
          <span>Danh sách mục tiêu học tập của bài:</span>
        </div>

        {objectiveLines.length === 0 ? (
          <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center text-slate-500 text-sm italic">
            Chưa có mục tiêu cụ thể được thiết lập.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {objectiveLines.map((line: string, idx: number) => {
              const trimmed = line.trim();
              const lower = trimmed.toLowerCase();

              let badgeBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              let iconLabel = '🎯';
              let groupName = 'Mục tiêu';

              if (lower.includes('kiến thức') || lower.includes('hiểu') || lower.includes('nắm') || lower.includes('nhận biết')) {
                badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
                iconLabel = '📚';
                groupName = 'Kiến thức';
              } else if (lower.includes('kỹ năng') || lower.includes('năng lực') || lower.includes('vận dụng') || lower.includes('thực hành') || lower.includes('giải')) {
                badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
                iconLabel = '⚡';
                groupName = 'Năng lực';
              } else if (lower.includes('phẩm chất') || lower.includes('thái độ') || lower.includes('chăm chỉ') || lower.includes('trung thực') || lower.includes('yêu thích')) {
                badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                iconLabel = '🌱';
                groupName = 'Phẩm chất';
              }

              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0 mt-0.5 border border-indigo-100">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${badgeBg}`}>
                        {iconLabel} {groupName}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                      {trimmed}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="text-xs text-slate-600 font-medium">
          💡 Em đã nắm rõ các mục tiêu cần đạt? Hãy bấm tiếp tục để bước vào phần Khám phá bài học.
        </div>
        <button
          type="button"
          onClick={onNavigateToNext}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span>Tiếp tục bài học (Khám phá)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
