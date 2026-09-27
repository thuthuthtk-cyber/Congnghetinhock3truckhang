const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

content = content.replace(/<ChevronDown,\n  X className=/g, '<ChevronDown className=');

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
