const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

const modalCode = `
      {/* Create Quizzi Modal */}
      {showCreateQuizziModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 flex items-start justify-between relative">
              <div className="flex items-start gap-4 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0 border border-white/20">
                  <Link2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-heading tracking-wide">Tạo trò chơi Quizzi (Nhúng Liên kết)</h3>
                  <p className="text-indigo-100 text-sm mt-1">
                    Hỗ trợ liên kết Wordwall, Quizizz, Kahoot, Google Forms, v.v.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateQuizziModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-bold text-teal-700">
                  <Gamepad2 className="w-4 h-4" /> Tên trò chơi <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Đấu trường ô chữ ôn tập Tin học lớp 3..." 
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <BookOpen className="w-4 h-4" /> Mô tả ngắn
                </label>
                <input 
                  type="text" 
                  placeholder="Nhập mô tả hoặc hướng dẫn cách chơi cho các em..." 
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-800">
                    Khối lớp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                      <option>Khối 3</option>
                      <option>Khối 4</option>
                      <option>Khối 5</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-800">
                    Lớp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                      <option>Lớp 3A</option>
                      <option>Lớp 3B</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-800">
                    Môn học <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                      <option>Tin học</option>
                      <option>Toán học</option>
                      <option>Tiếng Việt</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-bold text-indigo-600">
                  <Link2 className="w-4 h-4" /> LINK TRÒ CHƠI (IFRAME/URL) <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows={3}
                  placeholder="Dán URL trò chơi hoặc dán toàn bộ đoạn mã nhúng iframe vào đây..." 
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                ></textarea>
                <p className="text-xs text-slate-400 font-medium leading-relaxed flex gap-1 items-start mt-1.5">
                  <span className="shrink-0">💡</span>
                  <span>Hệ thống sẽ tự động bóc tách đường dẫn sạch từ đoạn mã nhúng '&lt;iframe src="..."&gt;' của Wordwall, Kahoot, Quizizz, v.v.</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-5 flex items-center justify-center sm:justify-end gap-3 rounded-b-3xl">
              <button 
                onClick={() => setShowCreateQuizziModal(false)}
                className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => setShowCreateQuizziModal(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Xác nhận tạo
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  '    </div>\n  );\n};',
  modalCode + '\n    </div>\n  );\n};'
);

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
