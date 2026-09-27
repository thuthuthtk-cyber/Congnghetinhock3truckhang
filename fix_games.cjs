const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

content = content.replace('  UserCheck\n  HelpCircle,', '  UserCheck,\n  HelpCircle,');

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
