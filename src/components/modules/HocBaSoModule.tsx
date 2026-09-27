import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Lock,
  Unlock,
  Minimize2,
  Maximize2,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Award,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Filter,
  Flame,
  Target,
  Brain,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Calendar,
  User,
  ShieldCheck,
  Heart,
  HelpCircle,
  GraduationCap,
  Star,
  Check,
  Zap,
  Clock,
  BarChart2,
  ChevronDown,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ReferenceLine
} from 'recharts';
import { UserRole, StudentRecord as GlobalStudentRecord, ExamPaper, HomeworkAssignment, Lesson5EPlan, GameItem } from '../../types';
import { PRIMARY_SCHOOL_SUBJECTS } from '../../services/mockData';
import { GRADES, CLASSES_BY_GRADE, EXAM_TYPES } from '../../lib/constants';
import { useClassesList, getSubjectsForClassOrGrade } from '../../services/classStorageService';
import {
  calculateUnifiedHocBaData,
  SCORE_WEIGHTS,
  SubjectScoreBreakdown,
  StudentHocBaSummary,
  isSubjectWithScore
} from '../../services/hocBaDataService';
import {
  getAllStudentsFromLocalStorage,
  saveStudentsToLocalStorage,
  syncClassStudentsToFirestore,
  subscribeToFirestoreClassStudents,
  getStandardClassName
} from '../../services/studentStorageService';
import { exportSoNhanXetToExcel, exportSoTongKetToExcel } from '../../services/excelService';
import { getStudentGameProfile } from '../../services/studentGameStoreService';
import { db } from '../../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface StudentRecord {
  id: string;
  lastName: string;
  firstName: string;
  dob: string;
  isFemale: boolean;
  className: string;
  evaluations: Record<string, { dat: 'T' | 'H' | 'CHT'; score: string }>;
  commentDetail?: {
    correctCount: number;
    totalQuestions: number;
    strengths: string;
    reminders: string;
    overallDat: 'T' | 'H' | 'CHT';
    score: number;
    hasCommented: boolean;
  };
}

export interface HocBaSoModuleProps {
  userRole?: UserRole;
  exams?: ExamPaper[];
  assignments?: HomeworkAssignment[];
  lessons?: Lesson5EPlan[];
  games?: GameItem[];
  currentStudent?: GlobalStudentRecord | null;
}

function convertToHocBaStudent(st: GlobalStudentRecord): StudentRecord {
  const name = st.fullName || st.name || '';
  const parts = name.trim().split(/\s+/);
  const firstName = parts.length > 0 ? parts[parts.length - 1] : '';
  const lastName = parts.length > 1 ? parts.slice(0, parts.length - 1).join(' ') : '';

  const rawEvaluations = (st as any).evaluations;
  const evaluations: Record<string, { dat: 'T' | 'H' | 'CHT'; score: string }> =
    rawEvaluations && typeof rawEvaluations === 'object' ? rawEvaluations : {};

  const rawComment = (st as any).commentDetail;
  const commentDetail =
    rawComment && rawComment.hasCommented ? rawComment : undefined;

  return {
    id: st.id,
    lastName,
    firstName,
    dob: st.dob || '',
    isFemale: st.gender === 'Nữ',
    className: st.className || '',
    evaluations,
    commentDetail
  };
}

// ============================================================================
// STUDENT UNIFIED HỌC BẠ SỐ COMPONENT (WITH CHARTS & PROGRESS VISUALIZATION)
// ============================================================================

interface SubjectScoreItem {
  subject: string;
  shortName: string;
  score: number;
  level: string;
  status: 'T' | 'H' | 'CHT';
  note: string;
}

const MONTH_FILTER_OPTIONS = [
  { key: '9', label: 'Tháng 9' },
  { key: '10', label: 'Tháng 10' },
  { key: '11', label: 'Tháng 11' },
  { key: '12', label: 'Tháng 12' },
  { key: '1', label: 'Tháng 1' },
  { key: '2', label: 'Tháng 2' },
  { key: '3', label: 'Tháng 3' },
  { key: '4', label: 'Tháng 4' },
  { key: '5', label: 'Tháng 5' }
];

const EXAM_FILTER_OPTIONS = [
  { key: 'all', label: 'Tất cả bài kiểm tra' },
  { key: 'thuong_xuyen', label: 'Thường xuyên' },
  { key: 'giua_ki_1', label: 'Giữa kì 1' },
  { key: 'cuoi_ki_1', label: 'Cuối kì 1' },
  { key: 'giua_ki_2', label: 'Giữa kì 2' },
  { key: 'cuoi_ki_2', label: 'Cuối kì 2' }
];

// Custom Tooltip for Bar Chart
interface CustomBarTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SubjectScoreItem }>;
}

const CustomBarTooltip: React.FC<CustomBarTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl text-xs shadow-xl border border-slate-700/80 space-y-1 z-50">
        <div className="flex items-center justify-between gap-3">
          <span className="font-extrabold text-teal-300">{data.subject}</span>
          <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-black text-xs border border-amber-400/30">
            {data.score}đ
          </span>
        </div>
        <p className="text-[11px] text-slate-300 font-medium leading-tight">
          Đánh giá: <b className="text-emerald-300">{data.level}</b>
        </p>
        <p className="text-[10px] text-slate-400 italic max-w-xs">{data.note}</p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Line Chart
interface CustomLineTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { period: string; gpa: number; note: string } }>;
}

const CustomLineTooltip: React.FC<CustomLineTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl text-xs shadow-xl border border-indigo-500/40 space-y-1 z-50">
        <div className="flex items-center justify-between gap-3">
          <span className="font-extrabold text-indigo-300">{data.period}</span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-amber-300 font-mono font-black text-xs border border-indigo-400/30">
            GPA {data.gpa}
          </span>
        </div>
        <p className="text-[11px] text-emerald-300 font-medium">✓ {data.note}</p>
      </div>
    );
  }
  return null;
};

interface StudentHocBaSoViewProps {
  exams?: ExamPaper[];
  assignments?: HomeworkAssignment[];
  lessons?: Lesson5EPlan[];
  games?: GameItem[];
  currentStudent?: GlobalStudentRecord | null;
}

const StudentHocBaSoView: React.FC<StudentHocBaSoViewProps> = ({
  exams = [],
  assignments = [],
  lessons = [],
  games = [],
  currentStudent = null
}) => {
  const { classes } = useClassesList();
  // Block 2: Test Type Filter & Month Filter state
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('9');

  // Block 7: AI Advisor state
  const [isAiAdvisorActive, setIsAiAdvisorActive] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const studentId = currentStudent?.id || 'hs-01';
  const studentClassName = currentStudent?.className || '';

  // Calculate real unified Học Bạ data from the 3 modules with student subject filtering
  const hocBaSummary: StudentHocBaSummary = useMemo(() => {
    return calculateUnifiedHocBaData({
      studentId,
      studentName: currentStudent ? (currentStudent.name || currentStudent.fullName || 'Hoàng Bảo An') : 'Hoàng Bảo An',
      className: studentClassName,
      examFilter: selectedExamFilter,
      selectedMonth,
      exams,
      assignments,
      lessons,
      games,
      classesList: classes,
      onlyAssignedSubjects: true
    });
  }, [studentId, currentStudent, studentClassName, selectedExamFilter, selectedMonth, exams, assignments, lessons, games, classes]);

  // Synchronized subject scores based on unified real data calculation
  const activeSubjects: SubjectScoreItem[] = useMemo(() => {
    if (!hocBaSummary || !Array.isArray(hocBaSummary.subjects)) return [];
    return hocBaSummary.subjects.map(sub => ({
      subject: sub.subject,
      shortName: sub.shortName,
      score: sub.score,
      level: sub.level,
      status: sub.status,
      note: sub.note
    }));
  }, [hocBaSummary]);

  // Block 8: Personal Goals state
  const [goals, setGoals] = useState<{ id: string; text: string; completed: boolean }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eduplay_student_goals');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return [
      { id: '1', text: 'Hoàn thành đầy đủ 100% bài tập tuần này', completed: false },
      { id: '2', text: 'Luyện tập thực hành chuột và gõ phím ít nhất 15 phút mỗi ngày', completed: false },
      { id: '3', text: 'Tích lũy thêm 3 Bông Hoa Điểm 10 thi đua lớp học', completed: false }
    ];
  });

  const [newGoalText, setNewGoalText] = useState<string>('');

  const handleSaveGoals = (updatedGoals: { id: string; text: string; completed: boolean }[]) => {
    setGoals(updatedGoals);
    if (typeof window !== 'undefined') {
      localStorage.setItem('eduplay_student_goals', JSON.stringify(updatedGoals));
    }
  };

  const handleToggleGoal = (id: string) => {
    const next = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
    handleSaveGoals(next);
  };

  const handleDeleteGoal = (id: string) => {
    const next = goals.filter(g => g.id !== id);
    handleSaveGoals(next);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    const newGoal = {
      id: `goal-${Date.now()}`,
      text: newGoalText.trim(),
      completed: false
    };
    const next = [...goals, newGoal];
    handleSaveGoals(next);
    setNewGoalText('');
  };

  const completedGoalsCount = goals.filter(g => g.completed).length;

  const handleActivateAI = () => {
    setIsAiLoading(true);
    setTimeout(() => {
      setIsAiLoading(false);
      setIsAiAdvisorActive(true);
    }, 900);
  };

  // Dynamic Homeroom Teacher lookup for student's class
  const studentHomeroomTeacher = useMemo(() => {
    if (!studentClassName) return 'Phạm Thị Thanh Thảo';
    const clean = studentClassName.replace(/^Lớp\s+/i, '').trim().toLowerCase();
    const found = classes.find(c => {
      const cClean = c.name.replace(/^Lớp\s+/i, '').trim().toLowerCase();
      return c.id.toLowerCase() === clean || cClean === clean || c.name.toLowerCase() === studentClassName.toLowerCase();
    });
    return found?.homeroomTeacher?.trim() || 'Phạm Thị Thanh Thảo';
  }, [studentClassName, classes]);

  // Compute calculated GPA dynamically from real calculated data
  const calculatedGPA = hocBaSummary.gpa !== null
    ? hocBaSummary.gpa.toFixed(1)
    : 'Chưa có dữ liệu';

  // Find max and min scores for visual highlights among evaluated subjects
  const evaluatedSubjects = activeSubjects.filter(s => s.score !== null && s.score !== undefined);
  const maxScore = evaluatedSubjects.length > 0 ? Math.max(...evaluatedSubjects.map(s => s.score as number)) : null;
  const minScore = evaluatedSubjects.length > 0 ? Math.min(...evaluatedSubjects.map(s => s.score as number)) : null;
  const maxSubjects = maxScore !== null ? evaluatedSubjects.filter(s => s.score === maxScore) : [];
  const minSubjects = minScore !== null ? evaluatedSubjects.filter(s => s.score === minScore) : [];

  // Soft, child-friendly color palette for normal bars
  const SOFT_COLORS = [
    '#38bdf8', // Sky
    '#818cf8', // Indigo
    '#a78bfa', // Purple
    '#f472b6', // Pink
    '#2dd4bf', // Teal
    '#60a5fa', // Blue
    '#c084fc', // Violet
    '#4ade80', // Green
    '#fb923c'  // Orange
  ];

  // Incentive Badges Filter & Modal States
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedBadgeModal, setSelectedBadgeModal] = useState<{
    id: string;
    name: string;
    icon: string;
    category: string;
    description: string;
    conditionText: string;
    isUnlocked: boolean;
    currentValue: number;
    targetValue: number;
    unit: string;
    progressPct: number;
    colorScheme: string;
    rewardExp: string;
    statusLabel: string;
    quote: string;
  } | null>(null);

  // Read student game profile from localStorage
  const studentGameProfile = useMemo(() => {
    return getStudentGameProfile(studentId, currentStudent?.name || currentStudent?.fullName);
  }, [studentId, currentStudent]);

  // Calculate 8 Incentive Badges 100% from REAL student activity & evaluation data
  const studentIncentiveBadges = useMemo(() => {
    // 1. Chăm chỉ nộp bài (Attendance / Homework submissions)
    const hwCompleted = hocBaSummary.attendance.homeworkCompleted || 0;
    const hwTotal = hocBaSummary.attendance.homeworkTotal || 0;
    const hwRate = hocBaSummary.attendance.homeworkRate;
    const isHwUnlocked = hwCompleted >= 3 || (hwRate !== null && hwRate >= 80);
    const hwTarget = Math.max(3, hwTotal > 0 ? hwTotal : 3);
    const hwProgress = Math.min(100, Math.round((hwCompleted / hwTarget) * 100));

    // 2. Vườn hoa điểm 10 (10-Score Flowers)
    const hoaCount = hocBaSummary.hoaDiem10Count || 0;
    const hoaTarget = 2;
    const isHoaUnlocked = hoaCount >= 1;
    const hoaProgress = Math.min(100, Math.round((hoaCount / hoaTarget) * 100));

    // 3. Chiến binh Đấu Trường (Game EXP / Coins / Level)
    const currentExp = studentGameProfile.currentExp || 0;
    const currentCoins = studentGameProfile.coins || currentStudent?.coins || 0;
    const currentLvl = studentGameProfile.level || 1;
    const isArenaUnlocked = currentLvl >= 2 || currentExp >= 50 || currentCoins >= 50;
    const arenaTarget = 100;
    const arenaMetric = Math.max(currentExp, currentCoins);
    const arenaProgress = Math.min(100, Math.round((arenaMetric / arenaTarget) * 100));

    // 4. Kiên trì luyện đề (Exam Submissions)
    const examSubjectsCount = hocBaSummary.subjects.filter(s => s.examScore !== null).length;
    const isExamUnlocked = examSubjectsCount >= 2;
    const examTarget = 2;
    const examProgress = Math.min(100, Math.round((examSubjectsCount / examTarget) * 100));

    // 5. Siêu sao Tin học (Computer Science & Tech score)
    const tinSubject = hocBaSummary.subjects.find(s => 
      s.subject.toLowerCase().includes('tin') || s.subject.toLowerCase().includes('công nghệ')
    );
    const tinScore = tinSubject?.score ?? null;
    const isTinUnlocked = tinScore !== null && tinScore >= 8.5;
    const tinTarget = 8.5;
    const tinProgress = tinScore !== null ? Math.min(100, Math.round((tinScore / tinTarget) * 100)) : 0;

    // 6. Nhà thám hiểm 5E (E-Learning 5E Lessons)
    const lesCompleted = hocBaSummary.attendance.lessonsCompleted || 0;
    const isLesUnlocked = lesCompleted >= 1;
    const lesTarget = 1;
    const lesProgress = Math.min(100, Math.round((lesCompleted / lesTarget) * 100));

    // 7. Ngôi sao Toàn diện (GPA >= 8.0 with at least 2 evaluated subjects)
    const gpaVal = hocBaSummary.gpa;
    const isGpaUnlocked = gpaVal !== null && gpaVal >= 8.0 && hocBaSummary.evaluatedSubjectsCount >= 2;
    const gpaTarget = 8.0;
    const gpaProgress = gpaVal !== null ? Math.min(100, Math.round((gpaVal / gpaTarget) * 100)) : 0;

    // 8. Tự chủ Mục tiêu (Completed Personal Goals)
    const isGoalUnlocked = completedGoalsCount >= 1;
    const goalTarget = Math.max(1, goals.length);
    const goalProgress = Math.min(100, Math.round((completedGoalsCount / goalTarget) * 100));

    return [
      {
        id: 'badge-cham-chi',
        name: 'CHĂM CHỈ NỘP BÀI',
        icon: '📚',
        category: 'Chuyên cần',
        description: 'Hoàn thành và nộp đầy đủ các bài tập tự luyện được giao trên hệ thống.',
        conditionText: 'Hoàn thành từ 3 bài tập trở lên hoặc đạt tỷ lệ chuyên cần bài tập ≥ 80%',
        isUnlocked: isHwUnlocked,
        currentValue: hwCompleted,
        targetValue: hwTarget,
        unit: 'bài tập',
        progressPct: isHwUnlocked ? 100 : hwProgress,
        colorScheme: 'emerald',
        rewardExp: '+100 EXP',
        statusLabel: isHwUnlocked ? (hwCompleted >= hwTarget ? 'Xuất Sắc 🌟' : 'Đã Đạt 🏆') : `Còn thiếu ${Math.max(1, hwTarget - hwCompleted)} bài`,
        quote: '“Kiến tha lâu đầy tổ” — Sự chăm chỉ nộp bài mỗi ngày giúp em tích lũy hành trang vững vàng!'
      },
      {
        id: 'badge-hoa-diem-10',
        name: 'VƯỜN HOA ĐIỂM 10',
        icon: '🌸',
        category: 'Thành tích',
        description: 'Đạt điểm số 10 tuyệt đối trong các bài kiểm tra, bài tập hoặc bài học 5E.',
        conditionText: 'Đạt từ 1 Bông Hoa Điểm 10 trở lên trong quá trình học tập',
        isUnlocked: isHoaUnlocked,
        currentValue: hoaCount,
        targetValue: hoaTarget,
        unit: 'bông hoa',
        progressPct: isHoaUnlocked ? 100 : hoaProgress,
        colorScheme: 'rose',
        rewardExp: '+150 EXP',
        statusLabel: isHoaUnlocked ? `${hoaCount} Bông Hoa 🌸` : 'Chưa có hoa điểm 10',
        quote: '“Mỗi bông hoa điểm 10 là một niềm tự hào rạng rỡ của em và thầy cô!”'
      },
      {
        id: 'badge-dau-truong',
        name: 'CHIẾN BINH ĐẤU TRƯỜNG',
        icon: '🛡️',
        category: 'Đấu trường',
        description: 'Tích cực tham gia trò chơi trí tuệ, flashcard và tích lũy điểm thưởng Xu/EXP.',
        conditionText: 'Đạt Cấp độ 2 (Level 2) hoặc tích lũy từ 50 EXP / 50 Xu trở lên',
        isUnlocked: isArenaUnlocked,
        currentValue: arenaMetric,
        targetValue: arenaTarget,
        unit: 'EXP/Xu',
        progressPct: isArenaUnlocked ? 100 : arenaProgress,
        colorScheme: 'amber',
        rewardExp: '+200 EXP',
        statusLabel: isArenaUnlocked ? `Level ${currentLvl} ⚡` : `Tiến độ ${arenaMetric}/${arenaTarget}`,
        quote: '“Dũng cảm thử thách, nhanh trí giải đố — Em là chiến binh tri thức cừ khôi!”'
      },
      {
        id: 'badge-kien-tri',
        name: 'KIÊN TRÌ LUYỆN ĐỀ',
        icon: '🧗',
        category: 'Rèn luyện',
        description: 'Chủ động tham gia các bài kiểm tra định kỳ hoặc thường xuyên để rèn luyện.',
        conditionText: 'Hoàn thành từ 2 bài kiểm tra trên hệ thống',
        isUnlocked: isExamUnlocked,
        currentValue: examSubjectsCount,
        targetValue: examTarget,
        unit: 'đề thi',
        progressPct: isExamUnlocked ? 100 : examProgress,
        colorScheme: 'blue',
        rewardExp: '+120 EXP',
        statusLabel: isExamUnlocked ? `${examSubjectsCount} Bài Thi ✨` : `Cần thêm ${Math.max(1, examTarget - examSubjectsCount)} bài`,
        quote: '“Vượt qua thử thách kiểm tra giúp em ngày càng tự tin và vững vàng hơn!”'
      },
      {
        id: 'badge-sieu-sao-tin-hoc',
        name: 'SIÊU SAO TIN HỌC',
        icon: '💻',
        category: 'Môn học',
        description: 'Đam mê công nghệ, làm chủ bài thực hành Tin học & Công nghệ.',
        conditionText: 'Điểm trung bình môn Tin học & Công nghệ đạt từ 8.5 điểm trở lên',
        isUnlocked: isTinUnlocked,
        currentValue: tinScore !== null ? Number(tinScore.toFixed(1)) : 0,
        targetValue: tinTarget,
        unit: 'điểm',
        progressPct: isTinUnlocked ? 100 : tinProgress,
        colorScheme: 'cyan',
        rewardExp: '+180 EXP',
        statusLabel: isTinUnlocked ? `${tinScore}đ Xuất Sắc ⭐` : (tinScore !== null ? `${tinScore}đ / 8.5đ` : 'Chưa có điểm'),
        quote: '“Tin học mở ra cánh cửa sáng tạo công nghệ tương lai của thời đại số!”'
      },
      {
        id: 'badge-cham-chi-ren-luyen',
        name: 'CHIẾN BINH ÔN LUYỆN',
        icon: '🚀',
        category: 'Rèn Luyện',
        description: 'Tự giác trải nghiệm học tập và hoàn thành đầy đủ nhiệm vụ rèn luyện.',
        conditionText: 'Hoàn thành trọn vẹn ít nhất 1 nhiệm vụ bài tập hoặc đề khảo thí',
        isUnlocked: isLesUnlocked,
        currentValue: lesCompleted,
        targetValue: lesTarget,
        unit: 'nhiệm vụ',
        progressPct: isLesUnlocked ? 100 : lesProgress,
        colorScheme: 'purple',
        rewardExp: '+100 EXP',
        statusLabel: isLesUnlocked ? `${lesCompleted} Nhiệm Vụ 🚀` : 'Chưa làm nhiệm vụ',
        quote: '“Kiên trì ôn luyện mỗi ngày là chìa khóa vững chắc mở lối tương lai!”'
      },
      {
        id: 'badge-ngoi-sao-toan-dien',
        name: 'NGÔI SAO TOÀN DIỆN',
        icon: '🏆',
        category: 'Học tập',
        description: 'Duy trì phong độ học tập xuất sắc toàn diện với điểm GPA ấn tượng.',
        conditionText: 'Điểm trung bình GPA từ 8.0 trở lên và có ít nhất 2 môn có điểm',
        isUnlocked: isGpaUnlocked,
        currentValue: gpaVal !== null ? Number(gpaVal.toFixed(1)) : 0,
        targetValue: gpaTarget,
        unit: 'điểm GPA',
        progressPct: isGpaUnlocked ? 100 : gpaProgress,
        colorScheme: 'gold',
        rewardExp: '+300 EXP',
        statusLabel: isGpaUnlocked ? `GPA ${calculatedGPA} 🏆` : (gpaVal !== null ? `${calculatedGPA}/8.0đ` : 'Chưa có GPA'),
        quote: '“Ngôi sao sáng ngời — Em là tấm gương sáng về học tập đều khắp các môn!”'
      },
      {
        id: 'badge-tu-chu-muc-tieu',
        name: 'TỰ CHỦ MỤC TIÊU',
        icon: '🎯',
        category: 'Kỹ năng',
        description: 'Tự lập kế hoạch rèn luyện và kiên trì hoàn thành mục tiêu đề ra.',
        conditionText: 'Đánh dấu hoàn thành ít nhất 1 mục tiêu học tập trong sổ tay cá nhân',
        isUnlocked: isGoalUnlocked,
        currentValue: completedGoalsCount,
        targetValue: goalTarget,
        unit: 'mục tiêu',
        progressPct: isGoalUnlocked ? 100 : goalProgress,
        colorScheme: 'emerald',
        rewardExp: '+100 EXP',
        statusLabel: isGoalUnlocked ? `${completedGoalsCount}/${goals.length} Đã Xong` : 'Chưa có mục tiêu xong',
        quote: '“Người có mục tiêu rõ ràng và tự giác thực hiện sẽ chạm tới mọi ước mơ!”'
      }
    ];
  }, [hocBaSummary, studentGameProfile, currentStudent, completedGoalsCount, goals.length, calculatedGPA]);

  const unlockedBadgesCount = studentIncentiveBadges.filter(b => b.isUnlocked).length;

  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'unlocked') return studentIncentiveBadges.filter(b => b.isUnlocked);
    if (badgeFilter === 'locked') return studentIncentiveBadges.filter(b => !b.isUnlocked);
    return studentIncentiveBadges;
  }, [studentIncentiveBadges, badgeFilter]);

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 1. KHỐI HEADER HỌC SINH + THÔNG TIN CHI TIẾT + ĐIỂM TRUNG BÌNH GÓC PHẢI */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 rounded-[28px] p-7 sm:p-9 text-white shadow-2xl relative overflow-hidden border border-teal-300/40">
        {/* Background Ambient Glows & Sparkles Decor */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-200 via-teal-400 to-transparent pointer-events-none" />
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-emerald-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-56 h-56 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
        
        {/* Subtle background star sparkles */}
        <div className="absolute top-4 right-1/4 text-emerald-200/30 text-lg pointer-events-none select-none">✦</div>
        <div className="absolute bottom-4 left-1/4 text-teal-200/30 text-base pointer-events-none select-none">✧</div>
        <div className="absolute top-1/2 right-1/3 text-amber-300/25 text-sm pointer-events-none select-none">★</div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Avatar + Main info */}
          <div className="flex items-start sm:items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-2xl border border-white/35 ring-4 ring-white/15">
                🐰
              </div>
              <span className="absolute -bottom-2 -right-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 font-black text-[10px] shadow-md border border-amber-100">
                {currentStudent?.className || 'LỚP 3A'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-widest text-teal-100 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/30 shadow-xs">
                  📊 HỌC BẠ SỐ CÁ NHÂN
                </span>
                <span className="text-[10px] font-bold text-amber-200 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-300/20">
                  Năm học 2026 - 2027
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white flex items-center gap-2">
                {currentStudent ? (currentStudent.name || currentStudent.fullName || 'Hoàng Bảo An') : 'Hoàng Bảo An'}
              </h2>
              <p className="text-xs sm:text-sm text-teal-100 font-medium flex items-center gap-2 flex-wrap">
                <span>Mã học sinh: <b className="text-white font-mono bg-white/15 px-2 py-0.5 rounded-md">{currentStudent?.id || 'HS-3A-01'}</b></span>
                <span>•</span>
                <span>Lớp: <b className="text-white">{currentStudent?.className || '3A'}</b></span>
                <span>•</span>
                <span>Trường Tiểu Học Quang Hưng</span>
              </p>
            </div>
          </div>

          {/* Prominent GPA Score box at top right */}
          <div className="bg-white/15 backdrop-blur-md border border-white/30 rounded-3xl p-5 text-center shrink-0 w-full sm:w-auto shadow-2xl shadow-teal-950/20">
            <span className="text-[11px] text-teal-100 block font-black uppercase tracking-wider">
              ĐIỂM TRUNG BÌNH (GPA)
            </span>
            <span className="text-4xl sm:text-5xl font-black font-heading text-amber-300 tracking-tight drop-shadow-md block my-1">
              {calculatedGPA}
            </span>
            <span className="inline-block text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/40 text-emerald-100 border border-emerald-300/30">
              {hocBaSummary.hasData
                ? `${hocBaSummary.gpaLabel} (${hocBaSummary.evaluatedSubjectsCount}/${hocBaSummary.totalSubjectsCount} môn)`
                : 'Chưa có dữ liệu điểm'}
            </span>
          </div>
        </div>

        {/* Detailed Info Sub-bar (Ngày sinh, Giới tính, Phụ huynh, Chuyên cần) */}
        <div className="mt-6 pt-5 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
            <span className="text-teal-200 text-[10px] font-bold block uppercase tracking-wider">Ngày sinh</span>
            <span className="font-extrabold text-white text-xs mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-300 shrink-0" /> {currentStudent?.dob || '21/12/2018'}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
            <span className="text-teal-200 text-[10px] font-bold block uppercase tracking-wider">Giới tính</span>
            <span className="font-extrabold text-white text-xs mt-0.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-300 shrink-0" /> {currentStudent?.gender || 'Nam'}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
            <span className="text-teal-200 text-[10px] font-bold block uppercase tracking-wider">Phụ huynh</span>
            <span className="font-extrabold text-white text-xs mt-0.5 flex items-center gap-1.5 truncate">
              <Heart className="w-3.5 h-3.5 text-rose-300 shrink-0" /> {currentStudent?.parentName || 'Hoàng Văn Tuấn'}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
            <span className="text-teal-200 text-[10px] font-bold block uppercase tracking-wider">Chuyên cần</span>
            <span className="font-extrabold text-emerald-300 text-xs mt-0.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300 shrink-0" /> {hocBaSummary.attendance.statusText}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BỘ LỌC "LOẠI KIỂM TRA" + DROPDOWN "CHỌN THÁNG" (KHI CHỌN THƯỜNG XUYÊN) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
          <Filter className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Lọc kết quả theo đợt kiểm tra:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Pill buttons for Exam Types */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            {EXAM_FILTER_OPTIONS.map(opt => {
              const isSelected = selectedExamFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedExamFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Month Dropdown - Appears immediately when 'Thường xuyên' is selected */}
          {selectedExamFilter === 'thuong_xuyen' && (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200 bg-teal-50/80 px-2.5 py-1 rounded-xl border border-teal-200">
              <span className="text-[11px] font-bold text-teal-800 whitespace-nowrap">Tháng:</span>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-2 pr-6 py-1 rounded-lg text-xs font-extrabold bg-white border border-teal-300 text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none shadow-2xs"
                >
                  {MONTH_FILTER_OPTIONS.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-teal-600 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KHỐI "CHỈ SỐ RÈN LUYỆN & HỌC TẬP" */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-teal-600" /> Chỉ Số Rèn Luyện & Học Tập
          </h3>
          <span className="text-[11px] font-bold text-slate-500">
            {hocBaSummary.hasData 
              ? `Đã đánh giá ${hocBaSummary.evaluatedSubjectsCount}/${hocBaSummary.totalSubjectsCount} môn học` 
              : 'Chưa có môn nào được chấm'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Điểm GPA */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-5 text-center space-y-1 hover:shadow-xs transition-shadow">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">Điểm GPA</span>
            <span className="text-3xl sm:text-4xl font-black font-heading text-teal-700 block">
              {calculatedGPA}
            </span>
            <span className="text-[11px] text-teal-600 font-medium">
              {hocBaSummary.hasData
                ? `Tính trên ${hocBaSummary.evaluatedSubjectsCount} môn có dữ liệu`
                : 'Chưa có môn nào được chấm'}
            </span>
          </div>

          {/* Card 2: Hoa Điểm 10 */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 text-center space-y-1 hover:shadow-xs transition-shadow">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Hoa Điểm 10</span>
            <div className="flex items-center justify-center gap-1.5 text-3xl sm:text-4xl font-black font-heading text-amber-600">
              <Flame className="w-8 h-8 text-amber-500 fill-amber-500" />
              <span>{hocBaSummary.hoaDiem10Count}</span>
            </div>
            <span className="text-[11px] text-amber-600 font-medium">Bông hoa thi đua</span>
          </div>

          {/* Card 3: Chuyên cần */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-5 text-center space-y-1 hover:shadow-xs transition-shadow">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">Chuyên Cần</span>
            <span className="text-2xl sm:text-3xl font-black font-heading text-indigo-700 block pt-1">
              {hocBaSummary.attendance.overallRate !== null ? `${hocBaSummary.attendance.overallRate}%` : 'Chưa có dữ liệu'}
            </span>
            <span className="text-[11px] text-indigo-600 font-medium">
              {hocBaSummary.attendance.hasData
                ? hocBaSummary.attendance.statusText
                : 'Chưa có nhiệm vụ được giao'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MỚI: KHỐI "BIỂU ĐỒ ĐÁNH GIÁ TIẾN ĐỘ" (2 BIỂU ĐỒ TRỰC QUAN CẠNH NHAU) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <BarChart2 className="w-4.5 h-4.5 text-teal-600" /> Biểu Đồ Đánh Giá Tiến Độ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Trực quan hóa điểm số từng môn và quỹ đạo tiến bộ qua các mốc đánh giá
            </p>
          </div>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/70 shrink-0">
            {selectedExamFilter === 'all' 
              ? 'Tất cả bài kiểm tra' 
              : selectedExamFilter === 'thuong_xuyen' 
                ? `Thường xuyên (Tháng ${selectedMonth})` 
                : EXAM_FILTER_OPTIONS.find(o => o.key === selectedExamFilter)?.label}
          </span>
        </div>

        {/* 2 Charts side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Bar Chart - Subject Scores Comparison */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  So sánh điểm số các môn học
                </h4>
                <span className="text-[10px] font-bold text-slate-500">
                  {hocBaSummary.hasData ? `Đã có điểm ${hocBaSummary.evaluatedSubjectsCount} môn` : 'Chưa có dữ liệu'}
                </span>
              </div>
              
              {/* Highlight legend pills */}
              {hocBaSummary.hasData && maxScore !== null ? (
                <div className="flex items-center gap-2 flex-wrap pt-1.5 text-[10px]">
                  <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Môn cao nhất ({maxScore}đ): {maxSubjects.map(s => s.subject).slice(0, 2).join(', ')}
                  </span>
                  {minScore !== null && minScore < maxScore && (
                    <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Cần chú ý ({minScore}đ): {minSubjects.map(s => s.subject).slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              ) : (
                <div className="pt-1.5 text-[10px] text-slate-400 italic">
                  Chỉ hiển thị điểm các môn Giáo viên đã giao hoặc chấm điểm thực tế
                </div>
              )}
            </div>

            {/* Recharts Bar Chart */}
            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeSubjects.map(s => ({
                    ...s,
                    displayScore: s.score !== null ? s.score : 0
                  }))}
                  margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }}
                    interval={0}
                    height={30}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="displayScore" radius={[6, 6, 0, 0]}>
                    {activeSubjects.map((entry, index) => {
                      if (entry.score === null) {
                        return <Cell key={`bar-cell-${index}`} fill="#cbd5e1" />;
                      }
                      let barColor = SOFT_COLORS[index % SOFT_COLORS.length];
                      if (entry.score === maxScore) {
                        barColor = '#059669'; // Bold Emerald for highest
                      } else if (minScore !== null && entry.score === minScore && minScore < (maxScore ?? 10)) {
                        barColor = '#d97706'; // Bold Amber for lowest
                      }
                      return (
                        <Cell
                          key={`bar-cell-${index}`}
                          fill={barColor}
                          className="transition-all duration-300 hover:opacity-85"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Line Chart - GPA Progress Trend Over Semesters */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Xu hướng tiến bộ ĐTB (GPA) qua các kỳ
                </h4>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  Năm học 2026 - 2027
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 leading-tight">
                {hocBaSummary.hasData
                  ? 'Quỹ đạo điểm số thực tế qua các mốc đánh giá định kỳ'
                  : 'Sẽ hiển thị khi học sinh có dữ liệu đánh giá'}
              </p>
            </div>

            {/* Recharts Line Chart */}
            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={hocBaSummary.gpaTrend}
                  margin={{ top: 15, right: 20, left: -25, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }}
                    height={30}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                  />
                  <ReferenceLine
                    y={9.0}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Chuẩn Xuất sắc (9.0đ)',
                      position: 'insideTopRight',
                      fill: '#059669',
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="gpa"
                    stroke="#6366f1"
                    strokeWidth={3.5}
                    dot={{ r: 5, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#4338ca', stroke: '#c7d2fe', strokeWidth: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. KHỐI "KẾT QUẢ HỌC TẬP CÁC MÔN" (DẠNG BẢNG CHI TIẾT TỪNG MÔN VÀ NGUỒN ĐIỂM) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-amber-500" /> Kết quả học tập các môn
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tích hợp tự động: Đề Kiểm Tra (60%) • Bài Tập (25%) • Đánh giá E-Learning (15%) • Game thi đua (Huy hiệu riêng)
            </p>
          </div>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60 shrink-0">
            {selectedExamFilter === 'all' 
              ? 'Tổng hợp tất cả bài' 
              : selectedExamFilter === 'thuong_xuyen'
                ? `Thường xuyên - Tháng ${selectedMonth}`
                : EXAM_FILTER_OPTIONS.find(o => o.key === selectedExamFilter)?.label}
          </span>
        </div>

        {hocBaSummary?.subjects && hocBaSummary.subjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {(hocBaSummary.subjects || []).map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-extrabold text-slate-800 block">{item.subject}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{item.note}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tight ${
                      item.score !== null ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.level}
                    </span>
                    <span className={`text-xs sm:text-sm font-mono font-black px-2 py-0.5 rounded-md border ${
                      item.score !== null 
                        ? 'text-indigo-700 bg-indigo-50 border-indigo-100' 
                        : 'text-slate-400 bg-slate-100 border-slate-200 font-sans text-[11px]'
                    }`}>
                      {item.score !== null ? `${item.score}đ` : 'Chưa có điểm'}
                    </span>
                  </div>
                </div>

                {/* Data source badges breakdown */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-200/60 text-[9.5px]">
                  {item.examScore !== null ? (
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold border border-sky-200/60 flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5" /> Đề KT: {item.examScore}đ
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-medium">
                      Chưa có Đề KT
                    </span>
                  )}

                  {item.homeworkScore !== null ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200/60 flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5" /> Bài tập: {item.homeworkScore}đ
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-medium">
                      Chưa có Bài tập
                    </span>
                  )}

                  {item.lessonScore !== null ? (
                    <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold border border-teal-200/60 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> 5E Evaluate: {item.lessonScore}đ
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-medium">
                      Chưa làm bài 5E
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-2 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-amber-900">
              Thầy/Cô chưa giao bài hay chấm điểm môn nào, em quay lại sau nhé!
            </p>
            <p className="text-xs text-amber-700/80">
              Khi có bài tập hoặc đề kiểm tra mới được giao cho {studentClassName}, kết quả và điểm số các môn sẽ tự động xuất hiện tại đây.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. KHỐI "HUY HIỆU KHÍCH LỆ CỦA EM" (GAMIFICATION & VINH DANH DỰA TRÊN DỮ LIỆU THẬT) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        {/* Header with Title + Unlocked Summary Counter */}
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 font-heading">
              <Award className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" /> Huy Hiệu Khích Lệ Của Em
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Hệ thống vinh danh thành tích học tập & hoạt động được tính tự động từ dữ liệu thực tế
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-black text-xs shadow-xs flex items-center gap-1.5 border border-amber-300">
              <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
              Đã mở khóa: {unlockedBadgesCount}/{studentIncentiveBadges.length} Huy hiệu
            </span>
          </div>
        </div>

        {/* Disclaimer Note (Yêu cầu minh bạch: đây là huy hiệu khích lệ, không phải học bạ chính thức) */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-950 leading-relaxed shadow-2xs">
          <div className="p-1 rounded-lg bg-amber-200/80 text-amber-800 shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-amber-900">🏅 Lưu ý minh bạch: </span>
            <span className="text-amber-900/90 font-medium">
              Đây là hệ thống huy hiệu khích lệ tinh thần học tập tự động trong ứng dụng (tương tự Ví Xu &amp; Cấp độ EXP), <b>không phải đánh giá học bạ chính thức của nhà trường hay Bộ GD&amp;ĐT</b>.
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-1.5">
            {[
              { key: 'all', label: `Tất cả (${studentIncentiveBadges.length})` },
              { key: 'unlocked', label: `Đã đạt 🏆 (${unlockedBadgesCount})` },
              { key: 'locked', label: `Đang phấn đấu 🎯 (${studentIncentiveBadges.length - unlockedBadgesCount})` }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setBadgeFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  badgeFilter === tab.key
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-semibold text-slate-400 italic">
            * Bấm vào từng huy hiệu để xem chi tiết &amp; nhiệm vụ
          </span>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {filteredBadges.map((badge) => {
            const isUnlocked = badge.isUnlocked;
            
            // Color variations for unlocked badges
            const colorMap: Record<string, { bg: string; border: string; iconBg: string; text: string; badgeTag: string; bar: string }> = {
              emerald: {
                bg: 'bg-emerald-50/70',
                border: 'border-emerald-200/90 hover:border-emerald-400',
                iconBg: 'bg-emerald-100 border-emerald-300 ring-2 ring-emerald-200/50',
                text: 'text-emerald-950',
                badgeTag: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                bar: 'bg-gradient-to-r from-emerald-400 to-teal-500'
              },
              rose: {
                bg: 'bg-rose-50/70',
                border: 'border-rose-200/90 hover:border-rose-400',
                iconBg: 'bg-rose-100 border-rose-300 ring-2 ring-rose-200/50',
                text: 'text-rose-950',
                badgeTag: 'bg-rose-100 text-rose-800 border-rose-200',
                bar: 'bg-gradient-to-r from-rose-400 to-pink-500'
              },
              amber: {
                bg: 'bg-amber-50/70',
                border: 'border-amber-200/90 hover:border-amber-400',
                iconBg: 'bg-amber-100 border-amber-300 ring-2 ring-amber-200/50',
                text: 'text-amber-950',
                badgeTag: 'bg-amber-100 text-amber-900 border-amber-200',
                bar: 'bg-gradient-to-r from-amber-400 to-yellow-500'
              },
              blue: {
                bg: 'bg-sky-50/70',
                border: 'border-sky-200/90 hover:border-sky-400',
                iconBg: 'bg-sky-100 border-sky-300 ring-2 ring-sky-200/50',
                text: 'text-sky-950',
                badgeTag: 'bg-sky-100 text-sky-800 border-sky-200',
                bar: 'bg-gradient-to-r from-sky-400 to-blue-500'
              },
              cyan: {
                bg: 'bg-teal-50/70',
                border: 'border-teal-200/90 hover:border-teal-400',
                iconBg: 'bg-teal-100 border-teal-300 ring-2 ring-teal-200/50',
                text: 'text-teal-950',
                badgeTag: 'bg-teal-100 text-teal-800 border-teal-200',
                bar: 'bg-gradient-to-r from-teal-400 to-cyan-500'
              },
              purple: {
                bg: 'bg-purple-50/70',
                border: 'border-purple-200/90 hover:border-purple-400',
                iconBg: 'bg-purple-100 border-purple-300 ring-2 ring-purple-200/50',
                text: 'text-purple-950',
                badgeTag: 'bg-purple-100 text-purple-800 border-purple-200',
                bar: 'bg-gradient-to-r from-purple-400 to-indigo-500'
              },
              gold: {
                bg: 'bg-yellow-50/70',
                border: 'border-yellow-200/90 hover:border-yellow-400',
                iconBg: 'bg-yellow-100 border-yellow-300 ring-2 ring-yellow-200/50',
                text: 'text-yellow-950',
                badgeTag: 'bg-yellow-100 text-yellow-900 border-yellow-200',
                bar: 'bg-gradient-to-r from-amber-400 to-orange-400'
              }
            };

            const colors = colorMap[badge.colorScheme] || colorMap.emerald;

            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadgeModal(badge)}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 cursor-pointer group relative overflow-hidden ${
                  isUnlocked
                    ? `${colors.bg} ${colors.border} shadow-xs hover:shadow-md hover:-translate-y-0.5`
                    : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Subtle shine on unlocked */}
                {isUnlocked && (
                  <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/40 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform" />
                )}

                {/* Top: Icon + Status Tag */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border transition-transform group-hover:scale-110 ${
                        isUnlocked
                          ? `${colors.iconBg} shadow-xs`
                          : 'bg-slate-200/70 border-slate-300 text-slate-400 grayscale'
                      }`}>
                        {badge.icon}
                      </div>
                      {!isUnlocked && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] border border-white shadow-xs">
                          <Lock className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight border shrink-0 ${
                      isUnlocked
                        ? colors.badgeTag
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}>
                      {badge.statusLabel}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 className={`text-xs font-black uppercase tracking-wide ${
                    isUnlocked ? colors.text : 'text-slate-700'
                  }`}>
                    {badge.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
                    {badge.description}
                  </p>
                </div>

                {/* Bottom: Progress bar & info */}
                <div className="space-y-1.5 pt-2 border-t border-black/5">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={isUnlocked ? 'text-slate-700 font-extrabold' : 'text-slate-500'}>
                      {isUnlocked ? 'Đã hoàn thành' : 'Tiến độ'}
                    </span>
                    <span className={isUnlocked ? 'text-emerald-700 font-extrabold' : 'text-slate-600 font-mono font-extrabold'}>
                      {isUnlocked ? '100% 🏆' : `${badge.currentValue}/${badge.targetValue} ${badge.unit}`}
                    </span>
                  </div>

                  {/* Progress track */}
                  <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUnlocked
                          ? colors.bar
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${badge.progressPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 pt-0.5">
                    <span>{badge.category}</span>
                    <span className="text-amber-600 font-bold">{badge.rewardExp}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Modal for Clicked Badge */}
        {selectedBadgeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border ${
                    selectedBadgeModal.isUnlocked
                      ? 'bg-amber-100 border-amber-300 ring-4 ring-amber-100 shadow-md'
                      : 'bg-slate-100 border-slate-200 grayscale'
                  }`}>
                    {selectedBadgeModal.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {selectedBadgeModal.category}
                    </span>
                    <h4 className="text-base font-black text-slate-900 font-heading">
                      {selectedBadgeModal.name}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBadgeModal(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Ý nghĩa huy hiệu:</span>
                    <p className="text-slate-700 font-medium mt-0.5">{selectedBadgeModal.description}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Điều kiện đạt được:</span>
                    <p className="text-teal-800 font-extrabold mt-0.5">{selectedBadgeModal.conditionText}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-900 font-bold text-xs">Trạng thái hiện tại:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                      selectedBadgeModal.isUnlocked
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}>
                      {selectedBadgeModal.isUnlocked ? 'ĐÃ ĐẠT 🏆' : 'ĐANG PHẤN ĐẤU 🎯'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-amber-900 font-medium">
                    <span>Số liệu thực tế:</span>
                    <span className="font-mono font-extrabold">{selectedBadgeModal.currentValue} / {selectedBadgeModal.targetValue} {selectedBadgeModal.unit}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-amber-200/70 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedBadgeModal.isUnlocked
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${selectedBadgeModal.progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100 text-[11px] text-teal-800 italic text-center">
                  {selectedBadgeModal.quote}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBadgeModal(null)}
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                >
                  Đã hiểu &amp; Tiếp tục phấn đấu ✨
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 6. KHỐI "NHẬN XÉT TỔNG KẾT TỪ GIÁO VIÊN & AI" */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="w-4.5 h-4.5 text-teal-600" /> Nhận xét tổng kết từ Giáo viên & AI
          </h3>
          <span className="text-[11px] font-bold text-slate-500">Giáo viên chủ nhiệm: <b className="text-slate-800 font-extrabold">{studentHomeroomTeacher}</b></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Lời nhận xét GVCN */}
          <div className="p-4.5 rounded-2xl bg-teal-50/70 border border-teal-200 text-slate-800 space-y-2">
            <p className="font-extrabold text-teal-900 flex items-center gap-1.5 text-xs">
              <Check className="w-4 h-4 text-teal-600" /> Nhận xét của Giáo viên chủ nhiệm:
            </p>
            <p className="text-slate-700 leading-relaxed italic bg-white/80 p-3 rounded-xl border border-teal-100">
              "Em Hoàng Bảo An chăm ngoan, lễ phép, tích cực phát biểu xây dựng bài. Hoàn thành xuất sắc các nhiệm vụ học tập môn Toán và Tiếng Việt. Cần phát huy hơn nữa ở môn Tin học để đạt kết quả toàn diện hơn nữa."
            </p>
          </div>

          {/* Lời nhận xét Chuyên cần & Nề nếp */}
          <div className="p-4.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-slate-800 space-y-2">
            <p className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-amber-600" /> Nề nếp & Kỹ năng học tập:
            </p>
            <p className="text-slate-700 leading-relaxed italic bg-white/80 p-3 rounded-xl border border-amber-100">
              "Tác phong học tập nghiêm túc, tham gia sôi nổi vào các hoạt động trải nghiệm và rèn luyện kỹ năng sống. Luôn tôn trọng thầy cô và đoàn kết, nhiệt tình giúp đỡ bạn bè trong lớp."
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. KHỐI "CỐ VẤN HỌC TẬP AI THÔNG MINH" */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Brain className="w-4.5 h-4.5 text-purple-600" /> Cố Vấn Học Tập AI Thông Minh
            </h3>
            <p className="text-xs text-slate-500">
              Ứng dụng mô hình Gemini để phân tích toàn diện, xây dựng lời khuyên và gợi ý lộ trình thích ứng.
            </p>
          </div>

          <button
            type="button"
            onClick={handleActivateAI}
            disabled={isAiLoading}
            className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>{isAiLoading ? 'Đang phân tích...' : isAiAdvisorActive ? 'Phân tích lại với AI' : 'Kích hoạt Cố vấn AI'}</span>
          </button>
        </div>

        {!isAiAdvisorActive && !isAiLoading ? (
          /* Placeholder khi chưa kích hoạt */
          <div className="py-12 px-6 text-center space-y-3 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center mx-auto">
              <Brain className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-700">
                Chưa có kết quả phân tích AI cho học sinh này
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hãy bấm nút <b>"Kích hoạt Cố vấn AI"</b> ở trên để tổng hợp dữ liệu rèn luyện và xây dựng học bạ số thông minh.
              </p>
            </div>
          </div>
        ) : isAiLoading ? (
          <div className="py-12 text-center space-y-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-pulse">
            <Sparkles className="w-8 h-8 text-indigo-600 mx-auto animate-spin" />
            <p className="text-xs font-bold text-indigo-900">
              AI Sư Phạm đang phân tích biểu đồ năng lực và tổng hợp kết quả học tập...
            </p>
          </div>
        ) : (
          /* Kết quả phân tích AI */
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1.5">
                <span className="font-extrabold uppercase text-[11px] text-emerald-800 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" /> Điểm mạnh nổi trội:
                </span>
                <p className="text-emerald-900/90 leading-relaxed text-xs">
                  Tư duy logic Toán học xuất sắc ({maxScore}đ), khả năng đọc hiểu nhanh và diễn đạt lưu loát trong môn Tiếng Việt.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-1.5">
                <span className="font-extrabold uppercase text-[11px] text-amber-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-600" /> Trọng tâm bồi dưỡng:
                </span>
                <p className="text-amber-900/90 leading-relaxed text-xs">
                  Tăng cường thời gian luyện tập gõ phím 10 ngón và thao tác phần mềm học tập môn Tin học khoảng 15 phút/ngày.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 space-y-1.5">
                <span className="font-extrabold uppercase text-[11px] text-indigo-800 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-600" /> Lộ trình 7 ngày tới:
                </span>
                <p className="text-indigo-900/90 leading-relaxed text-xs">
                  Tiếp tục duy trì giải các bài toán nâng cao 5E, tham gia thử thách Đấu trường tri thức để tích lũy thêm Hoa điểm 10.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 8. KHỐI "KẾ HOẠCH & MỤC TIÊU RÈN LUYỆN CÁ NHÂN" */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Target className="w-4.5 h-4.5 text-emerald-600" /> Kế Hoạch & Mục Tiêu Rèn Luyện Cá Nhân
          </h3>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            {completedGoalsCount}/{goals.length} Hoàn thành
          </span>
        </div>

        {/* Goals Checklist */}
        <div className="space-y-2.5">
          {goals.map(goal => (
            <div
              key={goal.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                goal.completed
                  ? 'bg-emerald-50/50 border-emerald-200 text-slate-400'
                  : 'bg-slate-50/80 border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleGoal(goal.id)}
                className="flex items-center gap-3 text-left flex-1 cursor-pointer"
              >
                {goal.completed ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <span className={`text-xs font-bold leading-snug ${goal.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {goal.text}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteGoal(goal.id)}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors text-xs font-bold cursor-pointer"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>

        {/* Add Goal Input */}
        <form onSubmit={handleAddGoal} className="pt-2 flex items-center gap-2">
          <input
            type="text"
            placeholder="Thêm mục tiêu rèn luyện mới cho em..."
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mục tiêu</span>
          </button>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 9. KHỐI "DANH HIỆU & BẢNG VINH DANH" */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-amber-500" /> Danh Hiệu & Bảng Vinh Danh
          </h3>
          <span className="text-[11px] font-bold text-slate-500">Huy hiệu thành tích đạt được</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Danh hiệu 1: Mầm non hy vọng */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              🌱
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Mầm non hy vọng</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Đang phấn đấu rèn luyện mỗi ngày</p>
            </div>
          </div>

          {/* Danh hiệu 2: Kiện Tướng Điểm 10 */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              🌟
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Kiện Tướng Điểm 10</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Tích lũy 12 hoa điểm 10 rực rỡ</p>
            </div>
          </div>

          {/* Danh hiệu 3: Học Sinh Xuất Sắc */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              🥇
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Học Sinh Xuất Sắc</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Kết quả học tập nổi trội Lớp 3A</p>
            </div>
          </div>

          {/* Danh hiệu 4: Chiến Binh Chăm Chỉ */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              🚀
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Chiến Binh Chăm Chỉ</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Hoàn thành 100% nhiệm vụ đúng hạn</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export const HocBaSoModule: React.FC<HocBaSoModuleProps> = ({
  userRole = 'teacher',
  exams = [],
  assignments = [],
  lessons = [],
  games = [],
  currentStudent = null
}) => {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isCollapsed1, setIsCollapsed1] = useState<boolean>(false);
  const [isCollapsed2, setIsCollapsed2] = useState<boolean>(false);
  
  // Section 1 Filters
  const [selectedGrade1, setSelectedGrade1] = useState<string>('Khối 3');
  const [selectedClass1, setSelectedClass1] = useState<string>('Lớp 3A');
  const [selectedSubject1, setSelectedSubject1] = useState<string>('Công nghệ');
  const [selectedExamType1, setSelectedExamType1] = useState<string>('Thường xuyên');
  const [selectedMonth1, setSelectedMonth1] = useState<string>('Tháng 8');
  const [selectedTestName1, setSelectedTestName1] = useState<string>('Tất cả bài kiểm tra');
  const [searchKeyword1, setSearchKeyword1] = useState<string>('');

  // Section 2 Filters (Sổ Tổng Kết Kết Quả Giáo Dục)
  const [selectedGrade2, setSelectedGrade2] = useState<string>('Khối 3');
  const [selectedClass2, setSelectedClass2] = useState<string>('Lớp 3A');
  const [selectedSemester2, setSelectedSemester2] = useState<string>('Giữa kì 1');
  const [searchKeyword2, setSearchKeyword2] = useState<string>('');

  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { classes, getClassesForGrade } = useClassesList();
  const gradesList = GRADES;
  
  const classesList1 = ['Tất cả Lớp', ...Array.from(new Set((getClassesForGrade(selectedGrade1) || []).map(c => c?.name).filter(Boolean)))];

  const classesList2 = ['Tất cả Lớp', ...Array.from(new Set((getClassesForGrade(selectedGrade2) || []).map(c => c?.name).filter(Boolean)))];

  useEffect(() => {
    setSelectedClass1('Tất cả Lớp');
  }, [selectedGrade1]);

  useEffect(() => {
    setSelectedClass2('Tất cả Lớp');
  }, [selectedGrade2]);

  // Section 2 Subjects filter based on Grade/Class configured in DB
  const getSubjectsForGrade = (grade: string) => {
    return getSubjectsForClassOrGrade(grade, classes);
  };

  const currentGradeSubjects2 = getSubjectsForGrade(selectedGrade2);
  const subjectsList = PRIMARY_SCHOOL_SUBJECTS;
  const examTypesList = EXAM_TYPES;
  const monthsList = ['Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5'];
  const testNamesList = ['Tất cả bài kiểm tra', 'Kiểm tra 15 phút', 'Kiểm tra miệng', 'Bài thực hành định kì', 'Kiểm tra học kì'];
  const semestersList = EXAM_TYPES;

  // Student Database State and Real-Time Sync
  const [allStudentsDb, setAllStudentsDb] = useState<Record<string, GlobalStudentRecord[]>>(() => {
    return getAllStudentsFromLocalStorage();
  });

  const [modalOverallDat, setModalOverallDat] = useState<'T' | 'H' | 'CHT'>('T');
  const [modalScore, setModalScore] = useState<string>('8.5');
  const [modalCorrectCount, setModalCorrectCount] = useState<number>(8);
  const [modalTotalQuestions, setModalTotalQuestions] = useState<number>(10);
  const [modalStrengths, setModalStrengths] = useState<string>('');
  const [modalReminders, setModalReminders] = useState<string>('');

  useEffect(() => {
    const handleStudentsUpdated = () => {
      setAllStudentsDb(getAllStudentsFromLocalStorage());
    };
    window.addEventListener('student-data-updated', handleStudentsUpdated);
    window.addEventListener('eduplay_students_updated', handleStudentsUpdated);

    // Live sync all class rosters from Firestore collection
    let unsubSnapshot: (() => void) | undefined;
    if (db) {
      try {
        unsubSnapshot = onSnapshot(collection(db, 'class_rosters'), (snapshot) => {
          const cloudDb: Record<string, GlobalStudentRecord[]> = {};
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && Array.isArray(data.students)) {
              const stdName = data.className || getStandardClassName(docSnap.id);
              cloudDb[stdName] = data.students;
            }
          });
          if (Object.keys(cloudDb).length > 0) {
            setAllStudentsDb((prev) => ({
              ...prev,
              ...cloudDb
            }));
          }
        });
      } catch (err) {
        console.warn('Cannot listen to class_rosters:', err);
      }
    }

    return () => {
      window.removeEventListener('student-data-updated', handleStudentsUpdated);
      window.removeEventListener('eduplay_students_updated', handleStudentsUpdated);
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  useEffect(() => {
    const classesToSync = new Set<string>();
    if (selectedClass1 && selectedClass1 !== 'Tất cả Lớp') classesToSync.add(selectedClass1);
    if (selectedClass2 && selectedClass2 !== 'Tất cả Lớp') classesToSync.add(selectedClass2);

    const unsubscribes: Array<() => void> = [];
    classesToSync.forEach((className) => {
      const unsub = subscribeToFirestoreClassStudents(className, (updatedStudents) => {
        if (Array.isArray(updatedStudents) && updatedStudents.length > 0) {
          const stdName = getStandardClassName(className);
          setAllStudentsDb((prev) => ({
            ...prev,
            [stdName]: updatedStudents
          }));
        }
      });
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [selectedClass1, selectedClass2]);

  const activeStudentsList: StudentRecord[] = useMemo(() => {
    const studentMap = new Map<string, StudentRecord>();
    Object.entries(allStudentsDb).forEach(([clsName, classRoster]) => {
      if (Array.isArray(classRoster)) {
        classRoster.forEach((st) => {
          if (st && st.id) {
            studentMap.set(st.id, convertToHocBaStudent({ ...st, className: st.className || clsName }));
          }
        });
      }
    });
    return Array.from(studentMap.values());
  }, [allStudentsDb]);

  const filteredStudents1 = activeStudentsList.filter(st => {
    if (selectedClass1 !== 'Tất cả Lớp' && st.className !== selectedClass1) return false;
    if (selectedGrade1 === 'Khối 1' && !st.className.includes('1')) return false;
    if (selectedGrade1 === 'Khối 2' && !st.className.includes('2')) return false;
    if (selectedGrade1 === 'Khối 3' && !st.className.includes('3')) return false;
    if (selectedGrade1 === 'Khối 4' && !st.className.includes('4')) return false;
    if (selectedGrade1 === 'Khối 5' && !st.className.includes('5')) return false;
    if (searchKeyword1.trim()) {
      const full = `${st.lastName} ${st.firstName}`.toLowerCase();
      if (!full.includes(searchKeyword1.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => {
    const fnCmp = (a.firstName || '').localeCompare(b.firstName || '', 'vi', { sensitivity: 'base' });
    if (fnCmp !== 0) return fnCmp;
    return (a.lastName || '').localeCompare(b.lastName || '', 'vi', { sensitivity: 'base' });
  });

  const filteredStudents2 = activeStudentsList.filter(st => {
    if (selectedClass2 !== 'Tất cả Lớp' && st.className !== selectedClass2) return false;
    if (selectedGrade2 === 'Khối 1' && !st.className.includes('1')) return false;
    if (selectedGrade2 === 'Khối 2' && !st.className.includes('2')) return false;
    if (selectedGrade2 === 'Khối 3' && !st.className.includes('3')) return false;
    if (selectedGrade2 === 'Khối 4' && !st.className.includes('4')) return false;
    if (selectedGrade2 === 'Khối 5' && !st.className.includes('5')) return false;
    if (searchKeyword2.trim()) {
      const full = `${st.lastName} ${st.firstName}`.toLowerCase();
      if (!full.includes(searchKeyword2.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => {
    const fnCmp = (a.firstName || '').localeCompare(b.firstName || '', 'vi', { sensitivity: 'base' });
    if (fnCmp !== 0) return fnCmp;
    return (a.lastName || '').localeCompare(b.lastName || '', 'vi', { sensitivity: 'base' });
  });

  const commentedCount = filteredStudents1.filter(st => st.commentDetail?.hasCommented).length;

  /**
   * Helper function: Tra cứu GVCN chính xác của từng lớp từ Firestore classes collection
   */
  const getHomeroomTeacherName = (className?: string): string => {
    if (!className || className === 'Tất cả Lớp' || className === 'Tất cả') return '';
    const clean = className.replace(/^Lớp\s+/i, '').trim().toLowerCase();
    const matched = classes.find(c => {
      const cClean = c.name.replace(/^Lớp\s+/i, '').trim().toLowerCase();
      return c.id.toLowerCase() === clean || cClean === clean || c.name.toLowerCase() === className.toLowerCase();
    });
    return matched?.homeroomTeacher?.trim() || '';
  };

  const homeroomTeacherName2 = useMemo(() => {
    if (selectedClass2 === 'Tất cả Lớp') return '';
    return getHomeroomTeacherName(selectedClass2);
  }, [selectedClass2, classes]);

  const handleExportExcelSection1 = () => {
    if (filteredStudents1.length === 0) {
      showToast('⚠️ Không có dữ liệu học sinh để xuất Excel.', 'error');
      return;
    }
    exportSoNhanXetToExcel({
      students: filteredStudents1,
      grade: selectedGrade1,
      className: selectedClass1,
      subject: selectedSubject1,
      examType: selectedExamType1,
      month: selectedMonth1,
      testName: selectedTestName1
    });
    showToast(`✅ Đã xuất file Excel Sổ Nhận Xét cho ${selectedClass1 === 'Tất cả Lớp' ? selectedGrade1 : selectedClass1} thành công!`);
  };

  const handleExportExcelSection2 = () => {
    if (filteredStudents2.length === 0) {
      showToast('⚠️ Không có dữ liệu học sinh để xuất Excel.', 'error');
      return;
    }
    exportSoTongKetToExcel({
      students: filteredStudents2.map(st => ({
        ...st,
        homeroomTeacher: getHomeroomTeacherName(st.className)
      })),
      grade: selectedGrade2,
      className: selectedClass2,
      semester: selectedSemester2,
      subjects: currentGradeSubjects2,
      homeroomTeacher: homeroomTeacherName2
    });
    showToast(`✅ Đã xuất file Excel Sổ Tổng Kết cho ${selectedClass2 === 'Tất cả Lớp' ? selectedGrade2 : selectedClass2} thành công!`);
  };

  const handleViewDetail = (st: StudentRecord) => {
    setSelectedStudentDetail(st);
    const comment = st.commentDetail;
    const existingEval = st.evaluations ? st.evaluations[selectedSubject1] : undefined;
    const datVal = (comment?.overallDat || existingEval?.dat || 'T') as 'T' | 'H' | 'CHT';
    const scoreVal = comment?.score !== undefined ? String(comment.score) : (existingEval?.score || '8.5');

    setModalOverallDat(datVal);
    setModalScore(scoreVal);
    setModalCorrectCount(comment?.correctCount !== undefined ? comment.correctCount : 8);
    setModalTotalQuestions(comment?.totalQuestions !== undefined ? comment.totalQuestions : 10);
    setModalStrengths(comment?.strengths || 'Nắm vững kiến thức trọng tâm, tính toán nhanh và chính xác');
    setModalReminders(comment?.reminders || 'Cần đọc kỹ đề bài và tự tin hơn ở bài tập vận dụng');
    setIsDetailModalOpen(true);
  };

  // If the user role is student, render the comprehensive 9-block unified Học Bạ Số view
  if (userRole === 'student') {
    return (
      <StudentHocBaSoView
        exams={exams}
        assignments={assignments}
        lessons={lessons}
        games={games}
        currentStudent={currentStudent}
      />
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Học Bạ Số & Sổ Tổng Kết Cấp Tiểu Học
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
                Chuẩn Thông Tư
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tích hợp đồng thời Sổ Nhận Xét Học Sinh & Sổ Tổng Kết Kết Quả Giáo Dục
            </p>
          </div>
        </div>
      </div>

      {/* Global Action Row: Lock Mode & Print Report */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Bảo mật dữ liệu & Xuất báo cáo báo cáo tổng hợp</span>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              isLocked
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            {isLocked ? <Lock className="w-4 h-4 text-emerald-600" /> : <Unlock className="w-4 h-4 text-amber-600" />}
            {isLocked ? 'Đã khóa bảo vệ' : 'Đang mở chỉnh sửa'}
          </button>
        </div>
      </div>

      {/* Lock Mode Notice Banner */}
      {isLocked && (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <b>Đã kích hoạt Khóa An Toàn (Lock Mode):</b> Toàn bộ dữ liệu sổ nhận xét và sổ tổng kết được bảo vệ cố định chống mọi thao tác ghi đè hoặc vô tình làm thay đổi.
            </span>
          </div>
          <button
            onClick={() => setIsLocked(false)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            Thao tác mở khóa
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* PHẦN 1: SỔ NHẬN XÉT HỌC SINH (HIỂN THỊ Ở PHÍA TRÊN) */}
      {/* ==================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold">
              01
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Sổ Nhận Xét Học Sinh
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
                  AI Sư Phạm
                </span>
              </h2>
              <p className="text-xs text-slate-500">Tổng hợp lời phê, nhận xét học tập và kết quả bài làm chi tiết</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-extrabold text-slate-700 flex items-center gap-2 shadow-xs">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span>ĐÃ NHẬN XÉT: <b className="text-teal-700 text-sm">{commentedCount}/{filteredStudents1.length} HS</b></span>
            </div>

            <button
              onClick={handleExportExcelSection1}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs shadow-emerald-200"
              title="Xuất danh sách nhận xét đang lọc ra file Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>Tải Excel</span>
            </button>

            <button
              onClick={() => setIsCollapsed1(!isCollapsed1)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isCollapsed1 ? <Maximize2 className="w-4 h-4 text-slate-500" /> : <Minimize2 className="w-4 h-4 text-slate-500" />}
              {isCollapsed1 ? 'Mở rộng' : 'Thu hẹp'}
            </button>
          </div>
        </div>

        {/* Filters Bar 1 */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Chọn khối</label>
            <select
              value={selectedGrade1}
              onChange={(e) => setSelectedGrade1(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {gradesList.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Chọn lớp</label>
            <select
              value={selectedClass1}
              onChange={(e) => setSelectedClass1(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {classesList1.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Chọn môn học</label>
            <select
              value={selectedSubject1}
              onChange={(e) => setSelectedSubject1(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {subjectsList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Loại kiểm tra</label>
            <select
              value={selectedExamType1}
              onChange={(e) => setSelectedExamType1(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {examTypesList.map(et => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Chọn tháng</label>
            <select
              value={selectedMonth1}
              onChange={(e) => setSelectedMonth1(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {monthsList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Row 1 */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm học sinh theo tên hoặc họ lót..."
              value={searchKeyword1}
              onChange={(e) => setSearchKeyword1(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="text-xs font-bold text-slate-500 hidden sm:block">
            Môn đang xem: <span className="text-teal-700 font-extrabold">{selectedSubject1}</span> ({selectedExamType1})
          </div>
        </div>

        {!isCollapsed1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto relative">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 text-center">
                    <th className="p-3 border-r border-slate-200 w-12">STT</th>
                    <th className="p-3 border-r border-slate-200 min-w-[150px]">Họ và tên</th>
                    <th className="p-3 border-r border-slate-200 min-w-[100px]">Ngày sinh</th>
                    <th className="p-3 border-r border-slate-200 text-left min-w-[380px]">Lời nhận xét</th>
                    <th className="p-3 border-r border-slate-200 w-16">Đạt</th>
                    {isSubjectWithScore(selectedSubject1) && (
                      <th className="p-3 border-r border-slate-200 w-16">Điểm</th>
                    )}
                    <th className="p-3 w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents1.length === 0 ? (
                    <tr>
                      <td colSpan={isSubjectWithScore(selectedSubject1) ? 7 : 6} className="text-center py-12 text-slate-400 text-xs">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                          <span>Không tìm thấy học sinh nào phù hợp.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents1.map((st, idx) => {
                      const comment = st.commentDetail;
                      const hasComment = Boolean(comment && comment.hasCommented);
                      const studentEval = st.evaluations ? st.evaluations[selectedSubject1] : undefined;
                      const displayDat = comment?.overallDat || studentEval?.dat;
                      const displayScore = comment?.score !== undefined ? comment.score : (studentEval?.score || '');

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center border-r border-slate-200 font-semibold text-slate-600">{idx + 1}</td>
                          <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{st.lastName} {st.firstName}</span>
                              {st.isFemale && <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 font-normal">Nữ</span>}
                            </div>
                            {selectedClass1 === 'Tất cả Lớp' && st.className && (
                              <div className="text-[10px] text-teal-700 font-semibold mt-0.5 flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-teal-50 border border-teal-100">{st.className}</span>
                                {getHomeroomTeacherName(st.className) && (
                                  <span className="text-slate-500 font-normal">GVCN: {getHomeroomTeacherName(st.className)}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center border-r border-slate-200 text-slate-600 font-mono text-[11px]">{st.dob}</td>
                          <td className="p-3.5 border-r border-slate-200 text-slate-700 leading-relaxed">
                            {hasComment && comment ? (
                              <div className="space-y-1">
                                <div className="flex items-start gap-1.5">
                                  <span className="shrink-0 pt-0.5">👏</span>
                                  <span>
                                    Khen ngợi em đã hoàn thành đúng <b>{comment.correctCount}/{comment.totalQuestions} câu</b>. Làm tốt các câu: <b className="text-slate-900">{comment.strengths}</b>.
                                  </span>
                                </div>
                                {comment.reminders && (
                                  <div className="flex items-start gap-1.5 text-slate-600">
                                    <span className="shrink-0 pt-0.5">⚠️</span>
                                    <span>Cần ôn tập kỹ hơn ở {comment.reminders}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-slate-400 italic text-[11px] flex items-center gap-1.5 py-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                <span>Chưa có nhận xét cho đợt kiểm tra này</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center border-r border-slate-200">
                            {displayDat ? (
                              <span className={`inline-block px-2.5 py-1 rounded-lg font-extrabold text-xs ${
                                displayDat === 'T' ? 'bg-emerald-100 text-emerald-800' :
                                displayDat === 'H' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {displayDat}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs">-</span>
                            )}
                          </td>
                          {isSubjectWithScore(selectedSubject1) && (
                            <td className="p-3 text-center border-r border-slate-200 font-mono text-slate-800 font-extrabold">
                              {displayScore !== '' ? displayScore : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                          )}
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleViewDetail(st)}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer border border-teal-200 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" /> {hasComment ? 'Xem chi tiết' : 'Đánh giá / Nhận xét'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>


      {/* ==================================================== */}
      {/* PHẦN 2: SỔ TỔNG KẾT KẾT QUẢ GIÁO DỤC (HIỂN THỊ Ở PHÍA DƯỚI) */}
      {/* ==================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold">
              02
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Sổ Tổng Kết Kết Quả Giáo Dục Học Sinh
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
                  Chuẩn Tiểu Học
                </span>
              </h2>
              <p className="text-xs text-slate-500">Báo cáo đánh giá tổng thể định kì và điểm số định lượng các môn học</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcelSection2}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs shadow-emerald-200"
              title="Xuất bảng điểm tổng kết đang lọc ra file Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>Tải Excel</span>
            </button>

            <button
              onClick={() => setIsCollapsed2(!isCollapsed2)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isCollapsed2 ? <Maximize2 className="w-4 h-4 text-slate-500" /> : <Minimize2 className="w-4 h-4 text-slate-500" />}
              {isCollapsed2 ? 'Mở rộng' : 'Thu hẹp'}
            </button>
          </div>
        </div>

        {/* Filters Bar 2 */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Khối học</label>
            <select
              value={selectedGrade2}
              onChange={(e) => setSelectedGrade2(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {gradesList.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Lớp học</label>
            <select
              value={selectedClass2}
              onChange={(e) => setSelectedClass2(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {classesList2.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Học kỳ</label>
            <select
              value={selectedSemester2}
              onChange={(e) => setSelectedSemester2(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {semestersList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tìm kiếm học sinh</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nhập tên học sinh..."
                value={searchKeyword2}
                onChange={(e) => setSearchKeyword2(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* General Info Card 2 */}
        <div className="bg-gradient-to-r from-teal-900 to-teal-800 text-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-teal-200 uppercase tracking-wider">Thông tin báo cáo tổng kết</div>
            <div className="text-sm font-extrabold flex items-center gap-3 flex-wrap">
              <span>LỚP: <span className="text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-700">{selectedClass2 === 'Tất cả Lớp' ? `Toàn bộ ${selectedGrade2}` : selectedClass2}</span></span>
              {selectedClass2 !== 'Tất cả Lớp' && homeroomTeacherName2 ? (
                <>
                  <span className="text-teal-400">•</span>
                  <span>GVCN: <span className="font-bold text-white">{homeroomTeacherName2}</span></span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium bg-teal-950/70 px-4 py-2 rounded-xl border border-teal-700/80">
            <div>HỌC KỲ: <b className="text-teal-200">{selectedSemester2}</b></div>
            <div className="text-teal-400">|</div>
            <div>NĂM HỌC: <b className="text-teal-200">2026 - 2027</b></div>
          </div>
        </div>

        {!isCollapsed2 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" /> Bảng Điểm & Đánh Giá Mức Độ (Tổng số: {filteredStudents2.length} học sinh)
              </div>
              <div className="text-[11px] text-slate-500 italic">
                Ký hiệu mức đạt: T (Tốt), H (Hoàn thành), CHT (Chưa hoàn thành)
              </div>
            </div>

            <div className="overflow-x-auto relative">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 text-center">
                    <th className="p-3 border-r border-slate-200 w-12" rowSpan={2}>STT</th>
                    <th className="p-3 border-r border-slate-200 min-w-[110px]" rowSpan={2}>Họ lót</th>
                    <th className="p-3 border-r border-slate-200 min-w-[90px]" rowSpan={2}>Tên</th>
                    {selectedClass2 === 'Tất cả Lớp' && (
                      <>
                        <th className="p-3 border-r border-slate-200 min-w-[75px]" rowSpan={2}>Lớp</th>
                        <th className="p-3 border-r border-slate-200 min-w-[150px]" rowSpan={2}>GVCN</th>
                      </>
                    )}
                    <th className="p-3 border-r border-slate-200 min-w-[90px]" rowSpan={2}>Ngày sinh</th>
                    <th className="p-3 border-r border-slate-200 w-14" rowSpan={2}>Nữ</th>
                    {currentGradeSubjects2.map((subj) => {
                      const hasScore = isSubjectWithScore(subj);
                      return (
                        <th
                          key={subj}
                          className={`p-2 border-r border-slate-200 ${hasScore ? 'min-w-[95px]' : 'min-w-[60px]'}`}
                          colSpan={hasScore ? 2 : 1}
                        >
                          {subj}
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-bold border-b border-slate-200 text-center">
                    {currentGradeSubjects2.map((subj) => {
                      const hasScore = isSubjectWithScore(subj);
                      return (
                        <React.Fragment key={`${subj}-sub`}>
                          <th className="p-1.5 border-r border-slate-200 w-12">Đạt</th>
                          {hasScore && (
                            <th className="p-1.5 border-r border-slate-200 w-12">Điểm</th>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents2.length === 0 ? (
                    <tr>
                      <td
                        colSpan={(selectedClass2 === 'Tất cả Lớp' ? 7 : 5) + currentGradeSubjects2.reduce((acc, subj) => acc + (isSubjectWithScore(subj) ? 2 : 1), 0)}
                        className="text-center py-12 text-slate-400 text-xs"
                      >
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                          <span>Chưa tìm thấy học sinh nào trong cơ sở dữ liệu của lớp/khối này.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents2.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center border-r border-slate-200 font-semibold text-slate-600">{idx + 1}</td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-800">{st.lastName}</td>
                        <td className="p-3 border-r border-slate-200 font-extrabold text-teal-800">{st.firstName}</td>
                        {selectedClass2 === 'Tất cả Lớp' && (
                          <>
                            <td className="p-3 text-center border-r border-slate-200 font-bold text-teal-700">
                              <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-100 font-bold">{st.className || selectedGrade2}</span>
                            </td>
                            <td className="p-3 border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap">
                              {getHomeroomTeacherName(st.className) || '-'}
                            </td>
                          </>
                        )}
                        <td className="p-3 text-center border-r border-slate-200 text-slate-600 font-mono text-[11px]">{st.dob}</td>
                        <td className="p-3 text-center border-r border-slate-200">
                          <input type="checkbox" checked={st.isFemale} readOnly className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer" />
                        </td>
                        {currentGradeSubjects2.map((subj) => {
                          const evalData = st.evaluations ? st.evaluations[subj] : undefined;
                          const hasScore = isSubjectWithScore(subj);
                          return (
                            <React.Fragment key={subj}>
                              <td className="p-1.5 text-center border-r border-slate-200">
                                {evalData && evalData.dat ? (
                                  <span className={`inline-block px-2 py-0.5 rounded font-extrabold text-[11px] ${
                                    evalData.dat === 'T' ? 'bg-emerald-100 text-emerald-800' :
                                    evalData.dat === 'H' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {evalData.dat}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold text-[11px]">-</span>
                                )}
                              </td>
                              {hasScore && (
                                <td className="p-1.5 text-center border-r border-slate-200 font-mono text-slate-700 font-semibold">
                                  {evalData && evalData.score ? evalData.score : <span className="text-slate-300 font-normal">-</span>}
                                </td>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Hiển thị {filteredStudents2.length} học sinh</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Cuộn ngang để xem đầy đủ các môn học</span>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {isDetailModalOpen && selectedStudentDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Chi Tiết Nhận Xét & Phân Tích Bài Làm Học Sinh
                  </h3>
                  <p className="text-xs text-slate-500">Môn: {selectedSubject1} • {selectedExamType1}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className={`grid ${isSubjectWithScore(selectedSubject1) ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'} gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200`}>
                <div>
                  <span className="text-slate-400 font-semibold block">HỌ VÀ TÊN</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedStudentDetail.lastName} {selectedStudentDetail.firstName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">LỚP HỌC</span>
                  <span className="font-bold text-slate-800">{selectedStudentDetail.className}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">MỨC ĐẠT</span>
                  <div className="flex gap-1">
                    {(['T', 'H', 'CHT'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setModalOverallDat(lvl)}
                        className={`px-2 py-0.5 rounded font-extrabold text-xs transition-all cursor-pointer ${
                          modalOverallDat === lvl
                            ? lvl === 'T'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : lvl === 'H'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
                {isSubjectWithScore(selectedSubject1) && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">ĐIỂM SỐ</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={modalScore}
                      onChange={(e) => setModalScore(e.target.value)}
                      className="w-20 px-2 py-0.5 rounded-lg border border-slate-300 font-mono font-extrabold text-teal-700 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" /> Nhận xét & Đánh giá giáo viên:
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalOverallDat === 'T') {
                        setModalStrengths('Nắm vững kiến thức trọng tâm, tính toán chính xác và chủ động giải quyết bài tập.');
                        setModalReminders('Phát huy thêm tinh thần sáng tạo trong các bài toán mở.');
                        setModalCorrectCount(9);
                        setModalTotalQuestions(10);
                        if (!modalScore || Number(modalScore) < 8) setModalScore('9.0');
                      } else if (modalOverallDat === 'H') {
                        setModalStrengths('Hiểu bài, hoàn thành tốt các câu hỏi cơ bản và thực hành đúng quy trình.');
                        setModalReminders('Cần đọc kỹ đề bài và rèn luyện thêm kỹ năng tính toán cẩn thận.');
                        setModalCorrectCount(7);
                        setModalTotalQuestions(10);
                        if (!modalScore || Number(modalScore) < 6) setModalScore('7.5');
                      } else {
                        setModalStrengths('Có cố gắng hoàn thành bài, có ý thức học tập tốt.');
                        setModalReminders('Cần tăng cường ôn tập kiến thức cơ bản và trao đổi thường xuyên với giáo viên.');
                        setModalCorrectCount(4);
                        setModalTotalQuestions(10);
                        if (!modalScore || Number(modalScore) > 5) setModalScore('4.5');
                      }
                      showToast('✨ Đã sinh gợi ý nhận xét AI Sư Phạm phù hợp với mức đạt!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[11px] border border-teal-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Gợi ý AI Sư Phạm
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3 text-slate-800 leading-relaxed">
                  <div className="flex items-center gap-3">
                    <span className="text-teal-700 font-bold text-xs shrink-0">Số câu đúng / Tổng:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <input
                        type="number"
                        min="0"
                        value={modalCorrectCount}
                        onChange={(e) => setModalCorrectCount(Number(e.target.value) || 0)}
                        className="w-14 px-2 py-0.5 rounded-lg border border-slate-300 bg-white font-bold text-center text-xs"
                      />
                      <span className="text-slate-400 font-bold">/</span>
                      <input
                        type="number"
                        min="1"
                        value={modalTotalQuestions}
                        onChange={(e) => setModalTotalQuestions(Number(e.target.value) || 1)}
                        className="w-14 px-2 py-0.5 rounded-lg border border-slate-300 bg-white font-bold text-center text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-teal-700 font-bold text-xs block mb-1">
                      👏 Khen ngợi & Điểm mạnh nổi bật:
                    </label>
                    <textarea
                      rows={2}
                      value={modalStrengths}
                      onChange={(e) => setModalStrengths(e.target.value)}
                      placeholder="Nhập lời khen ngợi học sinh..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-amber-700 font-bold text-xs block mb-1">
                      ⚠️ Gợi ý cải thiện & Nhắc nhở:
                    </label>
                    <textarea
                      rows={2}
                      value={modalReminders}
                      onChange={(e) => setModalReminders(e.target.value)}
                      placeholder="Gợi ý nội dung học sinh cần ôn tập..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Đóng cửa sổ
              </button>
              <button
                onClick={async () => {
                  if (!selectedStudentDetail) return;
                  try {
                    const stdClassName = getStandardClassName(selectedStudentDetail.className);
                    const currentRoster = allStudentsDb[stdClassName] || [];
                    const updatedComment = {
                      correctCount: Number(modalCorrectCount) || 0,
                      totalQuestions: Number(modalTotalQuestions) || 10,
                      strengths: modalStrengths.trim(),
                      reminders: modalReminders.trim(),
                      overallDat: modalOverallDat,
                      score: Number(modalScore) || 0,
                      hasCommented: true
                    };

                    const updatedRoster = currentRoster.map((st) => {
                      if (st.id === selectedStudentDetail.id || (st.fullName || st.name) === `${selectedStudentDetail.lastName} ${selectedStudentDetail.firstName}`.trim()) {
                        const existingEvals = (st as any).evaluations || {};
                        return {
                          ...st,
                          evaluations: {
                            ...existingEvals,
                            [selectedSubject1]: {
                              dat: modalOverallDat,
                              score: isSubjectWithScore(selectedSubject1) ? String(modalScore) : ''
                            }
                          },
                          commentDetail: updatedComment
                        };
                      }
                      return st;
                    });

                    saveStudentsToLocalStorage(stdClassName, updatedRoster);
                    await syncClassStudentsToFirestore(stdClassName, updatedRoster);

                    setAllStudentsDb((prev) => ({
                      ...prev,
                      [stdClassName]: updatedRoster
                    }));

                    showToast(`Đã lưu thành công lời nhận xét cho học sinh ${selectedStudentDetail.lastName} ${selectedStudentDetail.firstName} và đồng bộ lên CSDL Firestore!`, "success");
                    setIsDetailModalOpen(false);
                  } catch (e) {
                    console.error('Save comment error:', e);
                    showToast("Lưu lời nhận xét thất bại, vui lòng kiểm tra lại!", "error");
                  }
                }}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-md shadow-teal-200 cursor-pointer"
              >
                Lưu lời nhận xét & Đồng bộ CSDL
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] text-white px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-up backdrop-blur-md bg-slate-950/95 ${toast.type === 'error' ? 'border-rose-500/50 text-rose-50' : 'border-emerald-500/50 text-emerald-50'}`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-extrabold tracking-wide">{toast.message}</span>
        </div>
      )}

    </div>
  );
};
