const fs = require('fs');
let content = fs.readFileSync('src/components/modules/QuestionBankModule.tsx', 'utf8');

const parts = content.split('return (');
if (parts.length > 1) {
  // We want the last 'return (' which is the main render? No, there might be mappings.
  // Actually, let's just replace the exact one.
  content = content.replace(
    /return \(\n    <div className="space-y-6">/,
    `return (\n    <>\n      <div className="space-y-6">`
  );
  content = content.replace(
    /      \}\)\}\n    <\/div>\n  \);\n\};\n\nexport default QuestionBankModule;/,
    `      })\}    </div>\n    </>\n  );\n};\n\nexport default QuestionBankModule;`
  );
  fs.writeFileSync('src/components/modules/QuestionBankModule.tsx', content);
}
