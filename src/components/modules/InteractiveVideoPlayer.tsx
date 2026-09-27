import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Award, 
  BookOpen, 
  HelpCircle, 
  ArrowRight, 
  Sparkles,
  Check,
  X,
  Volume2,
  VolumeX,
  Maximize,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ExploreSummaryModal, ExploreSummaryData } from './ExploreSummaryModal';
import { QuestionItem, TrueFalseStatement } from '../../types';
import { getQuestionTypeLabel } from '../../lib/constants';

const isYouTubeUrl = (url?: string) => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const getYouTubeEmbedUrl = (url?: string) => {
  if (!url) return '';
  if (url.includes('embed/')) {
    const cleanUrl = url.split('&autoplay=')[0].split('?autoplay=')[0];
    return cleanUrl.includes('?') ? `${cleanUrl}&enablejsapi=1&autoplay=1` : `${cleanUrl}?enablejsapi=1&autoplay=1`;
  }
  let videoId = '';
  if (url.includes('watch?v=')) {
    videoId = url.split('watch?v=')[1]?.split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('shorts/')) {
    videoId = url.split('shorts/')[1]?.split('?')[0];
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1` : url;
};

export interface VideoCheckpoint {
  id: string;
  timestamp: number; // in seconds
  questionText: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation: string;
  type?: string;
  question?: QuestionItem;
  matchingPairs?: { left: string; right: string; match?: string }[];
  classificationGroups?: string[];
  classificationItems?: { name: string; group: string }[];
  statements?: TrueFalseStatement[];
  imageUrl?: string;
  imagePrompt?: string;
}

interface InteractiveVideoPlayerProps {
  videoUrl?: string;
  title?: string;
  coreSummary?: string;
  checkpoints?: VideoCheckpoint[];
  onComplete?: (summaryData?: ExploreSummaryData) => void;
  onRestart?: () => void;
}

export const InteractiveVideoPlayer: React.FC<InteractiveVideoPlayerProps> = ({
  videoUrl = 'https://www.youtube.com/watch?v=UF8o89k1g8g',
  title = 'Video Khám Phá Kiến Thức Tương Tác',
  coreSummary = 'Học sinh nắm vững các khái niệm trọng tâm, quan sát thí nghiệm mô phỏng và liên hệ thực tế.',
  checkpoints = [],
  onComplete,
  onRestart
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playerState, setPlayerState] = useState<'playing' | 'paused-for-question' | 'showing-feedback' | 'ended' | 'showing-summary'>('playing');
  
  const [currentTime, setCurrentTime] = useState<number>(0);
  const maxCpTime = checkpoints.length > 0 ? Math.max(...checkpoints.map(cp => cp.timestamp)) : 0;
  // NGUYÊN NHÂN 1: Use a robust full-length video duration (at least 21 mins / 1293s or maxCpTime + 300s) so timeline doesn't finish prematurely
  const [duration, setDuration] = useState<number>(Math.max(1293, maxCpTime + 300));
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Active question state
  const [activeCheckpoint, setActiveCheckpoint] = useState<VideoCheckpoint | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<number[]>([]);
  const [selectedTFAnswers, setSelectedTFAnswers] = useState<Record<number, boolean>>({});
  const [typedFillAnswer, setTypedFillAnswer] = useState<string>('');
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [matchingAnswers, setMatchingAnswers] = useState<Record<number, string>>({});
  const [classificationAnswers, setClassificationAnswers] = useState<Record<number, string>>({});
  const [essayText, setEssayText] = useState<string>('');
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // Tracking answers for summary
  const [answeredCheckpoints, setAnsweredCheckpoints] = useState<Record<string, { selected: any; correct: boolean; question: VideoCheckpoint }>>({});
  const [attemptedTimestamps, setAttemptedTimestamps] = useState<number[]>([]);

  // Timer effect to increment currentTime and check checkpoints when playing (supports YouTube iframe and general playback)
  useEffect(() => {
    let timer: any;
    if (isPlaying && playerState === 'playing') {
      timer = setInterval(() => {
        setCurrentTime(prev => {
          const nextTime = prev + 0.5;
          if (nextTime >= duration) {
            const allAnswered = checkpoints.length === 0 || Object.keys(answeredCheckpoints).length >= checkpoints.length;
            if (allAnswered) {
              setPlayerState('showing-summary');
              setIsPlaying(false);
            } else {
              setPlayerState('paused-for-question');
              setIsPlaying(false);
            }
            return duration;
          }

          // Check if any checkpoint is reached
          const targetCheckpoint = checkpoints.find(cp =>
            nextTime >= cp.timestamp &&
            !answeredCheckpoints[cp.id] &&
            activeCheckpoint?.id !== cp.id &&
            Math.abs(nextTime - cp.timestamp) < 1.2
          );

          if (targetCheckpoint) {
            if (videoRef.current) {
              videoRef.current.pause();
            }
            if (iframeRef.current && iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
                '*'
              );
            }
            setIsPlaying(false);
            setActiveCheckpoint(targetCheckpoint);
            setPlayerState('paused-for-question');

            // Reset answer states
            setSelectedOptionIndex(null);
            setSelectedMultiOptions([]);
            setSelectedTFAnswers({});
            setTypedFillAnswer('');
            setOrderedItems(targetCheckpoint.options ? [...targetCheckpoint.options] : []);
            setMatchingAnswers({});
            setClassificationAnswers({});
            setEssayText('');
            setIsAnswerCorrect(null);
          }

          return nextTime;
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playerState, duration, checkpoints, answeredCheckpoints, activeCheckpoint]);

  // Initialize or handle video metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 40);
    }
  };

  // Time update handler with checkpoint detection & anti-seeking enforcement
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Check if player is currently in normal playing state
    if (playerState === 'playing') {
      const targetCheckpoint = checkpoints.find(cp => 
        time >= cp.timestamp && 
        !answeredCheckpoints[cp.id] &&
        activeCheckpoint?.id !== cp.id &&
        Math.abs(time - cp.timestamp) < 1.5
      );

      if (targetCheckpoint) {
        if (videoRef.current) videoRef.current.pause();
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
            '*'
          );
        }
        setIsPlaying(false);
        setActiveCheckpoint(targetCheckpoint);
        setPlayerState('paused-for-question');
        
        // Reset answer states
        setSelectedOptionIndex(null);
        setSelectedMultiOptions([]);
        setSelectedTFAnswers({});
        setTypedFillAnswer('');
        setOrderedItems(targetCheckpoint.options ? [...targetCheckpoint.options] : []);
        setMatchingAnswers({});
        setClassificationAnswers({});
        setEssayText('');
        setIsAnswerCorrect(null);
      }
    }
  };

  // Handle seeking / scrubbing protection (anti-skipping uncompleted checkpoints)
  const handleSeeking = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;

    // Find first unanswered checkpoint before target seek time
    const uncompletedCp = checkpoints.find(cp => 
      cp.timestamp < time && !answeredCheckpoints[cp.id]
    );

    if (uncompletedCp) {
      // Force rewind to checkpoint timestamp so student cannot skip questions
      videoRef.current.currentTime = uncompletedCp.timestamp;
    }
  };

  // Move ordering item up/down
  const moveOrderItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= orderedItems.length) return;
    const newItems = [...orderedItems];
    const item = newItems.splice(fromIdx, 1)[0];
    newItems.splice(toIdx, 0, item);
    setOrderedItems(newItems);
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!activeCheckpoint) return;
    const qType = activeCheckpoint.type || activeCheckpoint.question?.type || (activeCheckpoint as any).questionType || 'multiple_choice';
    const cpOptions = activeCheckpoint.options || activeCheckpoint.question?.options || [];
    const cpStatements = activeCheckpoint.statements || activeCheckpoint.question?.statements || [];
    const cpMatchingPairs = activeCheckpoint.matchingPairs || activeCheckpoint.question?.matchingPairs || [];
    const cpClassItems = activeCheckpoint.classificationItems || activeCheckpoint.question?.classificationItems || [];
    let correct = false;

    if (qType === 'multiple_choice') {
      if (selectedOptionIndex === null) return;
      correct = selectedOptionIndex === (activeCheckpoint.correctIndex ?? 0);
    } else if (qType === 'multiple_response') {
      if (selectedMultiOptions.length === 0) return;
      const correctIndices = (activeCheckpoint.correctAnswer || activeCheckpoint.question?.correctAnswer || 'A')
        .split('')
        .map(c => c.charCodeAt(0) - 65)
        .sort();
      const userIndices = [...selectedMultiOptions].sort();
      correct = JSON.stringify(correctIndices) === JSON.stringify(userIndices);
    } else if (qType === 'true_false') {
      const stmts = cpStatements;
      if (Object.keys(selectedTFAnswers).length < stmts.length) return;
      correct = stmts.every((s, idx) => selectedTFAnswers[idx] === s.isCorrect);
    } else if (qType === 'fill_blank') {
      if (!typedFillAnswer.trim()) return;
      const targetAns = (activeCheckpoint.correctAnswer || activeCheckpoint.question?.correctAnswer || '').toLowerCase().trim();
      correct = typedFillAnswer.toLowerCase().trim() === targetAns;
    } else if (qType === 'ordering') {
      const originalOptions = cpOptions;
      correct = JSON.stringify(orderedItems) === JSON.stringify(originalOptions);
    } else if (qType === 'matching') {
      const pairs = cpMatchingPairs;
      correct = pairs.every((p, idx) => matchingAnswers[idx] === p.right);
    } else if (qType === 'classification') {
      const items = cpClassItems;
      correct = items.every((item, idx) => classificationAnswers[idx] === item.group);
    } else if (qType === 'essay') {
      if (!essayText.trim()) return;
      correct = true; // Essay is accepted upon submission
    }

    let selectedData: any = selectedOptionIndex;
    if (qType === 'multiple_response') selectedData = selectedMultiOptions;
    else if (qType === 'true_false') selectedData = selectedTFAnswers;
    else if (qType === 'fill_blank') selectedData = typedFillAnswer;
    else if (qType === 'ordering') selectedData = orderedItems;
    else if (qType === 'matching') selectedData = matchingAnswers;
    else if (qType === 'classification') selectedData = classificationAnswers;
    else if (qType === 'essay') selectedData = essayText;

    setIsAnswerCorrect(correct);
    setAnsweredCheckpoints(prev => ({
      ...prev,
      [activeCheckpoint.id]: {
        selected: selectedData,
        correct,
        question: activeCheckpoint
      }
    }));

    setPlayerState('showing-feedback');
  };

  // Continue video after feedback
  const handleContinueVideo = () => {
    const resumeTime = activeCheckpoint ? activeCheckpoint.timestamp + 0.3 : currentTime;
    const answeredCount = Object.keys(answeredCheckpoints).length;
    const totalAnswered = answeredCheckpoints[activeCheckpoint?.id || ''] ? answeredCount : answeredCount + 1;
    const allAnswered = checkpoints.length === 0 || totalAnswered >= checkpoints.length;

    setActiveCheckpoint(null);
    setSelectedOptionIndex(null);
    setSelectedMultiOptions([]);
    setSelectedTFAnswers({});
    setTypedFillAnswer('');
    setOrderedItems([]);
    setMatchingAnswers({});
    setClassificationAnswers({});
    setEssayText('');
    setIsAnswerCorrect(null);

    // Only show summary modal if BOTH resumeTime >= duration AND all checkpoints are answered.
    // If questions are answered early (resumeTime < duration), video continues playing normally!
    if (resumeTime >= duration && allAnswered) {
      setPlayerState('showing-summary');
      setIsPlaying(false);
      setCurrentTime(duration);
    } else {
      setPlayerState('playing');
      if (videoRef.current) {
        videoRef.current.currentTime = resumeTime;
        setCurrentTime(resumeTime);
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        setCurrentTime(resumeTime);
        setIsPlaying(true);
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
            '*'
          );
        }
      }
    }
  };

  // Handle video end
  const handleVideoEnded = () => {
    const allAnswered = checkpoints.length === 0 || Object.keys(answeredCheckpoints).length >= checkpoints.length;
    if (allAnswered) {
      setPlayerState('showing-summary');
      setIsPlaying(false);
    } else {
      setIsPlaying(false);
    }
  };

  // Restart learning
  const handleRestartExplore = () => {
    setAnsweredCheckpoints({});
    setAttemptedTimestamps([]);
    setActiveCheckpoint(null);
    setSelectedOptionIndex(null);
    setSelectedMultiOptions([]);
    setSelectedTFAnswers({});
    setTypedFillAnswer('');
    setOrderedItems([]);
    setMatchingAnswers({});
    setClassificationAnswers({});
    setEssayText('');
    setIsAnswerCorrect(null);
    setCurrentTime(0);
    setPlayerState('playing');
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
        '*'
      );
    }
    setIsPlaying(true);
    if (onRestart) onRestart();
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (playerState === 'paused-for-question' || playerState === 'showing-feedback') return;

      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else if (iframeRef.current && iframeRef.current.contentWindow) {
      if (isPlaying) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
          '*'
        );
        setIsPlaying(false);
      } else {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
          '*'
        );
        setIsPlaying(true);
      }
    }
  };

  const totalQuestions = checkpoints.length;
  const correctAnswersCount = Object.values(answeredCheckpoints).filter(a => a.correct).length;
  const incorrectAnswers = Object.values(answeredCheckpoints).filter(a => !a.correct);

  return (
    <div className="space-y-6">
      {/* VIDEO CONTAINER */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 group">
        {isYouTubeUrl(videoUrl) ? (
          <iframe
            ref={iframeRef}
            key={videoUrl}
            src={getYouTubeEmbedUrl(videoUrl)}
            className="w-full aspect-video bg-black border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video object-cover bg-black"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onEnded={handleVideoEnded}
            playsInline
            onClick={togglePlayPause}
          />
        )}

        {/* CUSTOM VIDEO CONTROLS OVERLAY (when playing normally) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 sm:p-6 opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-end space-y-3">
          
          {/* Timeline bar with checkpoint markers */}
          <div className="relative w-full h-3 bg-slate-800/80 rounded-full cursor-pointer overflow-hidden group/bar">
            {/* Progress filled */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full pointer-events-none"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />

            {/* Checkpoint marker dots */}
            {checkpoints.map((cp) => {
              const leftPct = duration > 0 ? (cp.timestamp / duration) * 100 : 0;
              const isAnswered = answeredCheckpoints[cp.id];
              return (
                <div
                  key={cp.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current && !isYouTubeUrl(videoUrl)) {
                      videoRef.current.currentTime = cp.timestamp;
                      setCurrentTime(cp.timestamp);
                    } else {
                      setCurrentTime(cp.timestamp);
                    }
                    if (!isAnswered) {
                      if (videoRef.current) videoRef.current.pause();
                      setIsPlaying(false);
                      setActiveCheckpoint(cp);
                      setPlayerState('paused-for-question');
                      setSelectedOptionIndex(null);
                      setSelectedMultiOptions([]);
                      setSelectedTFAnswers({});
                      setTypedFillAnswer('');
                      setOrderedItems(cp.options ? [...cp.options] : []);
                      setMatchingAnswers({});
                      setClassificationAnswers({});
                      setEssayText('');
                      setIsAnswerCorrect(null);
                    }
                  }}
                  className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 transition-all z-10 flex items-center justify-center shadow-md cursor-pointer hover:scale-125 ${
                    isAnswered 
                      ? 'bg-emerald-500 border-white text-white' 
                      : 'bg-amber-400 border-slate-900 animate-pulse'
                  }`}
                  style={{ left: `${leftPct}%`, marginLeft: '-10px' }}
                  title={`Mốc câu hỏi (${Math.floor(cp.timestamp / 60)}:${Math.floor(cp.timestamp % 60).toString().padStart(2, '0')}) - Bấm để làm câu hỏi`}
                >
                  <span className="text-[10px] font-bold">{isAnswered ? '✓' : '•'}</span>
                </div>
              );
            })}
          </div>

          {/* Control buttons bar */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayPause}
                disabled={playerState === 'paused-for-question' || playerState === 'showing-feedback'}
                className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
              >
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white fill-white" />}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    handleRestartExplore();
                  }
                }}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
                title="Xem lại từ đầu"
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>

              <div className="text-xs font-mono text-slate-300">
                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold bg-purple-500/30 border border-purple-400/40 px-3 py-1 rounded-full text-purple-200">
                🎯 {Object.keys(answeredCheckpoints).length}/{totalQuestions} câu hỏi hoàn thành
              </span>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* OVERLAY 1: PAUSED FOR QUESTION (SUPPORTING ALL 8 QUESTION TYPES) */}
        {playerState === 'paused-for-question' && activeCheckpoint && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md z-30 flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 text-white my-auto max-h-[90vh] overflow-y-auto">
              
              {(() => {
                const qType = activeCheckpoint.type || activeCheckpoint.question?.type || (activeCheckpoint as any).questionType || 'multiple_choice';
                const cpOptions = activeCheckpoint.options || activeCheckpoint.question?.options || [];
                const cpStatements = activeCheckpoint.statements || activeCheckpoint.question?.statements || [];
                const cpMatchingPairs = activeCheckpoint.matchingPairs || activeCheckpoint.question?.matchingPairs || [];
                const cpClassGroups = activeCheckpoint.classificationGroups || activeCheckpoint.question?.classificationGroups || [];
                const cpClassItems = activeCheckpoint.classificationItems || activeCheckpoint.question?.classificationItems || [];
                const cpContent = activeCheckpoint.questionText || activeCheckpoint.question?.content || '';

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4" /> CÂU HỎI TƯƠNG TÁC TẠI MỐC
                        </span>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {getQuestionTypeLabel(qType)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        ⏱️ {Math.floor(activeCheckpoint.timestamp / 60)}:{Math.floor(activeCheckpoint.timestamp % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-relaxed">
                        {cpContent}
                      </h3>
                    </div>

                    {activeCheckpoint.imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black/40 max-h-48 flex items-center justify-center">
                        <img src={activeCheckpoint.imageUrl} alt="Hình ảnh câu hỏi" className="max-h-48 object-contain" />
                      </div>
                    )}

                    {/* DYNAMIC FORM 1: MULTIPLE CHOICE */}
                    {qType === 'multiple_choice' && cpOptions.length > 0 && (
                      <div className="space-y-3">
                        {cpOptions.map((opt, idx) => {
                          const isSelected = selectedOptionIndex === idx;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedOptionIndex(idx)}
                              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-xs sm:text-sm font-medium ${
                                isSelected
                                  ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-md shadow-purple-900/40'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 border ${
                                isSelected 
                                  ? 'bg-purple-500 text-white border-purple-400' 
                                  : 'bg-slate-700 text-slate-300 border-slate-600'
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <span className="flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* DYNAMIC FORM 2: MULTIPLE RESPONSE */}
                    {qType === 'multiple_response' && cpOptions.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs text-purple-300 font-semibold">Chọn tất cả các đáp án đúng:</div>
                        {cpOptions.map((opt, idx) => {
                          const isChecked = selectedMultiOptions.includes(idx);
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedMultiOptions(selectedMultiOptions.filter(i => i !== idx));
                                } else {
                                  setSelectedMultiOptions([...selectedMultiOptions, idx]);
                                }
                              }}
                              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-xs sm:text-sm font-medium ${
                                isChecked
                                  ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-md'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 border ${
                                isChecked ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-700 text-slate-300 border-slate-600'
                              }`}>
                                {isChecked ? '✓' : ''}
                              </div>
                              <span className="flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* DYNAMIC FORM 3: TRUE / FALSE */}
                    {qType === 'true_false' && cpStatements.length > 0 && (
                      <div className="space-y-3">
                        {cpStatements.map((stmt, sIdx) => {
                          const currentAns = selectedTFAnswers[sIdx];
                          return (
                            <div key={sIdx} className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3">
                              <span className="text-xs sm:text-sm text-slate-200">{stmt.statement}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTFAnswers({ ...selectedTFAnswers, [sIdx]: true })}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    currentAns === true ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                  }`}
                                >
                                  Đúng
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTFAnswers({ ...selectedTFAnswers, [sIdx]: false })}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    currentAns === false ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                  }`}
                                >
                                  Sai
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* DYNAMIC FORM 4: FILL IN THE BLANK */}
                    {qType === 'fill_blank' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">Nhập câu trả lời ngắn của bạn:</label>
                        <input
                          type="text"
                          value={typedFillAnswer}
                          onChange={(e) => setTypedFillAnswer(e.target.value)}
                          placeholder="Nhập từ hoặc cụm từ trả lời..."
                          className="w-full p-4 bg-slate-800 border border-purple-500/40 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}

                    {/* DYNAMIC FORM 5: ORDERING */}
                    {qType === 'ordering' && (
                      <div className="space-y-2">
                        <div className="text-xs text-purple-300 font-semibold">Sắp xếp các bước theo đúng thứ tự (Dùng nút mũi tên để di chuyển):</div>
                        <div className="space-y-2">
                          {orderedItems.map((item, idx) => (
                            <div key={idx} className="p-3 bg-slate-800/90 border border-slate-700 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-slate-200">{item}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveOrderItem(idx, idx - 1)}
                                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === orderedItems.length - 1}
                                  onClick={() => moveOrderItem(idx, idx + 1)}
                                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC FORM 6: MATCHING */}
                    {qType === 'matching' && cpMatchingPairs.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs text-purple-300 font-semibold">Nối các cặp tương ứng:</div>
                        <div className="space-y-2">
                          {cpMatchingPairs.map((pair, pIdx) => (
                            <div key={pIdx} className="p-3 bg-slate-800/90 border border-slate-700 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                              <span className="font-bold text-indigo-300 flex-1">{pair.left}</span>
                              <span className="text-slate-500 hidden sm:inline">↔</span>
                              <select
                                value={matchingAnswers[pIdx] || ''}
                                onChange={(e) => setMatchingAnswers({ ...matchingAnswers, [pIdx]: e.target.value })}
                                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                              >
                                <option value="">-- Chọn ghép nối tương ứng --</option>
                                {cpMatchingPairs.map((p, optIdx) => (
                                  <option key={optIdx} value={p.right}>{p.right}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC FORM 7: CLASSIFICATION */}
                    {qType === 'classification' && cpClassItems.length > 0 && cpClassGroups.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs text-purple-300 font-semibold">Phân loại từng mục vào nhóm thích hợp:</div>
                        <div className="space-y-2">
                          {cpClassItems.map((item, iIdx) => (
                            <div key={iIdx} className="p-3 bg-slate-800/90 border border-slate-700 rounded-2xl flex items-center justify-between gap-3 text-xs">
                              <span className="text-slate-200 font-medium">{item.name}</span>
                              <select
                                value={classificationAnswers[iIdx] || ''}
                                onChange={(e) => setClassificationAnswers({ ...classificationAnswers, [iIdx]: e.target.value })}
                                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
                              >
                                <option value="">-- Chọn nhóm --</option>
                                {cpClassGroups.map((grp, gIdx) => (
                                  <option key={gIdx} value={grp}>{grp}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC FORM 8: ESSAY */}
                    {qType === 'essay' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">Nhập câu trả lời tự luận của bạn:</label>
                        <textarea
                          rows={4}
                          value={essayText}
                          onChange={(e) => setEssayText(e.target.value)}
                          placeholder="Trình bày suy nghĩ, lập luận hoặc câu trả lời của bạn..."
                          className="w-full p-4 bg-slate-800 border border-purple-500/40 rounded-2xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSubmitAnswer}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <span>Xác nhận trả lời</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                );
              })()}

            </div>
          </div>
        )}

        {/* OVERLAY 2: SHOWING FEEDBACK */}
        {playerState === 'showing-feedback' && activeCheckpoint && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
            <div className={`bg-slate-900 border rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 text-white ${
              isAnswerCorrect ? 'border-emerald-500/50' : 'border-rose-500/50'
            }`}>
              
              <div className="flex items-center gap-3">
                {isAnswerCorrect ? (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <XCircle className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <h3 className={`text-lg font-extrabold ${isAnswerCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isAnswerCorrect ? '🎉 Chính xác tuyệt vời!' : '❌ Chưa chính xác!'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAnswerCorrect ? 'Bạn đã nắm vững kiến thức mốc này.' : 'Hãy xem lời giải thích chi tiết dưới đây để hiểu rõ hơn nhé.'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">💡 Giải thích chi tiết</span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                  {activeCheckpoint.explanation}
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleContinueVideo}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Tiếp tục xem video</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* OVERLAY 3: SUMMARY MODAL ("CỬA SỔ GHI NHỚ") */}
        {playerState === 'showing-summary' && (
          <ExploreSummaryModal
            title={title}
            checkpoints={checkpoints}
            answeredCheckpoints={answeredCheckpoints}
            coreSummary={coreSummary || 'Nắm vững lý thuyết cốt lõi, quan sát mô hình trực quan và hoàn thành các mốc tương tác bài học.'}
            onReplay={handleRestartExplore}
            onComplete={(summaryData) => {
              if (onComplete) onComplete(summaryData);
            }}
          />
        )}

      </div>
    </div>
  );
};
