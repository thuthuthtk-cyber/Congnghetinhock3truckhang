import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  X,
  BookOpen,
  Settings,
  Check,
  Clock,
  Calendar,
  CheckSquare,
  Zap,
  ArrowRight,
  ArrowLeft,
  Rocket
} from 'lucide-react';
import { Lesson5EPlan } from '../../types';
import {
  AssignedELearningLesson,
  saveAssignedELearningLesson
} from '../../services/elearningAssignmentService';
import { DateTimePicker } from '../common/DateTimePicker';
import { db } from '../../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface ClassItem {
  id: string;
  name: string;
  grade: string;
  room?: string;
}

const DEFAULT_FALLBACK_CLASSES: ClassItem[] = [
  { id: '1C', grade: 'Khối 1', name: 'Lớp 1C', room: 'Phòng 101' },
  { id: '1D', grade: 'Khối 1', name: 'Lớp 1D', room: 'Phòng 102' },
  { id: '2C', grade: 'Khối 2', name: 'Lớp 2C', room: 'Phòng 201' },
  { id: '2D', grade: 'Khối 2', name: 'Lớp 2D', room: 'Phòng 202' },
  { id: '3C', grade: 'Khối 3', name: 'Lớp 3C', room: 'Phòng 301' },
  { id: '3D', grade: 'Khối 3', name: 'Lớp 3D', room: 'Phòng 302' },
  { id: '4C', grade: 'Khối 4', name: 'Lớp 4C', room: 'Phòng 401' },
  { id: '4D', grade: 'Khối 4', name: 'Lớp 4D', room: 'Phòng 402' },
  { id: '5C', grade: 'Khối 5', name: 'Lớp 5C', room: 'Phòng 501' },
  { id: '5D', grade: 'Khối 5', name: 'Lớp 5D', room: 'Phòng 502' }
];

/**
 * Helper to extract grade number from a lesson object
 */
function extractLessonGradeNumber(lesson: Lesson5EPlan | null): string {
  if (!lesson) return '';
  if (lesson.grade) {
    const m = lesson.grade.match(/\d+/);
    if (m) return m[0];
  }
  if (lesson.title) {
    const m = lesson.title.match(/(?:khối|lớp)\s*([1-5])/i);
    if (m) return m[1];
  }
  if (lesson.topic) {
    const m = lesson.topic.match(/(?:khối|lớp)\s*([1-5])/i);
    if (m) return m[1];
  }
  return '';
}

/**
 * Check if a class matches the given grade number
 */
function doesClassMatchGrade(cls: ClassItem, gradeNumber: string): boolean {
  if (!gradeNumber) return true;

  // 1. Check cls.grade (e.g. "Khối 3" -> "3")
  if (cls.grade) {
    const gradeMatch = cls.grade.match(/\d+/);
    if (gradeMatch && gradeMatch[0] === gradeNumber) return true;
  }

  // 2. Check cls.name (e.g. "Lớp 3A" -> "3")
  if (cls.name) {
    const nameMatch = cls.name.match(/(?:lớp\s*)?([1-5])[a-zA-Z0-9]*/i);
    if (nameMatch && nameMatch[1] === gradeNumber) return true;
  }

  return false;
}

interface ELearningAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson5EPlan | null;
  onConfirmSuccess?: (assignedData: AssignedELearningLesson) => void;
}

export const ELearningAssignmentModal: React.FC<ELearningAssignmentModalProps> = ({
  isOpen,
  onClose,
  lesson,
  onConfirmSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Firestore classes state
  const [allClasses, setAllClasses] = useState<ClassItem[]>(() => {
    try {
      const cached = localStorage.getItem('eduplay_classes_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: any) => ({
            id: c.id || c.name,
            name: (c.name || c.className || '').trim(),
            grade: (c.grade || '').trim(),
            room: c.room || ''
          }));
        }
      }
    } catch {}
    return DEFAULT_FALLBACK_CLASSES;
  });
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);

  // Step 1: Class & Recipients
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [assignedMode, setAssignedMode] = useState<'all' | 'individual'>('all');

  // Step 2: Settings
  const [title, setTitle] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('09/03/2026 03:31 AM');
  const [dueDate, setDueDate] = useState<string>('10/30/2026 11:59 PM');
  const [isUnlimited, setIsUnlimited] = useState<boolean>(false);
  const [allowRetake, setAllowRetake] = useState<boolean>(true);
  const [requireInteractiveVideo, setRequireInteractiveVideo] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = React.useRef(false);

  // Realtime subscription to Firestore 'classes' collection
  useEffect(() => {
    if (!isOpen) return;

    let unsub = () => {};
    try {
      setLoadingClasses(true);
      unsub = onSnapshot(collection(db, 'classes'), (snapshot) => {
        setLoadingClasses(false);
        if (!snapshot.empty) {
          const map = new Map<string, ClassItem>();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const rawId = docSnap.id || data.id || '';
            const rawName = (data.name || data.className || rawId || '').trim();
            const cleanName = rawName.startsWith('Lớp ') ? rawName : `Lớp ${rawName}`;
            const key = cleanName.replace(/^Lớp\s*/i, '').trim().toUpperCase();
            if (!map.has(key)) {
              map.set(key, {
                id: key,
                name: cleanName,
                grade: (data.grade || '').trim(),
                room: data.room || ''
              });
            }
          });
          const fetchedList = Array.from(map.values());
          if (fetchedList.length > 0) {
            fetchedList.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
            setAllClasses(fetchedList);
          }
        }
      }, (error) => {
        console.warn('Firestore classes onSnapshot warning:', error);
        setLoadingClasses(false);
      });
    } catch (err) {
      console.warn('Error connecting to Firestore classes:', err);
      setLoadingClasses(false);
    }

    return () => {
      unsub();
    };
  }, [isOpen]);

  // Extract grade number for current lesson (e.g. "3")
  const lessonGradeNumber = useMemo(() => {
    return extractLessonGradeNumber(lesson);
  }, [lesson]);

  // Filter classes strictly by the grade of the lesson
  const availableClasses = useMemo(() => {
    if (!lessonGradeNumber) return allClasses;
    const filtered = allClasses.filter(c => doesClassMatchGrade(c, lessonGradeNumber));
    // If no class found in current grade, fallback to any matching grade text or empty
    return filtered;
  }, [allClasses, lessonGradeNumber]);

  // Reset defaults when opening with new lesson
  useEffect(() => {
    if (lesson) {
      setCurrentStep(1);
      setTitle(`E-Learning: ${lesson.title}`);
      setAssignedMode('all');
      setIsUnlimited(false);
      setAllowRetake(true);
      setRequireInteractiveVideo(true);
      setSelectedClasses([]);

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const startStr = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
      setStartDate(startStr);
      setDueDate('10/30/2026 11:59 PM');
    }
  }, [lesson, isOpen]);

  if (!isOpen || !lesson) return null;

  const handleConfirmAssignment = async () => {
    if (isSubmittingRef.current || isSubmitting) return;

    const uniqueSelectedClasses = Array.from(new Set(selectedClasses.map(c => c.trim()).filter(Boolean)));
    if (uniqueSelectedClasses.length === 0) {
      alert('Vui lòng chọn ít nhất 1 lớp học để giao bài tập E-Learning!');
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      const rootId = `elearn-${Date.now()}`;

      for (let i = 0; i < uniqueSelectedClasses.length; i++) {
        const cls = uniqueSelectedClasses[i];
        const recordId = uniqueSelectedClasses.length === 1
          ? rootId
          : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        const assignmentRecord: AssignedELearningLesson = {
          id: recordId,
          originalLessonAssignmentId: rootId,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          title: title.trim() || `E-Learning: ${lesson.title}`,
          subject: lesson.subject,
          grade: lesson.grade,
          targetClass: cls, // Lưu độc lập duy nhất 1 lớp cho từng bản ghi
          assignedTo: assignedMode,
          startDate,
          dueDate: isUnlimited ? 'Vô thời hạn' : dueDate,
          isUnlimited,
          allowRetake,
          requireInteractiveVideo,
          assignedAt: new Date().toLocaleDateString('vi-VN'),
          assignedBy: lesson.authorName || 'Thầy/Cô Giáo',
          lessonData: lesson,
          type: 'elearning',
          category: 'elearning',
          contentType: 'elearning'
        };

        await saveAssignedELearningLesson(assignmentRecord);

        if (onConfirmSuccess && i === 0) {
          onConfirmSuccess(assignmentRecord);
        }
      }

      onClose();
    } catch (err) {
      console.error('Error assigning elearning lesson:', err);
      alert('Có lỗi xảy ra khi giao bài. Vui lòng thử lại!');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00875A] text-white flex items-center justify-center shadow-xs">
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-wide uppercase font-heading">
                GIAO BÀI HỌC E-LEARNING
              </h3>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-[#00875A] flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Đã chọn 1 bài học • Cấu hình giao học liệu</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP TABS NAVIGATION (STEPPER) */}
        <div className="px-6 pt-5">
          <div className="bg-slate-100/80 p-1 rounded-full flex items-center">
            {/* Step 1 Tab */}
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex-1 py-2 px-4 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                currentStep === 1
                  ? 'bg-white text-[#00875A] shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>CHỌN BÀI HỌC & MÔN HỌC</span>
            </button>

            {/* Step 2 Tab */}
            <button
              onClick={() => setCurrentStep(2)}
              className={`flex-1 py-2 px-4 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                currentStep === 2
                  ? 'bg-white text-[#00875A] shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>THIẾT LẬP GIAO BÀI</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-5">
          
          {/* ================= STEP 1: CHỌN BÀI HỌC & MÔN HỌC ================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* THÔNG TIN BÀI GIẢNG ĐÃ CHỌN */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  THÔNG TIN BÀI GIẢNG ĐÃ CHỌN
                </label>
                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
                  <div className="bg-white rounded-xl p-3.5 border border-emerald-100 flex items-center gap-3.5 shadow-xs">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center shrink-0 border border-emerald-200/60">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                        {lesson.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Môn: {lesson.subject} • {lesson.grade}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CHỌN LỚP NHẬN BÀI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                      CHỌN LỚP NHẬN BÀI ({selectedClasses.length})
                    </label>
                    {lessonGradeNumber && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Khối {lessonGradeNumber}
                      </span>
                    )}
                  </div>
                  {availableClasses.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedClasses(availableClasses.map(c => c.name))}
                        className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Chọn tất cả
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedClasses([])}
                        className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>

                {loadingClasses && availableClasses.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải danh sách lớp từ cơ sở dữ liệu...</span>
                  </div>
                ) : availableClasses.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200 font-medium">
                    Không tìm thấy lớp nào thuộc Khối {lessonGradeNumber || lesson.grade} trong cơ sở dữ liệu.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {availableClasses.map((clsItem) => {
                        const clsName = clsItem.name;
                        const isSelected = selectedClasses.includes(clsName);
                        return (
                          <button
                            key={clsItem.id || clsName}
                            type="button"
                            onClick={() => {
                              setSelectedClasses(prev =>
                                prev.includes(clsName)
                                  ? prev.filter(c => c !== clsName)
                                  : [...prev, clsName]
                              );
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-[#00875A] text-white shadow-xs ring-2 ring-emerald-600/30'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            <span>{clsName}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedClasses.length > 1 && (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50/70 px-3 py-1.5 rounded-lg border border-emerald-100 font-medium">
                        ℹ️ Hệ thống sẽ tự động tách thành <strong>{selectedClasses.length} bản ghi độc lập</strong> cho từng lớp theo cấu trúc 1 bài - N lần giao.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* GIAO BÀI CHO */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  GIAO BÀI CHO
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Cả lớp */}
                  <label
                    onClick={() => setAssignedMode('all')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs cursor-pointer transition-all ${
                      assignedMode === 'all'
                        ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-900 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      assignedMode === 'all' ? 'border-[#00875A]' : 'border-slate-300'
                    }`}>
                      {assignedMode === 'all' && (
                        <div className="w-2 h-2 rounded-full bg-[#00875A]" />
                      )}
                    </div>
                    <span>Cả lớp</span>
                  </label>

                  {/* Option 2: Từng thành viên */}
                  <label
                    onClick={() => setAssignedMode('individual')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs cursor-pointer transition-all ${
                      assignedMode === 'individual'
                        ? 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-900 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      assignedMode === 'individual' ? 'border-[#00875A]' : 'border-slate-300'
                    }`}>
                      {assignedMode === 'individual' && (
                        <div className="w-2 h-2 rounded-full bg-[#00875A]" />
                      )}
                    </div>
                    <span>Từng thành viên</span>
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* ================= STEP 2: THIẾT LẬP GIAO BÀI ================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* BÀI HỌC E-LEARNING ĐÃ CHỌN (1 BÀI) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  BÀI HỌC E-LEARNING ĐÃ CHỌN (1 BÀI)
                </label>
                <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 min-w-0">
                    <span className="text-[#00875A] font-black">•</span>
                    <BookOpen className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{lesson.title}</span>
                  </div>
                  <span className="shrink-0 bg-emerald-100 text-[#00875A] text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                    E-LEARNING
                  </span>
                </div>
              </div>

              {/* TIÊU ĐỀ BÀI GIAO (MẶC ĐỊNH) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  TIÊU ĐỀ BÀI GIAO (MẶC ĐỊNH):
                </label>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề bài giao..."
                    className="w-full bg-transparent outline-none font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* THỜI ĐIỂM MỞ ĐỀ & HẠN NỘP BÀI */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                      THỜI ĐIỂM MỞ ĐỀ
                    </span>
                    <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                      HẠN NỘP BÀI
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={isUnlimited}
                      onChange={(e) => setIsUnlimited(e.target.checked)}
                      className="rounded text-[#00875A] focus:ring-[#00875A] w-3.5 h-3.5"
                    />
                    <span>VÔ THỜI HẠN</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mở đề */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Thời điểm mở bài</label>
                    <DateTimePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="DD/MM/YYYY HH:mm"
                    />
                  </div>

                  {/* Hạn nộp bài */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Hạn nộp bài</label>
                    <DateTimePicker
                      disabled={isUnlimited}
                      value={isUnlimited ? 'Vô thời hạn' : dueDate}
                      onChange={setDueDate}
                      placeholder="DD/MM/YYYY HH:mm"
                    />
                  </div>
                </div>
              </div>

              {/* TÙY CHỌN BỔ SUNG */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {/* Cho phép làm lại */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowRetake}
                      onChange={(e) => setAllowRetake(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Cho phép làm lại</span>
                  </label>
                  <span className="text-slate-400 font-medium">
                    Không giới hạn số lần luyện tập
                  </span>
                </div>

                {/* Yêu cầu hoàn thành các video tương tác */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Yêu cầu hoàn thành các video tương tác</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireInteractiveVideo(!requireInteractiveVideo)}
                    className="font-bold text-[#00875A] bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors"
                  >
                    {requireInteractiveVideo ? 'Có' : 'Không'}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          {currentStep === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00875A] hover:bg-[#00704A] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Tiếp theo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmAssignment}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#00875A] hover:bg-[#00704A] transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting ? 'Đang lưu bài giao...' : 'Xác nhận giao bài E-Learning (1 bài)'}
                </span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
