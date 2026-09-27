const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');
content = content.replace(
  "const [gameMode, setGameMode] = useState<'lobby' | 'playing' | 'result'>('lobby');",
  "const [gameMode, setGameMode] = useState<'lobby' | 'playing' | 'result'>('lobby');\n  const [showCreateQuizziModal, setShowCreateQuizziModal] = useState(false);"
);
fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
