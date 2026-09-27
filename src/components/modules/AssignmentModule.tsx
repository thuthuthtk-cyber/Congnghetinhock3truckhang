import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { getSubjectColorStyles } from '../../utils/subjectColors';
import { DateTimePicker } from '../common/DateTimePicker';
import { PaginationControl } from '../common/PaginationControl';
import {
  ClipboardList,
  Sparkles,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  User,
  Users,
  Award,
  RefreshCw,
  Zap,
  FileCheck,
  Share2,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  BookOpen,
  GraduationCap,
  Layers,
  Search,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  X,
  FileText,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  RotateCcw,
  Trophy,
  BarChart3,
  Medal,
  Crown,
  Printer,
  TrendingUp,
  HeartHandshake,
  Database,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  GripVertical
} from 'lucide-react';
import { SUBJECTS, GRADES, CLASSES_BY_GRADE, ALL_CLASSES, normalizeQuestionType, getDefaultAnswerSchemaByType, synchronizeOrderingSteps } from '../../lib/constants';
import { useClassesList } from '../../services/classStorageService';
import { HomeworkAssignment, AssignmentSubmission, UserRole, QuestionItem } from '../../types';
import { gradeSubmissionAI } from '../../services/geminiService';
import { exportAssignmentResultsExcel } from '../../services/excelService';
import { ManualQuestionBankModal } from './ManualQuestionBankModal';
import { UseQuestionBankModal } from './UseQuestionBankModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { getLocalCachedQuestions, QUESTIONS_CACHE_KEY, saveQuestionsBatchToFirestore } from '../../services/questionStorageService';
import { useScoreSort } from '../../lib/useScoreSort';
import { StudentAssignmentModule } from './StudentAssignmentModule';
import { getCurrentTeacherProfile, resolveCurrentTeacherProfile } from '../../services/teacherStorageService';
import { getStudentsFromLocalStorage, getDefault5BRoster } from '../../services/studentStorageService';
import { auth } from '../../services/firebase';

interface StudentSubmissionRow {
  code: string;
  name: string;
  answers: ('pass' | 'fail' | 'none')[];
  totalScore: number | string;
  aiStatus: 'pass' | 'fail' | 'none';
  submittedTime: string;
  status: 'submitted' | 'waiting';
}

const CLASS_3A_STUDENTS: StudentSubmissionRow[] = [
  {
    code: '3a1',
    name: 'Hoàng Bảo An',
    answers: ['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass'],
    totalScore: 10,
    aiStatus: 'pass',
    submittedTime: '03:50:00 18/8/2026',
    status: 'submitted'
  },
  {
    code: '3a10',
    name: 'Hà Việt Hoàng',
    answers: ['fail', 'fail', 'fail', 'pass', 'pass', 'pass', 'pass', 'fail', 'pass'],
    totalScore: 4,
    aiStatus: 'pass',
    submittedTime: '05:38:47 29/8/2026',
    status: 'submitted'
  },
  { code: '3a2', name: 'Trần Bảo An', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a3', name: 'Nguyễn Nguyên Anh', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a4', name: 'Nguyễn Quốc Bảo', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a5', name: 'Tống Thị Quỳnh Chi', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a6', name: 'Vũ Ngọc Diệp', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a7', name: 'Mai Hải Đăng', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a8', name: 'Nguyễn Minh Đức', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a9', name: 'Hà Ngọc Hoa', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a11', name: 'Ngô Nhật Hưng', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a12', name: 'Nguyễn Bảo Khánh', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a13', name: 'Hoàng Tuấn Kiệt', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a14', name: 'Đỗ Diệu Linh', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a15', name: 'Phan Tú Linh', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a16', name: 'Hà Bảo Long', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a17', name: 'Hà Bảo Nam', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a18', name: 'Hà Duy Nam', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a19', name: 'Dương Bảo Ngân', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a20', name: 'Nguyễn Trung Nghĩa', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a21', name: 'Đào Thị Bích Ngọc', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a22', name: 'Phan Vũ Khánh Ngọc', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a23', name: 'Nguyễn Bình Nguyên', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a24', name: 'Đoàn Yến Nhi', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a25', name: 'Nguyễn Quỳnh Như', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a26', name: 'Lê Hải Phong', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a27', name: 'Hà Đại Phú', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a28', name: 'Đồng Xuân Phúc', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a29', name: 'Vũ Huy Thái', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a30', name: 'Hoàng Mai Phương Thảo', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a31', name: 'Hà Đình Tiến', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a32', name: 'Hoàng Khánh Trang', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a33', name: 'Vũ Hà Trang', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a34', name: 'Đoàn Minh Tú', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a35', name: 'Hà Phạm Hiền Tuệ', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a36', name: 'Đoàn Duy Tùng', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a37', name: 'Hà Thanh Tùng', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a38', name: 'Hà Hồng Vui', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' },
  { code: '3a39', name: 'Hà Thị Khánh Vy', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: '-', aiStatus: 'none', submittedTime: 'Chờ HS', status: 'waiting' }
];

interface AssignmentModuleProps {
  assignments: HomeworkAssignment[];
  questionsBank?: QuestionItem[];
  onSaveAssignment: (assignment: HomeworkAssignment) => void;
  onDeleteAssignment?: (id: string) => void;
  userRole: UserRole;
  currentUserId?: string;
  currentUserName?: string;
}

export const AssignmentModule: React.FC<AssignmentModuleProps> = ({
  assignments = [],
  questionsBank,
  onSaveAssignment,
  onDeleteAssignment,
  userRole,
  currentUserId,
  currentUserName
}) => {
  // Derive authentic teacher profile from Single Source of Truth (`teachers` / `to_chuyen_mon` collections)
  const authEmail = (typeof window !== 'undefined' ? (auth?.currentUser?.email || localStorage.getItem('eduplay_teacher_email')) : null);
  const activeTeacherProfile = resolveCurrentTeacherProfile(authEmail);
  const effectiveTeacherName = (currentUserName && currentUserName !== 'Lê Minh Anh' && !(currentUserName.includes('Văn Quân') && !authEmail?.includes('vanquan')))
    ? currentUserName
    : activeTeacherProfile.name;
  const effectiveTeacherId = (currentUserId && currentUserId !== 'u-4' && currentUserId.length <= 10 && currentUserId.startsWith('gv-'))
    ? currentUserId
    : activeTeacherProfile.id;

  const isAdmin = userRole === 'admin' || activeTeacherProfile.userRole === 'admin' || (activeTeacherProfile.role || '').toLowerCase().includes('admin');

  const isAssignmentOwner = useCallback((as: HomeworkAssignment): boolean => {
    if (isAdmin) return true;
    const currentId = activeTeacherProfile.id; // e.g. 'gv-12', 'gv-06'
    if (as.teacherId && as.teacherId === currentId) return true;
    if (as.createdBy && as.createdBy === currentId) return true;
    return false;
  }, [isAdmin, activeTeacherProfile.id]);

  const effectiveQuestionsBank = questionsBank && questionsBank.length > 0 ? questionsBank : getLocalCachedQuestions();
  // Perspective view: 'teacher' or 'student'
  const [activeRoleView, setActiveRoleView] = useState<'teacher' | 'student'>(
    userRole === 'student' ? 'student' : 'teacher'
  );

  // Repeat homework toggle state
  const [allowRepeat, setAllowRepeat] = useState<boolean>(true);

  // Active Category Tab: 'all' | 'my' | 'colleague'
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'colleague'>('all');

  // Dropdown filters
  const [selectedGrade, setSelectedGrade] = useState<string>('Tất cả các khối');
  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả các môn');
  const [selectedClass, setSelectedClass] = useState<string>('Tất cả các lớp');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination states
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selected assignment for Detail Modal / Submissions
  const [detailAssignment, setDetailAssignment] = useState<HomeworkAssignment | null>(null);

  // Tracking modal states
  const [trackingTab, setTrackingTab] = useState<'all' | 'needs_action' | 'support'>('all');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentSubmissionRow | null>(null);
  const [regradeToggle, setRegradeToggle] = useState(true);
  const [regradeScore, setRegradeScore] = useState('10');
  const [regradeComment, setRegradeComment] = useState('Chấm lại bởi AI thành công.');

  // Dynamic tracking students derived from detailAssignment submissions and class roster
  const trackingStudentsList = useMemo(() => {
    if (!detailAssignment) return [];
    
    // Debug log as requested by user
    console.log("Current Assignment ID querying:", detailAssignment.id);

    // Get authentic class students roster or default fallback
    const targetClassName = detailAssignment.targetClass || 'Lớp 3A';
    const classStudentsRoster = getStudentsFromLocalStorage(targetClassName) || getDefault5BRoster();
    const subMap = new Map<string, AssignmentSubmission>();
    
    (detailAssignment.submissions || []).forEach(sub => {
      const key = (sub.studentId || sub.studentName || '').trim().toLowerCase();
      if (key) subMap.set(key, sub);
    });

    const questionCount = detailAssignment.questions?.length || 5;

    return classStudentsRoster.map((st, idx) => {
      const studentKeyId = (st.id || '').trim().toLowerCase();
      const studentKeyName = (st.name || st.fullName || '').trim().toLowerCase();
      const submission = subMap.get(studentKeyId) || subMap.get(studentKeyName);

      if (submission) {
        const score = submission.score !== undefined ? submission.score : '-';
        const isPassed = typeof score === 'number' && score >= 5;
        const answers = Array.from({ length: questionCount }).map((_, qi) => (qi < Math.floor(questionCount * 0.8) ? ('pass' as const) : ('fail' as const)));
        return {
          code: st.code || `st-${idx + 1}`,
          name: st.name || st.fullName || `Học sinh ${idx + 1}`,
          answers,
          totalScore: score,
          aiStatus: isPassed ? ('pass' as const) : ('fail' as const),
          submittedTime: submission.submittedAt || new Date().toLocaleString('vi-VN'),
          status: 'submitted' as const
        };
      } else {
        return {
          code: st.code || `st-${idx + 1}`,
          name: st.name || st.fullName || `Học sinh ${idx + 1}`,
          answers: Array.from({ length: questionCount }).map(() => 'none' as const),
          totalScore: '-',
          aiStatus: 'none' as const,
          submittedTime: 'Chờ HS',
          status: 'waiting' as const
        };
      }
    });
  }, [detailAssignment]);

  const filteredTrackingStudents = useMemo(() => {
    if (trackingTab === 'needs_action') {
      return trackingStudentsList.filter(st => st.status === 'submitted' && (st.answers.includes('fail') || st.aiStatus === 'fail'));
    }
    if (trackingTab === 'support') {
      return trackingStudentsList.filter(st => st.totalScore !== '-' && Number(st.totalScore) < 5);
    }
    return trackingStudentsList;
  }, [trackingStudentsList, trackingTab]);

  const getAssignmentScoreInfo = useCallback((st: StudentSubmissionRow) => ({
    isSubmitted: st.status === 'submitted',
    score: st.totalScore !== '-' && !isNaN(Number(st.totalScore)) ? Number(st.totalScore) : null
  }), []);

  const {
    sortScoreDirection: assignmentSortScoreDirection,
    handleToggleSortScore: handleToggleAssignmentSortScore,
    resetSortScore: resetAssignmentSortScore,
    sortedItems: sortedTrackingStudents
  } = useScoreSort(filteredTrackingStudents, getAssignmentScoreInfo);

  // Vinh danh modal state
  const [vinhDanhAssignment, setVinhDanhAssignment] = useState<HomeworkAssignment | null>(null);
  const [sharingAssignment, setSharingAssignment] = useState<HomeworkAssignment | null>(null);

  const { classes: allRealClasses, getClassesForGrade: fetchClassesForGrade } = useClassesList();

  // Modal state for "🚀 Giao Bài Tập"
  const [assigningConfigAssignment, setAssigningConfigAssignment] = useState<HomeworkAssignment | null>(null);
  const [assignTitle, setAssignTitle] = useState<string>('');
  const [selectedAssignClasses, setSelectedAssignClasses] = useState<string[]>([]);
  const [assignStartDate, setAssignStartDate] = useState<string>('09/05/2026 08:00 AM');
  const [assignDueDate, setAssignDueDate] = useState<string>('09/12/2026 11:59 PM');
  const [assignMaxAttempts, setAssignMaxAttempts] = useState<string>('Không giới hạn số lần luyện tập');
  const [assignShuffleQuestions, setAssignShuffleQuestions] = useState<boolean>(true);
  const [assignShuffleOptions, setAssignShuffleOptions] = useState<boolean>(true);
  const [assignTargetType, setAssignTargetType] = useState<'all' | 'specific'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const getClassesForGrade = useCallback((gradeRaw?: string): string[] => {
    return fetchClassesForGrade(gradeRaw).map(c => c.name);
  }, [fetchClassesForGrade]);

  const handleOpenAssignConfig = (as: HomeworkAssignment) => {
    setAssigningConfigAssignment(as);
    setAssignTitle(as.title || '');
    
    const availableClasses = getClassesForGrade(as.grade);
    const initialClasses = as.targetClass
      ? as.targetClass.split(',').map(c => c.trim()).filter(Boolean)
      : [];
      
    setSelectedAssignClasses(initialClasses);
    setAssignStartDate('09/05/2026 08:00 AM');
    setAssignDueDate(as.dueDate || '09/12/2026 11:59 PM');
    setAssignMaxAttempts('Không giới hạn số lần luyện tập');
    setAssignShuffleQuestions(true);
    setAssignShuffleOptions(true);
    setAssignTargetType('all');
    setSelectedStudentIds(CLASS_3A_STUDENTS.map(s => s.code));
  };

  const handleConfirmAssignConfig = () => {
    if (!assigningConfigAssignment) return;

    if (selectedAssignClasses.length === 0) {
      alert('Vui lòng chọn ít nhất 1 lớp học để giao bài tập!');
      return;
    }

    const rootId = assigningConfigAssignment.originalAssignmentId || assigningConfigAssignment.id.replace(/-class-.*$/, '');

    selectedAssignClasses.forEach((cls, idx) => {
      const isFirst = idx === 0 && (!assigningConfigAssignment.targetClass || assigningConfigAssignment.targetClass === cls);
      const assignmentId = isFirst
        ? assigningConfigAssignment.id
        : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now() + idx}`;

      const classSpecificAssignment: HomeworkAssignment = {
        ...assigningConfigAssignment,
        id: assignmentId,
        originalAssignmentId: rootId,
        title: assignTitle.trim() || assigningConfigAssignment.title,
        targetClass: cls, // Lưu độc lập duy nhất 1 lớp cho từng dòng
        assignedDate: new Date().toLocaleDateString('vi-VN'),
        dueDate: assignDueDate || assigningConfigAssignment.dueDate,
        totalStudents: 35,
        completedCount: assigningConfigAssignment.targetClass === cls ? (assigningConfigAssignment.completedCount || 0) : 0,
      };

      onSaveAssignment(classSpecificAssignment);
    });

    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    showToast(
      selectedAssignClasses.length > 1
        ? `🚀 Đã giao bài tập thành công cho ${selectedAssignClasses.length} lớp riêng biệt (${selectedAssignClasses.join(', ')})!`
        : `🚀 Đã giao bài tập "${assignTitle.trim() || assigningConfigAssignment.title}" thành công cho ${selectedAssignClasses[0]}!`
    );
    setAssigningConfigAssignment(null);
  };

  // Local state for shared assignment IDs, persisted in localStorage
  const [sharedAssignmentIds, setSharedAssignmentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('eduplay_shared_assignment_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('eduplay_shared_assignment_ids', JSON.stringify(sharedAssignmentIds));
    } catch {
      // ignore storage errors
    }
  }, [sharedAssignmentIds]);

  const isAssignmentShared = (as: HomeworkAssignment) => {
    return sharedAssignmentIds.includes(as.id) || (as as any).isShared === true;
  };

  const handleConfirmShare = (as: HomeworkAssignment) => {
    const updatedSharedIds = Array.from(new Set([...sharedAssignmentIds, as.id]));
    setSharedAssignmentIds(updatedSharedIds);
    try {
      localStorage.setItem('eduplay_shared_assignment_ids', JSON.stringify(updatedSharedIds));
    } catch (e) {
      console.error(e);
    }

    const updatedAssignment: HomeworkAssignment = {
      ...as,
      isShared: true
    } as HomeworkAssignment;

    onSaveAssignment(updatedAssignment);
    showToast('✅ Đã chia sẻ bài tập thành công vào kho Học liệu của đồng nghiệp!');
    setSharingAssignment(null);
  };

  const handleCopyAndAssign = (as: HomeworkAssignment) => {
    const copiedAssignment: HomeworkAssignment = {
      ...as,
      id: `as-copy-${Date.now()}`,
      title: `${as.title} (Bản sao giao cho lớp)`,
      targetClass: 'Lớp 3A',
      authorType: 'my',
      teacherId: activeTeacherProfile.id,
      teacherName: activeTeacherProfile.name,
      teacherEmail: activeTeacherProfile.email,
      createdBy: activeTeacherProfile.id,
      assignedDate: new Date().toLocaleDateString('vi-VN'),
      submissions: []
    };
    onSaveAssignment(copiedAssignment);
    showToast(`✅ Đã sao chép & giao bài tập "${as.title}" cho Lớp 3A thành công!`);
  };

  useEffect(() => {
    if (vinhDanhAssignment) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        });
      } catch {
        // ignore if confetti fails
      }
    }
  }, [vinhDanhAssignment]);

  // Export Excel (.xlsx chuẩn)
  const handleExportExcel = () => {
    const title = detailAssignment?.title || 'Luyện tập: bài 1: Tự nhiên và công nghệ';
    const targetClass = detailAssignment?.targetClass || (selectedClass !== 'Tất cả các lớp' ? selectedClass : 'Lớp 3A');
    exportAssignmentResultsExcel(title, targetClass, CLASS_3A_STUDENTS);
    showToast(`✅ Đã xuất danh sách kết quả ${targetClass} (.xlsx chuẩn) thành công!`);
  };



  // Action Menu Popup per row ID
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Modals
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<HomeworkAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<HomeworkAssignment | null>(null);

  // Create/Edit Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('Công nghệ');
  const [formGrade, setFormGrade] = useState('Khối 3');
  const [formTargetClass, setFormTargetClass] = useState('Lớp 3A');
  const [formTeacherName, setFormTeacherName] = useState(() => activeTeacherProfile.name || 'Nguyễn Thị Thu');
  const [formDueDate, setFormDueDate] = useState('2026-09-10T23:59');
  const [formDescription, setFormDescription] = useState('');
  const [formQuestions, setFormQuestions] = useState<QuestionItem[]>([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBankAssignmentModalOpen, setIsBankAssignmentModalOpen] = useState(false);
  const [isBankSelectModalOpen, setIsBankSelectModalOpen] = useState(false);

  const handleAssignFromBank = (config: {
    title: string;
    subject: string;
    grade: string;
    classes: string[];
    dueDate: string;
    questionCount: number;
    selectedQuestions: QuestionItem[];
    maxAttempts: string;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  }) => {
    const rootId = `hw-bank-${Date.now()}`;
    const rawClasses = config.classes && config.classes.length > 0 ? config.classes : [];
    if (rawClasses.length === 0) {
      showToast('⚠️ Vui lòng chọn ít nhất một lớp để giao bài!');
      return;
    }
    const classes = Array.from(new Set(rawClasses.map(c => c.trim()).filter(Boolean)));

    classes.forEach((cls, idx) => {
      const newAssignment: HomeworkAssignment = {
        id: classes.length === 1 ? rootId : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        title: config.title || `Bài tập rèn luyện môn ${config.subject} (${new Date().toLocaleDateString('vi-VN')})`,
        subject: config.subject,
        grade: config.grade,
        targetClass: cls,
        dueDate: config.dueDate || '2026-09-10T23:59',
        description: `Bài tập tự luyện từ Ngân hàng câu hỏi gồm ${config.selectedQuestions.length} câu hỏi chuẩn sư phạm.`,
        questions: config.selectedQuestions,
        teacherId: activeTeacherProfile.id,
        teacherName: activeTeacherProfile.name,
        teacherEmail: activeTeacherProfile.email,
        createdBy: activeTeacherProfile.id,
        authorType: 'my',
        assignedDate: new Date().toLocaleDateString('vi-VN'),
        totalStudents: 35,
        completedCount: 0,
        submissions: [],
        createdAt: new Date().toISOString()
      };
      onSaveAssignment(newAssignment);
    });

    showToast(
      classes.length > 1
        ? `✅ Đã giao bài tập thành công cho ${classes.length} lớp riêng biệt (${classes.join(', ')})!`
        : `✅ Đã giao bài tập "${config.title || 'từ Ngân hàng'}" thành công!`
    );
    setIsBankAssignmentModalOpen(false);
  };

  const handleSelectQuestionsForForm = (selected: QuestionItem[]) => {
    setFormQuestions(prev => [...prev, ...selected]);
    showToast(`✅ Đã thêm ${selected.length} câu hỏi từ Ngân hàng vào danh sách!`);
    setIsBankSelectModalOpen(false);
  };

  // Student Solver Modal
  const [solvingAssignment, setSolvingAssignment] = useState<HomeworkAssignment | null>(null);
  const [studentContent, setStudentContent] = useState('');

  // AI Grading State
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Chuẩn hóa danh sách bài tập: Mỗi dòng đại diện cho 1 lớp duy nhất (Mô hình 1 bài - N lần giao)
  const normalizedAssignments = useMemo(() => {
    const list: HomeworkAssignment[] = [];
    (assignments || []).forEach(as => {
      const itemType = ((as as any).type || (as as any).category || (as as any).contentType || '').toLowerCase();
      // Loại trừ các bài giảng E-Learning để hiển thị đúng khu vực Bài giảng E-Learning độc lập
      if (itemType === 'elearning' || itemType === 'bai_giang' || itemType === 'lesson_5e' || (as.id && as.id.startsWith('elearn-'))) {
        return;
      }
      if (as.targetClass && as.targetClass.includes(',')) {
        const classes = as.targetClass.split(',').map(c => c.trim()).filter(Boolean);
        if (classes.length > 0) {
          classes.forEach((cls, idx) => {
            const rootId = as.originalAssignmentId || as.id.replace(/-class-.*$/, '');
            list.push({
              ...as,
              id: idx === 0 ? as.id : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              targetClass: cls,
              originalAssignmentId: rootId,
            });
          });
        } else {
          list.push(as);
        }
      } else {
        list.push(as);
      }
    });

    // Deduplication pass
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const cleanList: HomeworkAssignment[] = [];

    list.forEach(item => {
      if (!item || !item.id || seenIds.has(item.id)) return;
      const key = `${(item.title || '').trim().toLowerCase()}::${(item.targetClass || '').trim().toLowerCase()}::${(item.dueDate || '').trim()}`;
      if (seenKeys.has(key)) return;
      seenIds.add(item.id);
      seenKeys.add(key);
      cleanList.push(item);
    });

    return cleanList;
  }, [assignments]);

  // Tab counts calculation
  const allCount = normalizedAssignments.length;
  const myCount = normalizedAssignments.filter((as) => as.authorType === 'my' || !as.authorType).length;

  // Filter Logic
  const filteredAssignments = normalizedAssignments.filter((as) => {
    // Category tab filter
    if (activeTab === 'my') {
      if (as.authorType && as.authorType !== 'my') return false;
    }

    // Grade filter
    if (selectedGrade !== 'Tất cả các khối') {
      if (as.grade && as.grade !== selectedGrade) return false;
    }

    // Subject filter
    if (selectedSubject !== 'Tất cả các môn') {
      if (as.subject.toLowerCase() !== selectedSubject.toLowerCase()) return false;
    }

    // Class filter (chuẩn xác 1 lớp duy nhất)
    if (selectedClass !== 'Tất cả các lớp') {
      if (as.targetClass !== selectedClass) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = as.title.toLowerCase().includes(q);
      const matchTeacher = (as.teacherName || '').toLowerCase().includes(q);
      const matchSubject = as.subject.toLowerCase().includes(q);
      if (!matchTitle && !matchTeacher && !matchSubject) return false;
    }

    return true;
  });

  // Pagination calculation
  const totalItems = filteredAssignments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);

  // Create Assignment handler
  const handleSaveForm = () => {
    if (!formTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề bài tập!');
      return;
    }

    const assignmentToSave: HomeworkAssignment = {
      id: editingAssignment ? editingAssignment.id : `as-${Date.now()}`,
      title: formTitle,
      subject: formSubject,
      grade: formGrade,
      targetClass: formTargetClass,
      teacherId: editingAssignment?.teacherId || activeTeacherProfile.id,
      teacherName: editingAssignment?.teacherName || formTeacherName || activeTeacherProfile.name,
      teacherEmail: activeTeacherProfile.email,
      createdBy: editingAssignment?.createdBy || activeTeacherProfile.id,
      assignedDate: editingAssignment?.assignedDate || '18/8/2026',
      dueDate: formDueDate,
      description: formDescription,
      totalStudents: editingAssignment?.totalStudents || 39,
      completedCount: editingAssignment?.completedCount || 0,
      isApproved: true,
      authorType: 'my',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      questions: formQuestions,
      submissions: editingAssignment ? editingAssignment.submissions : []
    };

    onSaveAssignment(assignmentToSave);
    setIsCreatingModalOpen(false);
    setEditingAssignment(null);
    resetForm();
    showToast(editingAssignment ? 'Cập nhật bài tập thành công!' : 'Tạo bài tập mới từ ngân hàng câu hỏi thành công!');
  };

  const resetForm = () => {
    setFormTitle('');
    setFormSubject('Công nghệ');
    setFormGrade('Khối 3');
    setFormTargetClass('Lớp 3A');
    setFormTeacherName(effectiveTeacherName);
    setFormDueDate('2026-09-10T23:59');
    setFormDescription('');
    setFormQuestions([]);
  };

  const handleOpenEdit = (as: HomeworkAssignment) => {
    if (!isAssignmentOwner(as)) {
      showToast('⚠️ Bạn không có quyền chỉnh sửa nội dung này!');
      setOpenActionMenuId(null);
      return;
    }
    setEditingAssignment(as);
    setFormTitle(as.title);
    setFormSubject(as.subject);
    setFormGrade(as.grade || 'Khối 3');
    setFormTargetClass(as.targetClass);
    setFormTeacherName(as.teacherName || effectiveTeacherName);
    setFormDueDate(as.dueDate);
    setFormDescription(as.description);
    setFormQuestions(as.questions || []);
    setIsCreatingModalOpen(true);
    setOpenActionMenuId(null);
  };

  const handleDeleteAssignment = (id: string) => {
    const target = assignments.find(a => a.id === id);
    if (target && !isAssignmentOwner(target)) {
      showToast('⚠️ Bạn không có quyền xóa nội dung này!');
      setOpenActionMenuId(null);
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa bài tập này không?')) {
      if (onDeleteAssignment) onDeleteAssignment(id);
      showToast('Đã xóa bài tập khỏi hệ thống!');
      setOpenActionMenuId(null);
    }
  };

  const handleShareLink = (as: HomeworkAssignment) => {
    const url = `${window.location.origin}/assignment/${as.id}`;
    navigator.clipboard?.writeText(url);
    showToast(`Đã sao chép liên kết bài tập: "${as.title}"`);
    setOpenActionMenuId(null);
  };

  // Student submission handler
  const handleStudentSubmit = () => {
    if (!solvingAssignment || !studentContent.trim()) return;

    const newSubmission: AssignmentSubmission = {
      id: `sub-${Date.now()}`,
      studentId: currentUserId,
      studentName: currentUserName,
      submittedAt: new Date().toLocaleString('vi-VN'),
      content: studentContent,
      status: 'pending'
    };

    const updated: HomeworkAssignment = {
      ...solvingAssignment,
      completedCount: (solvingAssignment.completedCount || 0) + 1,
      submissions: [newSubmission, ...solvingAssignment.submissions]
    };

    onSaveAssignment(updated);
    setSolvingAssignment(null);
    setStudentContent('');
    showToast('Nộp bài tập thành công! Giáo viên và Gemini AI sẽ chấm bài sớm.');
  };

  // AI Grading
  const handleAiGrade = async (sub: AssignmentSubmission) => {
    if (!detailAssignment) return;
    setGradingSubId(sub.id);

    const aiResult = await gradeSubmissionAI(detailAssignment.title, sub.content);

    const updatedSubmissions = (detailAssignment.submissions || []).map((item) =>
      item.id === sub.id
        ? {
            ...item,
            score: aiResult.score,
            feedback: aiResult.feedback,
            status: 'graded' as const
          }
        : item
    );

    const updated: HomeworkAssignment = {
      ...detailAssignment,
      submissions: updatedSubmissions
    };

    onSaveAssignment(updated);
    setDetailAssignment(updated);
    setGradingSubId(null);
    showToast(`Đã dùng Gemini AI chấm bài cho ${sub.studentName} thành công!`);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* 1. KHỐI THỐNG KÊ & ĐIỀU KHIỂN TRÊN CÙNG    */}
      {/* ========================================== */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
        {/* Header Title & Perspective Toggle */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading flex items-center gap-2">
              <span>📝 Quản lý bài tập (Homework Mode)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Quản lý, theo dõi tiến độ và giao phiếu học liệu rèn luyện cho các lớp học sinh.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {activeRoleView === 'teacher' && (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs">
                <input
                  type="checkbox"
                  checked={allowRepeat}
                  onChange={(e) => setAllowRepeat(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
                <span>Cho phép làm lại nhiều lần</span>
              </label>
            )}

            {/* Perspective View Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setActiveRoleView('student')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeRoleView === 'student'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Góc nhìn Học sinh
              </button>
              <button
                onClick={() => setActiveRoleView('teacher')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeRoleView === 'teacher'
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Góc nhìn Giáo viên
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeRoleView === 'student' ? (
        <StudentAssignmentModule
          assignments={assignments}
          onSaveAssignment={onSaveAssignment}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isPreviewMode={true}
          onExitPreview={() => setActiveRoleView('teacher')}
        />
      ) : (
        <>
          {/* ========================================== */}
          {/* 2. BẢNG QUẢN LÝ HỌC LIỆU & BỘ LỌC CHUYÊN SÂU */}
          {/* ========================================== */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
        {/* Section Header & Highlight Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
            <span>📁 Quản lý Học liệu & Theo dõi Bài tập đã giao</span>
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBankAssignmentModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <Database className="w-4 h-4" />
              <span>Chọn từ Ngân hàng câu hỏi</span>
            </button>
          </div>
        </div>

        {/* UseQuestionBankModal for AssignmentModule */}
        <UseQuestionBankModal
          isOpen={isBankAssignmentModalOpen}
          onClose={() => setIsBankAssignmentModalOpen(false)}
          questions={effectiveQuestionsBank}
          targetContext="assignment"
          initialSubject={selectedSubject !== 'Tất cả các môn' ? selectedSubject : 'Công nghệ'}
          initialGrade={selectedGrade !== 'Tất cả các khối' ? selectedGrade : 'Khối 3'}
          onAssignHomework={handleAssignFromBank}
        />

        {/* 3 Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <div className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-900 text-white shadow-xs flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Tất cả bài tập ({allCount})
          </div>
        </div>

        {/* 3 Dropdown Filters with Rounded Design & Icons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
          {/* Filter 1: Khối */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Layers className="w-4 h-4" />
            </div>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedClass('Tất cả các lớp');
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="Tất cả các khối">Tất cả các khối</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Filter 2: Môn */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="Tất cả các môn">Tất cả các môn</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Filter 3: Lớp */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="Tất cả các lớp">Tất cả các lớp</option>
              {(selectedGrade === 'Tất cả các khối' ? ALL_CLASSES : CLASSES_BY_GRADE[selectedGrade] || []).map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên bài giao..."
              className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* ========================================== */}
        {/* 3. BẢNG DANH SÁCH BÀI TẬP (TABLE LISTING)  */}
        {/* ========================================== */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">TIÊU ĐỀ BÀI GIAO</th>
                <th className="py-3.5 px-4 whitespace-nowrap">LỚP</th>
                <th className="py-3.5 px-4 whitespace-nowrap">NGÀY GIAO</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ĐÃ LÀM</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                    Không tìm thấy bài tập nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedAssignments.map((as) => {
                  const completed = as.completedCount ?? (as.submissions ? as.submissions.length : 0);
                  const total = as.totalStudents || 39;
                  const percent = Math.round((completed / total) * 100);
                  const isShared = isAssignmentShared(as);
                  const subjColor = getSubjectColorStyles(as.subject);

                  return (
                    <tr
                      key={as.id}
                      onClick={() => setDetailAssignment(as)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Tiêu đề bài giao */}
                      <td className="py-4 px-4 max-w-md">
                        <div className="space-y-1.5">
                          <div className="font-medium text-slate-900 text-base leading-snug group-hover:text-indigo-900 transition-colors">
                            {as.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Badge Môn - Dynamic Subject Color */}
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${subjColor.badgeClass}`}>
                              {as.subject || subjColor.name.toUpperCase()}
                            </span>
                            {/* Badge Khối */}
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium uppercase bg-amber-100 text-amber-800 border border-amber-200">
                              {as.grade || 'KHỐI 3'}
                            </span>
                            {/* Badge Đã duyệt */}
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Đã duyệt nội dung
                            </span>
                            {/* Badge Đã chia sẻ */}
                            {isShared && (
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-emerald-600" /> ĐÃ CHIA SẺ VÀO TỔ CHUYÊN MÔN
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Lớp */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-500 text-emerald-700 bg-emerald-50/60">
                          {as.targetClass || 'Lớp 3A'}
                        </span>
                      </td>

                      {/* Ngày giao */}
                      <td className="py-4 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {as.assignedDate || '18/8/2026'}
                      </td>

                      {/* Đã làm */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {completed}/{total}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {percent}%
                          </span>
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4 text-center whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          {/* Quick action button for colleague/shared assignment - only for owner/admin */}
                          {(activeTab === 'colleague' || isShared) && activeRoleView === 'teacher' && isAssignmentOwner(as) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAndAssign(as);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Sao chép bài tập này và giao cho lớp của bạn"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Sao chép & Giao cho lớp tôi</span>
                            </button>
                          )}

                          {/* 3 dots Menu Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === as.id ? null : as.id);
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-all cursor-pointer border border-transparent hover:border-slate-200"
                            title="Tùy chọn thao tác"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Popup Menu */}
                          {openActionMenuId === as.id && (
                            <div className="absolute right-4 top-12 z-30 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left text-xs animate-fade-in divide-y divide-slate-100">
                              {isAssignmentOwner(as) ? (
                                <>
                                  <div className="py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAssignConfig(as);
                                        setOpenActionMenuId(null);
                                      }}
                                      className="w-full px-3.5 py-2 text-left hover:bg-indigo-50 flex items-center gap-2.5 font-bold text-indigo-700 cursor-pointer"
                                    >
                                      <Send className="w-4 h-4 text-indigo-600" /> 🚀 Giao Bài Tập
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailAssignment(as);
                                        setOpenActionMenuId(null);
                                      }}
                                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4 text-indigo-600" /> Xem chi tiết
                                    </button>

                                     <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEdit(as);
                                      }}
                                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer"
                                    >
                                      <Edit3 className="w-4 h-4 text-amber-600" /> Sửa bài tập
                                    </button>
                                  </div>

                                  <div className="py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingAssignment(as);
                                        setOpenActionMenuId(null);
                                      }}
                                      className="w-full px-3.5 py-2 text-left hover:bg-red-50 flex items-center gap-2.5 font-semibold text-red-600 cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" /> Xóa bài tập
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailAssignment(as);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4 text-indigo-600" /> Xem chi tiết
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================== */}
        {/* 4. PHÂN TRANG & THÔNG TIN DƯỚI CÙNG (PAGINATION) */}
        {/* ========================================== */}
        <PaginationControl
          currentPage={currentPage}
          pageSize={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setItemsPerPage}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="bài"
        />
      </div>
    </>
  )}

      {/* ========================================== */}
      {/* MODAL 1: CREATE / EDIT ASSIGNMENT          */}
      {/* ========================================== */}
      {isCreatingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scale-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900 font-heading flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span>
                  {editingAssignment
                    ? 'Cập Nhật Bài Tập Về Nhà & Danh Sách Câu Hỏi'
                    : 'Tạo Bài Tập Từ Ngân Hàng Câu Hỏi'}
                </span>
              </h3>
              <button
                onClick={() => setIsCreatingModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tiêu đề bài tập */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Tiêu Đề Bài Tập Về Nhà:
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Nhập tiêu đề phiếu bài giao..."
                className="w-full p-3 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* Mô tả chi tiết */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Nội Dung & Yêu Cầu Học Liệu:
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Mô tả nội dung bài tập, yêu cầu rèn luyện cho học sinh..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Questions Section with Full Cards & Editing */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <span>DANH SÁCH CÂU HỎI BÀI TẬP</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black">
                      {formQuestions.length} câu
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">Chỉnh sửa nội dung, đáp án, điểm số hoặc thêm/xóa câu hỏi trực tiếp dưới đây.</p>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsBankSelectModalOpen(true)}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Database className="w-4 h-4" />
                    <span>Chọn từ Ngân hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm câu hỏi mới</span>
                  </button>
                </div>
              </div>

              {/* Danh sách thẻ chi tiết câu hỏi */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {formQuestions.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                    <p className="text-sm font-bold text-slate-600">Chưa có câu hỏi nào trong bài tập này</p>
                    <p className="text-xs text-slate-400">Bấm "Chọn từ Ngân hàng" hoặc "Thêm câu hỏi mới" để xây dựng bộ câu hỏi.</p>
                  </div>
                ) : (
                  formQuestions.map((q, idx) => {
                    const activeType = normalizeQuestionType(q.type);
                    return (
                    <div key={q.id || idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 relative group">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <select
                            value={activeType}
                            onChange={(e) => {
                              const newType = normalizeQuestionType(e.target.value);
                              const defaultSchema = getDefaultAnswerSchemaByType(newType);
                              const updated = [...formQuestions];
                              updated[idx] = {
                                ...q,
                                ...defaultSchema,
                                type: newType,
                              };
                              setFormQuestions(updated);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white text-indigo-700"
                          >
                            <option value="multiple_choice">Trắc nghiệm đơn (A/B/C/D)</option>
                            <option value="multiple_response">Chọn nhiều đáp án đúng</option>
                            <option value="true_false">Đúng / Sai</option>
                            <option value="fill_blank">Điền khuyết</option>
                            <option value="ordering">Sắp xếp thứ tự</option>
                            <option value="matching">Nối cặp / Kéo thả</option>
                            <option value="classification">Phân loại nhóm</option>
                            <option value="essay">Tự luận</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-500">Điểm:</span>
                            <input
                              type="number"
                              step="0.5"
                              value={(q as any).score || 2}
                              onChange={(e) => {
                                const updated = [...formQuestions];
                                updated[idx] = { ...q, score: Number(e.target.value) } as any;
                                setFormQuestions(updated);
                              }}
                              className="w-12 text-center font-black text-indigo-600 focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormQuestions(formQuestions.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer transition-colors"
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Nội dung câu hỏi */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nội dung câu hỏi {idx + 1}:</label>
                        <textarea
                          rows={2}
                          value={q.content}
                          onChange={(e) => {
                            const updated = [...formQuestions];
                            updated[idx] = { ...q, content: e.target.value };
                            setFormQuestions(updated);
                          }}
                          placeholder="Nhập nội dung câu hỏi..."
                          className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                        />
                      </div>

                      {/* Render giao diện nhập đáp án theo đúng loại câu hỏi bằng switch-case */}
                      {(() => {
                        switch (activeType) {
                          case 'multiple_choice':
                          case 'multiple_response': {
                            const isMultiple = activeType === 'multiple_response';
                            const currentOptions = Array.isArray(q.options) && q.options.length > 0 ? q.options : ['', '', '', ''];
                            return (
                              <div className="space-y-2 pt-1">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">
                                  {isMultiple ? 'Chọn nhiều đáp án đúng (tick chọn các đáp án chính xác):' : 'Các phương án trả lời (nhập nội dung & chọn 1 đáp án đúng):'}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {currentOptions.map((opt, oIdx) => {
                                    const letter = ['A', 'B', 'C', 'D', 'E', 'F'][oIdx] || String(oIdx + 1);
                                    const correctArr = Array.isArray(q.correctAnswer)
                                      ? q.correctAnswer
                                      : String(q.correctAnswer || '').split(',').map(s => s.trim()).filter(Boolean);
                                    const isSelected = isMultiple ? correctArr.includes(letter) : q.correctAnswer === letter;

                                    return (
                                      <div key={oIdx} className={`flex items-center gap-2 p-2 rounded-xl border bg-white ${isSelected ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'}`}>
                                        {isMultiple ? (
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              const updated = [...formQuestions];
                                              const nextCorrect = e.target.checked
                                                ? Array.from(new Set([...correctArr, letter])).sort()
                                                : correctArr.filter(x => x !== letter);
                                              updated[idx] = { ...q, type: activeType, correctAnswer: nextCorrect.join(',') };
                                              setFormQuestions(updated);
                                            }}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                            title="Đánh dấu là đáp án đúng"
                                          />
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...formQuestions];
                                              updated[idx] = { ...q, type: activeType, correctAnswer: letter };
                                              setFormQuestions(updated);
                                            }}
                                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 cursor-pointer transition-all ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            title="Đánh dấu đây là đáp án đúng"
                                          >
                                            {letter}
                                          </button>
                                        )}
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => {
                                            const updated = [...formQuestions];
                                            const newOpts = [...currentOptions];
                                            newOpts[oIdx] = e.target.value;
                                            updated[idx] = { ...q, type: activeType, options: newOpts };
                                            setFormQuestions(updated);
                                          }}
                                          placeholder={`Đáp án ${letter}...`}
                                          className="w-full text-xs font-medium focus:outline-none bg-transparent"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }

                          case 'true_false': {
                            const currentStatements = Array.isArray(q.statements) && q.statements.length > 0
                              ? q.statements
                              : [{ statement: '', isCorrect: true }, { statement: '', isCorrect: false }];
                            return (
                              <div className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Danh sách các nhận định Đúng / Sai:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...formQuestions];
                                      const statements = [...currentStatements, { statement: '', isCorrect: true }];
                                      updated[idx] = { ...q, type: activeType, statements };
                                      setFormQuestions(updated);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Thêm nhận định
                                  </button>
                                </div>
                                
                                <div className="space-y-2">
                                  {currentStatements.map((st, sIdx) => (
                                    <div key={sIdx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                        {sIdx + 1}
                                      </span>
                                      <input
                                        type="text"
                                        value={st.statement}
                                        onChange={(e) => {
                                          const updated = [...formQuestions];
                                          const statements = [...currentStatements];
                                          statements[sIdx] = { ...statements[sIdx], statement: e.target.value };
                                          updated[idx] = { ...q, type: activeType, statements };
                                          setFormQuestions(updated);
                                        }}
                                        placeholder="Nhập nội dung nhận định..."
                                        className="w-full text-xs font-medium focus:outline-none bg-transparent"
                                      />
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...formQuestions];
                                            const statements = [...currentStatements];
                                            statements[sIdx] = { ...statements[sIdx], isCorrect: true };
                                            updated[idx] = { ...q, type: activeType, statements };
                                            setFormQuestions(updated);
                                          }}
                                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${st.isCorrect ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                          Đúng
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...formQuestions];
                                            const statements = [...currentStatements];
                                            statements[sIdx] = { ...statements[sIdx], isCorrect: false };
                                            updated[idx] = { ...q, type: activeType, statements };
                                            setFormQuestions(updated);
                                          }}
                                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${st.isCorrect === false ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                          Sai
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...formQuestions];
                                            const statements = currentStatements.filter((_, i) => i !== sIdx);
                                            updated[idx] = { ...q, type: activeType, statements };
                                            setFormQuestions(updated);
                                          }}
                                          className="p-1 rounded text-rose-500 hover:text-rose-700 cursor-pointer ml-1"
                                          title="Xóa nhận định này"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          case 'fill_blank': {
                            return (
                              <div className="space-y-1.5 pt-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Đáp án điền khuyết chính xác:</label>
                                <input
                                  type="text"
                                  value={q.correctAnswer || ''}
                                  onChange={(e) => {
                                    const updated = [...formQuestions];
                                    updated[idx] = { ...q, type: activeType, correctAnswer: e.target.value };
                                    setFormQuestions(updated);
                                  }}
                                  placeholder="Nhập từ hoặc cụm từ đáp án đúng..."
                                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold text-emerald-800"
                                />
                              </div>
                            );
                          }

                           case 'ordering': {
                            const currentOrderItems = Array.isArray(q.options) && q.options.length > 0
                              ? q.options
                              : ['Bước 1', 'Bước 2', 'Bước 3'];
                            const moveAssignmentStep = (fromIdx: number, toIdx: number) => {
                              if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= currentOrderItems.length || toIdx >= currentOrderItems.length) return;
                              const updated = [...formQuestions];
                              const reordered = [...currentOrderItems];
                              const [moved] = reordered.splice(fromIdx, 1);
                              reordered.splice(toIdx, 0, moved);
                              const synced = synchronizeOrderingSteps(reordered);
                              console.log('[AssignmentModule - Reorder Steps]', {
                                questionId: q.id,
                                updatedOrderingSteps: synced.orderingSteps,
                                canonicalOptions: synced.canonicalOptions,
                              });
                              updated[idx] = { ...q, ...synced };
                              setFormQuestions(updated);
                            };
                            return (
                              <div className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Các bước / sự kiện theo đúng thứ tự logic (kéo-thả hoặc bấm ▲/▼):</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...formQuestions];
                                      const options = [...currentOrderItems, `Bước ${currentOrderItems.length + 1}`];
                                      updated[idx] = { ...q, ...synchronizeOrderingSteps(options) };
                                      setFormQuestions(updated);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Thêm mục sắp xếp
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {currentOrderItems.map((item, oIdx) => (
                                    <div
                                      key={oIdx}
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', String(oIdx));
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                                        if (!Number.isNaN(fromIdx)) {
                                          moveAssignmentStep(fromIdx, oIdx);
                                        }
                                      }}
                                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 hover:border-indigo-300 transition-all"
                                    >
                                      <div
                                        className="cursor-grab active:cursor-grabbing text-indigo-400 hover:text-indigo-700 p-0.5 shrink-0"
                                        title="Kéo-thả để đổi vị trí bước"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center shrink-0">
                                        {oIdx + 1}
                                      </span>
                                      <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => {
                                          const updated = [...formQuestions];
                                          const newOpts = [...currentOrderItems];
                                          newOpts[oIdx] = e.target.value;
                                          updated[idx] = { ...q, ...synchronizeOrderingSteps(newOpts) };
                                          setFormQuestions(updated);
                                        }}
                                        placeholder={`Nội dung bước ${oIdx + 1}...`}
                                        className="w-full text-xs font-medium focus:outline-none bg-transparent"
                                      />
                                      <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5 shrink-0">
                                        <button
                                          type="button"
                                          disabled={oIdx === 0}
                                          onClick={() => moveAssignmentStep(oIdx, oIdx - 1)}
                                          title="Chuyển bước lên trên"
                                          className="p-1 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={oIdx === currentOrderItems.length - 1}
                                          onClick={() => moveAssignmentStep(oIdx, oIdx + 1)}
                                          title="Chuyển bước xuống dưới"
                                          className="p-1 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...formQuestions];
                                          const newOpts = currentOrderItems.filter((_, i) => i !== oIdx);
                                          updated[idx] = { ...q, ...synchronizeOrderingSteps(newOpts) };
                                          setFormQuestions(updated);
                                        }}
                                        className="p-1 rounded text-rose-500 hover:text-rose-700 cursor-pointer"
                                        title="Xóa mục"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          case 'matching': {
                            const currentPairs = Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0
                              ? q.matchingPairs
                              : [{ left: '', right: '' }, { left: '', right: '' }];
                            return (
                              <div className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Các cặp ghép nối tương ứng (Trái - Phải):</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...formQuestions];
                                      const matchingPairs = [...currentPairs, { left: '', right: '' }];
                                      updated[idx] = { ...q, type: activeType, matchingPairs };
                                      setFormQuestions(updated);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Thêm cặp nối
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {currentPairs.map((pair, pIdx) => (
                                    <div key={pIdx} className="p-2.5 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">Trái {pIdx + 1}:</span>
                                        <input
                                          type="text"
                                          value={pair.left}
                                          onChange={(e) => {
                                            const updated = [...formQuestions];
                                            const matchingPairs = [...currentPairs];
                                            matchingPairs[pIdx] = { ...matchingPairs[pIdx], left: e.target.value };
                                            updated[idx] = { ...q, type: activeType, matchingPairs };
                                            setFormQuestions(updated);
                                          }}
                                          placeholder="Cột trái..."
                                          className="w-full text-xs font-medium p-1.5 rounded-lg border border-slate-200 bg-slate-50"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">Phải {pIdx + 1}:</span>
                                        <input
                                          type="text"
                                          value={pair.right}
                                          onChange={(e) => {
                                            const updated = [...formQuestions];
                                            const matchingPairs = [...currentPairs];
                                            matchingPairs[pIdx] = { ...matchingPairs[pIdx], right: e.target.value };
                                            updated[idx] = { ...q, type: activeType, matchingPairs };
                                            setFormQuestions(updated);
                                          }}
                                          placeholder="Cột phải tương ứng..."
                                          className="w-full text-xs font-medium p-1.5 rounded-lg border border-slate-200 bg-slate-50"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...formQuestions];
                                            const matchingPairs = currentPairs.filter((_, i) => i !== pIdx);
                                            updated[idx] = { ...q, type: activeType, matchingPairs };
                                            setFormQuestions(updated);
                                          }}
                                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          case 'classification': {
                            const currentGroups = Array.isArray(q.classificationGroups) && q.classificationGroups.length > 0
                              ? q.classificationGroups
                              : ['Nhóm 1', 'Nhóm 2'];
                            const currentItems = Array.isArray(q.classificationItems) && q.classificationItems.length > 0
                              ? q.classificationItems
                              : [{ content: '', group: currentGroups[0] || 'Nhóm 1' }];
                            return (
                              <div className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Các nhóm phân loại & phần tử:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...formQuestions];
                                      const classificationItems = [...currentItems, { content: '', group: currentGroups[0] || 'Nhóm 1' }];
                                      updated[idx] = { ...q, type: activeType, classificationGroups: currentGroups, classificationItems };
                                      setFormQuestions(updated);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Thêm phần tử
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {currentGroups.map((grp, gIdx) => (
                                    <input
                                      key={gIdx}
                                      type="text"
                                      value={grp}
                                      onChange={(e) => {
                                        const newGroupVal = e.target.value;
                                        const oldGroupVal = currentGroups[gIdx];
                                        const nextGroups = [...currentGroups];
                                        nextGroups[gIdx] = newGroupVal;
                                        const nextItems = currentItems.map(it => it.group === oldGroupVal ? { ...it, group: newGroupVal } : it);
                                        const updated = [...formQuestions];
                                        updated[idx] = { ...q, type: activeType, classificationGroups: nextGroups, classificationItems: nextItems };
                                        setFormQuestions(updated);
                                      }}
                                      placeholder={`Tên nhóm ${gIdx + 1}...`}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50/40 text-indigo-900"
                                    />
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  {currentItems.map((it, iIdx) => (
                                    <div key={iIdx} className="p-2 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={it.content}
                                        onChange={(e) => {
                                          const nextItems = [...currentItems];
                                          nextItems[iIdx] = { ...nextItems[iIdx], content: e.target.value };
                                          const updated = [...formQuestions];
                                          updated[idx] = { ...q, type: activeType, classificationGroups: currentGroups, classificationItems: nextItems };
                                          setFormQuestions(updated);
                                        }}
                                        placeholder="Nội dung phần tử..."
                                        className="flex-1 text-xs font-medium p-1.5 rounded-lg border border-slate-200 bg-slate-50"
                                      />
                                      <select
                                        value={it.group}
                                        onChange={(e) => {
                                          const nextItems = [...currentItems];
                                          nextItems[iIdx] = { ...nextItems[iIdx], group: e.target.value };
                                          const updated = [...formQuestions];
                                          updated[idx] = { ...q, type: activeType, classificationGroups: currentGroups, classificationItems: nextItems };
                                          setFormQuestions(updated);
                                        }}
                                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-indigo-700"
                                      >
                                        {currentGroups.map((g, gIdx) => (
                                          <option key={gIdx} value={g}>{g}</option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextItems = currentItems.filter((_, i) => i !== iIdx);
                                          const updated = [...formQuestions];
                                          updated[idx] = { ...q, type: activeType, classificationGroups: currentGroups, classificationItems: nextItems };
                                          setFormQuestions(updated);
                                        }}
                                        className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer shrink-0"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          case 'essay': {
                            return (
                              <div className="space-y-1.5 pt-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Gợi ý đáp án mẫu / Rubric chấm điểm:</label>
                                <textarea
                                  rows={2}
                                  value={q.correctAnswer || q.explanation || ''}
                                  onChange={(e) => {
                                    const updated = [...formQuestions];
                                    updated[idx] = { ...q, type: activeType, correctAnswer: e.target.value, explanation: e.target.value };
                                    setFormQuestions(updated);
                                  }}
                                  placeholder="Nhập hướng dẫn chấm, biểu điểm hoặc gợi ý đáp án mẫu cho giáo viên..."
                                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-blue-50/50 text-blue-900 font-medium"
                                />
                              </div>
                            );
                          }

                          default:
                            return null;
                        }
                      })()}

                      {/* Lời giải / Hướng dẫn */}
                      <div>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => {
                            const updated = [...formQuestions];
                            updated[idx] = { ...q, explanation: e.target.value };
                            setFormQuestions(updated);
                          }}
                          placeholder="Nhập hướng dẫn giải chi tiết (tùy chọn)..."
                          className="w-full px-3 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-amber-50/50 text-amber-900 placeholder-amber-400 font-medium"
                        />
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>

            <ManualQuestionBankModal
              isOpen={isManualModalOpen}
              onClose={() => setIsManualModalOpen(false)}
              onSaveQuestions={(newQs, saveToGlobal) => {
                setFormQuestions(prev => [...prev, ...newQs]);
                if (saveToGlobal) {
                  const existing = getLocalCachedQuestions();
                  const updated = [...existing, ...newQs];
                  localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(updated));
                  saveQuestionsBatchToFirestore(newQs).catch(console.error);
                }
              }}
              initialLessonName={formTitle}
              initialGrade={formGrade}
              initialSubject={formSubject}
              defaultSaveToGlobal={false}
            />

            <UseQuestionBankModal
              isOpen={isBankSelectModalOpen}
              onClose={() => setIsBankSelectModalOpen(false)}
              questions={effectiveQuestionsBank}
              targetContext="assignment"
              initialSubject={formSubject}
              initialGrade={formGrade}
              onSelectQuestions={handleSelectQuestionsForForm}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 bg-white">
              <button
                onClick={() => setIsCreatingModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveForm}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-900 hover:bg-indigo-950 text-white shadow-lg cursor-pointer transition-all flex items-center gap-2"
              >
                <span>💾 Lưu toàn bộ & Đóng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: THEO DÕI NỘP BÀI RÈN LUYỆN        */}
      {/* ========================================== */}
      {detailAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-6xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden space-y-4 animate-scale-up">
            
            {/* 1. MODAL HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading flex items-center gap-2.5">
                  <Eye className="w-6 h-6 text-indigo-600 bg-indigo-50 p-1 rounded-lg" />
                  <span>Theo dõi nộp bài rèn luyện</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Bài tập: <span className="font-extrabold text-slate-800">{detailAssignment.title || 'Bài tập: Luyện tập: bài 1: Tự nhiên và công nghệ'}</span>
                  <span className="mx-2 text-slate-300">•</span>
                  Sĩ số {detailAssignment.targetClass || 'Lớp 3A'}: <span className="font-extrabold text-indigo-900">{detailAssignment.totalStudents || 39} học sinh</span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất danh sách (Excel)</span>
                </button>

                <button
                  onClick={() => { setDetailAssignment(null); resetAssignmentSortScore(); }}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. TOOLBAR & FILTER TABS */}
            {(() => {
              const needsActionCount = trackingStudentsList.filter(st => st.status === 'submitted' && (st.answers.includes('fail') || st.aiStatus === 'fail')).length;
              const supportCount = trackingStudentsList.filter(st => st.totalScore !== '-' && Number(st.totalScore) < 5).length;

              return (
                <div className="bg-slate-50/90 p-2.5 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setTrackingTab('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        trackingTab === 'all'
                          ? 'bg-sky-100/90 text-sky-900 border border-sky-300 shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Tất cả ({trackingStudentsList.length})
                    </button>

                    <button
                      onClick={() => setTrackingTab('needs_action')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        trackingTab === 'needs_action'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                          : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Cần xử lý bài tập ({needsActionCount})
                    </button>

                    <button
                      onClick={() => setTrackingTab('support')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        trackingTab === 'support'
                          ? 'bg-rose-100 text-rose-950 border border-rose-300 shadow-2xs'
                          : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                      }`}
                    >
                      <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
                      <span>🆘 Danh sách hỗ trợ ({supportCount})</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 italic font-medium flex items-center gap-1">
                    <span>Mẹo: Giáo viên xem danh sách cần hỗ trợ để kịp thời kèm cặp các em điểm dưới 5.</span>
                  </div>
                </div>
              );
            })()}

            {/* 3. STUDENT SUBMISSION TABLE */}
            <div className="flex-1 overflow-x-auto border border-slate-200 rounded-2xl max-h-[52vh] overflow-y-auto bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-2 text-center whitespace-nowrap w-12">STT</th>
                    <th className="py-3 px-3 whitespace-nowrap w-16">MÃ HS</th>
                    <th className="py-3 px-4 whitespace-nowrap">TÊN HỌC SINH</th>
                    {Array.from({ length: detailAssignment?.questions?.length || 5 }).map((_, qIdx) => (
                      <th key={qIdx} className="py-3 px-2 text-center whitespace-nowrap font-black text-slate-700">
                        CÂU {qIdx + 1}
                      </th>
                    ))}
                    <th 
                      onClick={handleToggleAssignmentSortScore}
                      className={`py-3 px-3 text-center whitespace-nowrap select-none cursor-pointer transition-colors ${
                        assignmentSortScoreDirection ? 'bg-indigo-50/80 hover:bg-indigo-100/70' : 'hover:bg-slate-100/70'
                      }`}
                      title={
                        assignmentSortScoreDirection === 'desc'
                          ? 'Đang sắp xếp: Điểm giảm dần (Cao → Thấp). Click để đổi sang Tăng dần.'
                          : assignmentSortScoreDirection === 'asc'
                          ? 'Đang sắp xếp: Điểm tăng dần (Thấp → Cao). Click để về mặc định.'
                          : 'Click để sắp xếp theo Tổng điểm (Giảm dần → Tăng dần → Mặc định)'
                      }
                    >
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <span className={assignmentSortScoreDirection ? 'text-indigo-800 font-black' : 'text-slate-600 font-extrabold'}>
                          TỔNG ĐIỂM
                        </span>
                        {assignmentSortScoreDirection === 'desc' ? (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-indigo-600 text-white font-black text-xs shadow-xs" title="Giảm dần">
                            <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                          </span>
                        ) : assignmentSortScoreDirection === 'asc' ? (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-indigo-600 text-white font-black text-xs shadow-xs" title="Tăng dần">
                            <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors" title="Chưa sắp xếp">
                            <ArrowUpDown className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">AI THÔNG BÁO</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">THỜI GIAN NỘP</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">CHẤM LẠI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedTrackingStudents.map((st, index) => (
                    <tr
                      key={st.code}
                      onClick={() => {
                        setSelectedStudentDetail(st);
                        setRegradeScore(st.totalScore !== '-' ? String(st.totalScore) : '10');
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* STT */}
                      <td className="py-3 px-2 text-center whitespace-nowrap font-bold text-slate-500">
                        {index + 1}
                      </td>

                      {/* Mã HS */}
                      <td className="py-3 px-3 whitespace-nowrap font-extrabold text-fuchsia-700">
                        {st.code}
                      </td>

                      {/* Tên HS */}
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">
                        {st.name}
                      </td>

                      {/* Cột câu hỏi động */}
                      {Array.from({ length: detailAssignment?.questions?.length || 5 }).map((_, qIdx) => {
                        const ans = st.answers[qIdx] || 'none';
                        return (
                          <td key={qIdx} className="py-3 px-2 text-center whitespace-nowrap">
                            {ans === 'pass' && (
                              <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 items-center justify-center text-[10px] font-black">
                                ✓
                              </span>
                            )}
                            {ans === 'fail' && (
                              <span className="inline-flex w-5 h-5 rounded-full bg-rose-100 border border-rose-300 text-rose-700 items-center justify-center text-[10px] font-black">
                                ✗
                              </span>
                            )}
                            {ans === 'none' && (
                              <span className="text-slate-300 font-semibold">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Tổng điểm */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {st.totalScore !== '-' ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-100/90 text-indigo-800 font-black text-xs border border-indigo-200">
                            {st.totalScore}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-semibold">-</span>
                        )}
                      </td>

                      {/* AI Thông báo */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {st.aiStatus === 'pass' ? (
                          <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 items-center justify-center text-[10px] font-black">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300 font-semibold">-</span>
                        )}
                      </td>

                      {/* Thời gian nộp */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {st.status === 'submitted' ? (
                          <span className="text-sky-700 font-bold text-[11px] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-500" />
                            {st.submittedTime}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-600 font-bold text-[10px]">
                            Chờ HS
                          </span>
                        )}
                      </td>

                      {/* Chấm lại */}
                      <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedStudentDetail(st);
                            setRegradeScore(st.totalScore !== '-' ? String(st.totalScore) : '10');
                          }}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center ${
                            st.status === 'submitted'
                              ? 'hover:bg-indigo-100 text-slate-700 hover:text-indigo-700'
                              : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                          }`}
                          title="Chấm lại bài tập"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. MODAL FOOTER */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setDetailAssignment(null)}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              >
                Đóng bảng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CHẤM LẠI BÀI TẬP HỌC SINH CHI TIẾT   */}
      {/* ========================================== */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-y-auto space-y-5 animate-scale-up">
            
            {/* 1. HEADER & SWITCH TOGGLE */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRegradeToggle(!regradeToggle)}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div className={`w-11 h-6 rounded-full p-1 transition-colors ${regradeToggle ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${regradeToggle ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm font-extrabold text-sky-600 font-heading group-hover:text-sky-700 transition-colors">
                    Chấm lại bài tập
                  </span>
                </button>
              </div>

              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. SUB-HEADER NOTE */}
            <div className="text-xs font-semibold text-sky-600">
              Nội dung này do giáo viên tự biên soạn.
            </div>

            {/* 3. LIGHT PINK BANNER (HỒNG NHẠT) */}
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 sm:p-5 space-y-2.5">
              <h4 className="text-base font-black text-rose-900">
                {selectedStudentDetail.name} đã hoàn thành bài tập này!
              </h4>

              <div className="space-y-1 text-xs text-rose-900/90 font-medium">
                <p><strong className="text-rose-950 font-bold">Số câu đúng:</strong> {selectedStudentDetail.answers.filter(a => a === 'pass').length || 5}</p>
                <p><strong className="text-rose-950 font-bold">Tổng số câu hỏi:</strong> 5</p>
                <p><strong className="text-rose-950 font-bold">Điểm bài tập:</strong> <span className="text-rose-600 font-extrabold">{selectedStudentDetail.totalScore !== '-' ? selectedStudentDetail.totalScore : 10}</span></p>
                <p><strong className="text-rose-950 font-bold">Điểm thang 10:</strong> <span className="text-rose-600 font-extrabold">{selectedStudentDetail.totalScore !== '-' ? selectedStudentDetail.totalScore : 10}</span></p>
                <p><strong className="text-rose-950 font-bold">Thời gian làm bài:</strong> 2 phút, 21 giây</p>
                <p><strong className="text-rose-950 font-bold">Thời gian nộp bài:</strong> 2026-08-17T20:51:30.043Z</p>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    showToast(`Đã xoá bài làm của học sinh ${selectedStudentDetail.name}`);
                    setSelectedStudentDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  Xoá bài làm này
                </button>
              </div>
            </div>

            {/* 4. KHỐI BẢNG ĐIỂM & CHI TIẾT CÂU HỎI */}
            <div className="space-y-4">
              <h4 className="text-base font-extrabold text-slate-900 font-heading">
                Bảng điểm
              </h4>

              {/* Bảng điểm tóm tắt dạng ma trận hàng ngang */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-2.5 px-4 text-left bg-slate-50 border-r border-slate-200 font-extrabold text-slate-800">Câu hỏi</th>
                      <th className="py-2.5 px-3 bg-amber-50/80 border-r border-slate-200 font-black text-amber-800">1</th>
                      <th className="py-2.5 px-3 bg-emerald-50/80 border-r border-slate-200 font-black text-emerald-800">2</th>
                      <th className="py-2.5 px-3 bg-amber-50/80 border-r border-slate-200 font-black text-amber-800">3</th>
                      <th className="py-2.5 px-3 bg-indigo-50/80 border-r border-slate-200 font-black text-indigo-800">4</th>
                      <th className="py-2.5 px-3 bg-rose-50/80 font-black text-rose-800">5</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="border-b border-slate-200">
                      <td className="py-2.5 px-4 text-left font-bold text-slate-700 bg-slate-50 border-r border-slate-200">Điểm</td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-800 border-r border-slate-200">2.0</td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-800 border-r border-slate-200">2.0</td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-800 border-r border-slate-200">2.0</td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-800 border-r border-slate-200">2.0</td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-800">2.0</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-left font-bold text-slate-700 bg-slate-50 border-r border-slate-200">Kết quả</td>
                      {[1, 2, 3, 4, 5].map((qIdx) => (
                        <td key={qIdx} className="py-2.5 px-3 border-r last:border-r-0 border-slate-200">
                          <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 items-center justify-center text-[10px] font-black">
                            ✓
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Danh sách 5 câu hỏi hiển thị chi tiết */}
              <div className="space-y-3 pt-1">
                {/* Câu 1 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700 text-xs">Câu 1 (2.0đ):</span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Đúng
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 text-base">
                    Đâu là đối tượng tự nhiên có sẵn trong tự nhiên?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700 pt-1">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">A. Chiếc quạt điện</div>
                    <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-medium flex items-center justify-between">
                      <span>B. Cây xanh</span>
                      <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-medium">Đúng</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">C. Bóng đèn điện</div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">D. Ti vi</div>
                  </div>
                </div>

                {/* Câu 2 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700 text-xs">Câu 2 (2.0đ):</span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Đúng
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 text-base">
                    Đâu là sản phẩm công nghệ do con người làm ra để phục vụ cuộc sống?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700 pt-1">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">A. Hòn đá</div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">B. Dòng sông</div>
                    <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-medium flex items-center justify-between">
                      <span>C. Chiếc ti vi</span>
                      <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-medium">Đúng</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">D. Cây cối</div>
                  </div>
                </div>

                {/* Câu 3 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700 text-xs">Câu 3 (2.0đ):</span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Đúng
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 text-base">
                    Sản phẩm công nghệ nào dưới đây có tác dụng chiếu sáng trong gia đình?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700 pt-1">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">A. Quạt điện</div>
                    <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-medium flex items-center justify-between">
                      <span>B. Đèn bàn học</span>
                      <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-medium">Đúng</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">C. Tủ lạnh</div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">D. Máy thu thanh</div>
                  </div>
                </div>

                {/* Câu 4 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700 text-xs">Câu 4 (2.0đ):</span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Đúng
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 text-base">
                    Sản phẩm công nghệ nào dưới đây dùng để làm mát không gian phòng?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700 pt-1">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">A. Nồi cơm điện</div>
                    <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-medium flex items-center justify-between">
                      <span>B. Quạt điện</span>
                      <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-medium">Đúng</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">C. Ti vi</div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">D. Bếp từ</div>
                  </div>
                </div>

                {/* Câu 5 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700 text-xs">Câu 5 (2.0đ):</span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Đúng
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 text-base">
                    Tủ lạnh trong gia đình có tác dụng chính là gì?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700 pt-1">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">A. Giải trí</div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">B. Chiếu sáng</div>
                    <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-medium flex items-center justify-between">
                      <span>C. Cất giữ và bảo quản thực phẩm</span>
                      <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-medium">Đúng</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white font-normal">D. Làm mát cả phòng</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. KHỐI DUYỆT BÀI TẬP & NHẬN XÉT */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-extrabold text-slate-900 font-heading">
                  Duyệt bài tập
                </h4>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  ✓ Đã chấm & duyệt
                </span>
              </div>

              {/* Thông tin bài rèn luyện & người duyệt */}
              <div className="space-y-1 text-xs text-slate-700 font-medium">
                <p><strong className="text-slate-900">Bài rèn luyện:</strong> <span className="text-indigo-900 font-extrabold">[Rèn luyện] Bài tập: Luyện tập: bài 1: Tự nhiên và công nghệ</span></p>
                <p><strong className="text-slate-900">Người tạo:</strong> {detailAssignment?.teacherName || activeTeacherProfile.name}</p>
                <p><strong className="text-slate-900">Người duyệt:</strong> Hà Thị Trâm</p>
                <p><strong className="text-slate-900">Thời gian duyệt lần cuối:</strong> 18 tháng 8 lúc 03:56</p>
              </div>

              {/* Ô nhập điểm duyệt & trạng thái */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
                    Điểm số bài tập (Thang điểm 10):
                  </label>
                  <input
                    type="text"
                    value={regradeScore}
                    onChange={(e) => setRegradeScore(e.target.value)}
                    className="w-full sm:w-44 p-2.5 text-sm font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 italic mt-1.5 leading-snug">
                    Khi thay đổi điểm số, điểm này sẽ trực tiếp ghi đè lên kết quả AI chấm tự động.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
                    Trạng thái duyệt:
                  </label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Người duyệt cuối cùng: Đặng Văn Hùng
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Hệ thống ghi nhận điểm đã được duyệt thủ công.
                    </div>
                  </div>
                </div>
              </div>

              {/* Soạn thảo nhận xét */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-extrabold text-slate-900">
                  Nhận xét cho bài tập:
                </label>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {/* Toolbar */}
                  <div className="p-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1 text-xs text-slate-600">
                    <button type="button" className="p-1 hover:bg-slate-200 rounded font-mono text-[11px]">«</button>
                    <button type="button" className="p-1 hover:bg-slate-200 rounded font-mono text-[11px]">»</button>
                    <span className="text-slate-300 mx-0.5">|</span>
                    <button type="button" className="px-1.5 py-0.5 hover:bg-slate-200 rounded font-bold">∑</button>
                    <button type="button" className="px-1.5 py-0.5 hover:bg-slate-200 rounded">🖼️</button>
                    <button type="button" className="px-1.5 py-0.5 hover:bg-slate-200 rounded text-[11px] font-medium border border-slate-200 bg-white">☐ Text LaTeX</button>
                    <span className="text-slate-300 mx-0.5">|</span>
                    <select className="px-1.5 py-0.5 hover:bg-slate-200 rounded text-[11px] border border-slate-200 bg-white">
                      <option>Normal</option>
                    </select>
                    <select className="px-1.5 py-0.5 hover:bg-slate-200 rounded text-[11px] border border-slate-200 bg-white">
                      <option>Arial</option>
                    </select>
                    <select className="px-1.5 py-0.5 hover:bg-slate-200 rounded text-[11px] border border-slate-200 bg-white">
                      <option>15 px</option>
                    </select>
                    <span className="text-slate-300 mx-0.5">|</span>
                    <button type="button" className="px-1.5 py-0.5 hover:bg-slate-200 rounded font-black">B</button>
                    <button type="button" className="px-1.5 py-0.5 hover:bg-slate-200 rounded italic font-serif">I</button>
                    <button type="button" className="px-1.5 py-0.5 hover:bg-slate-200 rounded underline">U</button>
                    <button type="button" className="px-1.5 py-0.5 hover:bg-slate-200 rounded">🎨</button>
                    <button type="button" className="px-1.5 py-0.5 hover:bg-slate-200 rounded">🟡</button>
                  </div>

                  {/* Textarea */}
                  <textarea
                    rows={3}
                    value={regradeComment}
                    onChange={(e) => setRegradeComment(e.target.value)}
                    className="w-full p-3 text-xs text-slate-800 bg-white focus:outline-hidden resize-y font-medium"
                    placeholder="Nhập nhận xét..."
                  />
                </div>
              </div>

              {/* Các nút hành động */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      showToast('Đã chuyển bài tập thành Chưa đạt yêu cầu (Cho học sinh làm lại)!');
                      setSelectedStudentDetail(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" /> Chưa đạt yêu cầu (Cho làm lại)
                  </button>

                  <button
                    onClick={() => {
                      showToast('Đã duyệt lại bài tập thành công!');
                      setSelectedStudentDetail(null);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 w-full sm:w-auto active:scale-95"
                  >
                    <Check className="w-4 h-4" /> Duyệt lại
                  </button>
                </div>

                <button
                  onClick={() => setSelectedStudentDetail(null)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer w-full sm:w-auto"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: STUDENT SOLVER FORM               */}
      {/* ========================================== */}
      {solvingAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Góc nhìn Học sinh - Làm bài
                </span>
                <h3 className="text-base font-extrabold text-slate-900 font-heading mt-1">
                  {solvingAssignment.title}
                </h3>
              </div>
              <button
                onClick={() => setSolvingAssignment(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
              <strong>Yêu cầu bài tập:</strong> {solvingAssignment.description}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Bài làm của học sinh ({currentUserName}):
              </label>
              <textarea
                rows={5}
                value={studentContent}
                onChange={(e) => setStudentContent(e.target.value)}
                placeholder="Nhập nội dung bài làm hoặc kết quả câu hỏi vào đây..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSolvingAssignment(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleStudentSubmit}
                disabled={!studentContent.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md cursor-pointer disabled:opacity-50"
              >
                Gửi bài nộp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 4: BẢNG VÀNG VINH DANH & THỐNG KÊ   */}
      {/* ========================================== */}
      {vinhDanhAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white p-5 sm:p-6 relative overflow-hidden flex-shrink-0">
              <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
                <Trophy className="w-48 h-48 text-white" />
              </div>

              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 font-extrabold text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                    Thống kê vinh danh
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-white font-heading tracking-tight flex items-center gap-2">
                    🏆 BẢNG VÀNG VINH DANH & THỐNG KÊ KẾT QUẢ RÈN LUYỆN
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-100 font-medium">
                    Bài tập: <span className="font-bold text-white">{vinhDanhAssignment.title}</span> • {vinhDanhAssignment.targetClass || 'Lớp 3A'}
                  </p>
                </div>

                <button
                  onClick={() => setVinhDanhAssignment(null)}
                  className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-all cursor-pointer flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
              
              {/* 1. KHỐI THỐNG KÊ TỔNG QUAN (4 CARDS) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Card 1 */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500">TỔNG HS ĐÃ NỘP</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black text-slate-900 font-heading">2 / 39 học sinh</div>
                    <div className="text-[11px] font-bold text-indigo-600">Tỷ lệ nộp: 5.1%</div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500">ĐIỂM TRUNG BÌNH</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black text-slate-900 font-heading">7.0 / 10</div>
                    <div className="text-[11px] font-bold text-emerald-600">Phổ điểm tốt</div>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500">ĐIỂM CAO NHẤT</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Trophy className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black text-slate-900 font-heading">10 điểm</div>
                    <div className="text-[11px] font-bold text-amber-700 truncate">Hoàng Bảo An</div>
                  </div>
                </div>

                {/* Card 4 */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500">TỶ LỆ ĐẠT YÊU CẦU</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black text-slate-900 font-heading">100%</div>
                    <div className="text-[11px] font-bold text-rose-600">Đạt từ 5 điểm trở lên</div>
                  </div>
                </div>
              </div>

              {/* 2. BỤC VINH DANH TOP 3 (PODIUM UI) */}
              <div className="bg-gradient-to-b from-amber-50/80 via-orange-50/40 to-white rounded-2xl p-5 border border-amber-200 shadow-xs space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-extrabold text-amber-900 font-heading flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500 animate-bounce" />
                    BỤC VINH DANH HỌC SINH XUẤT SẮC
                  </h3>
                  <p className="text-xs text-amber-700 font-medium">Tuyên dương các học sinh đạt thành tích cao nhất bài rèn luyện</p>
                </div>

                {/* Podium visual */}
                <div className="flex items-end justify-center gap-2 sm:gap-4 pt-6 max-w-lg mx-auto">
                  
                  {/* Rank 2 (Silver) */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="mb-2 text-center">
                      <span className="text-2xl">🥈</span>
                      <div className="font-extrabold text-xs text-slate-800 mt-1">Hà Việt Hoàng</div>
                      <div className="text-[11px] font-bold text-slate-600">4 điểm</div>
                      <div className="text-[10px] text-slate-400">⏱️ 3p 15s</div>
                    </div>
                    <div className="w-full h-28 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 rounded-t-2xl shadow-md border-t-2 border-slate-200 flex flex-col items-center justify-center text-white">
                      <span className="text-2xl font-black">2</span>
                      <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">HẠNG NHÌ</span>
                    </div>
                  </div>

                  {/* Rank 1 (Gold) */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="mb-2 text-center">
                      <div className="inline-block relative">
                        <Crown className="w-6 h-6 text-yellow-500 absolute -top-5 left-1/2 -translate-x-1/2 drop-shadow-md animate-pulse" />
                        <span className="text-3xl">🥇</span>
                      </div>
                      <div className="font-black text-sm text-amber-900 mt-1">Hoàng Bảo An</div>
                      <div className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">10 điểm</div>
                      <div className="text-[10px] text-amber-700 font-semibold mt-0.5">⏱️ 2p 21s</div>
                    </div>
                    <div className="w-full h-36 bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 rounded-t-2xl shadow-xl border-t-2 border-yellow-200 flex flex-col items-center justify-center text-white">
                      <Trophy className="w-6 h-6 text-yellow-100 mb-1" />
                      <span className="text-3xl font-black">1</span>
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-yellow-100">QUÁN QUÂN</span>
                    </div>
                  </div>

                  {/* Rank 3 (Bronze) */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="mb-2 text-center">
                      <span className="text-2xl">🥉</span>
                      <div className="font-extrabold text-xs text-amber-900 mt-1">(Đang cập nhật)</div>
                      <div className="text-[11px] font-bold text-slate-500">--</div>
                    </div>
                    <div className="w-full h-20 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 rounded-t-2xl shadow-xs border-t-2 border-amber-600 flex flex-col items-center justify-center text-amber-100">
                      <span className="text-xl font-black">3</span>
                      <span className="text-[9px] font-bold tracking-wider uppercase opacity-80">HẠNG BA</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* 3. BẢNG DANH SÁCH XẾP HẠNG CHI TIẾT TOÀN LỚP */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Bảng danh sách xếp hạng chi tiết toàn lớp ({CLASS_3A_STUDENTS.length} học sinh)
                  </h4>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                    Sắp xếp theo Điểm & Thời gian
                  </span>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 text-center w-12">HẠNG</th>
                        <th className="py-2.5 px-3 w-16">MÃ HS</th>
                        <th className="py-2.5 px-4">HỌ VÀ TÊN</th>
                        <th className="py-2.5 px-3 text-center">ĐIỂM SỐ</th>
                        <th className="py-2.5 px-3 text-center">THỜI GIAN LÀM</th>
                        <th className="py-2.5 px-4 text-center">DANH HIỆU / HUY HIỆU</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {CLASS_3A_STUDENTS.map((st, idx) => {
                        let bgClass = 'hover:bg-slate-50';
                        let badgeTitle = '⏳ Chưa nộp bài';
                        let badgeColor = 'bg-slate-100 text-slate-500 border-slate-200';

                        if (st.code === '3a1') {
                          bgClass = 'bg-amber-50/60 hover:bg-amber-50 font-bold';
                          badgeTitle = '🌟 Xuất sắc tuyệt đối';
                          badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                        } else if (st.code === '3a10') {
                          bgClass = 'bg-slate-50/80 hover:bg-slate-100';
                          badgeTitle = '⚡ Cần cố gắng thêm';
                          badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                        }

                        return (
                          <tr key={st.code} className={`transition-colors ${bgClass}`}>
                            {/* Hạng */}
                            <td className="py-2.5 px-3 text-center font-black">
                              {idx === 0 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-white font-black text-xs shadow-xs">
                                  1
                                </span>
                              ) : idx === 1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-white font-black text-xs shadow-xs">
                                  2
                                </span>
                              ) : idx === 2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs shadow-xs">
                                  3
                                </span>
                              ) : (
                                <span className="text-slate-500 font-bold">{idx + 1}</span>
                              )}
                            </td>

                            {/* Mã HS */}
                            <td className="py-2.5 px-3 font-extrabold text-fuchsia-700">
                              {st.code}
                            </td>

                            {/* Họ tên */}
                            <td className="py-2.5 px-4 font-extrabold text-slate-800">
                              {st.name}
                            </td>

                            {/* Điểm số */}
                            <td className="py-2.5 px-3 text-center">
                              {st.totalScore !== '-' ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full font-black text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  {st.totalScore} / 10
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">--</span>
                              )}
                            </td>

                            {/* Thời gian làm */}
                            <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                              {st.code === '3a1' ? '2 phút 21 giây' : st.code === '3a10' ? '3 phút 15 giây' : '--'}
                            </td>

                            {/* Danh hiệu */}
                            <td className="py-2.5 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeColor}`}>
                                {badgeTitle}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  showToast('✅ Đã tải xuống file Bảng vàng vinh danh Lớp 3A (PDF/Ảnh) thành công!');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 w-full sm:w-auto active:scale-95"
              >
                <Download className="w-4 h-4" /> Xuất Bảng Vinh Danh (PDF/Ảnh)
              </button>

              <button
                onClick={() => setVinhDanhAssignment(null)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer w-full sm:w-auto"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}


      {/* MODAL: CẤU HÌNH GIAO BÀI TẬP */}
      {assigningConfigAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/20">
                  🚀
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white font-heading tracking-wide">
                    Cấu Hình Giao Bài Tập
                  </h3>
                  <p className="text-xs text-indigo-200 font-medium">
                    {assigningConfigAssignment.grade || 'Khối 3'} • Môn {assigningConfigAssignment.subject || 'Công nghệ'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningConfigAssignment(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* 1. Tiêu đề bài giao */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  Tiêu đề bài giao
                </label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="Nhập tiêu đề bài tập..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50/50"
                />
              </div>

              {/* 2. Chọn lớp giao bài (Thuộc khối đã chọn khi tạo ra bài tập) */}
              {(() => {
                const currentGradeClasses = getClassesForGrade(assigningConfigAssignment.grade);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <span>Chọn lớp giao bài ({assigningConfigAssignment.grade || 'Khối 3'})</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedAssignClasses.length === currentGradeClasses.length) {
                            setSelectedAssignClasses([]);
                          } else {
                            setSelectedAssignClasses([...currentGradeClasses]);
                          }
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {selectedAssignClasses.length === currentGradeClasses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả các lớp'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      {currentGradeClasses.map((clsName) => {
                        const isChecked = selectedAssignClasses.includes(clsName);
                        return (
                          <label
                            key={clsName}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssignClasses([...selectedAssignClasses, clsName]);
                                } else {
                                  setSelectedAssignClasses(selectedAssignClasses.filter((c) => c !== clsName));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span>{clsName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 3 & 4. Lên lịch giao bài & Đặt hạn làm bài */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Lên lịch giao bài</span>
                  </label>
                  <DateTimePicker
                    value={assignStartDate}
                    onChange={setAssignStartDate}
                    placeholder="MM/DD/YYYY hh:mm A"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">Thời điểm bài tập bắt đầu hiển thị cho học sinh</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Đặt hạn làm bài</span>
                  </label>
                  <DateTimePicker
                    value={assignDueDate}
                    onChange={setAssignDueDate}
                    placeholder="MM/DD/YYYY hh:mm A"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">Thời điểm hết hạn nộp bài rèn luyện</p>
                </div>
              </div>

              {/* 5. Quy Chế Luyện Tập & Tráo Đề */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 space-y-3">
                <div className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-indigo-600" />
                  <span>Quy Chế Luyện Tập & Tráo Đề</span>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Số lần làm bài tối đa */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Số lần làm bài tối đa
                    </label>
                    <select
                      value={assignMaxAttempts}
                      onChange={(e) => setAssignMaxAttempts(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Không giới hạn số lần luyện tập">Không giới hạn số lần luyện tập</option>
                      <option value="1 lần">1 lần</option>
                      <option value="2 lần">2 lần</option>
                      <option value="3 lần">3 lần</option>
                      <option value="5 lần">5 lần</option>
                      <option value="10 lần">10 lần</option>
                    </select>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                      <input
                        type="checkbox"
                        checked={assignShuffleQuestions}
                        onChange={(e) => setAssignShuffleQuestions(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer mt-0.5"
                      />
                      <div>
                        <span>Tráo đổi thứ tự câu hỏi</span>
                        <p className="text-[11px] text-slate-500 font-normal">Xáo trộn câu hỏi tự động đối với mỗi lượt làm bài của học sinh</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                      <input
                        type="checkbox"
                        checked={assignShuffleOptions}
                        onChange={(e) => setAssignShuffleOptions(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer mt-0.5"
                      />
                      <div>
                        <span>Tráo đổi thứ tự phương án chọn</span>
                        <p className="text-[11px] text-slate-500 font-normal">Xáo trộn thứ tự các đáp án A, B, C, D ngẫu nhiên</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 6. Giao bài cho */}
              <div className="space-y-2.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Giao bài cho</span>
                </label>

                <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="assignTargetType"
                      value="all"
                      checked={assignTargetType === 'all'}
                      onChange={() => setAssignTargetType('all')}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Cả lớp ({selectedAssignClasses.join(', ')})</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="assignTargetType"
                      value="specific"
                      checked={assignTargetType === 'specific'}
                      onChange={() => setAssignTargetType('specific')}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Từng thành viên</span>
                  </label>
                </div>

                {assignTargetType === 'specific' && (
                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Danh sách học sinh nhận bài ({selectedStudentIds.length}/{CLASS_3A_STUDENTS.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStudentIds.length === CLASS_3A_STUDENTS.length) {
                            setSelectedStudentIds([]);
                          } else {
                            setSelectedStudentIds(CLASS_3A_STUDENTS.map(s => s.code));
                          }
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {selectedStudentIds.length === CLASS_3A_STUDENTS.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả học sinh'}
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                      {CLASS_3A_STUDENTS.map((st) => {
                        const isSelected = selectedStudentIds.includes(st.code);
                        return (
                          <label
                            key={st.code}
                            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIds([...selectedStudentIds, st.code]);
                                } else {
                                  setSelectedStudentIds(selectedStudentIds.filter(id => id !== st.code));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="truncate">{st.name} ({st.code.toUpperCase()})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssigningConfigAssignment(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignConfig}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Xác nhận Giao Bài</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        onConfirm={() => {
          if (deletingAssignment) {
            if (!isAssignmentOwner(deletingAssignment)) {
              showToast('⚠️ Bạn không có quyền xóa nội dung này!');
              setDeletingAssignment(null);
              return;
            }
            if (onDeleteAssignment) onDeleteAssignment(deletingAssignment.id);
            showToast(`🗑️ Đã xóa bài tập "${deletingAssignment.title}" khỏi danh sách!`);
            setDeletingAssignment(null);
          }
        }}
        title="Xác nhận xóa bài tập rèn luyện"
        itemType="bài tập rèn luyện"
        itemName={deletingAssignment?.title}
      />
    </div>
  );
};
