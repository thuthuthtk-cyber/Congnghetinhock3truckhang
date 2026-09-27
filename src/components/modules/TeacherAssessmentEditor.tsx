import React, { useState } from 'react';
import { Sparkles, CheckSquare, Plus, Trash2, HelpCircle } from 'lucide-react';
import { QuestionItem } from '../../types';
import { TeacherQuestionsListEditor } from './TeacherQuestionsListEditor';

interface TeacherAssessmentEditorProps {
  initialQuestions?: QuestionItem[];
  initialCriteria?: string[];
  questionsBank: QuestionItem[];
  defaultSubject?: string;
  defaultGrade?: string;
  onQuestionsChange: (questions: QuestionItem[]) => void;
  onCriteriaChange: (criteria: string[]) => void;
}

export const TeacherAssessmentEditor: React.FC<TeacherAssessmentEditorProps> = ({
  initialQuestions = [],
  initialCriteria = [
    'Em đã hiểu và ghi nhớ đầy đủ nội dung cốt lõi của bài học',
    'Em biết cách vận dụng kiến thức vào thực tiễn và giải quyết bài tập',
    'Em tích cực tham gia thảo luận và hoàn thành tốt nhiệm vụ được giao'
  ],
  questionsBank,
  defaultSubject = 'Tin học',
  defaultGrade = 'Khối 3',
  onQuestionsChange,
  onCriteriaChange
}) => {
  const [subTab, setSubTab] = useState<'tab1' | 'tab2'>('tab1');

  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [criteria, setCriteria] = useState<string[]>(initialCriteria.length > 0 ? initialCriteria : [
    'Em đã hiểu và ghi nhớ đầy đủ nội dung cốt lõi của bài học',
    'Em biết cách vận dụng kiến thức vào thực tiễn và giải quyết bài tập',
    'Em tích cực tham gia thảo luận và hoàn thành tốt nhiệm vụ được giao'
  ]);

  const handleQuestionsChange = (updated: QuestionItem[]) => {
    setQuestions(updated);
    onQuestionsChange(updated);
  };

  const handleAddCriterion = () => {
    const updated = [...criteria, 'Tiêu chí đánh giá mới...'];
    setCriteria(updated);
    onCriteriaChange(updated);
  };

  const handleCriterionChange = (index: number, val: string) => {
    const updated = [...criteria];
    updated[index] = val;
    setCriteria(updated);
    onCriteriaChange(updated);
  };

  const handleDeleteCriterion = (index: number) => {
    const updated = criteria.filter((_, idx) => idx !== index);
    setCriteria(updated);
    onCriteriaChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* TIÊU ĐỀ MỤC ĐÁNH GIÁ NĂNG LỰC */}
      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wide">
            CẤU HÌNH MỤC ĐÁNH GIÁ NĂNG LỰC (ASSESSMENT)
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Hướng dẫn, tiêu chí tự đánh giá và bài kiểm tra trắc nghiệm đánh giá năng lực học sinh.
          </p>
        </div>
      </div>

      {/* 2 SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-800 rounded-2xl border border-slate-700">
        <button
          type="button"
          onClick={() => setSubTab('tab1')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'tab1'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">1</span>
          <span>1. Đánh giá bài học ({questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('tab2')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'tab2'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">2</span>
          <span>2. Tự đánh giá & Phản hồi ({criteria.length})</span>
        </button>
      </div>

      {/* TAB 1: ĐÁNH GIÁ BÀI HỌC */}
      {subTab === 'tab1' && (
        <div className="space-y-4 p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div>
              <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wide">
                TAB 1: ĐÁNH GIÁ BÀI HỌC
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Soạn thảo bộ câu hỏi kiểm tra mức độ đạt được sau tiết học.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              Tab 1/2
            </span>
          </div>

          <TeacherQuestionsListEditor
            title="DANH SÁCH CÂU HỎI ĐÁNH GIÁ"
            questions={questions}
            questionsBank={questionsBank}
            onQuestionsChange={handleQuestionsChange}
            defaultSubject={defaultSubject}
            defaultGrade={defaultGrade}
            targetSection="assessment"
            targetTitle="Thêm vào Đánh giá"
          />
        </div>
      )}

      {/* TAB 2: TỰ ĐÁNH GIÁ & PHẢN HỒI */}
      {subTab === 'tab2' && (
        <div className="space-y-4 p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div>
              <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wide">
                TAB 2: TỰ ĐÁNH GIÁ & PHẢN HỒI
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Thiết lập danh sách tiêu chí tự đánh giá và phản hồi dành cho học sinh.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              Tab 2/2
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              DANH SÁCH TIÊU CHÍ TỰ ĐÁNH GIÁ CHO GIÁO VIÊN BIÊN SOẠN ({criteria.length} TIÊU CHÍ)
            </span>
            <button
              type="button"
              onClick={handleAddCriterion}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm tiêu chí
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {criteria.map((crit, cIdx) => (
              <div key={cIdx} className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {cIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={crit}
                      onChange={(e) => handleCriterionChange(cIdx, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                      placeholder="Nhập nội dung tiêu chí tự đánh giá..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCriterion(cIdx)}
                    className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10 cursor-pointer"
                    title="Xóa tiêu chí"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 3 fixed preview rating buttons */}
                <div className="pl-8 flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Mức độ học sinh tự đánh giá (xem trước):</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                      <span>🎯</span> Tốt
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-bold flex items-center gap-1">
                      <span>👍</span> Đạt
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1">
                      <span>💪</span> Cố gắng
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
