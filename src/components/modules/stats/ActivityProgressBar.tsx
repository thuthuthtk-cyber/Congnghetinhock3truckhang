import React from 'react';
import { Activity5EStats } from './types';
import { Sparkles, Compass, BookOpen, Layers, CheckSquare } from 'lucide-react';

interface ActivityProgressBarProps {
  activities: Activity5EStats[];
}

export const ActivityProgressBar: React.FC<ActivityProgressBarProps> = ({ activities }) => {
  const getIcon = (key: string) => {
    switch (key) {
      case 'engage':
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      case 'explore':
        return <Compass className="w-3.5 h-3.5 text-blue-500" />;
      case 'explain':
        return <BookOpen className="w-3.5 h-3.5 text-indigo-500" />;
      case 'elaborate':
        return <Layers className="w-3.5 h-3.5 text-teal-500" />;
      case 'evaluate':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return null;
    }
  };

  const getProgressColorClass = (pct: number) => {
    if (pct < 30) return 'bg-rose-500';
    if (pct <= 70) return 'bg-amber-500';
    return 'bg-[#00875A]';
  };

  const getBadgeColorClass = (pct: number) => {
    if (pct < 30) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (pct <= 70) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00875A]" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Tiến độ 5 hoạt động học tập (Chuẩn 5E)
          </h3>
        </div>
        <div className="text-[11px] font-medium text-slate-400">
          Tỷ lệ hoàn thành từng hoạt động
        </div>
      </div>

      {/* 5 Horizontal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {(activities || []).map((act, index) => {
          const colorClass = getProgressColorClass(act.completedPct);
          const badgeClass = getBadgeColorClass(act.completedPct);

          return (
            <div
              key={act.key}
              className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 hover:border-slate-300/80 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header of card: Step number + Name + Icon */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="flex-shrink-0">{getIcon(act.key)}</span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {index + 1}. {act.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                    {act.stepCode}
                  </span>
                </div>

                {/* Number completed & percentage */}
                <div className="flex items-baseline justify-between mt-2 mb-1.5">
                  <span className="text-lg font-black text-slate-800">
                    {act.completedCount}
                    <span className="text-xs font-normal text-slate-400">
                      /{act.totalStudents}
                    </span>
                  </span>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${badgeClass}`}
                  >
                    {act.completedPct}%
                  </span>
                </div>
              </div>

              {/* Progress bar with dynamic color (<30% red, 30-70% orange, >70% green) */}
              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                  style={{ width: `${Math.min(100, Math.max(0, act.completedPct))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
