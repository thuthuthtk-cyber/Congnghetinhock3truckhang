const fs = require('fs');
let content = fs.readFileSync('src/components/modules/Lesson5EModule.tsx', 'utf8');

// 1. Add filter states
content = content.replace(
  'const [selectedLesson, setSelectedLesson] = useState<Lesson5EPlan | null>(null);',
  `const [selectedLesson, setSelectedLesson] = useState<Lesson5EPlan | null>(null);

  // Filter States
  const [filterGrade, setFilterGrade] = useState('Tất cả khối');
  const [filterSubject, setFilterSubject] = useState('Tất cả Môn');
  
  const filteredLessons = (lessons || []).filter(lesson => {
    if (filterGrade !== 'Tất cả khối' && lesson.grade !== filterGrade) return false;
    if (filterSubject !== 'Tất cả Môn' && lesson.subject !== filterSubject) return false;
    return true;
  });`
);

// 2. Add filter UI and update render
const filterUI = `
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-6 flex flex-wrap items-center gap-4">
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
                <option value="Khối 10">Khối 10</option>
                <option value="Khối 11">Khối 11</option>
                <option value="Khối 12">Khối 12</option>
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
                <option value="Tiếng Anh">Tiếng Anh</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
        
        {filteredLessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-bold">Không tìm thấy bài giảng nào khớp bộ lọc</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLessons.map((lesson) => (
`;

content = content.replace(
  /{activeTab === 'list' && \(\n\s+<div className="grid grid-cols-1 md:grid-cols-2 gap-6">\n\s+{\(lessons \|\| \[\]\)\.map\(\(lesson\) => \(/,
  "{activeTab === 'list' && (\n      <>\n" + filterUI
);

content = content.replace(
  /                  \)}\n                <\/div>\n              <\/div>\n            <\/div>\n          \)\)}\n        <\/div>\n      \)}/,
  "                  )}\n                </div>\n              </div>\n            </div>\n          ))}\n        </div>\n        )}\n        </>\n      )}"
);

// Fix missing imports (Filter, ChevronDown)
if (!content.includes('Filter,')) {
  content = content.replace('Printer,\n', 'Printer,\n  Filter,\n  ChevronDown,\n');
}

fs.writeFileSync('src/components/modules/Lesson5EModule.tsx', content);
