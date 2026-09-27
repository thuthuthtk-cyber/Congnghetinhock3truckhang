const fs = require('fs');
let content = fs.readFileSync('src/components/modules/InteractiveGamesModule.tsx', 'utf8');

// Add state
const stateToAdd = `  const [gameToDelete, setGameToDelete] = useState<{ id: number; title: string } | null>(null);`;
content = content.replace(
  'const [deletedCards, setDeletedCards] = useState<number[]>([]);',
  'const [deletedCards, setDeletedCards] = useState<number[]>([]);\n' + stateToAdd
);

// Modify trash button
content = content.replace(
  /<button onClick={\(\) => handleDeleteCard\(game\.id\)} className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"><Trash2 className="w-3\.5 h-3\.5" \/><\/button>/g,
  '<button onClick={() => setGameToDelete({ id: game.id, title: game.title })} className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>'
);

// Add Modal UI before the closing tag of the main div
const modalUI = `
      {/* Delete Confirmation Modal */}
      {gameToDelete && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 px-6 py-4 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">XÓA TRÒ CHƠI QUIZZI</h3>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                Thầy/Cô có chắc muốn xóa trò chơi: <strong>{gameToDelete.title}</strong> không? Dữ liệu và liên kết nhúng liên quan sẽ không thể khôi phục.
              </p>
              
              <div className="flex items-center justify-end gap-3 mt-8">
                <button
                  onClick={() => setGameToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    handleDeleteCard(gameToDelete.id);
                    setGameToDelete(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer shadow-md"
                >
                  Đồng ý
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  '      {/* Toast Notification */}',
  modalUI + '\n      {/* Toast Notification */}'
);

fs.writeFileSync('src/components/modules/InteractiveGamesModule.tsx', content);
