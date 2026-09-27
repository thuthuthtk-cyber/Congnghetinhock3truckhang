const fs = require('fs');
let content = fs.readFileSync('src/components/modules/QuestionBankModule.tsx', 'utf8');

content = content.replace(
  /          quickCount\n          <\/>\n  \);\n      \} else if \(quickSourceMode === 'file'\) \{/g,
  `          quickCount\n        );\n      } else if (quickSourceMode === 'file') {`
);

content = content.replace(
  /          quickCount\n          <\/>\n  \);\n      \} else if \(quickSourceMode === 'manual'\) \{/g,
  `          quickCount\n        );\n      } else if (quickSourceMode === 'manual') {`
);

fs.writeFileSync('src/components/modules/QuestionBankModule.tsx', content);
