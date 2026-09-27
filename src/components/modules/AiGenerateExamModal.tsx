import React, { useState } from 'react';
import {
  Sparkles,
  X,
  LayoutGrid,
  FileText,
  Upload,
  PenTool,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { generateExamQuestionsAI } from '../../services/geminiService';

interface AiGenerateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (questions: any[], metadata: { topic: string; grade: string; subject: string; examType: string; difficulty: string }) => void;
  grades?: string[];
  subjects?: string[];
}

const DEFAULT_GRADES = ['Khối 3'];
const DEFAULT_SUBJECTS = [
  'Tin học',
  'Công nghệ',
  'Toán học',
  'Tiếng Việt',
  'Tiếng Anh',
  'Khoa học',
  'Lịch sử & Địa lí',
  'Đạo đức',
  'Âm nhạc',
  'Mĩ thuật',
  'Giáo dục thể chất',
  'Hoạt động trải nghiệm'
];

export const AiGenerateExamModal: React.FC<AiGenerateExamModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  grades = DEFAULT_GRADES,
  subjects = DEFAULT_SUBJECTS,
}) => {
  // Top 5 settings
  const [lessonName, setLessonName] = useState('Thông tin và quyết định');
  const [lessonNameError, setLessonNameError] = useState(false);
  const [grade, setGrade] = useState(grades[0] || 'Khối 3');
  const [subject, setSubject] = useState('Tin học');
  const [examType, setExamType] = useState('Thường xuyên');
  const [difficulty, setDifficulty] = useState('Cả 3 mức độ');

  // Creation mode: 'standard' | 'paste' | 'file' | 'manual'
  const [sourceMode, setSourceMode] = useState<'standard' | 'paste' | 'file' | 'manual'>('manual');

  // Standard mode
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Paste mode
  const [rawText, setRawText] = useState('');

  // File mode
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState('');

  // Manual mode state
  const [manualQuestions, setManualQuestions] = useState<any[]>([
    {
      id: 1,
      type: 'Single Choice',
      points: 1,
      content: '',
      options: [
        { label: 'A', text: '', isCorrect: true },
        { label: 'B', text: '', isCorrect: false },
        { label: 'C', text: '', isCorrect: false },
        { label: 'D', text: '', isCorrect: false }
      ],
      explanation: ''
    }
  ]);

  // Preview & Processing state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isPreviewStep, setIsPreviewStep] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleStartCreateExam = async () => {
    if (!lessonName.trim()) {
      setLessonNameError(true);
      setGenerationError('Vui lòng nhập chủ đề đề kiểm tra');
      return;
    }
    setLessonNameError(false);
    setGenerationError(null);

    // If Manual Mode
    if (sourceMode === 'manual') {
      const validQuestions = manualQuestions.filter(q => q.content.trim());
      if (validQuestions.length === 0) {
        setGenerationError('Vui lòng nhập nội dung cho ít nhất 1 câu hỏi');
        return;
      }

      const formatted = validQuestions.map((q, idx) => {
        let optionsObj: Record<string, string> = {};
        let correctArr: string[] = [];

        if (q.type === 'Single Choice' || q.type === 'Multiple Choice' || !q.type) {
          q.options.forEach((opt: any) => {
            optionsObj[opt.label] = opt.text;
            if (opt.isCorrect) correctArr.push(opt.label);
          });
        }

        return {
          id: `manual_${Date.now()}_${idx}`,
          content: q.content,
          type: q.type === 'Single Choice' ? 'multiple_choice' : q.type === 'Multiple Choice' ? 'multiple_response' : q.type === 'True / False' ? 'true_false' : q.type === 'Điền khuyết' ? 'fill_blank' : 'essay',
          options: optionsObj,
          correctAnswer: correctArr.length === 1 ? correctArr[0] : correctArr,
          explanation: q.explanation || '',
          grade: grade,
          subject: subject,
          difficulty: difficulty.includes('Nhận biết') ? 'easy' : difficulty.includes('Thông hiểu') ? 'medium' : difficulty.includes('Vận dụng') ? 'hard' : 'medium',
          points: q.points || 1,
          topic: lessonName
        };
      });

      setPreviewQuestions(formatted);
      setIsPreviewStep(true);
      return;
    }

    // AI Generation for Standard, Paste, File
    setIsGenerating(true);
    try {
      let promptContent = '';
      if (sourceMode === 'standard') {
        promptContent = `Tạo bộ đề kiểm tra ${examType} môn ${subject} ${grade} theo chuẩn GDPT 2018. Chủ đề: "${lessonName}". Phân bố mức độ: "${difficulty}". Số lượng câu hỏi: ${questionCount}.`;
      } else if (sourceMode === 'paste') {
        if (!rawText.trim()) {
          setGenerationError('Vui lòng dán nội dung văn bản đề bài hoặc kiến thức');
          setIsGenerating(false);
          return;
        }
        promptContent = rawText;
      } else if (sourceMode === 'file') {
        if (!uploadedFileContent.trim()) {
          setGenerationError('Vui lòng tải lên tệp tài liệu');
          setIsGenerating(false);
          return;
        }
        promptContent = `Dựa vào tài liệu đính kèm sau: \n${uploadedFileContent}\nHãy tạo các câu hỏi sư phạm đánh giá môn ${subject} lớp ${grade}, chủ đề "${lessonName}".`;
      }

      const generated = await generateExamQuestionsAI(
        subject,
        grade,
        promptContent,
        questionCount || 10
      );

      if (Array.isArray(generated) && generated.length > 0) {
        const enriched = generated.map((item: any, idx: number) => ({
          id: item.id || `ai_${Date.now()}_${idx}`,
          content: item.content || `Câu hỏi ${idx + 1}`,
          type: item.type || 'multiple_choice',
          options: item.options || {},
          correctAnswer: item.correctAnswer || 'A',
          explanation: item.explanation || '',
          grade: grade,
          subject: subject,
          difficulty: item.level === 'nhan_biet' ? 'easy' : item.level === 'thong_hieu' ? 'medium' : 'hard',
          points: 1,
          topic: lessonName
        }));

        setPreviewQuestions(enriched);
        setIsPreviewStep(true);
      } else {
        throw new Error('Không thể tạo câu hỏi từ dữ liệu đã chọn. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      setGenerationError(err?.message || 'Có lỗi xảy ra khi tạo câu hỏi bằng AI. Vui lòng kiểm tra lại kết nối hoặc API Key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmSave = () => {
    onSuccess(previewQuestions, {
      topic: lessonName,
      grade,
      subject,
      examType,
      difficulty
    });
    onClose();
  };

  return (
    <div id="ai-generate-exam-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div id="ai-generate-exam-modal-container" className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <h3 id="ai-modal-title" className="text-base font-bold text-slate-800 font-heading">Trung tâm tạo đề</h3>
          <button
            id="ai-modal-close-btn"
            name="close_modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30">
          {/* Top 5 Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Chủ đề đề mới */}
            <div className="space-y-1.5">
              <label htmlFor="ai-exam-topic-input" className="block text-xs font-bold text-slate-800">
                Chủ đề đề mới <span className="text-rose-500">*</span>
              </label>
              <input
                id="ai-exam-topic-input"
                name="exam_topic"
                type="text"
                value={lessonName}
                onChange={(e) => {
                  setLessonName(e.target.value);
                  setLessonNameError(false);
                }}
                placeholder="Nhập chủ đề đề thi..."
                className={`w-full px-3.5 py-2 text-xs rounded-xl border ${
                  lessonNameError ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20' : 'border-slate-300 bg-white'
                } text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 font-medium transition-all shadow-2xs`}
              />
            </div>

            {/* 2. Chọn khối */}
            <div className="space-y-1.5">
              <label htmlFor="ai-exam-grade-select" className="block text-xs font-bold text-slate-800">Chọn khối</label>
              <select
                id="ai-exam-grade-select"
                name="exam_grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:border-teal-500 font-medium cursor-pointer shadow-2xs"
              >
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* 3. Chọn môn học */}
            <div className="space-y-1.5">
              <label htmlFor="ai-exam-subject-select" className="block text-xs font-bold text-slate-800">Chọn môn học</label>
              <select
                id="ai-exam-subject-select"
                name="exam_subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:border-teal-500 font-medium cursor-pointer shadow-2xs"
              >
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* 4. Loại bài kiểm tra */}
            <div className="space-y-1.5">
              <label htmlFor="ai-exam-type-select" className="block text-xs font-bold text-slate-800">Loại bài kiểm tra</label>
              <select
                id="ai-exam-type-select"
                name="exam_type"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:border-teal-500 font-medium cursor-pointer shadow-2xs"
              >
                <option value="Thường xuyên">Thường xuyên</option>
                <option value="Định kỳ giữa kỳ">Định kỳ giữa kỳ</option>
                <option value="Định kỳ cuối kỳ">Định kỳ cuối kỳ</option>
                <option value="Khảo sát chất lượng">Khảo sát chất lượng</option>
              </select>
            </div>

            {/* 5. Mức độ */}
            <div className="space-y-1.5">
              <label htmlFor="ai-exam-difficulty-select" className="block text-xs font-bold text-slate-800">Mức độ</label>
              <select
                id="ai-exam-difficulty-select"
                name="exam_difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:border-teal-500 font-medium cursor-pointer shadow-2xs"
              >
                <option value="Cả 3 mức độ">Cả 3 mức độ</option>
                <option value="Mức 1 (Nhận biết)">Mức 1 (Nhận biết)</option>
                <option value="Mức 2 (Thông hiểu)">Mức 2 (Thông hiểu)</option>
                <option value="Mức 3 (Vận dụng)">Mức 3 (Vận dụng)</option>
                <option value="Mức 4 (Vận dụng cao)">Mức 4 (Vận dụng cao)</option>
              </select>
            </div>
          </div>

          {/* Creation Methods Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              Phương thức tạo đề <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'standard', name: 'Cấu trúc chuẩn', icon: LayoutGrid },
                { id: 'paste', name: 'Dán đề mẫu', icon: FileText },
                { id: 'file', name: 'Tải File PDF/Word', icon: Upload },
                { id: 'manual', name: 'Tạo thủ công', icon: PenTool },
              ].map((method) => {
                const isSelected = sourceMode === method.id;
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    id={`method-btn-${method.id}`}
                    name={`method_${method.id}`}
                    type="button"
                    onClick={() => setSourceMode(method.id as any)}
                    className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rose-50 border-rose-200 text-rose-600 ring-1 ring-rose-300/40 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-rose-500' : 'text-slate-600'}`} />
                    <span className={`text-xs font-bold ${isSelected ? 'text-rose-600' : 'text-slate-800'}`}>
                      {method.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Content */}
          <div>
            {/* 1. TẠO THỦ CÔNG */}
            {sourceMode === 'manual' && (
              <div id="manual-mode-section" className="space-y-4">
                {manualQuestions.map((q, qIndex) => (
                  <div
                    key={q.id}
                    id={`manual-q-card-${q.id}`}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5 relative"
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-xs">
                          Câu {qIndex + 1}
                        </span>
                        <input
                          id={`manual-q-points-${q.id}`}
                          name={`q_points_${q.id}`}
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={q.points || 1}
                          onChange={(e) => {
                            const updated = [...manualQuestions];
                            updated[qIndex].points = parseFloat(e.target.value) || 1;
                            setManualQuestions(updated);
                          }}
                          title="Điểm số câu hỏi"
                          className="w-12 px-2 py-1 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 bg-white outline-none focus:border-teal-500"
                        />
                        <select
                          id={`manual-q-type-${q.id}`}
                          name={`q_type_${q.id}`}
                          value={q.type || 'Single Choice'}
                          onChange={(e) => {
                            const updated = [...manualQuestions];
                            updated[qIndex].type = e.target.value;
                            setManualQuestions(updated);
                          }}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                        >
                          <option value="Single Choice">Single Choice</option>
                          <option value="Multiple Choice">Multiple Choice</option>
                          <option value="True / False">True / False</option>
                          <option value="Điền khuyết">Điền khuyết</option>
                          <option value="Tự luận">Tự luận</option>
                        </select>
                      </div>

                      {manualQuestions.length > 1 && (
                        <button
                          id={`manual-q-delete-btn-${q.id}`}
                          name={`delete_q_${q.id}`}
                          type="button"
                          onClick={() => setManualQuestions(manualQuestions.filter((item) => item.id !== q.id))}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Question Content */}
                    <div>
                      <textarea
                        id={`manual-q-content-${q.id}`}
                        name={`q_content_${q.id}`}
                        rows={2}
                        value={q.content}
                        onChange={(e) => {
                          const updated = [...manualQuestions];
                          updated[qIndex].content = e.target.value;
                          setManualQuestions(updated);
                        }}
                        placeholder="Nhập nội dung câu hỏi..."
                        className="w-full p-3.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-slate-800 placeholder-slate-400"
                      />
                    </div>

                    {/* Single Choice Options */}
                    {(q.type === 'Single Choice' || !q.type) && (
                      <div className="space-y-3 pt-1">
                        <p className="text-xs text-slate-500 font-medium">
                          Nhập các phương án và chọn 1 đáp án đúng bằng nút tròn:
                        </p>
                        <div className="space-y-2.5">
                          {q.options.map((opt: any, optIndex: number) => (
                            <div key={optIndex} className="flex items-center gap-3">
                              <input
                                id={`manual-q-${q.id}-opt-${opt.label}-radio`}
                                name={`correct_radio_${q.id}`}
                                type="radio"
                                checked={opt.isCorrect}
                                onChange={() => {
                                  const updated = [...manualQuestions];
                                  updated[qIndex].options.forEach((o: any, i: number) => {
                                    o.isCorrect = i === optIndex;
                                  });
                                  setManualQuestions(updated);
                                }}
                                className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                              />
                              <span className="w-4 font-bold text-blue-600 text-xs">{opt.label}.</span>
                              <input
                                id={`manual-q-${q.id}-opt-${opt.label}-text`}
                                name={`opt_text_${q.id}_${opt.label}`}
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const updated = [...manualQuestions];
                                  updated[qIndex].options[optIndex].text = e.target.value;
                                  setManualQuestions(updated);
                                }}
                                placeholder={`Nhập phương án ${opt.label}...`}
                                className="flex-1 px-3.5 py-2 border border-slate-300 rounded-2xl text-xs bg-white font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
                              />
                              {q.options.length > 2 && (
                                <button
                                  id={`manual-q-${q.id}-opt-${opt.label}-del`}
                                  name={`del_opt_${q.id}_${opt.label}`}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...manualQuestions];
                                    updated[qIndex].options = updated[qIndex].options.filter((_: any, i: number) => i !== optIndex);
                                    updated[qIndex].options.forEach((o: any, i: number) => {
                                      o.label = String.fromCharCode(65 + i);
                                    });
                                    setManualQuestions(updated);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          id={`manual-q-add-opt-btn-${q.id}`}
                          name={`add_opt_${q.id}`}
                          type="button"
                          onClick={() => {
                            const updated = [...manualQuestions];
                            const nextChar = String.fromCharCode(65 + updated[qIndex].options.length);
                            updated[qIndex].options.push({ label: nextChar, text: '', isCorrect: false });
                            setManualQuestions(updated);
                          }}
                          className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          + Thêm phương án
                        </button>
                      </div>
                    )}

                    {/* Multiple Choice Options */}
                    {q.type === 'Multiple Choice' && (
                      <div className="space-y-3 pt-1">
                        <p className="text-xs text-slate-500 font-medium">
                          Nhập các phương án và chọn các đáp án đúng bằng ô kiểm:
                        </p>
                        <div className="space-y-2.5">
                          {q.options.map((opt: any, optIndex: number) => (
                            <div key={optIndex} className="flex items-center gap-3">
                              <input
                                id={`manual-q-${q.id}-chk-${opt.label}`}
                                name={`chk_${q.id}_${opt.label}`}
                                type="checkbox"
                                checked={opt.isCorrect}
                                onChange={() => {
                                  const updated = [...manualQuestions];
                                  updated[qIndex].options[optIndex].isCorrect = !updated[qIndex].options[optIndex].isCorrect;
                                  setManualQuestions(updated);
                                }}
                                className="w-4 h-4 text-blue-600 accent-blue-600 rounded cursor-pointer"
                              />
                              <span className="w-4 font-bold text-blue-600 text-xs">{opt.label}.</span>
                              <input
                                id={`manual-q-${q.id}-chk-text-${opt.label}`}
                                name={`chk_text_${q.id}_${opt.label}`}
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const updated = [...manualQuestions];
                                  updated[qIndex].options[optIndex].text = e.target.value;
                                  setManualQuestions(updated);
                                }}
                                placeholder={`Nhập phương án ${opt.label}...`}
                                className="flex-1 px-3.5 py-2 border border-slate-300 rounded-2xl text-xs bg-white font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* True / False */}
                    {q.type === 'True / False' && (
                      <div className="space-y-2 pt-1">
                        <p className="text-xs text-slate-500 font-medium">
                          Nhập các nhận định và chọn tính Đúng/Sai:
                        </p>
                        <div className="space-y-2">
                          {(q.tfStatements || [
                            { statement: 'Nhận định 1', isTrue: true },
                            { statement: 'Nhận định 2', isTrue: false }
                          ]).map((st: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-center gap-2">
                              <input
                                id={`tf-stmt-${q.id}-${sIdx}`}
                                name={`tf_stmt_${q.id}_${sIdx}`}
                                type="text"
                                value={st.statement}
                                onChange={(e) => {
                                  const updated = [...manualQuestions];
                                  if (!updated[qIndex].tfStatements) {
                                    updated[qIndex].tfStatements = [
                                      { statement: 'Nhận định 1', isTrue: true },
                                      { statement: 'Nhận định 2', isTrue: false }
                                    ];
                                  }
                                  updated[qIndex].tfStatements[sIdx].statement = e.target.value;
                                  setManualQuestions(updated);
                                }}
                                placeholder={`Nhận định ${sIdx + 1}...`}
                                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white"
                              />
                              <select
                                id={`tf-select-${q.id}-${sIdx}`}
                                name={`tf_select_${q.id}_${sIdx}`}
                                value={st.isTrue ? 'true' : 'false'}
                                onChange={(e) => {
                                  const updated = [...manualQuestions];
                                  if (!updated[qIndex].tfStatements) {
                                    updated[qIndex].tfStatements = [
                                      { statement: 'Nhận định 1', isTrue: true },
                                      { statement: 'Nhận định 2', isTrue: false }
                                    ];
                                  }
                                  updated[qIndex].tfStatements[sIdx].isTrue = e.target.value === 'true';
                                  setManualQuestions(updated);
                                }}
                                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-700"
                              >
                                <option value="true">Đúng</option>
                                <option value="false">Sai</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Điền khuyết */}
                    {q.type === 'Điền khuyết' && (
                      <div className="space-y-2 pt-1">
                        <label htmlFor={`fill-blank-ans-${q.id}`} className="block text-xs font-bold text-slate-700">
                          Đáp án từ cần điền vào chỗ trống:
                        </label>
                        <input
                          id={`fill-blank-ans-${q.id}`}
                          name={`fill_blank_ans_${q.id}`}
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => {
                            const updated = [...manualQuestions];
                            updated[qIndex].explanation = e.target.value;
                            setManualQuestions(updated);
                          }}
                          placeholder="Ví dụ: sức khỏe, thư mục, chuột máy tính..."
                          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
                        />
                      </div>
                    )}

                    {/* Tự luận */}
                    {q.type === 'Tự luận' && (
                      <div className="space-y-2 pt-1">
                        <label htmlFor={`essay-guide-${q.id}`} className="block text-xs font-bold text-slate-700">
                          Gợi ý chấm điểm / Đáp án mẫu tự luận:
                        </label>
                        <textarea
                          id={`essay-guide-${q.id}`}
                          name={`essay_guide_${q.id}`}
                          rows={2}
                          value={q.explanation || ''}
                          onChange={(e) => {
                            const updated = [...manualQuestions];
                            updated[qIndex].explanation = e.target.value;
                            setManualQuestions(updated);
                          }}
                          placeholder="Nhập hướng dẫn chấm và đáp án chuẩn..."
                          className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white font-medium"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* + Thêm câu hỏi */}
                <button
                  id="add-manual-q-btn"
                  name="add_manual_question"
                  type="button"
                  onClick={() => {
                    const newId = manualQuestions.length + 1;
                    setManualQuestions([
                      ...manualQuestions,
                      {
                        id: newId,
                        type: 'Single Choice',
                        points: 1,
                        content: '',
                        options: [
                          { label: 'A', text: '', isCorrect: true },
                          { label: 'B', text: '', isCorrect: false },
                          { label: 'C', text: '', isCorrect: false },
                          { label: 'D', text: '', isCorrect: false }
                        ],
                        explanation: ''
                      }
                    ]);
                  }}
                  className="w-full py-3 bg-white border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50/50 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs"
                >
                  <Plus className="w-4 h-4 text-slate-500" /> Thêm câu hỏi
                </button>
              </div>
            )}

            {/* 2. CẤU TRÚC CHUẨN */}
            {sourceMode === 'standard' && (
              <div id="standard-mode-section" className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 animate-fade-in">
                <div className="flex items-center gap-3 p-4 bg-teal-50/50 border border-teal-200/60 rounded-xl">
                  <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
                  <p className="text-xs text-teal-900 font-medium">
                    Hệ thống tự động khởi tạo ma trận đề kiểm tra chuẩn chương trình GDPT 2018 theo chủ đề <span className="font-bold">"{lessonName || 'Tổng hợp'}"</span> của <span className="font-bold">{grade} - {subject}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="ai-question-count-select" className="block text-xs font-bold text-slate-700">Số lượng câu hỏi</label>
                    <select
                      id="ai-question-count-select"
                      name="question_count"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 font-medium"
                    >
                      <option value={5}>5 câu hỏi</option>
                      <option value={10}>10 câu hỏi (Chuẩn)</option>
                      <option value={15}>15 câu hỏi</option>
                      <option value={20}>20 câu hỏi</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Phân bố ma trận nhận thức</label>
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex justify-between items-center font-medium">
                      <span>Nhận biết: 40%</span>
                      <span>Thông hiểu: 40%</span>
                      <span>Vận dụng: 20%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DÁN ĐỀ MẪU */}
            {sourceMode === 'paste' && (
              <div id="paste-mode-section" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label htmlFor="ai-paste-raw-text" className="block text-xs font-bold text-slate-700">
                    Dán nội dung câu hỏi mẫu, giáo án hoặc văn bản kiến thức:
                  </label>
                  <button
                    id="ai-load-sample-text-btn"
                    name="load_sample_text"
                    type="button"
                    onClick={() => {
                      setLessonName('Thông tin và quyết định');
                      setGrade(grade || 'Khối 3');
                      setSubject('Tin học');
                      setRawText(`ĐỀ KIỂM TRA ĐÁNH GIÁ MA TRẬN CHUẨN 10 CÂU - TIN HỌC LỚP 4\nChủ đề: Thông tin và quyết định (GDPT 2018)\n\n[CÂU 1] (Nhận biết - Trắc nghiệm đơn)\nThông tin thời tiết cho biết hôm nay trời sẽ mưa lớn. Theo em, em cần đưa ra quyết định nào sau đây là hợp lý nhất?\nA. Mang theo áo mưa hoặc ô (dù).\nB. Rủ bạn ra sân trường đá bóng không cần che chắn.\nC. Mặc quần áo mỏng nhẹ và đi giày vải trắng.\nD. Không cần quan tâm đến thời tiết.\n*ĐÁP ÁN: A\n*GIẢI THÍCH: Khi biết trời mưa lớn, quyết định mang theo áo mưa hoặc ô giúp tránh bị ướt và bảo vệ sức khỏe tốt nhất.\n\n[CÂU 2] (Thông hiểu - Chọn nhiều đáp án)\nĐâu là những ví dụ cho thấy con người cần phải xử lý thông tin trước khi đưa ra quyết định? (Chọn các đáp án đúng)\nA. Nhìn thấy đèn giao thông chuyển sang màu đỏ, em dừng xe lại.\nB. Nghe tiếng trống trường tập trung, các bạn học sinh xếp hàng vào lớp.\nC. Cầm một hòn đá nặng trên tay mà không suy nghĩ gì.\nD. Nhìn thấy biển báo "Trơn trượt", em đi chậm và cẩn thận hơn để tránh ngã.\n*ĐÁP ÁN: A, B, D\n*GIẢI THÍCH: Nhìn đèn đỏ dừng xe; nghe tiếng trống xếp hàng; nhìn biển báo trơn trượt đi chậm đều là các quyết định dựa trên xử lý thông tin.`);
                    }}
                    className="text-teal-700 font-bold hover:underline text-xs cursor-pointer"
                  >
                    Tải văn bản mẫu
                  </button>
                </div>
                <textarea
                  id="ai-paste-raw-text"
                  name="paste_raw_text"
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Dán nội dung câu hỏi thô hoặc văn bản ôn tập tại đây. AI của EduPlay Pro sẽ phân tách, định dạng thành các câu hỏi sư phạm chuẩn..."
                  className="w-full p-3.5 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 placeholder-slate-400 font-medium text-slate-800"
                />
              </div>
            )}

            {/* 4. TẢI FILE */}
            {sourceMode === 'file' && (
              <div id="file-upload-mode-section" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 animate-fade-in">
                <div
                  id="ai-file-dropzone"
                  onClick={() => document.getElementById('ai-file-uploader-modal-component')?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-teal-400 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-teal-50/20 transition-all space-y-3 relative group cursor-pointer"
                >
                  <input
                    id="ai-file-uploader-modal-component"
                    name="ai_uploaded_file"
                    type="file"
                    accept=".txt,.csv,.doc,.docx,.pdf"
                    className="hidden"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedFileName(file.name);
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const text = event.target?.result as string;
                          setUploadedFileContent(text || '');
                          try {
                            await fetch('/api/upload', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ fileName: file.name, fileContent: text || '' })
                            });
                          } catch (uploadErr) {
                            console.warn('Backend upload backup notice:', uploadErr);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                  <Upload className="w-8 h-8 text-teal-600 mx-auto animate-bounce" />
                  <div className="text-xs font-bold text-slate-800">
                    Kéo thả hoặc click để chọn file tài liệu của bạn
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Hỗ trợ định dạng .docx, .pdf, .txt, .csv đề cương lên tới 15MB
                  </p>

                  {uploadedFileName && (
                    <div className="block mt-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs font-bold text-teal-800 bg-teal-100 border border-teal-200 py-1.5 px-3 rounded-xl inline-flex items-center gap-1.5">
                        📄 {uploadedFileName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error and progress feedback */}
          {generationError && (
            <div id="ai-modal-error-banner" className="p-3.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold">
              ⚠️ {generationError}
            </div>
          )}

          {isGenerating && (
            <div id="ai-modal-generating-indicator" className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3 animate-pulse">
              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
              <div className="text-xs font-bold text-teal-900">
                AI đang xử lý cấu trúc đề thi và phân tách câu hỏi sư phạm... Vui lòng đợi trong giây lát!
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
          {isPreviewStep ? (
            <div className="flex items-center justify-between w-full">
              <button
                id="ai-preview-back-btn"
                name="preview_back"
                type="button"
                onClick={() => setIsPreviewStep(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại chỉnh sửa
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  id="ai-preview-cancel-btn"
                  name="preview_cancel"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  id="ai-preview-confirm-save-btn"
                  name="preview_confirm_save"
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={previewQuestions.length === 0}
                  className="px-6 py-2.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-100" />
                  Lưu vào Ngân hàng ({previewQuestions.length} câu)
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                id="ai-modal-cancel-btn"
                name="modal_cancel"
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
              >
                Hủy
              </button>
              <button
                id="ai-modal-start-create-btn"
                name="modal_start_create"
                type="button"
                onClick={handleStartCreateExam}
                disabled={isGenerating}
                className="px-6 py-2.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-teal-100" />
                {isGenerating ? 'Đang xử lý...' : 'Bắt đầu tạo Đề'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
