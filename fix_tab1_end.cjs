const fs = require('fs');
let content = fs.readFileSync('src/components/modules/QuestionBankModule.tsx', 'utf8');

content = content.replace(
  /            \{\/\* TAB 2: NGUỒN DỮ LIỆU \*\/\}/,
  `            )}\n\n            {/* TAB 2: NGUỒN DỮ LIỆU */}`
);

fs.writeFileSync('src/components/modules/QuestionBankModule.tsx', content);
