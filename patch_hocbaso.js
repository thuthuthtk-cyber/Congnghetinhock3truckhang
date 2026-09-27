const fs = require('fs');
let file = fs.readFileSync('src/components/modules/HocBaSoModule.tsx', 'utf8');

// Add imports if missing
if (!file.includes('CLASSES_BY_GRADE')) {
  file = file.replace(
    "import { PRIMARY_SCHOOL_SUBJECTS } from '../../services/mockData';",
    "import { PRIMARY_SCHOOL_SUBJECTS } from '../../services/mockData';\nimport { GRADES, CLASSES_BY_GRADE, EXAM_TYPES } from '../../lib/constants';"
  );
}

// Replace classesList logic
file = file.replace(
  /const classesList1 = [\s\S]*?\['Tất cả Lớp', 'Lớp 5A', 'Lớp 5B'\];/,
  "const classesList1 = ['Tất cả Lớp', ...(CLASSES_BY_GRADE[selectedGrade1] || [])];"
);
file = file.replace(
  /const classesList2 = [\s\S]*?\['Tất cả Lớp', 'Lớp 5A', 'Lớp 5B'\];/,
  "const classesList2 = ['Tất cả Lớp', ...(CLASSES_BY_GRADE[selectedGrade2] || [])];"
);

// Replace examTypesList and semestersList with EXAM_TYPES
file = file.replace(
  /const examTypesList = \['Thường xuyên', 'Định kì giữa kì', 'Định kì cuối kì', 'Khảo sát chất lượng'\];/,
  "const examTypesList = EXAM_TYPES;"
);
file = file.replace(
  /const semestersList = \['Giữa học kì 1', 'Cuối học kì 1', 'Giữa học kì 2', 'Cuối học kì 2'\];/,
  "const semestersList = EXAM_TYPES;"
);

// Update default selections in useState if they don't match exactly.
// 'Giữa học kì 1' -> 'Giữa kì 1'
file = file.replace(
  /useState<string>\('Giữa học kì 1'\)/g,
  "useState<string>('Giữa kì 1')"
);

file = file.replace(
  /useEffect\(\(\) => \{\n    if \(selectedGrade1 === 'Khối 3'\) setSelectedClass1\('Lớp 3A'\);\n    else setSelectedClass1\('Tất cả Lớp'\);\n  \}, \[selectedGrade1\]\);/,
  "useEffect(() => {\n    setSelectedClass1('Tất cả Lớp');\n  }, [selectedGrade1]);"
);

file = file.replace(
  /useEffect\(\(\) => \{\n    if \(selectedGrade2 === 'Khối 3'\) setSelectedClass2\('Lớp 3A'\);\n    else setSelectedClass2\('Tất cả Lớp'\);\n  \}, \[selectedGrade2\]\);/,
  "useEffect(() => {\n    setSelectedClass2('Tất cả Lớp');\n  }, [selectedGrade2]);"
);

// Replace gradesList with GRADES if not already
file = file.replace(
  /const gradesList = \['Khối 1', 'Khối 2', 'Khối 3', 'Khối 4', 'Khối 5'\];/g,
  "const gradesList = GRADES;"
);

fs.writeFileSync('src/components/modules/HocBaSoModule.tsx', file);
console.log('Done');
