import React, { useState } from 'react';
import { Sparkles, Award, CheckSquare, Upload, Image as ImageIcon, Crown, Trophy, Check } from 'lucide-react';
import { FeedbackBlockConfig } from '../../types';
import { DEFAULT_ANIMAL_AVATAR } from '../common/AnimalAvatars';
import { isGenericTeacherLabel } from './StudentReviewView';

interface TeacherFeedbackEditorProps {
  initialBlocks?: FeedbackBlockConfig[];
  defaultTeacherName?: string;
  onFeedbackChange: (blocks: FeedbackBlockConfig[]) => void;
}

const getDefaultFeedbackBlocks = (teacherName: string = 'Cô Trần Thị Diễm Hương'): FeedbackBlockConfig[] => [
  {
    id: 'block-1',
    levelTitle: 'HOÀN THÀNH XUẤT SẮC 🏆',
    useLaurelWreath: true,
    laurelWreathUrl: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop',
    sticker: '🏆',
    praiseTitle: 'TUYỆT VỜI! HOÀN THÀNH XUẤT SẮC 🌟',
    praiseContent: 'Thầy cô rất tự hào vì sự tập trung, tư duy sáng tạo và kết quả bài học xuất sắc của em. Hãy tiếp tục phát huy phong độ tuyệt vời này nhé!',
    teacherName: teacherName
  },
  {
    id: 'block-2',
    levelTitle: 'ĐẠT YÊU CẦU ✅',
    useLaurelWreath: false,
    laurelWreathUrl: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
    backgroundImageUrl: '',
    sticker: '👍',
    praiseTitle: 'LÀM TỐT LẮM! ĐÃ ĐẠT YÊU CẦU BÀI HỌC',
    praiseContent: 'Em đã nắm vững kiến thức cốt lõi và hoàn thành tốt các nhiệm vụ học tập được giao.',
    teacherName: teacherName
  },
  {
    id: 'block-3',
    levelTitle: 'CẦN CỐ GẮNG 💪',
    useLaurelWreath: false,
    laurelWreathUrl: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
    backgroundImageUrl: '',
    sticker: '💪',
    praiseTitle: 'CỐ GẮNG HƠN NỮA NHÉ EM!',
    praiseContent: 'Em đã có nhiều nỗ lực. Hãy ôn tập kỹ hơn phần lý thuyết và thực hành để đạt kết quả cao hơn ở các bài học tới.',
    teacherName: teacherName
  }
];

export const TeacherFeedbackEditor: React.FC<TeacherFeedbackEditorProps> = ({
  initialBlocks,
  defaultTeacherName = 'Cô Trần Thị Diễm Hương',
  onFeedbackChange
}) => {
  const effectiveDefaultTeacher = defaultTeacherName && !isGenericTeacherLabel(defaultTeacherName) 
    ? defaultTeacherName 
    : 'Cô Trần Thị Diễm Hương';

  const [blocks, setBlocks] = useState<FeedbackBlockConfig[]>(() => {
    const base = initialBlocks && initialBlocks.length > 0 
      ? initialBlocks 
      : getDefaultFeedbackBlocks(effectiveDefaultTeacher);

    return base.map(b => ({
      ...b,
      teacherName: !b.teacherName || isGenericTeacherLabel(b.teacherName) 
        ? effectiveDefaultTeacher 
        : b.teacherName
    }));
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string>('block-1');

  const currentBlock = blocks.find(b => b.id === selectedBlockId) || blocks[0];

  const handleUpdateCurrent = (fields: Partial<FeedbackBlockConfig>) => {
    const updated = blocks.map(b => b.id === currentBlock.id ? { ...b, ...fields } : b);
    setBlocks(updated);
    onFeedbackChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-purple-300 uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            CẤU HÌNH MỤC NHẬN XÉT & VINH DANH HỌC SINH (REVIEW 5E)
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Thiết lập các mức độ nhận xét khen thưởng (Đặc biệt khối Xuất Sắc tích hợp hiệu ứng Vòng nguyệt quế vinh danh).
          </p>
        </div>
      </div>

      {/* 3 Blocks Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {blocks.map((blk) => (
          <button
            key={blk.id}
            type="button"
            onClick={() => setSelectedBlockId(blk.id)}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
              selectedBlockId === blk.id
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                selectedBlockId === blk.id ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {blk.sticker} Mức độ
              </span>
              {blk.useLaurelWreath && (
                <span className="text-[10px] bg-amber-400 text-slate-900 font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  👑 Vòng nguyệt quế
                </span>
              )}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold">{blk.levelTitle}</h4>
              <p className={`text-[11px] truncate mt-0.5 ${selectedBlockId === blk.id ? 'text-purple-100' : 'text-slate-400'}`}>
                {blk.praiseTitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Configuration Form + Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Configuration Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4 p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wide">
              Đang chỉnh sửa: {currentBlock.levelTitle}
            </h4>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2.5 py-1 rounded-lg border border-purple-500/30">
              Tùy chỉnh thời gian thực
            </span>
          </div>

          {/* Checkbox: Sử dụng khung Vòng nguyệt quế */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-extrabold text-white flex items-center gap-2 cursor-pointer">
                <span>👑</span> Sử dụng khung Vòng nguyệt quế vinh danh
              </label>
              <p className="text-[11px] text-slate-400">
                Hiệu ứng vòng nguyệt quế vàng kim bao quanh avatar học sinh tạo cảm giác trang trọng như huy chương.
              </p>
            </div>
            <input
              type="checkbox"
              checked={currentBlock.useLaurelWreath}
              onChange={(e) => handleUpdateCurrent({ useLaurelWreath: e.target.checked })}
              className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
            />
          </div>

          {currentBlock.useLaurelWreath && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-900 border border-slate-700">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ảnh vòng nguyệt quế (URL PNG nền trong suốt):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentBlock.laurelWreathUrl || ''}
                    onChange={(e) => handleUpdateCurrent({ laurelWreathUrl: e.target.value })}
                    placeholder="https://example.com/laurel-wreath.png"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrent({ laurelWreathUrl: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png' })}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    Ảnh mẫu chuẩn
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ảnh nền vinh danh (URL Background):
                </label>
                <input
                  type="text"
                  value={currentBlock.backgroundImageUrl || ''}
                  onChange={(e) => handleUpdateCurrent({ backgroundImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/... (để trống nếu dùng nền thuần)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* Sticker / Huy hiệu */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Sticker / Huy hiệu biểu tượng:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentBlock.sticker}
                onChange={(e) => handleUpdateCurrent({ sticker: e.target.value })}
                className="w-20 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-center text-base text-white focus:outline-none focus:border-purple-500"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {['🏆', '🌟', '🥇', '👑', '⭐', '💯', '🎯', '👍', '💪'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleUpdateCurrent({ sticker: st })}
                    className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-base cursor-pointer transition-all"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tiêu đề khen ngợi */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tiêu đề khen ngợi (in đậm, cỡ lớn):
            </label>
            <input
              type="text"
              value={currentBlock.praiseTitle}
              onChange={(e) => handleUpdateCurrent({ praiseTitle: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Nội dung lời khen */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nội dung lời khen chi tiết (đoạn văn):
            </label>
            <textarea
              rows={4}
              value={currentBlock.praiseContent}
              onChange={(e) => handleUpdateCurrent({ praiseContent: e.target.value })}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white leading-relaxed focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>

          {/* Tên giáo viên */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên giáo viên ký tên:
            </label>
            <input
              type="text"
              value={currentBlock.teacherName}
              onChange={(e) => handleUpdateCurrent({ teacherName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Right: Live Preview Screen for Student (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Màn hình xem trước (Học sinh nhìn thấy):
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30 font-bold">
              Live Preview
            </span>
          </div>

          {/* Preview Card */}
          <div className="rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative bg-slate-900 text-white p-6 sm:p-8 flex flex-col items-center text-center">
            
            {/* Background Image Layer */}
            {currentBlock.backgroundImageUrl ? (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
                style={{ backgroundImage: `url(${currentBlock.backgroundImageUrl})` }}
              ></div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-purple-950 via-slate-900 to-indigo-950 opacity-90 pointer-events-none"></div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none"></div>

            <div className="relative z-10 w-full space-y-6">
              
              {/* Badge level header */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
                <span>{currentBlock.sticker}</span>
                <span>{currentBlock.levelTitle}</span>
              </div>

              {/* Avatar with Laurel Wreath & Glow */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center my-4">
                
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-75 blur-md animate-pulse"></div>

                {/* Laurel Wreath Overlay (if enabled) */}
                {currentBlock.useLaurelWreath && (
                  <div className="absolute -inset-6 z-20 pointer-events-none flex items-center justify-center">
                    <img 
                      src={currentBlock.laurelWreathUrl || 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png'} 
                      alt="Vòng nguyệt quế" 
                      className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(252,211,77,0.8)] scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Student Avatar (Circular) */}
                <div className="relative z-10 w-24 h-24 rounded-full border-4 border-amber-300 shadow-xl overflow-hidden bg-white flex items-center justify-center">
                  <img 
                    src={DEFAULT_ANIMAL_AVATAR} 
                    alt="Avatar học sinh (mặc định Thỏ hồng)" 
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Sticker badge at bottom corner */}
                <div className="absolute bottom-0 right-2 z-30 w-9 h-9 rounded-full bg-amber-400 text-slate-900 border-2 border-white flex items-center justify-center text-sm font-black shadow-lg">
                  {currentBlock.sticker}
                </div>
              </div>

              {/* Praise Title */}
              <h3 className="text-lg sm:text-xl font-black text-amber-300 tracking-tight font-heading">
                {currentBlock.praiseTitle}
              </h3>

              {/* Praise Content */}
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                "{currentBlock.praiseContent}"
              </p>

              {/* Teacher Signature */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <span>Học sinh: <strong className="text-white">Lê Minh Anh (Lớp 3A)</strong></span>
                <span>GV: <strong className="text-amber-300">{currentBlock.teacherName && !isGenericTeacherLabel(currentBlock.teacherName) ? currentBlock.teacherName : effectiveDefaultTeacher}</strong></span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
