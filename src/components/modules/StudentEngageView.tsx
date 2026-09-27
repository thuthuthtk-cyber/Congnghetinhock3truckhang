import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Video, 
  Gamepad2, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  RotateCcw, 
  HelpCircle,
  AlertCircle,
  Clock,
  Zap,
  Lock,
  Unlock,
  Volume2
} from 'lucide-react';
import { Lesson5EPlan } from '../../types';

// Helper to extract YouTube 11-char Video ID
export const extractYouTubeId = (rawUrl?: string): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
};

// Helper to check if URL is a direct video file
export const isDirectVideoUrl = (rawUrl?: string): boolean => {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(rawUrl.trim());
};

// Helper to extract Game URL from iframe tag or raw link
export const extractGameUrl = (raw?: string): string => {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  const srcMatch = trimmed.match(/<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (srcMatch && srcMatch[1]) {
    return srcMatch[1].trim();
  }
  return trimmed;
};

// Helper to validate HTTP/HTTPS URL
export const isValidHttpUrl = (urlStr?: string): boolean => {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const url = new URL(urlStr.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Check if lesson has valid Engage Video
export const checkHasEngageVideo = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const stepEngage = lesson.stepEngage as any;
  const rawVideo = stepEngage?.videoLink;
  if (!rawVideo || typeof rawVideo !== 'string') return false;
  return Boolean(extractYouTubeId(rawVideo) || isDirectVideoUrl(rawVideo));
};

// Check if lesson has valid Engage Game
export const checkHasEngageGame = (lesson?: Lesson5EPlan | null): boolean => {
  if (!lesson) return false;
  const stepEngage = lesson.stepEngage as any;
  const rawGame = stepEngage?.gameUrl;
  if (!rawGame || typeof rawGame !== 'string') return false;
  const cleanUrl = extractGameUrl(rawGame);
  return isValidHttpUrl(cleanUrl);
};

interface StudentEngageViewProps {
  lesson: Lesson5EPlan;
  onNavigateToNext?: () => void;
  onNavigateToExplore?: () => void;
  onCompleteEngage?: () => void;
  nextStepLabel?: string;
}

export const StudentEngageView: React.FC<StudentEngageViewProps> = ({
  lesson,
  onNavigateToNext,
  onNavigateToExplore,
  onCompleteEngage,
  nextStepLabel = 'Khám phá (Explore)'
}) => {
  const handleAdvance = onNavigateToNext || onNavigateToExplore || (() => {});
  const stepEngage = (lesson.stepEngage || {}) as any;
  const rawVideoLink = stepEngage.videoLink || '';
  const rawGameUrl = stepEngage.gameUrl || '';

  const youtubeId = extractYouTubeId(rawVideoLink);
  const isDirectVideo = !youtubeId && isDirectVideoUrl(rawVideoLink);
  const hasValidVideo = Boolean(youtubeId || isDirectVideo);

  const cleanGameUrl = extractGameUrl(rawGameUrl);
  const hasValidGame = isValidHttpUrl(cleanGameUrl);

  // Video settings from teacher configuration
  const videoSettings = stepEngage.videoSettings || {};
  const autoplay = videoSettings.autoplay ?? true;
  const requireFullWatch = videoSettings.requireFullWatch ?? false;
  const showControls = videoSettings.showControls ?? true;

  // Determine current Engage sub-stage: 'video' | 'game'
  const [currentStage, setCurrentStage] = useState<'video' | 'game'>(() => {
    if (hasValidVideo) return 'video';
    if (hasValidGame) return 'game';
    return 'video';
  });

  // State for transitions and video watch completion
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionNotice, setTransitionNotice] = useState<string>('');
  const [videoEnded, setVideoEnded] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [gameIframeError, setGameIframeError] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<any>(null);

  // Synchronize initial stage whenever lesson changes
  useEffect(() => {
    if (hasValidVideo) {
      setCurrentStage('video');
    } else if (hasValidGame) {
      setCurrentStage('game');
    }
    setVideoEnded(false);
    setIsTransitioning(false);
    setElapsedSeconds(0);
  }, [lesson.id, hasValidVideo, hasValidGame]);

  // Count seconds in video view (helps unlock fallback button safely if requireFullWatch is enabled)
  useEffect(() => {
    if (currentStage === 'video' && hasValidVideo) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [currentStage, hasValidVideo]);

  // Listen for YouTube postMessage API state change
  useEffect(() => {
    if (currentStage !== 'video' || !youtubeId) return;

    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let payload = event.data;
        if (typeof payload === 'string') {
          payload = JSON.parse(payload);
        }
        // YouTube PlayerState.ENDED is 0
        if (payload && (payload.event === 'onStateChange' || payload.info === 0)) {
          if (payload.info === 0) {
            handleVideoCompletion('auto');
          }
        }
      } catch {
        // non-json or unrelated window message
      }
    };

    window.addEventListener('message', handleWindowMessage);

    // Prompt YouTube iframe to start sending postMessages
    const handshakeTimer = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 1 }),
          '*'
        );
      }
    }, 1500);

    return () => {
      window.removeEventListener('message', handleWindowMessage);
      clearTimeout(handshakeTimer);
    };
  }, [currentStage, youtubeId]);

  // Core handler when video finishes
  const handleVideoCompletion = (source: 'auto' | 'manual') => {
    if (videoEnded || isTransitioning) return;
    setVideoEnded(true);

    if (onCompleteEngage) {
      onCompleteEngage();
    }

    // CASE A: Has both Video & Game -> auto-transition smoothly to Game / Quiz
    if (hasValidGame) {
      setIsTransitioning(true);
      setTransitionNotice('🎬 Video khởi động đã hoàn tất! Đang tự động chuyển sang Trò chơi / Quiz khởi động...');
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrentStage('game');
      }, 1400);
    } 
    // CASE B: Has only Video (No Game) -> auto-transition straight to next step!
    else {
      setIsTransitioning(true);
      setTransitionNotice(`🎬 Hoàn thành phần Khởi động! Đang chuyển tiếp sang ${nextStepLabel}...`);
      setTimeout(() => {
        setIsTransitioning(false);
        handleAdvance();
      }, 1400);
    }
  };

  // Handler for Game completion -> transition to next step
  const handleGameComplete = () => {
    if (onCompleteEngage) {
      onCompleteEngage();
    }
    setIsTransitioning(true);
    setTransitionNotice(`🎮 Đã hoàn thành trò chơi khởi động! Đang chuyển sang ${nextStepLabel}...`);
    setTimeout(() => {
      setIsTransitioning(false);
      handleAdvance();
    }, 900);
  };

  // Build YouTube Embed URL with autoplay, controls, and API enabled
  const youtubeEmbedUrl = (() => {
    if (!youtubeId) return null;
    const params = new URLSearchParams();
    params.set('enablejsapi', '1');
    params.set('rel', '0');
    params.set('modestbranding', '1');
    if (typeof window !== 'undefined' && window.location?.origin) {
      params.set('origin', window.location.origin);
    }
    if (autoplay) {
      params.set('autoplay', '1');
      params.set('mute', '1'); // Essential for browsers to allow autoplay
    } else {
      params.set('autoplay', '0');
    }
    if (!showControls) {
      params.set('controls', '0');
    } else {
      params.set('controls', '1');
    }
    return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
  })();

  // Detect platform name for display badge
  const detectedGamePlatform = (() => {
    const low = cleanGameUrl.toLowerCase();
    if (low.includes('wordwall.net')) return 'Wordwall';
    if (low.includes('quizizz.com')) return 'Quizizz';
    if (low.includes('kahoot.it') || low.includes('kahoot.com')) return 'Kahoot!';
    return 'Trò chơi tương tác';
  })();

  const guidanceText =
    stepEngage.guidanceContent ||
    stepEngage.studentActivities ||
    stepEngage.objectives ||
    'Em hãy theo dõi nội dung khởi động để chuẩn bị tâm thế bước vào bài học mới!';

  // ================== CASE D: BOTH TABS EMPTY OR NO EXTERNAL MEDIA ==================
  if (!hasValidVideo && !hasValidGame) {
    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-extrabold shrink-0 border border-amber-200/60 shadow-xs">
              1
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  Bước 1: Khởi Động
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/50">
                  Tạo hứng thú & Chuẩn bị
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                {stepEngage.title || 'Khởi động & Tạo hứng thú học tập'}
              </h3>
            </div>
          </div>
        </div>

        {/* Card nội dung khởi động */}
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-teal-500/10 rounded-3xl p-6 sm:p-8 border border-amber-500/20 text-center space-y-5 max-w-2xl mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
            <Sparkles className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Chào mừng em đến với bài học hôm nay!
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-lg mx-auto italic bg-white/90 p-4 rounded-2xl border border-amber-200/70 shadow-xs">
              "{guidanceText}"
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleAdvance}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Em đã sẵn sàng! Vào {nextStepLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section with progress badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-extrabold shrink-0 border border-amber-200/60 shadow-xs">
            1
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                Bước 1: Khởi Động
              </span>
              {hasValidVideo && hasValidGame && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50">
                  {currentStage === 'video' ? 'Phần 1/2: Video' : 'Phần 2/2: Trò chơi'}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              {stepEngage.title || 'Khởi động & Tạo hứng thú'}
            </h3>
          </div>
        </div>

        {/* Step indicator badges if both video & game exist */}
        {hasValidVideo && hasValidGame && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200/70">
            <button
              type="button"
              onClick={() => setCurrentStage('video')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentStage === 'video'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
              {videoEnded && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage('game')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentStage === 'game'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Trò chơi / Quiz</span>
            </button>
          </div>
        )}
      </div>

      {/* Smooth Transition Alert Overlay */}
      {isTransitioning && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg animate-in fade-in zoom-in-95 duration-200 flex items-center gap-3">
          <Sparkles className="w-6 h-6 shrink-0 animate-spin" />
          <div className="text-xs sm:text-sm font-bold tracking-wide">
            {transitionNotice}
          </div>
        </div>
      )}

      {/* ===================== VIEW 1: VIDEO KHỞI ĐỘNG ===================== */}
      {currentStage === 'video' && hasValidVideo && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Video Player Box */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video max-w-3xl mx-auto shadow-md">
            {youtubeEmbedUrl ? (
              <iframe
                ref={iframeRef}
                key={youtubeEmbedUrl}
                src={youtubeEmbedUrl}
                title="Video khởi động"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : isDirectVideo ? (
              <video
                src={rawVideoLink.trim()}
                controls={showControls}
                autoPlay={autoplay}
                muted={autoplay}
                onEnded={() => handleVideoCompletion('auto')}
                className="w-full h-full object-contain"
              />
            ) : null}
          </div>

          {/* Video Control & Status Bar */}
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              {requireFullWatch ? (
                <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 font-bold">
                  <Lock className="w-3.5 h-3.5" /> Bắt buộc xem hết video
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-bold">
                  <Unlock className="w-3.5 h-3.5" /> Chế độ tự do
                </span>
              )}
              {autoplay && (
                <span className="hidden sm:inline text-[11px] text-slate-400">
                  • Video tự động phát khi vào bước
                </span>
              )}
            </div>

            {/* Fallback / Skip / Next Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* If full watch is NOT required: allow skip directly */}
              {!requireFullWatch && (
                <button
                  type="button"
                  onClick={() => handleVideoCompletion('manual')}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span>
                    {hasValidGame ? 'Tiếp tục sang Trò chơi' : `Bỏ qua & Sang ${nextStepLabel}`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* If full watch is required: provide Emergency Safety Fallback button so student is NEVER trapped */}
              {requireFullWatch && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVideoCompletion('manual')}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer active:scale-98 bg-slate-700 hover:bg-slate-800 text-white shadow-xs"
                    title="Bấm nút này nếu video đã xem xong mà hệ thống chưa tự động chuyển"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {hasValidGame ? 'Đã xem xong ➔ Chơi trò chơi' : `Đã xem xong ➔ Qua ${nextStepLabel}`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== VIEW 2: TRÒ CHƠI / QUIZ ===================== */}
      {currentStage === 'game' && hasValidGame && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Game Top Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
              <Gamepad2 className="w-4 h-4 text-emerald-600" />
              <span>{detectedGamePlatform}</span>
              <span className="hidden sm:inline text-[11px] font-normal text-emerald-600">
                (Em hãy hoàn thành thử thách khởi động dưới đây)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={cleanGameUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Mở tab mới</span>
              </a>

              {/* Primary completion button to advance to next step */}
              <button
                type="button"
                onClick={handleGameComplete}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <span>Hoàn thành ➔ Sang {nextStepLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Embedded Game Iframe */}
          <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner flex items-center justify-center">
            {gameIframeError ? (
              <div className="p-8 text-center space-y-3 max-w-md bg-white rounded-2xl m-4 shadow-md border border-slate-200">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">
                  Trò chơi yêu cầu mở trong cửa sổ riêng
                </h4>
                <p className="text-xs text-slate-500">
                  Trang web trò chơi hạn chế hiển thị bên trong khung nhúng. Em hãy bấm nút bên dưới để mở trò chơi và tiếp tục học tập.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <a
                    href={cleanGameUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở trò chơi trong tab mới</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleGameComplete}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <span>Tiếp tục sang {nextStepLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                src={cleanGameUrl}
                title="Trò chơi khởi động"
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                onError={() => setGameIframeError(true)}
              />
            )}
          </div>

          {/* Bottom Call to Action for Game */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600 font-medium">
              💡 Sau khi hoàn thành trò chơi hoặc muốn bước vào bài học chính, em hãy bấm nút tiếp tục.
            </div>
            <button
              type="button"
              onClick={handleGameComplete}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Tiếp tục sang {nextStepLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Teacher Guidance Note */}
      <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200/70 space-y-1.5">
        <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
          💡 Hướng dẫn khởi động từ Thầy/Cô
        </span>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
          {guidanceText}
        </p>
      </div>
    </div>
  );
};
