import { SUBJECTS, GRADES } from '../../lib/constants';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  BookOpen,
  Edit3,
  Printer,
  Filter,
  ChevronDown,
  Trash2,
  CheckCircle2,
  RefreshCw,
  FileText,
  Zap,
  ChevronRight,
  Save,
  ArrowLeft,
  Home,
  Users,
  Globe,
  Play,
  BarChart2,
  Share2,
  Bell,
  CheckCircle,
  Check,
  LayoutGrid,
  List,
  Clock,
  User
} from 'lucide-react';
import { getSubjectColorStyles } from '../../utils/subjectColors';
import { Lesson5EPlan, UserRole } from '../../types';
import { generate5ELessonAI } from '../../services/geminiService';
import { resolveCurrentTeacherProfile } from '../../services/teacherStorageService';
import { auth } from '../../services/firebase';
import { Lesson5EModal } from './Lesson5EModal';

import { ELearningAssignmentModal } from './ELearningAssignmentModal';
import { LessonProgressStatsModal } from './LessonProgressStatsModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface Lesson5EModuleProps {
  lessons: Lesson5EPlan[];
  onSaveLesson: (lesson: Lesson5EPlan) => void;
  onDeleteLesson: (id: string) => void;
  userRole: UserRole;
}

export const Lesson5EModule: React.FC<Lesson5EModuleProps> = ({
  lessons,
  onSaveLesson,
  onDeleteLesson,
  userRole
}) => {
  const authEmail = (typeof window !== 'undefined' ? (auth?.currentUser?.email || localStorage.getItem('eduplay_teacher_email')) : null);
  const activeTeacherProfile = useMemo(() => resolveCurrentTeacherProfile(authEmail), [authEmail]);
  const isAdmin = userRole === 'admin' || activeTeacherProfile.userRole === 'admin' || (activeTeacherProfile.role || '').toLowerCase().includes('admin');

  const isLessonOwner = useCallback((lesson: Lesson5EPlan): boolean => {
    if (isAdmin) return true;
    const currentId = activeTeacherProfile.id; // e.g. 'gv-06', 'gv-12'
    if ((lesson as any).teacherId && (lesson as any).teacherId === currentId) return true;
    if ((lesson as any).createdBy && (lesson as any).createdBy === currentId) return true;
    if (lesson.authorName && (lesson.authorName.includes(activeTeacherProfile.name) || activeTeacherProfile.name.includes(lesson.authorName))) return true;
    return false;
  }, [isAdmin, activeTeacherProfile.id, activeTeacherProfile.name]);

  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'viewer'>('list');
  const [selectedLesson, setSelectedLesson] = useState<Lesson5EPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson5EPlan | null>(null);

  const [assigningLesson, setAssigningLesson] = useState<Lesson5EPlan | null>(null);
  const [statsLesson, setStatsLesson] = useState<Lesson5EPlan | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<Lesson5EPlan | null>(null);
  const [assignedToast, setAssignedToast] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<{ lessonId: string; type: 'status' | 'approval' } | null>(null);

  const totalLessons = (lessons || []).length;
  
  const publishedAndApprovedCount = (lessons || []).filter(lesson => {
    const isPublished = (lesson as any).status !== 'draft';
    const isApproved = (lesson as any).isApproved !== false;
    return isPublished && isApproved;
  }).length;
  
  const publishedAndApprovedPercent = totalLessons > 0 
    ? Math.round((publishedAndApprovedCount / totalLessons) * 100) 
    : 0;

  const totalViews = (lessons || []).reduce((acc, lesson) => {
    return acc + ((lesson as any).viewsCount || 0);
  }, 0);

  // Permission check for content approval (Admin or Teacher / Department head)
  const canReviewContent = userRole === 'admin' || userRole === 'teacher';

  // Handle clicking outside to close any open dropdown
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openDropdown]);

  const handleQuickChangeStatus = (lesson: Lesson5EPlan, newStatus: 'published' | 'draft', e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = {
      ...lesson,
      status: newStatus
    };
    onSaveLesson(updated);

    try {
      const saved = localStorage.getItem('eduplay_5e_lessons');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const updatedList = parsed.map((item: any) => item.id === lesson.id ? { ...item, status: newStatus } : item);
          localStorage.setItem('eduplay_5e_lessons', JSON.stringify(updatedList));
        }
      }
    } catch (err) {
      console.warn('Error updating local storage:', err);
    }

    setOpenDropdown(null);
  };

  const handleQuickChangeApproval = (lesson: Lesson5EPlan, newApproval: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canReviewContent) return;
    const updated = {
      ...lesson,
      isApproved: newApproval
    };
    onSaveLesson(updated);

    try {
      const saved = localStorage.getItem('eduplay_5e_lessons');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const updatedList = parsed.map((item: any) => item.id === lesson.id ? { ...item, isApproved: newApproval } : item);
          localStorage.setItem('eduplay_5e_lessons', JSON.stringify(updatedList));
        }
      }
    } catch (err) {
      console.warn('Error updating local storage:', err);
    }

    setOpenDropdown(null);
  };

  // Main Top Pill Tab State: 'my' | 'all'
  const [mainTab, setMainTab] = useState<'my' | 'all'>('all');

  // Filter States
  const [filterGrade, setFilterGrade] = useState('Tất cả khối');
  const [filterSubject, setFilterSubject] = useState('Tất cả môn');
  const [filterStatus, setFilterStatus] = useState('Tất cả trạng thái');
  const [filterSort, setFilterSort] = useState('Mới nhất (Thời gian)');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredLessons = (lessons || []).filter(lesson => {
    // Main tab filter
    const authorType = (lesson as any).authorType || 'all';
    if (mainTab === 'my' && authorType !== 'my' && lesson.authorName !== 'ThS. Nguyễn Văn Hoài') return false;

    // Grade filter
    if (filterGrade !== 'Tất cả khối' && filterGrade !== 'Tất cả các khối' && lesson.grade !== filterGrade) return false;
    
    // Subject filter
    if (filterSubject !== 'Tất cả môn' && filterSubject !== 'Tất cả các môn' && lesson.subject !== filterSubject) return false;

    // Status filter
    const status = (lesson as any).status || 'published';
    if (filterStatus === 'Bản nháp' && status !== 'draft') return false;
    if (filterStatus === 'Đã xuất bản' && status !== 'published') return false;

    return true;
  });

  // Form State for Editor
  const [topicInput, setTopicInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('Toán Học');
  const [gradeInput, setGradeInput] = useState('Khối 10');
  const [durationInput, setDurationInput] = useState('45 phút');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const [currentPlan, setCurrentPlan] = useState<Lesson5EPlan>({
    id: `les-${Date.now()}`,
    title: 'Bài Giảng 5E Mới',
    subject: 'Toán Học',
    grade: 'Khối 10',
    duration: '45 phút',
    topic: '',
    authorName: 'Giáo Viên Trực Khang',
    createdAt: new Date().toLocaleDateString('vi-VN'),
    stepEngage: {
      title: 'Bước 1: Khởi động (Engage)',
      subtitle: 'Thu hút chú ý & kích thích tư duy',
      objectives: '',
      teacherActivities: '',
      studentActivities: '',
      materials: ''
    },
    stepExplore: {
      title: 'Bước 2: Khám phá & Hình thành kiến thức (Explore & Explain)',
      subtitle: 'Khám phá quy luật & xây dựng kiến thức',
      objectives: '',
      teacherActivities: '',
      studentActivities: '',
      materials: ''
    },
    stepElaborate: {
      title: 'Bước 3: Luyện tập (Elaborate)',
      subtitle: 'Củng cố & mở rộng kỹ năng',
      objectives: '',
      teacherActivities: '',
      studentActivities: '',
      materials: ''
    },
    stepEvaluate: {
      title: 'Bước 4: Vận dụng (Evaluate)',
      subtitle: 'Đánh giá năng lực & bài tập thực tế',
      objectives: '',
      teacherActivities: '',
      studentActivities: '',
      materials: ''
    }
  });

  const handleStartCreateNew = () => {
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  const handleAiSuggest5E = async () => {
    if (!topicInput.trim()) return;
    setIsAiGenerating(true);
    const aiResult = await generate5ELessonAI(topicInput, subjectInput, gradeInput);
    
    setCurrentPlan((prev) => ({
      ...prev,
      title: aiResult.title || `Bài Giảng 5E: ${topicInput}`,
      subject: subjectInput,
      grade: gradeInput,
      duration: durationInput,
      topic: topicInput,
      stepEngage: { ...prev.stepEngage, ...aiResult.stepEngage },
      stepExplore: { ...prev.stepExplore, ...aiResult.stepExplore },
      stepElaborate: { ...prev.stepElaborate, ...aiResult.stepElaborate },
      stepEvaluate: { ...prev.stepEvaluate, ...aiResult.stepEvaluate },
    }));

    setIsAiGenerating(false);
  };

  const handleSaveCurrentPlan = () => {
    try {
      onSaveLesson(currentPlan);
      setSelectedLesson(currentPlan);
      setActiveTab('viewer');
      setAssignedToast("Đã lưu thành công dữ liệu bài giảng!");
      setTimeout(() => setAssignedToast(null), 3500);
    } catch (e) {
      setAssignedToast("Lưu thất bại, vui lòng kiểm tra lại!");
      setTimeout(() => setAssignedToast(null), 3500);
    }
  };

  const handlePrintLesson = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 w-full">
      
      {/* MODULE MAIN HEADER BANNER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200/60">
              Bài Giảng Tương Tác
            </span>
            <span className="text-xs text-slate-400">• Chuẩn Sư Phạm 5E</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 font-heading">
            Phân Hệ Bài Giảng E-Learning
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-4xl leading-relaxed">
            Soạn bài giảng tương tác chuẩn mô hình 5E (Khởi động - Khám phá - Giải thích - Vận dụng mở rộng - Đánh giá), tích hợp AI hỗ trợ thiết kế nội dung sinh động.
          </p>
        </div>
      </div>

      {/* VIEW: List of Lessons */}
      {activeTab === 'list' && (
        <>
          {/* HEADER / TOP PILL TAB BAR */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white shadow-md flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Toàn bộ bài giảng ({totalLessons})
              </div>
            </div>

            {userRole !== 'student' && (
              <button
                onClick={handleStartCreateNew}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-200 flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Thêm mới bài giảng
              </button>
            )}
          </div>
          {/* FILTER ROW */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Dropdown 1: Tất cả môn */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="bg-transparent appearance-none pr-4 outline-none cursor-pointer font-bold text-slate-800"
                >
                  <option value="Tất cả môn">Tất cả môn</option>
                  {SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>

              {/* Dropdown 2: Tất cả khối */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="bg-transparent appearance-none pr-4 outline-none cursor-pointer font-bold text-slate-800"
                >
                  <option value="Tất cả khối">Tất cả khối</option>
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>

              {/* Dropdown 3: Tất cả trạng thái */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent appearance-none pr-4 outline-none cursor-pointer font-bold text-slate-800"
                >
                  <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                  <option value="Bản nháp">Bản nháp</option>
                  <option value="Đã xuất bản">Đã xuất bản</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>

              {/* Dropdown 4: Mới nhất (Thời gian) - highlighted with light blue border */}
              <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-300 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-900 shadow-xs">
                <select
                  value={filterSort}
                  onChange={(e) => setFilterSort(e.target.value)}
                  className="bg-transparent appearance-none pr-4 outline-none cursor-pointer font-extrabold text-blue-900"
                >
                  <option value="Mới nhất (Thời gian)">Mới nhất (Thời gian)</option>
                  <option value="Cũ nhất">Cũ nhất</option>
                  <option value="Tên A-Z">Tên A-Z</option>
                </select>
                <ChevronDown className="w-3 h-3 text-blue-700" />
              </div>
            </div>

            {/* View mode toggle buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Dạng lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Dạng danh sách"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {filteredLessons.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center flex flex-col items-center justify-center border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-600">Không tìm thấy bài giảng nào khớp bộ lọc</p>
              <p className="text-xs text-slate-400 mt-1">Hãy thử chọn lại bộ lọc hoặc tạo bài giảng mới nhé.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLessons.map((lesson, idx) => {
                const isApproved = (lesson as any).isApproved !== false;
                const statusLabel = (lesson as any).status === 'draft' ? 'Bản nháp' : 'Đã xuất bản';
                const statusBg = (lesson as any).status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800';
                const codeStr = (lesson as any).code || `TIN${idx+1}-C2-T${idx+1}`;
                const viewsCount = (lesson as any).viewsCount || 0;
                const subjColor = getSubjectColorStyles(lesson.subject);

                return (
                  <div
                    key={lesson.id}
                    className={`bg-white rounded-2xl border border-slate-200/80 ${subjColor.cardBorderHover} shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group`}
                  >
                    {/* Top Subject Color Accent Bar */}
                    <div className={`h-1.5 w-full ${subjColor.topBarBg} rounded-t-2xl`}></div>

                    <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Badges row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${subjColor.badgeClass}`}>
                              {lesson.subject?.toUpperCase() || subjColor.name.toUpperCase()}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              {lesson.grade?.toUpperCase() || 'KHỐI 3'}
                            </span>

                            {/* Publication Status Badge with Quick Dropdown */}
                            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setOpenDropdown(prev => (prev?.lessonId === lesson.id && prev?.type === 'status') ? null : { lessonId: lesson.id, type: 'status' })}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border select-none ${
                                  (lesson as any).status === 'draft'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300/80 hover:bg-amber-100 hover:border-amber-400'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300/80 hover:bg-emerald-100 hover:border-emerald-400'
                                }`}
                                title="Nhấp để đổi nhanh trạng thái: Đã xuất bản / Bản nháp"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${ (lesson as any).status === 'draft' ? 'bg-amber-500' : 'bg-emerald-500' }`} />
                                <span>{(lesson as any).status === 'draft' ? 'Bản nháp' : 'Đã xuất bản'}</span>
                                <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                              </button>

                              {openDropdown?.lessonId === lesson.id && openDropdown?.type === 'status' && (
                                <div
                                  className="absolute top-full left-0 mt-1.5 w-40 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="px-3 py-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    Trạng thái xuất bản
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => handleQuickChangeStatus(lesson, 'published', e)}
                                    className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer hover:bg-emerald-50 ${
                                      (lesson as any).status !== 'draft' ? 'text-emerald-700 bg-emerald-50/70 font-black' : 'text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                      <span>Đã xuất bản</span>
                                    </div>
                                    {(lesson as any).status !== 'draft' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => handleQuickChangeStatus(lesson, 'draft', e)}
                                    className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer hover:bg-amber-50 ${
                                      (lesson as any).status === 'draft' ? 'text-amber-700 bg-amber-50/70 font-black' : 'text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                                      <span>Bản nháp</span>
                                    </div>
                                    {(lesson as any).status === 'draft' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Approval status badge with Quick Dropdown */}
                          <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                            {canReviewContent ? (
                              <button
                                type="button"
                                onClick={() => setOpenDropdown(prev => (prev?.lessonId === lesson.id && prev?.type === 'approval') ? null : { lessonId: lesson.id, type: 'approval' })}
                                className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border transition-all cursor-pointer select-none ${
                                  isApproved
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                                    : 'text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100 hover:border-amber-400'
                                }`}
                                title="Nhấp để đổi nhanh: Đã duyệt / Chưa duyệt nội dung"
                              >
                                {isApproved ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    <span>Đã duyệt nội dung</span>
                                  </>
                                ) : (
                                  <>
                                    <Bell className="w-3 h-3 text-amber-600" />
                                    <span>Chưa duyệt nội dung</span>
                                  </>
                                )}
                                <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                              </button>
                            ) : (
                              <span
                                className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border cursor-not-allowed opacity-85 select-none ${
                                  isApproved
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    : 'text-amber-700 bg-amber-50 border-amber-200'
                                }`}
                                title="Chỉ Tổ trưởng chuyên môn mới có quyền duyệt nội dung."
                              >
                                {isApproved ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    <span>Đã duyệt nội dung</span>
                                  </>
                                ) : (
                                  <>
                                    <Bell className="w-3 h-3 text-amber-600" />
                                    <span>Chưa duyệt nội dung</span>
                                  </>
                                )}
                              </span>
                            )}

                            {canReviewContent && openDropdown?.lessonId === lesson.id && openDropdown?.type === 'approval' && (
                              <div
                                className="absolute top-full right-0 mt-1.5 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3 py-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                                  Kiểm duyệt chuyên môn
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickChangeApproval(lesson, true, e)}
                                  className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer hover:bg-emerald-50 ${
                                    isApproved ? 'text-emerald-700 bg-emerald-50/70 font-black' : 'text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Đã duyệt nội dung</span>
                                  </div>
                                  {isApproved && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleQuickChangeApproval(lesson, false, e)}
                                  className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer hover:bg-amber-50 ${
                                    !isApproved ? 'text-amber-700 bg-amber-50/70 font-black' : 'text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Chưa duyệt nội dung</span>
                                  </div>
                                  {!isApproved && <Check className="w-3.5 h-3.5 text-amber-600" />}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className={`text-base font-extrabold group-hover:text-blue-600 transition-colors font-heading leading-snug ${isApproved ? 'text-blue-700' : 'text-slate-900'}`}>
                          {lesson.title}
                        </h3>

                        {/* Short description */}
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          Chủ đề: {lesson.topic || 'Bài học tương tác chuẩn 5E giúp học sinh tiếp thu kiến thức chủ động.'}
                        </p>

                        {/* Info row: clock + minutes, user + views, code */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-blue-500" /> {lesson.duration || '35 phút'}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="w-3.5 h-3.5 text-slate-400" /> {viewsCount} lượt học
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {codeStr}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        {/* Left & Right Action Toolbar */}
                        <div className="flex items-center gap-1.5">
                          {/* Giao bài */}
                          <div className="relative group/btn">
                            <button
                              type="button"
                              onClick={() => setAssigningLesson(lesson)}
                              className="p-2 rounded-xl bg-blue-50/80 hover:bg-blue-600 text-blue-600 hover:text-white transition-all cursor-pointer shadow-2xs hover:shadow-xs flex items-center justify-center"
                              title="Giao bài"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-30 shadow-md">
                              Giao bài
                            </span>
                          </div>
                        </div>

                        {/* Right: small action icons (Edit, Share, Delete) */}
                        <div className="flex items-center gap-1.5">
                          {userRole !== 'student' && isLessonOwner(lesson) && (
                            <>
                              {/* Sửa bài giảng */}
                              <div className="relative group/btn">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLesson(lesson);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex items-center justify-center border border-slate-100"
                                  title="Chỉnh sửa bài giảng"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-30 shadow-md">
                                  Chỉnh sửa
                                </span>
                              </div>



                              {/* Xóa */}
                              <div className="relative group/btn">
                                <button
                                  type="button"
                                  onClick={() => setDeletingLesson(lesson)}
                                  className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex items-center justify-center border border-slate-100"
                                  title="Xóa bài giảng"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-30 shadow-md">
                                  Xóa
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINATION BAR */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-600">
            <div>
              Hiển thị {filteredLessons.length} trên tổng số {lessons.length} kết quả
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">Trang {currentPage} / 3</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(3, p + 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>Sau</span> <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* EDITOR: Create / Edit 5E Plan with AI Generator */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setActiveTab('list')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Danh sách bài giảng
            </button>
            <div className="text-xs font-bold text-slate-500">
              {editingLesson ? 'Chỉnh sửa bài giảng 5E' : 'Soạn bài giảng 5E mới'}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          
          {/* AI Generator Panel */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-6 text-white space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base font-heading">
                <Sparkles className="w-5 h-5 text-amber-300" /> Công Cụ Gợi Ý Nội Dung AI Gemini
              </div>
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full text-amber-200">
                Tự động điền 4 bước chuẩn Sư phạm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-blue-100 mb-1">
                  Chủ Đề Tên Bài Học:
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Ví dụ: Định luật II Newton / Mạng máy tính..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-100 mb-1">Môn Học:</label>
                <select
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/20 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <option value="Tin học">Tin học</option>
                  <option value="Toán Học">Toán Học</option>
                  <option value="Vật Lý">Vật Lý</option>
                  <option value="Khoa học">Khoa học</option>
                  <option value="Tiếng Việt">Tiếng Việt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-100 mb-1">Khối Lớp:</label>
                <select
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/20 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <option value="Khối 3">Khối 3</option>
                  <option value="Khối 4">Khối 4</option>
                  <option value="Khối 5">Khối 5</option>
                  <option value="Khối 10">Khối 10</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleAiSuggest5E}
                disabled={isAiGenerating || !topicInput.trim()}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAiGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-950" />
                    AI Đang Soạn Giáo Án 5E...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-indigo-950" /> Khởi Tạo Nội Dung Bài Giảng 5E Bằng AI
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form Fields: General Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên Bài Giảng:</label>
              <input
                type="text"
                value={currentPlan.title}
                onChange={(e) => setCurrentPlan({ ...currentPlan, title: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thời Lượng (Phút):</label>
              <input
                type="text"
                value={currentPlan.duration}
                onChange={(e) => setCurrentPlan({ ...currentPlan, duration: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tác Giả / Người Soạn:</label>
              <input
                type="text"
                value={currentPlan.authorName}
                onChange={(e) => setCurrentPlan({ ...currentPlan, authorName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* 4 Steps Detailed Form Accordion / Grid */}
          <div className="space-y-6">
            
            {/* Step 1: Engage */}
            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900 font-heading">
                <span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">1</span>
                <span>BƯỚC 1: KHỞI ĐỘNG (ENGAGE)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mục tiêu khởi động:</label>
                  <textarea
                    rows={2}
                    value={currentPlan.stepEngage.objectives}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepEngage: { ...currentPlan.stepEngage, objectives: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thiết bị & Học liệu:</label>
                  <textarea
                    rows={2}
                    value={currentPlan.stepEngage.materials}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepEngage: { ...currentPlan.stepEngage, materials: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoạt động của Giáo viên:</label>
                  <textarea
                    rows={3}
                    value={currentPlan.stepEngage.teacherActivities}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepEngage: { ...currentPlan.stepEngage, teacherActivities: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoạt động của Học sinh:</label>
                  <textarea
                    rows={3}
                    value={currentPlan.stepEngage.studentActivities}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepEngage: { ...currentPlan.stepEngage, studentActivities: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Explore & Explain */}
            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-900 font-heading">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                <span>BƯỚC 2: KHÁM PHÁ & HÌNH THÀNH KIẾN THỨC (EXPLORE & EXPLAIN)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mục tiêu khám phá:</label>
                  <textarea
                    rows={2}
                    value={currentPlan.stepExplore.objectives}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepExplore: { ...currentPlan.stepExplore, objectives: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thiết bị & Phiếu học tập:</label>
                  <textarea
                    rows={2}
                    value={currentPlan.stepExplore.materials}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepExplore: { ...currentPlan.stepExplore, materials: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoạt động của Giáo viên:</label>
                  <textarea
                    rows={3}
                    value={currentPlan.stepExplore.teacherActivities}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepExplore: { ...currentPlan.stepExplore, teacherActivities: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoạt động của Học sinh:</label>
                  <textarea
                    rows={3}
                    value={currentPlan.stepExplore.studentActivities}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepExplore: { ...currentPlan.stepExplore, studentActivities: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Elaborate */}
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-900 font-heading">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
                <span>BƯỚC 3: LUYỆN TẬP (ELABORATE)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mục tiêu luyện tập:</label>
                  <textarea
                    rows={2}
                    value={currentPlan.stepElaborate.objectives}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepElaborate: { ...currentPlan.stepElaborate, objectives: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngân hàng bài tập:</label>
                  <textarea
                    rows={2}
                    value={currentPlan.stepElaborate.materials}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepElaborate: { ...currentPlan.stepElaborate, materials: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoạt động của Giáo viên:</label>
                  <textarea
                    rows={3}
                    value={currentPlan.stepElaborate.teacherActivities}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepElaborate: { ...currentPlan.stepElaborate, teacherActivities: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoạt động của Học sinh:</label>
                  <textarea
                    rows={3}
                    value={currentPlan.stepElaborate.studentActivities}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepElaborate: { ...currentPlan.stepElaborate, studentActivities: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Evaluate */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 font-heading">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">4</span>
                <span>BƯỚC 4: VẬN DỤNG & ĐÁNH GIÁ (EVALUATE)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mục tiêu vận dụng:</label>
                  <textarea
                    rows={2}
                    value={currentPlan.stepEvaluate.objectives}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepEvaluate: { ...currentPlan.stepEvaluate, objectives: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rubric đánh giá:</label>
                  <textarea
                    rows={2}
                    value={currentPlan.stepEvaluate.materials}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepEvaluate: { ...currentPlan.stepEvaluate, materials: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoạt động của Giáo viên:</label>
                  <textarea
                    rows={3}
                    value={currentPlan.stepEvaluate.teacherActivities}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepEvaluate: { ...currentPlan.stepEvaluate, teacherActivities: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoạt động của Học sinh:</label>
                  <textarea
                    rows={3}
                    value={currentPlan.stepEvaluate.studentActivities}
                    onChange={(e) =>
                      setCurrentPlan({
                        ...currentPlan,
                        stepEvaluate: { ...currentPlan.stepEvaluate, studentActivities: e.target.value }
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-400 bg-white"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setActiveTab('list')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              onClick={handleSaveCurrentPlan}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-200 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu Bài Giảng 5E
            </button>
          </div>

        </div>
        </div>
      )}

      {/* VIEWER: Full Pedagogical 5E Lesson Document View */}
      {activeTab === 'viewer' && selectedLesson && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md space-y-6 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
            <button
              onClick={() => setActiveTab('list')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Trở về danh sách
            </button>

            <button
              onClick={handlePrintLesson}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" /> In / Xuất File PDF
            </button>
          </div>

          {/* Official Document Banner */}
          <div className="text-center space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              GIÁO ÁN ĐIỆN TỬ THEO MÔ HÌNH 5E SƯ PHẠM
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">
              {selectedLesson.title}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Môn học: <strong>{selectedLesson.subject}</strong> | Khối: <strong>{selectedLesson.grade}</strong> | Thời lượng: <strong>{selectedLesson.duration}</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              Người soạn: {selectedLesson.authorName} • Ngày lập: {selectedLesson.createdAt}
            </p>
          </div>

          {/* OBJECTIVES PANEL IN VIEWER */}
          {selectedLesson.objectivesContent && (
            <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-700 uppercase tracking-wider">
                <span>🎯 Mục tiêu bài học</span>
              </div>
              <div className="space-y-2">
                {selectedLesson.objectivesContent.split('\n').filter(l => l.trim() !== '').map((line, idx) => {
                  const trimmed = line.trim();
                  const lower = trimmed.toLowerCase();
                  
                  let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  let iconLabel = '📖';
                  let groupName = 'Mục tiêu';
                  
                  if (lower.includes('kiến thức') || lower.includes('hiểu') || lower.includes('nắm') || lower.includes('nhận biết')) {
                    badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
                    iconLabel = '📚';
                    groupName = 'Kiến thức';
                  } else if (lower.includes('kỹ năng') || lower.includes('vận dụng') || lower.includes('thực hành') || lower.includes('giải')) {
                    badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
                    iconLabel = '🛠️';
                    groupName = 'Kỹ năng';
                  } else if (lower.includes('phẩm chất') || lower.includes('thái độ') || lower.includes('yêu') || lower.includes('giúp') || lower.includes('cẩn thận')) {
                    badgeBg = 'bg-purple-50 text-purple-700 border-purple-200';
                    iconLabel = '💖';
                    groupName = 'Thái độ';
                  }

                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div className="space-y-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${badgeBg}`}>
                            {iconLabel} {groupName}
                          </span>
                          <p className="text-xs text-slate-800 font-medium leading-relaxed">
                            {trimmed}
                          </p>
                        </div>
                      </div>
                      <div className="text-emerald-600 text-xs font-bold px-2 py-1">
                        ✓
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4 Steps Formatted Table */}
          <div className="space-y-6 pt-4">
            
            {/* Step 1 */}
            <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
              <div className="bg-amber-500 text-white px-4 py-2 font-bold text-xs uppercase flex items-center justify-between">
                <span>1. KHỞI ĐỘNG (ENGAGE)</span>
                {selectedLesson.stepEngage.materials && (
                  <span className="text-[10px] opacity-90">Học liệu: {selectedLesson.stepEngage.materials}</span>
                )}
              </div>
              <div className="p-4 space-y-2 text-xs text-slate-800">
                {selectedLesson.stepEngage.objectives && selectedLesson.stepEngage.objectives !== selectedLesson.stepEngage.studentActivities && (
                  <div><strong>Mục tiêu:</strong> {selectedLesson.stepEngage.objectives}</div>
                )}
                <div className={`grid ${selectedLesson.stepEngage.teacherActivities ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4 pt-2 border-t border-amber-100`}>
                  {selectedLesson.stepEngage.teacherActivities && (
                    <div>
                      <strong className="text-amber-900">Hoạt động Giáo viên:</strong>
                      <p className="mt-1 whitespace-pre-wrap">{selectedLesson.stepEngage.teacherActivities}</p>
                    </div>
                  )}
                  <div>
                    <strong className="text-amber-900">Nội dung hướng dẫn khởi động:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{selectedLesson.stepEngage.studentActivities || selectedLesson.stepEngage.objectives}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/30">
              <div className="bg-blue-600 text-white px-4 py-2 font-bold text-xs uppercase flex items-center justify-between">
                <span>2. KHÁM PHÁ & HÌNH THÀNH KIẾN THỨC (EXPLORE & EXPLAIN)</span>
                {selectedLesson.stepExplore.materials && (
                  <span className="text-[10px] opacity-90">Học liệu: {selectedLesson.stepExplore.materials}</span>
                )}
              </div>
              <div className="p-4 space-y-2 text-xs text-slate-800">
                <div><strong>Mục tiêu:</strong> {selectedLesson.stepExplore.objectives}</div>
                <div className={`grid ${selectedLesson.stepExplore.teacherActivities ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4 pt-2 border-t border-blue-100`}>
                  {selectedLesson.stepExplore.teacherActivities && (
                    <div>
                      <strong className="text-blue-900">Hoạt động Giáo viên:</strong>
                      <p className="mt-1 whitespace-pre-wrap">{selectedLesson.stepExplore.teacherActivities}</p>
                    </div>
                  )}
                  <div>
                    <strong className="text-blue-900">Hướng dẫn cho Học sinh:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{selectedLesson.stepExplore.studentActivities}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border border-indigo-200 rounded-xl overflow-hidden bg-indigo-50/30">
              <div className="bg-indigo-600 text-white px-4 py-2 font-bold text-xs uppercase flex items-center justify-between">
                <span>3. LUYỆN TẬP (ELABORATE)</span>
                <span className="text-[10px] opacity-90">Học liệu: {selectedLesson.stepElaborate.materials}</span>
              </div>
              <div className="p-4 space-y-2 text-xs text-slate-800">
                <div><strong>Mục tiêu:</strong> {selectedLesson.stepElaborate.objectives}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-indigo-100">
                  <div>
                    <strong className="text-indigo-900">Hoạt động Giáo viên:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{selectedLesson.stepElaborate.teacherActivities}</p>
                  </div>
                  <div>
                    <strong className="text-indigo-900">Hoạt động Học sinh:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{selectedLesson.stepElaborate.studentActivities}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/30">
              <div className="bg-emerald-600 text-white px-4 py-2 font-bold text-xs uppercase flex items-center justify-between">
                <span>4. VẬN DỤNG (EVALUATE)</span>
                <span className="text-[10px] opacity-90">Đánh giá: {selectedLesson.stepEvaluate.materials}</span>
              </div>
              <div className="p-4 space-y-2 text-xs text-slate-800">
                <div><strong>Mục tiêu:</strong> {selectedLesson.stepEvaluate.objectives}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-emerald-100">
                  <div>
                    <strong className="text-emerald-900">Hoạt động Giáo viên:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{selectedLesson.stepEvaluate.teacherActivities}</p>
                  </div>
                  <div>
                    <strong className="text-emerald-900">Hoạt động Học sinh:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{selectedLesson.stepEvaluate.studentActivities}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* LESSON 5E MODAL */}
      {isModalOpen && (
        <Lesson5EModal
          key={editingLesson ? `edit-${editingLesson.id}` : 'create-new'}
          isOpen={isModalOpen}
          mode={editingLesson ? 'edit' : 'create'}
          initialData={editingLesson}
          initialLesson={editingLesson}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLesson(null);
          }}
          onSave={(lesson) => {
            try {
              onSaveLesson(lesson);
              setIsModalOpen(false);
              setEditingLesson(null);
              setAssignedToast(editingLesson ? "Đã cập nhật bài giảng thành công!" : "Đã lưu bài giảng hoàn tất thành công!");
              setTimeout(() => setAssignedToast(null), 3500);
            } catch (err) {
              setAssignedToast("Lưu thất bại, vui lòng kiểm tra lại!");
              setTimeout(() => setAssignedToast(null), 3500);
            }
          }}
        />
      )}



      {/* MODAL GIAO BÀI E-LEARNING */}
      <ELearningAssignmentModal
        isOpen={!!assigningLesson}
        onClose={() => setAssigningLesson(null)}
        lesson={assigningLesson}
        onConfirmSuccess={(assignedData) => {
          setAssignedToast(`Đã giao bài học E-Learning thành công cho ${assignedData.targetClass}!`);
          setTimeout(() => setAssignedToast(null), 4000);
        }}
      />

      {/* MODAL THỐNG KÊ TIẾN ĐỘ HỌC TẬP */}
      <LessonProgressStatsModal
        isOpen={!!statsLesson}
        onClose={() => setStatsLesson(null)}
        lesson={statsLesson}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deletingLesson}
        onClose={() => setDeletingLesson(null)}
        onConfirm={() => {
          if (deletingLesson) {
            if (!isLessonOwner(deletingLesson)) {
              alert('Bạn không có quyền xóa nội dung này!');
              setDeletingLesson(null);
              return;
            }
            onDeleteLesson(deletingLesson.id);
            setDeletingLesson(null);
          }
        }}
        title="Xác nhận xóa bài giảng 5E"
        itemType="bài giảng 5E"
        itemName={deletingLesson?.title}
      />

      {/* TOAST SUCCESS NOTIFICATION */}
      {assignedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00875A] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">✓</div>
          <span className="text-xs sm:text-sm font-bold">{assignedToast}</span>
        </div>
      )}

    </div>
  );
};
