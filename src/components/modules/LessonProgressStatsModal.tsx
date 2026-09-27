import React, { useState, useMemo } from 'react';
import { Lesson5EPlan } from '../../types';
import {
  BarChart2,
  X,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  BookOpen,
  Users,
  GraduationCap,
  Hash
} from 'lucide-react';
import { StatsSummaryCards } from './stats/StatsSummaryCards';
import { ActivityProgressBar } from './stats/ActivityProgressBar';
import { StudentProgressTable } from './stats/StudentProgressTable';
import {
  getLessonStudentsProgressData,
  calculateStatsOverview,
  calculate5EActivityStats
} from '../../services/lessonStatsService';
import * as XLSX from 'xlsx';

interface LessonProgressStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson5EPlan | null;
}

export const LessonProgressStatsModal: React.FC<LessonProgressStatsModalProps> = ({
  isOpen,
  onClose,
  lesson
}) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  // Derive lesson details
  const lessonId = lesson?.id || '';
  const lessonTitle = lesson?.title || 'Bài giảng';
  const subject = lesson?.subject || 'Công nghệ';
  const grade = lesson?.grade || 'Khối 3';

  // Compute student progress dataset
  const { students, targetClasses, assignedDateStr } = useMemo(() => {
    if (!lesson) {
      return { students: [], targetClasses: [], assignedDateStr: '' };
    }
    return getLessonStudentsProgressData(lesson.id, lesson.title, lesson.grade);
  }, [lesson]);

  // Compute summary stats & 5E stats
  const overview = useMemo(() => {
    return calculateStatsOverview(students);
  }, [students]);

  const activityStats = useMemo(() => {
    return calculate5EActivityStats(students);
  }, [students]);

  if (!isOpen || !lesson) return null;

  // Handle Export Excel
  const handleExportExcel = () => {
    try {
      setExportingExcel(true);

      // Construct worksheet rows
      const excelRows = students.map((st) => ({
        'STT': st.stt,
        'Họ và tên học sinh': st.studentName,
        'Mã học sinh': st.studentCode,
        'Lớp': st.className,
        'Khởi động': st.engage.status === 'completed' ? 'Đã hoàn thành' : st.engage.status === 'in_progress' ? 'Đang làm' : 'Chưa bắt đầu',
        'Khám phá': st.explore.status === 'completed' ? 'Đã hoàn thành' : st.explore.status === 'in_progress' ? 'Đang làm' : 'Chưa bắt đầu',
        'Luyện tập': st.explain.status === 'completed' ? `Đã hoàn thành${st.explain.score ? ` (${st.explain.score})` : ''}` : st.explain.status === 'in_progress' ? 'Đang làm' : 'Chưa bắt đầu',
        'Vận dụng': st.elaborate.status === 'completed' ? 'Đã hoàn thành' : st.elaborate.status === 'in_progress' ? 'Đang làm' : 'Chưa bắt đầu',
        'Đánh giá': st.evaluate.status === 'completed' ? `Đã hoàn thành${st.evaluate.score ? ` (${st.evaluate.score})` : ''}` : st.evaluate.status === 'in_progress' ? 'Đang làm' : 'Chưa bắt đầu',
        'Tiến độ (%)': `${st.progressPct}%`,
        'Xếp loại': st.rating === 'good' ? 'Tốt' : st.rating === 'pass' ? 'Đạt' : 'Cần cố gắng',
        'Nhận xét & Hoạt động gần nhất': st.lastActiveText
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);

      // Set nice column widths
      worksheet['!cols'] = [
        { wch: 6 },  // STT
        { wch: 25 }, // Tên
        { wch: 14 }, // Mã
        { wch: 10 }, // Lớp
        { wch: 15 }, // Khởi động
        { wch: 15 }, // Khám phá
        { wch: 18 }, // Luyện tập
        { wch: 15 }, // Vận dụng
        { wch: 18 }, // Đánh giá
        { wch: 14 }, // Tiến độ
        { wch: 14 }, // Xếp loại
        { wch: 35 }  // Nhận xét
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tiến độ học tập');

      const safeTitle = (lesson.title || 'Bai_Giang').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_').substring(0, 35);
      const fileName = `Thong_Ke_Tien_Do_${safeTitle}.xlsx`;

      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Lỗi khi xuất Excel:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
    } finally {
      setExportingExcel(false);
    }
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-slate-100 rounded-3xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 overflow-hidden ${
          isMaximized
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-6xl max-h-[92vh]'
        }`}
      >
        {/* MODAL HEADER */}
        <div className="bg-white px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          {/* Left: Icon + Titles & Metadata */}
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-[#00875A] to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0 mt-0.5">
              <BarChart2 className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              {/* Badges: Subject / Grade / Code / Students count */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BookOpen className="w-3 h-3" />
                  <span>{subject}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <GraduationCap className="w-3 h-3" />
                  <span>{grade}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span>Mã: {lesson.id.toUpperCase()}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                  <Users className="w-3 h-3" />
                  <span>{overview.totalStudents} học sinh được giao</span>
                </span>
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight truncate max-w-2xl">
                Thống kê tiến độ học tập: <span className="text-[#00875A]">{lessonTitle}</span>
              </h2>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Nút Xuất Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50"
              title="Xuất bảng thống kê ra file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            {/* Nút In */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
              title="In báo cáo thống kê"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In</span>
            </button>

            {/* Nút Phóng to / Thu nhỏ */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
              title={isMaximized ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Nút Đóng (X) */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all cursor-pointer active:scale-95"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* DẢI 4 THẺ SỐ LIỆU TỔNG QUAN + BIỂU ĐỒ TRÒN (DONUT CHART) */}
          <StatsSummaryCards overview={overview} />

          {/* KHỐI TIẾN ĐỘ 5 HOẠT ĐỘNG HỌC TẬP (CHUẨN 5E) */}
          <ActivityProgressBar activities={activityStats} />

          {/* BẢNG DANH SÁCH TIẾN ĐỘ HỌC SINH CHI TIẾT */}
          <StudentProgressTable
            students={students}
            targetClasses={targetClasses}
            assignedDateStr={assignedDateStr}
          />
        </div>
      </div>
    </div>
  );
};
