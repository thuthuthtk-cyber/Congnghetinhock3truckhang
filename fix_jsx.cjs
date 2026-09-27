const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

// Undo the syntax fixes first, maybe they were wrong
content = content.replace(/                <\/button>\n              <\/div>\n<\/>\n              \)}\n\n                {!deletedCards/g, '                </button>\n              </div>\n              )}\n\n                {!deletedCards');
content = content.replace(/                <\/button>\n              <\/div>\n<\/>\n              \)}\n              <\/div>/, '                </button>\n              </div>\n              )}\n              </div>');
content = content.replace(/{!deletedCards\.includes\(1\) && \(\n                <> {\/\* Sample Card 1 \*\/}/g, '{!deletedCards.includes(1) && (\n                {/* Sample Card 1 */}');
content = content.replace(/{!deletedCards\.includes\(2\) && \(\n                <> {\/\* Sample Card 2 \*\/}/g, '{!deletedCards.includes(2) && (\n                {/* Sample Card 2 */}');
content = content.replace(/{!deletedCards\.includes\(3\) && \(\n                <> {\/\* Sample Card 3 \*\/}/g, '{!deletedCards.includes(3) && (\n                {/* Sample Card 3 */}');

// Let's wrap each card in a fragment properly
content = content.replace(
  /{!deletedCards\.includes\(1\) && \(\n                {\/\* Sample Card 1 \*\/}\n                <div className="bg-white/g,
  '{!deletedCards.includes(1) && (\n                <>\n                {/* Sample Card 1 */}\n                <div className="bg-white'
);
content = content.replace(
  /                <\/button>\n                <\/div>\n\n              \)}\n\n                {!deletedCards\.includes\(2\) && \(\n                {\/\* Sample Card 2 \*\/}\n                <div className="bg-white/g,
  '                </button>\n                </div>\n                </>\n              )}\n\n                {!deletedCards.includes(2) && (\n                <>\n                {/* Sample Card 2 */}\n                <div className="bg-white'
);
content = content.replace(
  /                <\/button>\n                <\/div>\n\n              \)}\n\n                {!deletedCards\.includes\(3\) && \(\n                {\/\* Sample Card 3 \*\/}\n                <div className="bg-white/g,
  '                </button>\n                </div>\n                </>\n              )}\n\n                {!deletedCards.includes(3) && (\n                <>\n                {/* Sample Card 3 */}\n                <div className="bg-white'
);
content = content.replace(
  /                <\/button>\n                <\/div>\n              \)}\n              <\/div>\n            <\/div>\n          <\/div>/g,
  '                </button>\n                </div>\n                </>\n              )}\n              </div>\n            </div>\n          </div>'
);

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
