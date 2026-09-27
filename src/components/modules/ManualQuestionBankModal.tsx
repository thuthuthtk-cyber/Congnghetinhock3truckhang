import React, { useState, useEffect } from 'react';
import { X, Plus, Save, PenTool, Clock } from 'lucide-react';
import { QuestionItem, CognitiveLevel } from '../../types';
import { GRADES, SUBJECTS, EXAM_TYPES, normalizeQuestionType, synchronizeOrderingSteps } from '../../lib/constants';
import { QuestionEditor } from '../shared/QuestionEditor';

interface ManualQuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuestions: (
    questions: QuestionItem[], 
    saveToGlobalBank: boolean, 
    meta?: { 
      examType: string; 
      durationMinutes: number; 
      lessonName: string; 
      grade: string; 
      subject: string; 
    }
  ) => void;
  initialQuestions?: Partial<QuestionItem>[];
  initialLessonName?: string;
  initialGrade?: string;
  initialSubject?: string;
  showSaveToGlobalCheckbox?: boolean;
  defaultSaveToGlobal?: boolean;
}

export const ManualQuestionBankModal: React.FC<ManualQuestionBankModalProps> = ({
  isOpen,
  onClose,
  onSaveQuestions,
  initialQuestions,
  initialLessonName,
  initialGrade,
  initialSubject,
  showSaveToGlobalCheckbox = true,
  defaultSaveToGlobal = false,
}) => {
  const [lessonName, setLessonName] = useState(initialLessonName || '');
  const [grade, setGrade] = useState(initialGrade || GRADES[0] || 'Khối 3');
  const [subject, setSubject] = useState(initialSubject || SUBJECTS[0] || 'Tin học');
  const [examType, setExamType] = useState(EXAM_TYPES[0] || 'Thường xuyên');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [defaultLevel, setDefaultLevel] = useState<CognitiveLevel>('nhan_biet');
  const [saveToGlobal, setSaveToGlobal] = useState<boolean>(defaultSaveToGlobal);
  
  const [questions, setQuestions] = useState<Partial<QuestionItem>[]>(
    initialQuestions && initialQuestions.length > 0
      ? initialQuestions
      : [
          {
            id: `q-${Date.now()}-1`,
            type: 'multiple_choice',
            content: '',
            options: ['', '', '', ''],
            correctAnswer: 'A',
            explanation: '',
            level: 'nhan_biet' as CognitiveLevel
          }
        ]
  );

  useEffect(() => {
    if (isOpen) {
      if (initialLessonName !== undefined) setLessonName(initialLessonName);
      if (initialGrade !== undefined) setGrade(initialGrade);
      if (initialSubject !== undefined) setSubject(initialSubject);
      if (initialQuestions && initialQuestions.length > 0) {
        setQuestions(initialQuestions);
      } else {
        setQuestions([
          {
            id: `q-${Date.now()}-1`,
            type: 'multiple_choice',
            content: '',
            options: ['', '', '', ''],
            correctAnswer: 'A',
            explanation: '',
            level: 'nhan_biet' as CognitiveLevel
          }
        ]);
      }
    }
  }, [isOpen, initialQuestions, initialLessonName, initialGrade, initialSubject]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    const newQ: Partial<QuestionItem> = {
      id: `q-${Date.now()}-${questions.length + 1}`,
      type: 'multiple_choice',
      content: '',
      options: ['', '', '', ''],
      correctAnswer: 'A',
      explanation: '',
      level: defaultLevel
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, updated: Partial<QuestionItem>) => {
    const newArr = [...questions];
    newArr[index] = { ...newArr[index], ...updated };
    setQuestions(newArr);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      setErrorMsg('Đề thi phải có ít nhất 1 câu hỏi.');
      return;
    }
    setErrorMsg(null);
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    if (!lessonName.trim()) {
      setErrorMsg('Vui lòng nhập tên Chủ đề / Bài học.');
      return;
    }
    if (!examType || !examType.trim()) {
      setErrorMsg('Vui lòng chọn Loại bài kiểm tra.');
      return;
    }
    if (!durationMinutes || Number(durationMinutes) <= 0) {
      setErrorMsg('Vui lòng nhập Thời gian thi hợp lệ (lớn hơn 0 phút).');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].content?.trim()) {
        setErrorMsg(`Vui lòng nhập nội dung cho Câu hỏi ${i + 1}.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const sanitized: QuestionItem[] = questions.map((q, idx) => {
        const fallbackCode = `CH-${(subject || 'TOAN').toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}-${idx + 1}`;
        const activeType = normalizeQuestionType(q.type);
        const baseItem: QuestionItem = {
          id: q.id || `q-${Date.now()}-${idx}`,
          code: q.code || fallbackCode,
          subject: subject,
          grade: grade,
          level: q.level || defaultLevel,
          type: activeType,
          lessonName: lessonName,
          content: q.content || '',
          options: [],
          correctAnswer: '',
          explanation: q.explanation || 'Giải thích sư phạm cho câu hỏi.',
          statements: undefined,
          classificationGroups: undefined,
          classificationItems: undefined,
          matchingPairs: undefined,
          imageUrl: q.imageUrl,
          imagePrompt: q.imagePrompt,
          createdAt: Date.now()
        };

        switch (activeType) {
          case 'multiple_choice':
            baseItem.options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ['', '', '', ''];
            baseItem.correctAnswer = q.correctAnswer || 'A';
            break;
          case 'multiple_response':
            baseItem.options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ['', '', '', ''];
            baseItem.correctAnswer = q.correctAnswer || 'A,B';
            break;
          case 'true_false':
            baseItem.statements = Array.isArray(q.statements) && q.statements.length > 0
              ? q.statements
              : [{ statement: '', isCorrect: true }, { statement: '', isCorrect: false }];
            break;
          case 'fill_blank':
          case 'essay':
            baseItem.correctAnswer = q.correctAnswer || '';
            break;
          case 'ordering': {
            const orderOpts = Array.isArray(q.options) && q.options.length > 0
              ? q.options.map(s => String(s ?? '').trim()).filter(Boolean)
              : ['Bước 1', 'Bước 2', 'Bước 3'];
            const synced = synchronizeOrderingSteps(orderOpts);
            baseItem.options = synced.options;
            baseItem.canonicalOptions = synced.canonicalOptions;
            baseItem.correctOrder = synced.correctOrder;
            baseItem.orderingSteps = synced.orderingSteps;
            baseItem.correctAnswer = synced.correctAnswer;
            baseItem.teacherEditedOrder = true;
            break;
          }
          case 'matching':
            baseItem.matchingPairs = Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0
              ? q.matchingPairs
              : [{ left: '', right: '' }, { left: '', right: '' }];
            break;
          case 'classification':
            baseItem.classificationGroups = Array.isArray(q.classificationGroups) && q.classificationGroups.length > 0
              ? q.classificationGroups
              : ['Nhóm 1', 'Nhóm 2'];
            baseItem.classificationItems = Array.isArray(q.classificationItems) && q.classificationItems.length > 0
              ? q.classificationItems
              : [{ name: '', content: '', group: 'Nhóm 1' }];
            break;
        }

        return baseItem;
      });

      onSaveQuestions(sanitized, saveToGlobal, {
        examType: examType || 'Thường xuyên',
        durationMinutes: Number(durationMinutes) || 45,
        lessonName,
        grade,
        subject,
      });
      onClose();
    } catch (err) {
      console.error('Error saving manual questions:', err);
      setErrorMsg('Đã xảy ra lỗi khi lưu câu hỏi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white backdrop-blur-md">
              <PenTool className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Soạn đề thủ công (Ngân hàng câu hỏi)</h3>
              <p className="text-xs text-indigo-100/80">Tự soạn nội dung câu hỏi, phương án và đáp án chi tiết không qua AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          {/* Metadata Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Thông tin chung đề kiểm tra</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên Chủ đề / Bài học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  placeholder="Ví dụ: Phép nhân và phép chia phạm vi 1000..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Chọn khối</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 cursor-pointer"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Chọn môn học</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 cursor-pointer"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mức độ nhận thức mặc định</label>
                <select
                  value={defaultLevel}
                  onChange={(e) => setDefaultLevel(e.target.value as CognitiveLevel)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 cursor-pointer"
                >
                  <option value="nhan_biet">Nhận biết</option>
                  <option value="thong_hieu">Thông hiểu</option>
                  <option value="van_dung">Vận dụng</option>
                  <option value="van_dung_cao">Vận dụng cao</option>
                </select>
              </div>
            </div>
          </div>

          {/* Questions Header & List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Danh sách câu hỏi soạn tay</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-extrabold">
                  {questions.length} câu
                </span>
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm câu hỏi mới</span>
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <QuestionEditor
                  key={q.id || idx}
                  question={q}
                  index={idx}
                  onChange={(updated) => handleUpdateQuestion(idx, updated)}
                  onDelete={() => handleDeleteQuestion(idx)}
                />
              ))}
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-6 py-3 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer w-full max-w-md"
              >
                <Plus className="w-4 h-4" />
                <span>Bấm để thêm câu hỏi tiếp theo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {showSaveToGlobalCheckbox ? (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToGlobal}
                onChange={(e) => setSaveToGlobal(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <span>Lưu vào Ngân hàng câu hỏi chung</span>
            </label>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Xác nhận lưu'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
