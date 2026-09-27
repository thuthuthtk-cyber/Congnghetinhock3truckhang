import React from 'react';
import { Users, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { StatsOverview } from './types';

interface StatsSummaryCardsProps {
  overview: StatsOverview;
}

export const StatsSummaryCards: React.FC<StatsSummaryCardsProps> = ({ overview }) => {
  // SVG Donut chart calculation
  const size = 120;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = overview.totalStudents || 1;
  const completedAngle = (overview.completedCount / total) * circumference;
  const inProgressAngle = (overview.inProgressCount / total) * circumference;
  const notStartedAngle = (overview.notStartedCount / total) * circumference;

  const completedOffset = 0;
  const inProgressOffset = -completedAngle;
  const notStartedOffset = -(completedAngle + inProgressAngle);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
      {/* 4 Overview Cards (Cols 1 to 8 on lg) */}
      <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Tổng số học sinh */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng học sinh
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              {overview.totalStudents}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
              Được giao bài học
            </div>
          </div>
        </div>

        {/* Card 2: Đã hoàn thành */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-all bg-linear-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Đã hoàn thành
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-700 tracking-tight">
                {overview.completedCount}
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                {overview.completedPct}%
              </span>
            </div>
            <div className="text-[11px] font-medium text-emerald-600/80 mt-0.5">
              Đạt 100% tiến độ
            </div>
          </div>
        </div>

        {/* Card 3: Đang học */}
        <div className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between hover:border-amber-200 transition-all bg-linear-to-br from-white to-amber-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Đang học
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-700 tracking-tight">
                {overview.inProgressCount}
              </span>
              <span className="text-xs font-bold text-amber-600 bg-amber-100/70 px-1.5 py-0.5 rounded-md">
                {overview.inProgressPct}%
              </span>
            </div>
            <div className="text-[11px] font-medium text-amber-600/80 mt-0.5">
              Đang làm các bước 5E
            </div>
          </div>
        </div>

        {/* Card 4: Tiến độ trung bình */}
        <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-all bg-linear-to-br from-white to-blue-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              Tiến độ TB
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-700 tracking-tight">
              {overview.avgProgressPct}%
            </div>
            <div className="text-[11px] font-medium text-blue-600/80 mt-0.5">
              Trung bình toàn lớp
            </div>
          </div>
        </div>
      </div>

      {/* Donut Chart Widget (Cols 9 to 12 on lg) */}
      <div className="lg:col-span-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        {/* SVG Donut */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="rotate-[-90deg]">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />
            {/* Not Started (Gray) */}
            {overview.notStartedCount > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#CBD5E1"
                strokeWidth={strokeWidth}
                strokeDasharray={`${notStartedAngle} ${circumference - notStartedAngle}`}
                strokeDashoffset={notStartedOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
            {/* In Progress (Amber) */}
            {overview.inProgressCount > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#F59E0B"
                strokeWidth={strokeWidth}
                strokeDasharray={`${inProgressAngle} ${circumference - inProgressAngle}`}
                strokeDashoffset={inProgressOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
            {/* Completed (Emerald) */}
            {overview.completedCount > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#00875A"
                strokeWidth={strokeWidth}
                strokeDasharray={`${completedAngle} ${circumference - completedAngle}`}
                strokeDashoffset={completedOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
          </svg>
          {/* Donut center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base font-black text-slate-800 leading-none">
              {overview.completedPct}%
            </span>
            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
              Hoàn thành
            </span>
          </div>
        </div>

        {/* Donut Legend */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00875A] flex-shrink-0" />
              <span className="font-semibold text-slate-600 truncate">Hoàn thành</span>
            </div>
            <span className="font-bold text-slate-800 ml-2">{overview.completedCount}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="font-semibold text-slate-600 truncate">Đang học</span>
            </div>
            <span className="font-bold text-slate-800 ml-2">{overview.inProgressCount}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
              <span className="font-semibold text-slate-500 truncate">Chưa học</span>
            </div>
            <span className="font-bold text-slate-600 ml-2">{overview.notStartedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
