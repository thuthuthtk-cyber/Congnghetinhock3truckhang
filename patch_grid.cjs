const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

const containerStart = content.indexOf('<div className="p-5 flex-1 overflow-auto bg-slate-50/50">');
const sectionEnd = content.indexOf('              </div>\n            </div>\n          </div>\n        </div>\n      )}\n\n      {/* PLAYING MODE */}');

if (containerStart !== -1 && sectionEnd !== -1) {
  const newContent = `<div className="p-5 flex-1 overflow-auto bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
                {/* Sample Card 1 */}
                <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm hover:shadow transition-shadow relative flex flex-col h-full">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button className="text-slate-300 hover:text-indigo-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-[10px] font-black uppercase mb-3 w-fit">
                    <Laptop className="w-3 h-3" /> CÔNG NGHỆ
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-800 mb-2 pr-12 leading-tight">sử dụng máy thu thanh</h4>
                  
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed pr-8 flex-1">
                    Trò chơi tương tác môn Công nghệ dành cho học sinh Khối 3 (Lớp 3A)
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold">
                      <span className="text-base leading-none -mt-0.5">🏫</span> Khối 3
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-bold">
                      <span className="text-base leading-none -mt-0.5">📕</span> Lớp: 3A
                    </span>
                  </div>
                  
                  <button className="w-full flex items-center justify-center gap-2 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors mt-auto">
                    <Play className="w-3.5 h-3.5 fill-current" /> Trải nghiệm <Gamepad2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sample Card 2 */}
                <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm hover:shadow transition-shadow relative flex flex-col h-full">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button className="text-slate-300 hover:text-indigo-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase mb-3 w-fit">
                    <BookOpen className="w-3 h-3" /> TIẾNG VIỆT
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-800 mb-2 pr-12 leading-tight">Ôn tập từ chỉ sự vật</h4>
                  
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed pr-8 flex-1">
                    Trắc nghiệm nhanh củng cố kiến thức Luyện từ và câu Tuần 4
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold">
                      <span className="text-base leading-none -mt-0.5">🏫</span> Khối 2
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-bold">
                      <span className="text-base leading-none -mt-0.5">📕</span> Lớp: 2B
                    </span>
                  </div>
                  
                  <button className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors mt-auto">
                    <Play className="w-3.5 h-3.5 fill-current" /> Trải nghiệm <Gamepad2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sample Card 3 */}
                <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm hover:shadow transition-shadow relative flex flex-col h-full">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button className="text-slate-300 hover:text-indigo-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase mb-3 w-fit">
                    <Layers className="w-3 h-3" /> TOÁN HỌC
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-800 mb-2 pr-12 leading-tight">Bảng nhân 7, chia 7</h4>
                  
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed pr-8 flex-1">
                    Đấu trường nhẩm toán siêu tốc dành cho học sinh.
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold">
                      <span className="text-base leading-none -mt-0.5">🏫</span> Khối 3
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-bold">
                      <span className="text-base leading-none -mt-0.5">📕</span> Lớp: Tất cả
                    </span>
                  </div>
                  
                  <button className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors mt-auto">
                    <Play className="w-3.5 h-3.5 fill-current" /> Trải nghiệm <Gamepad2 className="w-3.5 h-3.5" />
                  </button>
                </div>
`;
  
  content = content.substring(0, containerStart) + newContent + content.substring(sectionEnd);
  fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
  console.log("Successfully patched grid layout");
} else {
  console.log("Could not find grid container start or end index");
}
