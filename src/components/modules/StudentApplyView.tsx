import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Target, 
  HelpCircle, 
  FileText, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Check, 
  X, 
  Image as ImageIcon, 
  Trash2, 
  Award,
  ArrowRight,
  ExternalLink,
  Play,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Lesson5EPlan, QuestionItem } from '../../types';
import { getQuestionTypeLabel } from '../../lib/constants';
import { uploadToCloudinary } from '../../lib/cloudinary';

interface StudentApplyViewProps {
  lesson: Lesson5EPlan;
  onNavigateToNext: () => void;
  nextStepLabel?: string;
  onSaveProgress?: (applyData: any) => void;
  savedData?: any;
  currentUserName?: string;
  currentClass?: string;
}

export const StudentApplyView: React.FC<StudentApplyViewProps> = ({
  lesson,
  onNavigateToNext,
  nextStepLabel = 'Đánh giá (Assessment)',
  onSaveProgress,
  savedData,
  currentUserName,
  currentClass
}) => {
  const evaluateStep = lesson.stepEvaluate as any;
  
  // 3-step internal workflow state
  const [currentSubStep, setCurrentSubStep] = useState<1 | 2 | 3>(savedData?.subStep || 1);
  const [isCompleted, setIsCompleted] = useState<boolean>(Boolean(savedData?.isCompleted));

  // Step 2: Questions answering state
  const questions: QuestionItem[] = (evaluateStep?.questions && evaluateStep.questions.length > 0)
    ? evaluateStep.questions
    : [
        {
          id: 'q-app-default-1',
          code: 'CH-VD-01',
          subject: lesson.subject || 'Tin học',
          grade: lesson.grade || 'Khối 3',
          level: 'van_dung',
          type: 'multiple_choice',
          content: 'Khi đối mặt với tình huống thực tế nêu trên, giải pháp nào dưới đây là tối ưu và an toàn nhất?',
          options: [
            'Thực hiện theo đúng quy trình đã được hướng dẫn và ghi nhận kết quả cẩn thận',
            'Bỏ qua các cảnh báo an toàn để tiết kiệm thời gian',
            'Nhờ người khác làm thay toàn bộ công việc',
            'Không cần kiểm tra lại sau khi hoàn thành'
          ],
          correctAnswer: 'A',
          explanation: 'Tuân thủ quy trình và ghi chép cẩn thận giúp đảm bảo an toàn và đạt kết quả chính xác cao nhất.'
        }
      ];

  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>(savedData?.questionAnswers || {});
  const [submittedQuestions, setSubmittedQuestions] = useState<boolean>(Boolean(savedData?.submittedQuestions));

  // Step 3: Report & Attachment state
  const [reportText, setReportText] = useState<string>(
    savedData?.reportText || 'Em đã vận dụng kiến thức bài học để giải quyết tình huống thực tế theo đúng hướng dẫn của thầy/cô. Em đã ghi nhận và đính kèm sản phẩm thực hành minh chứng bên dưới.'
  );
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; size: string }>>(
    savedData?.uploadedFiles || []
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload to Cloudinary
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
      try {
        const secureUrl = await uploadToCloudinary(file, 'auto');
        setUploadedFiles(prev => [...prev, { name: file.name, url: secureUrl, size: sizeStr }]);
      } catch (err: any) {
        alert(err.message || 'Không thể tải tệp lên Cloudinary.');
      }
    }
  };

  const handleRemoveFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit report
  const handleSubmitHarvestReport = () => {
    setIsCompleted(true);
    if (onSaveProgress) {
      onSaveProgress({
        isCompleted: true,
        subStep: 3,
        questionAnswers,
        submittedQuestions: true,
        reportText,
        uploadedFiles
      });
    }
  };

  // Question answer handlers for all 8 types
  const isQuestionCorrect = (q: QuestionItem) => {
    const userAns = questionAnswers[q.id];
    if (userAns === undefined || userAns === null) return false;
    const qType = q.type || 'multiple_choice';
    if (qType === 'multiple_choice') {
      return userAns === (q.correctAnswer || 'A');
    }
    if (qType === 'multiple_response') {
      const correctIndices = (q.correctAnswer || 'A')
        .split('')
        .map(c => c.charCodeAt(0) - 65)
        .sort();
      const userIndices = Array.isArray(userAns) ? [...userAns].sort() : [];
      return JSON.stringify(correctIndices) === JSON.stringify(userIndices);
    }
    if (qType === 'true_false') {
      const stmts = q.statements || [];
      return stmts.every((s, idx) => userAns[idx] === s.isCorrect);
    }
    if (qType === 'fill_blank') {
      const targetAns = (q.correctAnswer || '').toLowerCase().trim();
      return typeof userAns === 'string' && userAns.toLowerCase().trim() === targetAns;
    }
    if (qType === 'ordering') {
      const original = q.options || [];
      return Array.isArray(userAns) && JSON.stringify(userAns) === JSON.stringify(original);
    }
    if (qType === 'matching') {
      const pairs = q.matchingPairs || [];
      return pairs.every((p, idx) => userAns[idx] === p.right);
    }
    if (qType === 'classification') {
      const items = q.classificationItems || [];
      return items.every((item, idx) => userAns[idx] === item.group);
    }
    if (qType === 'essay') {
      return typeof userAns === 'string' && userAns.trim().length > 0;
    }
    return false;
  };

  const handleOptionSelect = (qId: string, val: string) => {
    if (submittedQuestions) return;
    setQuestionAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleMultiSelect = (qId: string, optIdx: number) => {
    if (submittedQuestions) return;
    const currentArr: number[] = questionAnswers[qId] || [];
    if (currentArr.includes(optIdx)) {
      setQuestionAnswers(prev => ({ ...prev, [qId]: currentArr.filter(i => i !== optIdx) }));
    } else {
      setQuestionAnswers(prev => ({ ...prev, [qId]: [...currentArr, optIdx].sort() }));
    }
  };

  const handleTFSelect = (qId: string, sIdx: number, val: boolean) => {
    if (submittedQuestions) return;
    const current = questionAnswers[qId] || {};
    setQuestionAnswers(prev => ({ ...prev, [qId]: { ...current, [sIdx]: val } }));
  };

  const handleFillBlankChange = (qId: string, val: string) => {
    if (submittedQuestions) return;
    setQuestionAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleOrderingMove = (qId: string, currentItems: string[], fromIdx: number, toIdx: number) => {
    if (submittedQuestions) return;
    const items = [...currentItems];
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setQuestionAnswers(prev => ({ ...prev, [qId]: items }));
  };

  const handleMatchingChange = (qId: string, pIdx: number, val: string) => {
    if (submittedQuestions) return;
    const current = questionAnswers[qId] || {};
    setQuestionAnswers(prev => ({ ...prev, [qId]: { ...current, [pIdx]: val } }));
  };

  const handleClassificationChange = (qId: string, itemIdx: number, val: string) => {
    if (submittedQuestions) return;
    const current = questionAnswers[qId] || {};
    setQuestionAnswers(prev => ({ ...prev, [qId]: { ...current, [itemIdx]: val } }));
  };

  const handleEssayChange = (qId: string, val: string) => {
    if (submittedQuestions) return;
    setQuestionAnswers(prev => ({ ...prev, [qId]: val }));
  };

  // Congratulatory message from teacher or default
  const congratMessage = evaluateStep?.congratMessage || 
    '🎉 Chúc mừng em đã hoàn thành xuất sắc phần Vận dụng thực tế của bài học! Tinh thần sáng tạo và khả năng áp dụng kiến thức vào đời sống của em rất đáng khen ngợi!';

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
            4
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              {evaluateStep?.title || 'Vận Dụng Kiến Thức Vào Thực Tiễn (Apply)'}
            </h3>
            <p className="text-xs text-slate-500">
              {evaluateStep?.subtitle || '3 bước: Khám phá tình huống → Hướng giải quyết → Báo cáo thu hoạch'}
            </p>
          </div>
        </div>

        {/* 3 STEPS PROGRESS BAR */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto justify-center">
          <button
            onClick={() => setCurrentSubStep(1)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentSubStep === 1 
                ? 'bg-pink-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>Tình huống</span>
          </button>

          <button
            onClick={() => setCurrentSubStep(2)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentSubStep === 2 
                ? 'bg-pink-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span>Giải quyết</span>
          </button>

          <button
            onClick={() => setCurrentSubStep(3)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentSubStep === 3 
                ? 'bg-pink-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            <span>Thu hoạch</span>
          </button>
        </div>
      </div>

      {/* SUB-STEP 1: TÌNH HUỐNG THỰC TẾ */}
      {currentSubStep === 1 && (
        <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 font-extrabold text-xs flex items-center justify-center">
                1
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-pink-700">
                Bước 1: Tình huống thực tế & Nhiệm vụ đời sống
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Quan sát & phân tích</span>
          </div>

          <div className="space-y-4">
            <h4 className="text-base sm:text-lg font-black text-slate-900">
              {evaluateStep?.objectives || 'Vận dụng kiến thức bài học để giải quyết vấn đề đời sống thực tế'}
            </h4>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide block">
                📋 Mô tả tình huống chi tiết:
              </span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                {evaluateStep?.teacherActivities || evaluateStep?.studentActivities || 
                  'Trong đời sống hàng ngày, chúng ta thường xuyên gặp các tình huống cần áp dụng kiến thức vừa học. Hãy quan sát tình huống thực tế sau đây, suy nghĩ về các giải pháp khả thi và chuẩn bị câu trả lời cho các câu hỏi tương tác ở bước 2.'}
              </p>
            </div>

            {/* Media / Materials Illustration */}
            {evaluateStep?.materials && (
              <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wide block flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" /> Tư liệu / Hình ảnh / Video minh họa:
                </span>
                
                {evaluateStep.materials.startsWith('http') ? (
                  <div className="rounded-2xl overflow-hidden border border-indigo-100 bg-black/5 max-h-64 flex items-center justify-center p-2">
                    <img 
                      src={evaluateStep.materials} 
                      alt="Tư liệu tình huống" 
                      className="max-h-60 object-contain rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 font-medium leading-relaxed">
                    {evaluateStep.materials}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setCurrentSubStep(2)}
              className="px-8 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-pink-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Tiếp tục sang Bước 2: Hướng giải quyết</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-STEP 2: HƯỚNG GIẢI QUYẾT & CÂU HỎI TƯƠNG TÁC */}
      {currentSubStep === 2 && (
        <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 font-extrabold text-xs flex items-center justify-center">
                2
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-pink-700">
                Bước 2: Hướng giải quyết & Câu hỏi tương tác
              </span>
            </div>
            <button
              onClick={() => setCurrentSubStep(1)}
              className="text-xs text-pink-600 hover:text-pink-700 font-bold underline cursor-pointer"
            >
              ← Xem lại tình huống
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIdx) => {
              const isCorrect = isQuestionCorrect(q);
              const qType = q.type || 'multiple_choice';

              return (
                <div key={q.id || qIdx} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-pink-800 bg-pink-100 px-3 py-1 rounded-lg">
                      Câu hỏi {qIdx + 1} ({getQuestionTypeLabel(qType)})
                    </span>
                    {submittedQuestions && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>{isCorrect ? 'Chính xác' : 'Chưa chính xác'}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 leading-relaxed">{q.content}</p>

                  {/* 1. Multiple Choice */}
                  {qType === 'multiple_choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {(q.options || []).map((opt, optIdx) => {
                        const optLetter = String.fromCharCode(65 + optIdx);
                        const isSelected = questionAnswers[q.id] === optLetter;
                        let btnStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-pink-50/40';

                        if (submittedQuestions) {
                          if (optLetter === (q.correctAnswer || 'A')) {
                            btnStyle = 'bg-emerald-600 border-emerald-600 text-white font-bold';
                          } else if (isSelected && !isCorrect) {
                            btnStyle = 'bg-rose-600 border-rose-600 text-white font-bold';
                          }
                        } else if (isSelected) {
                          btnStyle = 'bg-pink-600 border-pink-600 text-white shadow-md shadow-pink-600/20';
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={submittedQuestions}
                            onClick={() => handleOptionSelect(q.id, optLetter)}
                            className={`p-3.5 rounded-2xl text-left border text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${btnStyle}`}
                          >
                            <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs shrink-0 ${
                              isSelected || (submittedQuestions && optLetter === (q.correctAnswer || 'A')) 
                                ? 'bg-white/20 text-white border-white/30' 
                                : 'bg-slate-200 border-slate-300 text-slate-700'
                            }`}>
                              {optLetter}
                            </span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Multiple Response */}
                  {qType === 'multiple_response' && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs text-pink-800 font-bold">Chọn tất cả các đáp án đúng:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(q.options || []).map((opt, optIdx) => {
                          const currentArr: number[] = questionAnswers[q.id] || [];
                          const isSelected = currentArr.includes(optIdx);

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={submittedQuestions}
                              onClick={() => handleMultiSelect(q.id, optIdx)}
                              className={`p-3.5 rounded-2xl text-left border transition-all flex items-center gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-pink-50 border-pink-600 text-pink-950 font-bold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                isSelected 
                                  ? 'border-pink-600 bg-pink-600 text-white' 
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </span>
                              <span className="text-xs leading-relaxed flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. True / False */}
                  {qType === 'true_false' && (
                    <div className="space-y-2.5 pt-2">
                      <div className="bg-pink-950/60 p-3 rounded-xl border border-pink-400/30 text-pink-200 text-xs font-bold text-center">
                        📋 Đánh giá các nhận định sau đây là Đúng hay Sai:
                      </div>
                      {(q.statements || []).map((stmt, sIdx) => {
                        const currentVal = questionAnswers[q.id]?.[sIdx];
                        return (
                          <div key={sIdx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <span className="text-xs text-slate-800 font-bold">{sIdx + 1}. {stmt.statement}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={submittedQuestions}
                                onClick={() => handleTFSelect(q.id, sIdx, true)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  currentVal === true ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                Đúng
                              </button>
                              <button
                                type="button"
                                disabled={submittedQuestions}
                                onClick={() => handleTFSelect(q.id, sIdx, false)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  currentVal === false ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                Sai
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. Fill Blank */}
                  {qType === 'fill_blank' && (
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-slate-700">Nhập đáp án của em:</label>
                      <input
                        type="text"
                        disabled={submittedQuestions}
                        value={questionAnswers[q.id] || ''}
                        onChange={(e) => handleFillBlankChange(q.id, e.target.value)}
                        placeholder="Nhập câu trả lời vào đây..."
                        className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  )}

                  {/* 5. Ordering */}
                  {qType === 'ordering' && (
                    <div className="space-y-2.5 pt-2">
                      <div className="text-xs text-pink-800 font-bold">Sắp xếp các bước theo thứ tự đúng:</div>
                      {(() => {
                        const currentItems: string[] = questionAnswers[q.id] || q.options || [];
                        return (
                          <div className="space-y-2">
                            {currentItems.map((item, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-lg bg-pink-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="text-xs text-slate-800 font-medium">{item}</span>
                                </div>
                                {!submittedQuestions && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleOrderingMove(q.id, currentItems, idx, idx - 1)}
                                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === currentItems.length - 1}
                                      onClick={() => handleOrderingMove(q.id, currentItems, idx, idx + 1)}
                                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 6. Matching */}
                  {qType === 'matching' && (
                    <div className="space-y-2.5 pt-2">
                      <div className="text-xs text-pink-800 font-bold">Nối các cặp tương ứng:</div>
                      <div className="space-y-2">
                        {(q.matchingPairs || []).map((pair, pIdx) => {
                          const userChoice = questionAnswers[q.id]?.[pIdx] || '';
                          return (
                            <div key={pIdx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                              <span className="font-bold text-slate-800 flex-1">{pair.left}</span>
                              <span className="text-slate-400 hidden sm:inline">↔</span>
                              <select
                                disabled={submittedQuestions}
                                value={userChoice}
                                onChange={(e) => handleMatchingChange(q.id, pIdx, e.target.value)}
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:outline-none"
                              >
                                <option value="">-- Chọn ghép nối --</option>
                                {(q.matchingPairs || []).map((p, optIdx) => (
                                  <option key={optIdx} value={p.right}>{p.right}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 7. Classification */}
                  {qType === 'classification' && (
                    <div className="space-y-4 pt-2">
                      <div className="bg-pink-50 border border-pink-100 p-3.5 rounded-2xl text-pink-950 text-xs sm:text-sm font-semibold flex items-center gap-2">
                        <span>📂</span>
                        <span>Hãy xếp các vật phẩm dưới đây vào đúng nhóm thích hợp:</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(q.classificationGroups || []).map((groupName, gIdx) => {
                          const bgClass = gIdx === 0 ? 'bg-[#FFFBEB]/40 border-[#FCD34D]' : 'bg-[#EFF6FF]/40 border-[#93C5FD]';
                          const badgeClass = gIdx === 0 ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]' : 'bg-[#DBEAFE] border-[#BFDBFE] text-[#1E40AF]';
                          const emoji = gIdx === 0 ? '🌿' : '⚙️';
                          
                          const currentAnswers = questionAnswers[q.id] || {};
                          const placedItems = (q.classificationItems || []).filter((_, iIdx) => currentAnswers[iIdx] === groupName);

                          return (
                            <div key={gIdx} className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center min-h-[140px] transition-all ${bgClass}`}>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider mb-3 ${badgeClass}`}>
                                <span>{emoji} {groupName.toUpperCase()}</span>
                              </span>
                              {placedItems.length > 0 ? (
                                <div className="w-full space-y-2">
                                  {placedItems.map((item, piIdx) => {
                                    const realIdx = (q.classificationItems || []).findIndex(x => x.name === item.name);
                                    return (
                                      <div key={piIdx} className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs flex items-center justify-between">
                                        <span>{item.name}</span>
                                        {!submittedQuestions && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleClassificationChange(q.id, realIdx, '');
                                            }}
                                            className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer text-[10px]"
                                          >
                                            ✕ Gỡ
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-slate-400 text-xs italic font-medium my-auto">
                                  Bấm phân nhóm vật phẩm bên dưới...
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2.5">
                        <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
                          Vật phẩm chờ xếp nhóm:
                        </div>
                        <div className="space-y-2">
                          {(q.classificationItems || []).map((item, iIdx) => {
                            const currentAnswers = questionAnswers[q.id] || {};
                            const assignedGroup = currentAnswers[iIdx];
                            if (assignedGroup) return null;

                            return (
                              <div key={iIdx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs">
                                <span className="font-semibold text-slate-800">{item.name}</span>
                                {!submittedQuestions && (
                                  <div className="flex items-center gap-2">
                                    {(q.classificationGroups || []).map((groupName, gIdx) => {
                                      const emoji = gIdx === 0 ? '🌿' : '⚙️';
                                      const btnClass = gIdx === 0 
                                        ? 'bg-amber-50 hover:bg-[#FEF3C7] border-amber-200 text-[#92400E]' 
                                        : 'bg-blue-50 hover:bg-[#DBEAFE] border-blue-200 text-[#1E40AF]';
                                      
                                      return (
                                        <button
                                          key={gIdx}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleClassificationChange(q.id, iIdx, groupName);
                                          }}
                                          className={`px-3 py-1.5 rounded-lg border text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 font-bold cursor-pointer ${btnClass}`}
                                        >
                                          <span>{emoji} + {groupName.split(' ')[0] || groupName}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 8. Essay */}
                  {qType === 'essay' && (
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-slate-700">Bài làm / Trình bày của em:</label>
                      <textarea
                        disabled={submittedQuestions}
                        rows={4}
                        value={questionAnswers[q.id] || ''}
                        onChange={(e) => handleEssayChange(q.id, e.target.value)}
                        placeholder="Nhập câu trả lời hoặc báo cáo phân tích tại đây..."
                        className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  )}

                  {submittedQuestions && q.explanation && (
                    <div className="p-3.5 bg-pink-50/60 border border-pink-200 rounded-2xl text-xs text-pink-950 space-y-1">
                      <strong className="font-extrabold text-pink-800 block">💡 Giải thích hướng giải quyết:</strong>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            {!submittedQuestions ? (
              <button
                onClick={() => setSubmittedQuestions(true)}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
              >
                Kiểm tra câu trả lời
              </button>
            ) : (
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                ✓ Đã hoàn thành các câu hỏi giải quyết tình huống
              </div>
            )}

            <button
              onClick={() => setCurrentSubStep(3)}
              className="px-8 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-pink-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Tiếp tục sang Bước 3: Báo cáo thu hoạch</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-STEP 3: BÁO CÁO THU HOẠCH & MINH CHỨNG */}
      {currentSubStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 font-extrabold text-xs flex items-center justify-center">
                  3
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-pink-700">
                  Bước 3: Báo cáo thu hoạch & Đính kèm sản phẩm thực hành
                </span>
              </div>
              <button
                onClick={() => setCurrentSubStep(2)}
                className="text-xs text-pink-600 hover:text-pink-700 font-bold underline cursor-pointer"
              >
                ← Quay lại bước 2
              </button>
            </div>

            {/* Instruction block */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1.5">
              <span className="text-xs font-extrabold text-slate-700 block">📝 Hướng dẫn viết báo cáo:</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {evaluateStep?.studentActivities || 
                  'Học sinh viết báo cáo thu hoạch ngắn gọn về kết quả vận dụng kiến thức vào thực tế, cảm nghĩ hoặc giải pháp của bản thân. Đính kèm hình ảnh minh chứng nếu có.'}
              </p>
            </div>

            {/* Write-up textarea */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-800">
                Nội dung báo cáo thu hoạch của em:
              </label>
              <textarea
                rows={4}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Nhập phần trình bày thu hoạch của em sau khi giải quyết tình huống..."
                className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* File upload zone (drag and drop + click) */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-slate-800 block">
                📷 Đính kèm ảnh minh chứng / Sản phẩm thực hành:
              </span>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-pink-500 bg-pink-50/70' 
                    : 'border-slate-300 bg-white hover:border-pink-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-extrabold text-slate-800">
                  Kéo thả ảnh hoặc bấm để chọn tệp từ thiết bị
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hỗ trợ PNG, JPG, JPEG, PDF (Tối đa 10MB)
                </p>
              </div>

              {/* Uploaded files preview list */}
              {uploadedFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {uploadedFiles.map((file, fIdx) => (
                    <div key={fIdx} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {file.url.startsWith('data:image') ? (
                          <img src={file.url} alt={file.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-xs font-bold shrink-0">
                            📄
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                          <span className="text-[10px] text-slate-400">{file.size}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(fIdx);
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="Xóa tệp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            {!isCompleted ? (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSubmitHarvestReport}
                  className="px-8 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-lg shadow-pink-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Nộp báo cáo thu hoạch</span>
                </button>
              </div>
            ) : (
              <div className="p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/30 text-emerald-900 space-y-3">
                <div className="flex items-center gap-2.5 font-extrabold text-xs sm:text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Báo cáo thu hoạch đã được ghi nhận thành công!</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white/80 p-3.5 rounded-xl border border-emerald-200">
                  {congratMessage}
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={onNavigateToNext}
                    className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Tiếp tục sang {nextStepLabel}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
