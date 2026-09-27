const fs = require('fs');
let content = fs.readFileSync('src/components/modules/QuestionBankModule.tsx', 'utf8');

// Replace injected fragments for method map
content = content.replace(
  /return \(\n<>\n                      <button/g,
  `return (\n                      <button`
);
content = content.replace(
  /                      <\/button>\n                      <\/>\n  \);\n                  \}\)/g,
  `                      </button>\n  );\n                  })`
);

// Replace injected fragments for ci map
content = content.replace(
  /return \(\n<>\n                                    <div key=\{cIdx\}/g,
  `return (\n                                    <div key={cIdx}`
);
content = content.replace(
  /                                    <\/div>\n                                    <\/>\n  \);\n                                \}\)/g,
  `                                    </div>\n  );\n                                })`
);

fs.writeFileSync('src/components/modules/QuestionBankModule.tsx', content);
