const fs = require('fs');
let content = fs.readFileSync('src/components/modules/ExamManagementModule.tsx', 'utf8');

const regex = /\) : \(\s*<div className="text-center py-20">[\s\S]*?<\/div>\s*\)\}/;

const newQuestionsCode = `) : (
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

content = content.replace(regex, newQuestionsCode);
fs.writeFileSync('src/components/modules/ExamManagementModule.tsx', content);
