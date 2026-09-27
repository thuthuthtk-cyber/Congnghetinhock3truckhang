const fs = require('fs');

let content = fs.readFileSync('src/components/modules/AssignmentModule.tsx', 'utf8');

content = content.replace(
  /<select\s+value=\{selectedGrade\}\s+onChange=\{\(e\) =>\s*<option value="Tất cả các khối">Tất cả các khối<\/option>\s*\{GRADES\.map\(\(grade\) => \(\s*<option key=\{grade\} value=\{grade\}>\{grade\}<\/option>\s*\)\)\}\s*<\/select>/g,
  `<select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedClass('Tất cả các lớp');
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="Tất cả các khối">Tất cả các khối</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>`
);

content = content.replace(
  /<select\s+value=\{selectedSubject\}\s+onChange=\{\(e\) =>\s*<option value="Tất cả các môn">Tất cả các môn<\/option>\s*\{SUBJECTS\.map\(\(subject\) => \(\s*<option key=\{subject\} value=\{subject\}>\{subject\}<\/option>\s*\)\)\}\s*<\/select>/g,
  `<select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="Tất cả các môn">Tất cả các môn</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>`
);

content = content.replace(
  /<select\s+value=\{selectedClass\}\s+onChange=\{\(e\) =>\s*<option value="Tất cả các lớp">Tất cả các lớp<\/option>\s*\{\(selectedGrade === 'Tất cả các khối' \? ALL_CLASSES : CLASSES_BY_GRADE\[selectedGrade\] \|\| \[\]\)\.map\(\(cls\) => \(\s*<option key=\{cls\} value=\{cls\}>\{cls\}<\/option>\s*\)\)\}\s*<\/select>/g,
  `<select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="Tất cả các lớp">Tất cả các lớp</option>
              {(selectedGrade === 'Tất cả các khối' ? ALL_CLASSES : CLASSES_BY_GRADE[selectedGrade] || []).map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>`
);

fs.writeFileSync('src/components/modules/AssignmentModule.tsx', content);

let qbContent = fs.readFileSync('src/components/modules/QuestionBankModule.tsx', 'utf8');
// Fix quickGrade
qbContent = qbContent.replace(
  /<select\s*value=\{quickGrade\}\s*onChange=\{\(e\) => setQuickGrade\(\s*<option/g,
  `<select
      value={quickGrade}
      onChange={(e) => setQuickGrade(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 font-medium cursor-pointer"
    >
      <option`
);

// Fix quickSubject
qbContent = qbContent.replace(
  /<select\s*value=\{quickSubject\}\s*onChange=\{\(e\) => setQuickSubject\(\s*<option/g,
  `<select
      value={quickSubject}
      onChange={(e) => setQuickSubject(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 font-medium cursor-pointer"
    >
      <option`
);
fs.writeFileSync('src/components/modules/QuestionBankModule.tsx', qbContent);
