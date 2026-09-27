import React, { useState, useRef } from 'react';
import { Plus, Trash2, Check, ChevronDown, ImageIcon, Upload, X, ArrowRight, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { QuestionItem, TrueFalseStatement } from '../../types';
import { QUESTION_TYPES, normalizeQuestionType, getDefaultAnswerSchemaByType, synchronizeOrderingSteps } from '../../lib/constants';
import { uploadToCloudinary } from '../../lib/cloudinary';

interface QuestionEditorProps {
  question: Partial<QuestionItem>;
  index: number;
  onChange: (updated: Partial<QuestionItem>) => void;
  onDelete: () => void;
  onOpenMediaModal?: () => void;
  hideImageSection?: boolean;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  index,
  onChange,
  onDelete,
  onOpenMediaModal,
  hideImageSection = false
}) => {
  const initialNormalizedType = normalizeQuestionType(question.type);
  const initialDefaultSchema = getDefaultAnswerSchemaByType(initialNormalizedType);

  const [type, setType] = useState<string>(initialNormalizedType);
  const [content, setContent] = useState<string>(question.content || '');
  const [options, setOptions] = useState<string[]>(
    question.options && question.options.length > 0
      ? question.options
      : initialDefaultSchema.options || ['', '', '', '']
  );
  const [correctAnswer, setCorrectAnswer] = useState<string>(
    question.correctAnswer !== undefined
      ? question.correctAnswer
      : initialDefaultSchema.correctAnswer || ''
  );
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>(
    question.matchingPairs && question.matchingPairs.length > 0
      ? question.matchingPairs
      : initialDefaultSchema.matchingPairs || [{ left: '', right: '' }, { left: '', right: '' }]
  );
  const [classificationGroups, setClassificationGroups] = useState<string[]>(
    question.classificationGroups && question.classificationGroups.length > 0
      ? question.classificationGroups
      : initialDefaultSchema.classificationGroups || ['Nhóm 1', 'Nhóm 2']
  );
  const [classificationItems, setClassificationItems] = useState<{ name: string; group: string }[]>(
    question.classificationItems && question.classificationItems.length > 0
      ? question.classificationItems
      : initialDefaultSchema.classificationItems || [{ name: '', group: 'Nhóm 1' }, { name: '', group: 'Nhóm 2' }]
  );
  const [statements, setStatements] = useState<TrueFalseStatement[]>(
    question.statements && question.statements.length > 0
      ? question.statements
      : initialDefaultSchema.statements || [{ statement: '', isCorrect: true }, { statement: '', isCorrect: false }]
  );
  const [explanation, setExplanation] = useState<string>(question.explanation || '');
  const [imageUrl, setImageUrl] = useState<string>(question.imageUrl || '');
  const [imagePrompt, setImagePrompt] = useState<string>(question.imagePrompt || '');
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null);
  const [dragOverStepIdx, setDragOverStepIdx] = useState<number | null>(null);

  React.useEffect(() => {
    const normType = normalizeQuestionType(question.type);
    const defSchema = getDefaultAnswerSchemaByType(normType);
    setType(normType);
    setContent(question.content || '');
    setOptions(
      question.options && question.options.length > 0
        ? question.options
        : defSchema.options || ['', '', '', '']
    );
    setCorrectAnswer(
      question.correctAnswer !== undefined
        ? question.correctAnswer
        : defSchema.correctAnswer || ''
    );
    setMatchingPairs(
      question.matchingPairs && question.matchingPairs.length > 0
        ? question.matchingPairs
        : defSchema.matchingPairs || [{ left: '', right: '' }, { left: '', right: '' }]
    );
    setClassificationGroups(
      question.classificationGroups && question.classificationGroups.length > 0
        ? question.classificationGroups
        : defSchema.classificationGroups || ['Nhóm 1', 'Nhóm 2']
    );
    setClassificationItems(
      question.classificationItems && question.classificationItems.length > 0
        ? question.classificationItems
        : defSchema.classificationItems || [{ name: '', group: 'Nhóm 1' }, { name: '', group: 'Nhóm 2' }]
    );
    setStatements(
      question.statements && question.statements.length > 0
        ? question.statements
        : defSchema.statements || [{ statement: '', isCorrect: true }, { statement: '', isCorrect: false }]
    );
    setExplanation(question.explanation || '');
    setImageUrl(question.imageUrl || '');
    setImagePrompt(question.imagePrompt || '');
  }, [question.id]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const secureUrl = await uploadToCloudinary(file, 'image');
        setImageUrl(secureUrl);
        handleUpdate({ imageUrl: secureUrl });
      } catch (err: any) {
        console.error(err.message || 'Không thể tải ảnh lên Cloudinary.');
      }
    }
  };

  const buildScopedPayload = (
    activeType: string,
    opts: string[],
    ans: string,
    pairs: { left: string; right: string }[],
    groups: string[],
    items: { name: string; group: string }[],
    stmts: TrueFalseStatement[]
  ): Partial<QuestionItem> => {
    const norm = normalizeQuestionType(activeType);
    switch (norm) {
      case 'multiple_choice':
      case 'multiple_response':
        return {
          type: norm,
          options: opts,
          correctAnswer: ans || 'A',
          statements: undefined,
          matchingPairs: undefined,
          classificationGroups: undefined,
          classificationItems: undefined,
        };
      case 'true_false':
        return {
          type: 'true_false',
          options: undefined,
          correctAnswer: '',
          statements: stmts,
          matchingPairs: undefined,
          classificationGroups: undefined,
          classificationItems: undefined,
        };
      case 'fill_blank':
        return {
          type: 'fill_blank',
          options: undefined,
          correctAnswer: ans,
          statements: undefined,
          matchingPairs: undefined,
          classificationGroups: undefined,
          classificationItems: undefined,
        };
      case 'ordering':
        return synchronizeOrderingSteps(opts);
      case 'matching':
        return {
          type: 'matching',
          options: undefined,
          correctAnswer: '',
          statements: undefined,
          matchingPairs: pairs,
          classificationGroups: undefined,
          classificationItems: undefined,
        };
      case 'classification':
        return {
          type: 'classification',
          options: undefined,
          correctAnswer: '',
          statements: undefined,
          matchingPairs: undefined,
          classificationGroups: groups,
          classificationItems: items,
        };
      case 'essay':
        return {
          type: 'essay',
          options: undefined,
          correctAnswer: ans,
          statements: undefined,
          matchingPairs: undefined,
          classificationGroups: undefined,
          classificationItems: undefined,
        };
      default:
        return {
          type: 'multiple_choice',
          options: opts,
          correctAnswer: ans || 'A',
        };
    }
  };

  const handleUpdate = (newFields: Partial<QuestionItem>) => {
    const nextType = newFields.type !== undefined ? normalizeQuestionType(newFields.type) : type;
    const nextOpts = newFields.options !== undefined ? newFields.options : options;
    const nextAns = newFields.correctAnswer !== undefined ? newFields.correctAnswer : correctAnswer;
    const nextPairs = newFields.matchingPairs !== undefined ? newFields.matchingPairs : matchingPairs;
    const nextGroups = newFields.classificationGroups !== undefined ? newFields.classificationGroups : classificationGroups;
    const nextItems = newFields.classificationItems !== undefined ? newFields.classificationItems : classificationItems;
    const nextStmts = newFields.statements !== undefined ? newFields.statements : statements;

    const scopedAnswerFields = buildScopedPayload(
      nextType,
      nextOpts,
      nextAns,
      nextPairs,
      nextGroups,
      nextItems,
      nextStmts
    );

    const updated: Partial<QuestionItem> = {
      content: newFields.content !== undefined ? newFields.content : content,
      explanation: newFields.explanation !== undefined ? newFields.explanation : explanation,
      imageUrl: newFields.imageUrl !== undefined ? newFields.imageUrl : imageUrl,
      imagePrompt: newFields.imagePrompt !== undefined ? newFields.imagePrompt : imagePrompt,
      ...scopedAnswerFields,
    };
    onChange(updated);
  };

  const handleTypeChange = (rawNewType: string) => {
    const newType = normalizeQuestionType(rawNewType);
    if (type !== newType) {
      const resetSchema = getDefaultAnswerSchemaByType(newType);
      const newOpts = resetSchema.options || ['', '', '', ''];
      const newAns = resetSchema.correctAnswer !== undefined ? resetSchema.correctAnswer : '';
      const newMatching = resetSchema.matchingPairs || [{ left: '', right: '' }, { left: '', right: '' }];
      const newGroups = resetSchema.classificationGroups || ['Nhóm 1', 'Nhóm 2'];
      const newItems = resetSchema.classificationItems || [{ name: '', group: 'Nhóm 1' }, { name: '', group: 'Nhóm 2' }];
      const newStmts = resetSchema.statements || [{ statement: '', isCorrect: true }, { statement: '', isCorrect: false }];

      setType(newType);
      setOptions(newOpts);
      setCorrectAnswer(newAns);
      setMatchingPairs(newMatching);
      setClassificationGroups(newGroups);
      setClassificationItems(newItems);
      setStatements(newStmts);

      onChange({
        content,
        explanation,
        imageUrl,
        imagePrompt,
        ...resetSchema,
      });
    }
  };

  const renderAnswerInputByType = () => {
    switch (type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Các phương án trả lời <span className="text-rose-500">*</span> (Bấm nút tròn bên trái để chọn 1 đáp án đúng)
              </label>
              <button
                type="button"
                onClick={() => {
                  const newOpts = [...options, ''];
                  setOptions(newOpts);
                  handleUpdate({ options: newOpts });
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm phương án
              </button>
            </div>
            <div className="space-y-2">
              {options.map((opt, oIdx) => {
                const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                const letter = letters[oIdx] || String.fromCharCode(65 + oIdx);
                const isCorrect = correctAnswer === letter;

                return (
                  <div key={oIdx} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${isCorrect ? 'bg-emerald-50/50 border-emerald-500' : 'bg-slate-50/50 border-slate-200'}`}>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="radio"
                        name={`mc-radio-${index}`}
                        checked={isCorrect}
                        onChange={() => {
                          setCorrectAnswer(letter);
                          handleUpdate({ correctAnswer: letter });
                        }}
                        className="w-4 h-4 text-emerald-600 cursor-pointer"
                      />
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {letter}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[oIdx] = e.target.value;
                        setOptions(newOpts);
                        handleUpdate({ options: newOpts });
                      }}
                      placeholder={`Nhập nội dung phương án ${letter}...`}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = options.filter((_, idx) => idx !== oIdx);
                          setOptions(newOpts);
                          handleUpdate({ options: newOpts });
                        }}
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

      case 'multiple_response':
        return (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-fuchsia-700">
                Các phương án trả lời <span className="text-rose-500">*</span> (Tích chọn nhiều đáp án đúng bằng checkbox)
              </label>
              <button
                type="button"
                onClick={() => {
                  const newOpts = [...options, ''];
                  setOptions(newOpts);
                  handleUpdate({ options: newOpts });
                }}
                className="text-xs font-bold text-fuchsia-600 hover:text-fuchsia-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm phương án
              </button>
            </div>
            <div className="space-y-2">
              {options.map((opt, oIdx) => {
                const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                const letter = letters[oIdx] || String.fromCharCode(65 + oIdx);
                const correctList = correctAnswer ? correctAnswer.split(',').map(s => s.trim()).filter(Boolean) : [];
                const isCorrect = correctList.includes(letter);

                return (
                  <div key={oIdx} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${isCorrect ? 'bg-fuchsia-50/50 border-fuchsia-400' : 'bg-slate-50/50 border-slate-200'}`}>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isCorrect}
                        onChange={(e) => {
                          let newList = [...correctList];
                          if (e.target.checked) {
                            if (!newList.includes(letter)) newList.push(letter);
                          } else {
                            newList = newList.filter(l => l !== letter);
                          }
                          const newAns = newList.sort().join(', ');
                          setCorrectAnswer(newAns);
                          handleUpdate({ correctAnswer: newAns });
                        }}
                        className="w-4 h-4 text-fuchsia-600 rounded cursor-pointer"
                      />
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${isCorrect ? 'bg-fuchsia-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {letter}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[oIdx] = e.target.value;
                        setOptions(newOpts);
                        handleUpdate({ options: newOpts });
                      }}
                      placeholder={`Nhập phương án ${letter}...`}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = options.filter((_, idx) => idx !== oIdx);
                          setOptions(newOpts);
                          handleUpdate({ options: newOpts });
                        }}
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

      case 'true_false':
        return (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-emerald-700">
                Danh sách các phát biểu Đúng / Sai <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const newStmts = [...statements, { statement: '', isCorrect: true }];
                  setStatements(newStmts);
                  handleUpdate({ statements: newStmts });
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm phát biểu
              </button>
            </div>
            <div className="space-y-3">
              {statements.map((stmt, sIdx) => (
                <div key={sIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {sIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={stmt.statement}
                      onChange={(e) => {
                        const newStmts = [...statements];
                        newStmts[sIdx] = { ...newStmts[sIdx], statement: e.target.value };
                        setStatements(newStmts);
                        handleUpdate({ statements: newStmts });
                      }}
                      placeholder={`Nhập phát biểu ${sIdx + 1}...`}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {statements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newStmts = statements.filter((_, idx) => idx !== sIdx);
                          setStatements(newStmts);
                          handleUpdate({ statements: newStmts });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 pl-8">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-emerald-700">
                      <input
                        type="radio"
                        name={`tf-stmt-${index}-${sIdx}`}
                        checked={stmt.isCorrect}
                        onChange={() => {
                          const newStmts = [...statements];
                          newStmts[sIdx] = { ...newStmts[sIdx], isCorrect: true };
                          setStatements(newStmts);
                          handleUpdate({ statements: newStmts });
                        }}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <span>✅ ĐÚNG</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-rose-700">
                      <input
                        type="radio"
                        name={`tf-stmt-${index}-${sIdx}`}
                        checked={!stmt.isCorrect}
                        onChange={() => {
                          const newStmts = [...statements];
                          newStmts[sIdx] = { ...newStmts[sIdx], isCorrect: false };
                          setStatements(newStmts);
                          handleUpdate({ statements: newStmts });
                        }}
                        className="w-4 h-4 text-rose-600"
                      />
                      <span>❌ SAI</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'fill_blank':
        return (
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-amber-700">
              Đáp án chính xác cho câu điền khuyết / ngắn <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={correctAnswer}
              onChange={(e) => {
                setCorrectAnswer(e.target.value);
                handleUpdate({ correctAnswer: e.target.value });
              }}
              placeholder="Nhập đáp án đúng (nhiều đáp án cách nhau bằng dấu phẩy, VD: 15, mười lăm)..."
              className="w-full bg-amber-50/40 border border-amber-300 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        );

      case 'ordering': {
        const moveStepToPosition = (fromIdx: number, toIdx: number) => {
          if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= options.length || toIdx >= options.length) return;
          const reordered = [...options];
          const [movedItem] = reordered.splice(fromIdx, 1);
          reordered.splice(toIdx, 0, movedItem);
          const synced = synchronizeOrderingSteps(reordered);
          console.log('[QuestionEditor - Reorder Steps]', {
            questionId: question.id,
            updatedOrderingSteps: synced.orderingSteps,
            canonicalOptions: synced.canonicalOptions,
          });
          setOptions(reordered);
          setCorrectAnswer(synced.correctAnswer || '');
          handleUpdate({ options: reordered, correctAnswer: synced.correctAnswer || '' });
        };

        return (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-indigo-700">
                Các bước thực hiện theo đúng thứ tự chuẩn (kéo-thả hoặc bấm ▲/▼ để đổi vị trí) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const newOpts = [...options, ''];
                  const synced = synchronizeOrderingSteps(newOpts);
                  setOptions(newOpts);
                  setCorrectAnswer(synced.correctAnswer || '');
                  handleUpdate({ options: newOpts, correctAnswer: synced.correctAnswer || '' });
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm bước
              </button>
            </div>
            <div className="space-y-2">
              {options.map((step, sIdx) => (
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
                      moveStepToPosition(fromIdx, sIdx);
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedStepIdx(null);
                    setDragOverStepIdx(null);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                    dragOverStepIdx === sIdx && draggedStepIdx !== sIdx
                      ? 'bg-indigo-100/70 border-indigo-500 ring-2 ring-indigo-200'
                      : draggedStepIdx === sIdx
                      ? 'opacity-50 bg-indigo-50 border-indigo-300'
                      : 'bg-indigo-50/30 border-indigo-100'
                  }`}
                >
                  <div
                    className="cursor-grab active:cursor-grabbing text-indigo-400 hover:text-indigo-700 p-1 shrink-0"
                    title="Kéo-thả để sắp xếp lại vị trí bước"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <span className="w-16 font-bold text-indigo-800 text-xs shrink-0">Bước {sIdx + 1}:</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[sIdx] = e.target.value;
                      const synced = synchronizeOrderingSteps(newOpts);
                      setOptions(newOpts);
                      setCorrectAnswer(synced.correctAnswer || '');
                      handleUpdate({ options: newOpts, correctAnswer: synced.correctAnswer || '' });
                    }}
                    placeholder={`Nội dung bước ${sIdx + 1} theo đúng thứ tự...`}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={sIdx === 0}
                      onClick={() => moveStepToPosition(sIdx, sIdx - 1)}
                      title="Chuyển bước lên trên"
                      className="p-1 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={sIdx === options.length - 1}
                      onClick={() => moveStepToPosition(sIdx, sIdx + 1)}
                      title="Chuyển bước xuống dưới"
                      className="p-1 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newOpts = options.filter((_, idx) => idx !== sIdx);
                        const synced = synchronizeOrderingSteps(newOpts);
                        setOptions(newOpts);
                        setCorrectAnswer(synced.correctAnswer || '');
                        handleUpdate({ options: newOpts, correctAnswer: synced.correctAnswer || '' });
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
        );
      }

      case 'matching':
        return (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-cyan-700">
                Các cặp vế tương ứng cần nối <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const newPairs = [...matchingPairs, { left: '', right: '' }];
                  setMatchingPairs(newPairs);
                  handleUpdate({ matchingPairs: newPairs });
                }}
                className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm cặp nối
              </button>
            </div>
            <div className="space-y-2">
              {matchingPairs.map((pair, pIdx) => (
                <div key={pIdx} className="flex items-center gap-2 bg-cyan-50/30 p-2.5 rounded-xl border border-cyan-100">
                  <span className="w-14 font-bold text-cyan-800 text-xs shrink-0">Cặp {pIdx + 1}:</span>
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(e) => {
                      const newPairs = [...matchingPairs];
                      newPairs[pIdx] = { ...newPairs[pIdx], left: e.target.value };
                      setMatchingPairs(newPairs);
                      handleUpdate({ matchingPairs: newPairs });
                    }}
                    placeholder="Vế trái..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <ArrowRight className="w-4 h-4 text-cyan-600 shrink-0" />
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(e) => {
                      const newPairs = [...matchingPairs];
                      newPairs[pIdx] = { ...newPairs[pIdx], right: e.target.value };
                      setMatchingPairs(newPairs);
                      handleUpdate({ matchingPairs: newPairs });
                    }}
                    placeholder="Vế phải tương ứng..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  {matchingPairs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newPairs = matchingPairs.filter((_, idx) => idx !== pIdx);
                        setMatchingPairs(newPairs);
                        handleUpdate({ matchingPairs: newPairs });
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
        );

      case 'classification':
        return (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-violet-700 mb-1.5">
                Danh sách các nhóm / danh mục phân loại:
              </label>
              <div className="flex flex-wrap gap-2">
                {classificationGroups.map((group, gIdx) => (
                  <div key={gIdx} className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-xl">
                    <input
                      type="text"
                      value={group}
                      onChange={(e) => {
                        const oldGroup = classificationGroups[gIdx];
                        const newGroups = [...classificationGroups];
                        newGroups[gIdx] = e.target.value;
                        setClassificationGroups(newGroups);
                        const newItems = classificationItems.map(item => item.group === oldGroup ? { ...item, group: e.target.value } : item);
                        setClassificationItems(newItems);
                        handleUpdate({ classificationGroups: newGroups, classificationItems: newItems });
                      }}
                      className="bg-transparent text-xs font-bold text-violet-900 outline-none w-28"
                    />
                    {classificationGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newGroups = classificationGroups.filter((_, idx) => idx !== gIdx);
                          setClassificationGroups(newGroups);
                          handleUpdate({ classificationGroups: newGroups });
                        }}
                        className="text-violet-400 hover:text-rose-600 text-xs font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newGroups = [...classificationGroups, `Nhóm ${classificationGroups.length + 1}`];
                    setClassificationGroups(newGroups);
                    handleUpdate({ classificationGroups: newGroups });
                  }}
                  className="px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm nhóm
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-violet-700">
                  Danh sách các mục cần phân loại và nhóm đúng:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newItems = [...classificationItems, { name: '', group: classificationGroups[0] || 'Nhóm 1' }];
                    setClassificationItems(newItems);
                    handleUpdate({ classificationItems: newItems });
                  }}
                  className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm mục
                </button>
              </div>
              <div className="space-y-2">
                {classificationItems.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center gap-2 bg-violet-50/30 p-2.5 rounded-xl border border-violet-100">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...classificationItems];
                        newItems[iIdx] = { ...newItems[iIdx], name: e.target.value };
                        setClassificationItems(newItems);
                        handleUpdate({ classificationItems: newItems });
                      }}
                      placeholder={`Tên mục ${iIdx + 1}...`}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    <select
                      value={item.group}
                      onChange={(e) => {
                        const newItems = [...classificationItems];
                        newItems[iIdx] = { ...newItems[iIdx], group: e.target.value };
                        setClassificationItems(newItems);
                        handleUpdate({ classificationItems: newItems });
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-violet-800 focus:outline-none cursor-pointer"
                    >
                      {classificationGroups.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    {classificationItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = classificationItems.filter((_, idx) => idx !== iIdx);
                          setClassificationItems(newItems);
                          handleUpdate({ classificationItems: newItems });
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

      case 'essay':
        return (
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-slate-700">
              Gợi ý chấm điểm / Đáp án tham khảo cho giáo viên (Tùy chọn)
            </label>
            <textarea
              rows={3}
              value={correctAnswer || explanation}
              onChange={(e) => {
                setCorrectAnswer(e.target.value);
                setExplanation(e.target.value);
                handleUpdate({ correctAnswer: e.target.value, explanation: e.target.value });
              }}
              placeholder="Nhập dàn ý chấm điểm, barem điểm hoặc hướng dẫn chi tiết..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-300 resize-y"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header Question */}
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-indigo-200">
            {index + 1}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">DẠNG BÀI:</span>
            <div className="relative">
              <select 
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 pr-8 text-xs font-bold text-indigo-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 cursor-pointer shadow-2xs"
              >
                {QUESTION_TYPES.map(qt => (
                  <option key={qt.id} value={qt.id}>{qt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Xóa câu hỏi này"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Body Question */}
      <div className="p-5 space-y-5">
        <div>
          <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-2">
            Nội dung câu hỏi {index + 1} <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleUpdate({ content: e.target.value });
            }}
            rows={2}
            placeholder="Nhập nội dung câu hỏi..."
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 resize-y"
          />
        </div>

        {/* KHU VỰC HÌNH ẢNH & LỜI DẪN CÂU HỎI */}
        {!hideImageSection && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <ImageIcon className="w-4 h-4 text-indigo-500" /> KHU VỰC HÌNH ẢNH & LỜI DẪN CÂU HỎI
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Đường dẫn hình ảnh / Media (Nếu có)</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      handleUpdate({ imageUrl: e.target.value });
                    }}
                    placeholder="Dán link URL hình ảnh online (https://...)" 
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                    title="Tải ảnh trực tiếp từ máy tính"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh lên</span>
                  </button>
                </div>

                {imageUrl && (
                  <div className="relative inline-flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 mt-1">
                    <img src={imageUrl} alt="Xem trước" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                    <div className="text-[11px] text-slate-600 font-medium max-w-[200px] truncate">
                      {imageUrl.startsWith('data:') ? 'Ảnh tải từ máy tính' : imageUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        handleUpdate({ imageUrl: '' });
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-600 shadow-sm cursor-pointer"
                      title="Xóa ảnh"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Nội dung mô tả hình ảnh / Lời dẫn</label>
                <textarea 
                  rows={2}
                  value={imagePrompt}
                  onChange={(e) => {
                    setImagePrompt(e.target.value);
                    handleUpdate({ imagePrompt: e.target.value });
                  }}
                  placeholder="Soạn kịch bản, lời dẫn hoặc gợi ý hình ảnh cho học sinh..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 resize-y"
                ></textarea>
              </div>
            </div>
          </div>
        )}

        {/* Render Answer Input UI Strictly By Type (Switch-Case) */}
        {renderAnswerInputByType()}

        {/* Lời giải chi tiết (Áp dụng chung cho các dạng trắc nghiệm/khách quan) */}
        {type !== 'essay' && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Lời giải chi tiết / Giải thích đáp án:
            </label>
            <input
              type="text"
              value={explanation}
              onChange={(e) => {
                setExplanation(e.target.value);
                handleUpdate({ explanation: e.target.value });
              }}
              placeholder="Nhập giải thích chi tiết cho đáp án đúng..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-300"
            />
          </div>
        )}
      </div>
    </div>
  );
};
