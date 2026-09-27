const fs = require('fs');
let content = fs.readFileSync('src/components/modules/QuestionBankModule.tsx', 'utf8');

const missingCode = `
          <select
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value);
              setLessonFilter('all');
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium cursor-pointer"
          >
            <option value="Tất cả các khối">Tất cả các khối</option>
            {GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
          </select>
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setLessonFilter('all');
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium cursor-pointer"
          >
            <option value="Tất cả các môn">Tất cả các môn</option>
            {SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
          </select>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium cursor-pointer"
          >
            <option value="all">Tất cả mức độ</option>
            <option value="nhan_biet">Nhận biết</option>
            <option value="thong_hieu">Thông hiểu</option>
            <option value="van_dung">Vận dụng</option>
            <option value="van_dung_cao">Vận dụng cao</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium cursor-pointer"
          >
            <option value="all">Tất cả Loại câu hỏi</option>
            <option value="multiple_choice">Trắc nghiệm</option>
            <option value="true_false">Đúng / Sai</option>
            <option value="matching">Nối cặp</option>
            <option value="fill_blank">Điền khuyết</option>
            <option value="essay">Tự luận</option>
          </select>
        </div>
      </div>

      {/* Question List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Mã / Thông tin</th>
                <th className="px-4 py-3 font-bold">Nội dung câu hỏi</th>
                <th className="px-4 py-3 font-bold">Đáp án & Giải thích</th>
                <th className="px-4 py-3 font-bold text-center w-20">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuestions.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="font-bold text-xs text-slate-900">{q.code}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{q.subject} - {q.grade}</div>
                    <div className="mt-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      {q.level === 'nhan_biet' ? 'Nhận biết' : q.level === 'thong_hieu' ? 'Thông hiểu' : q.level === 'van_dung' ? 'Vận dụng' : 'VD Cao'}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-xs font-medium text-slate-800 line-clamp-2">{q.content}</div>
                    {q.options && (
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className="text-[11px] text-slate-600 truncate flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px]">{opt.charAt(0)}</span>
                            {opt.substring(3)}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-fit">
                      ĐA: {q.correctAnswer}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                      {q.explanation}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs font-medium">
                    Không tìm thấy câu hỏi nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Modal AI Question Generation */}
    {isModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Tạo câu hỏi sư phạm bằng AI</h3>
                <p className="text-xs font-medium text-slate-500">Tự động phân tách và chuẩn hóa học liệu</p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveQuickTab(1)}
                className={\`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer \${
                  activeQuickTab === 1 ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }\`}
              >
                1. CẤU HÌNH NHANH
              </button>
              <button
                onClick={() => setActiveQuickTab(2)}
                className={\`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer \${
                  activeQuickTab === 2 ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }\`}
              >
                2. NGUỒN DỮ LIỆU
              </button>
            </div>

            {/* TAB 1: CẤU HÌNH NHANH */}
            {activeQuickTab === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Khối lớp</label>
                    <select
                      value={quickGrade}
                      onChange={(e) => setQuickGrade(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      {GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Môn học</label>
                    <select
                      value={quickSubject}
                      onChange={(e) => setQuickSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      {SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                    </select>
`;

const replaceRegex = /<select\s*value=\{quickSubject\}\s*onChange=\{\(e\) => setQuickSubject\(e\.target\.value\)\}\s*className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 font-medium cursor-pointer"\s*>\s*\{SUBJECTS\.map\(subject => <option key=\{subject\} value=\{subject\}>\{subject\}<\/option>\)\}\s*<\/select>/;

if (content.match(replaceRegex)) {
  content = content.replace(replaceRegex, missingCode);
  fs.writeFileSync('src/components/modules/QuestionBankModule.tsx', content);
  console.log("Restored missing lines successfully!");
} else {
  console.log("Could not find the target to replace.");
}

