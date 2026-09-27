const fs = require('fs');
let content = fs.readFileSync('src/components/modules/ExamManagementModule.tsx', 'utf8');

// The dropdowns to fix in ExamManagementModule.tsx:

// filterGrade
content = content.replace(
  /<select value={filterGrade} onChange={\(e\) => setFilterGrade\(e.target.value\)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500">\s*<option>Tất cả khối<\/option>\s*<option>Khối 1<\/option><option>Khối 2<\/option><option>Khối 3<\/option><option>Khối 4<\/option><option>Khối 5<\/option>\s*<\/select>/s,
  `<select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                  <option value="Tất cả khối">Tất cả khối</option>
                  <option value="Khối 1">Khối 1</option>
                  <option value="Khối 2">Khối 2</option>
                  <option value="Khối 3">Khối 3</option>
                  <option value="Khối 4">Khối 4</option>
                  <option value="Khối 5">Khối 5</option>
                </select>`
);

// filterClass
content = content.replace(
  /<select value={filterClass} onChange={\(e\) => setFilterClass\(e.target.value\)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500">\s*<option>Tất cả lớp<\/option>\s*<option>Lớp 3A<\/option><option>Lớp 3B<\/option><option>Lớp 4A<\/option>\s*<\/select>/s,
  `<select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                  <option value="Tất cả Lớp">Tất cả Lớp</option>
                  <option value="Lớp 1A">Lớp 1A</option>
                  <option value="Lớp 1B">Lớp 1B</option>
                  <option value="Lớp 2A">Lớp 2A</option>
                  <option value="Lớp 2B">Lớp 2B</option>
                  <option value="Lớp 3A">Lớp 3A</option>
                  <option value="Lớp 3B">Lớp 3B</option>
                  <option value="Lớp 4A">Lớp 4A</option>
                  <option value="Lớp 5A">Lớp 5A</option>
                </select>`
);

// filterSubject
content = content.replace(
  /<select value={filterSubject} onChange={\(e\) => setFilterSubject\(e.target.value\)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500">\s*<option>Tất cả môn học<\/option>\s*<option>Toán<\/option><option>Tiếng Việt<\/option><option>Tự nhiên và Xã hội<\/option>\s*<\/select>/s,
  `<select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                  <option value="Tất cả Môn">Tất cả Môn</option>
                  <option value="Toán Học">Toán</option>
                  <option value="Tiếng Việt">Tiếng Việt</option>
                  <option value="Tự nhiên và Xã hội">Tự nhiên và Xã hội</option>
                  <option value="Công nghệ">Công nghệ</option>
                  <option value="Tin học">Tin học</option>
                </select>`
);

// We need to make sure the filter logic uses the correct text.
content = content.replace(
  "if (filterSubject !== 'Tất cả môn học' && exam.subject !== filterSubject) return false;",
  "if (filterSubject !== 'Tất cả Môn' && exam.subject !== filterSubject) return false;"
);

content = content.replace(
  "if (filterClass !== 'Tất cả lớp' && exam.targetClass && exam.targetClass !== filterClass) return false;",
  "if (filterClass !== 'Tất cả Lớp' && exam.targetClass && exam.targetClass !== filterClass) return false;"
);

content = content.replace(
  "if (filterType !== 'Tất cả loại' && exam.examType && exam.examType !== filterType) return false;",
  "if (filterType !== 'Tất cả Loại' && exam.examType && exam.examType !== filterType) return false;"
);

// Check if filterType has correct options
content = content.replace(
  /<select value={filterType} onChange={\(e\) => setFilterType\(e.target.value\)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500">\s*<option>Tất cả loại<\/option>\s*<option>Thường xuyên<\/option><option>Định kì<\/option>\s*<\/select>/s,
  `<select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                  <option value="Tất cả Loại">Tất cả Loại</option>
                  <option value="Thường xuyên">Thường xuyên</option>
                  <option value="Định kì">Định kì</option>
                </select>`
);

fs.writeFileSync('src/components/modules/ExamManagementModule.tsx', content);
