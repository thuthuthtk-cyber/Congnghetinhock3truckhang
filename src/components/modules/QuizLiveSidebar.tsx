import React from 'react';
import { Trophy, Users, Award, Clock, Flame, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { LiveQuizParticipant } from '../../services/liveQuizSessionService';

interface QuizLiveSidebarProps {
  targetTitle: string;
  subject?: string;
  teacherName?: string;
  totalQuestions: number;
  completedList: LiveQuizParticipant[];
  inProgressList: LiveQuizParticipant[];
  totalCompleted: number;
  totalInProgress: number;
  currentUserId?: string;
}

export const QuizLiveSidebar: React.FC<QuizLiveSidebarProps> = ({
  targetTitle,
  subject = 'Tin học',
  teacherName,
  totalQuestions,
  completedList = [],
  inProgressList = [],
  totalCompleted = 0,
  totalInProgress = 0,
  currentUserId
}) => {
  // Extract Top 3 for podium
  const top1 = completedList[0];
  const top2 = completedList[1];
  const top3 = completedList[2];
  const otherRanks = completedList.slice(3, 5);

  // Fallback avatars helper
  const getAvatarBadge = (p?: LiveQuizParticipant, defaultEmoji = '🌟') => {
    if (!p) return defaultEmoji;
    return p.studentAvatar || defaultEmoji;
  };

  return (
    <aside 
      id="quiz-live-right-column" 
      className="hidden md:flex flex-col w-72 lg:w-80 xl:w-84 shrink-0 bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden select-none"
    >
      {/* 1. TOP HEADER: EXAM TITLE & INFO */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-[10px] tracking-wide uppercase border border-indigo-100/80">
            {subject}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            • {totalQuestions} câu hỏi
          </span>
        </div>
        <h3 className="text-xs font-black text-slate-900 leading-snug line-clamp-2" title={targetTitle}>
          {targetTitle}
        </h3>
      </div>

      {/* 2. SECTION: 🏆 BẢNG XẾP HẠNG ĐIỂM CAO NHẤT (PODIUM TOP 3) */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-black text-slate-800 tracking-tight">
              Xếp hạng hàng đầu
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Top 5
          </span>
        </div>

        {completedList.length === 0 ? (
          <div className="py-6 text-center px-3 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="text-2xl mb-1">🏁</div>
            <p className="text-xs font-bold text-slate-700">Chưa có học sinh nộp bài</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Hãy là người đầu tiên ghi danh bảng vàng!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top 3 Podium (Moon.vn style) */}
            <div className="flex items-end justify-center gap-2 pt-4 pb-1">
              {/* TOP 2 (LEFT) */}
              <div className="flex flex-col items-center w-20 text-center">
                {top2 ? (
                  <>
                    <div className="relative mb-1">
                      <div className="w-11 h-11 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-lg shadow-sm">
                        {getAvatarBadge(top2, '🥈')}
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-400 text-white text-[9px] font-black flex items-center justify-center border border-white shadow-xs">
                        2
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 truncate w-full block mt-0.5">
                      {top2.studentName}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500 truncate w-full block">
                      {top2.studentClass}
                    </span>
                    <span className="text-[10px] font-black text-emerald-600 mt-0.5">
                      {top2.score !== undefined ? `${top2.score.toFixed(1)} đ` : (top2.scoreStr || '0 đ')}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs font-bold">
                      2
                    </div>
                    <span className="text-[9px] text-slate-300 font-medium mt-1">Trống</span>
                  </div>
                )}
              </div>

              {/* TOP 1 (CENTER - PROMINENT) */}
              <div className="flex flex-col items-center w-24 text-center -mt-3">
                {top1 ? (
                  <>
                    <div className="relative mb-1">
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm animate-bounce">
                        👑
                      </span>
                      <div className="w-14 h-14 rounded-full bg-amber-50 border-3 border-amber-400 flex items-center justify-center text-2xl shadow-md ring-2 ring-amber-200">
                        {getAvatarBadge(top1, '🏆')}
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-900 text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                        1
                      </span>
                    </div>
                    <span className="text-xs font-black text-slate-900 truncate w-full block mt-0.5">
                      {top1.studentName}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 truncate w-full block">
                      {top1.studentClass}
                    </span>
                    <span className="text-[11px] font-black text-emerald-600 mt-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      {top1.score !== undefined ? `${top1.score.toFixed(1)} điểm` : (top1.scoreStr || '0 điểm')}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-sm font-bold">
                      1
                    </div>
                    <span className="text-[9px] text-slate-300 font-medium mt-1">Trống</span>
                  </div>
                )}
              </div>

              {/* TOP 3 (RIGHT) */}
              <div className="flex flex-col items-center w-20 text-center">
                {top3 ? (
                  <>
                    <div className="relative mb-1">
                      <div className="w-11 h-11 rounded-full bg-amber-50/60 border-2 border-amber-600/70 flex items-center justify-center text-lg shadow-sm">
                        {getAvatarBadge(top3, '🥉')}
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] font-black flex items-center justify-center border border-white shadow-xs">
                        3
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 truncate w-full block mt-0.5">
                      {top3.studentName}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500 truncate w-full block">
                      {top3.studentClass}
                    </span>
                    <span className="text-[10px] font-black text-emerald-600 mt-0.5">
                      {top3.score !== undefined ? `${top3.score.toFixed(1)} đ` : (top3.scoreStr || '0 đ')}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs font-bold">
                      3
                    </div>
                    <span className="text-[9px] text-slate-300 font-medium mt-1">Trống</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ranks 4 & 5 (compact rows) */}
            {otherRanks.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                {otherRanks.map((r, idx) => (
                  <div 
                    key={r.id || idx}
                    className="flex items-center justify-between py-1 px-2 rounded-xl bg-white border border-slate-100 text-[11px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-bold text-[9px] flex items-center justify-center shrink-0">
                        {idx + 4}
                      </span>
                      <span className="text-xs">{getAvatarBadge(r, '👤')}</span>
                      <span className="font-bold text-slate-800 truncate">{r.studentName}</span>
                      <span className="text-[9px] text-slate-400 shrink-0">({r.studentClass})</span>
                    </div>
                    <span className="font-black text-emerald-600 shrink-0">
                      {r.score !== undefined ? `${r.score.toFixed(1)}đ` : (r.scoreStr || '0đ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. METRIC STATS ROW */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-100/60 border-b border-slate-200/80 text-center">
        <div className="bg-white py-2 px-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Đang thi</span>
          </div>
          <span className="text-base font-black text-amber-600 mt-0.5">
            {totalInProgress}
          </span>
        </div>
        <div className="bg-white py-2 px-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Tổng thí sinh</span>
          </div>
          <span className="text-base font-black text-blue-600 mt-0.5">
            {totalCompleted + totalInProgress}
          </span>
        </div>
      </div>

      {/* 4. SECTION: 👥 ĐANG LÀM BÀI (LIVE STREAM OF ACTIVE PEERS) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Đang làm bài
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] flex items-center gap-1 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time
          </span>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100/80">
          {inProgressList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 px-4">
              <p className="text-xs font-bold text-slate-600 mb-1">Chưa có thí sinh đang làm bài</p>
              <p className="text-[10px] text-slate-400">Tiến trình làm bài thực tế sẽ được cập nhật tự động tại đây.</p>
            </div>
          ) : (
            inProgressList.map((st, idx) => {
              const isMe = currentUserId && (st.studentId === currentUserId || st.id.endsWith(`_${currentUserId}`));
              
              return (
                <div 
                  key={st.id || idx}
                  className={`pt-2 first:pt-0 flex items-center justify-between gap-2.5 transition-all ${
                    isMe ? 'bg-indigo-50/70 p-2 rounded-2xl border border-indigo-200/80' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm shadow-xs">
                      {getAvatarBadge(st, '👤')}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
                  </div>

                  {/* Name & Class */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                        {st.studentName}
                      </p>
                      {isMe && (
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-1 py-0.2 rounded shrink-0">
                          (Em)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <span>{st.studentClass || 'Học sinh'}</span>
                      <span>•</span>
                      <span className="text-slate-400">Vừa xong</span>
                    </div>
                  </div>

                  {/* Status Progress Pill */}
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-extrabold text-[10px] border border-purple-100 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                      Đã làm {Math.max(0, Math.floor(Number(st.answeredCount) || 0))} câu
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info tag */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center shrink-0">
          <p className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
            <span>⚡ Dữ liệu thi đua tự động cập nhật liên tục</span>
          </p>
        </div>
      </div>
    </aside>
  );
};
