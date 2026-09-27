const fs = require('fs');

const modules = [
  'src/components/modules/AssignmentModule.tsx',
  'src/components/modules/ExamManagementModule.tsx',
  'src/components/modules/InteractiveGamesModule.tsx',
  'src/components/modules/Lesson5EModule.tsx',
  'src/components/modules/QuestionBankModule.tsx'
];

modules.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix Broken Selects
  content = content.replace(
    /<select value=\{filterGrade\} onChange=\{\(e\) =>\n<option/g,
    `<select value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value); setFilterClass('Tất cả các lớp'); }} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">\n<option`
  );
  
  content = content.replace(
    /<select value=\{filterClass\} onChange=\{\(e\) =>\n<option/g,
    `<select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">\n<option`
  );
  
  content = content.replace(
    /<select value=\{filterSubject\} onChange=\{\(e\) =>\n<option/g,
    `<select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">\n<option`
  );

  fs.writeFileSync(filePath, content);
});
