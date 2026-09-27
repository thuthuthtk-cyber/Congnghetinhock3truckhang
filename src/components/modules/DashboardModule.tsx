import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  BookOpen,
  FileCheck2,
  ClipboardList,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Clock,
  Award,
  BarChart3,
  Zap,
  Database,
  Gamepad2,
  CheckCircle2,
  ArrowRight,
  Coins,
  Bell,
  MessageSquare,
  Trophy,
  GraduationCap,
  Calendar,
  Star,
  Flame,
  ChevronRight,
  BookMarked
} from 'lucide-react';
import { ActivityLog, ActiveModule, UserRole, StudentRecord, HomeworkAssignment, ExamPaper, Lesson5EPlan, QuizziGameItem, GameItem } from '../../types';
import { getStudentGameProfile, StudentGameProfile } from '../../services/studentGameStoreService';
import { calculateUnifiedHocBaData } from '../../services/hocBaDataService';
import { useClassesList, getSubjectsForClassOrGrade, getSubjectDisplayConfig, getSubjectColorStyles } from '../../services/classStorageService';
import { getAllStudentsFromLocalStorage } from '../../services/studentStorageService';
import { getTeachersFromLocalStorage, resolveTeacherNameByEmail } from '../../services/teacherStorageService';
import { getEffectiveStudentClassAndGrade, isTargetingStudent, isSubjectMatch } from '../../services/studentSessionService';
import {
  subscribeAssignedELearningLessons,
  getLocalCachedAssignedELearning,
  AssignedELearningLesson
} from '../../services/elearningAssignmentService';
import {
  subscribeToQuizziGamesFromFirestore,
  getLocalCachedQuizziGames,
  subscribeToGamesFromFirestore,
  getLocalCachedGames
} from '../../services/gameStorageService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export interface DashboardModuleProps {
  onNavigate?: (module: ActiveModule) => void;
  userRole?: UserRole;
  currentUserName?: string;
  activityLogs?: ActivityLog[];
  logs?: ActivityLog[];
  stats?: {
    totalStudents?: number;
    totalLessons?: number;
    totalExams?: number;
    totalAssignments?: number;
    pendingAssignments?: number;
    totalQuestions?: number;
    averageScore?: number;
  };
  currentStudent?: StudentRecord | null;
  currentClass?: string;
  assignments?: HomeworkAssignment[];
  exams?: ExamPaper[];
  lessons?: Lesson5EPlan[];
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  onNavigate,
  userRole = 'teacher',
  currentUserName,
  activityLogs,
  logs,
  stats,
  currentStudent,
  currentClass = 'Lớp 3A',
  assignments = [],
  exams = [],
  lessons = []
}) => {
  const actualLogs = activityLogs || logs || [];

  // Real-time dynamic count states
  const [realStudentCount, setRealStudentCount] = useState<number | null>(() => {
    try {
      const localDb = getAllStudentsFromLocalStorage();
      let total = 0;
      Object.values(localDb).forEach(list => {
        if (Array.isArray(list)) total += list.length;
      });
      return total > 0 ? total : null;
    } catch {
      return null;
    }
  });

  const [realClassCount, setRealClassCount] = useState<number | null>(null);
  const [teachersCount, setTeachersCount] = useState<number | null>(() => {
    try {
      const list = getTeachersFromLocalStorage();
      return list.length;
    } catch {
      return null;
    }
  });

  // Calculate local student count synchronously from LocalStorage
  const refreshLocalStudentCount = () => {
    try {
      const localDb = getAllStudentsFromLocalStorage();
      let total = 0;
      Object.values(localDb).forEach(list => {
        if (Array.isArray(list)) total += list.length;
      });
      if (total > 0) {
        setRealStudentCount(total);
      }
    } catch (e) {
      console.warn('Error refreshing local student count:', e);
    }
  };

  // Fetch count asynchronously from Firestore
  const fetchCountsFromFirestore = async (isMountedRef: { current: boolean }) => {
    try {
      const classSnap = await getDocs(collection(db, 'classes'));
      if (isMountedRef.current) setRealClassCount(classSnap.size);

      const rosterSnap = await getDocs(collection(db, 'class_rosters'));
      let total = 0;
      rosterSnap.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.students)) {
          total += data.students.length;
        }
      });
      if (isMountedRef.current && total > 0) {
        setRealStudentCount(total);
      }
    } catch (e) {
      console.warn('Error loading real student/class counts from Firestore:', e);
    }
  };

  // Setup Real-time Event Listeners and Initial Load
  useEffect(() => {
    const isMountedRef = { current: true };

    // Initial load
    refreshLocalStudentCount();
    fetchCountsFromFirestore(isMountedRef);

    // 1. Real-time Student Event Handler
    const handleStudentDataUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      // Immediate local count calculation
      refreshLocalStudentCount();
      // Re-fetch from remote Firestore
      fetchCountsFromFirestore(isMountedRef);
    };

    // 2. Real-time Teacher Event Handler
    const handleTeacherDataUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.teachers && Array.isArray(customEvent.detail.teachers)) {
        setTeachersCount(customEvent.detail.teachers.length);
      } else {
        const list = getTeachersFromLocalStorage();
        setTeachersCount(list.length);
      }
    };

    // 3. Real-time Classes Event Handler
    const handleClassesDataUpdated = () => {
      fetchCountsFromFirestore(isMountedRef);
    };

    // Register listeners
    window.addEventListener('student-data-updated', handleStudentDataUpdated);
    window.addEventListener('eduplay_students_updated', handleStudentDataUpdated);
    window.addEventListener('teacher-data-updated', handleTeacherDataUpdated);
    window.addEventListener('eduplay_teachers_updated', handleTeacherDataUpdated);
    window.addEventListener('classes-updated', handleClassesDataUpdated);
    window.addEventListener('eduplay_classes_updated', handleClassesDataUpdated);

    // Clean up all listeners on component unmount
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('student-data-updated', handleStudentDataUpdated);
      window.removeEventListener('eduplay_students_updated', handleStudentDataUpdated);
      window.removeEventListener('teacher-data-updated', handleTeacherDataUpdated);
      window.removeEventListener('eduplay_teachers_updated', handleTeacherDataUpdated);
      window.removeEventListener('classes-updated', handleClassesDataUpdated);
      window.removeEventListener('eduplay_classes_updated', handleClassesDataUpdated);
    };
  }, []);

  const totalStudentsCount = realStudentCount !== null ? realStudentCount : (stats?.totalStudents || 0);
  const totalExamsCount = exams.length || stats?.totalExams || 0;
  const totalAssignmentsCount = assignments.length || stats?.totalAssignments || 0;
  const totalQuestionsCount = stats?.totalQuestions || (() => {
    try {
      const q = localStorage.getItem('eduplay_questions');
      return q ? JSON.parse(q).length : 0;
    } catch {
      return 0;
    }
  })();

  // Greeting by time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Chào buổi sáng';
    if (hour >= 11 && hour < 13) return 'Chào buổi trưa';
    if (hour >= 13 && hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // Dynamic Teacher / Admin Display Name Resolution
  const rawTeacherName = (
    currentUserName ||
    (typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_name') : null) ||
    ''
  ).trim();

  const cleanTeacherName = rawTeacherName
    .replace(/\s*\(admin\)/i, '')
    .replace(/\s*\(giáo viên\)/i, '')
    .trim();

  const getFormattedTeacherDisplayName = (name: string): string => {
    if (!name) return 'Thầy/Cô Giáo';

    // If name already starts with title prefix
    if (name.startsWith('Cô ') || name.startsWith('Thầy ') || name.startsWith('Thầy/Cô ')) {
      return name;
    }

    const lower = name.toLowerCase();

    // Gender detection markers
    const isFemale = /\b(thị|cô|mai|lan|hoa|ngọc|thu|hương|hà|trang|phương|linh|thủ|diễm|dung|vân|thủy|yến|nhung|hạnh|oanh|loan|hằng|cúc|đào|mơ|xuyên|liên|tuyết|nguyệt|hồng|bích|hiền|quỳnh|trâm|thi|nhi|mi|thảo|ngân)\b/i.test(lower);
    const isMale = /\b(văn|đặng|thầy|đô|quân|hùng|long|nam|hoàng|dũng|tuấn|minh|thắng|phong|hải|đạt|kiên|bảo|nguyên|việt|sơn|lâm|thành|trung|đức|khoa)\b/i.test(lower);

    if (isFemale && !isMale) {
      return `Cô ${name}`;
    }
    if (isMale && !isFemale) {
      return `Thầy ${name}`;
    }
    if (isFemale) {
      return `Cô ${name}`;
    }

    return `Thầy/Cô ${name}`;
  };

  const teacherName = getFormattedTeacherDisplayName(cleanTeacherName);

  // --------------------------------------------------------------------------
  // STUDENT SPECIFIC DATA INITIALIZATION
  // --------------------------------------------------------------------------
  const sessionData = useMemo(() => getEffectiveStudentClassAndGrade(currentStudent?.className || currentClass), [currentStudent, currentClass]);
  const studentName = currentStudent?.name || currentStudent?.fullName || currentUserName || sessionData.studentName || 'Hoàng Bảo An';
  const studentClassName = currentStudent?.className || sessionData.studentClass || 'Lớp 3A';
  const studentGrade = sessionData.studentGrade || 'Khối 3';
  const studentId = currentStudent?.id || currentStudent?.code || sessionData.studentId || 'st-3a-01';
  const currentStudentId = currentStudent?.id || currentStudent?.code || studentId || 'HS-3A-01';

  // Student Game & Coin Profile
  const [gameProfile, setGameProfile] = useState<StudentGameProfile>(() =>
    getStudentGameProfile(studentId, studentName)
  );

  useEffect(() => {
    setGameProfile(getStudentGameProfile(studentId, studentName));
  }, [studentId, studentName]);

  // Listen to profile updates (coins, EXP, level) across the app
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail?.profile) {
        setGameProfile(e.detail.profile);
      } else {
        setGameProfile(getStudentGameProfile(studentId, studentName));
      }
    };
    window.addEventListener('eduplay_game_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('eduplay_game_profile_updated', handleProfileUpdate);
    };
  }, [studentId, studentName]);

  // Real-time assigned E-Learning lessons & games for student class targeting
  const [assignedLessonsList, setAssignedLessonsList] = useState<AssignedELearningLesson[]>(() => {
    try {
      return getLocalCachedAssignedELearning();
    } catch {
      return [];
    }
  });

  const [quizziGames, setQuizziGames] = useState<QuizziGameItem[]>(() => {
    try {
      return getLocalCachedQuizziGames();
    } catch {
      return [];
    }
  });

  const [roomGames, setRoomGames] = useState<GameItem[]>(() => {
    try {
      return getLocalCachedGames();
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const unsubELearning = subscribeAssignedELearningLessons((items) => {
      setAssignedLessonsList(items);
    });
    const unsubQuizzi = subscribeToQuizziGamesFromFirestore((items) => {
      setQuizziGames(items);
    });
    const unsubGames = subscribeToGamesFromFirestore((items) => {
      setRoomGames(items);
    });
    return () => {
      unsubELearning();
      unsubQuizzi();
      unsubGames();
    };
  }, []);

  // Read student submission IDs and progress maps from localStorage
  const [completedAssignmentIds, setCompletedAssignmentIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`eduplay_student_submissions_${currentStudent?.code || studentId || 'u-4'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map((s: any) => s.assignment?.id || s.id).filter(Boolean));
        }
      }
    } catch {}
    return new Set();
  });

  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(() => {
    try {
      const keyId = currentStudent?.code || studentId || 'u-4';
      const saved = localStorage.getItem(`eduplay_student_exam_subs_${keyId}`) ||
        localStorage.getItem(`eduplay_student_exam_submissions_${keyId}`) ||
        localStorage.getItem('eduplay_exam_results');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map((s: any) => s.examId || s.id).filter(Boolean));
        }
      }
    } catch {}
    return new Set();
  });

  const [studentLessonProgressMap, setStudentLessonProgressMap] = useState<Record<string, { status: string; progressPct: number }>>(() => {
    try {
      const saved = localStorage.getItem(`eduplay_student_elearning_progress_${currentStudent?.code || studentId || 'u-4'}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [completedSubmissionsCount, setCompletedSubmissionsCount] = useState<number>(() => completedAssignmentIds.size);

  useEffect(() => {
    const syncStudentProgress = () => {
      try {
        const keyId = currentStudent?.code || studentId || 'u-4';
        const savedSub = localStorage.getItem(`eduplay_student_submissions_${keyId}`);
        if (savedSub) {
          const parsed = JSON.parse(savedSub);
          if (Array.isArray(parsed)) {
            setCompletedAssignmentIds(new Set(parsed.map((s: any) => s.assignment?.id || s.id).filter(Boolean)));
            setCompletedSubmissionsCount(parsed.length);
          }
        }
        const savedExam = localStorage.getItem(`eduplay_student_exam_subs_${keyId}`) ||
          localStorage.getItem(`eduplay_student_exam_submissions_${keyId}`) ||
          localStorage.getItem('eduplay_exam_results');
        if (savedExam) {
          const parsed = JSON.parse(savedExam);
          if (Array.isArray(parsed)) {
            setCompletedExamIds(new Set(parsed.map((s: any) => s.examId || s.id).filter(Boolean)));
          }
        }
        const savedLes = localStorage.getItem(`eduplay_student_elearning_progress_${keyId}`);
        if (savedLes) {
          setStudentLessonProgressMap(JSON.parse(savedLes));
        }
      } catch {}
    };

    syncStudentProgress();
    window.addEventListener('eduplay_student_submissions_updated', syncStudentProgress);
    window.addEventListener('storage', syncStudentProgress);
    return () => {
      window.removeEventListener('eduplay_student_submissions_updated', syncStudentProgress);
      window.removeEventListener('storage', syncStudentProgress);
    };
  }, [currentStudent, studentId]);

  const regularAssignments = useMemo(() => {
    const rawClass = (studentClassName || 'Lớp 3A').toLowerCase().replace(/\s+/g, '');
    const filtered = (assignments || []).filter((as) => {
      if (!as || !as.id) return false;
      const itemType = ((as as any).type || (as as any).category || (as as any).contentType || '').toLowerCase();
      if (itemType === 'elearning' || itemType === 'bai_giang' || itemType === 'lesson_5e' || as.id.startsWith('elearn-')) {
        return false;
      }
      if (as.targetClass) {
        const targetCls = as.targetClass.trim().toLowerCase().replace(/\s+/g, '');
        if (
          targetCls !== '' &&
          targetCls !== 'all' &&
          !targetCls.includes('tấtcả') &&
          targetCls !== rawClass &&
          !targetCls.includes(rawClass) &&
          !rawClass.includes(targetCls)
        ) {
          return false;
        }
      }
      return true;
    });

    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const cleanList: HomeworkAssignment[] = [];
    filtered.forEach(as => {
      if (seenIds.has(as.id)) return;
      const cleanTitle = (as.title || '').trim().toLowerCase().replace(/^bài tập:\s*/i, '').replace(/\s+/g, ' ');
      const clsKey = (as.targetClass || '').trim().toLowerCase().replace(/\s+/g, '');
      const semanticKey = `${cleanTitle}__${as.subject || ''}__${as.grade || ''}__${clsKey}`;
      if (seenKeys.has(semanticKey)) return;
      seenIds.add(as.id);
      seenKeys.add(semanticKey);
      cleanList.push(as);
    });
    return cleanList;
  }, [assignments, studentClassName]);

  const todoAssignmentsCount = Math.max(0, regularAssignments.length - completedSubmissionsCount);
  
  const todoExamsCount = useMemo(() => {
    const rawClass = (studentClassName || 'Lớp 3A').toLowerCase().replace(/\s+/g, '');
    const filtered = (exams || []).filter((ex) => {
      if (!ex || !ex.id) return false;
      if (ex.targetClass) {
        const targetCls = ex.targetClass.trim().toLowerCase().replace(/\s+/g, '');
        if (
          targetCls !== '' &&
          targetCls !== 'all' &&
          !targetCls.includes('tấtcả') &&
          targetCls !== rawClass &&
          !targetCls.includes(rawClass) &&
          !rawClass.includes(targetCls)
        ) {
          return false;
        }
      }
      return true;
    });

    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const cleanList: ExamPaper[] = [];
    filtered.forEach(ex => {
      if (seenIds.has(ex.id)) return;
      const cleanTitle = (ex.title || '').trim().toLowerCase().replace(/^đề kiểm tra:\s*/i, '').replace(/\s+/g, ' ');
      const clsKey = (ex.targetClass || '').trim().toLowerCase().replace(/\s+/g, '');
      const semanticKey = `${cleanTitle}__${ex.subject || ''}__${ex.grade || ''}__${clsKey}`;
      if (seenKeys.has(semanticKey)) return;
      seenIds.add(ex.id);
      seenKeys.add(semanticKey);
      cleanList.push(ex);
    });
    return cleanList.length;
  }, [exams, studentClassName]);

  // Unified Real Student Học Bạ Summary (Calculated strictly from real graded submissions)
  const hocBaSummary = useMemo(() => {
    return calculateUnifiedHocBaData({
      studentId: currentStudentId,
      studentName,
      className: studentClassName,
      exams,
      assignments,
      lessons
    });
  }, [currentStudentId, studentName, studentClassName, exams, assignments, lessons]);

  const hasRealGrades = hocBaSummary.hasData && hocBaSummary.gpa !== null;
  const currentGPA = hasRealGrades ? hocBaSummary.gpa!.toFixed(1) : null;
  const currentCoins = gameProfile.coins;
  const currentExp = gameProfile.currentExp;
  const currentLevel = gameProfile.level;

  // --------------------------------------------------------------------------
  // 1. 4 STUDENT PERSONAL STATS CARDS
  // --------------------------------------------------------------------------
  const studentStatCards = [
    {
      id: 'assignment',
      title: 'Bài Tập Cần Làm',
      value: `${todoAssignmentsCount} bài`,
      subtext: 'Phiếu rèn luyện đang mở',
      icon: ClipboardList,
      iconBg: 'bg-orange-100 text-orange-600',
      badge: todoAssignmentsCount > 0 ? 'Ưu tiên nộp sớm ⚡' : 'Đã hoàn thành hết ✨',
      badgeColor: todoAssignmentsCount > 0 ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200',
      module: 'assignment' as ActiveModule,
      borderHover: 'hover:border-orange-400'
    },
    {
      id: 'exam',
      title: 'Đề Kiểm Tra Sắp Tới',
      value: `${todoExamsCount} đề`,
      subtext: 'Phòng khảo thí trực tuyến',
      icon: FileCheck2,
      iconBg: 'bg-sky-100 text-sky-600',
      badge: todoExamsCount > 0 ? 'Thời hạn 3 ngày 🎯' : 'Chưa có đề mới 📋',
      badgeColor: 'text-sky-600 bg-sky-50 border-sky-200',
      module: 'exam_management' as ActiveModule,
      borderHover: 'hover:border-sky-400'
    },
    {
      id: 'completed',
      title: 'Bài Tập Đã Nộp',
      value: `${completedSubmissionsCount} bài`,
      subtext: 'Nhiệm vụ rèn luyện đã hoàn thành',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 text-emerald-600',
      badge: completedSubmissionsCount > 0 ? 'Chăm chỉ xuất sắc 🌟' : 'Bắt đầu làm bài nào 🚀',
      badgeColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      module: 'assignment' as ActiveModule,
      borderHover: 'hover:border-emerald-400'
    },
    {
      id: 'practice',
      title: 'Tích Cực Học Tập',
      value: `${todoAssignmentsCount + todoExamsCount} nhiệm vụ`,
      subtext: 'Tổng bài tập và đề kiểm tra',
      icon: Award,
      iconBg: 'bg-purple-100 text-purple-600',
      badge: (todoAssignmentsCount + todoExamsCount) > 0 ? 'Đang mở ⚡' : 'Đã hoàn thành hết ✨',
      badgeColor: 'text-purple-600 bg-purple-50 border-purple-200',
      module: 'assignment' as ActiveModule,
      borderHover: 'hover:border-purple-400'
    }
  ];

  // --------------------------------------------------------------------------
  // 2. TEACHER STAT CARDS
  // --------------------------------------------------------------------------
  const teacherStatCards = [
    {
      title: 'Tổng Sĩ Số Học Sinh',
      value: totalStudentsCount,
      subtext: realClassCount !== null ? `${realClassCount} lớp học (Khối 3)` : 'Trường TH Trực Khang',
      icon: Users,
      iconBg: 'bg-[#EEF2FF] text-[#4338CA]',
      change: totalStudentsCount > 0 ? 'Dữ liệu thực tế từ Firestore' : 'Chưa có học sinh',
      module: 'user_management' as ActiveModule
    },
    {
      title: 'Ngân Hàng Câu Hỏi',
      value: totalQuestionsCount,
      subtext: totalQuestionsCount > 0 ? 'Phân loại theo ma trận 4 mức độ' : 'Chưa có câu hỏi',
      icon: Database,
      iconBg: 'bg-[#EEF2FF] text-[#4338CA]',
      change: totalQuestionsCount > 0 ? `${totalQuestionsCount} câu hỏi sẵn sàng` : 'Chưa tạo câu hỏi',
      module: 'question_bank' as ActiveModule
    },
    {
      title: 'Bộ Đề Kiểm Tra Ma Trận',
      value: totalExamsCount,
      subtext: totalExamsCount > 0 ? 'Sẵn sàng xuất file Word/PDF' : 'Chưa có đề kiểm tra',
      icon: FileCheck2,
      iconBg: 'bg-[#EEF2FF] text-[#4338CA]',
      change: totalExamsCount > 0 ? `${totalExamsCount} đề thi trong kho` : 'Chưa tạo đề thi',
      module: 'exam_management' as ActiveModule
    },
    {
      title: 'Bài Tập Về Nhà Đã Giao',
      value: totalAssignmentsCount,
      subtext: totalAssignmentsCount > 0 ? 'Phiếu rèn luyện đang mở' : 'Chưa có bài tập về nhà',
      icon: ClipboardList,
      iconBg: 'bg-[#EEF2FF] text-[#4338CA]',
      change: totalAssignmentsCount > 0 ? `${totalAssignmentsCount} phiếu bài tập` : 'Chưa giao bài tập',
      module: 'assignment' as ActiveModule
    }
  ];

  // --------------------------------------------------------------------------
  // 3. TIẾN ĐỘ HỌC TẬP CỦA EM (MÔN TIỂU HỌC ĐỒNG BỘ THEO CẤU HÌNH THỰC TẾ CỦA KHỐI/LỚP)
  // --------------------------------------------------------------------------
  const { classes: liveClassesList } = useClassesList();

  // Lấy danh sách môn học thực tế được cấu hình cho Khối / Lớp của học sinh
  const studentConfiguredSubjectNames = useMemo(() => {
    return getSubjectsForClassOrGrade(studentClassName, liveClassesList);
  }, [studentClassName, liveClassesList]);

  // Các bài tập được giao cho đúng lớp/khối của học sinh
  const targetedStudentAssignments = useMemo(() => {
    return (assignments || []).filter(as => {
      if (!as || !as.id) return false;
      return isTargetingStudent(as.targetClass, as.grade, studentClassName, studentGrade);
    });
  }, [assignments, studentClassName, studentGrade]);

  // Các đề thi/khảo thí được giao cho đúng lớp/khối của học sinh
  const targetedStudentExams = useMemo(() => {
    return (exams || []).filter(ex => {
      if (!ex || !ex.id) return false;
      return isTargetingStudent(ex.targetClass, ex.grade, studentClassName, studentGrade);
    });
  }, [exams, studentClassName, studentGrade]);

  // Các bài giảng E-Learning / 5E được giao cho đúng lớp/khối của học sinh
  const targetedStudentELearning = useMemo(() => {
    const list: Array<{ id: string; title: string; subject: string; topic?: string }> = [];
    (assignedLessonsList || []).forEach(item => {
      if (isTargetingStudent(item.targetClass, (item as any).grade, studentClassName, studentGrade)) {
        list.push({
          id: item.id,
          title: item.title || (item as any).lessonTitle || '',
          subject: item.subject || '',
          topic: (item as any).topic || ''
        });
      }
    });
    (lessons || []).forEach(l => {
      if (isTargetingStudent((l as any).targetClass || (l as any).classInfo, l.grade, studentClassName, studentGrade)) {
        if (!list.some(existing => existing.id === l.id || (existing.title && existing.title === l.title))) {
          list.push({
            id: l.id,
            title: l.title,
            subject: l.subject,
            topic: l.topic
          });
        }
      }
    });
    return list;
  }, [assignedLessonsList, lessons, studentClassName, studentGrade]);

  // Các trò chơi tương tác / Quizzi được giao cho đúng lớp/khối của học sinh
  const targetedStudentGames = useMemo(() => {
    const list: Array<{ id: string | number; title: string; subject: string }> = [];
    (quizziGames || []).forEach(g => {
      if (isTargetingStudent(g.classInfo, g.grade, studentClassName, studentGrade)) {
        list.push({
          id: g.id,
          title: g.title,
          subject: g.subject || g.subjectLabel || ''
        });
      }
    });
    (roomGames || []).forEach(g => {
      if (isTargetingStudent(g.classInfo, g.grade, studentClassName, studentGrade)) {
        list.push({
          id: g.id,
          title: g.title,
          subject: g.subject || ''
        });
      }
    });
    return list;
  }, [quizziGames, roomGames, studentClassName, studentGrade]);

  // TIẾN ĐỘ HỌC TẬP GÓC NHÌN HỌC SINH:
  // CHỈ hiển thị những môn học THỰC SỰ có bài giao (assignments/exams/elearning/games) cho lớp của học sinh.
  // Ẩn hoàn toàn các môn chưa từng được giao bài.
  const studentSubjectProgress = useMemo(() => {
    const results: Array<{
      name: string;
      topic: string;
      percentage: number;
      completedLessons: number;
      totalLessons: number;
      gradient: string;
      badge: string;
    }> = [];

    // Tổng hợp tất cả các môn học tiềm năng (từ danh sách môn cấu hình + các môn từ bài đã giao)
    const candidateSubjects = [...studentConfiguredSubjectNames];
    [...targetedStudentAssignments, ...targetedStudentExams, ...targetedStudentELearning, ...targetedStudentGames].forEach(item => {
      if (item.subject && !candidateSubjects.some(s => isSubjectMatch(item.subject, s))) {
        candidateSubjects.push(item.subject);
      }
    });

    candidateSubjects.forEach(subjName => {
      const display = getSubjectDisplayConfig(subjName);
      const matchingAssignments = targetedStudentAssignments.filter(a => isSubjectMatch(a.subject, subjName));
      const matchingExams = targetedStudentExams.filter(e => isSubjectMatch(e.subject, subjName));
      const matchingLessons = targetedStudentELearning.filter(l => isSubjectMatch(l.subject, subjName));
      const matchingGames = targetedStudentGames.filter(g => isSubjectMatch(g.subject, subjName));

      const totalCount = matchingAssignments.length + matchingExams.length + matchingLessons.length + matchingGames.length;

      // ĐIỀU KIỆN QUAN TRỌNG: ẨN MÔN CHƯA CÓ BÀI GIAO (totalCount === 0) Ở GIAO DIỆN HỌC SINH
      if (totalCount === 0) {
        return;
      }

      // Đếm số bài đã nộp / hoàn thành
      let completedCount = 0;
      matchingAssignments.forEach(as => {
        const hasSub = (as.submissions || []).some(s => s.studentId === currentStudentId) ||
          completedAssignmentIds.has(as.id);
        if (hasSub) completedCount++;
      });
      matchingExams.forEach(ex => {
        if (completedExamIds.has(ex.id)) completedCount++;
      });
      matchingLessons.forEach(l => {
        const prog = studentLessonProgressMap[l.id];
        if (prog?.status === 'completed' || (prog?.progressPct && prog.progressPct >= 100)) {
          completedCount++;
        }
      });

      const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const activeTopic = matchingLessons[0]?.title ||
        matchingAssignments[0]?.title ||
        matchingExams[0]?.title ||
        matchingGames[0]?.title ||
        display.defaultTopic;

      const badge = percentage === 100
        ? 'Hoàn thành 🏆'
        : (completedCount > 0 ? 'Đang học 📚' : 'Mới giao ⚡');

      results.push({
        name: display.name,
        topic: activeTopic,
        percentage,
        completedLessons: completedCount,
        totalLessons: totalCount,
        gradient: display.gradient,
        badge
      });
    });

    return results;
  }, [
    studentConfiguredSubjectNames,
    targetedStudentAssignments,
    targetedStudentExams,
    targetedStudentELearning,
    targetedStudentGames,
    currentStudentId,
    completedAssignmentIds,
    completedExamIds,
    studentLessonProgressMap
  ]);

  // --------------------------------------------------------------------------
  // 4. THÔNG BÁO CỦA EM (THÔNG BÁO CÁ NHÂN HỌC SINH)
  // --------------------------------------------------------------------------
  const studentNotifications = React.useMemo(() => {
    const list = [];
    if (regularAssignments.length > 0) {
      const firstAs = regularAssignments[0];
      list.push({
        id: 'notif-as-1',
        title: 'Phiếu bài tập mới được giao',
        content: `Bài tập: "${firstAs.title}". Hạn nộp: ${firstAs.dueDate || 'Sớm nhất'}.`,
        module: 'assignment' as ActiveModule,
        moduleLabel: 'Bài tập',
        timestamp: 'Hôm nay',
        icon: ClipboardList,
        iconColor: 'bg-orange-100 text-orange-600',
        unread: true
      });
    }
    if (exams.length > 0) {
      const firstEx = exams[0];
      list.push({
        id: 'notif-ex-1',
        title: 'Phòng khảo thí trực tuyến đã mở',
        content: `Đề thi: "${firstEx.title}" (${firstEx.durationMinutes || 45} phút) sẵn sàng làm bài.`,
        module: 'exam_management' as ActiveModule,
        moduleLabel: 'Đề thi',
        timestamp: 'Mới nhất',
        icon: FileCheck2,
        iconColor: 'bg-blue-100 text-blue-600',
        unread: true
      });
    }
    if (completedSubmissionsCount > 0) {
      list.push({
        id: 'notif-sub-1',
        title: 'Lịch sử nộp bài tập',
        content: `Em đã hoàn thành ${completedSubmissionsCount} bài tập rèn luyện. Tiếp tục phát huy nhé!`,
        module: 'assignment' as ActiveModule,
        moduleLabel: 'Bài tập',
        timestamp: 'Gần đây',
        icon: MessageSquare,
        iconColor: 'bg-emerald-100 text-emerald-600',
        unread: false
      });
    }
    if (list.length === 0) {
      list.push({
        id: 'notif-empty',
        title: 'Thông báo học tập',
        content: 'Chưa có thông báo mới từ giáo viên. Em hãy sẵn sàng cho các bài học tiếp theo nhé!',
        module: 'assignment' as ActiveModule,
        moduleLabel: 'Học tập',
        timestamp: 'Hiện tại',
        icon: Bell,
        iconColor: 'bg-slate-100 text-slate-600',
        unread: false
      });
    }
    return list;
  }, [regularAssignments, exams, lessons, completedSubmissionsCount]);

  // --------------------------------------------------------------------------
  // 5. TEACHER SUBJECT PROGRESS & LOGS
  // --------------------------------------------------------------------------
  const primarySubjectsList = [
    { name: 'Toán', scope: 'Khối 3' },
    { name: 'Tiếng Việt', scope: 'Khối 3' },
    { name: 'Đạo Đức', scope: 'Khối 3' },
    { name: 'Tự Nhiên & Xã Hội', scope: 'Khối 3' },
    { name: 'Tiếng Anh', scope: 'Khối 3' },
    { name: 'Tin Học', scope: 'Khối 3' },
    { name: 'Công Nghệ', scope: 'Khối 3' },
    { name: 'Âm Nhạc & Mĩ Thuật', scope: 'Khối 3' },
    { name: 'Hoạt Động Trải Nghiệm', scope: 'Khối 3' }
  ];

  const teacherSubjectProgress = primarySubjectsList.map(subj => {
    const matchingLessons = lessons.filter(l => isSubjectMatch(l.subject, subj.name));
    const total = matchingLessons.length;
    const hasData = total > 0;
    return {
      name: subj.name,
      scope: subj.scope,
      totalLessons: total,
      percentage: hasData ? 100 : null,
      hasData
    };
  });

  // --------------------------------------------------------------------------
  // 6. QUICK ACCESS CARDS
  // --------------------------------------------------------------------------
  const studentQuickAccessCards = [
    {
      id: 'assignment' as ActiveModule,
      title: 'Bài Tập Của Tôi',
      description: 'Xem phiếu bài tập được giao, hoàn thành bài làm và nộp bài trực tuyến thuận tiện.',
      icon: ClipboardList,
      badge: 'Nộp bài 📝',
      badgeColor: 'bg-orange-100 text-orange-800',
      bgColor: 'bg-orange-100 text-orange-700',
      borderColor: 'border-orange-200 hover:border-orange-500 bg-orange-50/40',
      textColor: 'group-hover:text-orange-700'
    },
    {
      id: 'exam_management' as ActiveModule,
      title: 'Đề Kiểm Tra & Khảo Thí',
      description: 'Tham gia các bài kiểm tra định kỳ trực tuyến, kiểm tra độ chính xác và xem giải thích chi tiết.',
      icon: FileCheck2,
      badge: 'Khảo thí 🎯',
      badgeColor: 'bg-blue-100 text-blue-800',
      bgColor: 'bg-blue-100 text-blue-700',
      borderColor: 'border-blue-200 hover:border-blue-500 bg-blue-50/40',
      textColor: 'group-hover:text-blue-700'
    }
  ];

  const teacherQuickAccessCards = [
    {
      id: 'exam_management' as ActiveModule,
      title: 'Tạo & Quản Lý Đề Kiểm Tra',
      description: 'Khởi tạo ma trận đề, trộn câu hỏi ngẫu nhiên và xuất file Word/PDF chuyên nghiệp.',
      icon: FileCheck2,
      bgColor: 'bg-indigo-50 text-[#4338CA]',
      borderColor: 'border-indigo-100 hover:border-[#4338CA]'
    },
    {
      id: 'assignment' as ActiveModule,
      title: 'Quản Lý Bài Tập',
      description: 'Giao bài tập trực tuyến, theo dõi tiến độ nộp bài và chấm tự động AI.',
      icon: ClipboardList,
      bgColor: 'bg-emerald-50 text-emerald-700',
      borderColor: 'border-emerald-100 hover:border-emerald-500'
    },
    {
      id: 'question_bank' as ActiveModule,
      title: 'Ngân Hàng Câu Hỏi',
      description: 'Quản lý kho câu hỏi theo 4 mức độ nhận thức chuẩn Bộ GD&ĐT, hỗ trợ import Excel.',
      icon: Database,
      bgColor: 'bg-blue-50 text-blue-700',
      borderColor: 'border-blue-100 hover:border-blue-500'
    },
    {
      id: 'user_management' as ActiveModule,
      title: 'Quản Lý Người Dùng',
      description: 'Quản lý danh sách học sinh theo từng lớp, phân quyền giáo viên và theo dõi dữ liệu trường.',
      icon: Users,
      bgColor: 'bg-amber-50 text-amber-700',
      borderColor: 'border-amber-100 hover:border-amber-500'
    }
  ];

  const quickAccessCards = userRole === 'student' ? studentQuickAccessCards : teacherQuickAccessCards;

  // Điều hướng màn hình mặc định cho học sinh: khi vừa đăng nhập sẽ lập tức trỏ thẳng vào 'assignment' ("Nhiệm vụ học tập")
  useEffect(() => {
    if (userRole === 'student' && typeof window !== 'undefined') {
      let hasExplicitDashboard = false;
      try {
        hasExplicitDashboard = sessionStorage.getItem('eduplay_student_explicit_dashboard') === 'true';
      } catch {}
      if (!hasExplicitDashboard) {
        onNavigate?.('assignment');
      }
    }
  }, [userRole, onNavigate]);

  // Tránh nhấp nháy màn hình nếu học sinh vừa đăng nhập và cần trỏ thẳng vào Nhiệm Vụ Học Tập
  if (userRole === 'student' && typeof window !== 'undefined') {
    let hasExplicitDashboard = false;
    try {
      hasExplicitDashboard = sessionStorage.getItem('eduplay_student_explicit_dashboard') === 'true';
    } catch {}
    if (!hasExplicitDashboard) {
      return null;
    }
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      
      {/* ========================================================================= */}
      {/* 1. WELCOME BANNER (3D Modern Stage) */}
      {/* ========================================================================= */}
      {userRole === 'student' ? (
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 rounded-[28px] p-7 sm:p-9 text-white shadow-2xl relative overflow-hidden border border-purple-300/40 min-h-[180px] flex items-center">
          {/* Background Ambient Glows & Sparkles Decor */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-200 via-pink-400 to-transparent pointer-events-none" />
          <div className="absolute -right-8 -top-8 w-64 h-64 bg-pink-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-10 w-56 h-56 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
          
          {/* Subtle background star sparkles */}
          <div className="absolute top-4 right-1/4 text-amber-200/30 text-lg pointer-events-none select-none">✦</div>
          <div className="absolute bottom-4 left-1/4 text-pink-200/30 text-base pointer-events-none select-none">✧</div>
          <div className="absolute top-1/2 right-1/3 text-amber-300/20 text-sm pointer-events-none select-none">★</div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 w-full">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/30 shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Góc Học Tập Của {studentName} ({studentClassName}) ✨</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight drop-shadow-sm flex items-center gap-3">
                <span>{getGreeting()}, {studentName}!</span>
                <span className="text-2xl sm:text-3xl animate-bounce">👋</span>
              </h2>
              <p className="text-xs sm:text-sm text-purple-100 leading-relaxed font-medium">
                Hôm nay em muốn khám phá điều gì? Làm bài tập về nhà, tham gia đấu trường đối kháng, xem bài giảng 5E sinh động hay kiểm tra học bạ số của mình nhé!
              </p>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3.5">
                <button
                  onClick={() => onNavigate?.('assignment')}
                  className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 duration-200 border border-orange-400"
                >
                  <span>Làm Bài Tập Ngay 📝</span>
                </button>

                <button
                  onClick={() => onNavigate?.('exam_management')}
                  className="px-6 py-3.5 bg-white/20 hover:bg-white/30 text-white font-black text-xs sm:text-sm rounded-2xl transition-all backdrop-blur-md flex items-center justify-center gap-2 cursor-pointer border border-white/35 shadow-md"
                >
                  <span>🎯 Phòng Khảo Thí</span>
                </button>
              </div>
            </div>

            {/* Right Mascot 3D Stage */}
            <div className="hidden sm:flex items-center justify-center relative shrink-0">
              <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-3xl bg-gradient-to-tr from-white/10 via-white/25 to-pink-300/30 backdrop-blur-md border border-white/40 shadow-2xl flex items-center justify-center relative transform hover:scale-105 transition-transform duration-300 group">
                <div className="relative flex flex-col items-center justify-center">
                  <span className="text-4xl lg:text-5xl filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] animate-pulse">
                    🚀
                  </span>
                  
                  {/* Floating Micro Badges */}
                  <span className="absolute -top-3.5 -right-3.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 font-black text-[9px] shadow-md border border-amber-100 tracking-wider">
                    LV.{currentLevel} 🌟
                  </span>
                  
                  <span className="absolute -bottom-3 px-2 py-0.5 rounded-full bg-purple-900/90 text-amber-300 font-black text-[9px] shadow-md border border-purple-400/50 backdrop-blur-xs whitespace-nowrap">
                    Học Sinh Chăm Chỉ 🥇
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#4338CA] rounded-3xl p-6 sm:p-9 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Dạy & Học Số PK Trực Khang - Nền tảng Giáo dục 4.0 Tích hợp AI</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight">
              {getGreeting()}, {teacherName}!
            </h2>
            <p className="text-sm text-indigo-100 leading-relaxed max-w-2xl font-normal">
              Hệ thống quản lý dạy và học tập trung cho Trường Tiểu học Trực Khang. Khởi tạo ngân hàng câu hỏi thông minh với Gemini AI, tự động trộn đề kiểm tra và giao bài tập trực tuyến.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                onClick={() => onNavigate?.('question_bank')}
                className="px-6 py-3.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 duration-200 shrink-0"
              >
                <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                <span>Tạo Câu Hỏi Với AI</span>
              </button>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-indigo-100 font-medium pt-1 sm:pt-0">
                <span className="text-indigo-200/80 font-normal">Khám phá nhanh:</span>
                <button
                  onClick={() => onNavigate?.('exam_management')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors backdrop-blur-xs"
                >
                  Quản lý đề thi
                </button>
                <button
                  onClick={() => onNavigate?.('assignment')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors backdrop-blur-xs"
                >
                  Quản lý bài tập
                </button>
                <button
                  onClick={() => onNavigate?.('user_management')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors backdrop-blur-xs"
                >
                  Người dùng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 4 METRIC / KPI CARDS (Personalized for Student, School-wide for Teacher) */}
      {/* ========================================================================= */}
      {userRole === 'student' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {studentStatCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                onClick={() => onNavigate?.(stat.module)}
                className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md ${stat.borderHover} transition-all duration-200 group cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {stat.title}
                    </span>
                    <div className={`p-2.5 rounded-xl ${stat.iconBg} shadow-xs group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight block">
                      {stat.value}
                    </span>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${stat.badgeColor}`}>
                        {stat.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{stat.subtext}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teacherStatCards.map((stat, idx) => {
            const Icon = stat.icon;
            const isZero = stat.value === 0 || stat.value === undefined || stat.value === null;
            return (
              <div
                key={idx}
                onClick={() => onNavigate?.(stat.module)}
                className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-xs hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {stat.title}
                    </span>
                    <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    {isZero ? (
                      <span className="text-sm font-bold text-[#4338CA] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Bắt đầu ngay <ArrowRight className="w-4 h-4" />
                      </span>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold text-slate-900 font-heading">
                          {stat.value}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" /> {stat.change}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                  {stat.subtext}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN SECTION: (Student: Tiến Độ Của Em + Thông Báo Của Em) / (Teacher) */}
      {/* ========================================================================= */}
      {userRole === 'student' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Left Col: TIẾN ĐỘ HỌC TẬP CỦA EM */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <span>Tiến Độ Học Tập Của Em</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Theo dõi mức độ hoàn thành bài giảng 5E và bài luyện tập của <strong>{studentName}</strong> ({studentClassName})
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 shrink-0">
                  Năm học 2026-2027
                </span>
              </div>

              {studentSubjectProgress.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {studentSubjectProgress.map((sub, idx) => {
                    const subjColor = getSubjectColorStyles(sub.name);
                    return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl bg-white border ${subjColor.cardBorder} hover:shadow-xs transition-all space-y-2 relative overflow-hidden`}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1 ${subjColor.topBarBg}`} />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{subjColor.emoji}</span>
                          <span className="font-extrabold text-sm text-slate-800">{sub.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${subjColor.badgeClass} shadow-2xs`}>
                            {sub.badge}
                          </span>
                        </div>
                        <span className={`font-black text-sm ${subjColor.text} font-heading`}>
                          {sub.percentage}%
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-snug line-clamp-1">
                        {sub.topic}
                      </p>

                      <div className="space-y-1">
                        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${sub.gradient}`}
                            style={{ width: `${sub.percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>Đã học {sub.completedLessons}/{sub.totalLessons} bài</span>
                          <span className={sub.percentage === 100 ? 'text-emerald-600 font-bold' : (sub.percentage > 0 ? 'text-indigo-600 font-bold' : 'text-amber-600 font-bold')}>
                            {sub.percentage === 100 ? 'Hoàn thành tốt' : (sub.percentage > 0 ? 'Đang tiến bộ' : 'Chưa hoàn thành')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              ) : (
                <div className="py-8 px-4 rounded-2xl bg-slate-50/80 border border-dashed border-slate-200 text-center space-y-2.5">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Thầy/Cô chưa giao bài môn nào, em quay lại sau nhé!
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Khi thầy cô giao bài tập hoặc đề kiểm tra cho {studentClassName}, tiến độ các môn học sẽ tự động xuất hiện tại đây.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                💡 Lời khuyên: Học đều đặn mỗi ngày để duy trì chuỗi chăm chỉ!
              </span>
              <button
                onClick={() => onNavigate?.('assignment')}
                className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer shrink-0 ml-2"
              >
                Làm bài ngay <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Col: THÔNG BÁO CỦA EM */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2 font-heading">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  <span>Thông Báo Của Em</span>
                </h3>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Mới nhất
                </span>
              </div>

              <div className="space-y-3">
                {studentNotifications.map((notif) => {
                  const ItemIcon = notif.icon;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => onNavigate?.(notif.module)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        notif.unread
                          ? 'bg-indigo-50/40 border-indigo-200/80 hover:border-indigo-400'
                          : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${notif.iconColor} shrink-0`}>
                            <ItemIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs text-slate-900">
                            {notif.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {notif.timestamp}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed pl-7">
                        {notif.content}
                      </p>

                      <div className="pl-7 pt-0.5 flex items-center justify-between text-[11px]">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-white border border-slate-200 text-indigo-700 shadow-2xs">
                          {notif.moduleLabel}
                        </span>
                        <span className="font-bold text-indigo-600 flex items-center gap-0.5 hover:underline">
                          Xem ngay <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <button
                onClick={() => onNavigate?.('assignment')}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 w-full cursor-pointer"
              >
                Xem tất cả nhiệm vụ học tập <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* TEACHER / ADMIN MAIN SECTION */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Teacher Subject Completion Progress */}
            <div className="bg-white rounded-2xl p-6 border border-[#F3F4F6] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
                    <BarChart3 className="w-5 h-5 text-[#4338CA]" /> Tiến Độ Hoàn Thành Chương Trình Học
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thống kê theo dõi bài giảng 5E và ngân hàng câu hỏi môn học
                  </p>
                </div>
                <span className="text-xs font-bold text-[#4338CA] bg-[#EEF2FF] px-2.5 py-1 rounded-full border border-indigo-100">
                  Học kỳ I 2026-2027
                </span>
              </div>

              <div className="space-y-4 pt-2">
                {teacherSubjectProgress.map((sub, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{sub.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({sub.scope})</span>
                      </div>
                      {sub.hasData ? (
                        <span className="font-bold text-indigo-600">100% ({sub.totalLessons} bài)</span>
                      ) : (
                        <span className="font-medium text-slate-400 bg-slate-100 text-[10px] px-2 py-0.5 rounded-full">
                          Chưa có dữ liệu
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          sub.hasData
                            ? 'bg-gradient-to-r from-[#4338CA] to-[#F97316]'
                            : 'bg-slate-200'
                        }`}
                        style={{ width: `${sub.hasData ? 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher Academic Grade Distribution Chart */}
            <div className="bg-white rounded-2xl p-6 border border-[#F3F4F6] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
                <Award className="w-5 h-5 text-amber-500" /> Phân Phối Bảng Điểm Học Sinh Toàn Khối
              </h3>

              <div className="p-6 rounded-xl bg-slate-50/80 border border-dashed border-slate-200 text-center space-y-1.5">
                <span className="text-2xl">📊</span>
                <h4 className="text-xs font-bold text-slate-700">Chưa có dữ liệu bảng điểm</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Dữ liệu phân phối kết quả đánh giá (Giỏi, Khá, Trung bình) sẽ tự động tổng hợp khi giáo viên cập nhật sổ điểm định kỳ tại Học Bạ Số.
                </p>
              </div>
            </div>
          </div>

          {/* Teacher Activity Stream */}
          <div className="bg-white rounded-2xl p-6 border border-[#F3F4F6] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <Clock className="w-5 h-5 text-[#4338CA]" /> Hoạt Động Mới Nhất
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">
                  Cập nhật trực tiếp
                </span>
              </div>

              {actualLogs.length > 0 ? (
                <div className="space-y-3.5">
                  {actualLogs.map((log: any, idx: number) => {
                    const ItemIcon = log.icon || Clock;
                    return (
                      <div
                        key={log.id || idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <ItemIcon className="w-3.5 h-3.5 text-[#4338CA]" />
                            {log.user}
                          </span>
                          <span className="text-[10px] text-slate-400">{log.timestamp || log.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug pl-5">
                          {log.action}
                        </p>
                        <div className="pt-1 pl-5 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EEF2FF] text-[#4338CA]">
                            {log.module}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Chưa có hoạt động mới</p>
                  <p className="text-[11px] text-slate-400">Nhật ký hệ thống sẽ hiển thị ở đây khi có thao tác mới.</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button
                onClick={() => onNavigate?.('exam_management')}
                className="text-xs font-bold text-[#4338CA] hover:text-[#3730A3] flex items-center justify-center gap-1 w-full cursor-pointer"
              >
                Khám phá tất cả tính năng <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. QUICK ACCESS SECTION (Truy Cập Nhanh Phân Hệ) */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 font-heading flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <span>Truy Cập Nhanh Phân Hệ</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Chọn nhanh tính năng trọng tâm để bắt đầu</span>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === 'student' ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4`}>
          {quickAccessCards.map((card: any) => {
            const CardIcon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigate?.(card.id)}
                className={`bg-white rounded-2xl p-5 border-2 ${card.borderColor} shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs`}>
                      <CardIcon className="w-6 h-6" />
                    </div>
                    {card.badge && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${card.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold text-slate-900 ${card.textColor || 'group-hover:text-[#4338CA]'} transition-colors`}>
                      {card.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-slate-900">
                  <span>Khám phá ngay</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
