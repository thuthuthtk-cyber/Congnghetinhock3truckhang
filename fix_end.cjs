const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

content = content.replace(
  '                  </button>\n                </div>\n              </div>\n            </div>\n          </div>',
  '                  </button>\n                </div>\n                </>\n              )}\n              </div>\n            </div>\n          </div>'
);

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
