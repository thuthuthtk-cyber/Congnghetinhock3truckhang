const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

// Replace imports
content = content.replace(
  "} from 'lucide-react';",
  "  HelpCircle,\n  Filter,\n  Users,\n  BookOpen,\n  Pencil,\n  Trash2,\n  Laptop,\n  Link2,\n  ChevronDown\n} from 'lucide-react';"
);

const lobbyStartIdx = content.indexOf('{gameMode === \'lobby\' && (');
const lobbyEndIdx = content.indexOf('      {/* PLAYING MODE */}');

if (lobbyStartIdx !== -1 && lobbyEndIdx !== -1) {
  const newLobby = `{gameMode === 'lobby' && (
        <div className="space-y-6">
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-teal-700 rounded-xl p-5 text-white flex flex-col justify-center relative overflow-hidden">
              <Gamepad2 className="w-20 h-20 absolute -right-4 -bottom-4 text-teal-800/50" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-teal-800/50 rounded-full flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-6 h-6 text-teal-100" />
                </div>
                <div>
                  <div className="text-3xl font-black">0</div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-teal-100 mt-0.5">PHÒNG THI ĐẤU ĐANG HOẠT ĐỘNG</div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-xl p-5 text-white flex flex-col justify-center relative overflow-hidden">
              <Zap className="w-20 h-20 absolute -right-4 -bottom-4 text-indigo-700/50" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-indigo-700/50 rounded-full flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-indigo-100" />
                </div>
                <div>
                  <div className="text-3xl font-black">25</div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-100 mt-0.5">TRÒ CHƠI QUIZZI CÁ NHÂN</div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-600 rounded-xl p-5 text-white flex flex-col justify-center relative overflow-hidden">
              <HelpCircle className="w-20 h-20 absolute -right-4 -bottom-4 text-emerald-700/50" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-emerald-700/50 rounded-full flex items-center justify-center shrink-0">
                  <HelpCircle className="w-6 h-6 text-emerald-100" />
                </div>
                <div>
                  <div className="text-3xl font-black">74</div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-100 mt-0.5">CÂU HỎI CÓ SẴN TỪ NGÂN HÀNG</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: DANH SÁCH PHÒNG THI ĐẤU */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-6 h-6 text-amber-500 mt-1 shrink-0" />
                    <div>
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">DANH SÁCH PHÒNG THI ĐẤU</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Quản lý các phòng đấu trường trực tuyến của học sinh</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shrink-0">
                    <Sparkles className="w-3.5 h-3.5" /> Tạo trò chơi từ ngân hàng câu hỏi
                  </button>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select className="bg-transparent appearance-none pr-4 outline-none">
                        <option>Tất cả</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <select className="bg-transparent appearance-none pr-4 outline-none">
                        <option>Tất cả Lớp</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <select className="bg-transparent appearance-none pr-4 outline-none">
                        <option>Tất cả Môn học</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                <Gamepad2 className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400 mb-2">Chưa có phòng thi đấu nào khớp bộ lọc</p>
                <button className="text-sm font-bold text-teal-600 hover:text-teal-700 hover:underline">Tạo phòng mới ngay</button>
              </div>
            </div>

            {/* Right Column: DANH SÁCH TRÒ CHƠI QUIZZI */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-6 h-6 text-amber-500 mt-1 shrink-0 fill-amber-500" />
                    <div>
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">DANH SÁCH TRÒ CHƠI QUIZZI</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Thư viện các trò chơi tương tác cá nhân của giáo viên</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors shrink-0">
                    <Link2 className="w-3.5 h-3.5" /> Tạo trò chơi Quizzi
                  </button>
                </div>

                {/* Filters container */}
                <div className="border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-4 bg-white">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Khối:</span>
                    <div className="relative">
                      <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 appearance-none pr-6 outline-none">
                        <option>Tất cả</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Lớp:</span>
                    <div className="relative">
                      <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 appearance-none pr-6 outline-none">
                        <option>Tất cả Lớp</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Môn học:</span>
                    <div className="relative flex-1 sm:flex-none">
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 appearance-none pr-6 outline-none">
                        <option>Tất cả Môn</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 overflow-auto bg-slate-50/50">
                {/* Sample Card */}
                <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm hover:shadow transition-shadow relative">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button className="text-slate-300 hover:text-indigo-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-[10px] font-black uppercase mb-3">
                    <Laptop className="w-3 h-3" /> CÔNG NGHỆ
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-800 mb-2 pr-12 leading-tight">sử dụng máy thu thanh</h4>
                  
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed pr-8">
                    Trò chơi tương tác môn Công nghệ dành cho học sinh Khối 3 (Lớp 3A)
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold">
                      <span className="text-base leading-none -mt-0.5">🏫</span> Khối 3
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-bold">
                      <span className="text-base leading-none -mt-0.5">📕</span> Lớp: Lớp 3A
                    </span>
                  </div>
                  
                  <button className="w-full flex items-center justify-center gap-2 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors">
                    <Play className="w-3.5 h-3.5 fill-current" /> Trải nghiệm <Gamepad2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING MODE */}`;
  
  content = content.substring(0, lobbyStartIdx) + newLobby + content.substring(lobbyEndIdx + 24);
  fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
  console.log("Successfully patched lobby mode");
} else {
  console.log("Could not find lobby mode block");
}
