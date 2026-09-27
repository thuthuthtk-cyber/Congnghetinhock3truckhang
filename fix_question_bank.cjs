const fs = require('fs');

let content = fs.readFileSync('src/components/modules/QuestionBankModule.tsx', 'utf8');
if (!content.includes("../../lib/constants")) {
  content = "import { SUBJECTS, GRADES, CLASSES_BY_GRADE, ALL_CLASSES } from '../../lib/constants';\n" + content;
}

content = content.replace("useState('all')", "useState('Tất cả các khối')"); // gradeFilter
content = content.replace("useState('all')", "useState('Tất cả các môn')"); // subjectFilter

// replace references to 'all' for gradeFilter and subjectFilter
content = content.replace(/gradeFilter === 'all'/g, "gradeFilter === 'Tất cả các khối'");
content = content.replace(/subjectFilter === 'all'/g, "subjectFilter === 'Tất cả các môn'");
content = content.replace(/gradeFilter !== 'all'/g, "gradeFilter !== 'Tất cả các khối'");

const gradeSelectMatch = content.match(/<select[\s\S]*?value=\{gradeFilter\}[\s\S]*?<\/select>/);
if (gradeSelectMatch) {
  content = content.replace(
    gradeSelectMatch[0],
    `<select
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value);
              setLessonFilter('all');
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium cursor-pointer"
          >
            <option value="Tất cả các khối">Tất cả các khối</option>
            {GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
          </select>`
  );
}

const subjectSelectMatch = content.match(/<select[\s\S]*?value=\{subjectFilter\}[\s\S]*?<\/select>/);
if (subjectSelectMatch) {
  content = content.replace(
    subjectSelectMatch[0],
    `<select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setLessonFilter('all');
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium cursor-pointer"
          >
            <option value="Tất cả các môn">Tất cả các môn</option>
            {SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
          </select>`
  );
}

const quickGradeMatch = content.match(/<select[\s\S]*?value=\{quickGrade\}[\s\S]*?<\/select>/);
if (quickGradeMatch) {
  content = content.replace(
    quickGradeMatch[0],
    `<select
                          value={quickGrade}
                          onChange={(e) => setQuickGrade(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 font-medium cursor-pointer"
                        >
                          {GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                        </select>`
  );
}

const quickSubjectMatch = content.match(/<select[\s\S]*?value=\{quickSubject\}[\s\S]*?<\/select>/);
if (quickSubjectMatch) {
  content = content.replace(
    quickSubjectMatch[0],
    `<select
                          value={quickSubject}
                          onChange={(e) => setQuickSubject(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 font-medium cursor-pointer"
                        >
                          {SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                        </select>`
  );
}

fs.writeFileSync('src/components/modules/QuestionBankModule.tsx', content);

