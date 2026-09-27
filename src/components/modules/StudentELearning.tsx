import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ArrowLeft, 
  Award, 
  Layers, 
  GraduationCap, 
  Play, 
  Filter, 
  Search, 
  BookMarked,
  Timer,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Lesson5EPlan, Lesson5EStep } from '../../types';
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
  StudentReviewView,
  isGenericTeacherLabel,
  formatTeacherWithTitle,
  resolveTeacherForClassAndSubject
} from './StudentReviewView';
import {
  getEffectiveStudentClassAndGrade,
  isTargetingStudent
} from '../../services/studentSessionService';
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
import {
  subscribeAssignedELearningLessons,
  AssignedELearningLesson
} from '../../services/elearningAssignmentService';

interface StudentELearningProps {
  lessons: Lesson5EPlan[];
  currentUserId?: string;
  currentUserName?: string;
  currentClass?: string;
}

export const StudentELearning: React.FC<StudentELearningProps> = ({
  lessons = [],
  currentUserId,
  currentUserName,
  currentClass
}) => {
  const {
    studentClass: resolvedClass,
    studentGrade: resolvedGrade,
    studentName: resolvedName,
    studentId: resolvedId
  } = useMemo(() => {
    return getEffectiveStudentClassAndGrade(currentClass);
  }, [currentClass]);

  const effectiveUserId = currentUserId || resolvedId || 'u-4';
  const effectiveUserName = currentUserName || resolvedName || 'Học sinh';
  const effectiveClass = currentClass || resolvedClass;
  const effectiveGrade = resolvedGrade;

  const [selectedLesson, setSelectedLesson] = useState<Lesson5EPlan | null>(null);
  const [activeStepTab, setActiveStepTab] = useState<LessonStepKey>('engage');
  
  // Realtime assigned lessons
  const [assignedLessonsList, setAssignedLessonsList] = useState<AssignedELearningLesson[]>([]);

  useEffect(() => {
    const unsub = subscribeAssignedELearningLessons((items) => {
      setAssignedLessonsList(items);
    });
    return () => unsub();
  }, []);

  // Automatically initialize active tab to the first active step in the lesson flow
  useEffect(() => {
    if (selectedLesson) {
      const initialStep = getInitialLessonStep(selectedLesson);
      setActiveStepTab(initialStep);
    }
  }, [selectedLesson?.id]);

  // Realtime progress subscription for the selected lesson from Firestore / LocalStorage
  const [liveProgress, setLiveProgress] = useState<any>(null);

  useEffect(() => {
    if (!selectedLesson?.id || !effectiveUserId) {
      setLiveProgress(null);
      return;
    }
    const unsub = subscribeStudentLessonProgress(effectiveUserId, selectedLesson.id, (data) => {
      setLiveProgress(data);
    });
    return () => unsub();
  }, [selectedLesson?.id, effectiveUserId]);

  // Record that Engage step was genuinely viewed when student opens engage, intro or objectives
  useEffect(() => {
    if (selectedLesson?.id && effectiveUserId && (activeStepTab === 'engage' || activeStepTab === 'intro' || activeStepTab === 'objectives')) {
      saveStudentLessonProgress(effectiveUserId, selectedLesson.id, { engageViewed: true });
    }
  }, [selectedLesson?.id, activeStepTab, effectiveUserId]);

  // Tab filter: 'all' | 'completed' | 'not_started'
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'completed' | 'not_started'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('Tất cả môn học');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persistent student progress state
  const [lessonProgress, setLessonProgress] = useState<Record<string, { status: 'not_started' | 'in_progress' | 'completed'; progressPct: number; timeSpentMinutes: number }>>(() => {
    try {
      const saved = localStorage.getItem(`eduplay_student_elearning_progress_${effectiveUserId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const updateLessonStatus = (lessonId: string, status: 'not_started' | 'in_progress' | 'completed', pct: number) => {
    const next = {
      ...lessonProgress,
      [lessonId]: {
        status,
        progressPct: pct,
        timeSpentMinutes: (lessonProgress[lessonId]?.timeSpentMinutes || 0) + 15
      }
    };
    setLessonProgress(next);
    try {
      localStorage.setItem(`eduplay_student_elearning_progress_${effectiveUserId}`, JSON.stringify(next));
    } catch {}
  };

  // Filter assigned lessons relevant to current student class and ensure proper elearning classification
  const relevantAssignments = useMemo(() => {
    const rawList = assignedLessonsList.filter((item) => {
      const itemType = ((item as any).type || (item as any).category || (item as any).contentType || 'elearning').toLowerCase();
      if (itemType !== 'elearning' && itemType !== 'bai_giang' && itemType !== 'lesson_5e') {
        return false;
      }
      return isTargetingStudent(item.targetClass, (item as any).grade, effectiveClass, effectiveGrade);
    });

    // Semantic deduplication pass for student view: guarantees strictly 1 card per assigned lesson per class
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const uniqueList: AssignedELearningLesson[] = [];

    rawList.forEach((item) => {
      if (!item || !item.id) return;
      if (seenIds.has(item.id)) return;

      const cleanLessonId = (item.lessonId || item.id || '').trim();
      const cleanTitle = (item.title || item.lessonTitle || '')
        .toLowerCase()
        .replace(/^e-learning:\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      const cleanClass = (item.targetClass || '').toLowerCase().replace(/\s+/g, '').trim();
      const cleanDueDate = (item.dueDate || '').trim().toLowerCase();

      const semanticKey = cleanLessonId && cleanClass
        ? `les_${cleanLessonId}__cls_${cleanClass}`
        : `title_${cleanTitle}__cls_${cleanClass}__due_${cleanDueDate}`;

      if (seenKeys.has(semanticKey)) return;

      seenIds.add(item.id);
      seenKeys.add(semanticKey);
      uniqueList.push(item);
    });

    return uniqueList;
  }, [assignedLessonsList, effectiveClass, effectiveGrade]);

  // Map relevant assignments into displayable items
  const assignedDisplayItems = relevantAssignments.map((assigned) => {
    const defaultStep: Lesson5EStep = {
      title: 'Hoạt động học tập',
      subtitle: 'Khám phá và tương tác',
      objectives: 'Nắm vững kiến thức trọng tâm',
      teacherActivities: 'Hướng dẫn học sinh thao tác học liệu',
      studentActivities: 'Tương tác, trả lời câu hỏi và thực hành',
      materials: 'Tài liệu số, video tương tác'
    };

    const matchedLesson: Lesson5EPlan = lessons.find(l => l.id === assigned.lessonId) || assigned.lessonData || {
      id: assigned.lessonId || assigned.id,
      title: assigned.lessonTitle || assigned.title,
      subject: assigned.subject,
      grade: assigned.grade,
      duration: '45 phút',
      topic: assigned.title,
      authorName: (assigned.assignedBy && !isGenericTeacherLabel(assigned.assignedBy))
        ? formatTeacherWithTitle(assigned.assignedBy)
        : (resolveTeacherForClassAndSubject(effectiveClass, assigned.subject) 
            ? formatTeacherWithTitle(resolveTeacherForClassAndSubject(effectiveClass, assigned.subject)) 
            : 'Cô Trần Thị Diễm Hương'),
      createdAt: assigned.assignedAt,
      objectivesContent: 'Nắm vững kiến thức bài học và hoàn thành các bài tập tương tác',
      stepEngage: { ...defaultStep, title: '1. Gắn kết (Engage)', subtitle: 'Tạo hứng thú và kết nối bài học' },
      stepExplore: { ...defaultStep, title: '2. Khám phá (Explore)', subtitle: 'Trải nghiệm học liệu và video số' },
      stepElaborate: { ...defaultStep, title: '3. Áp dụng (Elaborate)', subtitle: 'Vận dụng thực hành bài tập tình huống' },
      stepEvaluate: { ...defaultStep, title: '4. Đánh giá (Evaluate)', subtitle: 'Củng cố kiến thức và kiểm tra nhanh' }
    };

    const progress = lessonProgress[assigned.id] || lessonProgress[matchedLesson.id] || {
      status: 'not_started' as const,
      progressPct: 0,
      timeSpentMinutes: 0
    };

    return {
      assignment: assigned,
      lesson: matchedLesson,
      status: progress.status,
      progressPct: progress.progressPct,
      timeSpentMinutes: progress.timeSpentMinutes
    };
  });

  // Filter display items
  const filteredDisplayItems = assignedDisplayItems.filter(item => {
    if (subjectFilter !== 'Tất cả môn học' && (item.assignment.subject || item.lesson.subject).toLowerCase() !== subjectFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (item.assignment.title || '').toLowerCase().includes(q);
      const lessonTitleMatch = (item.lesson.title || '').toLowerCase().includes(q);
      if (!titleMatch && !lessonTitleMatch) return false;
    }
    if (activeTabFilter === 'completed' && item.status !== 'completed') return false;
    if (activeTabFilter === 'not_started' && item.status === 'completed') return false;
    return true;
  });

  // Calculate statistics for student
  const totalLessons = assignedDisplayItems.length;
  const completedCount = assignedDisplayItems.filter(l => l.status === 'completed').length;
  const inProgressCount = assignedDisplayItems.filter(l => l.status === 'in_progress').length;
  const totalMinutesSpent = assignedDisplayItems.reduce((acc, curr) => acc + (curr.timeSpentMinutes || 0), 0);

  // Available subjects list derived from assigned lessons
  const subjectsList: string[] = Array.from(new Set(assignedDisplayItems.map(l => String(l.assignment.subject || l.lesson.subject || '')).filter(Boolean)));

  // If viewing a specific lesson in 5E interactive mode
  if (selectedLesson) {
    const currentProg = lessonProgress[selectedLesson.id] || { status: 'in_progress', progressPct: 50, timeSpentMinutes: 15 };
    const isCompleted = currentProg.status === 'completed';

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
              onClick={() => {
                const nextStatus = isCompleted ? 'in_progress' : 'completed';
                const nextPct = isCompleted ? 50 : 100;
                updateLessonStatus(selectedLesson.id, nextStatus, nextPct);
                if (!isCompleted) {
                  // Reward student with +30 Xu / +15 EXP (bonus +10 Xu if Evaluate >= 8/10, first-time only)
                  const prog = getStudentLessonProgress(currentUserId, selectedLesson.id) || {};
                  const evalScore = prog?.assessment?.testScore;
                  awardELearningReward(currentUserId, selectedLesson.id, selectedLesson.title, evalScore);
                }
              }}
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
        {(() => {
          const savedProgress = liveProgress || getStudentLessonProgress(effectiveUserId, selectedLesson.id) || {};

          return (
            <>
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
                          saveStudentLessonProgress(effectiveUserId, selectedLesson.id, { 
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
                      saveStudentLessonProgress(effectiveUserId, selectedLesson.id, { elaborate: data });
                    }}
                  />
                )}

                {activeStepTab === 'apply' && (
                  <StudentApplyView
                    lesson={selectedLesson}
                    currentUserName={effectiveUserName}
                    currentClass={effectiveClass}
                    onNavigateToNext={() => {
                      setActiveStepTab(getNextStepInLessonFlow('apply', selectedLesson));
                    }}
                    nextStepLabel={getNextStepLabel('apply', selectedLesson)}
                    savedData={savedProgress.apply}
                    onSaveProgress={(data) => {
                      saveStudentLessonProgress(effectiveUserId, selectedLesson.id, { apply: data });
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
                      saveStudentLessonProgress(effectiveUserId, selectedLesson.id, { assessment: data });
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

                  // Find corresponding assignment item to pass the actual assigning teacher's name
                  const currentItem = assignedDisplayItems.find(
                    item => item.lesson.id === selectedLesson.id || 
                            item.assignment.lessonId === selectedLesson.id || 
                            item.assignment.id === selectedLesson.id
                  );
                  const teacherName = currentItem?.assignment?.assignedBy || currentItem?.lesson?.authorName || selectedLesson.authorName;

                  return (
                    <StudentReviewView
                      lesson={selectedLesson}
                      currentUserName={effectiveUserName}
                      currentClass={effectiveClass}
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
            </>
          );
        })()}

      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-500 rounded-[28px] p-7 sm:p-9 text-white shadow-2xl relative overflow-hidden border border-amber-300/40 min-h-[170px] flex items-center">
        {/* Background Ambient Glows & Sparkles Decor */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-100 via-amber-300 to-transparent pointer-events-none" />
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-yellow-300/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-56 h-56 bg-orange-400/20 rounded-full blur-2xl pointer-events-none" />
        
        {/* Subtle background star sparkles */}
        <div className="absolute top-4 right-1/4 text-yellow-100/40 text-lg pointer-events-none select-none">✦</div>
        <div className="absolute bottom-4 left-1/4 text-amber-200/40 text-base pointer-events-none select-none">✧</div>
        <div className="absolute top-1/2 right-1/3 text-yellow-200/30 text-sm pointer-events-none select-none">★</div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full">
          {/* Left Content Area */}
          <div className="space-y-3 max-w-2xl">
            {/* Top Badges Row: Distinct separated tags */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/35 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                <span className="text-yellow-200">🌟</span> BÀI GIẢNG TƯƠNG TÁC 5E
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/30 backdrop-blur-md border border-amber-300/30 text-amber-100 text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse"></span>
                <span>Học sinh: <strong className="text-white font-extrabold">{effectiveUserName} ({effectiveClass})</strong></span>
              </span>
            </div>

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white drop-shadow-sm flex items-center gap-3">
                <span>Bài Giảng E-Learning</span>
                <span className="text-xl sm:text-2xl animate-bounce">🚀</span>
              </h1>
              <p className="text-amber-100 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
                Khám phá các bài giảng tương tác chuẩn 5E được biên soạn sinh động, tự tin học tốt mỗi ngày!
              </p>
            </div>
          </div>

          {/* Right Mascot / 5E 3D Stage (Takes ~1/4 width) */}
          <div className="hidden sm:flex items-center justify-center relative shrink-0">
            <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-3xl bg-gradient-to-tr from-white/10 via-white/25 to-yellow-300/30 backdrop-blur-md border border-white/40 shadow-2xl flex items-center justify-center relative transform hover:scale-105 transition-transform duration-300 group">
              <div className="relative flex flex-col items-center justify-center">
                <GraduationCap className="w-12 h-12 lg:w-14 lg:h-14 text-yellow-100 drop-shadow-[0_6px_16px_rgba(250,204,21,0.6)] animate-pulse" />
                
                {/* Floating Micro Badges */}
                <span className="absolute -top-3.5 -right-3.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-300 to-amber-400 text-slate-900 font-black text-[9px] shadow-md border border-yellow-100 tracking-wider">
                  5E CHUẨN 🌟
                </span>
                
                <span className="absolute -bottom-3 px-2 py-0.5 rounded-full bg-amber-900/90 text-yellow-300 font-black text-[9px] shadow-md border border-amber-400/50 backdrop-blur-xs whitespace-nowrap">
                  {totalLessons} Bài Giảng 🎬
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS & FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Simple Tab Filters */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả bài giảng ({totalLessons})
            </button>
            <button
              onClick={() => setActiveTabFilter('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'completed'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã hoàn thành ({completedCount})
            </button>
            <button
              onClick={() => setActiveTabFilter('not_started')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'not_started'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa học ({totalLessons - completedCount})
            </button>
          </div>

          {/* Search & Subject Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Môn:</span>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-transparent appearance-none pr-4 outline-none cursor-pointer font-bold text-indigo-700"
              >
                <option value="Tất cả môn học">Tất cả môn học</option>
                {subjectsList.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên bài giảng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* DANH SÁCH BÀI HỌC E-LEARNING ĐƯỢC GIAO */}
        {totalLessons === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-[#00875A] rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              <BookOpen className="w-7 h-7 text-[#00875A]" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">
              Chưa có bài giảng E-Learning nào được giao cho {effectiveClass}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Khi giáo viên giao bài học E-Learning mới cho lớp, bài giảng sẽ tự động xuất hiện ngay tại đây để em vào học tập và rèn luyện.
            </p>
          </div>
        ) : filteredDisplayItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-medium space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p>Không tìm thấy bài giảng nào phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
            {filteredDisplayItems.map((item) => (
              <div
                key={item.assignment.id}
                id={`elearn-card-${item.assignment.id}`}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Badges Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-emerald-50 text-[#00875A] border border-emerald-200/60 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        E-LEARNING
                      </span>
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        {item.assignment.subject || item.lesson.subject}
                      </span>
                      <span className="bg-slate-100 text-slate-600 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        {item.assignment.targetClass}
                      </span>
                    </div>

                    {/* Status badge */}
                    {item.status === 'completed' ? (
                      <span className="bg-emerald-50 text-[#00875A] border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-[#00875A]" />
                        <span>Đã xong</span>
                      </span>
                    ) : item.status === 'in_progress' ? (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Đang học</span>
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <span>Chưa học</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#00875A] transition-colors line-clamp-2 leading-snug">
                    {item.assignment.title}
                  </h3>

                  {/* Topic */}
                  <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                    {item.lesson.topic || item.assignment.lessonTitle}
                  </p>

                  {/* Deadline & Author metadata */}
                  <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Hạn nộp: <strong className="text-slate-700">{item.assignment.dueDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">👤</span>
                      <span>
                        Giao bởi:{' '}
                        <span className="text-slate-700 font-semibold">
                          {(() => {
                            const rawAssignedBy = item.assignment.assignedBy;
                            if (rawAssignedBy && !isGenericTeacherLabel(rawAssignedBy)) {
                              return formatTeacherWithTitle(rawAssignedBy);
                            }
                            const author = item.lesson.authorName;
                            if (author && !isGenericTeacherLabel(author)) {
                              return formatTeacherWithTitle(author);
                            }
                            const resolved = resolveTeacherForClassAndSubject(effectiveClass, item.lesson.subject || item.assignment.subject);
                            if (resolved) {
                              return formatTeacherWithTitle(resolved);
                            }
                            return 'Cô Trần Thị Diễm Hương';
                          })()}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-500">Tiến độ bài học</span>
                      <span className="text-slate-700">{item.progressPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#00875A] transition-all duration-300 rounded-full"
                        style={{ width: `${item.progressPct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedLesson(item.lesson);
                      setActiveStepTab(getInitialLessonStep(item.lesson));
                      if (item.status === 'not_started') {
                        updateLessonStatus(item.assignment.id, 'in_progress', 20);
                        updateLessonStatus(item.lesson.id, 'in_progress', 20);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-white bg-[#00875A] hover:bg-[#00704A] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {item.status === 'completed'
                        ? 'Ôn tập lại bài giảng'
                        : item.status === 'in_progress'
                        ? 'Tiếp tục học bài'
                        : 'Vào học ngay'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
