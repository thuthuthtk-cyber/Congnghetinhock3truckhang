import { SUBJECTS, GRADES, CLASSES_BY_GRADE, ALL_CLASSES, EXAM_TYPES, QUESTION_TYPES, getQuestionTypeLabel } from '../../lib/constants';
import { getSubjectColorStyles } from '../../utils/subjectColors';
import { getTeachersFromLocalStorage, resolveCurrentTeacherProfile } from '../../services/teacherStorageService';
import { getStudentsFromLocalStorage, getDefault5BRoster } from '../../services/studentStorageService';
import { auth } from '../../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { uploadToCloudinary } from '../../lib/cloudinary';
import {
  FileCheck2,
  Sparkles,
  Plus,
  Shuffle,
  Download,
  Printer,
  Trash2,
  Eye,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Layers,
  Zap,
  ArrowLeft,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Calendar,
  UserPlus,
  Copy,
  RotateCcw,
  BarChart2,
  Edit3,
  Share2,
  CheckSquare,
  Settings,
  Tag,
  Check,
  X,
  School,
  Clock,
  Rocket,
  Users,
  BookOpen,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  ToggleRight,
  Save,
  SaveAll,
  Image as ImageIcon,
  FileQuestion, Upload, Volume2, Database
} from 'lucide-react';
import { ExamPaper, QuestionItem, UserRole } from '../../types';
import { generateExamQuestionsAI } from '../../services/geminiService';
import { exportExamToExcel, downloadExamMatrixTemplate } from '../../services/excelService';
import { ManualQuestionBankModal } from './ManualQuestionBankModal';
import { UseQuestionBankModal } from './UseQuestionBankModal';

import { DateTimePicker } from '../common/DateTimePicker';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { getLocalCachedQuestions, QUESTIONS_CACHE_KEY, saveQuestionsBatchToFirestore } from '../../services/questionStorageService';
import { useScoreSort } from '../../lib/useScoreSort';
import { ExamQuestionEditorCard, normalizeQuestionType } from './ExamQuestionEditorCard';

export interface TrackingSubmissionStudent {
  id: string;
  name: string;
  badge?: string;
  answers: ('pass' | 'fail' | 'none')[];
  totalScore: number | null;
  attempts: number | null;
  submittedTime: string;
  status: 'submitted' | 'waiting';
  aiNote?: string;
  needManual?: boolean;
}

export const TRACKING_STUDENTS_LIST: TrackingSubmissionStudent[] = [
  { id: '3a1', name: 'Hoàng Bảo An', badge: 'Cần chú ý', answers: ['fail', 'fail', 'fail', 'pass', 'fail', 'pass', 'fail', 'pass', 'pass'], totalScore: 4, attempts: 1, submittedTime: '10 phút', status: 'submitted', aiNote: 'AI từ chối: Đã chấm lại hàng loạt thành công trên dữ liệu mới nhất.', needManual: true },
  { id: '3a11', name: 'Ngô Nhật Hưng', badge: 'Cần chú ý', answers: ['pass', 'pass', 'fail', 'pass', 'fail', 'pass', 'pass', 'fail', 'pass'], totalScore: 6, attempts: 1, submittedTime: '10 phút', status: 'submitted', aiNote: 'AI từ chối: Đã chấm lại hàng loạt thành công trên dữ liệu mới nhất.', needManual: true },
  { id: '3a2', name: 'Trần Bảo An', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a3', name: 'Nguyễn Nguyên Anh', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a4', name: 'Nguyễn Quốc Bảo', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a5', name: 'Tống Thị Quỳnh Chi', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a6', name: 'Vũ Ngọc Diệp', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a7', name: 'Mai Hải Đăng', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a8', name: 'Nguyễn Minh Đức', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a9', name: 'Hà Ngọc Hoa', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a10', name: 'Hà Việt Hoàng', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a12', name: 'Nguyễn Bảo Khánh', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a13', name: 'Hoàng Tuấn Kiệt', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a14', name: 'Đỗ Diệu Linh', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a15', name: 'Phan Tú Linh', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a16', name: 'Hà Bảo Long', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a17', name: 'Hà Bảo Nam', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a18', name: 'Hà Duy Nam', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a19', name: 'Dương Bảo Ngân', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a20', name: 'Nguyễn Trung Nghĩa', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a21', name: 'Đào Thị Bích Ngọc', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a22', name: 'Phan Vũ Khánh Ngọc', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a23', name: 'Nguyễn Bình Nguyên', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a24', name: 'Đoàn Yến Nhi', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a25', name: 'Nguyễn Quỳnh Như', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a26', name: 'Lê Hải Phong', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a27', name: 'Hà Đại Phú', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a28', name: 'Đồng Xuân Phúc', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a29', name: 'Vũ Huy Thái', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a30', name: 'Hoàng Mai Phương Thảo', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a31', name: 'Hà Đình Tiến', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a32', name: 'Hoàng Khánh Trang', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a33', name: 'Vũ Hà Trang', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a34', name: 'Đoàn Minh Tú', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a35', name: 'Hà Phạm Hiền Tuệ', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a36', name: 'Đoàn Duy Tùng', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a37', name: 'Hà Thanh Tùng', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a38', name: 'Hà Hồng Vui', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' },
  { id: '3a39', name: 'Hà Thị Khánh Vy', answers: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'], totalScore: null, attempts: null, submittedTime: 'CHỜ HỌC SINH', status: 'waiting' }
];

interface ExamManagementModuleProps {
  exams: ExamPaper[];
  questionsBank: QuestionItem[];
  onSaveExam: (exam: ExamPaper) => void;
  onDeleteExam: (id: string) => void;
  userRole: UserRole;
}

export const ExamManagementModule: React.FC<ExamManagementModuleProps> = ({
  exams,
  questionsBank,
  onSaveExam,
  onDeleteExam,
  userRole
}) => {
  const authEmail = (typeof window !== 'undefined' ? (auth?.currentUser?.email || localStorage.getItem('eduplay_teacher_email')) : null);
  const activeTeacherProfile = useMemo(() => resolveCurrentTeacherProfile(authEmail), [authEmail]);
  const isAdmin = userRole === 'admin' || activeTeacherProfile.userRole === 'admin' || (activeTeacherProfile.role || '').toLowerCase().includes('admin');

  const isExamOwner = useCallback((exam: ExamPaper): boolean => {
    if (isAdmin) return true;
    const currentId = activeTeacherProfile.id; // e.g. 'gv-06', 'gv-12'
    if (exam.teacherId && exam.teacherId === currentId) return true;
    if (exam.createdBy && exam.createdBy === currentId) return true;
    return false;
  }, [isAdmin, activeTeacherProfile.id]);

  const [activeTab, setActiveTab] = useState<'list' | 'ai_creator' | 'matrix_builder' | 'viewer' | 'solver'>('list');
  const [selectedExam, setSelectedExam] = useState<ExamPaper | null>(null);

  // Filters and Pagination State
  const [filterGrade, setFilterGrade] = useState('Tất cả các khối');
  const [filterClass, setFilterClass] = useState('Tất cả các lớp');
  const [filterSubject, setFilterSubject] = useState('Tất cả các môn');
  const [filterType, setFilterType] = useState('Tất cả loại');
  const [filterTeacher, setFilterTeacher] = useState('Tất cả giáo viên');
  const [filterDuration, setFilterDuration] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tất cả trạng thái');
  const [resourceTab, setResourceTab] = useState<'all' | 'my' | 'colleague'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [deletingExam, setDeletingExam] = useState<ExamPaper | null>(null);
  const [isManualExamModalOpen, setIsManualExamModalOpen] = useState(false);
  const [isBankExamModalOpen, setIsBankExamModalOpen] = useState(false);

  const handleCreateExamFromBank = (examData: {
    title: string;
    subject: string;
    grade: string;
    targetClasses: string[];
    questions: QuestionItem[];
    examType?: string;
    durationMinutes?: number;
    maxAttempts?: string;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    dueDate?: string;
  }) => {
    const questionsList = examData.questions || [];
    const nhanBietCount = questionsList.filter(q => q.level === 'nhan_biet' || (q.level as any) === 'Nhận biết').length;
    const thongHieuCount = questionsList.filter(q => q.level === 'thong_hieu' || (q.level as any) === 'Thông hiểu').length;
    const vanDungCount = questionsList.filter(q => q.level === 'van_dung' || (q.level as any) === 'Vận dụng').length;
    const vanDungCaoCount = questionsList.filter(q => q.level === 'van_dung_cao' || (q.level as any) === 'Vận dụng cao').length;

    const clonedQuestions = questionsList.map(q => ({
      ...q,
      id: `q-ex-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    }));

    const rootId = `ex-${Date.now()}`;
    const rawClasses = (examData.targetClasses && examData.targetClasses.length > 0)
      ? examData.targetClasses
      : [''];
    const uniqueClasses = Array.from(new Set(rawClasses.map(c => c.trim())));
    const classesToAssign = uniqueClasses.length > 0 ? uniqueClasses : [''];

    try {
      // Tạo bản ghi độc lập cho từng lớp (1 đề - N lần giao)
      classesToAssign.forEach((cls) => {
        const cleanClsKey = cls ? cls.toLowerCase().replace(/[^a-z0-9]/g, '') : 'all';
        const examId = classesToAssign.length === 1 && !cls
          ? rootId
          : `${rootId}-class-${cleanClsKey}`;

        const newExam: ExamPaper = {
          id: examId,
          originalExamId: rootId,
          title: examData.title || `Đề kiểm tra ${examData.subject} (${new Date().toLocaleDateString('vi-VN')})`,
          subject: examData.subject || 'Toán',
          grade: examData.grade || 'Khối 3',
          durationMinutes: Number(examData.durationMinutes) || 45,
          examType: examData.examType || 'Thường xuyên',
          targetClass: cls,
          matrix: {
            nhanBiet: nhanBietCount,
            thongHieu: thongHieuCount,
            vanDung: vanDungCount,
            vanDungCao: vanDungCaoCount,
          },
          questions: clonedQuestions,
          teacherId: activeTeacherProfile.id,
          teacherName: activeTeacherProfile.name,
          teacherEmail: activeTeacherProfile.email,
          createdBy: activeTeacherProfile.id,
          authorName: activeTeacherProfile.name,
          createdAt: new Date().toLocaleDateString('vi-VN'),
          isShuffled: Boolean(examData.shuffleQuestions),
          status: 'published',
          authorType: 'my',
          submissionsCount: 0,
          totalStudents: 35,
        };
        onSaveExam(newExam);
      });

      setSelectedExam(null);
      setActiveTab('list');
      setIsBankExamModalOpen(false);
      showToast(
        classesToAssign.filter(Boolean).length > 1
          ? `Đã lưu thành công dữ liệu đề thi cho ${classesToAssign.length} lớp riêng biệt!`
          : "Đã lưu thành công dữ liệu đề thi!",
        "success"
      );
    } catch (err) {
      showToast("Lưu thất bại, vui lòng kiểm tra lại!", "error");
    }
  };

  const handleSaveManualExam = (
    questions: QuestionItem[], 
    saveToGlobal: boolean,
    meta?: {
      examType: string;
      durationMinutes: number;
      lessonName: string;
      grade: string;
      subject: string;
    }
  ) => {
    const nhanBietCount = questions.filter(q => q.level === 'nhan_biet' || (q.level as any) === 'Nhận biết').length;
    const thongHieuCount = questions.filter(q => q.level === 'thong_hieu' || (q.level as any) === 'Thông hiểu').length;
    const vanDungCount = questions.filter(q => q.level === 'van_dung' || (q.level as any) === 'Vận dụng').length;
    const vanDungCaoCount = questions.filter(q => q.level === 'van_dung_cao' || (q.level as any) === 'Vận dụng cao').length;

    const newExam: ExamPaper = {
      id: `ex-${Date.now()}`,
      title: meta?.lessonName ? `Đề kiểm tra: ${meta.lessonName}` : `Đề kiểm tra thủ công (${new Date().toLocaleDateString('vi-VN')})`,
      subject: meta?.subject || questions[0]?.subject || 'Toán',
      grade: meta?.grade || questions[0]?.grade || 'Khối 3',
      durationMinutes: Number(meta?.durationMinutes) || 45,
      examType: meta?.examType || 'Thường xuyên',
      matrix: { nhanBiet: nhanBietCount, thongHieu: thongHieuCount, vanDung: vanDungCount, vanDungCao: vanDungCaoCount },
      questions: questions,
      teacherId: activeTeacherProfile.id,
      teacherName: activeTeacherProfile.name,
      teacherEmail: activeTeacherProfile.email,
      createdBy: activeTeacherProfile.id,
      authorName: activeTeacherProfile.name,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      isShuffled: false,
      status: 'published',
      submissionsCount: 0,
      totalStudents: 35,
      authorType: 'my',
    };
    try {
      onSaveExam(newExam);
      setSelectedExam(null);
      setActiveTab('list');
      setIsManualExamModalOpen(false);
      if (saveToGlobal) {
        const existing = getLocalCachedQuestions();
        const updated = [...existing, ...questions];
        localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(updated));
        saveQuestionsBatchToFirestore(questions).catch(console.error);
      }
      showToast("Đã lưu thành công dữ liệu đề thi thủ công!", "success");
    } catch (err) {
      showToast("Lưu thất bại, vui lòng kiểm tra lại!", "error");
    }
  };
  const [teachersList, setTeachersList] = useState<string[]>([]);

  useEffect(() => {
    const teachers = getTeachersFromLocalStorage();
    const names = teachers.map(t => t.name).filter(Boolean);
    setTeachersList(Array.from(new Set(names)));

    const handleTeachersUpdate = (e: any) => {
      if (e.detail && e.detail.teachers) {
        const updatedNames = (e.detail.teachers as any[]).map(t => t.name).filter(Boolean);
        setTeachersList(Array.from(new Set(updatedNames)));
      }
    };
    window.addEventListener('eduplay_teachers_updated', handleTeachersUpdate as EventListener);
    return () => {
      window.removeEventListener('eduplay_teachers_updated', handleTeachersUpdate as EventListener);
    };
  }, []);

  // Real-time Firestore Classes State
  interface SchoolClassItem {
    id: string;
    name: string;
    grade: string;
  }
  const [realClasses, setRealClasses] = useState<SchoolClassItem[]>([]);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(collection(db, 'classes'), (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, SchoolClassItem>();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const rawId = docSnap.id || data.id || '';
            const rawName = (data.name || data.className || rawId || '').trim();
            const cleanName = rawName.startsWith('Lớp ') ? rawName : `Lớp ${rawName}`;
            const key = cleanName.replace(/^Lớp\s*/i, '').trim().toUpperCase();
            if (!map.has(key)) {
              map.set(key, {
                id: key,
                name: cleanName,
                grade: (data.grade || '').trim()
              });
            }
          });
          const list = Array.from(map.values());
          list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
          setRealClasses(list);
        }
      }, (err) => {
        console.warn('Error subscribing to classes in ExamManagementModule:', err);
      });
    } catch (err) {
      console.warn('Error fetching classes in ExamManagementModule:', err);
    }
    return () => unsubscribe();
  }, []);

  // Assignment Modal State
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentExam, setAssignmentExam] = useState<ExamPaper | null>(null);
  const [assignmentTab, setAssignmentTab] = useState<'select_class' | 'settings'>('select_class');
  const [assignmentType, setAssignmentType] = useState('Thường xuyên');
  const [assignmentClasses, setAssignmentClasses] = useState<string[]>([]);
  const [assignmentDuration, setAssignmentDuration] = useState(15);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentSchedule, setAssignmentSchedule] = useState(true);
  const [assignmentScheduleDate, setAssignmentScheduleDate] = useState('09/03/2026 12:45 PM');
  const [assignmentDeadline, setAssignmentDeadline] = useState(true);
  const [assignmentDeadlineDate, setAssignmentDeadlineDate] = useState('09/10/2026 12:45 PM');
  const [assignmentAdvanced, setAssignmentAdvanced] = useState(true);
  const [assignmentOpenTime, setAssignmentOpenTime] = useState('09/03/2026 12:45 PM');
  const [assignmentAllowRetry, setAssignmentAllowRetry] = useState(false);
  const [assignmentRetryLimit, setAssignmentRetryLimit] = useState(0);
  const [assignmentShuffleQuestions, setAssignmentShuffleQuestions] = useState(false);
  const [assignmentShuffleAnswers, setAssignmentShuffleAnswers] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState('Cả lớp');

  // Filter available classes strictly by exam grade (e.g. "Khối 5" -> "Lớp 5C", "Lớp 5D")
  const availableClasses = useMemo(() => {
    if (realClasses.length === 0) return [];

    if (!assignmentExam || !assignmentExam.grade) {
      return realClasses.map(c => c.name);
    }

    const examGradeMatch = assignmentExam.grade.match(/\d+/);
    const examGradeNum = examGradeMatch ? examGradeMatch[0] : '';

    if (!examGradeNum) {
      return realClasses.map(c => c.name);
    }

    const filtered = realClasses.filter(c => {
      const classGradeMatch = c.grade.match(/\d+/);
      const classNameMatch = c.name.match(/\d+/);
      const classGradeNum = classGradeMatch ? classGradeMatch[0] : (classNameMatch ? classNameMatch[0] : '');
      return classGradeNum === examGradeNum;
    });

    if (filtered.length > 0) {
      return filtered.map(c => c.name);
    }

    return realClasses.map(c => c.name);
  }, [realClasses, assignmentExam]);

  const handleOpenAssignmentModal = (exam: ExamPaper) => {
    setAssignmentExam(exam);
    setAssignmentTitle(exam.title);
    setAssignmentDuration(exam.durationMinutes);
    setAssignmentTab('select_class');

    // Filter matching classes for this exam
    const examGradeMatch = (exam.grade || '').match(/\d+/);
    const examGradeNum = examGradeMatch ? examGradeMatch[0] : '';
    
    const matchedClasses = realClasses
      .filter(c => {
        if (!examGradeNum) return true;
        const classGradeMatch = c.grade.match(/\d+/);
        const classNameMatch = c.name.match(/\d+/);
        const classGradeNum = classGradeMatch ? classGradeMatch[0] : (classNameMatch ? classNameMatch[0] : '');
        return classGradeNum === examGradeNum;
      })
      .map(c => c.name);

    // Parse existing assigned classes for this exam
    const existingClasses = exam.targetClass
      ? exam.targetClass.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    setAssignmentClasses(existingClasses);
    setIsAssignmentModalOpen(true);
    setOpenActionMenuId(null);
  };

  const isSubmittingAssignmentRef = React.useRef(false);

  const handleConfirmAssignment = () => {
    if (!assignmentExam || isSubmittingAssignmentRef.current) return;

    const uniqueClasses = Array.from(new Set(assignmentClasses.map(c => c.trim()).filter(Boolean)));
    if (uniqueClasses.length === 0) {
      showToast('⚠️ Vui lòng chọn ít nhất 1 lớp học để giao đề!', 'error');
      return;
    }

    isSubmittingAssignmentRef.current = true;
    const rootExamId = assignmentExam.originalExamId || assignmentExam.id.replace(/-class-.*$/, '');

    try {
      // Tách mỗi lớp được chọn thành 1 bản ghi giao đề độc lập (Mô hình 1 đề - N lần giao)
      uniqueClasses.forEach((cls, idx) => {
        // Nếu bản ghi hiện tại chưa gán lớp hoặc trùng với lớp đầu tiên, cập nhật bản ghi hiện tại
        // Các lớp còn lại được tạo bản ghi độc lập với ID riêng
        const isCurrentSlot = idx === 0 && (!assignmentExam.targetClass || assignmentExam.targetClass === cls);
        const examId = isCurrentSlot
          ? assignmentExam.id
          : `${rootExamId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        const classSpecificExam: ExamPaper = {
          ...assignmentExam,
          id: examId,
          originalExamId: rootExamId,
          title: assignmentTitle.trim() || assignmentExam.title,
          durationMinutes: Number(assignmentDuration) || assignmentExam.durationMinutes || 45,
          examType: assignmentType || assignmentExam.examType || 'Thường xuyên',
          targetClass: cls,
          status: 'published',
          assignmentDate: new Date().toLocaleDateString('vi-VN'),
          submissionsCount: assignmentExam.targetClass === cls ? (assignmentExam.submissionsCount || 0) : 0,
          totalStudents: 35,
        };

        onSaveExam(classSpecificExam);
      });

      showToast(`🚀 Đã giao đề "${assignmentTitle || assignmentExam.title}" thành công cho ${uniqueClasses.length} lớp riêng biệt (${uniqueClasses.join(', ')})!`, 'success');
      handleCloseAssignmentModal();
    } catch (err) {
      showToast('Giao đề thất bại, vui lòng thử lại!', 'error');
    } finally {
      isSubmittingAssignmentRef.current = false;
    }
  };

  const handleCloseAssignmentModal = () => {
    setIsAssignmentModalOpen(false);
    setAssignmentExam(null);
  };



  // Regrading Modal State
  const [regradingExam, setRegradingExam] = useState<ExamPaper | null>(null);
  const [regradingState, setRegradingState] = useState<'confirm' | 'progress'>('confirm');
  const [regradingStats, setRegradingStats] = useState({
    totalSubmissions: 0,
    processed: 0,
    success: 0,
    failed: 0
  });

  // Tracking Modal State
  const [trackingExam, setTrackingExam] = useState<ExamPaper | null>(null);
  const [trackingFilter, setTrackingFilter] = useState<'all' | 'need_manual'>('all');
  const [trackingActionMenuId, setTrackingActionMenuId] = useState<string | null>(null);

  // Dynamic tracking students derived from trackingExam.submissions and class roster matching trackingExam.id
  const trackingStudentsList = useMemo(() => {
    if (!trackingExam) return [];

    console.log("Current Exam ID querying for tracking:", trackingExam.id);

    const targetClassName = trackingExam.targetClass || 'Lớp 3C';
    const classStudentsRoster = getStudentsFromLocalStorage(targetClassName) || getDefault5BRoster();
    const subMap = new Map<string, any>();

    (trackingExam.submissions || []).forEach(sub => {
      const key = (sub.studentId || sub.studentName || '').trim().toLowerCase();
      if (key) subMap.set(key, sub);
    });

    const questionCount = trackingExam.questions?.length || 5;

    return classStudentsRoster.map((st, idx) => {
      const studentKeyId = (st.id || '').trim().toLowerCase();
      const studentKeyName = (st.name || st.fullName || '').trim().toLowerCase();
      const submission = subMap.get(studentKeyId) || subMap.get(studentKeyName);

      if (submission) {
        const score = submission.score !== undefined ? submission.score : null;
        const isPassed = typeof score === 'number' && score >= 5;
        const answers = Array.from({ length: questionCount }).map((_, qi) => (qi < Math.floor(questionCount * 0.8) ? ('pass' as const) : ('fail' as const)));
        return {
          id: st.code || `3a${idx + 1}`,
          name: st.name || st.fullName || `Học sinh ${idx + 1}`,
          badge: score !== null && score < 5 ? 'Cần chú ý' : undefined,
          answers,
          totalScore: score,
          attempts: submission.attempts || 1,
          submittedTime: submission.submittedAt || '10 phút',
          status: 'submitted' as const,
          aiNote: submission.feedback || 'Đã chấm điểm thành công trên hệ thống.',
          needManual: score !== null && score < 5
        };
      } else {
        return {
          id: st.code || `3a${idx + 1}`,
          name: st.name || st.fullName || `Học sinh ${idx + 1}`,
          answers: Array.from({ length: questionCount }).map(() => 'none' as const),
          totalScore: null,
          attempts: null,
          submittedTime: 'CHỜ HỌC SINH',
          status: 'waiting' as const
        };
      }
    });
  }, [trackingExam]);

  const filteredTrackingSubmissions = useMemo(() => {
    if (trackingFilter === 'need_manual') {
      return trackingStudentsList.filter(st => st.needManual);
    }
    return trackingStudentsList;
  }, [trackingStudentsList, trackingFilter]);

  const getExamScoreInfo = useCallback((st: TrackingSubmissionStudent) => ({
    isSubmitted: st.status === 'submitted',
    score: st.totalScore !== null && !isNaN(Number(st.totalScore)) ? Number(st.totalScore) : null
  }), []);

  const {
    sortScoreDirection,
    setSortScoreDirection,
    handleToggleSortScore,
    sortedItems: sortedTrackingSubmissions
  } = useScoreSort(filteredTrackingSubmissions, getExamScoreInfo);
  const [statsExam, setStatsExam] = useState<ExamPaper | null>(null);
  const [statsTab, setStatsTab] = useState<'performance' | 'details' | 'questions'>('performance');
  const [viewingQuestion, setViewingQuestion] = useState<number | null>(null);
  const [gradingStudent, setGradingStudent] = useState<any>(null);
  const [retakeStudent, setRetakeStudent] = useState<{id: string, name: string} | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<{id: string, name: string} | null>(null);
  const [editingExam, setEditingExam] = useState<ExamPaper | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editExamType, setEditExamType] = useState('Thường xuyên');
  const [editDurationMinutes, setEditDurationMinutes] = useState(45);
  const [editTargetClass, setEditTargetClass] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editStatus, setEditStatus] = useState<'published' | 'draft'>('published');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const [editedQuestions, setEditedQuestions] = useState<QuestionItem[]>([]);
  const [editingExamTab, setEditingExamTab] = useState<'config' | 'questions' | 'preview'>('questions');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [hideMediaPreview, setHideMediaPreview] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPrompt, setMediaPrompt] = useState('');
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const secureUrl = await uploadToCloudinary(file, 'auto');
        setMediaUrl(secureUrl);
        showToast('✅ Tải lên Cloudinary thành công!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Không thể tải lên Cloudinary.', 'error');
      }
    }
  };

  useEffect(() => {
    if (editingExam) {
      setEditTitle(editingExam.title || '');
      setEditExamType(editingExam.examType || (editingExam as any).testType || (editingExam as any).type || 'Thường xuyên');
      setEditDurationMinutes(editingExam.durationMinutes || (editingExam as any).duration || 45);
      setEditTargetClass(editingExam.targetClass || 'Tất cả các lớp');
      setEditSubject(editingExam.subject || 'Toán');
      setEditGrade(editingExam.grade || 'Khối 3');
      setEditStatus(editingExam.status === 'published' ? 'published' : 'draft');

      // Populate questions for the editor showcase, ensuring stable IDs and fields
      const rawQuestions: QuestionItem[] = editingExam.questions?.length ? [...editingExam.questions] : [
        {
          id: 'q1', code: 'C1', subject: editingExam.subject, grade: editingExam.grade,
          level: 'van_dung', type: 'multiple_choice',
          content: 'Đâu là đối tượng tự nhiên có sẵn trong tự nhiên?',
          options: ['Chiếc quạt điện', 'Cây xanh', 'Bóng đèn điện', 'Ti vi'],
          correctAnswer: 'B',
          points: 2
        } as any,
        {
          id: 'q2', code: 'C2', subject: editingExam.subject, grade: editingExam.grade,
          level: 'thong_hieu', type: 'essay',
          content: 'Em hãy nêu vai trò của máy tính trong học tập và đời sống hàng ngày.',
          correctAnswer: 'Gợi ý: Hỗ trợ tìm kiếm thông tin, học trực tuyến, giải trí lành mạnh...',
          explanation: 'Barem: Nêu đủ 3 ý chính đạt 2.0 điểm.',
          points: 2
        } as any
      ];

      const initialQuestions: QuestionItem[] = rawQuestions.map((q, qIdx) => ({
        ...q,
        id: q.id || `q_${qIdx + 1}_${Date.now()}`,
        code: q.code || `C${qIdx + 1}`,
        points: (q as any).points ?? (q as any).score ?? 2
      }));

      setEditedQuestions(initialQuestions);
    } else {
      setEditedQuestions([]);
    }
  }, [editingExam]);

  const totalScore = useMemo(() => {
    return editedQuestions.reduce((acc, q) => acc + (Number((q as any).points) || 2), 0);
  }, [editedQuestions]);

  const handleAddNewQuestion = (type: string = 'multiple_choice') => {
    const newQ: QuestionItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      code: `C${editedQuestions.length + 1}`,
      subject: editSubject,
      grade: editGrade,
      level: 'thong_hieu' as any,
      type: type as any,
      content: '',
      options: type === 'multiple_choice' || type === 'multiple_response'
        ? ['', '', '', '']
        : type === 'ordering'
          ? ['Bước 1...', 'Bước 2...', 'Bước 3...']
          : undefined,
      correctAnswer: type === 'multiple_choice' ? 'A' : type === 'multiple_response' ? 'A' : '',
      statements: type === 'true_false'
        ? [
            { statement: 'Nhận định 1...', isCorrect: true },
            { statement: 'Nhận định 2...', isCorrect: false }
          ]
        : undefined,
      matchingPairs: type === 'matching'
        ? [
            { left: 'Vế trái 1...', right: 'Vế phải tương ứng 1...' },
            { left: 'Vế trái 2...', right: 'Vế phải tương ứng 2...' }
          ]
        : undefined,
      explanation: '',
      points: 2
    } as any;
    setEditedQuestions(prev => [...prev, newQ]);
    showToast("Đã thêm câu hỏi mới vào đề kiểm tra!", "success");
  };

  const handleDeleteQuestion = (idx: number) => {
    if (editedQuestions.length <= 1) {
      showToast("Đề kiểm tra cần có ít nhất 1 câu hỏi!", "error");
      return;
    }
    setEditedQuestions(prev => prev.filter((_, i) => i !== idx));
    showToast("Đã xóa câu hỏi khỏi đề kiểm tra.", "success");
  };

  const handleUpdateQuestion = (idx: number, updatedFields: Partial<QuestionItem>) => {
    setEditedQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...updatedFields };
      return next;
    });
  };

  const handleMoveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= editedQuestions.length) return;
    setEditedQuestions(prev => {
      const next = [...prev];
      const item = next[fromIdx];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const handleSaveEditedExam = () => {
    if (!editingExam) return;
    if (!editTitle.trim()) {
      showToast("Vui lòng nhập tên đề kiểm tra!", "error");
      return;
    }
    if (!editExamType || !editExamType.trim()) {
      showToast("Vui lòng chọn Loại bài kiểm tra!", "error");
      return;
    }
    if (!editDurationMinutes || Number(editDurationMinutes) <= 0) {
      showToast("Vui lòng nhập Thời gian thi hợp lệ (> 0 phút)!", "error");
      return;
    }

    const updatedExam: ExamPaper = {
      ...editingExam,
      title: editTitle.trim(),
      examType: editExamType.trim(),
      durationMinutes: Number(editDurationMinutes),
      targetClass: editTargetClass,
      subject: editSubject,
      grade: editGrade,
      status: editStatus,
      questions: editedQuestions.length > 0 ? editedQuestions : (editingExam.questions || []),
    };

    try {
      onSaveExam(updatedExam);
      setEditingExam(null);
      setEditingExamTab('questions');
      showToast("✅ Đã cập nhật thành công đề kiểm tra vào hệ thống!", "success");
    } catch (err) {
      showToast("Lưu thất bại, vui lòng kiểm tra lại!", "error");
    }
  };

  const handleOpenTracking = (exam: ExamPaper) => {
    setTrackingActionMenuId(null);
    setTrackingExam(exam);
    setTrackingFilter('all');
    setOpenActionMenuId(null);
  };

  const handleOpenRegrading = (exam: ExamPaper) => {
    setRegradingExam(exam);
    setRegradingState('confirm');
    setRegradingStats({
      totalSubmissions: exam.submissionsCount || 3,
      processed: 0,
      success: 0,
      failed: 0
    });
    setOpenActionMenuId(null);
  };

  const handleStartRegrading = () => {
    setRegradingState('progress');
    let current = 0;
    const total = regradingStats.totalSubmissions;
    
    // Simulate progress
    const interval = setInterval(() => {
      current++;
      setRegradingStats(prev => ({
        ...prev,
        processed: current,
        success: current, // Mock all as success
      }));
      
      if (current >= total) {
        clearInterval(interval);
      }
    }, 800);
  };

  const handleCloseRegrading = () => {
    setRegradingExam(null);
  };

  // Solver State
  const [examAnswers, setExamAnswers] = useState<Record<string, any>>({});
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(false);
  const [examScore, setExamScore] = useState<number>(0);

  // AI Creator State
  const [aiTopicDoc, setAiTopicDoc] = useState('');
  const [aiSubject, setAiSubject] = useState('Toán Học');
  const [aiGrade, setAiGrade] = useState('Khối 10');
  const [aiCount, setAiCount] = useState(5);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Matrix State
  const [matrixTitle, setMatrixTitle] = useState('Đề Kiểm Tra Tổng Hợp');
  const [matrixDuration, setMatrixDuration] = useState(45);
  const [matrixCounts, setMatrixCounts] = useState({
    nhanBiet: 4,
    thongHieu: 3,
    vanDung: 2,
    vanDungCao: 1,
  });

  const handleGenerateAiExam = async () => {
    if (!aiTopicDoc.trim()) return;
    setIsGeneratingAi(true);

    const generatedQuestions = await generateExamQuestionsAI(
      aiSubject,
      aiGrade,
      aiTopicDoc,
      aiCount
    );

    const newExam: ExamPaper = {
      id: `ex-ai-${Date.now()}`,
      title: `Đề Thi AI: ${(aiTopicDoc || '').substring(0, 30)}...`,
      subject: aiSubject,
      grade: aiGrade,
      durationMinutes: 45,
      matrix: {
        nhanBiet: Math.ceil(generatedQuestions.length * 0.4),
        thongHieu: Math.ceil(generatedQuestions.length * 0.3),
        vanDung: Math.ceil(generatedQuestions.length * 0.2),
        vanDungCao: Math.floor(generatedQuestions.length * 0.1),
      },
      questions: generatedQuestions,
      teacherId: activeTeacherProfile.id,
      teacherName: activeTeacherProfile.name,
      teacherEmail: activeTeacherProfile.email,
      createdBy: activeTeacherProfile.id,
      authorName: activeTeacherProfile.name,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      isShuffled: false,
      status: 'published',
      submissionsCount: 0,
      totalStudents: 35,
      authorType: 'my',
    };

    setIsGeneratingAi(false);
    try {
      onSaveExam(newExam);
      setSelectedExam(null);
      setActiveTab('list');
      showToast("Đã lưu thành công dữ liệu đề thi do AI tạo!", "success");
    } catch (err) {
      showToast("Lưu thất bại, vui lòng kiểm tra lại!", "error");
    }
  };

  const handleExamSubmit = () => {
    if (!selectedExam) return;
    let correctCount = 0;
    const totalQ = selectedExam.questions.length;
    selectedExam.questions.forEach((q) => {
      const userAns = examAnswers[q.id];
      if (q.type === 'multiple_choice') {
        if (userAns && q.correctAnswer && userAns.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
          correctCount++;
        }
      } else if (q.type === 'fill_blank') {
        if (userAns && q.correctAnswer && userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
          correctCount++;
        }
      } else if (q.type === 'true_false' && q.statements) {
        let allTrue = true;
        q.statements.forEach((st, sIdx) => {
          const uState = userAns?.[sIdx];
          if (uState !== st.isCorrect) allTrue = false;
        });
        if (allTrue) correctCount++;
      } else if (q.type === 'essay' && userAns && userAns.trim().length > 3) {
        correctCount++;
      } else if (userAns) {
        correctCount++;
      }
    });
    const calculatedScore = totalQ > 0 ? Number(((correctCount / totalQ) * 10).toFixed(1)) : 10;
    setExamScore(calculatedScore);
    setIsExamSubmitted(true);
  };

  const handleCreateByMatrix = () => {
    // Select questions from question bank according to matrix
    const nhanBietQs = questionsBank.filter(q => q.level === 'nhan_biet').slice(0, matrixCounts.nhanBiet);
    const thongHieuQs = questionsBank.filter(q => q.level === 'thong_hieu').slice(0, matrixCounts.thongHieu);
    const vanDungQs = questionsBank.filter(q => q.level === 'van_dung').slice(0, matrixCounts.vanDung);
    const vanDungCaoQs = questionsBank.filter(q => q.level === 'van_dung_cao').slice(0, matrixCounts.vanDungCao);

    const combined = [...nhanBietQs, ...thongHieuQs, ...vanDungQs, ...vanDungCaoQs];

    const newExam: ExamPaper = {
      id: `ex-mat-${Date.now()}`,
      title: matrixTitle,
      subject: aiSubject,
      grade: aiGrade,
      durationMinutes: matrixDuration,
      matrix: { ...matrixCounts },
      questions: combined.length > 0 ? combined : questionsBank.slice(0, 5),
      teacherId: activeTeacherProfile.id,
      teacherName: activeTeacherProfile.name,
      teacherEmail: activeTeacherProfile.email,
      createdBy: activeTeacherProfile.id,
      authorName: activeTeacherProfile.name,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      isShuffled: false,
      status: 'published',
      submissionsCount: 0,
      totalStudents: 35,
      authorType: 'my',
    };

    try {
      onSaveExam(newExam);
      setSelectedExam(null);
      setActiveTab('list');
      showToast("Đã lưu thành công dữ liệu đề thi theo ma trận!", "success");
    } catch (err) {
      showToast("Lưu thất bại, vui lòng kiểm tra lại!", "error");
    }
  };

  // Shuffle Exam Questions & Answers
  const handleShuffleExam = (exam: ExamPaper) => {
    const shuffledQuestions = [...exam.questions]
      .sort(() => Math.random() - 0.5)
      .map(q => {
        if (q.type === 'multiple_choice' && q.options) {
          const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
          return { ...q, options: shuffledOptions };
        }
        return q;
      });

    const shuffledExam: ExamPaper = {
      ...exam,
      id: `ex-shuf-${Date.now()}`,
      title: `${exam.title} (Trộn Đề Mã 102)`,
      isShuffled: true,
      questions: shuffledQuestions,
    };

    try {
      onSaveExam(shuffledExam);
      setSelectedExam(null);
      setActiveTab('list');
      showToast("Đã trộn và lưu thành công dữ liệu mã đề thi mới!", "success");
    } catch (err) {
      showToast("Trộn và lưu đề thất bại!", "error");
    }
  };

  const handleExportExcel = (exam: ExamPaper) => {
    exportExamToExcel(exam);
  };

  const handleDownloadMatrixTemplate = () => {
    downloadExamMatrixTemplate();
  };

  // Tự động chuẩn hóa dữ liệu cũ (backward compatibility):
  // Nếu có bản ghi chứa nhiều lớp dạng chuỗi gộp, tự động phân tách thành các bản ghi độc lập
  useEffect(() => {
    const legacyExams = (exams || []).filter(e => e.targetClass && e.targetClass.includes(','));
    if (legacyExams.length > 0) {
      legacyExams.forEach(exam => {
        const classes = exam.targetClass!.split(',').map(c => c.trim()).filter(Boolean);
        if (classes.length > 0) {
          const rootId = exam.originalExamId || exam.id.replace(/-class-.*$/, '');
          // Cập nhật bản ghi gốc cho lớp đầu tiên
          const firstExam: ExamPaper = {
            ...exam,
            targetClass: classes[0],
            originalExamId: rootId,
          };
          onSaveExam(firstExam);

          // Tạo các bản ghi độc lập cho các lớp tiếp theo
          classes.slice(1).forEach((cls, idx) => {
            const extraExam: ExamPaper = {
              ...exam,
              id: `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`,
              targetClass: cls,
              originalExamId: rootId,
              submissionsCount: 0,
              totalStudents: 35,
            };
            onSaveExam(extraExam);
          });
        }
      });
    }
  }, [exams, onSaveExam]);

  // Chuẩn hóa danh sách đề thi: Mỗi dòng đại diện cho 1 lớp duy nhất (Mô hình 1 đề - N lần giao)
  const normalizedExams = useMemo(() => {
    const list: ExamPaper[] = [];
    (exams || []).forEach(exam => {
      if (exam.targetClass && exam.targetClass.includes(',')) {
        const classes = exam.targetClass.split(',').map(c => c.trim()).filter(Boolean);
        if (classes.length > 0) {
          classes.forEach((cls, idx) => {
            const rootId = exam.originalExamId || exam.id.replace(/-class-.*$/, '');
            list.push({
              ...exam,
              id: idx === 0 ? exam.id : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              targetClass: cls,
              originalExamId: rootId,
            });
          });
        } else {
          list.push(exam);
        }
      } else {
        list.push(exam);
      }
    });

    // Deduplication pass
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const cleanList: ExamPaper[] = [];

    list.forEach(item => {
      if (!item || !item.id || seenIds.has(item.id)) return;
      const key = `${(item.title || '').trim().toLowerCase()}::${(item.targetClass || '').trim().toLowerCase()}::${(item.grade || '').trim()}`;
      if (seenKeys.has(key)) return;
      seenIds.add(item.id);
      seenKeys.add(key);
      cleanList.push(item);
    });

    return cleanList;
  }, [exams]);

  const isMyExam = useCallback((e: ExamPaper): boolean => {
    if (isAdmin) return true;
    const currentId = activeTeacherProfile.id; // e.g. 'gv-06'
    if (e.teacherId) return e.teacherId === currentId;
    if (e.createdBy) return e.createdBy === currentId;
    return false;
  }, [isAdmin, activeTeacherProfile.id]);

  const allExamsCount = normalizedExams.length;
  const myExamsCount = normalizedExams.filter(e => isMyExam(e)).length;
  const colleagueExamsCount = normalizedExams.filter(e => !isMyExam(e)).length;

  const filteredExams = normalizedExams.filter(exam => {
    // Category Resource Tab filter
    if (resourceTab === 'my') {
      if (!isMyExam(exam)) return false;
    }

    if (filterGrade !== 'Tất cả các khối' && exam.grade !== filterGrade) return false;
    if (filterSubject !== 'Tất cả các môn' && exam.subject !== filterSubject) return false;
    if (filterType !== 'Tất cả loại' && filterType !== 'Tất cả Loại' && exam.examType && exam.examType !== filterType) return false;
    if (filterTeacher !== 'Tất cả giáo viên' && exam.createdBy !== filterTeacher) return false;
    if (filterClass !== 'Tất cả các lớp') {
      if (exam.targetClass !== filterClass) return false;
    }
    if (filterDuration && exam.durationMinutes.toString() !== filterDuration) return false;
    if (filterStatus !== 'Tất cả trạng thái') {
      const eStatus = exam.status || 'draft';
      if (filterStatus === 'Bản nháp' && eStatus !== 'draft') return false;
      if (filterStatus === 'Đã duyệt' && eStatus !== 'published') return false;
    }
    return true;
  });

  const totalExams = filteredExams.length;
  const totalPages = Math.ceil(totalExams / itemsPerPage) || 1;
  const currentExams = filteredExams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  
  if (editingExam) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-50 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden animate-scale-up relative">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-inner">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-800">Sửa nội dung đề kiểm tra</h2>
                  <span className="px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 bg-indigo-50 text-[10px] font-black uppercase tracking-wider">EXAM EDITOR</span>
                </div>
                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-slate-700">Đề thi:</span> {editTitle || editingExam.title} 
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-slate-600">{editSubject}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-slate-600">{editGrade}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{editExamType}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">{editDurationMinutes} phút</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {editingExamTab !== 'preview' ? (
                <button 
                  onClick={() => setEditingExamTab('preview')}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-sm font-bold transition-colors border border-slate-200 bg-white"
                >
                  <Eye className="w-4 h-4" /> Xem trước đề
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setEditingExamTab('questions')}
                    className="flex items-center gap-2 px-4 py-2 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl text-sm font-bold transition-colors border border-amber-200"
                  >
                    <Edit3 className="w-4 h-4" /> Quay lại sửa đề
                  </button>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-sm font-bold transition-colors border border-indigo-200"
                  >
                    <Download className="w-4 h-4" /> Tải đề
                  </button>
                </>
              )}
              <button 
                onClick={handleSaveEditedExam}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
              >
                Lưu toàn bộ & Đóng <Save className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setEditingExam(null); setEditingExamTab('questions'); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-slate-50 relative">
            {editingExamTab === 'preview' ? (
              <div className="p-6 pb-20 max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500"></div>
                  
                  {/* Header of paper */}
                  <div className="text-center mb-8">
                    <h3 className="text-sm font-bold text-indigo-600 mb-2 uppercase tracking-widest">HỆ THỐNG DẠY VÀ HỌC SỐ PK TRỰC KHANG</h3>
                    <h1 className="text-2xl font-black text-slate-800 uppercase mb-3">Đề kiểm tra {editExamType || 'thường xuyên'}</h1>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-600">
                      <span><span className="font-bold text-slate-700">Bài thi:</span> {editTitle || editingExam.title}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span><span className="font-bold text-slate-700">Môn:</span> {editSubject || editingExam.subject}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span><span className="font-bold text-slate-700">Dành cho:</span> {editGrade || editingExam.grade}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span><span className="font-bold text-slate-700">Thời lượng:</span> {editDurationMinutes || editingExam.durationMinutes} Phút</span>
                    </div>
                  </div>

                  {/* Student Info Box */}
                  <div className="border border-slate-300 rounded-2xl p-6 mb-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700">Họ và tên học sinh:</span>
                        <div className="border-b-2 border-dotted border-slate-300 h-6"></div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700">Lớp:</span>
                        <div className="border-b-2 border-dotted border-slate-300 h-6"></div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700">Mã số học sinh:</span>
                        <div className="border-b-2 border-dotted border-slate-300 h-6"></div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700">Phòng thi:</span>
                        <div className="border-b-2 border-dotted border-slate-300 h-6"></div>
                      </div>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-8">
                    {editedQuestions.map((q, idx) => {
                      const qType = normalizeQuestionType(q.type);
                      const qPoints = (q as any).points ?? 2;

                      return (
                        <div key={q.id || idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="px-2.5 py-0.5 bg-slate-800 text-white text-sm font-medium rounded-lg shrink-0 mt-0.5">
                              Câu {idx + 1}
                            </div>
                            <div className="text-base font-medium text-slate-800 leading-relaxed">
                              <span className="text-indigo-600 font-semibold mr-1">
                                [{getQuestionTypeLabel(q.type)} - {qPoints} điểm]
                              </span>
                              {q.content || <span className="text-slate-400 italic">(Chưa nhập nội dung câu hỏi)</span>}
                            </div>
                          </div>

                          {/* Dạng 1: Trắc nghiệm đơn */}
                          {qType === 'multiple_choice' && q.options && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-[3.25rem]">
                              {q.options.map((opt, oIdx) => {
                                const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                                const letter = letters[oIdx] || String.fromCharCode(65 + oIdx);
                                const isCorrect = (q.correctAnswer || 'A').toUpperCase() === letter;
                                
                                return (
                                  <div 
                                    key={oIdx} 
                                    className={`relative px-4 py-3 rounded-xl border-2 flex items-center gap-3 ${isCorrect ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm shrink-0 ${isCorrect ? 'bg-emerald-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'}`}>
                                      {letter}
                                    </div>
                                    <span className={`text-sm ${isCorrect ? 'text-emerald-900 font-medium' : 'text-slate-700 font-normal'}`}>{opt}</span>
                                    
                                    {isCorrect && (
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full">Đáp án đúng</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Dạng 2: Chọn nhiều đáp án đúng */}
                          {qType === 'multiple_response' && q.options && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-[3.25rem]">
                              {q.options.map((opt, oIdx) => {
                                const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                                const letter = letters[oIdx] || String.fromCharCode(65 + oIdx);
                                const correctList = String(q.correctAnswer || '').toUpperCase().split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
                                const isCorrect = correctList.includes(letter);
                                
                                return (
                                  <div 
                                    key={oIdx} 
                                    className={`relative px-4 py-3 rounded-xl border-2 flex items-center gap-3 ${isCorrect ? 'border-fuchsia-400 bg-fuchsia-50/50' : 'border-slate-200 bg-white'}`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm shrink-0 ${isCorrect ? 'bg-fuchsia-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'}`}>
                                      {letter}
                                    </div>
                                    <span className={`text-sm ${isCorrect ? 'text-fuchsia-900 font-medium' : 'text-slate-700 font-normal'}`}>{opt}</span>
                                    
                                    {isCorrect && (
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <span className="text-[11px] font-bold text-fuchsia-600 uppercase tracking-wider bg-fuchsia-100 px-2 py-0.5 rounded-full">Đáp án đúng</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Dạng 3: Đúng / Sai */}
                          {qType === 'true_false' && (
                            <div className="space-y-2 pl-[3.25rem]">
                              {(q.statements || []).map((st, sIdx) => (
                                <div key={sIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                                      {sIdx + 1}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800">{st.statement}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${st.isCorrect ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'}`}>
                                      Đúng {st.isCorrect ? '✓' : ''}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${!st.isCorrect ? 'bg-rose-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'}`}>
                                      Sai {!st.isCorrect ? '✓' : ''}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Dạng 4: Điền khuyết / Ngắn */}
                          {qType === 'fill_blank' && (
                            <div className="pl-[3.25rem] space-y-2">
                              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center gap-3">
                                <span className="text-xs font-bold text-amber-900">Đáp án chuẩn mong đợi:</span>
                                <span className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold">
                                  {q.correctAnswer || '(Chưa nhập đáp án)'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Dạng 5: Sắp xếp thứ tự */}
                          {qType === 'ordering' && (
                            <div className="pl-[3.25rem] space-y-2">
                              {(q.options || []).map((step, sIdx) => (
                                <div key={sIdx} className="p-2.5 bg-indigo-50/40 border border-indigo-100 rounded-xl flex items-center gap-3">
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-xs">
                                    Bước {sIdx + 1}
                                  </span>
                                  <span className="text-sm font-medium text-slate-800">{step}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Dạng 6: Nối cặp */}
                          {qType === 'matching' && (
                            <div className="pl-[3.25rem] space-y-2">
                              {(q.matchingPairs || []).map((pair, pIdx) => (
                                <div key={pIdx} className="p-2.5 bg-cyan-50/40 border border-cyan-100 rounded-xl flex items-center gap-3 text-sm">
                                  <span className="font-bold text-cyan-900 shrink-0">Cặp {pIdx + 1}:</span>
                                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 flex-1">{pair.left}</span>
                                  <span className="text-cyan-600 font-bold shrink-0">➔</span>
                                  <span className="px-3 py-1 bg-cyan-600 text-white rounded-lg font-bold flex-1">{pair.right}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Dạng 7: Tự luận */}
                          {qType === 'essay' && (
                            <div className="pl-[3.25rem] space-y-3">
                              <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-3 text-xs text-slate-400 italic">
                                (Khung làm bài tự luận của học sinh)
                              </div>
                              {(q.explanation || q.correctAnswer) && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                                  <strong className="text-slate-700">Gợi ý chấm điểm / Barem:</strong>
                                  <p className="text-slate-600 mt-1">{q.explanation || q.correctAnswer}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Dạng 8: Phân loại */}
                          {qType === 'classification' && (
                            <div className="pl-[3.25rem] space-y-2">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {(q.classificationGroups || []).map((g, gIdx) => (
                                  <span key={gIdx} className="px-2.5 py-1 bg-violet-100 text-violet-800 rounded-lg text-xs font-bold">
                                    Nhóm: {g}
                                  </span>
                                ))}
                              </div>
                              <div className="space-y-1.5">
                                {(q.classificationItems || []).map((it, iIdx) => (
                                  <div key={iIdx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                                    <span className="font-medium text-slate-800">{it.name}</span>
                                    <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                                      {it.group}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 pb-24 max-w-5xl mx-auto">
                {/* Info Alert */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 mb-6">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 mb-1">Chỉnh sửa nhanh & Trực tiếp:</h4>
                    <p className="text-xs font-medium text-indigo-700 leading-relaxed">
                      Thầy/Cô có thể nhấp chuột trực tiếp vào bất kỳ ô nhập liệu nào dưới đây để thay đổi đề thi. Thay đổi sẽ được lưu vào hệ thống khi thầy cô bấm "Lưu toàn bộ & Đóng".
                    </p>
                  </div>
                </div>

                {/* General Exam Config Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs mb-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Cấu hình thông tin chung đề kiểm tra
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      Bổ sung / cập nhật Loại KT & Thời gian thi
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Tên đề thi */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tên đề kiểm tra <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                        placeholder="Nhập tên đề kiểm tra..."
                      />
                    </div>

                    {/* Loại bài kiểm tra */}
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-purple-600" />
                        <span>Loại bài kiểm tra <span className="text-rose-500">*</span></span>
                      </label>
                      <select
                        value={editExamType}
                        onChange={(e) => setEditExamType(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-purple-300 bg-purple-50/40 focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-950 cursor-pointer"
                      >
                        {EXAM_TYPES.map((et) => (
                          <option key={et} value={et}>{et}</option>
                        ))}
                      </select>
                    </div>

                    {/* Thời gian thi */}
                    <div>
                      <label className="block text-xs font-bold text-orange-950 mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span>Thời gian thi (phút) <span className="text-rose-500">*</span></span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={editDurationMinutes}
                          onChange={(e) => setEditDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-20 px-3 py-2 text-xs font-black rounded-xl border border-orange-300 bg-orange-50/40 focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-950"
                        />
                        <div className="flex items-center gap-1">
                          {[15, 45, 60].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setEditDurationMinutes(m)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                editDurationMinutes === m
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                                  : 'bg-white text-orange-800 border-orange-200 hover:bg-orange-50'
                              }`}
                            >
                              {m}p
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Lớp giao */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Lớp giao</label>
                      <input
                        type="text"
                        value={editTargetClass}
                        onChange={(e) => setEditTargetClass(e.target.value)}
                        placeholder="Ví dụ: Lớp 3C hoặc Tất cả các lớp"
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                      />
                    </div>

                    {/* Môn học */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Môn học</label>
                      <select
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 cursor-pointer"
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Khối lớp */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Khối lớp</label>
                      <select
                        value={editGrade}
                        onChange={(e) => setEditGrade(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 cursor-pointer"
                      >
                        {GRADES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    {/* Trạng thái */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Trạng thái duyệt</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 cursor-pointer"
                      >
                        <option value="published">Đã duyệt nội dung</option>
                        <option value="draft">Bản nháp / Chưa giao</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* List Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">DANH SÁCH CÂU HỎI CỦA ĐỀ ({editedQuestions.length} CÂU)</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddNewQuestion('multiple_choice')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
                    </button>
                    <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-2xs">
                      Tổng số điểm: {totalScore} điểm
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {editedQuestions.map((q, idx) => (
                    <ExamQuestionEditorCard
                      key={q.id || `eq_${idx}`}
                      question={q}
                      index={idx}
                      totalQuestions={editedQuestions.length}
                      onUpdate={(updatedFields) => handleUpdateQuestion(idx, updatedFields)}
                      onDelete={() => handleDeleteQuestion(idx)}
                      onMoveUp={() => handleMoveQuestion(idx, idx - 1)}
                      onMoveDown={() => handleMoveQuestion(idx, idx + 1)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Fixed Footer for Editor */}
            {editingExamTab !== 'preview' && (
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40 flex items-center justify-between rounded-b-3xl">
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => handleAddNewQuestion('multiple_choice')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm câu hỏi
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" /> <Volume2 className="w-4 h-4 -ml-1" /> Chèn hình ảnh & Âm thanh
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => { setEditingExam(null); setEditingExamTab('questions'); }}
                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveEditedExam}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Lưu toàn bộ & Đóng <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* E-Learning Media Modal */}
        {showMediaModal && (
          <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-scale-up border border-slate-200">
              {/* Modal Header */}
              <div className="bg-[#1e1b4b] p-6 text-white relative">
                <button 
                  onClick={() => setShowMediaModal(false)}
                  className="absolute top-6 right-6 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center shrink-0 border border-indigo-400/30">
                    <ImageIcon className="w-5 h-5 text-indigo-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold">Thêm đa phương tiện</h3>
                      <span className="px-2 py-0.5 rounded border border-indigo-400/30 bg-indigo-500/20 text-[10px] font-black uppercase tracking-wider text-indigo-200">E-Learning Media</span>
                    </div>
                    <p className="text-indigo-200/80 text-sm">Tải lên tệp đa phương tiện, đường dẫn hình ảnh & lời dẫn cho câu hỏi để kiểm tra</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 bg-white">
                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 px-3 text-indigo-600 font-bold text-sm shrink-0">
                    <Sparkles className="w-4 h-4" /> Chọn câu hỏi cần áp dụng:
                  </div>
                  <div className="relative flex-1">
                    <select className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50">
                      <option>Tất cả các câu hỏi trong đề (10 câu)</option>
                      <option>Câu 1: Đâu là sản phẩm công nghệ...</option>
                      <option>Câu 2: Các bộ phận chính của...</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-3">
                    1. Tải tệp đa phương tiện (Hình ảnh / Âm thanh)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-indigo-600 mb-1">Nhấp để tải tệp lên <span className="text-slate-500 font-medium">hoặc kéo thả tệp vào đây</span></p>
                    <p className="text-xs text-slate-400">Hỗ trợ các định dạng tệp: PNG, JPG, GIF, MP3, WAV (Tối đa 10MB)</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <ImageIcon className="w-4 h-4 text-indigo-500" /> KHU VỰC HÌNH ẢNH & LỜI DẪN CÂU HỎI
                    </div>
                    <button 
                      onClick={() => setHideMediaPreview(!hideMediaPreview)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${hideMediaPreview ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                      {hideMediaPreview ? 'Hiện khu vực hình ảnh' : 'Ẩn khu vực hình ảnh'}
                    </button>
                  </div>
                  
                  {!hideMediaPreview && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Đường dẫn hình ảnh / Media (Если có)</label>
                        <div className="flex gap-2 mb-2">
                          <input 
                            type="text" 
                            value={mediaUrl}
                            onChange={(e) => setMediaUrl(e.target.value)}
                            placeholder="Dán link URL hình ảnh online (https://...)" 
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
                          />
                          <input 
                            type="file" 
                            ref={mediaFileInputRef} 
                            onChange={handleMediaFileChange} 
                            accept="image/*" 
                            className="hidden" 
                          />
                          <button
                            type="button"
                            onClick={() => mediaFileInputRef.current?.click()}
                            className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                            title="Tải ảnh trực tiếp từ máy tính"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Tải ảnh lên</span>
                          </button>
                        </div>

                        {mediaUrl && (
                          <div className="relative inline-flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 mt-1">
                            <img src={mediaUrl} alt="Xem trước" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                            <div className="text-[11px] text-slate-600 font-medium max-w-[200px] truncate">
                              {mediaUrl.startsWith('data:') ? 'Ảnh tải từ máy tính' : mediaUrl}
                            </div>
                            <button
                              type="button"
                              onClick={() => setMediaUrl('')}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-600 shadow-sm cursor-pointer"
                              title="Xóa ảnh"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {!mediaUrl && (
                          <p className="text-[10px] text-slate-400 italic leading-relaxed">
                            Dán link từ Google Drive, Dropbox hoặc bấm "Tải ảnh lên" từ thiết bị.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Nội dung mô tả hình ảnh / Lời dẫn</label>
                        <textarea 
                          rows={3}
                          value={mediaPrompt}
                          onChange={(e) => setMediaPrompt(e.target.value)}
                          placeholder="Soạn kịch bản, lời dẫn hoặc gợi ý hình ảnh cho học sinh (kéo giãn linh hoạt)..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 resize-y"
                        ></textarea>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-3xl">
                <button 
                  onClick={() => setShowMediaModal(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={() => setShowMediaModal(false)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Xác nhận & Tải lên
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
return (
    <div className="space-y-6">
      
      {/* Module Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">
              Ngân Hàng & Ma Trận Đề
            </span>
            <span className="text-xs text-slate-400">• Tích hợp AI Trộn Đề & Xuất Excel</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 font-heading">
            Phân Hệ Quản Lý Đề Kiểm Tra & Thi Trắc Nghiệm
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-4xl leading-relaxed">
            Tạo đề tự động bằng AI từ văn bản, quản lý ma trận 4 mức độ, đảo đề ngẫu nhiên & xuất file Excel chuẩn (.xlsx)
          </p>
        </div>
      </div>

      <ManualQuestionBankModal
        isOpen={isManualExamModalOpen}
        onClose={() => setIsManualExamModalOpen(false)}
        onSaveQuestions={handleSaveManualExam}
        initialLessonName="Đề kiểm tra thủ công"
        initialGrade="Khối 3"
        initialSubject="Toán"
        defaultSaveToGlobal={false}
      />

      <UseQuestionBankModal
        isOpen={isBankExamModalOpen}
        onClose={() => setIsBankExamModalOpen(false)}
        questions={questionsBank}
        targetContext="exam"
        initialSubject={filterSubject !== 'Tất cả các môn' ? filterSubject : 'Toán'}
        initialGrade={filterGrade !== 'Tất cả các khối' ? filterGrade : 'Khối 3'}
        initialTargetClass={filterClass !== 'Tất cả các lớp' ? filterClass : undefined}
        onCreateExam={handleCreateExamFromBank}
      />

      {/* VIEW: Exam List */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          {/* 3 Resource Tabs & Action Buttons Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-900 text-white shadow-xs flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Tất cả đề thi ({allExamsCount})
              </div>
            </div>

            {userRole !== 'student' && (
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => setIsBankExamModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-amber-200/50 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Database className="w-4 h-4" />
                  <span>Chọn từ Ngân hàng câu hỏi</span>
                </button>

                <button
                  onClick={() => setIsManualExamModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-200/50 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo câu hỏi thủ công</span>
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Khối</label>
                <select value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value); setFilterClass('Tất cả các lớp'); }} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
<option value="Tất cả các khối">Tất cả các khối</option>
{GRADES.map((grade) => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
</select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lớp</label>
                <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
<option value="Tất cả các lớp">Tất cả các lớp</option>
{(filterGrade === 'Tất cả các khối' ? ALL_CLASSES : CLASSES_BY_GRADE[filterGrade] || []).map((cls) => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
</select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Môn học</label>
                <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
<option value="Tất cả các môn">Tất cả các môn</option>
{SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
</select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Loại bài kiểm tra</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                  <option value="Tất cả loại">Tất cả loại</option>
                  {EXAM_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Thời lượng (phút)</label>
                <input 
                  type="number" 
                  placeholder="Nhập số phút" 
                  value={filterDuration}
                  onChange={(e) => setFilterDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500">
                  <option>Tất cả trạng thái</option>
                  <option>Bản nháp</option>
                  <option>Đã duyệt</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Đề kiểm tra</th>
                  <th className="px-6 py-4 text-emerald-600 text-center">Lớp giao</th>
                  <th className="px-6 py-4 text-purple-600 text-center">Loại KT</th>
                  <th className="px-6 py-4 text-orange-600">Thời gian thi</th>
                  <th className="px-6 py-4 text-blue-600 text-center">Đã làm</th>
                  <th className="px-6 py-4 text-rose-600 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentExams.length > 0 ? (
                  currentExams.map((exam) => {
                    const subjColor = getSubjectColorStyles(exam.subject);
                    return (
                    <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors group relative">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-teal-800 text-sm font-heading cursor-pointer hover:text-teal-600" onClick={() => { setSelectedExam(exam); setActiveTab('viewer'); }}>
                          {exam.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {/* Subject Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${subjColor.badgeClass}`}>
                            {exam.subject || subjColor.name.toUpperCase()}
                          </span>
                          {exam.grade && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                              {exam.grade}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {exam.status === 'published' ? 'Đã duyệt' : 'Bản nháp / Chưa giao'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/50 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {exam.questions?.length || 0} CÂU
                          </span>
                          {exam.status === 'published' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Đã duyệt nội dung
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-emerald-700">{exam.targetClass || '---'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(exam.examType || (exam as any).testType || (exam as any).type) ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200/50">
                            {exam.examType || (exam as any).testType || (exam as any).type}
                          </span>
                        ) : isExamOwner(exam) ? (
                          <button
                            onClick={() => setEditingExam(exam)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                            title="Bấm để bổ sung Loại bài kiểm tra"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Chưa chọn</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Chưa chọn</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(exam.durationMinutes || (exam as any).duration) ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 font-bold text-orange-600 text-xs">
                              <Clock className="w-3.5 h-3.5 text-orange-500" />
                              {(exam.durationMinutes || (exam as any).duration)} phút
                            </span>
                            {exam.startTime && (
                              <div className="flex flex-col gap-0.5 text-[10px] text-slate-500 mt-0.5">
                                <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-orange-500" /> Từ: {exam.startTime}</div>
                                {exam.endTime && <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-rose-500" /> Đến: {exam.endTime}</div>}
                              </div>
                            )}
                          </div>
                        ) : isExamOwner(exam) ? (
                          <button
                            onClick={() => setEditingExam(exam)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-lg border border-orange-200 transition-colors cursor-pointer"
                            title="Bấm để bổ sung Thời gian thi"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Chưa đặt</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Chưa đặt</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {exam.totalStudents ? (
                          <span className="font-bold text-blue-600">
                            {exam.submissionsCount || 0}/{exam.totalStudents} ({Math.round(((exam.submissionsCount || 0)/exam.totalStudents)*100)}%)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setOpenActionMenuId(openActionMenuId === exam.id ? null : exam.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {/* Popover Actions */}
                        {openActionMenuId === exam.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuId(null)}></div>
                            {isExamOwner(exam) ? (
                              <div className="absolute right-12 top-6 z-20 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 grid grid-cols-3 gap-2 min-w-[180px]">
                                {userRole !== 'student' && (
                                  <>
                                    <button onClick={() => handleOpenAssignmentModal(exam)} title="Giao bài" className="p-2.5 rounded-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-colors"><Rocket className="w-4 h-4 mx-auto" /></button>
                                    <button onClick={() => handleOpenRegrading(exam)} title="Chấm lại" className="p-2.5 rounded-xl border border-purple-100 text-purple-600 hover:bg-purple-50 transition-colors"><RefreshCw className="w-4 h-4 mx-auto" /></button>
                                    <button onClick={() => handleExportExcel(exam)} title="Tải xuống/Xuất file" className="p-2.5 rounded-xl border border-amber-100 text-amber-600 hover:bg-amber-50 transition-colors"><Download className="w-4 h-4 mx-auto" /></button>
                                  </>
                                )}
                                <button 
                                  onClick={() => handleOpenTracking(exam)} 
                                  title="Theo dõi bài kiểm tra" className="p-2.5 rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50 transition-colors"><Eye className="w-4 h-4 mx-auto" /></button>
                                {userRole !== 'student' && (
                                  <>
                                    <button onClick={() => { setEditingExam(exam); setOpenActionMenuId(null); }} title="Sửa đề thi" className="p-2.5 rounded-xl border border-green-100 text-green-600 hover:bg-green-50 transition-colors cursor-pointer"><Edit3 className="w-4 h-4 mx-auto" /></button>
                                    <button onClick={() => { setDeletingExam(exam); setOpenActionMenuId(null); }} title="Xóa" className="p-2.5 rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"><Trash2 className="w-4 h-4 mx-auto" /></button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="absolute right-12 top-6 z-20 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 flex items-center gap-2 min-w-[50px]">
                                <button 
                                  onClick={() => { handleOpenTracking(exam); setOpenActionMenuId(null); }} 
                                  title="Xem chi tiết & Theo dõi bài kiểm tra" 
                                  className="p-2.5 rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 mx-auto" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-xs font-medium">
                      Không tìm thấy đề kiểm tra nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 rounded-b-2xl">
            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
              <span>Hiển thị:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 font-bold text-slate-700"
              >
                <option value={10}>10 đề</option>
                <option value={20}>20 đề</option>
                <option value={50}>50 đề</option>
              </select>
              <span>mỗi trang (Bản ghi {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalExams)} trên tổng {totalExams})</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="mr-2 text-slate-500">Trang {currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Quay lại
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                {currentPage}
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Tiếp theo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI CREATOR: Auto Generate Exam from Doc */}
      {activeTab === 'ai_creator' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6 max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-6 rounded-2xl text-white space-y-2 shadow-md">
            <h3 className="text-lg font-extrabold flex items-center gap-2 font-heading">
              <Sparkles className="w-5 h-5 text-amber-300" /> Tạo Đề Kiểm Tra Tự Động Bằng AI Gemini
            </h3>
            <p className="text-xs text-sky-100 leading-relaxed">
              Dán nội dung bài học, tài liệu hoặc ghi ngắn chủ đề cần kiểm tra. AI Gemini sẽ tự động khởi tạo câu hỏi trắc nghiệm 4 phương án kèm đáp án chuẩn xác.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Môn Học:</label>
                <select
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  <option value="Toán Học">Toán Học</option>
                  <option value="Vật Lý">Vật Lý</option>
                  <option value="Hóa Học">Hóa Học</option>
                  <option value="Sinh Học">Sinh Học</option>
                  <option value="Ngữ Văn">Ngữ Văn</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khối Lớp:</label>
                <select
                  value={aiGrade}
                  onChange={(e) => setAiGrade(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  <option value="Khối 10">Khối 10</option>
                  <option value="Khối 11">Khối 11</option>
                  <option value="Khối 12">Khối 12</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số Câu Hỏi:</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={aiCount}
                  onChange={(e) => setAiCount(parseInt(e.target.value) || 5)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nội Dung Tài Liệu / Chủ Đề Tạo Đề:
              </label>
              <textarea
                rows={5}
                value={aiTopicDoc}
                onChange={(e) => setAiTopicDoc(e.target.value)}
                placeholder="Ví dụ: Phương trình bậc hai ax2 + bx + c = 0, biệt thức Delta, định lý Viet và ứng dụng bài toán thực tế..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 bg-slate-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveTab('list')}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700"
              >
                Hủy
              </button>
              <button
                onClick={handleGenerateAiExam}
                disabled={isGeneratingAi || !aiTopicDoc.trim()}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> AI Đang Tạo Đề Thi...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" /> Khởi Tạo Đề Thi Ngay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATRIX BUILDER */}
      {activeTab === 'matrix_builder' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6 max-w-2xl mx-auto">
          <h3 className="text-base font-extrabold text-slate-900 font-heading">
            Thiết Lập Đề Thi Theo Cấu Trúc Ma Trận Chuẩn Sư Phạm
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên Đề Thi:</label>
              <input
                type="text"
                value={matrixTitle}
                onChange={(e) => setMatrixTitle(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thời Gian Làm Bài (Phút):</label>
              <input
                type="number"
                value={matrixDuration}
                onChange={(e) => setMatrixDuration(parseInt(e.target.value) || 45)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 font-bold"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800">SỐ CÂU THEO MỨC ĐỘ NHẬN THỨC:</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600">Nhận biết:</label>
                  <input
                    type="number"
                    value={matrixCounts.nhanBiet}
                    onChange={(e) => setMatrixCounts({ ...matrixCounts, nhanBiet: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600">Thông hiểu:</label>
                  <input
                    type="number"
                    value={matrixCounts.thongHieu}
                    onChange={(e) => setMatrixCounts({ ...matrixCounts, thongHieu: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600">Vận dụng:</label>
                  <input
                    type="number"
                    value={matrixCounts.vanDung}
                    onChange={(e) => setMatrixCounts({ ...matrixCounts, vanDung: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600">Vận dụng cao:</label>
                  <input
                    type="number"
                    value={matrixCounts.vanDungCao}
                    onChange={(e) => setMatrixCounts({ ...matrixCounts, vanDungCao: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveTab('list')}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateByMatrix}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md cursor-pointer"
              >
                Tạo Đề Từ Ngân Hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEWER: Exam Paper View & Print */}
      {activeTab === 'viewer' && selectedExam && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md space-y-6 max-w-4xl mx-auto print:shadow-none print:p-0 print:border-none">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
            <button
              onClick={() => setActiveTab('list')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Danh sách đề
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportExcel(selectedExam)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Tải tệp Excel đề thi đầy đủ câu hỏi & đáp án"
              >
                <Download className="w-4 h-4 text-emerald-600" /> Xuất Đề Thi (.xlsx)
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" /> In Đề Thi
              </button>
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              ĐỀ KIỂM TRA CHUẨN SƯ PHẠM - DẠY VÀ HỌC SỐ PK TRỰC KHANG
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">
              {selectedExam.title}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Môn: {selectedExam.subject} | Lớp: {selectedExam.grade} | Thời gian làm bài: {selectedExam.durationMinutes} phút
            </p>
          </div>

          {/* Question List */}
          <div className="space-y-6 pt-4">
            {(selectedExam?.questions || []).map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base font-medium text-slate-900 leading-relaxed">
                    Câu {idx + 1}: {q.content}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 shrink-0">
                    {q.level === 'nhan_biet' ? 'Nhận biết' : q.level === 'thong_hieu' ? 'Thông hiểu' : q.level === 'van_dung' ? 'Vận dụng' : 'VD Cao'}
                  </span>
                </div>

                {q.options && q.type !== 'true_false' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-lg text-sm border ${
                          opt.startsWith(q.correctAnswer || '')
                            ? 'bg-emerald-50 border-emerald-300 font-medium text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-700 font-normal'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'true_false' && q.statements && (
                  <div className="space-y-2 pt-1 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                          <th className="p-2.5 border-r border-slate-200">Nhận định</th>
                          <th className="p-2.5 w-24 text-center">Đúng / Sai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {q.statements.map((st, sIdx) => (
                          <tr key={sIdx}>
                            <td className="p-2.5 border-r border-slate-200 font-normal text-slate-800">
                              {sIdx + 1}. {st.statement}
                            </td>
                            <td className="p-2.5 text-center align-middle font-medium">
                              {st.isCorrect ? (
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">ĐÚNG</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded text-xs font-medium">SAI</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {q.type === 'classification' && q.classificationItems && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-1 text-sm">
                    <div className="font-semibold text-emerald-900">🌿 Đáp án phân loại:</div>
                    {q.classificationItems.map((ci, cIdx) => (
                      <div key={cIdx} className="bg-white p-2 rounded border border-emerald-100 flex justify-between">
                        <span className="font-normal">{ci.name}</span>
                        <strong className="text-emerald-800 font-medium">[{ci.group}]</strong>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'fill_blank' && (
                  <div className="bg-emerald-50 text-emerald-900 p-2.5 rounded-lg text-sm font-medium border border-emerald-200">
                    Đáp án điền khuyết: {q.correctAnswer}
                  </div>
                )}

                {q.type === 'essay' && (
                  <div className="bg-blue-50 text-blue-900 p-2.5 rounded-lg text-sm border border-blue-200 font-normal">
                    <strong className="font-semibold">Gợi ý chấm tự luận:</strong> {q.correctAnswer || q.explanation || 'Chấm theo biểu điểm giáo viên.'}
                  </div>
                )}

                {q.explanation && (
                  <div className="mt-2 p-2.5 bg-amber-50 rounded-lg text-xs text-amber-900 border border-amber-200 font-normal">
                    💡 <strong className="font-semibold">Hướng dẫn đáp án:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      )}

      {/* SOLVER: Interactive Student Test-Taking Mode */}
      {activeTab === 'solver' && selectedExam && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 max-w-4xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <button
              onClick={() => setActiveTab('list')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Thoát làm bài
            </button>

            <div className="text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                ✍️ Chế độ làm bài trực tuyến (Interactive Test Mode)
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading mt-1">
                {selectedExam.title}
              </h2>
            </div>

            <div className="text-xs font-bold text-slate-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              ⏱️ Thời gian: {selectedExam.durationMinutes} phút
            </div>
          </div>

          {isExamSubmitted && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-center space-y-2 animate-scale-up">
              <h3 className="text-lg font-black text-emerald-900 font-heading">
                🎉 Nộp bài thành công!
              </h3>
              <p className="text-xs font-semibold text-emerald-800">
                Điểm số của bạn: <span className="text-base font-black text-emerald-600">{examScore} / 10 điểm</span>
              </p>
              <p className="text-[11px] text-emerald-700">
                Hệ thống đã ghi nhận kết quả và lưu vào hồ sơ học tập của bạn. Xem chi tiết đáp án và lời giải bên dưới.
              </p>
              <button
                onClick={() => setIsExamSubmitted(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Làm lại / Sửa bài
              </button>
            </div>
          )}

          <div className="space-y-6">
            {(selectedExam.questions || []).map((q, idx) => (
              <div key={q.id} className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-extrabold text-slate-900 leading-relaxed">
                    Câu {idx + 1} ({q.level === 'nhan_biet' ? 'Nhận biết' : q.level === 'thong_hieu' ? 'Thông hiểu' : q.level === 'van_dung' ? 'Vận dụng' : 'VD Cao'}): {q.content}
                  </h4>
                </div>

                {/* 1. Trắc nghiệm đơn */}
                {q.type === 'multiple_choice' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => {
                      const optLetter = opt.charAt(0);
                      const isSelected = examAnswers[q.id] === optLetter;
                      const isCorrectOpt = isExamSubmitted && opt.startsWith(q.correctAnswer || '');
                      const isWrongSelected = isExamSubmitted && isSelected && !isCorrectOpt;

                      let borderStyle = isSelected ? 'border-sky-500 bg-sky-50 font-bold text-sky-900' : 'border-slate-200 bg-white text-slate-700';
                      if (isCorrectOpt) borderStyle = 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900';
                      if (isWrongSelected) borderStyle = 'border-rose-500 bg-rose-50 font-bold text-rose-900';

                      return (
                        <label key={oIdx} className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${borderStyle}`}>
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={isSelected}
                            onChange={() => !isExamSubmitted && setExamAnswers({ ...examAnswers, [q.id]: optLetter })}
                            disabled={isExamSubmitted}
                            className="text-sky-600 focus:ring-sky-500"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 2. Chọn nhiều đáp án */}
                {q.type === 'multiple_response' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => {
                      const optLetter = opt.charAt(0);
                      const currentArr = examAnswers[q.id] || [];
                      const isChecked = currentArr.includes(optLetter);

                      return (
                        <label key={oIdx} className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${isChecked ? 'border-indigo-500 bg-indigo-50 font-bold text-indigo-900' : 'border-slate-200 bg-white text-slate-700'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (isExamSubmitted) return;
                              const next = e.target.checked ? [...currentArr, optLetter] : currentArr.filter((x: string) => x !== optLetter);
                              setExamAnswers({ ...examAnswers, [q.id]: next });
                            }}
                            disabled={isExamSubmitted}
                            className="text-indigo-600 focus:ring-indigo-500 rounded"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 3. Đúng / Sai */}
                {q.type === 'true_false' && q.statements && (
                  <div className="space-y-2 pt-1">
                    {q.statements.map((st, sIdx) => {
                      const uState = examAnswers[q.id]?.[sIdx];
                      return (
                        <div key={sIdx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                          <span className="text-xs font-semibold text-slate-800">{sIdx + 1}. {st.statement}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => !isExamSubmitted && setExamAnswers({ ...examAnswers, [q.id]: { ...(examAnswers[q.id] || {}), [sIdx]: true } })}
                              disabled={isExamSubmitted}
                              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${uState === true ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                              Đúng
                            </button>
                            <button
                              type="button"
                              onClick={() => !isExamSubmitted && setExamAnswers({ ...examAnswers, [q.id]: { ...(examAnswers[q.id] || {}), [sIdx]: false } })}
                              disabled={isExamSubmitted}
                              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${uState === false ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                              Sai
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. Điền khuyết */}
                {q.type === 'fill_blank' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={examAnswers[q.id] || ''}
                      onChange={(e) => !isExamSubmitted && setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                      disabled={isExamSubmitted}
                      placeholder="Nhập từ hoặc cụm từ điền vào ô trống..."
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>
                )}

                {/* 5. Sắp xếp */}
                {q.type === 'ordering' && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-slate-500 italic">Sắp xếp các bước theo thứ tự logic:</p>
                    {(q.options || ['Bước 1', 'Bước 2', 'Bước 3']).map((item, oIdx) => (
                      <div key={oIdx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs font-medium">
                        <span>{oIdx + 1}. {item}</span>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">Thứ tự {oIdx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. Phân loại */}
                {q.type === 'classification' && (
                  <div className="space-y-2 pt-1">
                    {(q.classificationItems || [{ name: 'Vật phẩm mẫu', group: q.classificationGroups?.[0] || 'Nhóm 1' }]).map((ci, cIdx) => (
                      <div key={cIdx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{ci.name}</span>
                        <select
                          value={examAnswers[q.id]?.[cIdx] || ''}
                          onChange={(e) => !isExamSubmitted && setExamAnswers({ ...examAnswers, [q.id]: { ...(examAnswers[q.id] || {}), [cIdx]: e.target.value } })}
                          disabled={isExamSubmitted}
                          className="p-1.5 rounded-lg border border-slate-300 text-xs bg-slate-50 font-bold text-emerald-800"
                        >
                          <option value="">-- Chọn danh mục --</option>
                          {(q.classificationGroups || ['Tự nhiên', 'Công nghệ']).map((g, gIdx) => (
                            <option key={gIdx} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* 7. Tự luận */}
                {q.type === 'essay' && (
                  <div className="pt-1">
                    <textarea
                      rows={4}
                      value={examAnswers[q.id] || ''}
                      onChange={(e) => !isExamSubmitted && setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                      disabled={isExamSubmitted}
                      placeholder="Trình bày câu trả lời chi tiết của bạn..."
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>
                )}

                {isExamSubmitted && q.explanation && (
                  <div className="mt-2 p-2.5 bg-amber-50 rounded-lg text-[11px] text-amber-900 border border-amber-200">
                    💡 <strong>Hướng dẫn giải thích:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!isExamSubmitted && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setActiveTab('list')}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExamSubmit}
                className="px-7 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer transition-all"
              >
                Nộp Bài Thi
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assignment Modal */}
      {isAssignmentModalOpen && assignmentExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 font-heading">CẤU HÌNH PHÒNG THI & GIAO ĐỀ</h3>
                  <p className="text-xs text-indigo-600 font-semibold">Đề: {assignmentExam.title} • {assignmentExam.subject} {assignmentExam.grade}</p>
                </div>
              </div>
              <button 
                onClick={handleCloseAssignmentModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex p-4 gap-2 bg-slate-50/50">
              <button 
                onClick={() => setAssignmentTab('select_class')}
                className={`flex-1 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${assignmentTab === 'select_class' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <School className="w-4 h-4" /> CHỌN LỚP GIAO BÀI
              </button>
              <button 
                onClick={() => setAssignmentTab('settings')}
                className={`flex-1 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${assignmentTab === 'settings' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Settings className="w-4 h-4" /> THIẾT LẬP BÀI GIAO
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {assignmentTab === 'select_class' ? (
                <div className="space-y-5">
                  {/* Exam Info */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Thông tin đề gốc:</div>
                    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium flex-wrap">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>{assignmentExam.title}</span>
                      <span className="text-slate-300">|</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-xs font-semibold">{assignmentExam.subject}</span>
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-xs font-semibold">{assignmentExam.grade}</span>
                      <span className="text-slate-300">|</span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">{assignmentExam.questions.length} câu hỏi <span className="font-normal">Trắc nghiệm</span></span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 font-mono">ID: {assignmentExam.id}</div>
                  </div>

                  {/* Exam Type */}
                  <div className="p-4 rounded-2xl border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-700 uppercase mb-3">Loại bài kiểm tra *</div>
                    <div className="flex gap-3 flex-wrap">
                      {['Thường xuyên', 'Giữa kỳ 1', 'Cuối kỳ 1', 'Giữa kỳ 2', 'Cuối kỳ 2'].map(type => (
                        <label key={type} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${assignmentType === type ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                          <input 
                            type="radio" 
                            checked={assignmentType === type} 
                            onChange={() => setAssignmentType(type)}
                            className="text-indigo-600 focus:ring-indigo-500 rounded-full" 
                          />
                          <span className="text-sm">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Select Classes */}
                  <div className="p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] font-bold text-slate-700 uppercase">Chọn lớp/nhóm nhận đề * (Chọn nhiều lớp)</div>
                      <div className="flex gap-2">
                        <button onClick={() => setAssignmentClasses([...availableClasses])} className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 cursor-pointer transition-colors">Chọn tất cả</button>
                        <button onClick={() => setAssignmentClasses([])} className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer transition-colors">Bỏ chọn hết</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mb-4">
                      {availableClasses.map(cls => (
                        <label key={cls} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${assignmentClasses.includes(cls) ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                          <input 
                            type="checkbox" 
                            checked={assignmentClasses.includes(cls)} 
                            onChange={(e) => {
                              if (e.target.checked) setAssignmentClasses([...assignmentClasses, cls]);
                              else setAssignmentClasses(assignmentClasses.filter(c => c !== cls));
                            }}
                            className="text-emerald-500 focus:ring-emerald-500 rounded" 
                          />
                          <span className="text-sm">{cls}</span>
                        </label>
                      ))}
                    </div>
                    
                    {/* Selected Tags */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Đã chọn ({assignmentClasses.length} lớp):</span>
                      {assignmentClasses.length > 0 ? assignmentClasses.map(cls => (
                        <span key={cls} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1">
                          {cls} <button onClick={() => setAssignmentClasses(assignmentClasses.filter(c => c !== cls))} className="text-slate-400 hover:text-rose-500 cursor-pointer"><X className="w-3 h-3" /></button>
                        </span>
                      )) : <span className="text-xs text-slate-400 italic">Chưa chọn lớp nào</span>}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-1 text-[11px] font-bold text-slate-700 uppercase">
                      <Clock className="w-3.5 h-3.5" /> Thời lượng làm bài *
                    </div>
                    <div className="text-[10px] text-slate-500 mb-3">Học sinh đếm ngược khi làm bài</div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white w-32">
                        <button onClick={() => setAssignmentDuration(Math.max(1, assignmentDuration - 1))} className="px-3 py-2 text-slate-500 hover:bg-slate-100 font-bold cursor-pointer transition-colors">-</button>
                        <input 
                          type="number" 
                          value={assignmentDuration} 
                          onChange={(e) => setAssignmentDuration(Number(e.target.value))} 
                          className="w-full text-center py-2 text-sm font-bold text-slate-800 focus:outline-none"
                        />
                        <button onClick={() => setAssignmentDuration(assignmentDuration + 1)} className="px-3 py-2 text-slate-500 hover:bg-slate-100 font-bold cursor-pointer transition-colors">+</button>
                      </div>
                      
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        {[15, 30, 45, 60].map(mins => (
                          <button 
                            key={mins}
                            onClick={() => setAssignmentDuration(mins)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${assignmentDuration === mins ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                          >
                            {mins} phút
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-2">Tiêu đề bài giao *</label>
                    <input 
                      type="text" 
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Schedule */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/30">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={assignmentSchedule} onChange={(e) => setAssignmentSchedule(e.target.checked)} className="text-indigo-600 focus:ring-indigo-500 rounded w-4 h-4 cursor-pointer" />
                        <span className="text-sm font-bold text-slate-700">Lên lịch giao bài</span>
                      </label>
                      {assignmentSchedule && (
                        <DateTimePicker
                          value={assignmentScheduleDate}
                          onChange={setAssignmentScheduleDate}
                          placeholder="MM/DD/YYYY hh:mm A"
                        />
                      )}
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/30">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={assignmentDeadline} onChange={(e) => setAssignmentDeadline(e.target.checked)} className="text-indigo-600 focus:ring-indigo-500 rounded w-4 h-4 cursor-pointer" />
                        <span className="text-sm font-bold text-slate-700">Đặt hạn làm bài</span>
                      </label>
                      {assignmentDeadline && (
                        <DateTimePicker
                          value={assignmentDeadlineDate}
                          onChange={setAssignmentDeadlineDate}
                          placeholder="MM/DD/YYYY hh:mm A"
                        />
                      )}
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="p-4 rounded-2xl border border-slate-200 space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={assignmentAdvanced} onChange={(e) => setAssignmentAdvanced(e.target.checked)} className="text-indigo-600 focus:ring-indigo-500 rounded w-4 h-4 cursor-pointer" />
                      <span className="text-sm font-bold text-slate-700">Thiết lập nâng cao</span>
                    </label>
                    
                    {assignmentAdvanced && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6 pt-2">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-slate-600">Thời điểm mở đề</label>
                          <DateTimePicker
                            value={assignmentOpenTime}
                            onChange={setAssignmentOpenTime}
                            placeholder="MM/DD/YYYY hh:mm A"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 mb-2">
                            <input type="checkbox" checked={assignmentAllowRetry} onChange={(e) => setAssignmentAllowRetry(e.target.checked)} className="text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer" />
                            Cho phép làm lại
                          </label>
                          {assignmentAllowRetry && (
                            <div className="mt-2">
                              <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Giới hạn số lần làm bài</label>
                              <input type="number" value={assignmentRetryLimit} onChange={(e) => setAssignmentRetryLimit(Number(e.target.value))} className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500" />
                              <div className="text-[10px] text-slate-400 mt-1.5 italic">Ghi chú: Nhập 0 để không giới hạn số lần làm bài</div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                            <input type="checkbox" checked={assignmentShuffleQuestions} onChange={(e) => setAssignmentShuffleQuestions(e.target.checked)} className="text-indigo-600 focus:ring-indigo-500 rounded w-4 h-4 cursor-pointer" />
                            Đảo thứ tự câu hỏi
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                            <input type="checkbox" checked={assignmentShuffleAnswers} onChange={(e) => setAssignmentShuffleAnswers(e.target.checked)} className="text-indigo-600 focus:ring-indigo-500 rounded w-4 h-4 cursor-pointer" />
                            Đảo thứ tự đáp án
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Target */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 text-center uppercase tracking-wider border-b border-slate-200">
                      GIAO BÀI CHO
                    </div>
                    <div className="p-4 flex gap-6 justify-center bg-white">
                      <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent">
                        <input type="radio" checked={assignmentTarget === 'Cả lớp'} onChange={() => setAssignmentTarget('Cả lớp')} className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                        <span className="text-sm font-bold text-slate-700">Cả lớp</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent">
                        <input type="radio" checked={assignmentTarget === 'Từng thành viên'} onChange={() => setAssignmentTarget('Từng thành viên')} className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                        <span className="text-sm font-bold text-slate-700">Từng thành viên</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-3xl">
              <button 
                onClick={handleCloseAssignmentModal}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              {assignmentTab === 'select_class' ? (
                <button 
                  onClick={() => setAssignmentTab('settings')}
                  className="px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  Cấu hình thêm <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              ) : (
                <button 
                  onClick={() => setAssignmentTab('select_class')}
                  className="px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>
              )}
              
              {assignmentTab === 'settings' && (
                <button 
                  onClick={handleConfirmAssignment}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  Áp dụng cho lớp chọn
                </button>
              )}

              {assignmentTab === 'select_class' && (
                 <button 
                 onClick={handleConfirmAssignment}
                 className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
               >
                 Xác nhận & Giao đề <Rocket className="w-4 h-4" />
               </button>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Regrading Modal */}
      {regradingExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Chấm lại hàng loạt
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                    Đề thi: {regradingExam.title}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseRegrading}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {regradingState === 'confirm' ? (
                <div className="space-y-6">
                  {/* Stats Box */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-600">Tổng số câu hỏi:</span>
                      <span className="text-slate-800">{regradingExam.questions.length} câu</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-600">Số lượng bài làm được tìm thấy:</span>
                      <span className="text-teal-600">{regradingStats.totalSubmissions} bài làm</span>
                    </div>
                  </div>

                  {/* Warning Alert */}
                  <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-teal-800 mb-1">Lưu ý bảo toàn dữ liệu thật:</h4>
                      <p className="text-xs text-teal-700 leading-relaxed font-medium">
                        Hệ thống sẽ tải thông tin câu hỏi, đáp án, thang điểm mới nhất từ Firestore và tính toán lại điểm của từng bài làm từ đầu.
                        Hãy đảm bảo giáo trình và đáp án đã được cấu hình đúng trước khi bắt đầu.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end items-center gap-3 pt-2">
                    <button
                      onClick={handleCloseRegrading}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleStartRegrading}
                      className="px-6 py-2.5 rounded-xl text-sm font-extrabold bg-teal-500 hover:bg-teal-600 text-white shadow-md transition-colors"
                    >
                      Bắt đầu chấm lại bài
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Warning Alert (Progress) */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-center">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-amber-700">
                      Vui lòng không đóng cửa sổ hoặc tải lại trang trong khi hệ thống đang xử lý chấm lại hàng loạt.
                    </p>
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                      <span>Tiến trình xử lý: {regradingStats.processed} / {regradingStats.totalSubmissions} bài làm</span>
                      <span className="text-teal-600">
                        {regradingStats.totalSubmissions > 0 
                          ? Math.round((regradingStats.processed / regradingStats.totalSubmissions) * 100) 
                          : 100}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-500 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${regradingStats.totalSubmissions > 0 ? (regradingStats.processed / regradingStats.totalSubmissions) * 100 : 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Đã chấm</span>
                      <span className="text-xl font-black text-slate-800">{regradingStats.processed}</span>
                    </div>
                    <div className="p-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Thành công</span>
                      <span className="text-xl font-black text-emerald-600">{regradingStats.success}</span>
                    </div>
                    <div className="p-3 rounded-2xl border border-rose-100 bg-rose-50/50 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider mb-1">Thất bại</span>
                      <span className="text-xl font-black text-rose-600">{regradingStats.failed}</span>
                    </div>
                  </div>
                  
                  {/* Final Actions */}
                  {regradingStats.processed >= regradingStats.totalSubmissions && regradingStats.totalSubmissions > 0 && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleCloseRegrading}
                        className="px-6 py-2.5 rounded-xl text-sm font-extrabold bg-teal-500 hover:bg-teal-600 text-white shadow-md transition-colors animate-fade-in"
                      >
                        Hoàn tất
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Tracking Modal */}
      {trackingExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Theo dõi nộp bài kiểm tra
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {trackingExam.title} &bull; {trackingExam.targetClass ? (trackingExam.targetClass.startsWith('Lớp') ? trackingExam.targetClass : `Lớp ${trackingExam.targetClass}`) : 'Chưa giao lớp'}: <span className="font-bold text-slate-700">{trackingExam.totalStudents || 35} học sinh</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExportExcel(trackingExam)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
                >
                  <Download className="w-4 h-4" /> Xuất danh sách (Excel)
                </button>
                <button
                  onClick={() => { setTrackingExam(null); setTrackingActionMenuId(null); setSortScoreDirection(null); }}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 bg-slate-50/50 flex-1 overflow-hidden flex flex-col">
              {/* Filters */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                  <button
                    onClick={() => setTrackingFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${trackingFilter === 'all' ? 'bg-slate-100 text-slate-800 border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Tất cả (39)
                  </button>
                  <button
                    onClick={() => setTrackingFilter('need_manual')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${trackingFilter === 'need_manual' ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50/50'}`}
                  >
                    <AlertTriangle className="w-4 h-4" /> Cần chấm thủ công (2)
                  </button>
                </div>
                <div className="text-sm text-slate-500 font-medium">
                  Mẹo: Click vào nút <span className="font-bold text-slate-700">Thao tác</span> để Chấm bài thủ công hoặc Sửa điểm.
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50/80 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                      <th className="p-4 border-b border-slate-100 w-12 text-center">STT</th>
                      <th className="p-4 border-b border-slate-100">Mã HS</th>
                      <th className="p-4 border-b border-slate-100">Tên học sinh</th>
                      {Array.from({ length: trackingExam?.questions?.length || 5 }).map((_, qIdx) => (
                        <th key={qIdx} className="p-4 border-b border-slate-100 text-center text-slate-700 font-black">
                          CÂU {qIdx + 1}
                        </th>
                      ))}
                      <th 
                        onClick={handleToggleSortScore}
                        className={`p-4 border-b border-slate-100 text-center select-none cursor-pointer transition-colors ${
                          sortScoreDirection ? 'bg-indigo-50/80 hover:bg-indigo-100/70' : 'hover:bg-slate-100/70'
                        }`}
                        title={
                          sortScoreDirection === 'desc'
                            ? 'Đang sắp xếp: Điểm giảm dần (Cao → Thấp). Click để đổi sang Tăng dần.'
                            : sortScoreDirection === 'asc'
                            ? 'Đang sắp xếp: Điểm tăng dần (Thấp → Cao). Click để về mặc định.'
                            : 'Click để sắp xếp theo Tổng điểm (Giảm dần → Tăng dần → Mặc định)'
                        }
                      >
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <span className={sortScoreDirection ? 'text-indigo-800 font-black' : 'text-slate-600 font-black'}>
                            TỔNG ĐIỂM
                          </span>
                          {sortScoreDirection === 'desc' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-600 text-white font-black text-xs shadow-xs" title="Giảm dần">
                              <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                          ) : sortScoreDirection === 'asc' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-600 text-white font-black text-xs shadow-xs" title="Tăng dần">
                              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors" title="Chưa sắp xếp">
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="p-4 border-b border-slate-100 text-center">Số lần làm</th>
                      <th className="p-4 border-b border-slate-100 text-center">Thời gian nộp</th>
                      <th className="p-4 border-b border-slate-100">Ghi chú AI / Nhật ký</th>
                      <th className="p-4 border-b border-slate-100 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {sortedTrackingSubmissions.map((st, index) => {
                      const isWaiting = st.status === 'waiting' || st.totalScore === null;
                      return (
                        <tr 
                          key={st.id} 
                          className={`hover:bg-slate-50 transition-colors ${st.needManual ? 'bg-amber-50/20' : ''}`}
                        >
                          <td className="p-4 font-bold text-slate-500 text-center">{index + 1}</td>
                          <td className="p-4 font-bold text-fuchsia-700">{st.id}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{st.name}</span>
                              {st.badge && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-700 uppercase">
                                  <AlertTriangle className="w-3 h-3" /> {st.badge}
                                </span>
                              )}
                            </div>
                          </td>
                          {Array.from({ length: trackingExam?.questions?.length || 5 }).map((_, qIdx) => {
                            const ans = st.answers[qIdx] || 'none';
                            return (
                              <td key={qIdx} className="p-4 text-center">
                                {ans === 'pass' ? (
                                  <div className="w-6 h-6 mx-auto rounded bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                    <Check className="w-4 h-4" />
                                  </div>
                                ) : ans === 'fail' ? (
                                  <div className="w-6 h-6 mx-auto rounded bg-rose-50 text-rose-500 flex items-center justify-center">
                                    <X className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-4 text-center">
                            {!isWaiting ? (
                              <span className="inline-flex w-8 h-8 rounded-full border-2 border-indigo-200 bg-white items-center justify-center font-bold text-indigo-700 text-sm shadow-2xs">
                                {st.totalScore}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold">–</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {st.attempts !== null ? (
                              <span className="inline-flex w-6 h-6 rounded-full border-2 border-teal-200 bg-white items-center justify-center font-bold text-teal-700">
                                {st.attempts}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {!isWaiting ? (
                              <div className="inline-flex items-center gap-1 text-sky-600 font-bold bg-sky-50 px-2 py-1 rounded-lg">
                                <Clock className="w-3 h-3" /> {st.submittedTime}
                              </div>
                            ) : (
                              <span className="inline-flex px-2 py-1 bg-rose-50 text-rose-600 font-bold rounded-lg text-[10px] uppercase tracking-wider">
                                Chờ học sinh
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {st.aiNote ? (
                              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 max-w-[200px] whitespace-normal text-[10px] font-semibold flex gap-1.5 leading-snug">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
                                {st.aiNote}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="p-4 text-center relative">
                            <button 
                              onClick={() => setTrackingActionMenuId(trackingActionMenuId === st.id ? null : st.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {trackingActionMenuId === st.id && (
                              <div className="absolute right-10 top-0 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-50 animate-scale-up origin-top-right">
                                <button onClick={() => { setGradingStudent({ id: st.id, name: st.name }); setTrackingActionMenuId(null); }} className="w-full text-left px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer">
                                  <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm"><Edit3 className="w-3.5 h-3.5" /></div> Chấm bài
                                </button>
                                <button onClick={() => { setRetakeStudent({ id: st.id, name: st.name }); setTrackingActionMenuId(null); }} className="w-full text-left px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 transition-colors mt-0.5 cursor-pointer">
                                  <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm"><RotateCcw className="w-3.5 h-3.5" /></div> Cho thi lại
                                </button>
                                <button onClick={() => { setDeleteStudent({ id: st.id, name: st.name }); setTrackingActionMenuId(null); }} className="w-full text-left px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 transition-colors mt-0.5 cursor-pointer">
                                  <div className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm"><Trash2 className="w-3.5 h-3.5" /></div> Xóa bài
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Stats Modal */}
      {statsExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase">Thường xuyên</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">Khối {statsExam.grade}</span>
                  {statsExam.targetClass && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase">Lớp {statsExam.targetClass}</span>}
                </div>
                <h3 className="text-xl font-black text-slate-800">
                  Thống kê đề: {statsExam.title}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => alert('Đã tải xuống báo cáo Excel!')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
                >
                  <Download className="w-4 h-4" /> Xuất thống kê Excel
                </button>
                <button
                  onClick={() => setStatsExam(null)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-6 border-b border-slate-200 shrink-0">
              <button
                onClick={() => setStatsTab('performance')}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${statsTab === 'performance' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                Năng lực học sinh
              </button>
              <button
                onClick={() => setStatsTab('details')}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${statsTab === 'details' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                Chi tiết đúng sai
              </button>
              <button
                onClick={() => setStatsTab('questions')}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${statsTab === 'questions' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                Đánh giá câu hỏi
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto bg-slate-50 p-6">
              {statsTab === 'performance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-6">
                        <BarChart2 className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-black text-slate-700 text-sm uppercase">Biểu đồ phân bố khoảng điểm</h4>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { range: '1-2', value: 0 },
                            { range: '3-4', value: 0 },
                            { range: '5-6', value: 0 },
                            { range: '7-8', value: 0 },
                            { range: '9-10', value: 1 }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="range" axisLine={true} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                            <YAxis axisLine={true} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickCount={5} domain={[0, 1]} />
                            <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-5 h-5 text-emerald-500" />
                          <h4 className="font-black text-slate-700 text-sm uppercase">Bảng phân phối điểm số</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold">7 MỨC ĐIỂM</span>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 font-bold">Phân loại</th>
                              <th className="px-4 py-2 font-bold text-center">Số lượng</th>
                              <th className="px-4 py-2 font-bold text-right">Tỷ lệ (%)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                            {[
                              { label: 'Dưới 5 (0 đến 4)', count: 0, percentage: 0 },
                              { label: 'Điểm 5', count: 0, percentage: 0 },
                              { label: 'Điểm 6', count: 0, percentage: 0 },
                              { label: 'Điểm 7', count: 0, percentage: 0 },
                              { label: 'Điểm 8', count: 1, percentage: 100 },
                              { label: 'Điểm 9', count: 0, percentage: 0 },
                              { label: 'Điểm 10', count: 0, percentage: 0 }
                            ].map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3">{row.label}</td>
                                <td className="px-4 py-3 text-center">{row.count}</td>
                                <td className="px-4 py-3 text-right text-slate-900 font-bold">{row.percentage.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between h-32 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-600 text-sm uppercase">HS Điểm dưới 5</span>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">0 HS</span>
                      </div>
                      <div className="text-center text-slate-400 text-sm font-medium italic mt-4">Không có học sinh</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between h-32 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-600 text-sm uppercase">HS Điểm 5</span>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">0 HS</span>
                      </div>
                      <div className="text-center text-slate-400 text-sm font-medium italic mt-4">Không có học sinh</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between h-32 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-600 text-sm uppercase">HS Điểm 10</span>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">0 HS</span>
                      </div>
                      <div className="text-center text-slate-400 text-sm font-medium italic mt-4">Không có học sinh</div>
                    </div>
                  </div>
                </div>
              )}

              {statsTab === 'details' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-max">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-700 tracking-wide">
                        <th className="px-4 py-3 border border-slate-200 bg-slate-100">Học sinh</th>
                        {(statsExam.questions || []).map((_, idx) => (
                          <th key={idx} className="px-4 py-3 border border-slate-200 text-center w-16">Câu {idx + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 border border-slate-200 font-bold text-slate-800">Hà Việt Hoàng</td>
                        {(statsExam.questions || []).map((_, idx) => (
                          <td key={idx} className="px-4 py-3 border border-slate-200 text-center">
                            {idx < 7 ? (
                              <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-rose-500 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {statsTab === 'questions' && (
                <div className="space-y-3">
                  {(statsExam.questions || []).map((q, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
                      <div className="w-16 font-bold text-slate-700">Câu {idx + 1}</div>
                      <div className="flex-1">
                        <div className="h-3 w-full bg-emerald-500 rounded-full"></div>
                      </div>
                      <div className="flex items-center gap-6 text-xs text-right">
                        <div>
                          <div className="font-bold text-slate-500 mb-0.5">Tổng: 1</div>
                          <div className="font-medium text-emerald-600">Đúng: 1 (100.0%)</div>
                          <div className="font-medium text-rose-500">Sai: 0 (0.0%)</div>
                        </div>
                        <button 
                          onClick={() => setViewingQuestion(idx)}
                          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold transition-colors"
                        >
                          <Eye className="w-4 h-4" /> Xem
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Viewing Question Details Modal */}
      {viewingQuestion !== null && statsExam && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-lg">
                  {viewingQuestion + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black text-slate-800">
                      Câu {viewingQuestion + 1}: Chi tiết câu hỏi
                    </h3>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                      {statsExam.questions[viewingQuestion].type || 'Trắc nghiệm 1 đáp án'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    ID: CH-052 &bull; Câu {viewingQuestion + 1} / {statsExam.questions.length}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingQuestion((prev) => (prev !== null && prev < statsExam.questions.length - 1 ? prev + 1 : prev))}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  disabled={viewingQuestion === statsExam.questions.length - 1}
                >
                  Câu sau →
                </button>
                <button
                  onClick={() => setViewingQuestion(null)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto bg-slate-50 flex-1 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-sky-600">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Nội dung đề bài:</span>
                </div>
                <div className="text-base font-bold text-slate-800 leading-relaxed">
                  {statsExam.questions[viewingQuestion].content}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Cấu trúc câu hỏi & đáp án chuẩn</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {statsExam.questions[viewingQuestion].options?.map((opt, oIdx) => {
                      const isCorrect = String.fromCharCode(65 + oIdx) === (statsExam.questions[viewingQuestion].correctAnswer || 'A');
                      return (
                        <div key={oIdx} className={`relative p-3 rounded-xl border-2 flex items-center gap-3 ${isCorrect ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <div className="text-sm font-bold text-slate-700 break-words line-clamp-2 pr-16">{opt}</div>
                          {isCorrect && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-black text-white bg-emerald-500 px-2 py-1 rounded-md">
                              <Check className="w-3 h-3" /> ĐÚNG
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-3 bg-sky-500 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <BarChart2 className="w-4 h-4" />
                      Thống kê học sinh trả lời
                    </div>
                    <span className="text-[10px] bg-sky-600 px-2 py-0.5 rounded-full font-bold">Tổng: 0 em đã nộp</span>
                  </div>
                  <div className="p-4 flex-1 space-y-3">
                    {statsExam.questions[viewingQuestion].options?.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3 w-1/2">
                          <div className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <div className="text-xs font-semibold text-slate-700 truncate">{opt}</div>
                        </div>
                        <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
                          0 em (0%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-slate-700">Mẹo:</span> Giáo viên có thể bấm vào các câu hỏi khác trong danh sách để xem nhanh thống kê chi tiết.
              </div>
              <button
                onClick={() => setViewingQuestion(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Grading Modal */}
      {gradingStudent && trackingExam && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <ToggleRight className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-800">Chấm lại bài kiểm tra</h3>
              </div>
              <button
                onClick={() => setGradingStudent(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-auto flex-1 bg-white">
              <div className="p-5 border-b border-slate-100">
                <p className="text-xs font-bold text-blue-700 mb-4">Nội dung này do giáo viên tự biên soạn.</p>
                
                <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                  <h4 className="text-base font-black text-slate-800 mb-3">{gradingStudent.name} đã hoàn thành bài kiểm tra này!</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-sm font-medium text-slate-700 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-700 font-bold w-32">Số câu đúng:</span> 2
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-700 font-bold w-32">Tổng số câu hỏi:</span> 9
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-700 font-bold w-32">Điểm bài thi:</span> 4
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-700 font-bold w-32">Điểm thang 10:</span> <span className="font-black text-rose-600">4</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-700 font-bold w-32">Thời gian làm bài:</span> 2 phút, 21 giây
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-700 font-bold w-32">Thời gian nộp bài:</span> 10:17:01 15/8/2026
                    </div>
                  </div>
                  <button className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm">
                    Xóa bài làm này
                  </button>
                </div>

                <div className="mt-8">
                  <h4 className="text-lg font-black text-slate-800 mb-4">Bảng điểm</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-center text-xs whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600">
                          <th className="p-3 border-r border-slate-200 text-left bg-slate-100">Câu hỏi</th>
                          <th className="p-3 border-r border-slate-200 text-amber-600">1</th>
                          <th className="p-3 border-r border-slate-200 text-emerald-600">2</th>
                          <th className="p-3 border-r border-slate-200 text-slate-700">3</th>
                          <th className="p-3 border-r border-slate-200 text-indigo-600">4</th>
                          <th className="p-3 border-r border-slate-200 text-rose-600">5</th>
                          <th className="p-3 border-r border-slate-200 text-teal-600">6</th>
                          <th className="p-3 border-r border-slate-200 text-purple-600">7</th>
                          <th className="p-3 border-r border-slate-200 text-amber-600">8</th>
                          <th className="p-3 text-sky-600">9</th>
                        </tr>
                      </thead>
                      <tbody className="font-bold text-slate-700">
                        <tr className="border-b border-slate-200">
                          <td className="p-3 border-r border-slate-200 text-left font-bold text-slate-600 bg-slate-50">Điểm</td>
                          <td className="p-3 border-r border-slate-200">2.0</td>
                          <td className="p-3 border-r border-slate-200">0.0</td>
                          <td className="p-3 border-r border-slate-200">0.0</td>
                          <td className="p-3 border-r border-slate-200">0.0</td>
                          <td className="p-3 border-r border-slate-200">0.0</td>
                          <td className="p-3 border-r border-slate-200">0.0</td>
                          <td className="p-3 border-r border-slate-200">0.0</td>
                          <td className="p-3 border-r border-slate-200">0.0</td>
                          <td className="p-3">2.0</td>
                        </tr>
                        <tr>
                          <td className="p-3 border-r border-slate-200 text-left font-bold text-slate-600 bg-slate-50">Kết quả</td>
                          <td className="p-3 border-r border-slate-200"><CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                          <td className="p-3 border-r border-slate-200"><X className="w-4 h-4 text-rose-300 mx-auto" /></td>
                          <td className="p-3 border-r border-slate-200"><X className="w-4 h-4 text-rose-300 mx-auto" /></td>
                          <td className="p-3 border-r border-slate-200"><X className="w-4 h-4 text-rose-300 mx-auto" /></td>
                          <td className="p-3 border-r border-slate-200"><X className="w-4 h-4 text-rose-300 mx-auto" /></td>
                          <td className="p-3 border-r border-slate-200"><X className="w-4 h-4 text-rose-300 mx-auto" /></td>
                          <td className="p-3 border-r border-slate-200"><X className="w-4 h-4 text-rose-300 mx-auto" /></td>
                          <td className="p-3 border-r border-slate-200"><X className="w-4 h-4 text-rose-300 mx-auto" /></td>
                          <td className="p-3"><CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm font-bold">
                      <span className="text-emerald-700">Câu 1 (1.1đ):</span>
                      <span className="text-blue-600 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Đúng</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-3">Đâu là đối tượng tự nhiên có sẵn trong tự nhiên?</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                        <span className="text-sm text-slate-600">A. Chiếc quạt điện</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-emerald-500 ring-4 ring-emerald-50"><Check className="w-2.5 h-2.5 text-white" /></div>
                        <span className="text-sm font-bold text-emerald-700">B. Cây xanh</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                        <span className="text-sm text-slate-600">C. Bóng đèn điện</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-black text-slate-800">Duyệt bài học</h4>
                    <span className="px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-bold">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                      Chờ chấm điểm
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs font-medium text-slate-600 mb-6">
                    <div className="flex items-start gap-2">
                      <span className="w-28 shrink-0">Bài học:</span>
                      <span className="text-blue-600 font-bold hover:underline cursor-pointer">[Kiểm tra] bài 1: Tự nhiên và công nghệ</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-28 shrink-0">Người tạo:</span>
                      <span className="text-slate-800 font-bold">Nguyễn Thị Thú</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-28 shrink-0">Người duyệt:</span>
                      <span className="text-slate-800 font-bold">Hà Thị Tràm</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-28 shrink-0">Thời gian duyệt lần cuối:</span>
                      <span className="text-slate-800 font-bold">15 tháng 8 lúc 10:22</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Điểm số bài thi (Thang điểm 10):</label>
                      <input type="text" value="4" readOnly className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white" />
                      <p className="text-[10px] text-slate-500 mt-1.5">Khi thay đổi điểm số, điểm này sẽ trực tiếp ghi đè lên kết quả AI chấm tự động.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Trạng thái duyệt:</label>
                      <div className="w-full border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2 bg-slate-50">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="font-bold text-slate-700 text-sm">Người duyệt cuối cùng: Đặng Văn Hùng</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">Hệ thống ghi nhận điểm đã được duyệt thủ công.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Nhận xét cho bài học:</label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col">
                      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <button className="p-1 hover:bg-slate-200 rounded"><ChevronLeft className="w-4 h-4" /></button>
                          <button className="p-1 hover:bg-slate-200 rounded"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <button className="hover:bg-slate-200 px-1.5 py-0.5 rounded">Σ</button>
                          <button className="hover:bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1"><FileText className="w-3 h-3" /> Text LaTeX</button>
                          <button className="hover:bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">Normal <ChevronDown className="w-3 h-3" /></button>
                          <button className="hover:bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">Arial <ChevronDown className="w-3 h-3" /></button>
                          <button className="hover:bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">15 px <ChevronDown className="w-3 h-3" /></button>
                        </div>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <div className="flex items-center gap-1 text-xs font-bold">
                          <button className="hover:bg-slate-200 w-6 h-6 rounded flex items-center justify-center">B</button>
                          <button className="hover:bg-slate-200 w-6 h-6 rounded flex items-center justify-center italic">I</button>
                          <button className="hover:bg-slate-200 w-6 h-6 rounded flex items-center justify-center underline">U</button>
                          <button className="hover:bg-slate-200 w-6 h-6 rounded flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                          </button>
                          <button className="hover:bg-slate-200 w-6 h-6 rounded flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-yellow-200 border border-yellow-400"></div>
                          </button>
                        </div>
                      </div>
                      <div className="p-4 text-sm text-slate-800 min-h-[120px] font-medium leading-relaxed">
                        👋 Khen ngợi em đã hoàn thành đúng 5/9 câu. Em làm rất tốt các câu: Câu 1, Câu 2, Câu 5, Câu 7, Câu 9.<br/>
                        ⚠️ Em cần lưu ý xem lại bài và ôn tập kỹ hơn ở các câu chưa chính xác: Câu 3, Câu 4, Câu 6, Câu 8.
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
              <button
                onClick={() => setGradingStudent(null)}
                className="px-6 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm rounded-xl transition-colors"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Retake Confirmation Modal */}
      {retakeStudent && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col animate-scale-up border border-slate-200">
            <div className="bg-indigo-600 p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Xác nhận cho thi lại</h3>
            </div>
            
            <div className="p-6">
              <p className="text-sm font-bold text-slate-700 leading-relaxed text-center">
                Bạn có chắc chắn muốn cho học sinh <span className="text-indigo-600">{retakeStudent.name}</span> thi lại không?
              </p>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-3 bg-slate-50">
              <button
                onClick={() => setRetakeStudent(null)}
                className="px-5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm rounded-xl transition-colors shadow-sm bg-white"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => { setRetakeStudent(null); alert('Đã cho phép học sinh thi lại'); }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete Exam Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingExam}
        onClose={() => setDeletingExam(null)}
        onConfirm={() => {
          if (deletingExam) {
            if (!isExamOwner(deletingExam)) {
              alert('Bạn không có quyền xóa nội dung này!');
              setDeletingExam(null);
              return;
            }
            onDeleteExam(deletingExam.id);
            setDeletingExam(null);
          }
        }}
        title="Xác nhận xóa bộ đề kiểm tra"
        itemType="bộ đề kiểm tra"
        itemName={deletingExam?.title}
      />

      {/* Delete Student Submission Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteStudent}
        onClose={() => setDeleteStudent(null)}
        onConfirm={() => {
          setDeleteStudent(null);
        }}
        title="Xác nhận xóa bài làm của học sinh"
        itemType="kết quả bài làm của học sinh"
        itemName={deleteStudent?.name}
        description={`Thầy/Cô có chắc chắn muốn xóa vĩnh viễn kết quả bài thi của học sinh "${deleteStudent?.name}" không? Dữ liệu điểm và câu trả lời sẽ không thể khôi phục.`}
      />

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
