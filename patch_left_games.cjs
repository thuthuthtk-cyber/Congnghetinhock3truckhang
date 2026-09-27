const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

const filterUILeft = `                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
                        <option value="Tất cả khối">Tất cả khối</option>
                        <option value="Khối 1">Khối 1</option>
                        <option value="Khối 2">Khối 2</option>
                        <option value="Khối 3">Khối 3</option>
                        <option value="Khối 4">Khối 4</option>
                        <option value="Khối 5">Khối 5</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
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
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
                        <option value="Tất cả Môn">Tất cả Môn</option>
                        <option value="Toán Học">Toán Học</option>
                        <option value="Tiếng Việt">Tiếng Việt</option>
                        <option value="Tự nhiên và Xã hội">Tự nhiên và Xã hội</option>
                        <option value="Công nghệ">Công nghệ</option>
                        <option value="Tin học">Tin học</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>`;

const leftFilterMatch = content.match(/{\/\* Filters \*\/}\s*<div className="flex flex-wrap items-center gap-3">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
if (leftFilterMatch) {
  content = content.replace(leftFilterMatch[0], filterUILeft + '\n              </div>');
}

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
