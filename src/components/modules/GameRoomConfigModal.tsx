import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, X, Users, Clock, BookOpen, Sparkles, Check, School } from 'lucide-react';
import { QuestionItem, GameItem } from '../../types';
import { useClassesList } from '../../services/classStorageService';
import { auth } from '../../services/firebase';
import { resolveCurrentTeacherProfile } from '../../services/teacherStorageService';

interface GameRoomConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    id?: string;
    title: string;
    subject: string;
    grade: string;
    classInfo?: string;
    maxPlayers?: number;
    status?: 'open' | 'closed';
    timePerQuestion?: string;
    isTimeLimited?: boolean;
    questions: (QuestionItem | {
      id: string;
      question?: string;
      content?: string;
      options?: string[];
      answer?: string;
      correctAnswer?: string;
      explanation?: string;
    })[];
  } | null;
  onSaveGameRoom: (gameItem: GameItem) => void;
}

export const GameRoomConfigModal: React.FC<GameRoomConfigModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSaveGameRoom,
}) => {
  const { getClassesForGrade } = useClassesList();
  const authEmail = (typeof window !== 'undefined' ? (auth?.currentUser?.email || localStorage.getItem('eduplay_teacher_email')) : null);
  const activeTeacherProfile = useMemo(() => resolveCurrentTeacherProfile(authEmail), [authEmail]);
  const [roomTitle, setRoomTitle] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [roomTopic, setRoomTopic] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState('10 giây / câu (Nhanh tay lẹ mắt)');
  const [isTimeLimited, setIsTimeLimited] = useState(true);

  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (initialData) {
      setRoomTitle(initialData.title || 'Luyện tập: Tự nhiên và công nghệ');
      const firstQ = initialData.questions?.[0] as any;
      setRoomTopic(firstQ?.lessonName || initialData.subject || 'Bài 1: Tự nhiên và công nghệ');
      if (initialData.classInfo) {
        const classes = initialData.classInfo.split(',').map(c => c.trim()).filter(Boolean);
        setSelectedClasses(classes);
      } else {
        setSelectedClasses([]);
      }
      if (initialData.maxPlayers) setMaxPlayers(initialData.maxPlayers);
      if (initialData.timePerQuestion) setTimePerQuestion(initialData.timePerQuestion);
      if (initialData.isTimeLimited !== undefined) setIsTimeLimited(initialData.isTimeLimited);
      else setIsTimeLimited(true);
    }
  }, [initialData]);

  if (!isOpen || !initialData) return null;

  const availableClasses = getClassesForGrade(initialData.grade).map(c => c.name);

  const handleSave = () => {
    if (!roomTitle.trim()) {
      alert('Vui lòng nhập tên phòng!');
      return;
    }

    if (selectedClasses.length === 0) {
      alert('Vui lòng chọn ít nhất 1 lớp nhận phòng trò chơi!');
      return;
    }

    const rootId = initialData.id || `game-${Date.now()}`;

    selectedClasses.forEach((cls, idx) => {
      const isFirst = idx === 0;
      const gameId = isEditing && isFirst ? initialData.id! : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`;

      const newGame: GameItem = {
        id: gameId,
        originalGameId: rootId,
        title: roomTitle,
        type: 'speed_quiz',
        subject: initialData.subject,
        grade: initialData.grade || 'Khối 3',
        classInfo: cls, // Lưu độc lập duy nhất 1 lớp
        maxPlayers: maxPlayers,
        status: initialData.status || 'open',
        timePerQuestion: timePerQuestion,
        isTimeLimited: isTimeLimited,
        description: `Phòng trực quan ${cls} - Chủ đề: ${roomTopic} (${initialData.questions.length} câu hỏi).`,
        questions: initialData.questions.map((q: any) => ({
          id: q.id,
          type: q.type,
          question: q.question || q.content,
          content: q.content || q.question,
          options: q.options || [],
          answer: q.answer || q.correctAnswer,
          correctAnswer: q.correctAnswer || q.answer,
          explanation: q.explanation || '',
          statements: q.statements || [],
          matchingPairs: q.matchingPairs || [],
          classificationItems: q.classificationItems || [],
          classificationGroups: q.classificationGroups || []
        })),
        playersCount: 0,
        teacherId: activeTeacherProfile.id,
        teacherName: activeTeacherProfile.name,
        teacherEmail: activeTeacherProfile.email,
        createdBy: activeTeacherProfile.id,
        authorName: activeTeacherProfile.name,
        authorType: 'my',
      };

      onSaveGameRoom(newGame);
    });

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 p-6 text-white relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-amber-300">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold font-heading">
                    {isEditing ? 'Chỉnh sửa Cấu hình Phòng Trò Chơi' : 'Cấu hình Phòng Trò Chơi Trực Quan'}
                  </h2>
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    {isEditing ? 'CHẾ ĐỘ SỬA PHÒNG' : 'Đấu trường trực tuyến'}
                  </span>
                </div>
                <p className="text-purple-100 text-xs mt-0.5">
                  Đóng gói {initialData.questions.length} câu hỏi đã chọn thành phòng trực quan cho học sinh
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm">
                  1
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Bộ câu hỏi thi đấu sẵn sàng</h4>
                  <p className="text-xs text-slate-500">
                    Môn: <span className="font-bold text-slate-700">{initialData.subject}</span> • Khối:{' '}
                    <span className="font-bold text-slate-700">{initialData.grade}</span>
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl">
                {roomTopic || 'Tự nhiên và công nghệ'}
              </span>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Tên phòng */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Tên phòng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                  placeholder="Nhập tên phòng đấu trường..."
                />
              </div>

              {/* Lớp & Chủ đề */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold text-slate-700">
                      Lớp nhận phòng ({selectedClasses.length}) <span className="text-rose-500">*</span>
                    </label>
                    {availableClasses.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedClasses(availableClasses)}
                          className="font-bold text-purple-700 hover:underline cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedClasses([])}
                          className="font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50/50 min-h-[42px] items-center">
                    {availableClasses.map((cls) => {
                      const isSelected = selectedClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setSelectedClasses(prev =>
                              prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
                            );
                          }}
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{cls}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedClasses.length > 1 && (
                    <p className="text-[11px] text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 font-medium mt-1.5">
                      ℹ️ Hệ thống sẽ tách thành <strong>{selectedClasses.length} phòng độc lập</strong> theo từng lớp.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Chủ đề <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roomTopic}
                    onChange={(e) => setRoomTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                    placeholder="Ví dụ: Bài 1..."
                  />
                </div>
              </div>

              {/* Người chơi & Thời gian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Người chơi (Giới hạn tối đa) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Thời gian mỗi câu hỏi
                  </label>
                  <select
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50 cursor-pointer"
                  >
                    <option value="10 giây / câu (Nhanh tay lẹ mắt)">10 giây / câu (Nhanh tay lẹ mắt)</option>
                    <option value="15 giây / câu">15 giây / câu</option>
                    <option value="20 giây / câu">20 giây / câu</option>
                    <option value="30 giây / câu">30 giây / câu</option>
                  </select>
                </div>
              </div>

              {/* Toggle Giới hạn thời gian mỗi câu hỏi */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    ⏱
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-indigo-950">Giới hạn thời gian mỗi câu hỏi</h5>
                    <p className="text-[11px] text-indigo-700">Bật: Thi đấu trực tiếp (có đếm ngược). Tắt: Chế độ tự học không giới hạn giờ.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTimeLimited}
                    onChange={(e) => setIsTimeLimited(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Public Badge Info */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-emerald-900">Phòng thi đấu Công khai (Tự do tham gia)</h5>
                    <p className="text-[11px] text-emerald-700">Học sinh trong lớp có thể nhìn thấy và tham gia thi đấu ngay</p>
                  </div>
                </div>
                <span className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 rounded-xl shadow-xs">
                  Công khai 🚪
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-transform active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận lưu</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
