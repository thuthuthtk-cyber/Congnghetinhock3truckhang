const fs = require('fs');
let content = fs.readFileSync('src/components/modules/ExamManagementModule.tsx', 'utf8');

content = content.replace(
  "const [editingExamTab, setEditingExamTab] = useState<'config' | 'questions'>('config');",
  "const [editingExamTab, setEditingExamTab] = useState<'config' | 'questions'>('config');\n  const [showMediaModal, setShowMediaModal] = useState(false);\n  const [hideMediaPreview, setHideMediaPreview] = useState(false);"
);

const emptyStateRegex = /<\? \(\n\s*<div className="text-center py-20">[\s\S]*?<\/div>\n\s*\)}/;
// wait, easier to just split by exact strings.

const startStr = `            ) : (\n              <div className="text-center py-20">\n                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">\n                  <FileQuestion className="w-8 h-8" />\n                </div>\n                <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có câu hỏi nào được chọn</h3>\n                <p className="text-slate-500 mb-6">Hãy thêm câu hỏi từ ngân hàng hoặc tạo mới.</p>\n                <button className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors">\n                  + Thêm câu hỏi\n                </button>\n              </div>\n            )}`;

const newQuestionsCode = `            ) : (
              <div className="space-y-6 pb-24">
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
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40 flex items-center justify-between">
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
            )}`;

content = content.replace(startStr, newQuestionsCode);

// Add the modal HTML just before the last closing div of the `if (editingExam)` block.
const modalHtml = `
      {/* E-Learning Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-scale-up border border-slate-200">
            {/* Modal Header */}
            <div className="bg-[#1e1b4b] p-6 text-white relative">
              <button 
                onClick={() => setShowMediaModal(false)}
                className="absolute top-6 right-6 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center shrink-0 border border-indigo-400/30">
                  <ImageIcon className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">Thêm đa phương tiện</h3>
                    <span className="px-2 py-0.5 rounded border border-indigo-400/30 bg-indigo-500/20 text-[10px] font-black uppercase tracking-wider text-indigo-200">E-Learning Media</span>
                  </div>
                  <p className="text-indigo-200/80 text-sm">Tải lên tệp đa phương tiện, đường dẫn hình ảnh & lời dẫn cho câu hỏi để kiểm tra</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 bg-white">
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 px-3 text-indigo-600 font-bold text-sm shrink-0">
                  <Sparkles className="w-4 h-4" /> Chọn câu hỏi cần áp dụng:
                </div>
                <div className="relative flex-1">
                  <select className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50">
                    <option>Tất cả các câu hỏi trong đề (10 câu)</option>
                    <option>Câu 1: Đâu là sản phẩm công nghệ...</option>
                    <option>Câu 2: Các bộ phận chính của...</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-3">
                  1. Tải tệp đa phương tiện (Hình ảnh / Âm thanh)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-indigo-600 mb-1">Nhấp để tải tệp lên <span className="text-slate-500 font-medium">hoặc kéo thả tệp vào đây</span></p>
                  <p className="text-xs text-slate-400">Hỗ trợ các định dạng tệp: PNG, JPG, GIF, MP3, WAV (Tối đa 10MB)</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <ImageIcon className="w-4 h-4 text-indigo-500" /> KHU VỰC HÌNH ẢNH & LỜI DẪN CÂU HỎI
                  </div>
                  <button 
                    onClick={() => setHideMediaPreview(!hideMediaPreview)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <div className={\`w-2 h-2 rounded-full \${hideMediaPreview ? 'bg-rose-500' : 'bg-emerald-500'}\`}></div>
                    {hideMediaPreview ? 'Hiện khu vực hình ảnh' : 'Ẩn khu vực hình ảnh'}
                  </button>
                </div>
                
                {!hideMediaPreview && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Đường dẫn hình ảnh / Media (Nếu có)</label>
                      <input 
                        type="text" 
                        placeholder="Dán link kết URL hình ảnh online (https://...)" 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 mb-2"
                      />
                      <p className="text-[10px] text-slate-400 italic leading-relaxed">
                        Dán link từ Google Drive, Dropbox, Cloudinary hoặc máy chủ ảnh khác.
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Nội dung mô tả hình ảnh / Lời dẫn</label>
                      <textarea 
                        rows={3}
                        placeholder="Soạn kịch bản, lời dẫn hoặc gợi ý hình ảnh cho học sinh (kéo giãn linh hoạt)..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 resize-y"
                      ></textarea>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-3xl">
              <button 
                onClick={() => setShowMediaModal(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => setShowMediaModal(false)}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <Upload className="w-4 h-4" /> Xác nhận & Tải lên
              </button>
            </div>
          </div>
        </div>
      )}
`;

// Insert the modalHtml before the final closing </div> of the editingExam return.
const closingDivIdx = content.lastIndexOf('</div>\n    );\n  }');
if (closingDivIdx !== -1) {
  content = content.substring(0, closingDivIdx) + modalHtml + content.substring(closingDivIdx);
} else {
  // Try another way to match
  const match = content.match(/<\/div>\s*<\/div>\s*<\/div>\s*\);\s*}/);
  if (match) {
    content = content.replace(match[0], modalHtml + match[0]);
  } else {
    console.error("Could not find closing div");
    process.exit(1);
  }
}

fs.writeFileSync('src/components/modules/ExamManagementModule.tsx', content);
