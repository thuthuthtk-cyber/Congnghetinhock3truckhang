const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

const stateInsert = `  const [deletedCards, setDeletedCards] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleDeleteCard = (id: number) => {
    setDeletedCards(prev => [...prev, id]);
    setToastMessage("Ok la xóa ngay lập tức");
    setTimeout(() => setToastMessage(null), 3000);
  };
`;

content = content.replace(
  "const [showEditQuizziModal, setShowEditQuizziModal] = useState(false);",
  "const [showEditQuizziModal, setShowEditQuizziModal] = useState(false);\n" + stateInsert
);

// Card 1
content = content.replace(
  '{/* Sample Card 1 */}',
  '{!deletedCards.includes(1) && (\n                {/* Sample Card 1 */}'
);
content = content.replace(
  '<button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>',
  '<button onClick={() => handleDeleteCard(1)} className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>'
);
content = content.replace(
  '                {/* Sample Card 2 */}',
  '              )}\n\n                {/* Sample Card 2 */}'
);

// Card 2
content = content.replace(
  '{/* Sample Card 2 */}',
  '{!deletedCards.includes(2) && (\n                {/* Sample Card 2 */}'
);
content = content.replace(
  '<button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>',
  '<button onClick={() => handleDeleteCard(2)} className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>'
);
content = content.replace(
  '                {/* Sample Card 3 */}',
  '              )}\n\n                {/* Sample Card 3 */}'
);

// Card 3
content = content.replace(
  '{/* Sample Card 3 */}',
  '{!deletedCards.includes(3) && (\n                {/* Sample Card 3 */}'
);
content = content.replace(
  '<button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>',
  '<button onClick={() => handleDeleteCard(3)} className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>'
);
content = content.replace(
  '              </div>\n            </div>\n          </div>',
  '              )}\n              </div>\n            </div>\n          </div>'
);

const toastUI = `
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-100" />
            {toastMessage}
          </div>
        </div>
      )}
`;

content = content.replace(
  '    </div>\n  );\n};',
  toastUI + '\n    </div>\n  );\n};'
);

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
