import React, { useState } from 'react';
import { Plus, Database } from 'lucide-react';
import { QuestionItem } from '../../types';
import { QuestionEditor } from '../shared/QuestionEditor';
import { getLocalCachedQuestions, QUESTIONS_CACHE_KEY, saveQuestionsBatchToFirestore } from '../../services/questionStorageService';
import { UseQuestionBankModal } from './UseQuestionBankModal';

interface TeacherQuestionsListEditorProps {
  title: string;
  questions: QuestionItem[];
  questionsBank: QuestionItem[];
  onQuestionsChange: (questions: QuestionItem[]) => void;
  defaultSubject?: string;
  defaultGrade?: string;
  targetSection?: 'elaborate' | 'apply' | 'assessment';
  targetTitle?: string;
}

export const TeacherQuestionsListEditor: React.FC<TeacherQuestionsListEditorProps> = ({
  title,
  questions,
  questionsBank,
  onQuestionsChange,
  defaultSubject = 'Tin học',
  defaultGrade = 'Khối 3',
  targetSection,
  targetTitle
}) => {
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [saveToBankGlobal, setSaveToBankGlobal] = useState(false);

  // Compute effective target title and mode
  const effectiveTargetTitle =
    targetTitle ||
    (targetSection === 'apply'
      ? 'Thêm vào Vận dụng'
      : targetSection === 'assessment'
      ? 'Thêm vào Đánh giá'
      : title.toUpperCase().includes('VẬN DỤNG')
      ? 'Thêm vào Vận dụng'
      : title.toUpperCase().includes('ĐÁNH GIÁ')
      ? 'Thêm vào Đánh giá'
      : 'Thêm vào Luyện tập');

  const effectiveMode: 'lesson_elaborate' | 'lesson_evaluate' | 'lesson_assessment' =
    targetSection === 'apply'
      ? 'lesson_evaluate'
      : targetSection === 'assessment'
      ? 'lesson_assessment'
      : title.toUpperCase().includes('VẬN DỤNG')
      ? 'lesson_evaluate'
      : title.toUpperCase().includes('ĐÁNH GIÁ')
      ? 'lesson_assessment'
      : 'lesson_elaborate';

  const handleAddManualQuestion = () => {
    const newQ: QuestionItem = {
      id: `q-${Date.now()}`,
      code: `CH-${Math.floor(100 + Math.random() * 900)}`,
      subject: defaultSubject,
      grade: defaultGrade,
      level: 'thong_hieu',
      type: 'multiple_choice',
      content: '',
      options: ['', '', '', ''],
      correctAnswer: 'A'
    };
    const updated = [...questions, newQ];
    onQuestionsChange(updated);
    if (saveToBankGlobal) {
      const existing = getLocalCachedQuestions();
      const updatedBank = [...existing, newQ];
      localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(updatedBank));
      saveQuestionsBatchToFirestore([newQ]).catch(console.error);
    }
  };

  const handleUpdateQuestion = (index: number, updatedFields: Partial<QuestionItem>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updatedFields };
    onQuestionsChange(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, idx) => idx !== index);
    onQuestionsChange(updated);
  };

  const handleSelectQuestionsFromBank = (selectedFromBank: QuestionItem[]) => {
    // Append chosen questions with distinct cloned IDs to avoid duplication collisions
    const cloned = selectedFromBank.map((q) => ({
      ...q,
      id: `q-bank-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    }));
    const updated = [...questions, ...cloned];
    onQuestionsChange(updated);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
            {title} ({questions.length} CÂU)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-800 px-3 py-2 rounded-xl border border-slate-700">
            <input
              type="checkbox"
              checked={saveToBankGlobal}
              onChange={(e) => setSaveToBankGlobal(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-400"
            />
            <span>Lưu vào Ngân hàng câu hỏi chung</span>
          </label>

          <button
            type="button"
            onClick={() => setIsBankModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>Chọn từ Ngân hàng câu hỏi</span>
          </button>

          <button
            type="button"
            onClick={handleAddManualQuestion}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm câu hỏi mới</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="text-slate-900">
            <QuestionEditor
              question={q}
              index={idx}
              onChange={(updated) => handleUpdateQuestion(idx, updated)}
              onDelete={() => handleDeleteQuestion(idx)}
            />
          </div>
        ))}
      </div>

      {/* USE QUESTION BANK MODAL (3 TABS) */}
      {isBankModalOpen && (
        <UseQuestionBankModal
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          questions={questionsBank}
          mode={effectiveMode}
          targetTitle={effectiveTargetTitle}
          initialSubject={defaultSubject}
          initialGrade={defaultGrade}
          onSelectQuestions={handleSelectQuestionsFromBank}
        />
      )}
    </div>
  );
};

