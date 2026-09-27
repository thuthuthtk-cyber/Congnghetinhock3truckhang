const fs = require('fs');

const SUBJECTS = ["Toán", "Tiếng Việt", "Tin học", "Công nghệ", "Khoa học", "Lịch sử và Địa lý", "Tiếng Anh", "Đạo đức", "Tự nhiên và Xã hội", "Âm nhạc", "Mỹ thuật", "GDTC", "HĐTN"];
const GRADES = ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"];
const CLASSES_BY_GRADE = {
  "Khối 1": ["Lớp 1A", "Lớp 1B", "Lớp 1C"],
  "Khối 2": ["Lớp 2A", "Lớp 2B", "Lớp 2C"],
  "Khối 3": ["Lớp 3A", "Lớp 3B", "Lớp 3C"],
  "Khối 4": ["Lớp 4A", "Lớp 4B", "Lớp 4C"],
  "Khối 5": ["Lớp 5A", "Lớp 5B", "Lớp 5C"]
};
const ALL_CLASSES = Object.values(CLASSES_BY_GRADE).flat();

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Make sure we have our constants imported if they are not defined locally
  if (!content.includes("SUBJECTS") && !content.includes("../../lib/constants")) {
    const importStatement = "import { SUBJECTS, GRADES, CLASSES_BY_GRADE, ALL_CLASSES } from '../../lib/constants';\n";
    // naive insert after first import
    const firstImportMatch = content.match(/import [^;]+;/);
    if (firstImportMatch) {
      content = content.replace(firstImportMatch[0], importStatement + firstImportMatch[0]);
    } else {
      content = importStatement + content;
    }
  } else if (!content.includes("../../lib/constants") && content.includes("import {")) {
    const importStatement = "import { SUBJECTS, GRADES, CLASSES_BY_GRADE, ALL_CLASSES } from '../../lib/constants';\n";
    content = content.replace("import {", importStatement + "import {");
  }

  // --- REPLACE ALL GRADES SELECTS ---
  // Using Regex to find typical filter selects
  // Example: <select value={filterGrade} ...> ... </select>
  content = content.replace(
    /<select[^>]*value=\{([a-zA-Z0-9]+Grade)\}[^>]*>([\s\S]*?)<\/select>/g,
    (match, valName) => {
      // Find the onChange part to inject reset of class if possible
      let newSelect = match;
      if (valName === 'filterGrade' || valName === 'selectedGrade' || valName === 'gradeFilter' || valName === 'quickGrade') {
         // Create the new options
         let optionsStr = '';
         if (valName !== 'quickGrade') {
           optionsStr += `<option value="Tất cả các khối">Tất cả các khối</option>\n`;
         }
         optionsStr += `{GRADES.map((grade) => (
            <option key={grade} value={grade}>{grade}</option>
          ))}`;
         
         // Replace inner options
         newSelect = match.replace(/>([\s\S]*?)<\/select>/, `>\n${optionsStr}\n</select>`);

         // Try to inject class reset
         // Usually: onChange={(e) => setFilterGrade(e.target.value)}
         // Let's replace the single statement arrow function with a block if it's one
         const setterMap = {
           'filterGrade': 'setFilterClass',
           'selectedGrade': 'setSelectedClass',
           'gradeFilter': 'setLessonFilter', // lesson filter, not class
         };
         
         const onChangeMatch = newSelect.match(/onChange=\{\(e\) => ([a-zA-Z0-9]+)\(e\.target\.value\)\}/);
         if (onChangeMatch && setterMap[valName]) {
            const classSetter = setterMap[valName];
            // Don't reset if it's not a class setter or if the component doesn't have it (e.g. Lesson5EModule might not have setFilterClass, wait, I'll just check if setFilterClass exists)
            if (originalContent.includes(classSetter)) {
              newSelect = newSelect.replace(
                onChangeMatch[0],
                `onChange={(e) => {
                  ${onChangeMatch[1]}(e.target.value);
                  ${classSetter}('Tất cả các lớp');
                }}`
              );
            }
         }
      }
      return newSelect;
    }
  );

  // --- REPLACE ALL CLASS SELECTS ---
  content = content.replace(
    /<select[^>]*value=\{([a-zA-Z0-9]+Class)\}[^>]*>([\s\S]*?)<\/select>/g,
    (match, valName) => {
      if (valName === 'filterClass' || valName === 'selectedClass') {
        let correspondingGradeVar = valName === 'filterClass' ? 'filterGrade' : 'selectedGrade';
        let optionsStr = `<option value="Tất cả các lớp">Tất cả các lớp</option>\n`;
        optionsStr += `{(${correspondingGradeVar} === 'Tất cả các khối' ? ALL_CLASSES : CLASSES_BY_GRADE[${correspondingGradeVar}] || []).map((cls) => (
            <option key={cls} value={cls}>{cls}</option>
          ))}`;
        
        return match.replace(/>([\s\S]*?)<\/select>/, `>\n${optionsStr}\n</select>`);
      }
      return match;
    }
  );

  // --- REPLACE ALL SUBJECT SELECTS ---
  content = content.replace(
    /<select[^>]*value=\{([a-zA-Z0-9]+Subject|subjectFilter)\}[^>]*>([\s\S]*?)<\/select>/g,
    (match, valName) => {
      if (valName === 'filterSubject' || valName === 'selectedSubject' || valName === 'subjectFilter' || valName === 'quickSubject') {
        let optionsStr = '';
        if (valName !== 'quickSubject') {
          optionsStr += `<option value="Tất cả các môn">Tất cả các môn</option>\n`;
        }
        optionsStr += `{SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}`;
        
        return match.replace(/>([\s\S]*?)<\/select>/, `>\n${optionsStr}\n</select>`);
      }
      return match;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Patched ${filePath}`);
  }
}

const modules = [
  'src/components/modules/AssignmentModule.tsx',
  'src/components/modules/ExamManagementModule.tsx',
  'src/components/modules/InteractiveGamesModule.tsx',
  'src/components/modules/Lesson5EModule.tsx',
  'src/components/modules/QuestionBankModule.tsx'
];

modules.forEach(processFile);
