import React, { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  Gamepad2,
  BookOpen,
  X,
  Sparkles,
  ChevronDown,
  Check,
  Layers,
  Laptop,
  Loader2
} from 'lucide-react';
import { useClassesList } from '../../services/classStorageService';
import { GRADES, SUBJECTS } from '../../lib/constants';
import { QuizziGameItem } from '../../types';
import { auth } from '../../services/firebase';
import { resolveCurrentTeacherProfile } from '../../services/teacherStorageService';

interface QuizziGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newGames: QuizziGameItem[]) => Promise<void> | void;
  initialData?: QuizziGameItem | null;
}

export const QuizziGameModal: React.FC<QuizziGameModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const { getClassesForGrade } = useClassesList();

  const authEmail = (typeof window !== 'undefined' ? (auth?.currentUser?.email || localStorage.getItem('eduplay_teacher_email')) : null);
  const activeTeacherProfile = useMemo(() => resolveCurrentTeacherProfile(authEmail), [authEmail]);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('Khối 3');
  // Trạng thái khởi tạo luôn trống rỗng ([]) cho đến khi người dùng chủ động chọn
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [subject, setSubject] = useState('Tin học');
  const [embedUrl, setEmbedUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Lấy danh sách lớp khả dụng theo khối
  const availableClasses = getClassesForGrade(selectedGrade).map((c) => c.name);

  // Khi khối lớp thay đổi, trạng thái lớp đã chọn luôn được đặt lại thành rỗng ([])
  const handleGradeChange = (newGrade: string) => {
    setSelectedGrade(newGrade);
    setSelectedClasses([]);
  };

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDesc(initialData.desc || '');
      setSelectedGrade(initialData.grade || 'Khối 3');
      setSubject(initialData.subjectLabel || initialData.subject || 'Tin học');
      setEmbedUrl(initialData.embedUrl || '');
      if (initialData.classInfo) {
        const classes = initialData.classInfo.split(',').map((c) => c.trim()).filter(Boolean);
        setSelectedClasses(classes);
      } else {
        setSelectedClasses([]);
      }
    } else {
      setTitle('');
      setDesc('');
      setSelectedGrade('Khối 3');
      setSelectedClasses([]); // Tuyệt đối không gán cứng Lớp 3A, để trống [] cho người dùng tự chọn
      setSubject('Tin học');
      setEmbedUrl('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Toggle chọn / bỏ chọn 1 lớp
  const handleToggleClass = (className: string) => {
    setSelectedClasses((prev) =>
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    );
  };

  // Chọn tất cả lớp trong khối
  const handleSelectAllClasses = () => {
    setSelectedClasses(availableClasses);
  };

  // Bỏ chọn tất cả
  const handleDeselectAllClasses = () => {
    setSelectedClasses([]);
  };

  // Bóc tách URL sạch nếu người dùng dán cả mã nhúng iframe
  const extractCleanUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      return iframeMatch[1];
    }
    return trimmed;
  };

  const handleConfirm = async () => {
    if (isSaving) return;

    if (!title.trim()) {
      alert('Vui lòng nhập tên trò chơi Quizzi!');
      return;
    }

    if (selectedClasses.length === 0) {
      alert('Vui lòng chọn ít nhất 1 lớp học để giao trò chơi!');
      return;
    }

    const cleanUrl = extractCleanUrl(embedUrl);

    // Xác định icon và màu sắc phù hợp theo môn học
    const getSubjectConfig = (subj: string) => {
      const lower = subj.toLowerCase();
      if (lower.includes('tin học') || lower.includes('công nghệ')) {
        return { icon: 'Laptop', color: 'sky', subjectUpper: subj.toUpperCase() };
      }
      if (lower.includes('tiếng việt') || lower.includes('ngữ văn')) {
        return { icon: 'BookOpen', color: 'emerald', subjectUpper: subj.toUpperCase() };
      }
      if (lower.includes('toán')) {
        return { icon: 'Layers', color: 'amber', subjectUpper: subj.toUpperCase() };
      }
      return { icon: 'Laptop', color: 'indigo', subjectUpper: subj.toUpperCase() };
    };

    const subjConfig = getSubjectConfig(subject);
    const rootId = initialData ? String(initialData.originalGameId || initialData.id) : `quizzi-${Date.now()}`;

    // Lọc duy nhất danh sách lớp thực tế được chọn, tuyệt đối không tự cộng thêm lớp ngoài
    const uniqueSelectedClasses = Array.from(new Set(selectedClasses.map((c) => c.trim()).filter(Boolean)));

    if (uniqueSelectedClasses.length === 0) {
      alert('Vui lòng chọn ít nhất 1 lớp học để giao trò chơi!');
      return;
    }

    // Chỉ tạo chính xác số lượng bản ghi tương ứng với mảng các lớp đã chọn thực tế
    const generatedGames: QuizziGameItem[] = uniqueSelectedClasses.map((cls, idx) => {
      // Khi cập nhật: Nếu chỉ có 1 lớp và khớp lớp cũ của initialData thì giữ nguyên ID cũ
      const isRetainingId = initialData && uniqueSelectedClasses.length === 1 && initialData.classInfo === cls;
      const gameId = isRetainingId 
        ? initialData.id 
        : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`;

      return {
        id: gameId,
        originalGameId: rootId,
        title: title.trim(),
        desc: desc.trim() || `Trò chơi tương tác môn ${subject} dành cho học sinh ${selectedGrade} (${cls})`,
        subject: subjConfig.subjectUpper,
        subjectLabel: subject,
        grade: selectedGrade,
        classInfo: cls, // Lưu độc lập duy nhất 1 lớp được giáo viên chọn
        icon: subjConfig.icon,
        color: subjConfig.color,
        type: 'Nhúng liên kết',
        embedUrl: cleanUrl,
        teacherId: activeTeacherProfile.id,
        teacherName: activeTeacherProfile.name,
        teacherEmail: activeTeacherProfile.email,
        createdBy: activeTeacherProfile.id,
        authorName: activeTeacherProfile.name,
        authorType: 'my',
        createdAt: new Date().toLocaleDateString('vi-VN'),
      };
    });

    try {
      setIsSaving(true);
      await onSave(generatedGames);
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu trò chơi Quizzi:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 flex items-start justify-between relative shrink-0">
          <div className="flex items-start gap-4 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0 border border-white/20">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black font-heading tracking-wide">
                {initialData ? 'Chỉnh sửa trò chơi Quizzi' : 'Tạo trò chơi Quizzi (Nhúng Liên kết)'}
              </h3>
              <p className="text-indigo-100 text-sm mt-1">
                Hỗ trợ liên kết Wordwall, Quizizz, Kahoot, Google Forms, v.v.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Tên trò chơi */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-bold text-teal-700">
              <Gamepad2 className="w-4 h-4" /> Tên trò chơi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Đấu trường ô chữ ôn tập Tin học lớp 3..."
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Mô tả ngắn */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <BookOpen className="w-4 h-4" /> Mô tả ngắn
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Nhập mô tả hoặc hướng dẫn cách chơi cho các em..."
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* 3 cột: Khối lớp - Môn học */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800">
                Khối lớp <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedGrade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800">
                Môn học <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Trường Lớp hỗ trợ Multi-select Tags */}
          <div className="space-y-2 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>Lớp nhận trò chơi</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black transition-colors ${
                  selectedClasses.length > 0 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {selectedClasses.length > 0 ? `${selectedClasses.length} lớp đã chọn` : 'Chưa chọn lớp'}
                </span>
                <span className="text-rose-500">*</span>
              </label>

              {availableClasses.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllClasses}
                    className="font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllClasses}
                    className="font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
            </div>

            {/* Danh sách thẻ Tags Multi-select */}
            <div className="flex flex-wrap gap-2 pt-1">
              {availableClasses.map((cls) => {
                const isSelected = selectedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => handleToggleClass(cls)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-xs scale-100 ring-2 ring-purple-300 ring-offset-1'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-white/20 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                    </div>
                    <span>{cls}</span>
                  </button>
                );
              })}
            </div>

            {selectedClasses.length === 0 ? (
              <p className="text-xs text-rose-500 font-semibold italic mt-1">
                ⚠️ Vui lòng chọn ít nhất 1 lớp học để phân phối trò chơi.
              </p>
            ) : selectedClasses.length > 1 ? (
              <p className="text-xs text-purple-700 bg-white/80 p-2 rounded-xl border border-purple-200 font-medium mt-1">
                💡 Hệ thống sẽ tự động tách thành <strong>{selectedClasses.length} trò chơi Quizzi độc lập</strong> cho từng lớp theo mô hình 1 nội dung gốc – N lần giao độc lập.
              </p>
            ) : null}
          </div>

          {/* Link trò chơi */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-bold text-indigo-600">
              <Link2 className="w-4 h-4" /> LINK TRÒ CHƠI (IFRAME/URL) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="Dán URL trò chơi hoặc dán toàn bộ đoạn mã nhúng iframe vào đây..."
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
            <p className="text-xs text-slate-400 font-medium leading-relaxed flex gap-1 items-start mt-1.5">
              <span className="shrink-0">💡</span>
              <span>
                Hệ thống sẽ tự động bóc tách đường dẫn sạch từ đoạn mã nhúng '&lt;iframe src="..."&gt;' của Wordwall, Kahoot, Quizizz, v.v.
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-5 flex items-center justify-center sm:justify-end gap-3 rounded-b-3xl shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu lên Firestore...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> {initialData ? 'Cập nhật trò chơi' : 'Xác nhận tạo'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
