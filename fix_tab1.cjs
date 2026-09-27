const fs = require('fs');
let content = fs.readFileSync('src/components/modules/QuestionBankModule.tsx', 'utf8');

content = content.replace(
  /<\/div>\s*<\/div>\s*\{\/\* Four Creation Methods selectors \*\/\}/g,
  `</div>\n              </div>\n            )}\n\n            {/* Four Creation Methods selectors */}`
);

fs.writeFileSync('src/components/modules/QuestionBankModule.tsx', content);
