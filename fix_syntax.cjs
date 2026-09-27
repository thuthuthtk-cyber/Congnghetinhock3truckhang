const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

content = content.replace(/{!deletedCards\.includes\(1\) && \(\n\s+{\/\* Sample Card 1 \*\/}/, '{!deletedCards.includes(1) && (\n                <> {/* Sample Card 1 */}');
content = content.replace(/{!deletedCards\.includes\(2\) && \(\n\s+{\/\* Sample Card 2 \*\/}/, '{!deletedCards.includes(2) && (\n                <> {/* Sample Card 2 */}');
content = content.replace(/{!deletedCards\.includes\(3\) && \(\n\s+{\/\* Sample Card 3 \*\/}/, '{!deletedCards.includes(3) && (\n                <> {/* Sample Card 3 */}');

content = content.replace(/                <\/button>\n              <\/div>\n\n              \)}\n\n                {!deletedCards/g, '                </button>\n              </div>\n</>\n              )}\n\n                {!deletedCards');
content = content.replace(/                <\/button>\n              <\/div>\n\n              \)}\n              <\/div>/, '                </button>\n              </div>\n</>\n              )}\n              </div>');

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
