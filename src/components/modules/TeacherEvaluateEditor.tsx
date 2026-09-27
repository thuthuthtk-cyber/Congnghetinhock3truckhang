import React, { useState } from 'react';
import { Sparkles, FileText, Image as ImageIcon, CheckSquare, Award, Layers } from 'lucide-react';
import { QuestionItem } from '../../types';
import { TeacherQuestionsListEditor } from './TeacherQuestionsListEditor';

interface TeacherEvaluateEditorProps {
  initialObjective?: string;
  initialTeacherActivities?: string;
  initialMaterials?: string;
  initialQuestions?: QuestionItem[];
  initialStudentActivities?: string;
  initialRequireAttachment?: boolean;
  initialCongratMessage?: string;
  questionsBank: QuestionItem[];
  defaultSubject?: string;
  defaultGrade?: string;
  onObjectiveChange: (val: string) => void;
  onTeacherActivitiesChange: (val: string) => void;
  onMaterialsChange: (val: string) => void;
  onQuestionsChange: (questions: QuestionItem[]) => void;
  onStudentActivitiesChange: (val: string) => void;
  onRequireAttachmentChange: (val: boolean) => void;
  onCongratMessageChange: (val: string) => void;
}

export const TeacherEvaluateEditor: React.FC<TeacherEvaluateEditorProps> = ({
  initialObjective = 'Vận dụng kiến thức vào thực tiễn đời sống và giải quyết vấn đề thực tế.',
  initialTeacherActivities = 'Giáo viên đưa ra tình huống thực tế và yêu cầu học sinh thảo luận, giải quyết vấn đề.',
  initialMaterials = '',
  initialQuestions = [],
  initialStudentActivities = 'Học sinh viết báo cáo thu hoạch ngắn gọn kết quả vận dụng kiến thức.',
  initialRequireAttachment = true,
  initialCongratMessage = 'Chúc mừng các em đã hoàn thành xuất sắc bài học!',
  questionsBank,
  defaultSubject = 'Tin học',
  defaultGrade = 'Khối 3',
  onObjectiveChange,
  onTeacherActivitiesChange,
  onMaterialsChange,
  onQuestionsChange,
  onStudentActivitiesChange,
  onRequireAttachmentChange,
  onCongratMessageChange
}) => {
  const [subTab, setSubTab] = useState<'step1' | 'step2' | 'step3'>('step1');

  const [objective, setObjective] = useState(initialObjective);
  const [teacherActivities, setTeacherActivities] = useState(initialTeacherActivities);
  const [materials, setMaterials] = useState(initialMaterials);
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [studentActivities, setStudentActivities] = useState(initialStudentActivities);
  const [requireAttachment, setRequireAttachment] = useState(initialRequireAttachment);
  const [congratMessage, setCongratMessage] = useState(initialCongratMessage);

  const handleQuestionsChange = (updated: QuestionItem[]) => {
    setQuestions(updated);
    onQuestionsChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-teal-400 uppercase tracking-wide">
            CẤU HÌNH MỤC VẬN DỤNG (EVALUATE / APPLY)
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Xây dựng chuỗi 3 bước Vận dụng: Tình huống thực tế, Câu hỏi tương tác và Báo cáo thu hoạch.
          </p>
        </div>
      </div>

      {/* 3 SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-800 rounded-2xl border border-slate-700">
        <button
          type="button"
          onClick={() => setSubTab('step1')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'step1'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">1</span>
          <span>Bước 1: Tình huống thực tế</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('step2')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'step2'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">2</span>
          <span>Bước 2: Hướng giải quyết / Câu hỏi ({questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('step3')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'step3'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">3</span>
          <span>Bước 3: Báo cáo thu hoạch</span>
        </button>
      </div>

      {/* SUB-TAB 1: TÌNH HUỐNG THỰC TẾ */}
      {subTab === 'step1' && (
        <div className="space-y-4 p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center gap-2 text-teal-300 font-extrabold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Bước 1 — Tình huống thực tế & Bối cảnh</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tiêu đề tình huống / Mục tiêu vận dụng:</label>
              <input
                type="text"
                value={objective}
                onChange={(e) => {
                  setObjective(e.target.value);
                  onObjectiveChange(e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                placeholder="Ví dụ: Tình huống ứng dụng an toàn thông tin khi sử dụng Internet..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nội dung mô tả bối cảnh / Tình huống (Hỗ trợ định dạng văn bản):</label>
              <textarea
                rows={4}
                value={teacherActivities}
                onChange={(e) => {
                  setTeacherActivities(e.target.value);
                  onTeacherActivitiesChange(e.target.value);
                }}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white leading-relaxed focus:outline-none focus:border-teal-500"
                placeholder="Mô tả chi tiết tình huống thực tế để học sinh phân tích và giải quyết..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-teal-400" /> Đường dẫn Video / Hình ảnh minh họa (URL):
              </label>
              <input
                type="text"
                value={materials}
                onChange={(e) => {
                  setMaterials(e.target.value);
                  onMaterialsChange(e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                placeholder="Nhập link hình ảnh hoặc video minh họa tình huống..."
              />
            </div>

            {materials.trim() && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-2">
                <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider block">Khung xem trước media minh họa:</span>
                <div className="text-xs text-slate-300 break-all font-mono bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                  {materials}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: HƯỚNG GIẢI QUYẾT / CÂU HỎI TƯƠNG TÁC */}
      {subTab === 'step2' && (
        <div className="space-y-4 p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center gap-2 text-teal-300 font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Bước 2 — Hướng giải quyết / Câu hỏi tương tác</span>
          </div>
          <p className="text-xs text-slate-400">
            Soạn thảo danh sách câu hỏi vận dụng, lựa chọn phương án và thiết lập đáp án đúng cho học sinh.
          </p>

          <TeacherQuestionsListEditor
            title="DANH SÁCH CÂU HỎI VẬN DỤNG"
            questions={questions}
            questionsBank={questionsBank}
            onQuestionsChange={handleQuestionsChange}
            defaultSubject={defaultSubject}
            defaultGrade={defaultGrade}
            targetSection="apply"
            targetTitle="Thêm vào Vận dụng"
          />
        </div>
      )}

      {/* SUB-TAB 3: BÁO CÁO THU HOẠCH */}
      {subTab === 'step3' && (
        <div className="space-y-4 p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center gap-2 text-teal-300 font-extrabold text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>Bước 3 — Báo cáo thu hoạch & Tổng kết</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hướng dẫn / Yêu cầu viết báo cáo thu hoạch:</label>
              <textarea
                rows={4}
                value={studentActivities}
                onChange={(e) => {
                  setStudentActivities(e.target.value);
                  onStudentActivitiesChange(e.target.value);
                }}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white leading-relaxed focus:outline-none focus:border-teal-500"
                placeholder="Nhập yêu cầu học sinh trình bày kết quả thu hoạch..."
              />
            </div>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-between">
              <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={requireAttachment}
                  onChange={(e) => {
                    setRequireAttachment(e.target.checked);
                    onRequireAttachmentChange(e.target.checked);
                  }}
                  className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 bg-slate-800 border-slate-700"
                />
                <span className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-teal-400" />
                  <span>Yêu cầu học sinh đính kèm ảnh minh chứng / sản phẩm thực hành thực tế</span>
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Lời chúc mừng / Khen thưởng khi hoàn thành bài học:
              </label>
              <input
                type="text"
                value={congratMessage}
                onChange={(e) => {
                  setCongratMessage(e.target.value);
                  onCongratMessageChange(e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                placeholder="Ví dụ: Chúc mừng các em đã hoàn thành xuất sắc bài thực hành!"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
