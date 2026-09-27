const fs = require('fs');
let content = fs.readFileSync('src/components/modules/ExamManagementModule.tsx', 'utf8');

// Add new state for the editor tab
content = content.replace(
  "const [editedQuestions, setEditedQuestions] = useState<QuestionItem[]>([]);",
  "const [editedQuestions, setEditedQuestions] = useState<QuestionItem[]>([]);\n  const [editingExamTab, setEditingExamTab] = useState<'config' | 'questions'>('config');"
);

// We need to inject the full screen view before the main return statement.
const mainReturnIndex = content.indexOf('return (\n    <div className="space-y-6">');
if (mainReturnIndex === -1) {
  console.error("Could not find main return");
  process.exit(1);
}

const beforeReturn = content.substring(0, mainReturnIndex);
const afterReturn = content.substring(mainReturnIndex);

const fullViewHtml = `
  if (editingExam) {
    return (
      <div className="bg-slate-50 min-h-[calc(100vh-2rem)] flex flex-col rounded-3xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-xl">⛺</div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">Chỉnh sửa đề kiểm tra</h2>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-[10px] font-black uppercase">Hệ thống Quản lý đề thi</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => { setEditingExam(null); setEditingExamTab('config'); }}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold transition-colors border border-slate-200"
          >
            Đóng quay lại <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-6 shrink-0">
          <button
            onClick={() => setEditingExamTab('config')}
            className={\`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 \${editingExamTab === 'config' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
          >
            <Settings className="w-4 h-4" /> Cấu hình chung
          </button>
          <button
            onClick={() => setEditingExamTab('questions')}
            className={\`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 \${editingExamTab === 'questions' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
          >
            <FileQuestion className="w-4 h-4" /> Chọn câu hỏi từ ngân hàng
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">10</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            {editingExamTab === 'config' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Tiêu đề đề thi</label>
                  <input 
                    type="text" 
                    defaultValue={editingExam.title} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Khối</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="Khối 3">Khối 3</option>
                        <option value="Khối 4">Khối 4</option>
                        <option value="Khối 5">Khối 5</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Loại bài kiểm tra</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="Thường xuyên">Thường xuyên</option>
                        <option value="Định kì">Định kì</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Môn học giảng dạy</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="Công nghệ">Công nghệ</option>
                        <option value="Toán">Toán</option>
                        <option value="Tiếng Việt">Tiếng Việt</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Số câu</label>
                    <input 
                      type="number" 
                      defaultValue="10" 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Mức độ</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="all">Tất cả mức độ</option>
                        <option value="easy">Nhận biết</option>
                        <option value="medium">Thông hiểu</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Loại câu hỏi</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="all">Tất cả các dạng</option>
                        <option value="multiple_choice">Trắc nghiệm 1 đáp án</option>
                        <option value="multiple_response">Chọn nhiều đáp án đúng</option>
                        <option value="true_false">Câu hỏi Đúng/Sai</option>
                        <option value="essay">Điền khuyết / Ngắn</option>
                        <option value="sort">Sắp xếp thứ tự</option>
                        <option value="match">Nối cặp / Kéo thả</option>
                        <option value="classify">Phân loại</option>
                        <option value="free_text">Tự luận tự do</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Thời lượng làm bài (Phút)</label>
                    <input 
                      type="number" 
                      defaultValue={editingExam.durationMinutes} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileQuestion className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có câu hỏi nào được chọn</h3>
                <p className="text-slate-500 mb-6">Hãy thêm câu hỏi từ ngân hàng hoặc tạo mới.</p>
                <button className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors">
                  + Thêm câu hỏi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
`;

content = beforeReturn + fullViewHtml + '\n' + afterReturn;

// Remove the old Modal for Exam Editor.
// Find `{/* Exam Editor Modal */}`
const modalStartIndex = content.indexOf('{/* Exam Editor Modal */}');
if (modalStartIndex !== -1) {
  const modalEndStr = '          </div>\n        </div>\n      )}';
  const modalEndIndex = content.indexOf(modalEndStr, modalStartIndex);
  if (modalEndIndex !== -1) {
    content = content.substring(0, modalStartIndex) + content.substring(modalEndIndex + modalEndStr.length);
  }
}

fs.writeFileSync('src/components/modules/ExamManagementModule.tsx', content);
