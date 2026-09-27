import React, { useState, useMemo } from 'react';
import {
  Student5EProgress,
  ActivityDetail,
  ActivityStatus
} from './types';
import {
  Search,
  CheckCircle2,
  Clock,
  Minus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Filter,
  Users
} from 'lucide-react';

interface StudentProgressTableProps {
  students: Student5EProgress[];
  targetClasses: string[];
  assignedDateStr?: string;
}

type SortField = 'stt' | 'name' | 'progress' | 'rating';
type SortDirection = 'asc' | 'desc';

export const StudentProgressTable: React.FC<StudentProgressTableProps> = ({
  students,
  targetClasses,
  assignedDateStr
}) => {
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('stt');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Tooltip hover state
  const [activeTooltip, setActiveTooltip] = useState<{ id: string; text: string; x: number; y: number } | null>(null);

  // Toggle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'progress' || field === 'rating' ? 'desc' : 'asc');
    }
  };

  // Filtered & sorted student list
  const processedStudents = useMemo(() => {
    let result = [...students];

    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        s =>
          s.studentName.toLowerCase().includes(q) ||
          s.studentCode.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q)
      );
    }

    // 2. Class filter
    if (classFilter !== 'all') {
      result = result.filter(s => s.className === classFilter);
    }

    // 3. Status filter
    if (statusFilter === 'completed') {
      result = result.filter(s => s.progressPct >= 100);
    } else if (statusFilter === 'in_progress') {
      result = result.filter(s => s.progressPct > 0 && s.progressPct < 100);
    } else if (statusFilter === 'not_started') {
      result = result.filter(s => s.progressPct === 0);
    }

    // 4. Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'progress') {
        cmp = a.progressPct - b.progressPct;
      } else if (sortField === 'rating') {
        const rank = { good: 3, pass: 2, need_effort: 1 };
        cmp = rank[a.rating] - rank[b.rating];
      } else if (sortField === 'name') {
        cmp = a.studentName.localeCompare(b.studentName, 'vi');
      } else {
        cmp = a.stt - b.stt;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [students, searchQuery, classFilter, statusFilter, sortField, sortDir]);

  // Render 5E activity icon
  const renderActivityIcon = (act: ActivityDetail, tooltipId: string) => {
    let icon = null;
    let badgeClass = '';
    let tooltipText = act.label;

    if (act.status === 'completed') {
      icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      badgeClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
      tooltipText = `✅ ${act.label}: Đã hoàn thành${act.completedAt ? ` (${act.completedAt})` : ''}${act.score ? ` • Điểm: ${act.score}` : ''}`;
    } else if (act.status === 'in_progress') {
      icon = <Clock className="w-4 h-4 text-amber-500 animate-pulse" />;
      badgeClass = 'bg-amber-50 border-amber-200 text-amber-700';
      tooltipText = `🕐 ${act.label}: Đang làm dở${act.timeSpentMinutes ? ` (đã học ${act.timeSpentMinutes} phút)` : ''}`;
    } else {
      icon = <Minus className="w-3.5 h-3.5 text-slate-300" />;
      badgeClass = 'bg-slate-50 border-slate-200 text-slate-400';
      tooltipText = `⚪ ${act.label}: Chưa bắt đầu`;
    }

    return (
      <div
        className="relative group inline-flex items-center justify-center cursor-help"
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setActiveTooltip({
            id: tooltipId,
            text: tooltipText,
            x: rect.left + rect.width / 2,
            y: rect.top - 8
          });
        }}
        onMouseLeave={() => setActiveTooltip(null)}
      >
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-110 ${badgeClass}`}>
          {icon}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* FILTER TOOLBAR */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative min-w-[220px] sm:min-w-[280px] flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh, mã số..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Filters & Count */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Tất cả các lớp ({students?.length || 0})</option>
              {(targetClasses || []).map((cls) => {
                const count = students.filter(s => s.className === cls).length;
                return (
                  <option key={cls} value={cls}>
                    {cls} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Đã hoàn thành (100%)</option>
              <option value="in_progress">Đang học</option>
              <option value="not_started">Chưa bắt đầu</option>
            </select>
          </div>

          {/* Results count */}
          <div className="text-xs font-semibold text-slate-500 px-2 py-1 bg-slate-100/80 rounded-lg">
            Hiển thị: <span className="text-[#00875A] font-bold">{processedStudents.length}</span>/{students.length} học sinh
          </div>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50/90 text-slate-600 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-3 px-3 font-extrabold w-12 text-center">STT</th>
              <th className="py-3 px-3 font-extrabold min-w-[170px]">Học sinh</th>
              <th className="py-3 px-2 font-extrabold text-center w-20">Lớp</th>

              {/* 5 5E activities columns */}
              <th className="py-3 px-2 font-extrabold text-center w-16" title="Khởi động (Engage)">
                Khởi động
              </th>
              <th className="py-3 px-2 font-extrabold text-center w-16" title="Khám phá (Explore)">
                Khám phá
              </th>
              <th className="py-3 px-2 font-extrabold text-center w-16" title="Luyện tập (Explain)">
                Luyện tập
              </th>
              <th className="py-3 px-2 font-extrabold text-center w-16" title="Vận dụng (Elaborate)">
                Vận dụng
              </th>
              <th className="py-3 px-2 font-extrabold text-center w-16" title="Đánh giá (Evaluate)">
                Đánh giá
              </th>

              {/* Sortable: Tiến độ */}
              <th
                onClick={() => handleSort('progress')}
                className="py-3 px-3 font-extrabold min-w-[130px] cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Tiến độ</span>
                  {sortField === 'progress' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00875A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00875A]" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Sortable: Xếp loại */}
              <th
                onClick={() => handleSort('rating')}
                className="py-3 px-3 font-extrabold min-w-[110px] cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Xếp loại</span>
                  {sortField === 'rating' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00875A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00875A]" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>

              <th className="py-3 px-3 font-extrabold min-w-[200px]">
                Nhận xét & Hoạt động gần nhất
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {processedStudents.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-500">Không tìm thấy học sinh nào phù hợp bộ lọc</p>
                    <p className="text-[11px] text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt tiêu chí lọc</p>
                  </div>
                </td>
              </tr>
            ) : (
              (processedStudents || []).map((st, idx) => {
                // Warning highlight condition: 0% progress and unstarted
                const isAtRiskRow = st.isAtRisk;

                return (
                  <tr
                    key={st.studentId}
                    className={`transition-colors hover:bg-slate-50/70 ${
                      isAtRiskRow
                        ? 'bg-rose-50/60 border-l-4 border-rose-500'
                        : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                    }`}
                  >
                    {/* STT */}
                    <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                      {st.stt}
                    </td>

                    {/* Học sinh: Avatar + Tên + Mã */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm flex-shrink-0 shadow-2xs border border-slate-200">
                          {st.avatar || '👤'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-xs truncate">
                            {st.studentName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            Mã: {st.studentCode}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Lớp */}
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px]">
                        {st.className}
                      </span>
                    </td>

                    {/* 5 5E activities */}
                    <td className="py-2.5 px-2 text-center">
                      {renderActivityIcon(st.engage, `engage-${st.studentId}`)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {renderActivityIcon(st.explore, `explore-${st.studentId}`)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {renderActivityIcon(st.explain, `explain-${st.studentId}`)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {renderActivityIcon(st.elaborate, `elaborate-${st.studentId}`)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {renderActivityIcon(st.evaluate, `evaluate-${st.studentId}`)}
                    </td>

                    {/* Cột Tiến độ */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={`font-black ${
                              st.progressPct >= 80
                                ? 'text-emerald-700'
                                : st.progressPct >= 50
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {st.progressPct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              st.progressPct >= 80
                                ? 'bg-[#00875A]'
                                : st.progressPct >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${st.progressPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Cột Xếp loại */}
                    <td className="py-2.5 px-3">
                      {st.rating === 'good' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px]">
                          <span>🎯</span>
                          <span>Tốt</span>
                        </span>
                      ) : st.rating === 'pass' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[11px]">
                          <span>👍</span>
                          <span>Đạt</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">
                          <span>💪</span>
                          <span>Cần cố gắng</span>
                        </span>
                      )}
                    </td>

                    {/* Nhận xét & Hoạt động gần nhất */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {isAtRiskRow && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] flex-shrink-0">
                            <AlertCircle className="w-3 h-3" /> Cần nhắc nhở
                          </span>
                        )}
                        <span className="text-[11px] text-slate-600 truncate max-w-[240px]" title={st.lastActiveText}>
                          {st.lastActiveText}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FIXED TOOLTIP OVERLAY */}
      {activeTooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 bg-slate-900/95 text-white text-[11px] rounded-lg shadow-xl -translate-x-1/2 -translate-y-full whitespace-nowrap animate-in fade-in duration-150"
          style={{ left: activeTooltip.x, top: activeTooltip.y }}
        >
          {activeTooltip.text}
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-solid border-t-slate-900/95 border-t-4 border-x-transparent border-x-4 border-b-0" />
        </div>
      )}
    </div>
  );
};
