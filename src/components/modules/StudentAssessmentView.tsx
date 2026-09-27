import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckSquare, 
  Star, 
  Award, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Check, 
  X, 
  RotateCcw,
  ClipboardList
} from 'lucide-react';
import { Lesson5EPlan, QuestionItem } from '../../types';
import { getQuestionTypeLabel } from '../../lib/constants';

interface StudentAssessmentViewProps {
  lesson: Lesson5EPlan;
  onNavigateToNext: () => void;
  nextStepLabel?: string;
  onSaveProgress?: (assessmentData: any) => void;
  savedData?: any;
}

interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
}

export const StudentAssessmentView: React.FC<StudentAssessmentViewProps> = ({
  lesson,
  onNavigateToNext,
  nextStepLabel = 'Nhận xét & Vinh danh (Review)',
  onSaveProgress,
  savedData
}) => {
  const assessmentConfig = (lesson as any)?.assessmentConfig || {};
  
  // 2 sub-tabs: 'test' (Đánh giá bài học) & 'self-eval' (Tự đánh giá)
  const [activeSubTab, setActiveSubTab] = useState<'test' | 'self-eval'>(savedData?.activeSubTab || 'test');

  // TAB 1: ASSESSMENT TEST
  const questions: QuestionItem[] = (assessmentConfig.questions && assessmentConfig.questions.length > 0)
    ? assessmentConfig.questions
    : [
        {
          id: 'q-ass-default-1',
          code: 'CH-DG-01',
          subject: lesson.subject || 'Tin học',
          grade: lesson.grade || 'Khối 3',
          level: 'thong_hieu',
          type: 'multiple_choice',
          content: 'Nội dung cốt lõi quan trọng nhất mà em đã thu nhận được sau toàn bộ tiến trình bài học là gì?',
          options: [
            'Hiểu rõ bản chất vấn đề, biết cách thực hành chuẩn xác và tự tin giải quyết nhiệm vụ',
            'Chỉ ghi nhớ các định nghĩa mà không biết cách áp dụng',
            'Chỉ hoàn thành cho xong mà không cần hiểu lý do',
            'Không cần rèn luyện thêm sau giờ học'
          ],
          correctAnswer: 'A',
          explanation: 'Mục tiêu hàng đầu của bài giảng 5E là phát triển toàn diện cả phẩm chất, tư duy và năng lực vận dụng thực tiễn.'
        },
        {
          id: 'q-ass-default-2',
          code: 'CH-DG-02',
          subject: lesson.subject || 'Tin học',
          grade: lesson.grade || 'Khối 3',
          level: 'van_dung',
          type: 'multiple_choice',
          content: 'Khi gặp một nhiệm vụ học tập mới tương tự, em sẽ bắt đầu bằng cách nào?',
          options: [
            'Xác định rõ mục tiêu, phân tích các bước và từng bước triển khai',
            'Làm bừa mà không cần đọc yêu cầu',
            'Bỏ qua nếu cảm thấy chưa quen thuộc',
            'Chỉ chờ đáp án từ giáo viên'
          ],
          correctAnswer: 'A',
          explanation: 'Chủ động phân tích và lập kế hoạch là phương pháp học tập chủ động và sáng tạo.'
        }
      ];

  const [testAnswers, setTestAnswers] = useState<Record<string, string>>(savedData?.testAnswers || {});
  const [isTestSubmitted, setIsTestSubmitted] = useState<boolean>(Boolean(savedData?.isTestSubmitted));
  const [testScore, setTestScore] = useState<number>(savedData?.testScore ?? 0);
  const [correctTestCount, setCorrectTestCount] = useState<number>(savedData?.correctTestCount ?? 0);

  // TAB 2: SELF EVALUATION RUBRICS
  const defaultCriteria: EvaluationCriterion[] = [
    {
      id: 'crit-1',
      name: 'Nắm vững kiến thức trọng tâm',
      description: 'Hiểu rõ các khái niệm, quy trình và kiến thức đã học trong bài'
    },
    {
      id: 'crit-2',
      name: 'Thực hành & Luyện tập tích cực',
      description: 'Tự giác hoàn thành đầy đủ các bài tập luyện tập và câu hỏi tương tác'
    },
    {
      id: 'crit-3',
      name: 'Vận dụng vào thực tế đời sống',
      description: 'Biết cách liên hệ, phân tích tình huống và đề xuất hướng giải quyết'
    },
    {
      id: 'crit-4',
      name: 'Thái độ học tập & Trách nhiệm',
      description: 'Chủ động, kiên trì, trung thực và hoàn thành đúng hạn'
    }
  ];

  const criteria: EvaluationCriterion[] = assessmentConfig.criteria && assessmentConfig.criteria.length > 0
    ? assessmentConfig.criteria
    : defaultCriteria;

  const [selfRatings, setSelfRatings] = useState<Record<string, 'tot' | 'dat' | 'co_gang'>>(
    savedData?.selfRatings || {
      'crit-1': 'tot',
      'crit-2': 'tot',
      'crit-3': 'tot',
      'crit-4': 'tot'
    }
  );

  const [selfReflectionNote, setSelfReflectionNote] = useState<string>(
    savedData?.selfReflectionNote || 'Em cảm thấy bài học rất thú vị, dễ hiểu và giúp ích nhiều cho việc học của em.'
  );
  const [isSelfEvalSubmitted, setIsSelfEvalSubmitted] = useState<boolean>(Boolean(savedData?.isSelfEvalSubmitted));

  // Submit test
  const handleGradeTest = () => {
    let correct = 0;
    questions.forEach(q => {
      if (testAnswers[q.id] === (q.correctAnswer || 'A')) {
        correct++;
      }
    });
    const finalScore = questions.length > 0 ? Math.round((correct / questions.length) * 10) : 10;
    setCorrectTestCount(correct);
    setTestScore(finalScore);
    setIsTestSubmitted(true);

    if (onSaveProgress) {
      onSaveProgress({
        activeSubTab: 'self-eval',
        testAnswers,
        isTestSubmitted: true,
        testScore: finalScore,
        correctTestCount: correct,
        selfRatings,
        selfReflectionNote,
        isSelfEvalSubmitted
      });
    }
  };

  // Submit self-evaluation
  const handleSubmitSelfEval = () => {
    setIsSelfEvalSubmitted(true);
    if (onSaveProgress) {
      onSaveProgress({
        activeSubTab: 'self-eval',
        testAnswers,
        isTestSubmitted: true,
        testScore,
        correctTestCount,
        selfRatings,
        selfReflectionNote,
        isSelfEvalSubmitted: true,
        isCompleted: true
      });
    }
    onNavigateToNext();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            5
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Đánh Giá Năng Lực Học Sinh (Assessment)
            </h3>
            <p className="text-xs text-slate-500">
              Gồm 2 phần: Bài kiểm tra năng lực & Tự đánh giá mức độ đạt được
            </p>
          </div>
        </div>

        {/* 2 SUB TABS */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto justify-center">
          <button
            onClick={() => setActiveSubTab('test')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'test'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>1. Đánh giá bài học</span>
          </button>

          <button
            onClick={() => setActiveSubTab('self-eval')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'self-eval'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>2. Tự đánh giá</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BÀI KIỂM TRA ĐÁNH GIÁ NĂNG LỰC */}
      {activeSubTab === 'test' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                Phần 1: Bộ câu hỏi kiểm tra năng lực cuối bài ({questions.length} câu)
              </span>
              {isTestSubmitted && (
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  Điểm: {testScore}/10 ({correctTestCount}/{questions.length} câu đúng)
                </span>
              )}
            </div>

            <div className="space-y-6">
              {questions.map((q, qIdx) => {
                const selectedAns = testAnswers[q.id];
                const isCorrect = selectedAns === (q.correctAnswer || 'A');

                return (
                  <div key={q.id || qIdx} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-lg">
                        Câu {qIdx + 1} ({getQuestionTypeLabel(q.type || 'multiple_choice')})
                      </span>
                      {isTestSubmitted && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          <span>{isCorrect ? 'Đúng' : 'Chưa đúng'}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 leading-relaxed">{q.content}</p>

                    {q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const optLetter = String.fromCharCode(65 + optIdx);
                          const isSelected = selectedAns === optLetter;
                          let btnStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50/40';

                          if (isTestSubmitted) {
                            if (optLetter === (q.correctAnswer || 'A')) {
                              btnStyle = 'bg-emerald-600 border-emerald-600 text-white font-bold';
                            } else if (isSelected && !isCorrect) {
                              btnStyle = 'bg-rose-600 border-rose-600 text-white font-bold';
                            }
                          } else if (isSelected) {
                            btnStyle = 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20';
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={isTestSubmitted}
                              onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: optLetter }))}
                              className={`p-3.5 rounded-2xl text-left border text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer ${btnStyle}`}
                            >
                              <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                                isSelected || (isTestSubmitted && optLetter === (q.correctAnswer || 'A'))
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {optLetter}
                              </span>
                              <span className="flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {isTestSubmitted && q.explanation && (
                      <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl text-xs text-indigo-950">
                        <strong className="font-extrabold text-indigo-800 block mb-0.5">💡 Giải thích:</strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-2">
              {!isTestSubmitted ? (
                <button
                  onClick={handleGradeTest}
                  className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Nộp bài & Chấm điểm</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsTestSubmitted(false);
                    setTestAnswers({});
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm lại bài kiểm tra</span>
                </button>
              )}

              <button
                onClick={() => setActiveSubTab('self-eval')}
                className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Tiếp tục sang Phần 2: Tự đánh giá</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TỰ ĐÁNH GIÁ (SELF-ASSESSMENT RUBRICS) */}
      {activeSubTab === 'self-eval' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                Phần 2: Tự đánh giá mức độ đạt được theo các tiêu chí ({criteria.length} tiêu chí)
              </span>
              <button
                onClick={() => setActiveSubTab('test')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold underline cursor-pointer"
              >
                ← Xem lại bài kiểm tra
              </button>
            </div>

            {/* CRITERIA LIST */}
            <div className="space-y-4">
              {criteria.map((crit, cIdx) => {
                const currentVal = selfRatings[crit.id] || 'tot';

                return (
                  <div key={crit.id || cIdx} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">{crit.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{crit.description}</p>
                      </div>

                      {/* 3 LEVEL BUTTONS */}
                      <div className="flex items-center gap-2 pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => setSelfRatings(prev => ({ ...prev, [crit.id]: 'tot' }))}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            currentVal === 'tot'
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>🌟 Tốt</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelfRatings(prev => ({ ...prev, [crit.id]: 'dat' }))}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            currentVal === 'dat'
                              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>👍 Đạt</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelfRatings(prev => ({ ...prev, [crit.id]: 'co_gang' }))}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            currentVal === 'co_gang'
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>💪 Cố gắng</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* REFLECTION TEXT */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-800">
                Ghi chú tự nhận xét / Cảm nghĩ sau bài học:
              </label>
              <textarea
                rows={3}
                value={selfReflectionNote}
                onChange={(e) => setSelfReflectionNote(e.target.value)}
                placeholder="Nêu cảm nghĩ, điều em thích nhất hoặc điều em muốn tìm hiểu thêm..."
                className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* SUBMIT */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmitSelfEval}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Award className="w-4 h-4" />
                <span>Hoàn tất Đánh giá & Xem Nhận xét Tổng kết</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
