import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Filter,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  Mail,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Plus,
  ChevronRight,
  Award,
  FileText,
  Sparkles,
  Phone,
  Calendar,
  UserCheck,
  Download,
  Printer,
  Upload,
  FileSpreadsheet,
  CloudUpload,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Home,
  Settings,
  User,
  ThumbsUp,
  Bot,
  Send,
  Database,
  School,
  BookMarked,
  Info,
  Eye
} from 'lucide-react';
import { UserAccount, UserRole, StudentRecord } from '../../types';
import { PRIMARY_SCHOOL_SUBJECTS } from '../../services/mockData';
import { STANDARD_GRADE_SUBJECTS } from '../../services/classStorageService';
import {
  downloadStudentImportTemplate,
  exportStudentCredentialsExcel,
  importStudentsFromExcel,
  parseStudentExcel,
  STANDARD_STUDENT_HEADERS
} from '../../services/excelService';
import {
  getAllStudentsFromLocalStorage,
  getStudentsFromLocalStorage,
  saveStudentsToLocalStorage,
  saveAllStudentsToLocalStorage,
  syncClassStudentsToFirestore,
  deleteStudentPermanently,
  deleteAllStudentsInClassPermanently,
  fetchClassStudentsFromFirestore,
  fetchAllStudentsFromFirestore,
  subscribeToFirestoreClassStudents,
  getStandardClassName,
  normalizeClassKey,
  getDefault5BRoster,
  sortStudentsByNameAZ,
  sortStudentsByNameZA,
  sortStudentsDescending,
  sortStudentsAscending,
  deduplicateAndNormalizeStudents
} from '../../services/studentStorageService';
import {
  getTeachersFromLocalStorage,
  saveTeachersToLocalStorage,
  syncTeachersToFirestore,
  fetchTeachersFromFirestore,
  deduplicateTeachers,
  generateNextTeacherId,
  deleteTeacherPermanently,
  TEACHER_DEPARTMENTS,
  DEPARTMENTS_METADATA,
  normalizeDepartmentName,
  resolveCurrentTeacherProfile
} from '../../services/teacherStorageService';
import { db, auth } from '../../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, deleteDoc, updateDoc, getDocs, collection, onSnapshot } from 'firebase/firestore';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

export interface TeacherRecord {
  id: string;
  name: string;            // Họ và tên giáo viên (Ví dụ: Cô Hà Thị Trâm)
  email: string;           // Thư điện tử liên hệ
  role: string;            // Vai trò (Tổ trưởng, Giáo viên, Hiệu trưởng...)
  subject: string;         // Môn học phụ trách
  status: 'active' | 'locked'; // Trạng thái hoạt động
  dob?: string;            // Ngày sinh (dd/mm/yyyy)
  phone?: string;          // Số điện thoại liên hệ (SĐT)
  sddcn?: string;          // Số định danh cá nhân (CCCD/CMND)
  toChuyenMon: string;     // Tổ chuyên môn (Tổ 1, Tổ 2+3, Tổ 4+5, Tổ Chuyên biệt)
  nhomGvCn?: string;       // Nhóm Giáo viên chủ nhiệm / Phụ trách khối (Ví dụ: GV Chủ nhiệm Lớp 3A, GV Khối 3)
  homeroomClasses?: string[]; // Danh sách lớp chủ nhiệm
  teachingClasses?: string[]; // Danh sách lớp giảng dạy bộ môn
  avatar?: string;         // Đường dẫn ảnh hoặc icon linh vật
  teachingAssignments?: Array<{ subject: string; classes: string[] }>; // Danh sách cặp môn học - các lớp giảng dạy
}

// Danh sách dữ liệu giáo viên chi tiết toàn trường:
export const initialTeachersList: TeacherRecord[] = [];

interface UserManagementModuleProps {
  users: UserAccount[];
  onSaveUser: (user: UserAccount) => void;
  onDeleteUser: (id: string) => void;
  userRole: UserRole;
}

// Block definition
interface BlockConfig {
  id: string;
  name: string;
  color: string;
  icon: string;
  totalClasses: number;
  totalStudents: number;
  male: number;
  female: number;
}

const BLOCKS_CONFIG: BlockConfig[] = [
  {
    id: '3',
    name: 'Khối 3',
    color: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white',
    icon: '🍀',
    totalClasses: 0,
    totalStudents: 0,
    male: 0,
    female: 0
  }
];

// Classes config per block matching Firestore schema
export interface ClassConfig {
  id: string;
  name: string;
  grade: string;
  room?: string;
  homeroomTeacher?: string;
  homeroomTeacherId?: string;
  subjects?: Array<{ isVisible: boolean; subjectName: string }>;
}

export const INITIAL_CLASSES: ClassConfig[] = [];

const getClassesFromLocalStorage = (): ClassConfig[] => {
  const data = localStorage.getItem('eduplay_classes_config');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {}
  }
  return [];
};

const saveClassesToLocalStorage = (classes: ClassConfig[]) => {
  localStorage.setItem('eduplay_classes_config', JSON.stringify(classes));
};

// Animal Avatar Preset URLs & SVGs
const FOX_AVATAR_URL = 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=120&auto=format&fit=crop&q=80';
const RABBIT_AVATAR_URL = 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=120&auto=format&fit=crop&q=80';
const LION_AVATAR_URL = 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=120&auto=format&fit=crop&q=80';
const PANDA_AVATAR_URL = 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef9?w=120&auto=format&fit=crop&q=80';
const CAT_AVATAR_URL = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80';

// SVG Data URIs for offline/fallback rendering
const FOX_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23FF6B35"/><polygon points="15,15 40,40 10,35" fill="%23D04010"/><polygon points="85,15 60,40 90,35" fill="%23D04010"/><polygon points="20,20 35,38 15,32" fill="%23FFF"/><polygon points="80,20 65,38 85,32" fill="%23FFF"/><circle cx="35" cy="48" r="6" fill="%23222"/><circle cx="65" cy="48" r="6" fill="%23222"/><circle cx="37" cy="46" r="2" fill="%23FFF"/><circle cx="67" cy="46" r="2" fill="%23FFF"/><polygon points="50,60 40,50 60,50" fill="%23222"/><path d="M25 58 Q50 90 75 58" fill="%23FFF"/></svg>`;
const RABBIT_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="55" r="40" fill="%23E2E8F0"/><ellipse cx="35" cy="20" rx="10" ry="25" fill="%23E2E8F0"/><ellipse cx="65" cy="20" rx="10" ry="25" fill="%23E2E8F0"/><ellipse cx="35" cy="20" rx="6" ry="18" fill="%23F472B6"/><ellipse cx="65" cy="20" rx="6" ry="18" fill="%23F472B6"/><circle cx="38" cy="50" r="5" fill="%23222"/><circle cx="62" cy="50" r="5" fill="%23222"/><ellipse cx="50" cy="58" rx="4" ry="3" fill="%23F472B6"/></svg>`;
const LION_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%23F59E0B"/><circle cx="50" cy="50" r="34" fill="%23FCD34D"/><circle cx="38" cy="45" r="5" fill="%23222"/><circle cx="62" cy="45" r="5" fill="%23222"/><ellipse cx="50" cy="54" rx="5" ry="4" fill="%2378350F"/></svg>`;
const PANDA_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="%23FFFFFF" stroke="%23333333" stroke-width="3"/><circle cx="20" cy="22" r="14" fill="%23222"/><circle cx="80" cy="22" r="14" fill="%23222"/><ellipse cx="36" cy="46" rx="10" ry="12" fill="%23222"/><ellipse cx="64" cy="46" rx="10" ry="12" fill="%23222"/><circle cx="38" cy="44" r="4" fill="%23FFF"/><circle cx="62" cy="44" r="4" fill="%23FFF"/><ellipse cx="50" cy="60" rx="6" ry="4" fill="%23222"/></svg>`;
const CAT_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="52" r="42" fill="%23F1F5F9"/><polygon points="20,15 42,35 12,38" fill="%2394A3B8"/><polygon points="80,15 58,35 88,38" fill="%2394A3B8"/><circle cx="36" cy="48" r="6" fill="%230EA5E9"/><circle cx="64" cy="48" r="6" fill="%230EA5E9"/><polygon points="50,58 45,54 55,54" fill="%23F472B6"/></svg>`;

// Resolve avatar string to corresponding cute animal illustration URL or custom image
const resolveAvatarUrl = (avatarStr: string | undefined): string => {
  if (!avatarStr) return FOX_AVATAR_URL;
  if (avatarStr.startsWith('data:image')) return avatarStr;

  const lower = avatarStr.toLowerCase();
  if (
    lower.includes('cáo') ||
    lower.includes('fox') ||
    avatarStr === FOX_AVATAR_URL ||
    avatarStr.includes('photo-1570295999919-56ceb5ecca61') ||
    avatarStr.includes('photo-1539571696357-5a69c17a67c6')
  ) {
    return FOX_AVATAR_URL;
  }
  if (
    lower.includes('thỏ') ||
    lower.includes('rabbit') ||
    avatarStr === RABBIT_AVATAR_URL ||
    avatarStr.includes('photo-1535713875002-d1d0cf377fde') ||
    avatarStr.includes('photo-1517841905240-472988babdf9')
  ) {
    return RABBIT_AVATAR_URL;
  }
  if (
    lower.includes('sư tử') ||
    lower.includes('lion') ||
    avatarStr === LION_AVATAR_URL ||
    avatarStr.includes('photo-1580489944761-15a19d654956')
  ) {
    return LION_AVATAR_URL;
  }
  if (
    lower.includes('gấu trúc') ||
    lower.includes('panda') ||
    avatarStr === PANDA_AVATAR_URL ||
    avatarStr.includes('photo-1534528741775-53994a69daeb')
  ) {
    return PANDA_AVATAR_URL;
  }
  if (
    lower.includes('mèo') ||
    lower.includes('cat') ||
    avatarStr === CAT_AVATAR_URL ||
    avatarStr.includes('photo-1494790108377-be9c29b29330')
  ) {
    return CAT_AVATAR_URL;
  }

  return avatarStr;
};

const getAvatarSvgFallback = (avatarStr: string | undefined): string => {
  const resolved = resolveAvatarUrl(avatarStr);
  if (resolved === FOX_AVATAR_URL) return FOX_SVG;
  if (resolved === RABBIT_AVATAR_URL) return RABBIT_SVG;
  if (resolved === LION_AVATAR_URL) return LION_SVG;
  if (resolved === PANDA_AVATAR_URL) return PANDA_SVG;
  if (resolved === CAT_AVATAR_URL) return CAT_SVG;
  return FOX_SVG;
};

// Helper to remove Vietnamese accent tones for clean email generation
const toSlugName = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, '');
};

// Helper to extract clean class slug prefix (e.g. "Lớp 3A" -> "3a", "Lớp 4B" -> "4b", "5A" -> "5a")
export const getClassCodePrefix = (className: string): string => {
  const slug = toSlugName(className);
  return slug.replace(/^lop/, '') || '3a';
};

// Auto-generate Student ID according to rule: {tên_lớp_viết_thường_không_dấu_khoảng_trắng}{stt}
export const generateStudentCode = (className: string, stt: number): string => {
  const prefix = getClassCodePrefix(className);
  return `${prefix}${stt}`;
};

// Re-index STT and regenerate Student Code for a class roster with deduplication and unique keys
export const reindexClassStudents = (students: StudentRecord[], className: string): StudentRecord[] => {
  return deduplicateAndNormalizeStudents(students, className);
};

// Helper to generate mock students
const generateMockStudents = (className: string, totalCount: number, maleCount: number): StudentRecord[] => {
  if (totalCount === 0) return [];
  
  const maleNames = [
    'Nguyễn Văn An', 'Trần Đức Bảo', 'Lê Minh Cường', 'Phạm Quốc Dũng', 'Hoàng Văn Đức',
    'Vũ Gia Huy', 'Bùi Hoàng Nam', 'Đỗ Minh Triết', 'Ngô Thành Vinh', 'Trịnh Đức Anh',
    'Đặng Bảo Nam', 'Võ Văn Kiệt', 'Nguyễn Nhật Minh', 'Phạm Hải Đăng', 'Dương Quốc Trung',
    'Nguyễn Khánh Nam', 'Đào Minh Quân', 'Hồ Văn Hùng', 'Nguyễn Gia Bảo', 'Trịnh Hoàng Long',
    'Lương Văn Phúc', 'Mai Xuân Lộc', 'Cao Văn Thắng', 'Phan Văn Hải', 'Trần Tuấn Kiệt'
  ];
  const femaleNames = [
    'Lê Thị Mai', 'Trần Phương Thảo', 'Phạm Ngọc Anh', 'Nguyễn Khánh Linh', 'Hoàng Thùy Linh',
    'Bùi Bảo Ngọc', 'Đỗ Quỳnh Anh', 'Ngô Thanh Hà', 'Vũ Phương Anh', 'Trịnh Thu Hà',
    'Nguyễn Hoài An', 'Đặng Linh Chi', 'Võ Minh Châu', 'Nguyễn Ngọc Mai', 'Phạm Yến Nhi',
    'Hoàng Mỹ Duyên', 'Đào Thị Hồng', 'Trịnh Bảo Trang', 'Bùi Ngọc Yến', 'Vũ Thị Dung'
  ];

  const animalPresetUrls = [FOX_AVATAR_URL, RABBIT_AVATAR_URL, LION_AVATAR_URL, PANDA_AVATAR_URL, CAT_AVATAR_URL];

  const students: StudentRecord[] = [];
  let maleIdx = 0;
  let femaleIdx = 0;

  for (let i = 1; i <= totalCount; i++) {
    const isMale = i <= maleCount;
    const name = isMale
      ? maleNames[maleIdx++ % maleNames.length]
      : femaleNames[femaleIdx++ % femaleNames.length];
    
    const gender: 'Nam' | 'Nữ' = isMale ? 'Nam' : 'Nữ';
    const day = String((i % 28) + 1).padStart(2, '0');
    const month = String((i % 12) + 1).padStart(2, '0');
    const year = className.includes('1') ? '2018' : className.includes('2') ? '2017' : className.includes('3') ? '2016' : className.includes('4') ? '2015' : '2014';
    const score = 0;

    // Generate SĐDCN (12 digits e.g. 038316001001)
    const sddcn = `03831600${String(1000 + i).slice(-4)}`;

    // Generate phone number (matching exact sample phones for first items)
    let phone = `098${Math.floor(1000000 + ((i * 3571) % 8999999)).toString().padStart(7, '0')}`;
    if (i === 1) phone = '0982957979';
    if (i === 2) phone = '0985608063';
    if (i === 3) phone = '0987763745';
    if (i === 4) phone = '0985438563';

    // Generate email (matching prompt standard e.g. hs.nguyenvanan@quanghungpk1.edu.vn)
    const slug = toSlugName(name);
    const email = i === 1 ? 'hs.nguyenvanan@quanghungpk1.edu.vn' : `hs.${slug}@quanghungpk1.edu.vn`;

    students.push({
      id: `std-${className.replace(/\s+/g, '')}-${i}`,
      stt: i,
      code: generateStudentCode(className, i),
      pin: '123456',
      sddcn,
      name,
      gender,
      dob: `${day}/${month}/${year}`,
      className,
      parentName: `${isMale ? 'Nguyễn' : 'Trần'} Văn ${name.split(' ').slice(-1)[0]}`,
      phone,
      email,
      status: 'active',
      conduct: i % 7 === 0 ? 'Khá' : 'Tốt',
      avgScore: score,
      notes: i % 3 === 0 ? 'Phát biểu hăng hái, hòa đồng' : 'Ngoan ngoãn, hoàn thành bài tập đầy đủ',
      avatar: animalPresetUrls[(i - 1) % animalPresetUrls.length]
    });
  }
  return students;
};

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({
  users,
  onSaveUser,
  onDeleteUser,
  userRole
}) => {
  // Main Tab: 'students' vs 'teachers'
  const [mainTab, setMainTab] = useState<'students' | 'teachers'>('students');
  
  // User Authentication & RBAC Resolution
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => auth?.currentUser || null);
  const [authEmail, setAuthEmail] = useState<string>(() => {
    if (auth?.currentUser?.email) return auth.currentUser.email;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('eduplay_teacher_email') || localStorage.getItem('user_email') || '';
    }
    return '';
  });

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user?.email) {
        setAuthEmail(user.email);
      }
    });
    return () => unsub();
  }, []);

  // Teachers State list with persistent cache and deduplication
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>(() => {
    return getTeachersFromLocalStorage();
  });
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);

  // Sync teachers with Firestore and listen to global events
  useEffect(() => {
    // 1. Initial cleanup / deduplication check
    const deduped = deduplicateTeachers(teachersList);
    if (deduped.length !== teachersList.length) {
      setTeachersList(deduped);
      saveTeachersToLocalStorage(deduped);
    }

    // 2. Fetch from Firestore in background
    fetchTeachersFromFirestore().then((remoteTeachers) => {
      const list = remoteTeachers && remoteTeachers.length > 0 ? deduplicateTeachers(remoteTeachers) : [];
      setTeachersList(list);
      saveTeachersToLocalStorage(list);
    });

    // 3. Listen to external updates
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail.teachers)) {
        setTeachersList(deduplicateTeachers(e.detail.teachers));
      } else {
        setTeachersList(getTeachersFromLocalStorage());
      }
    };
    window.addEventListener('teacher-data-updated', handleUpdate);
    window.addEventListener('eduplay_teachers_updated', handleUpdate);
    return () => {
      window.removeEventListener('teacher-data-updated', handleUpdate);
      window.removeEventListener('eduplay_teachers_updated', handleUpdate);
    };
  }, []);

  const activeTeacherProfile = useMemo(() => {
    const baseProfile = resolveCurrentTeacherProfile(authEmail);
    const candidateName = (
      currentUser?.displayName ||
      (typeof window !== 'undefined' ? (localStorage.getItem('eduplay_teacher_name') || localStorage.getItem('user_name')) : '') ||
      baseProfile.name ||
      ''
    ).trim().toLowerCase();

    if (teachersList && teachersList.length > 0) {
      const matched = teachersList.find(t =>
        (authEmail && t.email && t.email.toLowerCase().trim() === authEmail.toLowerCase().trim()) ||
        (candidateName && t.name && (t.name.trim().toLowerCase() === candidateName || candidateName.includes(t.name.trim().toLowerCase()) || t.name.trim().toLowerCase().includes(candidateName))) ||
        (baseProfile.id && t.id === baseProfile.id)
      );

      if (matched) {
        const isAdmin = (matched.role || '').toLowerCase().includes('quản trị') ||
                        (matched.role || '').toLowerCase().includes('admin') ||
                        (matched.role || '').toLowerCase().includes('hiệu trưởng') ||
                        userRole === 'admin';
        return {
          id: matched.id,
          name: matched.name,
          email: matched.email || authEmail || baseProfile.email,
          role: matched.role || (isAdmin ? 'Quản trị viên (ADMIN)' : 'Giáo viên bộ môn'),
          userRole: (isAdmin ? 'admin' : 'teacher') as UserRole,
          toChuyenMon: matched.toChuyenMon,
          subject: matched.subject,
          phone: matched.phone,
          avatar: matched.avatar || '👩‍🏫',
          homeroomClasses: matched.homeroomClasses,
          teachingClasses: matched.teachingClasses
        };
      }
    }
    return baseProfile;
  }, [authEmail, currentUser, teachersList, userRole]);

  const isSystemAdmin = userRole === 'admin' || activeTeacherProfile.userRole === 'admin';

  const [classesList, setClassesList] = useState<ClassConfig[]>(() => getClassesFromLocalStorage());
  const [editingClass, setEditingClass] = useState<ClassConfig | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassConfig | null>(null);

  // Student Navigation State
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null); // '1', '2', '3', '4', '5'
  const [selectedClass, setSelectedClass] = useState<string | null>(null); // e.g. 'Lớp 3A'
  const [classSubTab, setClassSubTab] = useState<'roster' | 'gradebook'>('roster');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Local student records state with LocalStorage & Firestore persistence
  const [studentDatabase, setStudentDatabase] = useState<Record<string, StudentRecord[]>>(() => {
    return getAllStudentsFromLocalStorage();
  });
  const [isStudentsLoading, setIsStudentsLoading] = useState<boolean>(true);

  // 1. Initial Mount Sync: Load from LocalStorage and setup real-time Firestore listeners
  useEffect(() => {
    const localDb = getAllStudentsFromLocalStorage();
    if (Object.keys(localDb).length > 0) {
      setStudentDatabase(localDb);
      setIsStudentsLoading(false);
    }

    // Proactively fetch all class rosters in parallel from Firestore to prevent timing issues
    fetchAllStudentsFromFirestore()
      .then((remoteDb) => {
        if (remoteDb && Object.keys(remoteDb).length > 0) {
          setStudentDatabase((prev) => ({
            ...prev,
            ...remoteDb
          }));
        }
        setIsStudentsLoading(false);
      })
      .catch(() => {
        setIsStudentsLoading(false);
      });

    let unsubClasses: (() => void) | null = null;
    let unsubRosters: (() => void) | null = null;
    let unsubStudents: (() => void) | null = null;

    if (db) {
      // 1. Real-time listener for 'classes' collection
      unsubClasses = onSnapshot(
        collection(db, 'classes'),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudClasses: ClassConfig[] = [];
            const seenKeys = new Set<string>();
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const rawId = (docSnap.id || data.id || data.classId || '').trim();
              const rawName = data.name || data.className || rawId || 'Lớp mới';
              const stdName = getStandardClassName(rawName);
              const upperKey = stdName.replace(/^Lớp\s*/i, '').trim().toUpperCase() || rawId.toUpperCase();
              
              if (!seenKeys.has(upperKey)) {
                seenKeys.add(upperKey);
                cloudClasses.push({
                  id: upperKey,
                  grade: data.grade || 'Khối 1',
                  name: stdName,
                  room: data.room || '',
                  homeroomTeacher: data.homeroomTeacher || '',
                  homeroomTeacherId: data.homeroomTeacherId || '',
                  subjects: Array.isArray(data.subjects) && data.subjects.length > 0
                    ? data.subjects
                    : (STANDARD_GRADE_SUBJECTS[data.grade || 'Khối 1'] || PRIMARY_SCHOOL_SUBJECTS).map((s) => ({ isVisible: true, subjectName: s }))
                });
              }
            });
            if (cloudClasses.length > 0) {
              setClassesList(cloudClasses);
              saveClassesToLocalStorage(cloudClasses);
            }
          }
        },
        (err) => console.warn('Error listening to classes in Firestore:', err)
      );

      // 2. Real-time listener for 'class_rosters' collection (robust dual-key normalization)
      unsubRosters = onSnapshot(
        collection(db, 'class_rosters'),
        (snapshot) => {
          const cloudRosters: Record<string, StudentRecord[]> = {};
          if (!snapshot.empty) {
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const rawName = (data.className || data.name || data.classKey || data.id || docSnap.id || '').trim();
              if (rawName) {
                const stdName = getStandardClassName(rawName);
                const upperKey = normalizeClassKey(rawName);
                const studentList = Array.isArray(data.students)
                  ? data.students
                  : (Array.isArray(data.studentList) ? data.studentList : (Array.isArray(data.roster) ? data.roster : []));
                if (Array.isArray(studentList)) {
                  const cleaned = deduplicateAndNormalizeStudents(studentList as StudentRecord[], stdName);
                  cloudRosters[stdName] = cleaned;
                  cloudRosters[upperKey] = cleaned;
                }
              }
            });
          }
          if (Object.keys(cloudRosters).length > 0) {
            setStudentDatabase((prev) => ({
              ...prev,
              ...cloudRosters
            }));
            saveAllStudentsToLocalStorage(cloudRosters);
          }
          setIsStudentsLoading(false);
        },
        (err) => {
          console.warn('Error listening to class_rosters in Firestore:', err);
          setIsStudentsLoading(false);
        }
      );

      // 3. Real-time listener for 'students' collection (if individual student docs exist)
      unsubStudents = onSnapshot(
        collection(db, 'students'),
        (snapshot) => {
          if (!snapshot.empty) {
            const individualStudentsByClass: Record<string, StudentRecord[]> = {};
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as StudentRecord;
              const cls = data.className || (data as any).class || (data as any).classId || (data as any).lop;
              if (cls) {
                const stdName = getStandardClassName(cls);
                if (!individualStudentsByClass[stdName]) {
                  individualStudentsByClass[stdName] = [];
                }
                individualStudentsByClass[stdName].push({
                  ...data,
                  id: docSnap.id
                });
              }
            });
            if (Object.keys(individualStudentsByClass).length > 0) {
              setStudentDatabase((prev) => {
                const updated = { ...prev };
                Object.entries(individualStudentsByClass).forEach(([cName, stList]) => {
                  const upperKey = normalizeClassKey(cName);
                  const existing = updated[cName] || [];
                  const mergedMap = new Map<string, StudentRecord>();
                  existing.forEach((s) => mergedMap.set(s.id, s));
                  stList.forEach((s) => mergedMap.set(s.id, s));
                  const cleaned = deduplicateAndNormalizeStudents(Array.from(mergedMap.values()), cName);
                  updated[cName] = cleaned;
                  updated[upperKey] = cleaned;
                });
                saveAllStudentsToLocalStorage(updated);
                return updated;
              });
            }
          }
        },
        (err) => console.warn('Error listening to students collection in Firestore:', err)
      );
    }

    // Listen to live updates from other components / tabs
    const handleUpdateEvent = () => {
      const updatedDb = getAllStudentsFromLocalStorage();
      setStudentDatabase((prev) => ({
        ...prev,
        ...updatedDb
      }));
    };
    window.addEventListener('student-data-updated', handleUpdateEvent);
    window.addEventListener('eduplay_students_updated', handleUpdateEvent);

    return () => {
      window.removeEventListener('student-data-updated', handleUpdateEvent);
      window.removeEventListener('eduplay_students_updated', handleUpdateEvent);
      if (unsubClasses) unsubClasses();
      if (unsubRosters) unsubRosters();
      if (unsubStudents) unsubStudents();
    };
  }, []);

  // 2. Class Selection Sync: When user selects a class, fetch from Firestore if empty in state
  useEffect(() => {
    if (!selectedClass) return;

    const currentRoster = studentDatabase[selectedClass];
    if (!currentRoster || currentRoster.length === 0) {
      const cached = getStudentsFromLocalStorage(selectedClass);
      if (cached && cached.length > 0) {
        setStudentDatabase((prev) => ({
          ...prev,
          [selectedClass]: cached
        }));
      } else {
        // Try fetching from Firestore first to preserve any imported data
        fetchClassStudentsFromFirestore(selectedClass).then((firestoreStudents) => {
          if (firestoreStudents && firestoreStudents.length > 0) {
            setStudentDatabase((prev) => ({
              ...prev,
              [selectedClass]: firestoreStudents
            }));
          } else {
            setStudentDatabase((prev) => ({
              ...prev,
              [selectedClass]: []
            }));
            saveStudentsToLocalStorage(selectedClass, []);
          }
        }).catch(() => {
          setStudentDatabase((prev) => ({
            ...prev,
            [selectedClass]: []
          }));
        });
      }
    }
  }, [selectedClass]);

  // Student search & filter & sort state (Default to Alphabetical A-Z by Student Name)
  const [studentSearch, setStudentSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Nam' | 'Nữ'>('all');
  const [studentSortOrder, setStudentSortOrder] = useState<'name_asc' | 'name_desc' | 'code_asc' | 'code_desc'>('name_asc');

  // Teacher Search & Filter state
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState<string>('all');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<string>('all');
  const [teacherGroupFilter, setTeacherGroupFilter] = useState<string>('all');
  const [teacherViewMode, setTeacherViewMode] = useState<'grouped' | 'flat'>('grouped');

  // AI Assistant Panel State (Default hidden/closed until user opens)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(false);
  const [aiMessages, setAiMessages] = useState<Array<{ id: string; sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      id: 'm-1',
      sender: 'ai',
      text: 'Xin chào Thầy/Cô! Tôi là Trợ Lý AI Quản Lý Cán Bộ & Phân Quyền TH Quang Hưng PK1. Thầy/Cô có thể hỏi thông tin giáo viên, kiểm tra phân công GVCN hoặc tra cứu ma trận phân quyền hệ thống.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [aiInputText, setAiInputText] = useState('');

  const handleSendAiMessage = (promptText?: string) => {
    const query = (promptText || aiInputText).trim();
    if (!query) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user' as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAiMessages((prev) => [...prev, userMsg]);
    if (!promptText) setAiInputText('');

    setTimeout(() => {
      let reply = 'Hệ thống Dạy & Học Số PK Trực Khang đã ghi nhận yêu cầu của Thầy/Cô. ';
      const lower = query.toLowerCase();
      if (lower.includes('tổ 1') || lower.includes('khối 1')) {
        reply += 'Tổ 1 hiện gồm Cô Hà Thị Trâm (Tổ trưởng, GVCN Lớp 1A) và Cô Lưu Thị Minh (GVCN Lớp 1B).';
      } else if (lower.includes('tổ 2') || lower.includes('tổ 3') || lower.includes('khối 2') || lower.includes('khối 3')) {
        reply += 'Tổ 2+3 hiện có Cô Bùi Thị Yến (Tổ trưởng, GVCN Lớp 2A) và Cô Phạm Thị Thanh Thảo (GVCN Lớp 3A).';
      } else if (lower.includes('tổ 4') || lower.includes('tổ 5') || lower.includes('khối 4') || lower.includes('khối 5')) {
        reply += 'Tổ 4+5 gồm Cô Trần Thị Diễm Hương (Tổ trưởng, GVCN Lớp 5A), Thầy Trần Hữu Ích (GVCN Lớp 4A) và Cô Nguyễn Thị Lê (Tiếng Anh toàn trường).';
      } else if (lower.includes('bgh') || lower.includes('hiệu trưởng') || lower.includes('admin') || lower.includes('quản trị')) {
        reply += 'Ban Giám Hiệu gồm Thầy Đặng Văn Hùng (Hiệu trưởng) và Cô Nguyễn Thị Thủ (Quản trị viên ADMIN).';
      } else if (lower.includes('chuyên biệt') || lower.includes('nghệ thuật')) {
        reply += 'Tổ Chuyên biệt có Cô Đồng Thị Tâm phụ trách môn Âm nhạc & Mỹ thuật.';
      } else {
        reply += 'Đã cập nhật danh sách đầy đủ 10 giáo viên & Ban Giám Hiệu nhà trường kèm CCCD/SĐDCN và SĐT chính thức.';
      }

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai' as const,
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAiMessages((prev) => [...prev, aiMsg]);
    }, 400);
  };

  // Form State for Teacher
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherSddcn, setTeacherSddcn] = useState('');
  const [teacherDob, setTeacherDob] = useState('');
  const [teacherRoleVal, setTeacherRoleVal] = useState<string>('Giáo viên bộ môn');
  const [teacherSubjectVal, setTeacherSubjectVal] = useState('Toán Học');
  const [teacherToChuyenMon, setTeacherToChuyenMon] = useState<string>('Tổ 1');
  const [teacherNhomGvCn, setTeacherNhomGvCn] = useState<string>('');
  const [teacherAvatar, setTeacherAvatar] = useState<string>('👩‍🏫');

  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [newStudentDob, setNewStudentDob] = useState('15/05/2016');
  const [newStudentPin, setNewStudentPin] = useState('123456');

  // Excel Import Modal & State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [importedFile, setImportedFile] = useState<{ name: string; size: string; count: number } | null>(null);
  const [parsedStudentsBatch, setParsedStudentsBatch] = useState<StudentRecord[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Download Excel Template (.xlsx chuẩn 9 cột cố định)
  const handleDownloadExcelTemplate = () => {
    const clsName = selectedClass || 'Lớp 5B';
    downloadStudentImportTemplate(clsName);
    setToastMessage(`✅ Đã tải xuống file mẫu Excel (.xlsx) chuẩn 9 cột cố định cho ${clsName}!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Select or Drag Excel File (Real parsing with fallback)
  const handleSelectExcelFile = async (fileObj?: File) => {
    if (fileObj) {
      try {
        const buffer = await fileObj.arrayBuffer();
        const result = importStudentsFromExcel(buffer, selectedClass || 'Lớp 5B');
        if (result.success && result.students.length > 0) {
          setParsedStudentsBatch(result.students);
          setImportedFile({
            name: fileObj.name,
            size: `${(fileObj.size / 1024).toFixed(1)} KB`,
            count: result.students.length
          });
          setToastMessage(`✅ Đã đọc thành công ${result.students.length} học sinh từ tệp Excel (${fileObj.name}) khớp nối chuẩn 9 cột!`);
          setTimeout(() => setToastMessage(null), 3500);
          return;
        } else {
          setToastMessage(`⚠️ Cảnh báo đọc file: ${result.error || 'Cần kiểm tra lại cấu trúc 9 cột tiêu chuẩn.'}`);
          setTimeout(() => setToastMessage(null), 4000);
          setParsedStudentsBatch([]);
          setImportedFile(null);
          return;
        }
      } catch (err: any) {
        console.error('Lỗi khi đọc file Excel:', err);
        setToastMessage('❌ Không thể phân tích cú pháp tệp Excel. Vui lòng kiểm tra định dạng.');
        setTimeout(() => setToastMessage(null), 4000);
        setParsedStudentsBatch([]);
        setImportedFile(null);
        return;
      }
    } else {
      setParsedStudentsBatch([]);
      setImportedFile(null);
    }
  };

  // Confirm Excel Import Batch
  const handleConfirmExcelImport = () => {
    if (!selectedClass) return;

    if (!parsedStudentsBatch || parsedStudentsBatch.length === 0) {
      setToastMessage('⚠️ Chưa có danh sách học sinh hợp lệ để lưu vào lớp.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const studentsToImport = reindexClassStudents(
      parsedStudentsBatch.map((s) => ({ ...s, className: selectedClass })),
      selectedClass
    );

    const updatedDb = {
      ...studentDatabase,
      [selectedClass]: studentsToImport
    };
    setStudentDatabase(updatedDb);

    // 1. Lưu vĩnh viễn vào LocalStorage (F5 / Reset trang không mất)
    saveStudentsToLocalStorage(selectedClass, studentsToImport);

    // 2. Đồng bộ Firestore Cloud
    syncClassStudentsToFirestore(selectedClass, studentsToImport)
      .then((res) => {
        if (res.success) {
          setToastMessage(
            `🎉 Đã nạp & lưu vĩnh viễn ${studentsToImport.length} học sinh vào LocalStorage & Đồng bộ Firestore Cloud thành công cho ${selectedClass}!`
          );
        } else {
          setToastMessage(
            `💾 Đã lưu vĩnh viễn ${studentsToImport.length} học sinh vào LocalStorage (Offline / Cache sẵn sàng) cho ${selectedClass}!`
          );
        }
        setTimeout(() => {
          setToastMessage(null);
        }, 4500);
      });

    setIsExcelModalOpen(false);
    setImportedFile(null);
    setParsedStudentsBatch(null);
  };

  // Export Student Credentials (Tải danh sách TK & MK cho Phụ huynh dạng .xlsx chuẩn 9 cột)
  const handleDownloadCredentialsList = () => {
    const clsName = selectedClass || 'Lớp 3A';
    const studentsToExport = studentDatabase[clsName] || [];
    exportStudentCredentialsExcel(clsName, studentsToExport);

    setToastMessage(`✅ Đã xuất danh sách tài khoản & mật khẩu lớp ${clsName} (định dạng Excel .xlsx 9 cột chuẩn) thành công!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Edit Student Modal State & Handlers
  const [viewingStudentDetails, setViewingStudentDetails] = useState<StudentRecord | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentRecord | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState<boolean>(false);
  const [isClearAllStudentsModalOpen, setIsClearAllStudentsModalOpen] = useState<boolean>(false);
  const [isClearingAllStudents, setIsClearingAllStudents] = useState<boolean>(false);
  const [deletingTeacher, setDeletingTeacher] = useState<TeacherRecord | null>(null);
  const [editForm, setEditForm] = useState<{
    code: string;
    pin: string;
    name: string;
    dob: string;
    gender: 'Nam' | 'Nữ';
    avatar: string;
  }>({
    code: '',
    pin: '123456',
    name: '',
    dob: '',
    gender: 'Nam',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop'
  });

  const [accordionState, setAccordionState] = useState<{
    personal: boolean;
    family: boolean;
    system: boolean;
  }>({
    personal: true,
    family: false,
    system: false
  });

  const avatarOptions = [
    { label: '🦊 Chú cáo đỏ', value: FOX_AVATAR_URL },
    { label: '🐰 Bé thỏ trắng', value: RABBIT_AVATAR_URL },
    { label: '🦁 Chú sư tử', value: LION_AVATAR_URL },
    { label: '🐼 Gấu trúc', value: PANDA_AVATAR_URL },
    { label: '🐱 Mèo con', value: CAT_AVATAR_URL }
  ];

  const handleOpenEditStudentModal = (student: StudentRecord) => {
    setEditingStudent(student);
    setEditForm({
      code: student.code || student.username || '',
      pin: student.pin || student.password || '123456',
      name: student.name || student.fullName || '',
      dob: student.dob || student.birthday || '01/01/2016',
      gender: (student.gender as 'Nam' | 'Nữ') || 'Nam',
      avatar: resolveAvatarUrl(student.avatar)
    });
  };

  const handleConfirmClearAllStudents = async () => {
    if (!selectedClass) return;
    if (userRole === 'student') {
      showToast('Bạn không có quyền xóa học sinh!', 'error');
      setIsClearAllStudentsModalOpen(false);
      return;
    }

    setIsClearingAllStudents(true);
    try {
      const stdName = getStandardClassName(selectedClass);
      const classKey = normalizeClassKey(selectedClass);

      const res = await deleteAllStudentsInClassPermanently(selectedClass);
      if (res.success) {
        setStudentDatabase((prev) => {
          const nextDb = { ...prev };
          nextDb[stdName] = [];
          nextDb[selectedClass] = [];
          nextDb[classKey] = [];
          return nextDb;
        });

        showToast(`Đã xóa toàn bộ học sinh trong ${selectedClass} thành công!`, 'success');
        setToastMessage(`🗑️ Đã xóa toàn bộ học sinh trong ${selectedClass} thành công!`);
        setTimeout(() => setToastMessage(null), 3500);
        setIsClearAllStudentsModalOpen(false);
      } else {
        const errorMsg = res.error || 'Có lỗi xảy ra khi xóa dữ liệu trên hệ thống.';
        showToast(`Lỗi xóa toàn bộ học sinh: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error('Lỗi khi xóa toàn bộ học sinh lớp:', err);
      const msg = err?.message || String(err);
      showToast(`Lỗi khi xóa toàn bộ học sinh: ${msg}`, 'error');
    } finally {
      setIsClearingAllStudents(false);
    }
  };

  const handleSaveEditStudent = () => {
    if (!selectedClass || !editingStudent) return;

    const currentList = studentDatabase[selectedClass] || [];
    const updatedList = currentList.map((st) => {
      if (st.id === editingStudent.id) {
        return {
          id: st.id,
          stt: st.stt || 1,
          code: editForm.code.trim(),
          username: editForm.code.trim(),
          pin: editForm.pin.trim() || '123456',
          password: editForm.pin.trim() || '123456',
          name: editForm.name.trim(),
          fullName: editForm.name.trim(),
          dob: editForm.dob.trim(),
          birthday: editForm.dob.trim(),
          gender: editForm.gender,
          className: selectedClass
        };
      }
      return st;
    });

    const updatedDb = {
      ...studentDatabase,
      [selectedClass]: updatedList
    };
    try {
      setStudentDatabase(updatedDb);
      saveStudentsToLocalStorage(selectedClass, updatedList);
      syncClassStudentsToFirestore(selectedClass, updatedList);

      setEditingStudent(null);
      showToast('Cập nhật hồ sơ học sinh thành công (đã lưu LocalStorage & Firestore)!', "success");
    } catch (e) {
      showToast("Lưu hồ sơ học sinh thất bại, vui lòng kiểm tra lại!", "error");
    }
  };

  // Handle open Add/Edit Teacher
  const handleOpenAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherName('');
    setTeacherEmail('');
    setTeacherPhone('');
    setTeacherSddcn('');
    setTeacherDob('');
    setTeacherRoleVal('Giáo viên bộ môn');
    setTeacherSubjectVal('Toán Học');
    setTeacherToChuyenMon('Tổ 1');
    setTeacherNhomGvCn('');
    setTeacherAvatar('👩‍🏫');
    setIsTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (u: TeacherRecord) => {
    setEditingTeacher(u);
    setTeacherName(u.name);
    setTeacherEmail(u.email);
    setTeacherPhone(u.phone || '');
    setTeacherSddcn(u.sddcn || '');
    setTeacherDob(u.dob || '');
    setTeacherRoleVal(u.role);
    setTeacherSubjectVal(u.subject);
    setTeacherToChuyenMon(u.toChuyenMon || 'Tổ 1');
    setTeacherNhomGvCn(u.nhomGvCn || '');
    setTeacherAvatar(u.avatar || '👩‍🏫');
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = () => {
    const cleanName = teacherName.trim();
    if (!cleanName) {
      alert("Vui lòng nhập Họ và Tên Giáo Viên!");
      return;
    }

    let cleanEmail = teacherEmail.trim().toLowerCase();
    if (!cleanEmail) {
      // Auto-generate clean email based on teacher's name if not provided
      const slug = toSlugName(cleanName) || 'giaovien';
      cleanEmail = `gv.${slug}@quanghungpk1.edu.vn`;
    }

    // Check duplicate by email when creating new teacher
    let targetId = editingTeacher ? editingTeacher.id : '';
    if (!editingTeacher) {
      const existingWithEmail = teachersList.find(
        (t) => (t.email || '').trim().toLowerCase() === cleanEmail
      );
      if (existingWithEmail) {
        // Automatically switch to updating that record instead of creating duplicate line
        targetId = existingWithEmail.id;
      } else {
        targetId = generateNextTeacherId(teachersList);
      }
    }

    const savedTeacher: TeacherRecord = {
      id: targetId,
      name: cleanName,
      email: cleanEmail,
      phone: teacherPhone.trim() || '',
      sddcn: teacherSddcn.trim() || '',
      dob: teacherDob.trim() || '',
      role: teacherRoleVal,
      subject: teacherSubjectVal,
      toChuyenMon: teacherToChuyenMon.trim() || 'Tổ 1',
      nhomGvCn: teacherNhomGvCn.trim() || '',
      avatar: teacherAvatar || '👩‍🏫',
      status: editingTeacher ? editingTeacher.status : 'active'
    };

    let updatedList: TeacherRecord[];
    const exists = teachersList.some(
      (t) => t.id === targetId || (t.email || '').trim().toLowerCase() === cleanEmail
    );

    if (exists) {
      updatedList = teachersList.map((t) =>
        t.id === targetId || (t.email || '').trim().toLowerCase() === cleanEmail ? savedTeacher : t
      );
    } else {
      updatedList = [...teachersList, savedTeacher];
    }

    const finalDeduped = deduplicateTeachers(updatedList);
    try {
      setTeachersList(finalDeduped);
      saveTeachersToLocalStorage(finalDeduped);
      syncTeachersToFirestore(finalDeduped).catch((err) => {
        console.warn("Lỗi đồng bộ giáo viên lên Firestore:", err);
      });

      onSaveUser({
        id: savedTeacher.id,
        name: savedTeacher.name,
        email: savedTeacher.email,
        role: savedTeacher.role.includes('ADMIN') ? 'admin' : 'teacher',
        avatar: savedTeacher.avatar || '👩‍🏫',
        subject: savedTeacher.subject,
        status: savedTeacher.status === 'active' ? 'active' : 'inactive',
        joinedDate: new Date().toLocaleDateString('vi-VN')
      });

      setIsTeacherModalOpen(false);
      showToast(`Cập nhật hồ sơ giáo viên "${savedTeacher.name}" (Mã: ${savedTeacher.id}) thành công!`, "success");
    } catch (e) {
      showToast("Lưu hồ sơ giáo viên thất bại, vui lòng kiểm tra lại!", "error");
    }
  };

  const handleToggleLockStatus = (u: TeacherRecord) => {
    const updatedStatus: 'active' | 'locked' = u.status === 'active' ? 'locked' : 'active';
    const updatedList = deduplicateTeachers(
      teachersList.map((t) => (t.id === u.id ? { ...t, status: updatedStatus } : t))
    );
    setTeachersList(updatedList);
    saveTeachersToLocalStorage(updatedList);
    syncTeachersToFirestore(updatedList).catch(() => {});

    onSaveUser({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role.includes('ADMIN') ? 'admin' : 'teacher',
      avatar: u.avatar || '👩‍🏫',
      subject: u.subject,
      status: updatedStatus === 'active' ? 'active' : 'inactive'
    });
  };

  const handleDeleteTeacherRecord = async (id: string) => {
    const teacherToDelete = teachersList.find((t) => t.id === id);
    const updated = await deleteTeacherPermanently(id, teachersList);
    setTeachersList(updated);
    onDeleteUser(id);
    setToastMessage(`🗑️ Đã xóa giáo viên "${teacherToDelete?.name || id}" và đồng bộ hệ thống!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add student to current class
  const handleAddStudentToClass = () => {
    if (!selectedClass || !newStudentName.trim()) return;

    const currentList = studentDatabase[selectedClass] || [];
    const nextStt = currentList.length + 1;
    const studentCode = newStudentCode.trim() || generateStudentCode(selectedClass, nextStt);
    const pinVal = newStudentPin.trim() || '123456';

    const newStudent: StudentRecord = {
      id: `std-${Date.now()}`,
      stt: nextStt,
      code: studentCode,
      username: studentCode,
      pin: pinVal,
      password: pinVal,
      name: newStudentName.trim(),
      fullName: newStudentName.trim(),
      gender: newStudentGender,
      dob: newStudentDob.trim() || '10/10/2016',
      birthday: newStudentDob.trim() || '10/10/2016',
      className: selectedClass
    };

    const updatedList = reindexClassStudents([...currentList, newStudent], selectedClass);

    const updatedDb = {
      ...studentDatabase,
      [selectedClass]: updatedList
    };
    setStudentDatabase(updatedDb);
    saveStudentsToLocalStorage(selectedClass, updatedList);
    syncClassStudentsToFirestore(selectedClass, updatedList);

    setToastMessage(`✅ Đã thêm học sinh "${newStudent.name}" vào ${selectedClass} (đã lưu LocalStorage & Firestore)!`);
    setTimeout(() => setToastMessage(null), 4000);

    setIsAddStudentModalOpen(false);
    setNewStudentName('');
    setNewStudentCode('');
    setNewStudentPin('123456');
    setNewStudentDob('15/05/2016');
  };

  // Filter teacher records
  const filteredTeachers = teachersList.filter((t) => {
    const q = teacherSearch.toLowerCase();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.phone && t.phone.includes(q)) ||
      (t.sddcn && t.sddcn.includes(q)) ||
      (t.role && t.role.toLowerCase().includes(q)) ||
      (t.subject && t.subject.toLowerCase().includes(q)) ||
      (t.toChuyenMon && t.toChuyenMon.toLowerCase().includes(q)) ||
      (t.nhomGvCn && t.nhomGvCn.toLowerCase().includes(q));

    const matchesGroup =
      teacherGroupFilter === 'all' ||
      (t.toChuyenMon || '').trim().toLowerCase() === teacherGroupFilter.trim().toLowerCase();
    const matchesStatus = teacherStatusFilter === 'all' || t.status === teacherStatusFilter;
    const matchesSubject = teacherSubjectFilter === 'all' || t.subject.includes(teacherSubjectFilter);

    return matchesSearch && matchesGroup && matchesStatus && matchesSubject;
  });

  // Helper to get stats for a class dynamically from studentDatabase with fallback
  const getClassStats = (className: string) => {
    const stdName = getStandardClassName(className);
    const key = normalizeClassKey(className);
    const students =
      (studentDatabase[className] && studentDatabase[className].length > 0 ? studentDatabase[className] : null) ||
      (studentDatabase[stdName] && studentDatabase[stdName].length > 0 ? studentDatabase[stdName] : null) ||
      (studentDatabase[key] && studentDatabase[key].length > 0 ? studentDatabase[key] : null) ||
      getStudentsFromLocalStorage(stdName) ||
      getStudentsFromLocalStorage(key) ||
      getStudentsFromLocalStorage(className) ||
      [];
    let male = 0;
    let female = 0;
    students.forEach((s) => {
      const g = (s.gender || (s as any).gioiTinh || (s as any).sex || '').toString().trim().toLowerCase();
      if (g === 'nam' || g === 'male' || g === 'm') {
        male++;
      } else if (g === 'nữ' || g === 'nu' || g === 'female' || g === 'f') {
        female++;
      }
    });
    return { total: students.length, male, female };
  };

  // Helper to get stats for a block dynamically from studentDatabase
  const getBlockStats = (gradeInput: string) => {
    const gradeNum = gradeInput.replace(/[^0-9]/g, '');
    const gradeName = `Khối ${gradeNum}`;

    const classNamesSet = new Set<string>();

    // Strictly classes from classesList matching this grade
    classesList.forEach((c) => {
      const cGradeNum = (c.grade || '').replace(/[^0-9]/g, '');
      if (cGradeNum === gradeNum || c.grade === gradeName || c.grade === gradeInput) {
        if (c.name) classNamesSet.add(c.name);
      }
    });

    let total = 0;
    let male = 0;
    let female = 0;

    classNamesSet.forEach((cName) => {
      const stats = getClassStats(cName);
      total += stats.total;
      male += stats.male;
      female += stats.female;
    });

    return { total, male, female };
  };

  // Helper to dynamically get Homeroom Teacher ID (e.g. 'gv-04') for any class
  const getHomeroomTeacherIdForClass = useCallback((className?: string | null): string => {
    if (!className) return '';
    const stdName = getStandardClassName(className);
    const clean = className.replace(/^Lớp\s*/i, '').trim().toUpperCase();

    // 1. Check classesList (loaded dynamically from Firestore 'classes' collection)
    const foundClass = classesList.find(
      (c) =>
        c.name.trim().toLowerCase() === className.trim().toLowerCase() ||
        c.name.trim().toLowerCase() === stdName.trim().toLowerCase() ||
        c.id.toUpperCase() === clean ||
        c.name.replace(/^Lớp\s*/i, '').trim().toUpperCase() === clean
    );

    if (foundClass?.homeroomTeacherId && foundClass.homeroomTeacherId.trim()) {
      return foundClass.homeroomTeacherId.trim();
    }

    if (foundClass?.homeroomTeacher && foundClass.homeroomTeacher.trim()) {
      const teacherStr = foundClass.homeroomTeacher.trim();
      const matchedTeacher = teachersList.find(
        (t) => t.id === teacherStr || t.name.trim().toLowerCase() === teacherStr.toLowerCase()
      );
      if (matchedTeacher?.id) {
        return matchedTeacher.id;
      }
      if (teacherStr.startsWith('gv-')) {
        return teacherStr;
      }
    }

    // 2. Check teachersList for homeroom assignments (homeroomClasses or nhomGvCn)
    const assignedTeacher = teachersList.find((t) => {
      const hasClassInList = (arr?: string[]) =>
        arr &&
        arr.some(
          (c) =>
            c.trim().toLowerCase() === className.trim().toLowerCase() ||
            c.trim().toLowerCase() === stdName.trim().toLowerCase() ||
            c.replace(/^Lớp\s*/i, '').trim().toUpperCase() === clean
        );
      if (hasClassInList(t.homeroomClasses)) return true;
      if (t.nhomGvCn && (t.nhomGvCn.includes(className) || t.nhomGvCn.includes(stdName) || t.nhomGvCn.includes(clean))) return true;
      return false;
    });

    if (assignedTeacher?.id) {
      return assignedTeacher.id;
    }

    // 3. Fallback standard mapping
    const fallbackMap: Record<string, string> = {
      '1C': 'gv-01',
      '1D': 'gv-02',
      '2C': 'gv-03',
      '2D': 'gv-12',
      '3C': 'gv-04',
      '3D': 'gv-11',
      '4C': 'gv-05',
      '4D': 'gv-09',
      '5C': 'gv-06',
      '5D': 'gv-06'
    };

    return fallbackMap[clean] || '';
  }, [classesList, teachersList]);

  // Helper to dynamically get Homeroom Teacher for any class consistently
  const getHomeroomTeacherForClass = (className?: string | null): string => {
    if (!className) return 'Chưa phân công';
    const stdName = getStandardClassName(className);
    const clean = className.replace(/^Lớp\s*/i, '').trim().toUpperCase();

    // 1. Check classesList (loaded dynamically from Firestore 'classes' collection)
    const foundClass = classesList.find(
      (c) =>
        c.name.trim().toLowerCase() === className.trim().toLowerCase() ||
        c.name.trim().toLowerCase() === stdName.trim().toLowerCase() ||
        c.id.toUpperCase() === clean ||
        c.name.replace(/^Lớp\s*/i, '').trim().toUpperCase() === clean
    );

    if (foundClass?.homeroomTeacher && foundClass.homeroomTeacher.trim()) {
      const teacherStr = foundClass.homeroomTeacher.trim();
      const matchedTeacher = teachersList.find(
        (t) => t.id === teacherStr || t.name.trim().toLowerCase() === teacherStr.toLowerCase()
      );
      if (matchedTeacher?.name) {
        return matchedTeacher.name;
      }
      return teacherStr;
    }

    if (foundClass?.homeroomTeacherId && foundClass.homeroomTeacherId.trim()) {
      const matchedTeacher = teachersList.find((t) => t.id === foundClass.homeroomTeacherId?.trim());
      if (matchedTeacher?.name) {
        return matchedTeacher.name;
      }
    }

    // 2. Check teachersList for homeroom assignments (homeroomClasses or nhomGvCn)
    const assignedTeacher = teachersList.find((t) => {
      const hasClassInList = (arr?: string[]) =>
        arr &&
        arr.some(
          (c) =>
            c.trim().toLowerCase() === className.trim().toLowerCase() ||
            c.trim().toLowerCase() === stdName.trim().toLowerCase() ||
            c.replace(/^Lớp\s*/i, '').trim().toUpperCase() === clean
        );
      if (hasClassInList(t.homeroomClasses)) return true;
      if (t.nhomGvCn && (t.nhomGvCn.includes(className) || t.nhomGvCn.includes(stdName) || t.nhomGvCn.includes(clean))) return true;
      return false;
    });

    if (assignedTeacher?.name) {
      return assignedTeacher.name;
    }

    // 3. Fallback map
    const fallbackNameMap: Record<string, string> = {
      '1C': 'Hà Thị Trâm',
      '1D': 'Lưu Thị Minh',
      '2C': 'Bùi Thị Yến',
      '2D': 'Bùi Thị Tuyến',
      '3C': 'Phạm Thị Thanh Thảo',
      '3D': 'Thầy Nguyễn Văn Quân',
      '4C': 'Trần Hữu Ích',
      '4D': 'Đồng Thị Tâm',
      '5C': 'Trần Thị Diễm Hương',
      '5D': 'Trần Thị Diễm Hương'
    };

    return fallbackNameMap[clean] || 'Chưa phân công';
  };

  // RBAC Permission checks for class management
  const canManageStudentsInClass = useCallback((className?: string | null): boolean => {
    if (isSystemAdmin) return true;
    if (!className) return false;
    const stdName = getStandardClassName(className);
    const clean = className.replace(/^Lớp\s*/i, '').trim().toUpperCase();

    const hrTeacherId = getHomeroomTeacherIdForClass(className);
    const hrTeacherName = getHomeroomTeacherForClass(className);

    const myId = (activeTeacherProfile.id || '').trim();
    const myName = (activeTeacherProfile.name || '').trim().toLowerCase();
    const myDisplayName = (currentUser?.displayName || '').trim().toLowerCase();
    const storedName = (typeof window !== 'undefined' ? (localStorage.getItem('eduplay_teacher_name') || localStorage.getItem('user_name') || '') : '').trim().toLowerCase();
    const myEmail = (authEmail || '').trim().toLowerCase();

    // 1. Direct ID match
    if (myId && hrTeacherId && myId.toLowerCase() === hrTeacherId.toLowerCase()) {
      return true;
    }

    // 2. Direct name match with homeroom teacher name
    if (hrTeacherName && hrTeacherName !== 'Chưa phân công') {
      const hrLower = hrTeacherName.trim().toLowerCase();
      if (myName && (myName === hrLower || myName.includes(hrLower) || hrLower.includes(myName))) {
        return true;
      }
      if (myDisplayName && (myDisplayName === hrLower || myDisplayName.includes(hrLower) || hrLower.includes(myDisplayName))) {
        return true;
      }
      if (storedName && (storedName === hrLower || storedName.includes(hrLower) || hrLower.includes(storedName))) {
        return true;
      }
    }

    // 3. Check activeTeacherProfile homeroomClasses or nhomGvCn
    const checkClassMatches = (arr?: string[]) =>
      arr &&
      arr.some(
        (c) =>
          c.trim().toLowerCase() === className.trim().toLowerCase() ||
          c.trim().toLowerCase() === stdName.trim().toLowerCase() ||
          c.replace(/^Lớp\s*/i, '').trim().toUpperCase() === clean
      );

    if (checkClassMatches(activeTeacherProfile.homeroomClasses)) return true;
    if (
      activeTeacherProfile.nhomGvCn &&
      (activeTeacherProfile.nhomGvCn.includes(className) ||
        activeTeacherProfile.nhomGvCn.includes(stdName) ||
        activeTeacherProfile.nhomGvCn.includes(clean))
    ) {
      return true;
    }

    // 4. Check if matched teacher in teachersList has homeroom assignment to this class
    const matchedInList = teachersList.find(
      (t) =>
        (myId && t.id && t.id.toLowerCase() === myId.toLowerCase()) ||
        (myEmail && t.email && t.email.toLowerCase() === myEmail) ||
        (myName && t.name && t.name.trim().toLowerCase() === myName) ||
        (myDisplayName && t.name && t.name.trim().toLowerCase() === myDisplayName) ||
        (storedName && t.name && t.name.trim().toLowerCase() === storedName)
    );

    if (matchedInList) {
      if (matchedInList.id && hrTeacherId && matchedInList.id.toLowerCase() === hrTeacherId.toLowerCase()) {
        return true;
      }
      if (checkClassMatches(matchedInList.homeroomClasses)) return true;
      if (
        matchedInList.nhomGvCn &&
        (matchedInList.nhomGvCn.includes(className) ||
          matchedInList.nhomGvCn.includes(stdName) ||
          matchedInList.nhomGvCn.includes(clean))
      ) {
        return true;
      }
    }

    return false;
  }, [isSystemAdmin, activeTeacherProfile, currentUser, authEmail, teachersList, getHomeroomTeacherIdForClass, getHomeroomTeacherForClass]);

  const canManageSelectedClassStudents = useMemo(() => {
    return canManageStudentsInClass(selectedClass);
  }, [canManageStudentsInClass, selectedClass]);

  // Current block details
  const activeBlockConfig = BLOCKS_CONFIG.find((b) => b.id === selectedBlock);
  const activeBlockClasses = classesList.filter((c) => c.grade === activeBlockConfig?.name);
  const activeBlockDynamicStats = activeBlockConfig ? getBlockStats(activeBlockConfig.name) : { total: 0, male: 0, female: 0 };

  // Compute total dynamic stats for selected class
  const currentClassStudents = selectedClass
    ? (studentDatabase[selectedClass] || studentDatabase[getStandardClassName(selectedClass)] || studentDatabase[normalizeClassKey(selectedClass)] || [])
    : [];
  const rawFilteredStudents = currentClassStudents.filter((s) => {
    const q = studentSearch.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.sddcn && s.sddcn.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.parentName && s.parentName.toLowerCase().includes(q));
    const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  const filteredClassStudents = useMemo(() => {
    if (studentSortOrder === 'name_asc') {
      return sortStudentsByNameAZ(rawFilteredStudents);
    } else if (studentSortOrder === 'name_desc') {
      return sortStudentsByNameZA(rawFilteredStudents);
    } else if (studentSortOrder === 'code_desc') {
      return sortStudentsDescending(rawFilteredStudents);
    } else {
      return sortStudentsAscending(rawFilteredStudents);
    }
  }, [rawFilteredStudents, studentSortOrder]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ======================================================== */}
      {/* HEADER BANNER                                            */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
              Quản Trị Hệ Thống
            </span>
            <span className="text-xs text-slate-400">• Phân Quyền RBAC</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 font-heading">
            Phân Hệ Quản Lý Người Dùng
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý toàn bộ tài khoản Giáo viên, Học sinh và Lớp học trong hệ thống, thiết lập phân quyền truy cập theo vai trò (RBAC).
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* NAVIGATION BAR - 2 MAIN TABS                              */}
      {/* ======================================================== */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => {
              setMainTab('students');
            }}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
              mainTab === 'students'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-200 scale-102'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span className="text-base sm:text-lg">🏫</span>
            <span>QUẢN LÝ HỌC SINH (5 Khối lớp)</span>
          </button>

          <button
            onClick={() => {
              setMainTab('teachers');
            }}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
              mainTab === 'teachers'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200 scale-102'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span className="text-base sm:text-lg">👥</span>
            <span>QUẢN LÝ GIÁO VIÊN & PHÂN QUYỆN (RBAC)</span>
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-end sm:self-center">
          Vai trò hiện tại: <span className="text-indigo-600 uppercase font-extrabold">{userRole}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: QUẢN LÝ HỌC SINH (5 KHỐI LỚP)                     */}
      {/* ======================================================== */}
      {mainTab === 'students' && (
        <div className="space-y-6">
          {/* STATE 1: VIEW ALL 5 GRADE BLOCK CARDS */}
          {!selectedBlock && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900 uppercase tracking-wider">
                      MỚI CẬP NHẬT
                    </span>
                    <h2 className="text-lg font-black text-slate-900 font-heading inline-flex items-center gap-2">
                      🏫 Hệ Thống Quản Lý Lớp Học & Khối Học
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Thầy cô bấm chọn một Khối học dưới đây để xem danh sách các lớp học chi tiết.
                  </p>
                </div>

                {userRole !== 'student' && (
                  <button
                    onClick={() => {
                      const newId = `C-${Date.now()}`;
                      const newClass: ClassConfig = {
                        id: newId,
                        grade: 'Khối 3',
                        name: 'Lớp 3C',
                        room: 'Phòng 303',
                        subjects: PRIMARY_SCHOOL_SUBJECTS.map(s => ({ isVisible: true, subjectName: s }))
                      };
                      setEditingClass(newClass);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" /> Thêm lớp mới
                  </button>
                )}
              </div>

              {/* GRADE CARDS (Khối 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BLOCKS_CONFIG.map((block) => {
                  const bStats = getBlockStats(block.name);
                  const blockClassesCount = classesList.filter(
                    (c) => c.grade === block.name || (c.grade || '').replace(/[^0-9]/g, '') === block.id
                  ).length;
                  const displayClassesCount = blockClassesCount > 0 ? blockClassesCount : block.totalClasses;

                  return (
                    <div
                      key={block.id}
                      onClick={() => {
                        setSelectedBlock(block.id);
                        setSelectedClass(null);
                      }}
                      className={`${block.color} rounded-3xl p-5 shadow-lg border border-white/20 transition-all transform hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer relative overflow-hidden group`}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform">
                          {block.icon}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase text-white tracking-wider border border-white/30">
                          {displayClassesCount} LỚP
                        </span>
                      </div>

                      {/* Block Title */}
                      <h3 className="text-2xl font-black tracking-tight mb-4 font-heading drop-shadow-xs">
                        {block.name}
                      </h3>

                      {/* Stats card inside */}
                      <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3 space-y-1 border border-white/10">
                        <div className="text-xs font-extrabold text-white">
                          Sĩ số:{' '}
                          {isStudentsLoading && bStats.total === 0 ? (
                            <span className="text-amber-200 font-bold text-xs animate-pulse">Đang tải...</span>
                          ) : (
                            <span className="text-amber-300 font-black text-sm">{bStats.total} học sinh</span>
                          )}
                        </div>
                        <div className="text-[11px] text-white/90 font-medium flex items-center justify-between pt-1 border-t border-white/10">
                          <span>
                            Nam: <b>{isStudentsLoading && bStats.total === 0 ? '-' : bStats.male}</b>
                          </span>
                          <span>|</span>
                          <span>
                            Nữ: <b>{isStudentsLoading && bStats.total === 0 ? '-' : bStats.female}</b>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STATE 2: VIEW CLASSES IN SELECTED BLOCK */}
          {selectedBlock && !selectedClass && (
            <div className="space-y-5 animate-fade-in">
              {/* Top Navigation & Back Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedBlock(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-700" /> Quay lại chọn Khối
                  </button>
                  <div className="h-5 w-px bg-slate-200 hidden sm:block" />
                  <div className="text-xs font-bold text-slate-500">
                    Khối học selected: <span className="text-emerald-700 font-extrabold">{activeBlockConfig?.name}</span>
                  </div>
                </div>

                {isSystemAdmin && (
                  <button
                    onClick={() => {
                      const gradeName = activeBlockConfig?.name || 'Khối 3';
                      const newId = `C-${Date.now()}`;
                      const newClass: ClassConfig = {
                        id: newId,
                        grade: gradeName,
                        name: `Lớp ${selectedBlock || '3'}X`,
                        room: `Phòng ${selectedBlock || '3'}0${classesList.filter(c => c.grade === gradeName).length + 1}`,
                        subjects: PRIMARY_SCHOOL_SUBJECTS.map(s => ({ isVisible: true, subjectName: s }))
                      };
                      setEditingClass(newClass);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm lớp mới vào {activeBlockConfig?.name}
                  </button>
                )}
              </div>

              {/* Block Overview Card */}
              <div className={`${activeBlockConfig?.color} p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider">
                    <span>{activeBlockConfig?.icon}</span> {activeBlockConfig?.name} TIỂU HỌC
                  </div>
                  <h2 className="text-2xl font-black text-white font-heading">
                    Danh Sách Lớp Học - {activeBlockConfig?.name}
                  </h2>
                  <p className="text-xs text-white/90 font-medium">
                    Tổng số: {activeBlockClasses.length} Lớp học • {activeBlockDynamicStats.total} Học sinh (Nam: {activeBlockDynamicStats.male} | Nữ: {activeBlockDynamicStats.female})
                  </p>
                </div>
              </div>

              {/* Class Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeBlockClasses.map((cls) => {
                  const cStats = getClassStats(cls.name);
                  const teacherName = getHomeroomTeacherForClass(cls.name);
                  return (
                    <div
                      key={cls.id}
                      className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md hover:shadow-xl transition-all space-y-4 relative overflow-hidden group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase">
                            {cls.room}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <h3 className="text-xl font-black text-slate-900 font-heading">
                              {cls.name}
                            </h3>
                            {/* Action buttons right next to class name */}
                            {(isSystemAdmin || canManageStudentsInClass(cls.name)) && (
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingClass({ ...cls });
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                                  title="Sửa thông tin lớp"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {isSystemAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingClass(cls);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                                    title="Xóa lớp học"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-black text-emerald-600 font-heading">
                            {cStats.total}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Học sinh
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs text-slate-600">
                        <span>Nam: <b>{cStats.male}</b> học sinh</span>
                        <span>|</span>
                        <span>Nữ: <b>{cStats.female}</b> học sinh</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setSelectedClass(cls.name);
                            setClassSubTab('roster');
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Users className="w-3.5 h-3.5" /> XEM HỌC SINH LỚP 👥
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STATE 3: VIEW DETAILED CLASS ROSTER & GRADEBOOK */}
          {selectedBlock && selectedClass && (
            <div className="space-y-5 animate-fade-in">
              {/* Back Buttons & Breadcrumb */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedClass(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Lớp học {activeBlockConfig?.name}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClass(null);
                      setSelectedBlock(null);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                  >
                    Chọn Khối khác
                  </button>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {selectedClass} ({currentClassStudents.length} học sinh)
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadCredentialsList}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transform hover:-translate-y-0.5"
                    title="Tải tệp danh sách tài khoản & mật khẩu để in phát cho Phụ huynh"
                  >
                    <Download className="w-3.5 h-3.5" /> TẢI DANH SÁCH HS
                  </button>
                  {canManageSelectedClassStudents && (
                    <>
                      <button
                        onClick={() => setIsExcelModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-sky-600 hover:bg-sky-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5" /> 📤 Nhập từ Excel
                      </button>
                      <button
                        onClick={() => setIsAddStudentModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Thêm học sinh vào {selectedClass}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Class Header Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-[10px] font-black uppercase">
                    DANH SÁCH CHI TIẾT
                  </div>
                  <h2 className="text-2xl font-black text-white font-heading mt-0.5">
                    {selectedClass} - Niên Khóa 2026-2027
                  </h2>
                  <p className="text-xs text-emerald-100 font-medium">
                    Sĩ số chính thức: <b>{currentClassStudents.length} học sinh</b> • GVCN: <b className="text-white">{getHomeroomTeacherForClass(selectedClass)}</b>
                  </p>
                </div>

                {/* Sub-tabs inside Class View */}
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-2xl backdrop-blur-xs self-stretch sm:self-auto">
                  <button
                    onClick={() => setClassSubTab('roster')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      classSubTab === 'roster'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    👥 Danh sách học sinh ({currentClassStudents.length})
                  </button>
                  <button
                    onClick={() => setClassSubTab('gradebook')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      classSubTab === 'gradebook'
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    📊 Sổ điểm & Nhận xét
                  </button>
                </div>
              </div>

              {/* ROSTER SUB-TAB */}
              {classSubTab === 'roster' && (
                <div className="space-y-4">
                  {/* Filter Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Tìm theo Tên học sinh hoặc Mã HS..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setGenderFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          genderFilter === 'all'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả ({currentClassStudents.length})
                      </button>
                      <button
                        onClick={() => setGenderFilter('Nam')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          genderFilter === 'Nam'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Nam ({currentClassStudents.filter((s) => s.gender === 'Nam').length})
                      </button>
                      <button
                        onClick={() => setGenderFilter('Nữ')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          genderFilter === 'Nữ'
                            ? 'bg-pink-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Nữ ({currentClassStudents.filter((s) => s.gender === 'Nữ').length})
                      </button>

                      <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                      <button
                        onClick={() => {
                          setStudentSortOrder((prev) => {
                            if (prev === 'name_asc') return 'name_desc';
                            if (prev === 'name_desc') return 'code_asc';
                            if (prev === 'code_asc') return 'code_desc';
                            return 'name_asc';
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                        title="Bấm để chuyển đổi thứ tự Sắp xếp: Tên A-Z, Tên Z-A, Mã HS"
                      >
                        <span>
                          {studentSortOrder === 'name_asc' && '🔤 Tên A ➔ Z (Mặc định)'}
                          {studentSortOrder === 'name_desc' && '🔤 Tên Z ➔ A'}
                          {studentSortOrder === 'code_asc' && '🔢 Mã HS Tăng dần'}
                          {studentSortOrder === 'code_desc' && '🔢 Mã HS Giảm dần'}
                        </span>
                      </button>

                      {/* Nút Xóa tất cả học sinh */}
                      {currentClassStudents.length > 0 && isSystemAdmin && (
                        <>
                          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
                          <button
                            onClick={() => setIsClearAllStudentsModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                            title="Xóa toàn bộ danh sách học sinh của lớp này"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Xóa tất cả học sinh</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Student Roster Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto min-w-full">
                      <table className="w-full text-left text-xs text-slate-700 whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="py-3.5 px-3 text-center w-12">STT</th>
                            <th className="py-3.5 px-3 w-28">MÃ HS</th>
                            <th className="py-3.5 px-4 min-w-[200px]">HỌ VÀ TÊN HỌC SINH</th>
                            <th className="py-3.5 px-3 text-center">NGÀY SINH</th>
                            <th className="py-3.5 px-3 text-center">GIỚI TÍNH</th>
                            <th className="py-3.5 px-3 text-center">MẬT KHẨU</th>
                            <th className="py-3.5 px-4 text-right">THAO TÁC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {!filteredClassStudents || filteredClassStudents.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                Lớp chưa có danh sách học sinh. Bấm <b>[Thêm học sinh]</b> hoặc <b>[Nhập từ Excel]</b> để khởi tạo.
                              </td>
                            </tr>
                          ) : (
                            (filteredClassStudents || []).map((s, idx) => (
                              <tr key={s.id ? `${s.id}-${idx}` : `st-row-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-3 text-center font-extrabold text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-3.5 px-3 font-mono font-bold">
                                  <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono text-xs">
                                    {s.code || s.username}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={resolveAvatarUrl(s.avatar)}
                                      alt={s.name}
                                      className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                                      onError={(e: any) => {
                                        e.target.src = getAvatarSvgFallback(s.avatar);
                                      }}
                                    />
                                    <span className="text-xs font-extrabold text-slate-900">
                                      {s.name || s.fullName}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 text-center text-slate-600 font-medium">
                                  {s.dob || s.birthday || '-'}
                                </td>
                                <td className="py-3.5 px-3 text-center font-bold">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      s.gender === 'Nam'
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        : 'bg-pink-50 text-pink-700 border border-pink-200'
                                    }`}
                                  >
                                    {s.gender || 'Nam'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-center font-mono font-extrabold">
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 text-xs">
                                    {s.pin || s.password || '123456'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-1">
                                  {canManageSelectedClassStudents && (
                                    <>
                                      <button
                                        onClick={() => handleOpenEditStudentModal(s)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer"
                                        title="Sửa thông tin học sinh"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                                      </button>
                                      <button
                                        onClick={() => setDeletingStudent(s)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                        title="Xóa học sinh này"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* GRADEBOOK SUB-TAB */}
              {classSubTab === 'gradebook' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" /> Sổ Điểm Đánh Giá Định Kỳ & Nhận Xét Hàng Tuần ({selectedClass})
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Đã xuất sổ điểm ra file Excel/PDF!')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> In Sổ Điểm
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-400">
                        <tr>
                          <th className="py-3 px-3">STT</th>
                          <th className="py-3 px-4">Họ và Tên</th>
                          <th className="py-3 px-3 text-center">TX 1</th>
                          <th className="py-3 px-3 text-center">TX 2</th>
                          <th className="py-3 px-3 text-center">TX 3</th>
                          <th className="py-3 px-3 text-center">Giữa Kỳ</th>
                          <th className="py-3 px-3 text-center font-black text-indigo-900">Cuối Kỳ</th>
                          <th className="py-3 px-4">Nhận Xét Của Giáo Viên Chủ Nhiệm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(currentClassStudents || []).map((s, idx) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-700">9.0</td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-700">8.5</td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-700">9.5</td>
                            <td className="py-3 px-3 text-center font-bold text-indigo-700">9.0</td>
                            <td className="py-3 px-3 text-center font-black text-emerald-700 bg-emerald-50/50">
                              {s.avgScore && s.avgScore > 0 ? s.avgScore.toFixed(1) : '---'}
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-600">
                              {s.notes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: QUẢN LÝ GIÁO VIÊN & PHÂN QUYỆN (RBAC)             */}
      {/* ======================================================== */}
      {mainTab === 'teachers' && (
        <div className="flex flex-col xl:flex-row gap-6 items-start relative min-h-[650px]">
          {/* MAIN SCROLLABLE CONTENT AREA FOR TEACHERS (LEFT PANEL) */}
          <div className="flex-1 w-full space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] pr-1 scrollbar-thin">
            {/* Header for Teachers */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Phân Quyền Hệ Thống RBAC
                  </span>
                  <span className="text-xs text-slate-400 font-medium">• TH Quang Hưng PK1</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1 font-heading">
                  Danh Sách Giáo Viên & Ban Giám Hiệu
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý thông tin định danh (CCCD, SĐT, DOB), tổ chuyên môn, nhóm GVCN và phân quyền cán bộ
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                    isAiPanelOpen
                      ? 'bg-purple-700 text-white border border-purple-800 shadow-purple-200'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                  }`}
                  title={isAiPanelOpen ? "Đóng Trợ lý AI Phân Quyền" : "Mở Trợ lý AI Phân Quyền"}
                >
                  <Bot className={`w-4 h-4 ${isAiPanelOpen ? 'text-amber-300' : 'text-purple-600'}`} />
                  <span>Trợ Lý AI Phân Quyền</span>
                  {isAiPanelOpen && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>}
                </button>
                {isSystemAdmin && (
                  <button
                    onClick={handleOpenAddTeacher}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" /> Thêm Giáo Viên Mới
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats Grid by 6 Tổ Chuyên Môn */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {(TEACHER_DEPARTMENTS || []).map((deptName) => {
                const meta = DEPARTMENTS_METADATA[deptName] || {
                  icon: '🏫',
                  statColor: 'bg-indigo-50 border-indigo-200 text-indigo-900',
                  title: deptName,
                  border: 'border-indigo-200',
                  headerBg: 'bg-indigo-50/30 text-indigo-950',
                  badge: deptName,
                  desc: ''
                };
                const count = teachersList.filter(
                  (t) => normalizeDepartmentName(t.toChuyenMon, t) === deptName
                ).length;
                return (
                  <div key={deptName} className={`p-3 rounded-2xl border ${meta.statColor || 'bg-indigo-50 border-indigo-200 text-indigo-900'} flex items-center gap-2.5 shadow-2xs`}>
                    <div className="text-xl">{meta.icon || '🏫'}</div>
                    <div>
                      <div className="text-base font-black font-heading">{count} <span className="text-[10px] font-normal opacity-70">cán bộ</span></div>
                      <div className="text-[10px] font-bold leading-tight">{deptName}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Tìm theo tên, email, SĐT, CCCD, môn học..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <select
                  value={teacherGroupFilter}
                  onChange={(e) => setTeacherGroupFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                >
                  <option value="all">Tất cả tổ chuyên môn</option>
                  {Array.from(
                    new Set([
                      ...TEACHER_DEPARTMENTS,
                      ...(teachersList || []).map((t) => normalizeDepartmentName(t.toChuyenMon, t)).filter(Boolean)
                    ])
                  ).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                <select
                  value={teacherStatusFilter}
                  onChange={(e) => setTeacherStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="locked">Đã khóa</option>
                </select>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setTeacherViewMode('grouped')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      teacherViewMode === 'grouped' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Chia Theo Tổ
                  </button>
                  <button
                    onClick={() => setTeacherViewMode('flat')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      teacherViewMode === 'flat' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Bảng Tổng Hợp
                  </button>
                </div>
              </div>
            </div>

            {/* CONTENT VIEW: GROUPED BY TỔ CHUYÊN MÔN VS FLAT TABLE */}
            {filteredTeachers.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 text-2xl shadow-2xs">
                  👨‍🏫
                </div>
                <h3 className="text-base font-extrabold text-slate-800">Chưa có dữ liệu giáo viên trong cơ sở dữ liệu</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Dữ liệu thực từ Firestore Database đang được đồng bộ hoặc chưa có danh sách giáo viên. Bạn có thể nhấn "Thêm Giáo Viên Mới" để thêm cán bộ.
                </p>
                {isSystemAdmin && (
                  <button
                    onClick={handleOpenAddTeacher}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <UserPlus className="w-4 h-4" /> Thêm Giáo Viên Mới
                  </button>
                )}
              </div>
            ) : teacherViewMode === 'grouped' ? (
              <div className="space-y-6">
                {(() => {
                  const defaultGroups = (TEACHER_DEPARTMENTS || []).map((deptName) => {
                    const meta = DEPARTMENTS_METADATA[deptName] || {
                      title: deptName,
                      icon: '🏫',
                      badge: deptName,
                      border: 'border-slate-200',
                      headerBg: 'bg-slate-50 text-slate-800',
                      desc: ''
                    };
                    return {
                      id: deptName,
                      title: meta.title || deptName,
                      icon: meta.icon || '🏫',
                      badge: meta.badge || deptName,
                      border: meta.border || 'border-slate-200',
                      headerBg: meta.headerBg || 'bg-slate-50 text-slate-800',
                      desc: meta.desc || ''
                    };
                  });

                  const customDepts = Array.from(
                    new Set(
                      (teachersList || [])
                        .map((t) => normalizeDepartmentName(t.toChuyenMon, t))
                        .filter((d) => d && !defaultGroups.some((g) => g.id.toLowerCase() === d.toLowerCase()))
                    )
                  );

                  const allGroups = [
                    ...defaultGroups,
                    ...customDepts.map((d) => ({
                      id: d,
                      title: d.toLowerCase().startsWith('tổ') ? d : `Tổ ${d}`,
                      icon: '🏫',
                      badge: d,
                      border: 'border-indigo-200',
                      headerBg: 'bg-gradient-to-r from-indigo-500/10 via-indigo-100/30 to-blue-50/20 text-indigo-950',
                      desc: `Cán bộ giáo viên thuộc ${d}`
                    }))
                  ];

                  return allGroups
                    .filter((grp) => teacherGroupFilter === 'all' || teacherGroupFilter.trim().toLowerCase() === grp.id.trim().toLowerCase())
                    .map((grp) => {
                      const groupTeachers = filteredTeachers.filter(
                        (t) => normalizeDepartmentName(t.toChuyenMon, t) === grp.id
                      );
                      if (groupTeachers.length === 0 && teacherGroupFilter === 'all') return null;

                    return (
                      <div key={grp.id} className={`bg-white rounded-3xl border ${grp.border} shadow-xs overflow-hidden`}>
                        {/* Group Header */}
                        <div className={`p-4 px-6 border-b ${grp.border} ${grp.headerBg} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{grp.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-sm font-heading">{grp.title}</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/80 border border-slate-200 shadow-2xs">
                                  {groupTeachers.length} cán bộ
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">{grp.desc}</p>
                            </div>
                          </div>
                        </div>

                        {/* Group Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-400">
                              <tr>
                                <th className="py-3 px-6">Họ Và Tên & Định Danh</th>
                                <th className="py-3 px-4">Thông Tin Liên Hệ</th>
                                <th className="py-3 px-4">Thẻ Chức Vụ & Tổ</th>
                                <th className="py-3 px-6 text-right">Thao Tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {groupTeachers.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">
                                    Không có giáo viên thuộc {grp.title} phù hợp bộ lọc.
                                  </td>
                                </tr>
                              ) : (
                                (groupTeachers || []).map((u) => (
                                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-3.5 px-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-lg flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                                          {u.avatar && (u.avatar.startsWith('http') || u.avatar.startsWith('data:')) ? (
                                            <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                          ) : (
                                            u.avatar || '👩‍🏫'
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                                            <span>Mã: {u.id}</span>
                                            {u.sddcn && <span className="text-slate-400">• CCCD: {u.sddcn}</span>}
                                            {u.dob && <span className="text-slate-400">• NS: {u.dob}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4 font-medium text-slate-600">
                                      <div className="flex items-center gap-1.5 text-xs text-slate-800">
                                        <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> {u.email}
                                      </div>
                                      {u.phone && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                                          <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> SĐT: {u.phone}
                                        </div>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4 space-y-1">
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 w-max">
                                        <ShieldCheck className="w-3 h-3 text-indigo-600" /> {u.role}
                                      </span>
                                      <div className="text-[10px] font-semibold text-slate-500">
                                        🏢 {u.toChuyenMon}
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-6 text-right space-x-1.5">
                                      {(isSystemAdmin || (activeTeacherProfile.id && u.id === activeTeacherProfile.id)) && (
                                        <button
                                          onClick={() => handleOpenEditTeacher(u)}
                                          className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer"
                                          title="Chỉnh sửa hồ sơ & Phân công"
                                        >
                                          <Edit3 className="w-4 h-4 text-indigo-600" />
                                        </button>
                                      )}
                                      {isSystemAdmin && (
                                        <button
                                          onClick={() => setDeletingTeacher(u)}
                                          className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                                          title="Xóa tài khoản"
                                        >
                                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              /* FLAT TABLE VIEW FOR ALL TEACHERS */
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="py-3.5 px-6">Họ Và Tên & Định Danh</th>
                        <th className="py-3.5 px-4">Thông Tin Liên Hệ</th>
                        <th className="py-3.5 px-4">Tổ Chuyên Môn & Vai Trò</th>
                        <th className="py-3.5 px-6 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTeachers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                            Không tìm thấy tài khoản giáo viên phù hợp.
                          </td>
                        </tr>
                      ) : (
                        (filteredTeachers || []).map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-lg flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                                  {u.avatar && (u.avatar.startsWith('http') || u.avatar.startsWith('data:')) ? (
                                    <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                  ) : (
                                    u.avatar || '👩‍🏫'
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                                    <span>Mã: {u.id}</span>
                                    {u.sddcn && <span>• CCCD: {u.sddcn}</span>}
                                    {u.dob && <span>• NS: {u.dob}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4 font-medium text-slate-600">
                              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {u.email}
                              </div>
                              {u.phone && (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> SĐT: {u.phone}
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-4 space-y-1">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 w-max">
                                <ShieldCheck className="w-3 h-3 text-indigo-600" /> {u.role}
                              </span>
                              <div className="text-[11px] font-semibold text-slate-500">
                                🏢 {u.toChuyenMon}
                              </div>
                            </td>

                            <td className="py-4 px-6 text-right space-x-1.5">
                              {(isSystemAdmin || (activeTeacherProfile.id && u.id === activeTeacherProfile.id)) && (
                                <button
                                  onClick={() => handleOpenEditTeacher(u)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer"
                                  title="Chỉnh sửa hồ sơ & Phân công"
                                >
                                  <Edit3 className="w-4 h-4 text-indigo-600" />
                                </button>
                              )}
                              {isSystemAdmin && (
                                <button
                                  onClick={() => setDeletingTeacher(u)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* FIXED RIGHT COLUMN - AI ASSISTANT PANEL */}
          {isAiPanelOpen && (
            <div className="w-full xl:w-96 shrink-0 bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-140px)] sticky top-4 animate-slide-left transition-all">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                    <Bot className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider font-heading">TRỢ LÝ AI PHÂN QUYỆN</h3>
                    <p className="text-[10px] text-indigo-200 font-medium">Hỗ hỗ Cán bộ & Tổ chuyên môn</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiPanelOpen(false)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Đóng trợ lý AI"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/70 text-xs scrollbar-thin">
                {aiMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl max-w-[90%] font-medium leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono">{m.time}</span>
                  </div>
                ))}
              </div>

              {/* Quick Prompt Chips */}
              <div className="p-2.5 bg-slate-100/90 border-t border-slate-200/80 flex flex-wrap gap-1.5 shrink-0">
                {[
                  '📋 Phân công GVCN Lớp 1A',
                  '⭐ Tổ trưởng Tổ 2+3',
                  '🏛️ Cán bộ BGH'
                ].map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleSendAiMessage(prompt)}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white text-indigo-700 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-2xs cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    placeholder="Hỏi về tổ chuyên môn, phân quyền..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shrink-0 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT TEACHER                                */}
      {/* ======================================================== */}
      {isTeacherModalOpen && (
        <EditTeacherModal
          editingTeacher={editingTeacher}
          teachersList={teachersList}
          classesList={classesList}
          isSystemAdmin={isSystemAdmin}
          onClose={() => setIsTeacherModalOpen(false)}
          onSave={async (savedTeacher) => {
            let updatedList: TeacherRecord[];
            const exists = teachersList.some(
              (t) => t.id === savedTeacher.id || (t.email || '').trim().toLowerCase() === savedTeacher.email.trim().toLowerCase()
            );

            if (exists) {
              updatedList = teachersList.map((t) =>
                t.id === savedTeacher.id || (t.email || '').trim().toLowerCase() === savedTeacher.email.trim().toLowerCase() ? savedTeacher : t
              );
            } else {
              updatedList = [...teachersList, savedTeacher];
            }

            const finalDeduped = deduplicateTeachers(updatedList);
            try {
              setTeachersList(finalDeduped);
              saveTeachersToLocalStorage(finalDeduped);
              syncTeachersToFirestore(finalDeduped).catch((err) => {
                console.warn("Lỗi đồng bộ giáo viên lên Firestore:", err);
              });

              onSaveUser({
                id: savedTeacher.id,
                name: savedTeacher.name,
                email: savedTeacher.email,
                role: savedTeacher.role.includes('ADMIN') ? 'admin' : 'teacher',
                avatar: savedTeacher.avatar || '👩‍🏫',
                subject: savedTeacher.subject,
                status: savedTeacher.status === 'active' ? 'active' : 'inactive',
                joinedDate: new Date().toLocaleDateString('vi-VN')
              });

              setIsTeacherModalOpen(false);
              showToast(`Cập nhật hồ sơ giáo viên "${savedTeacher.name}" (Mã: ${savedTeacher.id}) thành công!`, "success");
            } catch (e) {
              showToast("Lưu hồ sơ giáo viên thất bại!", "error");
            }
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW STUDENT TO CLASS                          */}
      {/* ======================================================== */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 font-heading flex items-center gap-2">
                <span>➕</span> THÊM HỌC SINH MỚI ({selectedClass})
              </h3>
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và Tên Học Sinh <span className="text-rose-500">*</span>:</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Gia Huy"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã HS (Tùy chọn):</label>
                  <input
                    type="text"
                    value={newStudentCode}
                    onChange={(e) => setNewStudentCode(e.target.value)}
                    placeholder="Tự động nếu để trống"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mật Khẩu Đăng Nhập:</label>
                  <input
                    type="text"
                    value={newStudentPin}
                    onChange={(e) => setNewStudentPin(e.target.value)}
                    placeholder="123456"
                    className="w-full p-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 text-amber-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày Sinh:</label>
                  <input
                    type="text"
                    value={newStudentDob}
                    onChange={(e) => setNewStudentDob(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giới Tính:</label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value as 'Nam' | 'Nữ')}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 font-bold cursor-pointer"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleAddStudentToClass}
                disabled={!newStudentName.trim()}
                className="px-5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-md cursor-pointer active:scale-95"
              >
                Xác Nhận Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BATCH EXCEL STUDENT IMPORT */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6 relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider">
                  BƯỚC 1-2-3
                </div>
                <h3 className="text-lg font-black text-slate-900 font-heading flex items-center gap-2">
                  <Upload className="w-5 h-5 text-sky-600" />
                  NHẬP HỌC SINH TỪ EXCEL ({selectedClass ? selectedClass.toUpperCase() : 'LỚP 3A'})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Lập danh sách lớp học nhanh chóng bằng file Excel mẫu đã chuẩn hóa.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setImportedFile(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: DOWNLOAD EXCEL TEMPLATE */}
            <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>BƯỚC 1: TẢI FILE DỮ LIỆU MẪU CHUẨN 6 CỘT</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">.xlsx Chuẩn</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Tệp mẫu cấu trúc 6 cột tinh gọn: <span className="font-bold text-slate-800">1. STT | 2. Mã HS | 3. Họ và tên học sinh | 4. Ngày sinh | 5. Giới tính | 6. Mật khẩu</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownloadExcelTemplate}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 text-indigo-700 font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-2xs"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                TẢI XUỐNG FILE MẪU CHUẨN 6 CỘT (EXCEL .XLSX)
              </button>
            </div>

            {/* STEP 2: DRAG & DROP UPLOAD */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>BƯỚC 2: TẢI FILE ĐÃ ĐIỀN CỦA LỚP LÊN</span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleSelectExcelFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv,.xlsx,.xls';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSelectExcelFile(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-sky-500 bg-sky-100/60 scale-[1.01]'
                    : importedFile
                    ? 'border-emerald-400 bg-emerald-50/60'
                    : 'border-sky-300 hover:border-sky-400 bg-sky-50/40 hover:bg-sky-50'
                }`}
              >
                {!importedFile ? (
                  <div className="space-y-2 py-1">
                    <div className="mx-auto w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                      <CloudUpload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Kéo thả tệp Excel/CSV vào đây hoặc bấm để chọn tệp
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Hỗ trợ các định dạng file: .csv, .xlsx, .xls
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{importedFile.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {importedFile.size}
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Sẵn sàng nạp {importedFile.count} học sinh vào {selectedClass || 'Lớp 3A'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImportedFile(null);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                      title="Đổi file khác"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 3: CONFIRM & EXECUTE */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-600">
                Bước 3: Thực thi cập nhật hệ thống
              </label>
              <button
                onClick={handleConfirmExcelImport}
                className="w-full py-3 px-4 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer bg-slate-200 hover:bg-emerald-600 hover:text-white text-slate-700 active:scale-95 group"
              >
                <span>🤝</span> XÁC NHẬN NHẬP DỮ LIỆU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW STUDENT DETAILS */}
      {viewingStudentDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    HỒ SƠ CHI TIẾT HỌC SINH
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Lớp {viewingStudentDetails.className || selectedClass}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudentDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar & Main Badge */}
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <img
                src={resolveAvatarUrl(viewingStudentDetails.avatar)}
                alt={viewingStudentDetails.name}
                className="w-13 h-13 rounded-2xl object-cover border-2 border-indigo-200 shrink-0 shadow-xs"
                onError={(e: any) => {
                  e.target.src = getAvatarSvgFallback(viewingStudentDetails.avatar);
                }}
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-slate-900 truncate">
                  {viewingStudentDetails.name}
                </h4>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    viewingStudentDetails.gender === 'Nam' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800'
                  }`}>
                    {viewingStudentDetails.gender}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-medium">
                    Sinh: {viewingStudentDetails.dob}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Mã HS / Tài khoản</div>
                <div className="font-mono font-extrabold text-indigo-950 mt-0.5">{viewingStudentDetails.code}</div>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Mã PIN / Mật khẩu</div>
                <div className="font-mono font-extrabold text-amber-950 mt-0.5">{viewingStudentDetails.pin || '123456'}</div>
              </div>
            </div>

            {/* Details List */}
            <div className="space-y-2 text-xs">
              {/* SĐDCN */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <span className="font-medium text-slate-500">Số định danh cá nhân (SĐDCN):</span>
                <span className="font-mono font-bold text-slate-800">{viewingStudentDetails.sddcn || 'Chưa cập nhật'}</span>
              </div>

              {/* Phụ huynh */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <span className="font-medium text-slate-500">Phụ huynh liên hệ:</span>
                <span className="font-bold text-slate-900">{viewingStudentDetails.parentName || 'Chưa cập nhật'}</span>
              </div>

              {/* SĐT */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <span className="font-medium text-slate-500">Số điện thoại liên hệ:</span>
                <span className="font-mono font-bold text-slate-900">{viewingStudentDetails.phone || 'Chưa cập nhật'}</span>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <span className="font-medium text-slate-500">Email trường học:</span>
                <span className="font-mono font-semibold text-indigo-600 truncate max-w-[200px]" title={viewingStudentDetails.email}>
                  {viewingStudentDetails.email || 'Chưa cập nhật'}
                </span>
              </div>

              {/* Địa chỉ */}
              {viewingStudentDetails.address && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <span className="font-medium text-slate-500">Nơi ở:</span>
                  <span className="font-medium text-slate-800 text-right truncate max-w-[220px]">{viewingStudentDetails.address}</span>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const st = viewingStudentDetails;
                  setViewingStudentDetails(null);
                  handleOpenEditStudentModal(st);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Sửa thông tin
              </button>
              <button
                type="button"
                onClick={() => setViewingStudentDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT STUDENT PROFILE */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-5 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 font-heading flex items-center gap-2">
                <span>👨‍🎓</span> SỬA THÔNG TIN HỌC SINH
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              {/* Row 1: Code & PIN */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Mã số Học sinh (Mã HS)
                  </label>
                  <input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full p-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 text-indigo-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Mật khẩu đăng nhập
                  </label>
                  <input
                    type="text"
                    value={editForm.pin}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, pin: e.target.value }))}
                    className="w-full p-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 text-amber-700 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Họ và Tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ví dụ: Hoàng Bảo An"
                  className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Row 3: DOB & Gender */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Ngày sinh (dd/mm/yyyy)
                  </label>
                  <input
                    type="text"
                    value={editForm.dob}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, dob: e.target.value }))}
                    placeholder="dd/mm/yyyy"
                    className="w-full p-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Giới tính
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value as 'Nam' | 'Nữ' }))}
                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Footer Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEditStudent}
                disabled={!editForm.name.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-indigo-200 transition-all cursor-pointer active:scale-95"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}



      {/* EDIT / ADD CLASS MODAL */}
      {editingClass && (
        <EditClassModal
          editingClass={editingClass}
          classesList={classesList}
          teachersList={teachersList}
          onClose={() => setEditingClass(null)}
          onSave={async (updatedClasses, updatedTeachers, toastMsg) => {
            setClassesList(updatedClasses);
            saveClassesToLocalStorage(updatedClasses);

            setTeachersList(updatedTeachers);
            saveTeachersToLocalStorage(updatedTeachers);
            syncTeachersToFirestore(updatedTeachers);

            try {
              if (db) {
                for (const clsItem of updatedClasses) {
                  const classRef = doc(db, 'classes', clsItem.id);
                  const payload = {
                    id: clsItem.id,
                    name: clsItem.name,
                    grade: clsItem.grade,
                    homeroomTeacher: clsItem.homeroomTeacher || '',
                    subjects: clsItem.subjects || PRIMARY_SCHOOL_SUBJECTS.map(s => ({ isVisible: true, subjectName: s }))
                  };
                  await setDoc(classRef, payload, { merge: true });
                }
              }
            } catch (err) {
              console.warn('Firestore save class error:', err);
            }

            setToastMessage(toastMsg);
            setTimeout(() => setToastMessage(null), 3000);
            setEditingClass(null);
          }}
        />
      )}

      {/* DELETE CONFIRMATION MODALS */}
      <ConfirmDeleteModal
        isOpen={!!deletingClass}
        onClose={() => setDeletingClass(null)}
        onConfirm={async () => {
          if (!deletingClass) return;
          try {
            const classKey = deletingClass.id;
            const targetClassName = deletingClass.name;
            try {
              await deleteDoc(doc(db, 'classes', classKey));
              await deleteDoc(doc(db, 'class_rosters', classKey));

              // Clean up any remaining orphan duplicate docs matching the same class name or ID
              const snap = await getDocs(collection(db, 'classes'));
              for (const docSnap of snap.docs) {
                const dData = docSnap.data();
                const dName = (dData.name || dData.className || '').trim();
                if (dName === targetClassName || docSnap.id === classKey) {
                  await deleteDoc(doc(db, 'classes', docSnap.id));
                  await deleteDoc(doc(db, 'class_rosters', docSnap.id));
                }
              }
            } catch (err) {
              console.warn('Firestore delete class error:', err);
            }

            const updated = classesList.filter(c => c.id !== deletingClass.id);
            setClassesList(updated);
            saveClassesToLocalStorage(updated);
            setToastMessage(`🗑️ Đã xóa thành công ${deletingClass.name}`);
            setTimeout(() => setToastMessage(null), 3000);
          } catch (e) {
            console.error(e);
          } finally {
            setDeletingClass(null);
          }
        }}
        title="Xác nhận xóa lớp học"
        itemType="lớp học"
        itemName={deletingClass ? `${deletingClass.name} - ${deletingClass.room}` : undefined}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingStudent}
        isDeleting={isDeletingStudent}
        onClose={() => {
          if (!isDeletingStudent) {
            setDeletingStudent(null);
          }
        }}
        onConfirm={async () => {
          if (!deletingStudent || !selectedClass) return;

          if (userRole === 'student') {
            showToast('Bạn không có quyền xóa hồ sơ học sinh!', 'error');
            setDeletingStudent(null);
            return;
          }

          setIsDeletingStudent(true);
          try {
            const stdName = getStandardClassName(selectedClass);
            const classKey = normalizeClassKey(selectedClass);
            
            const res = await deleteStudentPermanently(stdName, deletingStudent);

            if (res.success) {
              const updated = res.remainingStudents;
              setStudentDatabase((prev) => {
                const nextDb = { ...prev };
                nextDb[stdName] = updated;
                nextDb[selectedClass] = updated;
                nextDb[classKey] = updated;
                return nextDb;
              });

              setToastMessage(`🗑️ Đã xóa học sinh "${deletingStudent.name}" thành công!`);
              setTimeout(() => setToastMessage(null), 3000);
              showToast(`Đã xóa học sinh "${deletingStudent.name}" thành công khỏi hệ thống và Firestore!`, 'success');
              setDeletingStudent(null);
            } else {
              const errorMsg = res.error || 'Có lỗi xảy ra khi xóa dữ liệu trên hệ thống.';
              showToast(`Lỗi xóa học sinh: ${errorMsg}`, 'error');
            }
          } catch (err: any) {
            console.error('Lỗi khi xóa học sinh:', err);
            const msg = err?.message || String(err);
            showToast(`Lỗi khi xóa học sinh: ${msg}`, 'error');
          } finally {
            setIsDeletingStudent(false);
          }
        }}
        title="Xác nhận xóa hồ sơ học sinh"
        itemType="học sinh"
        itemName={deletingStudent?.name}
      />

      <ConfirmDeleteModal
        isOpen={isClearAllStudentsModalOpen}
        isDeleting={isClearingAllStudents}
        onClose={() => {
          if (!isClearingAllStudents) {
            setIsClearAllStudentsModalOpen(false);
          }
        }}
        onConfirm={handleConfirmClearAllStudents}
        title="Xác nhận xóa toàn bộ học sinh"
        itemType={`toàn bộ ${currentClassStudents.length} học sinh`}
        itemName={selectedClass || undefined}
        description={`Bạn có chắc chắn muốn xóa toàn bộ học sinh trong lớp ${selectedClass} không? Hành động này không thể hoàn tác! Toàn bộ ${currentClassStudents.length} học sinh sẽ bị xóa khỏi cơ sở dữ liệu và sĩ số lớp sẽ được đưa về 0.`}
        confirmLabel={isClearingAllStudents ? 'Đang xóa...' : 'Xóa tất cả học sinh'}
        cancelLabel="Hủy bỏ"
      />

      <ConfirmDeleteModal
        isOpen={!!deletingTeacher}
        onClose={() => setDeletingTeacher(null)}
        onConfirm={async () => {
          if (!deletingTeacher) return;
          await handleDeleteTeacherRecord(deletingTeacher.id);
          setDeletingTeacher(null);
        }}
        title="Xác nhận xóa tài khoản giáo viên"
        itemType="giáo viên"
        itemName={deletingTeacher?.name}
      />


      {/* FLOATING SUCCESS TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-slide-up backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-extrabold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 text-white px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-up backdrop-blur-md bg-slate-950/95 ${toast.type === 'error' ? 'border-rose-500/50 text-rose-50' : 'border-emerald-500/50 text-emerald-50'}`}>
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

// Subcomponent: EditClassModal with 2 Tabs (Thông Tin Lớp Học & Môn Học Của Khối)
interface EditClassModalProps {
  editingClass: ClassConfig;
  classesList: ClassConfig[];
  teachersList: TeacherRecord[];
  onClose: () => void;
  onSave: (
    updatedClasses: ClassConfig[],
    updatedTeachers: TeacherRecord[],
    toastMsg: string
  ) => Promise<void>;
}

const EditClassModal: React.FC<EditClassModalProps> = ({
  editingClass,
  classesList,
  teachersList,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'subjects'>('info');

  // Tab 1 State
  const [classNameInput, setClassNameInput] = useState<string>(editingClass.name || '');
  const [gradeInput, setGradeInput] = useState<string>(editingClass.grade || 'Khối 3');
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState<boolean>(false);

  // Initial teacher assignment lookup from teachersList
  const initialTeacher = useMemo(() => {
    return teachersList.find(t =>
      (t.homeroomClasses && t.homeroomClasses.includes(editingClass.name)) ||
      (t.nhomGvCn && t.nhomGvCn.includes(editingClass.name)) ||
      (editingClass.homeroomTeacher && (t.id === editingClass.homeroomTeacher || t.name === editingClass.homeroomTeacher))
    );
  }, [teachersList, editingClass]);

  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(initialTeacher || null);

  // Tab 2 State: selected subjects list
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() => {
    if (editingClass.subjects && Array.isArray(editingClass.subjects)) {
      return editingClass.subjects
        .filter(s => s.isVisible !== false)
        .map(s => s.subjectName);
    }
    return [...PRIMARY_SCHOOL_SUBJECTS];
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filter teachers for autocomplete dropdown
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachersList;
    const q = teacherSearch.toLowerCase().trim();
    return teachersList.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.role && t.role.toLowerCase().includes(q)) ||
      (t.toChuyenMon && t.toChuyenMon.toLowerCase().includes(q)) ||
      (t.subject && t.subject.toLowerCase().includes(q))
    );
  }, [teachersList, teacherSearch]);

  const handleSave = async () => {
    if (!classNameInput.trim()) return;
    setIsSaving(true);

    try {
      const originalId = editingClass.id;
      const normalizedId = normalizeClassKey(classNameInput).toUpperCase();
      const finalId = normalizedId;
      const stdName = getStandardClassName(classNameInput);

      const updatedSubjects = PRIMARY_SCHOOL_SUBJECTS.map(subj => ({
        subjectName: subj,
        isVisible: selectedSubjects.includes(subj)
      }));

      const cleanClass: ClassConfig = {
        id: finalId,
        name: stdName,
        grade: gradeInput,
        homeroomTeacher: selectedTeacher ? selectedTeacher.name : undefined,
        subjects: updatedSubjects
      };

      const exists = classesList.some(
        c => c.id.toUpperCase() === finalId || c.name.trim().toUpperCase() === stdName.toUpperCase()
      );

      // 1. Update classesList - apply updatedSubjects to ALL classes belonging to gradeInput!
      let newClassesList: ClassConfig[] = classesList.map(c => {
        if (c.id.toUpperCase() === finalId || c.id === originalId || c.name.trim().toUpperCase() === stdName.toUpperCase()) {
          return cleanClass;
        }
        if (c.grade === gradeInput) {
          return {
            ...c,
            subjects: updatedSubjects
          };
        }
        return c;
      });

      if (!newClassesList.some(c => c.id.toUpperCase() === finalId)) {
        newClassesList = [
          ...newClassesList.filter(
            c => c.id !== originalId && c.id.toUpperCase() !== finalId && c.name.trim().toUpperCase() !== stdName.toUpperCase()
          ),
          cleanClass
        ];
      }

      // 2. Update teachersList for homeroom teacher assignment
      const targetClassName = cleanClass.name;
      const oldClassName = editingClass.name;

      const newTeachersList = teachersList.map(t => {
        let hClasses = t.homeroomClasses ? [...t.homeroomClasses] : [];
        hClasses = hClasses.filter(c => c !== targetClassName && c !== oldClassName);
        let nhomGv = t.nhomGvCn;

        if (selectedTeacher && t.id === selectedTeacher.id) {
          if (!hClasses.includes(targetClassName)) {
            hClasses.push(targetClassName);
          }
          nhomGv = `GVCN ${targetClassName}`;
        } else if (nhomGv && (nhomGv.includes(targetClassName) || nhomGv.includes(oldClassName))) {
          nhomGv = undefined;
        }

        return {
          ...t,
          homeroomClasses: hClasses,
          nhomGvCn: nhomGv
        };
      });

      const toastMsg = exists
        ? `✅ Đã cập nhật lớp ${cleanClass.name} & danh sách môn học cho ${cleanClass.grade}`
        : `✅ Đã thêm mới lớp ${cleanClass.name}`;

      await onSave(newClassesList, newTeachersList, toastMsg);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-scale-up">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <Edit3 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide font-heading">
                {classesList.some(c => c.id === editingClass.id) ? 'Chỉnh Sửa Thông Tin Lớp Học' : 'Thêm Lớp Học Mới'}
              </h3>
              <p className="text-xs text-blue-200 font-medium">Cập nhật thông tin lớp học & danh sách môn học của khối</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2 Tabs Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2.5 rounded-t-2xl font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-white border-blue-600 text-blue-700 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Thông Tin Lớp Học</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2.5 rounded-t-2xl font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-white border-blue-600 text-blue-700 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Môn Học Của Khối</span>
            <span className="ml-1 px-2 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded-full font-black">
              {selectedSubjects.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Tên lớp học */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên lớp học</label>
                <input
                  type="text"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="w-full p-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ví dụ: Lớp 3C"
                />
              </div>

              {/* Thuộc Khối */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Thuộc Khối</label>
                <select
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  className="w-full p-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Khối 3">Khối 3</option>
                </select>
              </div>

              {/* Giáo viên chủ nhiệm */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Giáo viên chủ nhiệm
                </label>

                {selectedTeacher ? (
                  <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xl shrink-0 bg-indigo-100">
                        {selectedTeacher.avatar && (selectedTeacher.avatar.startsWith('http') || selectedTeacher.avatar.startsWith('data:')) ? (
                          <img src={selectedTeacher.avatar} alt={selectedTeacher.name} className="w-full h-full object-cover" />
                        ) : (
                          selectedTeacher.avatar || '👩‍🏫'
                        )}
                      </span>
                      <div>
                        <div className="font-extrabold text-xs text-indigo-950">{selectedTeacher.name}</div>
                        <div className="text-[11px] font-medium text-indigo-600">
                          {selectedTeacher.toChuyenMon} • {selectedTeacher.subject}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeacher(null);
                        setTeacherSearch('');
                        setIsTeacherDropdownOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                    >
                      Đổi / Hủy chọn
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        value={teacherSearch}
                        onFocus={() => setIsTeacherDropdownOpen(true)}
                        onChange={(e) => {
                          setTeacherSearch(e.target.value);
                          setIsTeacherDropdownOpen(true);
                        }}
                        placeholder="Gõ tên giáo viên để tìm kiếm..."
                        className="w-full pl-9 pr-3 py-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {isTeacherDropdownOpen && (
                      <div className="mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10 divide-y divide-slate-100">
                        <div
                          onClick={() => {
                            setSelectedTeacher(null);
                            setIsTeacherDropdownOpen(false);
                          }}
                          className="p-2.5 hover:bg-slate-50 text-xs text-slate-500 italic cursor-pointer"
                        >
                          Chưa phân công giáo viên chủ nhiệm
                        </div>
                        {(filteredTeachers || []).map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setSelectedTeacher(t);
                              setIsTeacherDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-blue-50/80 transition-all cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-slate-100">
                                {t.avatar && (t.avatar.startsWith('http') || t.avatar.startsWith('data:')) ? (
                                  <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                                ) : (
                                  t.avatar || '👩‍🏫'
                                )}
                              </span>
                              <span className="font-extrabold text-xs text-slate-800">{t.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {t.toChuyenMon}
                            </span>
                          </div>
                        ))}
                        {filteredTeachers.length === 0 && (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            Không tìm thấy giáo viên phù hợp
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="space-y-3.5">
              {/* Notice Banner */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900 shadow-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-blue-950">Ghi chú quan trọng:</span> Danh sách môn học được tick chọn dưới đây sẽ được <span className="font-black underline text-blue-700">áp dụng đồng bộ cho TẤT CẢ các lớp thuộc {gradeInput}</span> trong hệ thống.
                </div>
              </div>

              {/* Quick Select controls */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700">
                  Đã chọn <b className="text-blue-700">{selectedSubjects.length}/{PRIMARY_SCHOOL_SUBJECTS.length}</b> môn học:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubjects([...PRIMARY_SCHOOL_SUBJECTS])}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubjects([])}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              </div>

              {/* Checkboxes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto p-1 pr-1.5">
                {PRIMARY_SCHOOL_SUBJECTS.map((subjectName) => {
                  const isChecked = selectedSubjects.includes(subjectName);
                  return (
                    <label
                      key={subjectName}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubjects([...selectedSubjects, subjectName]);
                          } else {
                            setSelectedSubjects(selectedSubjects.filter(s => s !== subjectName));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs tracking-tight">{subjectName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !classNameInput.trim()}
            className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/30 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Subcomponent: EditTeacherModal with 2 Tabs (Thông Tin & Phân Công Giảng Dạy)
// ============================================================================
interface EditTeacherModalProps {
  editingTeacher: TeacherRecord | null;
  teachersList: TeacherRecord[];
  classesList: ClassConfig[];
  isSystemAdmin?: boolean;
  onClose: () => void;
  onSave: (savedTeacher: TeacherRecord) => void;
}

const EditTeacherModal: React.FC<EditTeacherModalProps> = ({
  editingTeacher,
  teachersList,
  classesList,
  isSystemAdmin = false,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'teaching'>('info');

  // Tab 1 State
  const [teacherName, setTeacherName] = useState<string>(editingTeacher ? editingTeacher.name : '');
  const [teacherEmail, setTeacherEmail] = useState<string>(editingTeacher ? editingTeacher.email : '');
  const [teacherPhone, setTeacherPhone] = useState<string>(editingTeacher ? (editingTeacher.phone || '') : '');
  const [teacherSddcn, setTeacherSddcn] = useState<string>(editingTeacher ? (editingTeacher.sddcn || '') : '');
  const [teacherDob, setTeacherDob] = useState<string>(editingTeacher ? (editingTeacher.dob || '') : '');
  const [teacherRoleVal, setTeacherRoleVal] = useState<string>(editingTeacher ? editingTeacher.role : 'Giáo viên bộ môn');
  const [teacherToChuyenMon, setTeacherToChuyenMon] = useState<string>(
    editingTeacher ? normalizeDepartmentName(editingTeacher.toChuyenMon, editingTeacher) : 'Tổ 1'
  );
  const [teacherAvatar, setTeacherAvatar] = useState<string>(editingTeacher ? (editingTeacher.avatar || '👩‍🏫') : '👩‍🏫');
  
  // Password Reset state (Optional for Admin)
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Tab 2 State: Teaching Assignments Map (subjectName => { isChecked: boolean, classes: string[] })
  const [teachingMap, setTeachingMap] = useState<Record<string, { isChecked: boolean; classes: string[] }>>(() => {
    const map: Record<string, { isChecked: boolean; classes: string[] }> = {};
    PRIMARY_SCHOOL_SUBJECTS.forEach((subj) => {
      map[subj] = { isChecked: false, classes: [] };
    });

    if (editingTeacher) {
      if (editingTeacher.teachingAssignments && Array.isArray(editingTeacher.teachingAssignments) && editingTeacher.teachingAssignments.length > 0) {
        editingTeacher.teachingAssignments.forEach((item) => {
          const matchedSubj = PRIMARY_SCHOOL_SUBJECTS.find(s => s.toLowerCase() === item.subject.toLowerCase()) || item.subject;
          if (map[matchedSubj]) {
            map[matchedSubj] = {
              isChecked: true,
              classes: Array.isArray(item.classes) ? [...item.classes] : []
            };
          }
        });
      } else {
        // Fallback parse from legacy text subject (e.g. "Toán & Tiếng Việt")
        const legacySubjStr = (editingTeacher.subject || '').toLowerCase();
        PRIMARY_SCHOOL_SUBJECTS.forEach((subj) => {
          const isMatched = legacySubjStr.includes(subj.toLowerCase()) ||
            (subj === 'Ngoại ngữ' && (legacySubjStr.includes('tiếng anh') || legacySubjStr.includes('ngoại ngữ'))) ||
            (subj === 'Toán' && legacySubjStr.includes('toán')) ||
            (subj === 'Tiếng Việt' && legacySubjStr.includes('tiếng việt'));

          if (isMatched) {
            map[subj] = {
              isChecked: true,
              classes: [] // Leave empty for teacher to choose classes
            };
          }
        });
      }
    }

    return map;
  });

  // Available school classes from classesList real data
  const schoolClasses = useMemo(() => {
    if (classesList && classesList.length > 0) {
      return classesList.map(c => c.name);
    }
    return [
      'Lớp 1A', 'Lớp 1B', 'Lớp 1C',
      'Lớp 2A', 'Lớp 2B', 'Lớp 2C',
      'Lớp 3A', 'Lớp 3B', 'Lớp 3C',
      'Lớp 4A', 'Lớp 4B', 'Lớp 4C',
      'Lớp 5A', 'Lớp 5B', 'Lớp 5C'
    ];
  }, [classesList]);

  // Toggle subject checked status
  const handleToggleSubject = (subj: string) => {
    setTeachingMap((prev) => {
      const cur = prev[subj] || { isChecked: false, classes: [] };
      const nextChecked = !cur.isChecked;
      return {
        ...prev,
        [subj]: {
          isChecked: nextChecked,
          classes: nextChecked ? cur.classes : [] // Clear classes when unchecking
        }
      };
    });
  };

  // Toggle single class for a subject
  const handleToggleClass = (subj: string, className: string) => {
    setTeachingMap((prev) => {
      const cur = prev[subj] || { isChecked: true, classes: [] };
      const exists = cur.classes.includes(className);
      const nextClasses = exists
        ? cur.classes.filter(c => c !== className)
        : [...cur.classes, className];
      return {
        ...prev,
        [subj]: {
          isChecked: true,
          classes: nextClasses
        }
      };
    });
  };

  // Select all classes for a subject
  const handleSelectAllClasses = (subj: string) => {
    setTeachingMap((prev) => ({
      ...prev,
      [subj]: {
        isChecked: true,
        classes: [...schoolClasses]
      }
    }));
  };

  // Deselect all classes for a subject
  const handleDeselectAllClasses = (subj: string) => {
    setTeachingMap((prev) => ({
      ...prev,
      [subj]: {
        isChecked: true,
        classes: []
      }
    }));
  };

  // Active subjects count for badge
  const activeSubjectCount = useMemo(() => {
    return Object.values(teachingMap).filter(v => v.isChecked).length;
  }, [teachingMap]);

  const handleSave = () => {
    const cleanName = teacherName.trim();
    if (!cleanName) {
      alert("Vui lòng nhập Họ và Tên Giáo Viên!");
      return;
    }

    const cleanToChuyenMon = (teacherToChuyenMon || '').trim();
    if (!cleanToChuyenMon) {
      alert("Vui lòng chọn Tổ Chuyên Môn!");
      return;
    }

    // Validate password reset if provided
    const trimmedNewPass = newPassword.trim();
    const trimmedConfirmPass = confirmPassword.trim();
    if (trimmedNewPass || trimmedConfirmPass) {
      if (trimmedNewPass.length < 6) {
        alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
        return;
      }
      if (trimmedNewPass !== trimmedConfirmPass) {
        alert("Xác nhận mật khẩu mới không khớp với mật khẩu mới!");
        return;
      }
    }

    let cleanEmail = teacherEmail.trim().toLowerCase();
    if (!cleanEmail) {
      const slug = toSlugName(cleanName) || 'giaovien';
      cleanEmail = `gv.${slug}@quanghungpk1.edu.vn`;
    }

    let targetId = editingTeacher ? editingTeacher.id : '';
    if (!editingTeacher) {
      const existingWithEmail = teachersList.find(
        (t) => (t.email || '').trim().toLowerCase() === cleanEmail
      );
      if (existingWithEmail) {
        targetId = existingWithEmail.id;
      } else {
        targetId = generateNextTeacherId(teachersList);
      }
    }

    // Build teaching assignments
    const teachingAssignmentsArray = Object.entries(teachingMap)
      .filter(([_, val]) => val.isChecked)
      .map(([subject, val]) => ({
        subject,
        classes: val.classes
      }));

    const activeSubjectsStr = teachingAssignmentsArray.map(a => a.subject).join(' & ') || (editingTeacher?.subject || 'Giáo viên bộ môn');
    const activeTeachingClasses = Array.from(new Set(teachingAssignmentsArray.flatMap(a => a.classes)));

    const savedTeacher: TeacherRecord = {
      id: targetId,
      name: cleanName,
      email: cleanEmail,
      phone: teacherPhone.trim(),
      sddcn: teacherSddcn.trim(),
      dob: teacherDob.trim(),
      role: teacherRoleVal,
      subject: activeSubjectsStr,
      toChuyenMon: teacherToChuyenMon,
      nhomGvCn: editingTeacher?.nhomGvCn || '',
      avatar: teacherAvatar || '👩‍🏫',
      status: editingTeacher ? editingTeacher.status : 'active',
      teachingClasses: activeTeachingClasses,
      teachingAssignments: teachingAssignmentsArray
    };

    onSave(savedTeacher);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                {editingTeacher ? 'Cập Nhật Hồ Sơ Giáo Viên' : 'Thêm Giáo Viên Mới'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {editingTeacher ? `Mã GV: ${editingTeacher.id} • ${editingTeacher.name}` : 'Thêm hồ sơ giáo viên mới vào hệ thống'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Tab Navigation */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Tab 1: Thông Tin Giáo Viên</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teaching')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'teaching'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Tab 2: Phân Công Giảng Dạy</span>
            {activeSubjectCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
                {activeSubjectCount} môn
              </span>
            )}
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: THÔNG TIN GIÁO VIÊN */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và Tên Giáo Viên (*):</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Ví dụ: Cô Hà Thị Trâm"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Công Việc (*):</label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="hathiram@quanghungpk1.edu.vn"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số Điện Thoại (SĐT):</label>
                <input
                  type="text"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  placeholder="0982957979"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số Định Danh (CCCD):</label>
                <input
                  type="text"
                  value={teacherSddcn}
                  onChange={(e) => setTeacherSddcn(e.target.value)}
                  placeholder="036175020668"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày Sinh (dd/mm/yyyy):</label>
                <input
                  type="text"
                  value={teacherDob}
                  onChange={(e) => setTeacherDob(e.target.value)}
                  placeholder="15/08/1985"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vai Trò Phân Quyền {!isSystemAdmin && <span className="text-[10px] text-slate-400 font-normal">(Chỉ Quản trị viên)</span>}:
                </label>
                <select
                  value={teacherRoleVal}
                  onChange={(e) => setTeacherRoleVal(e.target.value)}
                  disabled={!isSystemAdmin}
                  className={`w-full p-2.5 text-xs rounded-xl border border-slate-300 font-bold ${
                    !isSystemAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                  }`}
                >
                  <option value="Tổ trưởng chuyên môn">Tổ trưởng chuyên môn</option>
                  <option value="Giáo viên bộ môn">Giáo viên bộ môn</option>
                  <option value="Hiệu trưởng (BGH)">Hiệu trưởng (BGH)</option>
                  <option value="Quản trị viên (ADMIN)">Quản trị viên (ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tổ Chuyên Môn (*) {!isSystemAdmin && <span className="text-[10px] text-slate-400 font-normal">(Chỉ Quản trị viên)</span>}:
                </label>
                <select
                  value={normalizeDepartmentName(teacherToChuyenMon)}
                  onChange={(e) => setTeacherToChuyenMon(e.target.value)}
                  disabled={!isSystemAdmin}
                  className={`w-full p-2.5 text-xs rounded-xl border border-slate-300 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    !isSystemAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white cursor-pointer'
                  }`}
                  required
                >
                  {TEACHER_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-700">Biểu Tượng Avatar / Linh Vật / Logo:</label>
                
                {/* Avatar presets */}
                <div className="flex items-center gap-2 flex-wrap">
                  {['👩‍🏫', '👨‍🏫', '👨‍💼', '🦊', '🐰', '🦁', '🐼', '🐱'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setTeacherAvatar(emoji)}
                      className={`w-9 h-9 rounded-xl border text-lg flex items-center justify-center cursor-pointer transition-all ${
                        teacherAvatar === emoji
                          ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-400'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* File upload + Image URL input */}
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl cursor-pointer transition-all shrink-0 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tải ảnh từ máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setTeacherAvatar(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={teacherAvatar.startsWith('data:') ? 'Ảnh đã tải lên từ máy' : teacherAvatar}
                      onChange={(e) => setTeacherAvatar(e.target.value)}
                      placeholder="Hoặc dán link/URL ảnh (https://...)"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white font-medium"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">🔗</span>
                  </div>

                  {(teacherAvatar.startsWith('http') || teacherAvatar.startsWith('data:')) && (
                    <div className="w-9 h-9 rounded-xl border border-indigo-300 overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center shadow-2xs">
                      <img src={teacherAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Password Reset Section (Optional for Admin) */}
              <div className="sm:col-span-2 p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                      🔑 Đặt Lại Mật Khẩu (Tùy chọn)
                    </h4>
                    <p className="text-[11px] text-amber-800/80 font-medium">
                      Để trống cả 2 ô nếu không muốn đổi mật khẩu. Nếu nhập, mật khẩu mới tối thiểu 6 ký tự.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mật Khẩu Mới:</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 pr-9 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPassword ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Xác Nhận Mật Khẩu Mới:</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 pr-9 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PHÂN CÔNG GIẢNG DẠY */}
          {activeTab === 'teaching' && (
            <div className="space-y-3">
              {isSystemAdmin ? (
                <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900 font-medium">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Hướng dẫn phân công: </span>
                    Tick chọn các môn học giáo viên trực tiếp đảm nhận. Với mỗi môn được tick, chọn danh sách các lớp tương ứng mà giáo viên giảng dạy môn đó.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Chế độ xem phân công: </span>
                    Phân công giảng dạy các môn và lớp do Quản trị viên (ADMIN) / BGH quản lý. Thầy/Cô đang xem các phân công hiện tại của mình.
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {PRIMARY_SCHOOL_SUBJECTS.map((subj) => {
                  const item = teachingMap[subj] || { isChecked: false, classes: [] };
                  const isChecked = item.isChecked;
                  const selectedClasses = item.classes || [];

                  return (
                    <div
                      key={subj}
                      className={`border rounded-2xl transition-all overflow-hidden ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/30 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/40'
                      }`}
                    >
                      {/* Subject Main Header Row */}
                      <div
                        onClick={() => {
                          if (isSystemAdmin) handleToggleSubject(subj);
                        }}
                        className={`p-3.5 flex items-center justify-between select-none ${
                          isSystemAdmin ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!isSystemAdmin}
                            onChange={() => isSystemAdmin && handleToggleSubject(subj)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-60 cursor-pointer"
                          />
                          <span className={`text-xs font-black ${isChecked ? 'text-indigo-950' : 'text-slate-700'}`}>
                            {subj}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isChecked ? (
                            selectedClasses.length > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                Đã chọn {selectedClasses.length} lớp
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Chưa chọn lớp
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-200/60 text-slate-500">
                              Chưa dạy
                            </span>
                          )}
                          {isChecked ? (
                            <ChevronUp className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expandable Class Selector Section */}
                      {isChecked && (
                        <div className="px-3.5 pb-3.5 pt-2 border-t border-indigo-100 bg-white space-y-2.5 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                              <School className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Lớp được phân công dạy "{subj}":</span>
                            </label>
                            {isSystemAdmin && (
                              <div className="flex items-center gap-2 text-[10px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllClasses(subj)}
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                >
                                  Chọn tất cả
                                </button>
                                <span className="text-slate-300">•</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeselectAllClasses(subj)}
                                  className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                                >
                                  Bỏ chọn hết
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Classes Checkbox Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {(schoolClasses || []).map((clsName) => {
                              const isClassSelected = selectedClasses.includes(clsName);

                              if (!isSystemAdmin && !isClassSelected) return null;

                              return (
                                <button
                                  key={clsName}
                                  type="button"
                                  disabled={!isSystemAdmin}
                                  onClick={() => isSystemAdmin && handleToggleClass(subj, clsName)}
                                  className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                                    isClassSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                                  } ${!isSystemAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                  <span>{clsName}</span>
                                  {isClassSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {activeTab === 'teaching' && (
              <span>Tổng cộng: <strong className="text-indigo-600 font-extrabold">{activeSubjectCount} môn</strong> được phân công</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-200 active:scale-95"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


