import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { QuestionItem } from '../../types';
import { TeacherQuestionsListEditor } from './TeacherQuestionsListEditor';

interface TeacherElaborateEditorProps {
  initialObjective?: string;
  initialTransitionGuidance?: string;
  initialQuestions?: QuestionItem[];
  questionsBank: QuestionItem[];
  defaultSubject?: string;
  defaultGrade?: string;
  onObjectiveChange?: (val: string) => void;
  onTransitionGuidanceChange?: (val: string) => void;
  onQuestionsChange: (questions: QuestionItem[]) => void;
}

export const TeacherElaborateEditor: React.FC<TeacherElaborateEditorProps> = ({
  initialTransitionGuidance = 'Vừa rồi các em đã tìm hiểu qua video bài giảng và nắm vững các khái niệm trọng tâm. Bây giờ chúng ta cùng bước vào phần Luyện tập để củng cố và vận dụng kiến thức nhé!',
  initialQuestions = [],
  questionsBank,
  defaultSubject = 'Tin học',
  defaultGrade = 'Khối 3',
  onTransitionGuidanceChange,
  onQuestionsChange
}) => {
  const [transitionGuidance, setTransitionGuidance] = useState<string>(initialTransitionGuidance);
  const [questions, setQuestions] = useState<QuestionItem[]>(
    initialQuestions.length > 0 ? initialQuestions : [
      {
        id: 'q-el-1',
        code: 'CH-EL-01',
        subject: 'Tin học',
        grade: 'Khối 3',
        level: 'nhan_biet',
        type: 'multiple_choice',
        content: 'Câu hỏi luyện tập 1: Đâu là quyết định hợp lý khi nhận được thông tin dự báo thời tiết có mưa lớn?',
        options: [
          'Mang theo áo mưa hoặc ô (dù)',
          'Đi chơi sân trường không cần che chắn',
          'Mặc quần áo mỏng nhẹ',
          'Không cần quan tâm'
        ],
        correctAnswer: 'A',
        explanation: 'Mang theo áo mưa giúp tránh bị ướt khi trời mưa lớn.'
      }
    ]
  );

  const handleQuestionsChange = (updated: QuestionItem[]) => {
    setQuestions(updated);
    onQuestionsChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* TIÊU ĐỀ MỤC LUYỆN TẬP */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wide">
            CẤU HÌNH MỤC LUYỆN TẬP (ELABORATE)
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Soạn thảo mục tiêu, lời dẫn chuyển tiếp và bộ câu hỏi luyện tập tương tác cho học sinh.
          </p>
        </div>
      </div>

      {/* Lời dẫn chuyển tiếp vào Luyện tập (Hiển thị cho học sinh) */}
      <div className="space-y-1.5 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
        <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Lời dẫn chuyển tiếp vào Luyện tập (Hiển thị cho học sinh):
        </label>
        <textarea
          rows={2}
          value={transitionGuidance}
          onChange={(e) => {
            setTransitionGuidance(e.target.value);
            if (onTransitionGuidanceChange) {
              onTransitionGuidanceChange(e.target.value);
            }
          }}
          className="w-full p-3 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 placeholder-slate-500 leading-relaxed"
          placeholder="Ví dụ: Vừa rồi các em đã tìm hiểu qua video bài giảng. Bây giờ chúng ta cùng bước vào phần Luyện tập để củng cố và vận dụng kiến thức nhé!"
        />
      </div>

      <TeacherQuestionsListEditor
        title="DANH SÁCH CÂU HỎI LUYỆN TẬP"
        questions={questions}
        questionsBank={questionsBank}
        defaultSubject={defaultSubject}
        defaultGrade={defaultGrade}
        targetSection="elaborate"
        targetTitle="Thêm vào Luyện tập"
        onQuestionsChange={handleQuestionsChange}
      />
    </div>
  );
};

