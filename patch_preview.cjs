const fs = require('fs');
let content = fs.readFileSync('src/components/modules/ExamManagementModule.tsx', 'utf8');

content = content.replace(
  "const [editingExamTab, setEditingExamTab] = useState<'config' | 'questions'>('config');",
  "const [editingExamTab, setEditingExamTab] = useState<'config' | 'questions' | 'preview'>('questions');"
);

// Find the start of the `if (editingExam)` block
const startIdx = content.indexOf('  if (editingExam) {\n    return (');
if (startIdx === -1) {
  console.error("Could not find start");
  process.exit(1);
}

// Find the end of it by matching the closing brace before the E-Learning Media Modal or before the main return.
const endStr = '      </div>\n    );\n  }';
const endIdx = content.indexOf(endStr, startIdx);
if (endIdx === -1) {
  console.error("Could not find end");
  process.exit(1);
}

const newBlock = `  if (editingExam) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-50 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-inner">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-800">Sửa nội dung đề kiểm tra</h2>
                  <span className="px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 bg-indigo-50 text-[10px] font-black uppercase tracking-wider">EXAM EDITOR</span>
                </div>
                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-slate-700">Đề thi:</span> {editingExam.title} 
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-slate-600">{editingExam.subject}</span>
                  <span className="text-slate-600">Khối 3</span>
                  <span className="text-slate-600">{editingExam.durationMinutes} phút</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {editingExamTab !== 'preview' ? (
                <button 
                  onClick={() => setEditingExamTab('preview')}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-sm font-bold transition-colors border border-slate-200 bg-white"
                >
                  <Eye className="w-4 h-4" /> Xem trước đề
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setEditingExamTab('questions')}
                    className="flex items-center gap-2 px-4 py-2 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl text-sm font-bold transition-colors border border-amber-200"
                  >
                    <Edit3 className="w-4 h-4" /> Quay lại sửa đề
                  </button>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-sm font-bold transition-colors border border-indigo-200"
                  >
                    <Download className="w-4 h-4" /> Tải đề
                  </button>
                </>
              )}
              <button 
                onClick={() => { setEditingExam(null); setEditingExamTab('questions'); }}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                Lưu toàn bộ & Đóng <Save className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setEditingExam(null); setEditingExamTab('questions'); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-slate-50 relative">
            {editingExamTab === 'preview' ? (
              <div className="p-6 pb-20 max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500"></div>
                  
                  {/* Header of paper */}
                  <div className="text-center mb-8">
                    <h3 className="text-sm font-bold text-indigo-600 mb-2 uppercase tracking-widest">Hệ thống giáo dục thông minh EduPlay</h3>
                    <h1 className="text-2xl font-black text-slate-800 uppercase mb-3">Đề kiểm tra thường xuyên chất lượng cao</h1>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-600">
                      <span><span className="font-bold text-slate-700">Bài thi:</span> {editingExam.title}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span><span className="font-bold text-slate-700">Môn:</span> {editingExam.subject}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span><span className="font-bold text-slate-700">Dành cho:</span> {editingExam.grade}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span><span className="font-bold text-slate-700">Thời lượng:</span> {editingExam.durationMinutes} Phút</span>
                    </div>
                  </div>

                  {/* Student Info Box */}
                  <div className="border border-slate-300 rounded-2xl p-6 mb-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700">Họ và tên học sinh:</span>
                        <div className="border-b-2 border-dotted border-slate-300 h-6"></div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700">Lớp:</span>
                        <div className="border-b-2 border-dotted border-slate-300 h-6"></div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700">Mã số học sinh:</span>
                        <div className="border-b-2 border-dotted border-slate-300 h-6"></div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700">Phòng thi:</span>
                        <div className="border-b-2 border-dotted border-slate-300 h-6"></div>
                      </div>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-8">
                    {editedQuestions.map((q, idx) => (
                      <div key={q.id}>
                        <div className="flex items-start gap-3 mb-4">
                          <div className="px-2 py-0.5 bg-slate-800 text-white text-sm font-bold rounded-lg shrink-0 mt-0.5">
                            Câu {idx + 1}
                          </div>
                          <div className="text-[15px] font-semibold text-slate-800 leading-relaxed">
                            <span className="text-indigo-600 font-bold mr-1">
                              [{q.type === 'multiple_choice' ? 'Trắc nghiệm' : q.type === 'multiple_response' ? 'Chọn nhiều' : 'Tự luận'} - 2 điểm]
                            </span>
                            {q.content}
                          </div>
                        </div>

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-[3.25rem]">
                            {q.options.map((opt, oIdx) => {
                              const letters = ['A', 'B', 'C', 'D', 'E'];
                              const letter = letters[oIdx] || String.fromCharCode(65 + oIdx);
                              const isCorrect = q.correctAnswer === letter || (idx === 0 && oIdx === 1) || (idx === 1 && oIdx === 2); // mock selection based on images
                              
                              return (
                                <div 
                                  key={oIdx} 
                                  className={\`relative px-4 py-3 rounded-xl border-2 flex items-center gap-3 \${isCorrect ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-white'}\`}
                                >
                                  <div className={\`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 \${isCorrect ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}\`}>
                                    {letter}
                                  </div>
                                  <span className={\`text-[15px] font-medium \${isCorrect ? 'text-emerald-900 font-bold' : 'text-slate-700'}\`}>{opt}</span>
                                  
                                  {isCorrect && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Đáp án đúng</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {!q.options && (
                           <div className="pl-[3.25rem] mt-4">
                             <div className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50"></div>
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 pb-24 max-w-5xl mx-auto">
                {/* Info Alert */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 mb-6">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 mb-1">Chỉnh sửa nhanh & Trực tiếp:</h4>
                    <p className="text-xs font-medium text-indigo-700 leading-relaxed">
                      Thầy/Cô có thể nhấp chuột trực tiếp vào bất kỳ ô nhập liệu nào dưới đây để thay đổi đề thi. Thay đổi sẽ được lưu vào hệ thống khi thầy cô bấm "Lưu toàn bộ & Đóng".
                    </p>
                  </div>
                </div>

                {/* List Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">DANH SÁCH CÂU HỎI CỦA ĐỀ ({editedQuestions.length} CÂU)</h3>
                  <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                    Tổng số điểm: 20 điểm
                  </div>
                </div>

                <div className="space-y-6">
                  {editedQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      {/* Header Question */}
                      <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">DẠNG BÀI:</span>
                            <div className="relative">
                              <select 
                                className="appearance-none bg-white border border-slate-200 rounded-full px-3 py-1 pr-8 text-xs font-bold text-rose-600 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-50"
                                defaultValue={q.type}
                              >
                                <option value="multiple_choice">Trắc nghiệm 1 đáp án</option>
                                <option value="multiple_response">Chọn nhiều đáp án</option>
                                <option value="essay">Tự luận</option>
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-rose-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600">Điểm số:</span>
                            <input type="number" defaultValue="2" className="w-16 text-center border border-slate-200 rounded-lg py-1 text-sm font-bold text-slate-700" />
                          </div>
                          <button className="text-slate-400 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Body Question */}
                      <div className="p-5">
                        <div className="mb-5">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                            Nội dung câu hỏi {idx + 1}
                          </label>
                          <textarea
                            defaultValue={q.content}
                            rows={2}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 resize-y"
                          />
                        </div>

                        {q.options && q.options.length > 0 && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">
                              Các phương án trả lời & Chọn đáp án đúng <span className="text-slate-400 normal-case">(Bấm tích tròn bên trái chữ cái để đặt đáp án đúng)</span>:
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              {q.options.map((opt, oIdx) => {
                                const letters = ['A', 'B', 'C', 'D', 'E'];
                                const letter = letters[oIdx] || String.fromCharCode(65 + oIdx);
                                const isCorrect = q.correctAnswer === letter || (idx === 0 && oIdx === 1) || (idx === 1 && oIdx === 2); // mock selection based on images
                                
                                return (
                                  <div key={oIdx} className={\`flex items-center border rounded-xl overflow-hidden transition-colors \${isCorrect ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-white focus-within:border-indigo-300'}\`}>
                                    <button className={\`w-12 shrink-0 flex items-center justify-center self-stretch transition-colors \${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-r border-slate-200'}\`}>
                                      {isCorrect ? <Check className="w-5 h-5" /> : <span className="font-bold">{letter}</span>}
                                    </button>
                                    <input 
                                      type="text" 
                                      defaultValue={opt} 
                                      className="flex-1 px-3 py-2.5 text-sm font-medium text-slate-700 bg-transparent focus:outline-none"
                                    />
                                    <button className="p-2.5 text-slate-300 hover:text-rose-500 transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                              <Plus className="w-3.5 h-3.5" /> Thêm phương án
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Fixed Footer for Editor */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40 flex items-center justify-between rounded-b-3xl">
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">
                        <Plus className="w-4 h-4" /> Thêm câu hỏi
                      </button>
                      <button 
                        onClick={() => setShowMediaModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" /> <Volume2 className="w-4 h-4 -ml-1" /> Chèn hình ảnh & Âm thanh
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setEditingExam(null)}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                      >
                        Hủy bỏ
                      </button>
                      <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors">
                        Lưu toàn bộ & Đóng <Save className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }`;

content = content.substring(0, startIdx) + newBlock + content.substring(endIdx + endStr.length);
fs.writeFileSync('src/components/modules/ExamManagementModule.tsx', content);
