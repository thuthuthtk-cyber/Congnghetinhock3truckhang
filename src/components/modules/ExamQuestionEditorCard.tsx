import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Check, 
  ChevronDown, 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  HelpCircle,
  Sparkles,
  Layers,
  ChevronUp,
  GripVertical
} from 'lucide-react';
import { QuestionItem, TrueFalseStatement, ClassificationItem } from '../../types';
import { QUESTION_TYPES, getQuestionTypeLabel, matchesQuestionType, normalizeQuestionType, getDefaultAnswerSchemaByType, synchronizeOrderingSteps } from '../../lib/constants';

export { normalizeQuestionType };

interface ExamQuestionEditorCardProps {
  question: QuestionItem;
  index: number;
  totalQuestions: number;
  onUpdate: (updatedFields: Partial<QuestionItem>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const ExamQuestionEditorCard: React.FC<ExamQuestionEditorCardProps> = ({
  question,
  index,
  totalQuestions,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  const [showExplanation, setShowExplanation] = useState(Boolean(question.explanation));
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null);
  const [dragOverStepIdx, setDragOverStepIdx] = useState<number | null>(null);

  // Determine current active question type
  const normalizedType = normalizeQuestionType(question.type);

  // Handle changing question type and resetting answer schema to the new type's default
  const handleTypeChange = (newType: string) => {
    const nextNormalized = normalizeQuestionType(newType);
    const defaultSchema = getDefaultAnswerSchemaByType(nextNormalized);

    onUpdate({
      ...defaultSchema,
      type: nextNormalized,
    });
  };

  const pointsValue = (question as any).points ?? 2;

  // Options letter helpers
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  // Parse letters for multiple response
  const selectedLettersList: string[] = String(question.correctAnswer || '')
    .toUpperCase()
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all">
      {/* Header Question */}
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            {index + 1}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">DẠNG BÀI:</span>
            <div className="relative">
              <select 
                value={normalizedType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="appearance-none bg-white border border-rose-200 hover:border-rose-300 rounded-full px-3.5 py-1.5 pr-8 text-xs font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200 cursor-pointer shadow-2xs"
              >
                {QUESTION_TYPES.map(qt => (
                  <option key={qt.id} value={qt.id}>{qt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-rose-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Points config */}
          <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-600">Điểm số:</span>
            <input 
              type="number" 
              min={0}
              step={0.5}
              value={pointsValue} 
              onChange={(e) => onUpdate({ points: Math.max(0, parseFloat(e.target.value) || 0) } as any)}
              className="w-14 text-center border border-slate-200 rounded-lg py-0.5 text-xs font-black text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
            />
            <span className="text-[11px] font-semibold text-slate-500">đ</span>
          </div>

          {/* Move Up / Move Down */}
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-0.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              title="Di chuyển câu hỏi lên trên"
              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === totalQuestions - 1}
              onClick={onMoveDown}
              title="Di chuyển câu hỏi xuống dưới"
              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Delete Question */}
          <button 
            type="button"
            onClick={onDelete}
            title="Xóa câu hỏi này"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Question */}
      <div className="p-5 space-y-4">
        {/* Question Prompt Content */}
        <div>
          <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Nội dung câu hỏi {index + 1} <span className="text-rose-500">*</span></span>
            <span className="text-[10px] font-normal text-slate-400 lowercase tracking-normal">
              (soạn lời dẫn đề bài cho học sinh)
            </span>
          </label>
          <textarea
            value={question.content || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={2}
            placeholder="Nhập nội dung câu hỏi..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-y"
          />
        </div>

        {/* Render answer input section strictly by switch-case on normalizedType */}
        {(() => {
          switch (normalizedType) {
            case 'multiple_choice':
              return (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Các phương án trả lời & Chọn đáp án đúng <span className="text-rose-500">*</span>
                <span className="font-normal text-slate-500 text-[11px] ml-1.5">
                  (Bấm nút tròn chứa chữ cái bên trái để chọn 1 đáp án đúng duy nhất)
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const currentOpts = question.options || [];
                  const newOpts = [...currentOpts, ''];
                  onUpdate({ options: newOpts });
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm phương án
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(question.options && question.options.length > 0 ? question.options : ['', '', '', '']).map((opt, oIdx) => {
                const letter = letters[oIdx] || String.fromCharCode(65 + oIdx);
                const isCorrect = (question.correctAnswer || 'A').toUpperCase() === letter;

                return (
                  <div 
                    key={oIdx} 
                    className={`flex items-center border rounded-xl overflow-hidden transition-all ${
                      isCorrect 
                        ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-400/50' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onUpdate({ correctAnswer: letter })}
                      title={`Chọn ${letter} là đáp án đúng`}
                      className={`w-12 self-stretch flex items-center justify-center font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                        isCorrect 
                          ? 'bg-emerald-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-r border-slate-200'
                      }`}
                    >
                      {isCorrect ? <Check className="w-4 h-4 text-white" /> : letter}
                    </button>
                    <input 
                      type="text" 
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(question.options || ['', '', '', ''])];
                        newOpts[oIdx] = e.target.value;
                        onUpdate({ options: newOpts });
                      }}
                      placeholder={`Nội dung phương án ${letter}...`}
                      className="flex-1 px-3 py-2.5 text-xs font-medium text-slate-700 bg-transparent focus:outline-none"
                    />
                    {(question.options || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = (question.options || []).filter((_, i) => i !== oIdx);
                          onUpdate({ options: newOpts });
                        }}
                        title="Xóa phương án này"
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
              );

            case 'multiple_response':
              return (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold text-fuchsia-800 flex items-center gap-1.5">
                <span>Các phương án trả lời (Cho phép tick chọn NHIỀU đáp án đúng) <span className="text-rose-500">*</span></span>
              </label>
              <div className="flex items-center gap-3">
                {selectedLettersList.length > 0 && (
                  <span className="text-[11px] font-bold text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 px-2.5 py-0.5 rounded-full">
                    Đang chọn đúng: <strong className="text-fuchsia-900">{selectedLettersList.join(', ')}</strong>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const currentOpts = question.options || [];
                    const newOpts = [...currentOpts, ''];
                    onUpdate({ options: newOpts });
                  }}
                  className="text-xs font-bold text-fuchsia-600 hover:text-fuchsia-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm phương án
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(question.options && question.options.length > 0 ? question.options : ['', '', '', '']).map((opt, oIdx) => {
                const letter = letters[oIdx] || String.fromCharCode(65 + oIdx);
                const isSelected = selectedLettersList.includes(letter);

                const toggleSelection = () => {
                  let updatedList = [...selectedLettersList];
                  if (isSelected) {
                    updatedList = updatedList.filter(l => l !== letter);
                  } else {
                    if (!updatedList.includes(letter)) updatedList.push(letter);
                  }
                  updatedList.sort();
                  onUpdate({ correctAnswer: updatedList.join(', ') });
                };

                return (
                  <div 
                    key={oIdx} 
                    className={`flex items-center border rounded-xl overflow-hidden transition-all ${
                      isSelected 
                        ? 'border-fuchsia-500 bg-fuchsia-50/40 ring-1 ring-fuchsia-400/50' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <label 
                      onClick={toggleSelection}
                      title={`Tích chọn/Bỏ chọn ${letter} là đáp án đúng`}
                      className={`w-12 self-stretch flex items-center justify-center gap-1 font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                        isSelected 
                          ? 'bg-fuchsia-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-r border-slate-200'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => {}} 
                        className="hidden" 
                      />
                      {isSelected ? <Check className="w-4 h-4 text-white" /> : letter}
                    </label>
                    <input 
                      type="text" 
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(question.options || ['', '', '', ''])];
                        newOpts[oIdx] = e.target.value;
                        onUpdate({ options: newOpts });
                      }}
                      placeholder={`Nội dung phương án ${letter}...`}
                      className="flex-1 px-3 py-2.5 text-xs font-medium text-slate-700 bg-transparent focus:outline-none"
                    />
                    {(question.options || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = (question.options || []).filter((_, i) => i !== oIdx);
                          onUpdate({ options: newOpts });
                        }}
                        title="Xóa phương án này"
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
              );

            case 'true_false':
              return (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <span>Danh sách các mệnh đề con độc lập <span className="text-rose-500">*</span></span>
                <span className="font-normal text-slate-500 text-[11px]">
                  (Thầy/Cô nhập nội dung và chỉ định Đúng hoặc Sai cho mỗi ý)
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const currentStmts = question.statements || [];
                  const newStmts: TrueFalseStatement[] = [
                    ...currentStmts,
                    { statement: '', isCorrect: true }
                  ];
                  onUpdate({ statements: newStmts });
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm mệnh đề
              </button>
            </div>

            <div className="space-y-2.5">
              {(question.statements && question.statements.length > 0 
                ? question.statements 
                : [
                    { statement: 'Nhận định 1...', isCorrect: true },
                    { statement: 'Nhận định 2...', isCorrect: false }
                  ]
              ).map((st, sIdx) => {
                return (
                  <div 
                    key={sIdx} 
                    className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 flex-1">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                        {sIdx + 1}
                      </div>
                      <input 
                        type="text"
                        value={st.statement}
                        onChange={(e) => {
                          const currentStmts = [...(question.statements || [])];
                          currentStmts[sIdx] = { ...currentStmts[sIdx], statement: e.target.value };
                          onUpdate({ statements: currentStmts });
                        }}
                        placeholder={`Nhập nội dung mệnh đề ${sIdx + 1}...`}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* True / False Toggle Choice Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pl-8 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => {
                          const currentStmts = [...(question.statements || [])];
                          currentStmts[sIdx] = { ...currentStmts[sIdx], isCorrect: true };
                          onUpdate({ statements: currentStmts });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border cursor-pointer ${
                          st.isCorrect === true
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        ✓ Đúng
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentStmts = [...(question.statements || [])];
                          currentStmts[sIdx] = { ...currentStmts[sIdx], isCorrect: false };
                          onUpdate({ statements: currentStmts });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border cursor-pointer ${
                          st.isCorrect === false
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        ✗ Sai
                      </button>

                      {(question.statements || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const currentStmts = (question.statements || []).filter((_, idx) => idx !== sIdx);
                            onUpdate({ statements: currentStmts });
                          }}
                          title="Xóa mệnh đề này"
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
              );

            case 'fill_blank':
              return (
          <div className="space-y-3 pt-1">
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Hướng dẫn soạn câu điền khuyết:</strong> Thầy/Cô dùng ký hiệu <code>[...]</code> hoặc <code>_____</code> trong ô nội dung câu hỏi ở trên để thể hiện chỗ trống cần điền. Sau đó nhập đáp án đúng học sinh cần điền vào ô bên dưới.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1.5">
                Đáp án chuẩn mong đợi <span className="text-rose-500">*</span>
                <span className="font-normal text-slate-500 text-[11px] ml-1.5">
                  (Nếu chấp nhận nhiều cách viết, phân tách bằng dấu phẩy, ví dụ: <code>chuột máy tính, chuột quang</code>)
                </span>
              </label>
              <input 
                type="text" 
                value={question.correctAnswer || ''} 
                onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
                placeholder="Nhập đáp án đúng chuẩn học sinh cần điền..."
                className="w-full bg-amber-50/30 border border-amber-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
              );

            case 'ordering': {
              const currentStepsList = question.options && question.options.length > 0
                ? question.options
                : ['Bước 1...', 'Bước 2...', 'Bước 3...'];
              const moveStepInCard = (fromIdx: number, toIdx: number) => {
                if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= currentStepsList.length || toIdx >= currentStepsList.length) return;
                const reordered = [...currentStepsList];
                const [moved] = reordered.splice(fromIdx, 1);
                reordered.splice(toIdx, 0, moved);
                const synced = synchronizeOrderingSteps(reordered);
                console.log('[ExamQuestionEditorCard - Reorder Steps]', {
                  questionId: question.id,
                  updatedOrderingSteps: synced.orderingSteps,
                  canonicalOptions: synced.canonicalOptions,
                });
                onUpdate(synced);
              };

              return (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-indigo-900">
                Các bước thực hiện theo ĐÚNG THỨ TỰ CHUẨN (kéo-thả hoặc dùng nút ▲/▼) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const newSteps = [...currentStepsList, ''];
                  onUpdate(synchronizeOrderingSteps(newSteps));
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm bước
              </button>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Hệ thống sẽ tự động xáo trộn các bước khi học sinh làm bài và đối chiếu với thứ tự chuẩn thầy/cô thiết lập dưới đây.</span>
            </div>

            <div className="space-y-2">
              {currentStepsList.map((step, sIdx) => {
                const totalSteps = currentStepsList.length;
                return (
                  <div
                    key={sIdx}
                    draggable
                    onDragStart={(e) => {
                      setDraggedStepIdx(sIdx);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(sIdx));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverStepIdx !== sIdx) {
                        setDragOverStepIdx(sIdx);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIdx = draggedStepIdx !== null ? draggedStepIdx : Number(e.dataTransfer.getData('text/plain'));
                      setDraggedStepIdx(null);
                      setDragOverStepIdx(null);
                      if (!Number.isNaN(fromIdx)) {
                        moveStepInCard(fromIdx, sIdx);
                      }
                    }}
                    onDragEnd={() => {
                      setDraggedStepIdx(null);
                      setDragOverStepIdx(null);
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                      dragOverStepIdx === sIdx && draggedStepIdx !== sIdx
                        ? 'bg-indigo-100/70 border-indigo-500 ring-2 ring-indigo-200'
                        : draggedStepIdx === sIdx
                        ? 'opacity-50 bg-indigo-50 border-indigo-300'
                        : 'bg-indigo-50/30 border-indigo-100'
                    }`}
                  >
                    <div
                      className="cursor-grab active:cursor-grabbing text-indigo-400 hover:text-indigo-700 p-1 shrink-0"
                      title="Kéo-thả để đổi vị trí bước"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <span className="w-18 font-bold text-indigo-900 text-xs shrink-0 flex items-center gap-1">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                        {sIdx + 1}
                      </span>
                      Bước {sIdx + 1}:
                    </span>

                    <input 
                      type="text"
                      value={step}
                      onChange={(e) => {
                        const newSteps = [...currentStepsList];
                        newSteps[sIdx] = e.target.value;
                        onUpdate(synchronizeOrderingSteps(newSteps));
                      }}
                      placeholder={`Nội dung bước ${sIdx + 1}...`}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    {/* Step Move Up / Down */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
                      <button
                        type="button"
                        disabled={sIdx === 0}
                        onClick={() => moveStepInCard(sIdx, sIdx - 1)}
                        title="Chuyển bước lên trên"
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={sIdx === totalSteps - 1}
                        onClick={() => moveStepInCard(sIdx, sIdx + 1)}
                        title="Chuyển bước xuống dưới"
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {totalSteps > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newSteps = currentStepsList.filter((_, idx) => idx !== sIdx);
                          onUpdate(synchronizeOrderingSteps(newSteps));
                        }}
                        title="Xóa bước này"
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
              );
            }

            case 'matching':
              return (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-cyan-900">
                Các cặp vế tương ứng cần ghép nối (Cột trái ⟷ Cột phải tương ứng) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const currentPairs = question.matchingPairs || [];
                  const newPairs = [...currentPairs, { left: '', right: '' }];
                  onUpdate({ matchingPairs: newPairs });
                }}
                className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm cặp nối
              </button>
            </div>

            <div className="bg-cyan-50/60 border border-cyan-100 rounded-xl p-3 text-xs text-cyan-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>Vế trái và vế phải trên cùng một hàng là một cặp ghép đúng chuẩn. Học sinh sẽ nối vế trái với vế phải tương ứng.</span>
            </div>

            <div className="space-y-2.5">
              {(question.matchingPairs && question.matchingPairs.length > 0 
                ? question.matchingPairs 
                : [
                    { left: 'Vế trái 1...', right: 'Vế phải tương ứng 1...' },
                    { left: 'Vế trái 2...', right: 'Vế phải tương ứng 2...' }
                  ]
              ).map((pair, pIdx) => {
                return (
                  <div key={pIdx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-cyan-50/20 p-3 rounded-xl border border-cyan-100">
                    <span className="w-16 font-bold text-cyan-900 text-xs shrink-0 flex items-center gap-1">
                      <span className="w-5 h-5 rounded-md bg-cyan-600 text-white flex items-center justify-center font-bold text-[10px]">
                        {pIdx + 1}
                      </span>
                      Cặp {pIdx + 1}:
                    </span>

                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input 
                        type="text" 
                        value={pair.left}
                        onChange={(e) => {
                          const currentPairs = [...(question.matchingPairs || [])];
                          currentPairs[pIdx] = { ...currentPairs[pIdx], left: e.target.value };
                          onUpdate({ matchingPairs: currentPairs });
                        }}
                        placeholder="Vế trái (Cột A)..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />

                      <div className="hidden sm:flex items-center justify-center text-cyan-500 shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>

                      <input 
                        type="text" 
                        value={pair.right}
                        onChange={(e) => {
                          const currentPairs = [...(question.matchingPairs || [])];
                          currentPairs[pIdx] = { ...currentPairs[pIdx], right: e.target.value };
                          onUpdate({ matchingPairs: currentPairs });
                        }}
                        placeholder="Vế phải tương ứng (Cột B)..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    {(question.matchingPairs || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentPairs = (question.matchingPairs || []).filter((_, idx) => idx !== pIdx);
                          onUpdate({ matchingPairs: currentPairs });
                        }}
                        title="Xóa cặp này"
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors self-end sm:self-auto cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
              );

            case 'essay':
              return (
          <div className="space-y-3 pt-1">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong>Hướng dẫn chấm tự luận:</strong> Học sinh sẽ được cấp một khung soạn thảo văn bản để làm bài tự luận. Thầy/Cô nhập gợi ý đáp án mẫu, barem phân bổ điểm hoặc các tiêu chí chấm dưới đây để dùng khi chấm thủ công hoặc chấm tự động bằng AI.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Gợi ý đáp án mẫu / Tiêu chí chấm điểm (Barem / Rubric):
              </label>
              <textarea 
                rows={3}
                value={question.explanation || question.correctAnswer || ''}
                onChange={(e) => onUpdate({ explanation: e.target.value, correctAnswer: e.target.value })}
                placeholder="Nhập dàn ý gợi ý câu trả lời, barem điểm từng ý hoặc tiêu chí đánh giá..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-y"
              />
            </div>
          </div>
              );

            case 'classification':
              return (
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-violet-800 mb-1.5">
                Danh sách các nhóm phân loại:
              </label>
              <div className="flex flex-wrap gap-2">
                {(question.classificationGroups && question.classificationGroups.length > 0 
                  ? question.classificationGroups 
                  : ['Nhóm 1', 'Nhóm 2']
                ).map((group, gIdx) => (
                  <div key={gIdx} className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 px-3 py-1 rounded-xl">
                    <input 
                      type="text"
                      value={group}
                      onChange={(e) => {
                        const oldGroup = (question.classificationGroups || [])[gIdx];
                        const newGroups = [...(question.classificationGroups || [])];
                        newGroups[gIdx] = e.target.value;
                        const newItems = (question.classificationItems || []).map(it => 
                          it.group === oldGroup ? { ...it, group: e.target.value } : it
                        );
                        onUpdate({ classificationGroups: newGroups, classificationItems: newItems });
                      }}
                      className="bg-transparent text-xs font-bold text-violet-900 outline-none w-24"
                    />
                    {(question.classificationGroups || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newGroups = (question.classificationGroups || []).filter((_, idx) => idx !== gIdx);
                          onUpdate({ classificationGroups: newGroups });
                        }}
                        className="text-violet-400 hover:text-rose-600 font-bold text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const currentGroups = question.classificationGroups || ['Nhóm 1', 'Nhóm 2'];
                    const newGroups = [...currentGroups, `Nhóm ${currentGroups.length + 1}`];
                    onUpdate({ classificationGroups: newGroups });
                  }}
                  className="px-3 py-1 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm nhóm
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-violet-800">
                  Danh sách các mục cần phân loại và nhóm đúng tương ứng:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const currentItems = question.classificationItems || [];
                    const firstGroup = (question.classificationGroups && question.classificationGroups[0]) || 'Nhóm 1';
                    const newItems = [...currentItems, { name: '', group: firstGroup }];
                    onUpdate({ classificationItems: newItems });
                  }}
                  className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm mục
                </button>
              </div>

              <div className="space-y-2">
                {(question.classificationItems || []).map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center gap-2 bg-violet-50/30 p-2.5 rounded-xl border border-violet-100">
                    <input 
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...(question.classificationItems || [])];
                        newItems[iIdx] = { ...newItems[iIdx], name: e.target.value };
                        onUpdate({ classificationItems: newItems });
                      }}
                      placeholder={`Tên mục ${iIdx + 1}...`}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    <select
                      value={item.group}
                      onChange={(e) => {
                        const newItems = [...(question.classificationItems || [])];
                        newItems[iIdx] = { ...newItems[iIdx], group: e.target.value };
                        onUpdate({ classificationItems: newItems });
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-violet-800 focus:outline-none cursor-pointer"
                    >
                      {(question.classificationGroups || ['Nhóm 1', 'Nhóm 2']).map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    {(question.classificationItems || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = (question.classificationItems || []).filter((_, idx) => idx !== iIdx);
                          onUpdate({ classificationItems: newItems });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
              );

            default:
              return null;
          }
        })()}

        {/* Lời giải chi tiết / Giải thích đáp án (Tùy chọn mở rộng cho mọi dạng bài) */}
        {normalizedType !== 'essay' && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{showExplanation ? '− Thu gọn lời giải chi tiết' : '+ Thêm lời giải chi tiết / giải thích đáp án'}</span>
              {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showExplanation && (
              <div className="mt-2.5">
                <input 
                  type="text"
                  value={question.explanation || ''}
                  onChange={(e) => onUpdate({ explanation: e.target.value })}
                  placeholder="Nhập lời giải hoặc căn cứ giải thích cho học sinh xem sau khi hoàn thành bài..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-300"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
