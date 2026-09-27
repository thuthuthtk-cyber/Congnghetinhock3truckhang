const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

// 1. Add filter states
content = content.replace(
  'const [toastMessage, setToastMessage] = useState<string | null>(null);',
  `const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Filter States
  const [filterGrade, setFilterGrade] = useState('Tất cả khối');
  const [filterClass, setFilterClass] = useState('Tất cả Lớp');
  const [filterSubject, setFilterSubject] = useState('Tất cả Môn');
  const [filterType, setFilterType] = useState('Tất cả Loại');

  const QUIZZI_GAMES = [
    { id: 1, subject: 'CÔNG NGHỆ', subjectLabel: 'Công nghệ', title: 'sử dụng máy thu thanh', desc: 'Trò chơi tương tác môn Công nghệ dành cho học sinh Khối 3 (Lớp 3A)', grade: 'Khối 3', classInfo: 'Lớp 3A', icon: 'Laptop', color: 'sky', type: 'Tương tác' },
    { id: 2, subject: 'TIẾNG VIỆT', subjectLabel: 'Tiếng Việt', title: 'Ôn tập từ chỉ sự vật', desc: 'Trắc nghiệm nhanh củng cố kiến thức Luyện từ và câu Tuần 4', grade: 'Khối 2', classInfo: 'Lớp 2B', icon: 'BookOpen', color: 'emerald', type: 'Trắc nghiệm' },
    { id: 3, subject: 'TOÁN HỌC', subjectLabel: 'Toán Học', title: 'Bảng nhân 7, chia 7', desc: 'Đấu trường nhẩm toán siêu tốc dành cho học sinh.', grade: 'Khối 3', classInfo: 'Tất cả Lớp', icon: 'Layers', color: 'amber', type: 'Nhẩm toán' },
  ];

  const filteredGames = QUIZZI_GAMES.filter(g => {
    if (filterGrade !== 'Tất cả khối' && g.grade !== filterGrade) return false;
    if (filterClass !== 'Tất cả Lớp' && g.classInfo !== filterClass) return false;
    if (filterSubject !== 'Tất cả Môn' && g.subjectLabel !== filterSubject) return false;
    if (filterType !== 'Tất cả Loại' && g.type !== filterType) return false;
    return true;
  });`
);

// 2. Replace the filter dropdowns in "Right Column: DANH SÁCH TRÒ CHƠI QUIZZI"
const filterUIRight = `                {/* Filters container */}
                <div className="border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-4 bg-white">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Khối:</span>
                    <div className="relative">
                      <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 appearance-none pr-6 outline-none cursor-pointer">
                        <option value="Tất cả khối">Tất cả khối</option>
                        <option value="Khối 1">Khối 1</option>
                        <option value="Khối 2">Khối 2</option>
                        <option value="Khối 3">Khối 3</option>
                        <option value="Khối 4">Khối 4</option>
                        <option value="Khối 5">Khối 5</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Lớp:</span>
                    <div className="relative">
                      <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 appearance-none pr-6 outline-none cursor-pointer">
                        <option value="Tất cả Lớp">Tất cả Lớp</option>
                        <option value="Lớp 1A">Lớp 1A</option>
                        <option value="Lớp 1B">Lớp 1B</option>
                        <option value="Lớp 2A">Lớp 2A</option>
                        <option value="Lớp 2B">Lớp 2B</option>
                        <option value="Lớp 3A">Lớp 3A</option>
                        <option value="Lớp 3B">Lớp 3B</option>
                        <option value="Lớp 4A">Lớp 4A</option>
                        <option value="Lớp 5A">Lớp 5A</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Môn học:</span>
                    <div className="relative flex-1 sm:flex-none">
                      <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 appearance-none pr-6 outline-none cursor-pointer">
                        <option value="Tất cả Môn">Tất cả Môn</option>
                        <option value="Toán Học">Toán Học</option>
                        <option value="Tiếng Việt">Tiếng Việt</option>
                        <option value="Tự nhiên và Xã hội">Tự nhiên và Xã hội</option>
                        <option value="Công nghệ">Công nghệ</option>
                        <option value="Tin học">Tin học</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Loại:</span>
                    <div className="relative flex-1 sm:flex-none">
                      <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 appearance-none pr-6 outline-none cursor-pointer">
                        <option value="Tất cả Loại">Tất cả Loại</option>
                        <option value="Trắc nghiệm">Trắc nghiệm</option>
                        <option value="Tương tác">Tương tác</option>
                        <option value="Nhẩm toán">Nhẩm toán</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>`;

const rightFilterMatch = content.match(/{\/\* Filters container \*\/}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div className="p-5 flex-1 overflow-auto bg-slate-50\/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 content-start">/);
if (rightFilterMatch) {
  content = content.replace(rightFilterMatch[0], filterUIRight + '\n              </div>\n              <div className="p-5 flex-1 overflow-auto bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 content-start">');
}

const listRenderUI = `
                {filteredGames.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <Search className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-sm font-bold">Không tìm thấy trò chơi nào khớp bộ lọc</p>
                  </div>
                ) : (
                  filteredGames.map(game => {
                    if (deletedCards.includes(game.id)) return null;
                    const IconComponent = game.icon === 'Laptop' ? Laptop : game.icon === 'BookOpen' ? BookOpen : Layers;
                    return (
                      <div key={game.id} className={\`bg-white border border-\${game.color}-100 rounded-xl p-4 shadow-sm hover:shadow transition-shadow relative flex flex-col h-full\`}>
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          <button onClick={() => setShowEditQuizziModal(true)} className="text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteCard(game.id)} className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        
                        <div className={\`inline-flex items-center gap-1.5 px-2.5 py-1 bg-\${game.color}-100 text-\${game.color}-700 rounded-full text-[10px] font-black uppercase mb-3 w-fit\`}>
                          <IconComponent className="w-3 h-3" /> {game.subject}
                        </div>
                        
                        <h4 className="text-sm font-bold text-slate-800 mb-2 pr-12 leading-tight">{game.title}</h4>
                        
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed pr-8 flex-1">
                          {game.desc}
                        </p>
                        
                        <div className="flex items-center gap-2 mb-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold">
                            <span className="text-base leading-none -mt-0.5">🏫</span> {game.grade}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-bold">
                            <span className="text-base leading-none -mt-0.5">📕</span> Lớp: {game.classInfo === 'Tất cả Lớp' ? 'Tất cả' : game.classInfo.replace('Lớp ', '')}
                          </span>
                        </div>
                        
                        <button className={\`w-full flex items-center justify-center gap-2 py-2 bg-\${game.color}-600 hover:bg-\${game.color}-700 text-white rounded-lg text-xs font-bold transition-colors mt-auto\`}>
                          <Play className="w-3.5 h-3.5 fill-current" /> Trải nghiệm <Gamepad2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
`;

let contentParts = content.split('<div className="p-5 flex-1 overflow-auto bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 content-start">');
if (contentParts.length === 2) {
  let innerSplit = contentParts[1].split('              </div>\n            </div>\n          </div>');
  content = contentParts[0] + '<div className="p-5 flex-1 overflow-auto bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 content-start">\n' + listRenderUI + '\n              </div>\n            </div>\n          </div>' + innerSplit[1];
}

if (!content.includes('Search,')) {
  content = content.replace('Users, CheckCircle2', 'Users, CheckCircle2, Search, Activity');
}

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
