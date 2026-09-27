const fs = require('fs');
let content = fs.readFileSync('src/components/modules/QuestionBankModule.tsx', 'utf8');

content = content.replace(
  /<\/div>\n              <\/div>\n            \)}\n\n            \{\/\* Four Creation Methods/g,
  `</div>\n              </div>\n\n            {/* Four Creation Methods`
);

fs.writeFileSync('src/components/modules/QuestionBankModule.tsx', content);
