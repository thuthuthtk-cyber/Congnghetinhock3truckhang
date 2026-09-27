import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, resolveUserDisplayName } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PortalView } from './components/PortalView';

import { ExamManagementModule } from './components/modules/ExamManagementModule';
import { AssignmentModule } from './components/modules/AssignmentModule';
import { QuestionBankModule } from './components/modules/QuestionBankModule';
import { UserManagementModule } from './components/modules/UserManagementModule';
import { StudentAssignmentModule } from './components/modules/StudentAssignmentModule';
import { StudentExamModule } from './components/modules/StudentExamModule';

import { ModuleType, UserRole, Lesson5EPlan, ExamPaper, HomeworkAssignment, QuestionItem, GameItem, UserAccount, ActivityLog, StudentRecord } from './types';
import {
  INITIAL_DASHBOARD_STATS,
  INITIAL_LESSONS,
  INITIAL_EXAMS,
  INITIAL_ASSIGNMENTS,
  INITIAL_QUESTIONS,
  INITIAL_GAMES,
  INITIAL_USERS,
  INITIAL_ACTIVITY_LOGS
} from './services/mockData';
import { db, auth } from './services/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { resolveTeacherNameByEmail } from './services/teacherStorageService';
import {
  saveQuestionToFirestore,
  saveQuestionsBatchToFirestore,
  deleteQuestionFromFirestore,
  deleteQuestionsBatchFromFirestore,
  subscribeToQuestionsFromFirestore,
  fetchQuestionsFromFirestore,
  getLocalCachedQuestions
} from './services/questionStorageService';
import {
  saveExamToFirestore,
  deleteExamFromFirestore,
  subscribeToExamsFromFirestore,
  getLocalCachedExams
} from './services/examStorageService';
import {
  saveAssignmentToFirestore,
  deleteAssignmentFromFirestore,
  subscribeToAssignmentsFromFirestore,
  getLocalCachedAssignments,
  extractCanonicalStudentCode
} from './services/assignmentStorageService';
import { getStudentsFromLocalStorage } from './services/studentStorageService';
import {
  saveGameToFirestore,
  deleteGameFromFirestore,
  subscribeToGamesFromFirestore,
  getLocalCachedGames
} from './services/gameStorageService';
import { initializeAndSyncAllCollections } from './services/dbInitService';
import {
  saveLessonToFirestore,
  deleteLessonFromFirestore,
  subscribeToLessonsFromFirestore,
  getLocalCachedLessons
} from './services/lessonStorageService';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { RewardToastNotification } from './components/common/RewardToastNotification';

export function App() {
  const [showPortal, setShowPortal] = useState<boolean>(true);
  const [activeModule, setActiveModule] = useState<ModuleType>('question_bank');
  const [userRole, setUserRole] = useState<UserRole>('teacher');
  const [gameInitialTab, setGameInitialTab] = useState<'games' | 'store'>('games');
  
  // Isolated Teacher Session State
  const [teacherEmail, setTeacherEmail] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_email') : null) || 'vanquan18189@gmail.com');
  const [teacherName, setTeacherName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('eduplay_teacher_email') || 'vanquan18189@gmail.com';
      const saved = localStorage.getItem('eduplay_teacher_name');
      return resolveTeacherNameByEmail(email, saved);
    }
    return 'Thầy Văn Quân';
  });

  // Isolated Student Session State
  const [currentStudent, setCurrentStudent] = useState<StudentRecord | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('eduplay_student_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentGrade, setCurrentGrade] = useState<string>('Khối 3');
  const [currentClass, setCurrentClass] = useState<string>('Lớp 3A');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('eduplay_gemini_api_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Application Data States
  const [dashboardStats, setDashboardStats] = useState(INITIAL_DASHBOARD_STATS);
  const [activityLogs, setActivityLogs] = useState(INITIAL_ACTIVITY_LOGS);

  const [lessons5E, setLessons5E] = useState<Lesson5EPlan[]>(() => getLocalCachedLessons());
  const [examPapers, setExamPapers] = useState<ExamPaper[]>(() => getLocalCachedExams());
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>(() => getLocalCachedAssignments());
  const [questionBank, setQuestionBank] = useState<QuestionItem[]>(() => getLocalCachedQuestions());
  const [games, setGames] = useState<GameItem[]>(() => getLocalCachedGames());
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(INITIAL_USERS);
  const [isUseQuestionBankModalOpen, setIsUseQuestionBankModalOpen] = useState(false);
  const [gameRoomConfigData, setGameRoomConfigData] = useState<{
    isOpen: boolean;
    id?: string;
    title: string;
    subject: string;
    grade: string;
    classInfo?: string;
    maxPlayers?: number;
    status?: 'open' | 'closed';
    timePerQuestion?: string;
    isTimeLimited?: boolean;
    questions: QuestionItem[];
  } | null>(null);
  const [toastNotification, setToastNotification] = useState<{
    id: number;
    title: string;
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Clean legacy mock cache on first mount
  useEffect(() => {
    try {
      const storedTeachers = localStorage.getItem('eduplay_teachers_database');
      if (storedTeachers && storedTeachers.includes('hathiram@gmail.com')) {
        localStorage.removeItem('eduplay_teachers_database');
        localStorage.removeItem('eduplay_departments_database');
      }
      const storedClasses = localStorage.getItem('eduplay_classes_config');
      if (storedClasses && storedClasses.includes('gv-04')) {
        localStorage.removeItem('eduplay_classes_config');
      }
    } catch {}
  }, []);

  // Initialize and Sync all Firebase collections on mount
  useEffect(() => {
    initializeAndSyncAllCollections().then(res => {
      if (res.success) {
        console.log('Firebase collections sync status:', res.message);
      }
    }).catch(err => {
      console.warn('Firebase collections init warning:', err);
    });
  }, []);

  // Sync QuestionBank with Firestore (getDocs on mount + Real-time listener)
  useEffect(() => {
    // Initial fetch from Firestore (F5 reload)
    fetchQuestionsFromFirestore()
      .then((loaded) => {
        if (Array.isArray(loaded) && loaded.length > 0) {
          setQuestionBank(loaded);
          setDashboardStats(prev => ({ ...prev, totalQuestions: loaded.length }));
        }
      })
      .catch((err) => console.warn('Direct fetchQuestionsFromFirestore warning:', err));

    const unsubscribe = subscribeToQuestionsFromFirestore(
      (loadedQuestions) => {
        const questionsList = loadedQuestions || [];
        setQuestionBank(questionsList);
        setDashboardStats(prev => ({ ...prev, totalQuestions: questionsList.length }));
      },
      (err) => {
        console.warn('Firestore live subscription fallback active:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync ExamPapers with Firestore Real-time listener
  useEffect(() => {
    const unsubscribe = subscribeToExamsFromFirestore(
      (loadedExams) => {
        const examsList = loadedExams || [];
        setExamPapers(examsList);
        setDashboardStats(prev => ({ ...prev, totalExams: examsList.length }));
      },
      (err) => {
        console.warn('Firestore live exams subscription fallback active:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync HomeworkAssignments with Firestore Real-time listener
  useEffect(() => {
    const unsubscribe = subscribeToAssignmentsFromFirestore(
      (loadedAssignments) => {
        const assignmentsList = loadedAssignments || [];
        setAssignments(assignmentsList);
        setDashboardStats(prev => ({ ...prev, pendingAssignments: assignmentsList.length }));
      },
      (err) => {
        console.warn('Firestore live assignments subscription fallback active:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync Games with Firestore Real-time listener
  useEffect(() => {
    const unsubscribe = subscribeToGamesFromFirestore(
      (loadedGames) => {
        const gamesList = loadedGames || [];
        setGames(gamesList);
      },
      (err) => {
        console.warn('Firestore live games subscription fallback active:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync Lessons with Firestore Real-time listener
  useEffect(() => {
    const unsubscribe = subscribeToLessonsFromFirestore(
      (loadedLessons) => {
        const lessonsList = loadedLessons || [];
        setLessons5E(lessonsList);
      },
      (err) => {
        console.warn('Firestore live lessons subscription fallback active:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Global Toast Notification Listener
  useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (e.detail) {
        setToastNotification({
          id: Date.now(),
          title: e.detail.title || 'Thông báo hệ thống',
          message: e.detail.message || '',
          type: e.detail.type || 'success'
        });
        const timer = setTimeout(() => {
          setToastNotification(null);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('eduplay_toast', handleToastEvent);
    return () => {
      window.removeEventListener('eduplay_toast', handleToastEvent);
    };
  }, []);

  // RBAC Access Guard: Prevent unauthorized module access
  useEffect(() => {
    if (
      (activeModule as any) === 'lesson_5e' ||
      (activeModule as any) === 'interactive_games' ||
      (activeModule as any) === 'hoc_ba_so' ||
      (activeModule as any) === 'dashboard'
    ) {
      setActiveModule(userRole === 'student' ? 'assignment' : 'question_bank');
    }
    if (userRole === 'student') {
      if (activeModule === 'question_bank' || activeModule === 'user_management') {
        setActiveModule('assignment');
      }
    }
  }, [userRole, activeModule]);

  // Sync Firebase Auth state with Teacher session only (never override student session)
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setTeacherEmail(user.email);
        localStorage.setItem('eduplay_teacher_email', user.email);
        const resolvedName = resolveTeacherNameByEmail(user.email, user.displayName);
        setTeacherName(resolvedName);
        localStorage.setItem('eduplay_teacher_name', resolvedName);
      } else {
        // Clear cached stale user profile on logout
        const defaultEmail = 'vanquan18189@gmail.com';
        const defaultName = resolveTeacherNameByEmail(defaultEmail);
        setTeacherEmail(defaultEmail);
        setTeacherName(defaultName);
        localStorage.removeItem('eduplay_teacher_email');
        localStorage.removeItem('eduplay_teacher_name');
        localStorage.removeItem('eduplay_teacher_profile');
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync live teacher updates across the application
  useEffect(() => {
    const handleTeachersUpdated = (e: any) => {
      const teachers = e.detail?.teachers;
      const resolved = resolveTeacherNameByEmail(teacherEmail, null, teachers);
      if (resolved && resolved !== teacherName) {
        setTeacherName(resolved);
        localStorage.setItem('eduplay_teacher_name', resolved);
      }
    };

    window.addEventListener('eduplay_teachers_updated', handleTeachersUpdated);
    return () => {
      window.removeEventListener('eduplay_teachers_updated', handleTeachersUpdated);
    };
  }, [teacherEmail, teacherName]);

  // Save Handlers with Live Activity Logs & Stat Updates
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('eduplay_gemini_api_key', key);
  };

  const handleSaveLesson5E = async (lesson: Lesson5EPlan) => {
    setLessons5E((prev) => {
      const exists = prev.find((item) => item.id === lesson.id);
      if (exists) {
        return prev.map((item) => (item.id === lesson.id ? lesson : item));
      }
      return [lesson, ...prev];
    });

    setDashboardStats((prev) => ({ ...prev, totalLessons: prev.totalLessons + 1 }));
    addActivityLog('Bài giảng 5E', `Đã phát hành bài giảng mới: "${lesson.title}"`);

    try {
      await saveLessonToFirestore(lesson);
    } catch (err) {
      console.warn('Lỗi khi lưu bài giảng lên Firestore:', err);
    }
  };

  const handleDeleteLesson5E = async (id: string) => {
    setLessons5E((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteLessonFromFirestore(id);
    } catch (err) {
      console.warn('Lỗi khi xóa bài giảng khỏi Firestore:', err);
    }
  };

  const handleSaveExam = async (exam: ExamPaper) => {
    setExamPapers((prev) => {
      const exists = prev.find((item) => item.id === exam.id);
      if (exists) {
        return prev.map((item) => (item.id === exam.id ? exam : item));
      }
      return [exam, ...prev];
    });

    setDashboardStats((prev) => ({ ...prev, totalExams: prev.totalExams + 1 }));
    addActivityLog('Đề kiểm tra', `Đã tạo đề thi mới: "${exam.title}" (${exam.questions?.length || 0} câu)`);

    try {
      await saveExamToFirestore(exam);
    } catch (err) {
      console.warn('Lỗi khi lưu đề kiểm tra lên Firestore:', err);
    }
  };

  const handleDeleteExam = async (id: string) => {
    setExamPapers((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteExamFromFirestore(id);
    } catch (err) {
      console.warn('Lỗi khi xóa đề kiểm tra khỏi Firestore:', err);
    }
  };

  const handleSaveAssignment = async (assignment: HomeworkAssignment) => {
    setAssignments((prev) => {
      const exists = prev.find((item) => item.id === assignment.id);
      if (exists) {
        return prev.map((item) => (item.id === assignment.id ? assignment : item));
      }
      return [assignment, ...prev];
    });

    setDashboardStats((prev) => ({ ...prev, pendingAssignments: prev.pendingAssignments + 1 }));
    addActivityLog('Bài tập về nhà', `Đã phát hành bài tập mới cho lớp ${assignment.targetClass}`);

    try {
      await saveAssignmentToFirestore(assignment);
    } catch (err) {
      console.warn('Lỗi khi lưu bài tập lên Firestore:', err);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    setAssignments((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteAssignmentFromFirestore(id);
    } catch (err) {
      console.warn('Lỗi khi xóa bài tập khỏi Firestore:', err);
    }
  };

  const handleSaveGame = async (game: GameItem) => {
    setGames((prev) => {
      const exists = prev.find((item) => item.id === game.id);
      if (exists) {
        return prev.map((item) => (item.id === game.id ? game : item));
      }
      return [game, ...prev];
    });

    addActivityLog('Trò chơi học tập', `Đã lưu trò chơi "${game.title}"`);

    try {
      await saveGameToFirestore(game);
    } catch (err) {
      console.warn('Lỗi khi lưu trò chơi lên Firestore:', err);
    }
  };

  const handleDeleteGame = async (id: string) => {
    setGames((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteGameFromFirestore(id);
    } catch (err) {
      console.warn('Lỗi khi xóa trò chơi khỏi Firestore:', err);
    }
  };

  const handleSaveQuestion = async (question: QuestionItem) => {
    try {
      await saveQuestionToFirestore(question);
      setDashboardStats((prev) => ({
        ...prev,
        totalQuestions: prev.totalQuestions + (questionBank.some(item => item.id === question.id) ? 0 : 1)
      }));
      addActivityLog('Ngân hàng câu hỏi', `Đã lưu câu hỏi mã ${question.code || question.id}`);
    } catch (e) {
      console.error('Error saving question to Firestore:', e);
    }
  };

  const handleSaveQuestions = async (questionsToSave: QuestionItem[]) => {
    try {
      await saveQuestionsBatchToFirestore(questionsToSave);
      addActivityLog('Ngân hàng câu hỏi', `Đã lưu danh sách ${questionsToSave.length} câu hỏi mới vào CSDL`);
    } catch (e) {
      console.error('Error saving batch questions to Firestore:', e);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteQuestionFromFirestore(id);
      setDashboardStats((prev) => ({ ...prev, totalQuestions: Math.max(0, prev.totalQuestions - 1) }));
      addActivityLog('Ngân hàng câu hỏi', `Đã xóa câu hỏi ID: ${id}`);
    } catch (e) {
      console.error('Error deleting question from Firestore:', e);
    }
  };

  const handleBatchDeleteQuestions = async (ids: string[]) => {
    try {
      await deleteQuestionsBatchFromFirestore(ids);
      setDashboardStats((prev) => ({ ...prev, totalQuestions: Math.max(0, prev.totalQuestions - ids.length) }));
      addActivityLog('Ngân hàng câu hỏi', `Đã xóa hàng loạt ${ids.length} câu hỏi khỏi CSDL`);
    } catch (e) {
      console.error('Error batch deleting questions from Firestore:', e);
    }
  };

  const handleSaveUser = (user: UserAccount) => {
    setUserAccounts((prev) => {
      const exists = prev.find((item) => item.id === user.id);
      if (exists) {
        return prev.map((item) => (item.id === user.id ? user : item));
      }
      return [user, ...prev];
    });
  };

  const handleDeleteUser = (id: string) => {
    setUserAccounts((prev) => prev.filter((item) => item.id !== id));
  };

  const addActivityLog = (moduleName: string, action: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      user: userRole === 'teacher' ? teacherName : (currentStudent?.name || 'Học Sinh EduPlay'),
      role: userRole,
      action,
      module: moduleName,
      timestamp: 'Vừa xong',
      time: 'Vừa xong'
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 9)]);
  };

  const handleSelectPortal = (
    role: UserRole,
    grade?: string,
    selectedClass?: string,
    userDetails?: { email?: string; name?: string; student?: StudentRecord }
  ) => {
    setUserRole(role);
    if (grade) setCurrentGrade(grade);
    if (selectedClass) setCurrentClass(selectedClass);

    if (role === 'student') {
      const stObj: StudentRecord = userDetails?.student || {
        id: 'st-temp-1',
        stt: 1,
        code: '3a1',
        sddcn: '038316001001',
        name: userDetails?.name || 'Hoàng Bảo An',
        fullName: userDetails?.name || 'Hoàng Bảo An',
        gender: 'Nam',
        dob: '15/05/2016',
        className: selectedClass || 'Lớp 3A',
        parentName: 'Phụ huynh',
        phone: '0985608063',
        email: userDetails?.email || 'hs.3a1@quanghungpk1.edu.vn',
        status: 'active',
        conduct: 'Tốt',
        avgScore: 9.0,
        avatar: '🐰',
        coins: 1000
      };
      setCurrentStudent(stObj);
      localStorage.setItem('eduplay_student_session', JSON.stringify(stObj));
    } else {
      if (userDetails?.email) {
        setTeacherEmail(userDetails.email);
        localStorage.setItem('eduplay_teacher_email', userDetails.email);
      }
      if (userDetails?.name) {
        setTeacherName(userDetails.name);
        localStorage.setItem('eduplay_teacher_name', userDetails.name);
      }
    }
    setActiveModule(role === 'student' ? 'assignment' : 'question_bank');
    setShowPortal(false);
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('Logout error:', err);
    }
    localStorage.removeItem('eduplay_teacher_email');
    localStorage.removeItem('eduplay_teacher_name');
    localStorage.removeItem('eduplay_teacher_profile');
    localStorage.removeItem('eduplay_student_session');

    setTeacherEmail('vanquan18189@gmail.com');
    setTeacherName(resolveTeacherNameByEmail('vanquan18189@gmail.com'));
    setCurrentStudent(null);
    setShowPortal(true);
    setActiveModule('question_bank');
  };

  useEffect(() => {
    const handleLogoutEvent = () => {
      handleLogout();
    };
    window.addEventListener('eduplay_logout', handleLogoutEvent);
    return () => window.removeEventListener('eduplay_logout', handleLogoutEvent);
  }, []);

  if (showPortal) {
    return <PortalView onSelectPortal={handleSelectPortal} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Header Bar */}
      <Header
        userRole={userRole}
        currentUserName={userRole === 'student' ? (currentStudent?.name || 'Hoàng Bảo An') : teacherName}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        isApiKeyModalOpen={isApiKeyModalOpen}
        setIsApiKeyModalOpen={setIsApiKeyModalOpen}
      />

      {/* Main Body with Sidebar + Content Area */}
      <div className="flex-1 flex items-stretch overflow-x-auto max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 gap-4">
        
        {/* Sidebar Menu */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          userRole={userRole}
          teacherName={teacherName}
          teacherEmail={teacherEmail}
          currentStudent={currentStudent}
          currentClass={currentClass}
          userName={userRole === 'student' ? (currentStudent?.name || 'Hoàng Bảo An') : teacherName}
          userEmail={teacherEmail}
          onLogout={handleLogout}
        />

        {/* Dynamic Module Content View */}
        <main className="flex-1 min-w-0 h-full">
          <ErrorBoundary fallbackTitle="Không thể tải phân hệ học tập này">
            {(() => {
              const safeModule = (userRole === 'student' && (activeModule === 'question_bank' || activeModule === 'user_management' || (activeModule as any) === 'dashboard'))
                ? 'assignment'
                : (activeModule === 'dashboard' ? 'question_bank' : activeModule);

              if (safeModule === 'exam_management') {
                return userRole === 'student' ? (
                  <StudentExamModule
                    exams={examPapers}
                    questionsBank={questionBank}
                    currentUserId={extractCanonicalStudentCode(currentStudent?.code || currentStudent?.id) || 'u-4'}
                    currentUserName={currentStudent?.fullName || currentStudent?.name || 'Lê Minh Anh'}
                  />
                ) : (
                  <ExamManagementModule
                    exams={examPapers}
                    questionsBank={questionBank}
                    onSaveExam={handleSaveExam}
                    onDeleteExam={handleDeleteExam}
                    userRole={userRole}
                  />
                );
              }

              if (safeModule === 'assignment') {
                return userRole === 'student' ? (
                  <StudentAssignmentModule
                    assignments={assignments}
                    questionsBank={questionBank}
                    onSaveAssignment={handleSaveAssignment}
                    currentUserId={extractCanonicalStudentCode(currentStudent?.code || currentStudent?.id) || 'u-4'}
                    currentUserName={currentStudent?.fullName || currentStudent?.name || 'Lê Minh Anh'}
                  />
                ) : (
                  <AssignmentModule
                    assignments={assignments}
                    onSaveAssignment={handleSaveAssignment}
                    onDeleteAssignment={handleDeleteAssignment}
                    userRole={userRole}
                  />
                );
              }

              if (safeModule === 'question_bank' && userRole !== 'student') {
                return (
                  <QuestionBankModule
                    questions={questionBank}
                    onSaveQuestion={handleSaveQuestion}
                    onSaveQuestions={handleSaveQuestions}
                    onDeleteQuestion={handleDeleteQuestion}
                    onBatchDeleteQuestions={handleBatchDeleteQuestions}
                    userRole={userRole}
                    onAssignHomework={(config) => {
                      const rootId = `hw-bank-${Date.now()}`;
                      const rawClasses: string[] = config.classes && config.classes.length > 0 ? config.classes : ['Lớp 3C'];
                      const classes: string[] = Array.from(new Set(rawClasses.map((c: string) => c.trim()).filter(Boolean)));
                      classes.forEach((cls: string) => {
                        const canonicalId = classes.length === 1
                          ? rootId
                          : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                        const roster = getStudentsFromLocalStorage(cls);
                        const newAssignment: HomeworkAssignment = {
                          id: canonicalId,
                          homeworkId: canonicalId,
                          originalAssignmentId: rootId,
                          title: config.title || `Bài tập rèn luyện môn ${config.subject}`,
                          subject: config.subject,
                          grade: config.grade,
                          targetClass: cls,
                          dueDate: config.dueDate,
                          description: `Bài tập tự luyện môn ${config.subject} gồm ${config.selectedQuestions.length} câu hỏi chuẩn sư phạm.`,
                          questions: config.selectedQuestions,
                          totalStudents: roster.length > 0 ? roster.length : 38,
                          completedCount: 0,
                          submissions: [],
                          createdAt: new Date().toISOString()
                        };
                        handleSaveAssignment(newAssignment);
                      });
                    }}
                    onCreateExam={(examData) => {
                      const newExam: ExamPaper = {
                        id: `TEST-${Date.now().toString().slice(-5)}`,
                        title: examData.title,
                        subject: examData.subject,
                        grade: examData.grade,
                        durationMinutes: 15,
                        matrix: {
                          nhanBiet: examData.questions.filter((q: any) => q.level === 'nhan_biet').length,
                          thongHieu: examData.questions.filter((q: any) => q.level === 'thong_hieu').length,
                          vanDung: examData.questions.filter((q: any) => q.level === 'van_dung').length,
                          vanDungCao: examData.questions.filter((q: any) => q.level === 'van_dung_cao').length
                        },
                        questions: examData.questions,
                        createdBy: teacherName,
                        createdAt: new Date().toISOString(),
                        status: 'published',
                        targetClass: examData.targetClasses.join(', '),
                        examType: 'Thường xuyên',
                        submissionsCount: 0,
                        totalStudents: 35
                      };
                      handleSaveExam(newExam);
                    }}
                    onCreateGame={(gameData) => {
                      const newGame: GameItem = {
                        id: `game-${Date.now()}`,
                        title: gameData.title || `Trò chơi tương tác môn ${gameData.subject || 'Công nghệ'}`,
                        type: 'speed_quiz',
                        subject: gameData.subject || 'Công nghệ',
                        grade: gameData.grade || 'Khối 3',
                        description: `Trò chơi học tập trực tuyến tạo từ Ngân hàng câu hỏi (${gameData.questions?.length || 0} câu).`,
                        questions: (gameData.questions || []).map((q: any) => ({
                          id: q.id,
                          type: q.type,
                          question: q.question || q.content,
                          content: q.content || q.question,
                          options: q.options || [],
                          answer: q.answer || q.correctAnswer,
                          correctAnswer: q.correctAnswer || q.answer,
                          explanation: q.explanation || '',
                          statements: q.statements || [],
                          matchingPairs: q.matchingPairs || [],
                          classificationItems: q.classificationItems || [],
                          classificationGroups: q.classificationGroups || []
                        })),
                        playersCount: 0,
                        status: 'open'
                      };
                      handleSaveGame(newGame);
                      setToastNotification({
                        id: Date.now(),
                        title: 'Thành công',
                        message: `Đã lưu cấu hình bộ câu hỏi vào cơ sở dữ liệu!`,
                        type: 'success'
                      });
                    }}
                    onNavigate={(mod) => setActiveModule(mod as any)}
                  />
                );
              }

              if (safeModule === 'user_management' && userRole !== 'student') {
                return (
                  <UserManagementModule
                    users={userAccounts}
                    onSaveUser={handleSaveUser}
                    onDeleteUser={handleDeleteUser}
                    userRole={userRole}
                  />
                );
              }

              return null;
            })()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Reward Popup Toast */}
      <RewardToastNotification />

      {/* Global Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-sm w-full">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 shrink-0">
              {toastNotification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
              ) : toastNotification.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : (
                <Info className="w-5 h-5 text-sky-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {toastNotification.title}
              </h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5 leading-relaxed">
                {toastNotification.message}
              </p>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
