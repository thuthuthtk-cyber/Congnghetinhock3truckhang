const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

if (!content.includes('Search,')) {
  content = content.replace('Users, CheckCircle2', 'Users, CheckCircle2, Search, Activity');
} else if (!content.includes('Activity,')) {
  content = content.replace('Search,', 'Search, Activity,');
}

// Since the previous regex replace for imports was naive, let's just do it directly
content = content.replace('Filter,\n  Users,\n  BookOpen,', 'Filter,\n  Users,\n  BookOpen,\n  Search,\n  Activity,');

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
