import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Eye, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ArrowLeft, 
  Bookmark, 
  Award,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Lesson5EPlan, UserRole } from '../../types';
import { getSubjectColorStyles } from '../../utils/subjectColors';
import { InteractiveVideoPlayer } from './InteractiveVideoPlayer';
import { 
  StudentEngageView, 
  checkHasEngageVideo, 
  checkHasEngageGame 
} from './StudentEngageView';
import {
  StudentIntroView
} from './StudentIntroView';
import {
  StudentObjectivesView
} from './StudentObjectivesView';
import {
  StudentElaborateView
} from './StudentElaborateView';
import {
  StudentApplyView
} from './StudentApplyView';
import {
  StudentAssessmentView
} from './StudentAssessmentView';
import { awardELearningReward } from '../../config/rewardConfig';
import {
  StudentReviewView
} from './StudentReviewView';
import {
  LessonStepKey,
  Standard5ETabKey,
  STANDARD_5E_TABS,
  mapStepToStandard5ETab,
  checkIsEngageActive,
  checkIsIntroActive,
  checkIsObjectivesActive,
  checkIsExploreActive,
  checkIsElaborateActive,
  checkIsApplyActive,
  checkIsAssessmentActive,
  checkIsReviewActive,
  getLessonFlowSteps,
  getInitialLessonStep,
  getNextStepInLessonFlow,
  getNextStepLabel,
  saveStudentLessonProgress,
  getStudentLessonProgress,
  subscribeStudentLessonProgress
} from './LessonFlowController';

interface StudentLessonModuleProps {
  lessons: Lesson5EPlan[];
  currentUserId?: string;
  currentUserName?: string;
  currentClass?: string;
}

export const StudentLessonModule: React.FC<StudentLessonModuleProps> = ({
  lessons = [],
  currentUserId = 'u-4',
  currentUserName = 'Lê Minh Anh',
  currentClass = 'Lớp 3A'
}) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson5EPlan | null>(null);
  const [activeStepTab, setActiveStepTab] = useState<LessonStepKey>('engage');
  
  useEffect(() => {
    if (selectedLesson) {
      const initialStep = getInitialLessonStep(selectedLesson);
      setActiveStepTab(initialStep);
    }
  }, [selectedLesson?.id]);

  // Realtime progress subscription for selected lesson
  const [liveProgress, setLiveProgress] = useState<any>(null);

  useEffect(() => {
    if (!selectedLesson?.id || !currentUserId) {
      setLiveProgress(null);
      return;
    }
    const unsub = subscribeStudentLessonProgress(currentUserId, selectedLesson.id, (data) => {
      setLiveProgress(data);
    });
    return () => unsub();
  }, [selectedLesson?.id, currentUserId]);

  // Record that Engage step was genuinely viewed when student opens engage, intro or objectives
  useEffect(() => {
    if (selectedLesson?.id && currentUserId && (activeStepTab === 'engage' || activeStepTab === 'intro' || activeStepTab === 'objectives')) {
      saveStudentLessonProgress(currentUserId, selectedLesson.id, { engageViewed: true });
    }
  }, [selectedLesson?.id, activeStepTab, currentUserId]);

  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`eduplay_student_completed_lessons_${currentUserId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const handleToggleComplete = (lessonId: string) => {
    const isNowComplete = !completedLessons[lessonId];
    const next = { ...completedLessons, [lessonId]: isNowComplete };
    setCompletedLessons(next);
    try {
      localStorage.setItem(`eduplay_student_completed_lessons_${currentUserId}`, JSON.stringify(next));
    } catch {}

    if (isNowComplete && selectedLesson) {
      const prog = getStudentLessonProgress(currentUserId, selectedLesson.id) || {};
      const evalScore = prog?.assessment?.testScore;
      awardELearningReward(currentUserId, selectedLesson.id, selectedLesson.title, evalScore);
    }
  };

  // If viewing a specific lesson in interactive 5E mode
  if (selectedLesson) {
    const isCompleted = completedLessons[selectedLesson.id] || false;
    const flowSteps = getLessonFlowSteps(selectedLesson);
    const savedProgress = liveProgress || getStudentLessonProgress(currentUserId, selectedLesson.id) || {};

    return (
      <div className="space-y-6 pb-12 w-full animate-in fade-in duration-200">
        
        {/* Top bar with back button & status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedLesson(null)}
              className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer font-bold border border-slate-200 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-3 py-0.5 rounded-full border border-indigo-100">
                  {selectedLesson.subject}
                </span>
                <span className="bg-purple-50 text-purple-700 text-[10px] font-extrabold px-3 py-0.5 rounded-full border border-purple-100">
                  {selectedLesson.grade}
                </span>
                <span className="text-xs text-slate-500 font-medium">Lớp: {currentClass}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                {selectedLesson.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleToggleComplete(selectedLesson.id)}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                isCompleted
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompleted ? 'Đã hoàn thành bài học ✓' : 'Đánh dấu hoàn thành 100%'}</span>
            </button>
          </div>
        </div>

        {/* Standard 5E Navigation Bar (5 Bước Chuẩn 5E) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {STANDARD_5E_TABS.map((tab) => {
            const currentStandardTab = mapStepToStandard5ETab(activeStepTab);
            const isActive = currentStandardTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveStepTab(tab.key)}
                className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between space-y-2 ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Bước {tab.stepNumber}
                  </span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold truncate">{tab.label}</h4>
                  <p className={`text-[11px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {tab.badge}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step Content Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          {activeStepTab === 'engage' && (
            <StudentEngageView
              lesson={selectedLesson}
              onNavigateToNext={() => setActiveStepTab(getNextStepInLessonFlow('engage', selectedLesson))}
              nextStepLabel={getNextStepLabel('engage', selectedLesson)}
            />
          )}

          {activeStepTab === 'intro' && (
            <StudentIntroView
              lesson={selectedLesson}
              onNavigateToNext={() => setActiveStepTab(getNextStepInLessonFlow('intro', selectedLesson))}
              nextStepLabel={getNextStepLabel('intro', selectedLesson)}
            />
          )}

          {activeStepTab === 'objectives' && (
            <StudentObjectivesView
              lesson={selectedLesson}
              onNavigateToNext={() => setActiveStepTab(getNextStepInLessonFlow('objectives', selectedLesson))}
            />
          )}

          {activeStepTab === 'explore' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{selectedLesson.stepExplore?.title || 'Khám phá'}</h3>
                  <p className="text-xs text-slate-500">{selectedLesson.stepExplore?.subtitle || 'Xây dựng khái niệm mới'}</p>
                </div>
              </div>

              {/* Interactive Video Player */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Video Bài Giảng Tương Tác & Trả Lời Câu Hỏi Mốc
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Xem kỹ video và trả lời câu hỏi dừng hình để mở khóa hoàn thành</span>
                </div>
                <InteractiveVideoPlayer 
                  videoUrl={(selectedLesson.stepExplore as any)?.videoUrl || 'https://www.youtube.com/watch?v=UF8o89k1g8g'}
                  checkpoints={(selectedLesson.stepExplore as any)?.checkpoints || []}
                  title={selectedLesson.title}
                  coreSummary={selectedLesson.stepExplore?.objectives || 'Học sinh nắm vững các khái niệm trọng tâm, quan sát thí nghiệm mô phỏng và liên hệ thực tế.'}
                  onComplete={(summaryData) => {
                    const accuracy = typeof summaryData?.accuracy === 'number' ? summaryData.accuracy : 100;
                    saveStudentLessonProgress(currentUserId, selectedLesson.id, { 
                      exploreCompleted: true,
                      exploreAccuracy: accuracy
                    });
                    setActiveStepTab(getNextStepInLessonFlow('explore', selectedLesson));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-xs font-extrabold text-purple-600 uppercase tracking-wider">🎯 Kiến thức cốt lõi</span>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {selectedLesson.stepExplore?.objectives || 'Nắm vững lý thuyết trọng tâm và quy luật của chủ đề.'}
                  </p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-xs font-extrabold text-purple-600 uppercase tracking-wider">📚 Nhiệm vụ học tập</span>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {selectedLesson.stepExplore?.studentActivities || 'Đọc tài liệu, quan sát video bài giảng và hoàn thành phiếu học tập.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeStepTab === 'elaborate' && (
            <StudentElaborateView
              lesson={selectedLesson}
              onNavigateToNext={() => {
                setActiveStepTab(getNextStepInLessonFlow('elaborate', selectedLesson));
              }}
              nextStepLabel={getNextStepLabel('elaborate', selectedLesson)}
              savedData={savedProgress.elaborate}
              onSaveProgress={(data) => {
                saveStudentLessonProgress(currentUserId, selectedLesson.id, { elaborate: data });
              }}
            />
          )}

          {activeStepTab === 'apply' && (
            <StudentApplyView
              lesson={selectedLesson}
              currentUserName={currentUserName}
              currentClass={currentClass}
              onNavigateToNext={() => {
                setActiveStepTab(getNextStepInLessonFlow('apply', selectedLesson));
              }}
              nextStepLabel={getNextStepLabel('apply', selectedLesson)}
              savedData={savedProgress.apply}
              onSaveProgress={(data) => {
                saveStudentLessonProgress(currentUserId, selectedLesson.id, { apply: data });
              }}
            />
          )}

          {activeStepTab === 'assessment' && (
            <StudentAssessmentView
              lesson={selectedLesson}
              onNavigateToNext={() => {
                setActiveStepTab(getNextStepInLessonFlow('assessment', selectedLesson));
              }}
              nextStepLabel={getNextStepLabel('assessment', selectedLesson)}
              savedData={savedProgress.assessment}
              onSaveProgress={(data) => {
                saveStudentLessonProgress(currentUserId, selectedLesson.id, { assessment: data });
              }}
            />
          )}

          {activeStepTab === 'review' && (() => {
            const engageViewed = Boolean(savedProgress?.engageViewed);

            const exploreAccuracy = typeof savedProgress?.exploreAccuracy === 'number'
              ? savedProgress.exploreAccuracy
              : (savedProgress?.exploreCompleted ? 100 : null);

            const elaborateScore = typeof savedProgress?.elaborate?.score === 'number'
              ? savedProgress.elaborate.score
              : (typeof savedProgress?.elaborate?.practiceScore === 'number'
                  ? savedProgress.elaborate.practiceScore
                  : null);

            const applySubmitted = Boolean(
              savedProgress?.apply?.isCompleted || 
              savedProgress?.apply?.isSubmitted || 
              savedProgress?.apply?.submittedQuestions
            );

            const assessmentScore = typeof savedProgress?.assessment?.testScore === 'number'
              ? savedProgress.assessment.testScore
              : (typeof savedProgress?.assessment?.score === 'number'
                  ? savedProgress.assessment.score
                  : null);

            // Calculate strictly real total score based on genuine completed score steps
            const scoredItems: number[] = [];
            if (typeof exploreAccuracy === 'number') scoredItems.push(exploreAccuracy);
            if (typeof elaborateScore === 'number') scoredItems.push(elaborateScore * 10);
            if (typeof assessmentScore === 'number') scoredItems.push(assessmentScore * 10);

            const overallScore = scoredItems.length > 0
              ? Math.round(scoredItems.reduce((a, b) => a + b, 0) / scoredItems.length)
              : null;

            const teacherName = selectedLesson.authorName || 'Cô Trần Thị Diễm Hương';

            return (
              <StudentReviewView
                lesson={selectedLesson}
                currentUserName={currentUserName}
                currentClass={currentClass}
                teacherName={teacherName}
                overallResults={{
                  engageViewed,
                  exploreAccuracy,
                  exploreCompleted: Boolean(savedProgress?.exploreCompleted),
                  elaborateScore,
                  applySubmitted,
                  assessmentScore,
                  overallScore
                }}
                onRestartLesson={() => {
                  setActiveStepTab(getInitialLessonStep(selectedLesson));
                }}
                onBackToList={() => setSelectedLesson(null)}
              />
            );
          })()}
        </div>

      </div>
    );
  }

  // LIST VIEW FOR ALL AVAILABLE 5E LESSONS
  return (
    <div className="space-y-6 pb-12 w-full">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-amber-300/40">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/15 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white/25 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs border border-white/30">
                  Bài Giảng Tương Tác 5E 🌟
                </span>
                <span className="text-amber-100 text-xs font-semibold">{currentUserName} ({currentClass})</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading mt-1">Bài Giảng Tương Tác 5E</h1>
              <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Khám phá các bài giảng chuẩn mô hình 5E: Khởi động → Khám phá → Luyện tập → Vận dụng → Đánh giá → Vinh danh!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LESSONS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map((lesson) => {
          const isDone = completedLessons[lesson.id] || false;
          const subjColor = getSubjectColorStyles(lesson.subject);
          return (
            <div
              key={lesson.id}
              className={`bg-white rounded-3xl border border-slate-200 ${subjColor.cardBorderHover} shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4 group`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase ${subjColor.badgeClass}`}>
                      {lesson.subject || subjColor.name}
                    </span>
                    <span className="bg-purple-50 text-purple-700 text-[10px] font-extrabold px-3 py-1 rounded-full border border-purple-100">
                      {lesson.grade}
                    </span>
                  </div>
                  {isDone ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã xong
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Chưa hoàn thành</span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {lesson.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {lesson.topic || 'Bài học 5E chuẩn giúp phát triển tư duy và năng lực học sinh.'}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {lesson.duration || '35 phút'}
                  </span>
                  <span>•</span>
                  <span>GV: {lesson.authorName || 'Giáo viên'}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedLesson(lesson);
                  setActiveStepTab(getInitialLessonStep(lesson));
                }}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-extrabold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>{isDone ? 'Học lại bài giảng' : 'Bắt đầu học ngay'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
