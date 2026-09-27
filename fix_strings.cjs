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
  let originalContent = content;

  // Replace old "All" variants with standardized ones
  content = content.replace(/'Tất cả khối'/g, "'Tất cả các khối'");
  content = content.replace(/'Tất cả Khối lớp'/g, "'Tất cả các khối'");
  content = content.replace(/"Tất cả Khối lớp"/g, '"Tất cả các khối"');
  content = content.replace(/'Tất cả lớp'/g, "'Tất cả các lớp'");
  content = content.replace(/'Tất cả Lớp'/g, "'Tất cả các lớp'");
  content = content.replace(/'Tất cả Môn'/g, "'Tất cả các môn'");
  content = content.replace(/'Tất cả môn học'/g, "'Tất cả các môn'");
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed strings in ${filePath}`);
  }
});
