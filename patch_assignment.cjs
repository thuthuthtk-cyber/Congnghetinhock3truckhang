const fs = require('fs');
let content = fs.readFileSync('src/components/modules/AssignmentModule.tsx', 'utf8');

// Add imports
if (!content.includes("import { SUBJECTS, GRADES, CLASSES_BY_GRADE, ALL_CLASSES } from '../../lib/constants';")) {
  content = content.replace("import { HomeworkAssignment", "import { SUBJECTS, GRADES, CLASSES_BY_GRADE, ALL_CLASSES } from '../../lib/constants';\nimport { HomeworkAssignment");
}

// Ensure the class filter resets if the grade changes and the class is not in the new grade
content = content.replace(
  'setSelectedGrade(e.target.value);',
  `setSelectedGrade(e.target.value);
                setSelectedClass('Tất cả các lớp');`
);

// Replace Subject Select
const subjectSelectMatch = content.match(/<select\s+value=\{selectedSubject\}[^>]*>([\s\S]*?)<\/select>/);
if (subjectSelectMatch) {
  content = content.replace(
    subjectSelectMatch[0],
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
}

// Replace Grade Select
const gradeSelectMatch = content.match(/<select\s+value=\{selectedGrade\}[^>]*>([\s\S]*?)<\/select>/);
if (gradeSelectMatch) {
  content = content.replace(
    gradeSelectMatch[0],
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
}

// Replace Class Select
const classSelectMatch = content.match(/<select\s+value=\{selectedClass\}[^>]*>([\s\S]*?)<\/select>/);
if (classSelectMatch) {
  content = content.replace(
    classSelectMatch[0],
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
}

fs.writeFileSync('src/components/modules/AssignmentModule.tsx', content);
