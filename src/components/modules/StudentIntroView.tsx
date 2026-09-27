import React from 'react';
import { Play, Sparkles, ArrowRight, Video, FileText } from 'lucide-react';
import { Lesson5EPlan } from '../../types';
import { extractYouTubeId, isDirectVideoUrl } from './StudentEngageView';

// Check if Intro is enabled and has valid content
export const checkIsIntroActive = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const isEnabled = (lesson as any).isIntroEnabled ?? true;
  if (!isEnabled) return false;
  const content = (lesson as any).introContent;
  return Boolean(content && typeof content === 'string' && content.trim() !== '');
};

interface StudentIntroViewProps {
  lesson: Lesson5EPlan;
  onNavigateToNext: () => void;
  nextStepLabel?: string;
}

export const StudentIntroView: React.FC<StudentIntroViewProps> = ({
  lesson,
  onNavigateToNext,
  nextStepLabel = 'Khám phá'
}) => {
  const introContent = (lesson as any).introContent?.trim() || '';
  const youtubeId = extractYouTubeId(introContent);
  const isDirectVideo = !youtubeId && isDirectVideoUrl(introContent);
  const isVideo = Boolean(youtubeId || isDirectVideo);

  const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&autoplay=0`
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header section */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-extrabold shrink-0 border border-rose-200/60 shadow-xs">
          🎯
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
            Giới Thiệu Bài Học
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
            Tổng Quan & Dẫn Dắt Vào Bài Học
          </h3>
        </div>
      </div>

      {/* Intro Video Preview if content is a video */}
      {youtubeEmbedUrl ? (
        <div className="rounded-2xl overflow-hidden border border-rose-200 bg-black aspect-video max-w-3xl mx-auto shadow-md">
          <iframe
            src={youtubeEmbedUrl}
            title="Video giới thiệu bài"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : isDirectVideo ? (
        <div className="rounded-2xl overflow-hidden border border-rose-200 bg-black aspect-video max-w-3xl mx-auto shadow-md">
          <video
            src={introContent}
            controls
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="bg-rose-50/60 p-6 rounded-3xl border border-rose-200/80 space-y-3 max-w-3xl mx-auto shadow-xs">
          <div className="flex items-center gap-2 text-xs font-extrabold text-rose-800 uppercase tracking-wide">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span>Nội dung giới thiệu bài học:</span>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
            {introContent || 'Chào mừng các em đến với bài học hôm nay! Hãy cùng khám phá những kiến thức thú vị phía trước.'}
          </p>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="text-xs text-slate-600 font-medium">
          💡 Em đã xem xong phần giới thiệu bài học? Hãy bấm tiếp tục để bước vào phần {nextStepLabel}.
        </div>
        <button
          type="button"
          onClick={onNavigateToNext}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span>Tiếp tục bài học ({nextStepLabel})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
