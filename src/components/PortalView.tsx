import React, { useState, useEffect, useMemo } from 'react';
import { Volume2, HelpCircle, ArrowLeft, KeyRound, LogIn, Delete, RotateCcw, Sparkles, ArrowDownAZ, ArrowUpZA, AlertCircle } from 'lucide-react';
import { UserRole, StudentRecord } from '../types';
import { auth } from '../services/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getStudentsFromLocalStorage,
  getDefault5BRoster,
  generateDefaultClassRoster,
  fetchClassStudentsFromFirestore,
  saveStudentsToLocalStorage,
  sortStudentsByNameAZ,
  sortStudentsByNameZA,
  sortStudentsDescending,
  sortStudentsAscending,
  extractStudentNumericIndex
} from '../services/studentStorageService';
import { resolveTeacherNameByEmail, getCurrentTeacherProfile, verifyTeacherAuthorization } from '../services/teacherStorageService';
import { useClassesList } from '../services/classStorageService';
import { APP_NAME, APP_FULL_TITLE } from '../config/appConfig';
import { getStudentAvatarSource } from './common/AnimalAvatars';

interface PortalViewProps {
  onSelectPortal: (
    role: UserRole,
    grade?: string,
    selectedClass?: string,
    userDetails?: { email?: string; name?: string; student?: StudentRecord }
  ) => void;
}

// Cute Animal SVG Avatars for Students
const ANIMAL_AVATARS: Array<{ id: string; name: string; svg: React.ReactNode; bg: string }> = [
  {
    id: 'rabbit',
    name: 'Thỏ bông',
    bg: 'bg-slate-100',
    svg: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="55" r="38" fill="#E2E8F0" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="34" cy="22" rx="9" ry="22" fill="#E2E8F0" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="66" cy="22" rx="9" ry="22" fill="#E2E8F0" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="34" cy="22" rx="5" ry="16" fill="#F472B6" />
        <ellipse cx="66" cy="22" rx="5" ry="16" fill="#F472B6" />
        <circle cx="36" cy="52" r="5" fill="#1E293B" />
        <circle cx="64" cy="52" r="5" fill="#1E293B" />
        <circle cx="38" cy="50" r="1.5" fill="#FFFFFF" />
        <circle cx="66" cy="50" r="1.5" fill="#FFFFFF" />
        <ellipse cx="50" cy="60" rx="4" ry="3" fill="#F472B6" />
        <path d="M44 65 Q50 68 56 65" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="26" cy="58" rx="4" ry="2.5" fill="#FBCFE8" />
        <ellipse cx="74" cy="58" rx="4" ry="2.5" fill="#FBCFE8" />
      </svg>
    )
  },
  {
    id: 'fox',
    name: 'Cáo cam',
    bg: 'bg-orange-50',
    svg: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 100 100" fill="none">
        <polygon points="18,18 42,42 12,38" fill="#EA580C" stroke="#1E293B" strokeWidth="3" />
        <polygon points="82,18 58,42 88,38" fill="#EA580C" stroke="#1E293B" strokeWidth="3" />
        <polygon points="22,22 38,40 16,35" fill="#FFF" />
        <polygon points="78,22 62,40 84,35" fill="#FFF" />
        <circle cx="50" cy="54" r="38" fill="#F97316" stroke="#1E293B" strokeWidth="3" />
        <path d="M16 54 Q50 90 84 54 Q65 65 50 62 Q35 65 16 54 Z" fill="#FFF" />
        <circle cx="35" cy="48" r="5" fill="#1E293B" />
        <circle cx="65" cy="48" r="5" fill="#1E293B" />
        <circle cx="37" cy="46" r="1.5" fill="#FFF" />
        <circle cx="67" cy="46" r="1.5" fill="#FFF" />
        <polygon points="50,60 44,52 56,52" fill="#1E293B" />
      </svg>
    )
  },
  {
    id: 'pig',
    name: 'Heo hồng',
    bg: 'bg-rose-50',
    svg: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 100 100" fill="none">
        <polygon points="18,22 36,36 14,40" fill="#F472B6" stroke="#1E293B" strokeWidth="3" />
        <polygon points="82,22 64,36 86,40" fill="#F472B6" stroke="#1E293B" strokeWidth="3" />
        <circle cx="50" cy="54" r="38" fill="#FB7185" stroke="#1E293B" strokeWidth="3" />
        <circle cx="36" cy="46" r="5" fill="#1E293B" />
        <circle cx="64" cy="46" r="5" fill="#1E293B" />
        <ellipse cx="50" cy="62" rx="14" ry="10" fill="#FDA4AF" stroke="#1E293B" strokeWidth="2.5" />
        <ellipse cx="44" cy="62" rx="2.5" ry="4" fill="#1E293B" />
        <ellipse cx="56" cy="62" rx="2.5" ry="4" fill="#1E293B" />
        <circle cx="26" cy="56" r="4" fill="#F43F5E" opacity="0.6" />
        <circle cx="74" cy="56" r="4" fill="#F43F5E" opacity="0.6" />
      </svg>
    )
  },
  {
    id: 'tiger',
    name: 'Hổ vàng',
    bg: 'bg-amber-50',
    svg: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 100 100" fill="none">
        <circle cx="20" cy="28" r="12" fill="#F59E0B" stroke="#1E293B" strokeWidth="3" />
        <circle cx="80" cy="28" r="12" fill="#F59E0B" stroke="#1E293B" strokeWidth="3" />
        <circle cx="20" cy="28" r="6" fill="#FDE68A" />
        <circle cx="80" cy="28" r="6" fill="#FDE68A" />
        <circle cx="50" cy="54" r="38" fill="#F59E0B" stroke="#1E293B" strokeWidth="3" />
        <path d="M50 20 L50 32 M42 22 L45 30 M58 22 L55 30" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="36" cy="48" r="5" fill="#1E293B" />
        <circle cx="64" cy="48" r="5" fill="#1E293B" />
        <ellipse cx="50" cy="64" rx="14" ry="9" fill="#FFF" />
        <polygon points="50,62 44,56 56,56" fill="#1E293B" />
        <path d="M44 67 Q50 71 56 67" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'frog',
    name: 'Ếch xanh',
    bg: 'bg-emerald-50',
    svg: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 100 100" fill="none">
        <circle cx="30" cy="30" r="14" fill="#22C55E" stroke="#1E293B" strokeWidth="3" />
        <circle cx="70" cy="30" r="14" fill="#22C55E" stroke="#1E293B" strokeWidth="3" />
        <circle cx="30" cy="30" r="8" fill="#FFF" />
        <circle cx="70" cy="30" r="8" fill="#FFF" />
        <circle cx="30" cy="30" r="4" fill="#1E293B" />
        <circle cx="70" cy="30" r="4" fill="#1E293B" />
        <ellipse cx="50" cy="58" rx="38" ry="30" fill="#22C55E" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="50" cy="64" rx="20" ry="15" fill="#86EFAC" />
        <path d="M34 62 Q50 74 66 62" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="58" r="3.5" fill="#F472B6" />
        <circle cx="76" cy="58" r="3.5" fill="#F472B6" />
      </svg>
    )
  },
  {
    id: 'koala',
    name: 'Koala xám',
    bg: 'bg-slate-100',
    svg: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 100 100" fill="none">
        <circle cx="18" cy="32" r="14" fill="#94A3B8" stroke="#1E293B" strokeWidth="3" />
        <circle cx="82" cy="32" r="14" fill="#94A3B8" stroke="#1E293B" strokeWidth="3" />
        <circle cx="18" cy="32" r="7" fill="#E2E8F0" />
        <circle cx="82" cy="32" r="7" fill="#E2E8F0" />
        <circle cx="50" cy="55" r="36" fill="#94A3B8" stroke="#1E293B" strokeWidth="3" />
        <circle cx="36" cy="48" r="4.5" fill="#1E293B" />
        <circle cx="64" cy="48" r="4.5" fill="#1E293B" />
        <ellipse cx="50" cy="58" rx="8" ry="12" fill="#1E293B" />
        <ellipse cx="48" cy="54" rx="2" ry="3" fill="#64748B" />
        <circle cx="26" cy="56" r="3" fill="#F472B6" opacity="0.6" />
        <circle cx="74" cy="56" r="3" fill="#F472B6" opacity="0.6" />
      </svg>
    )
  },
  {
    id: 'octopus',
    name: 'Bạch tuộc',
    bg: 'bg-rose-50',
    svg: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="45" rx="34" ry="30" fill="#E11D48" stroke="#1E293B" strokeWidth="3" />
        <circle cx="38" cy="42" r="6" fill="#FFF" />
        <circle cx="62" cy="42" r="6" fill="#FFF" />
        <circle cx="38" cy="42" r="3.5" fill="#1E293B" />
        <circle cx="62" cy="42" r="3.5" fill="#1E293B" />
        <ellipse cx="50" cy="56" rx="4" ry="3" fill="#1E293B" />
        <path d="M22 68 Q24 88 32 75 Q40 88 48 75 Q56 88 64 75 Q72 88 78 68" fill="#E11D48" stroke="#1E293B" strokeWidth="3" />
        <circle cx="26" cy="48" r="3" fill="#FDA4AF" />
        <circle cx="74" cy="48" r="3" fill="#FDA4AF" />
      </svg>
    )
  },
  {
    id: 'panda',
    name: 'Gấu trúc',
    bg: 'bg-slate-50',
    svg: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 100 100" fill="none">
        <circle cx="22" cy="24" r="12" fill="#1E293B" />
        <circle cx="78" cy="24" r="12" fill="#1E293B" />
        <circle cx="50" cy="54" r="38" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="36" cy="46" rx="9" ry="11" fill="#1E293B" transform="rotate(-15 36 46)" />
        <ellipse cx="64" cy="46" rx="9" ry="11" fill="#1E293B" transform="rotate(15 64 46)" />
        <circle cx="36" cy="45" r="3.5" fill="#FFF" />
        <circle cx="64" cy="45" r="3.5" fill="#FFF" />
        <ellipse cx="50" cy="58" rx="6" ry="4" fill="#1E293B" />
        <path d="M44 64 Q50 67 56 64" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
];

// Helper to get consistent avatar for a student by index or name
function getStudentAvatar(index: number) {
  return ANIMAL_AVATARS[index % ANIMAL_AVATARS.length];
}

// Generate complete student rosters for all classes
function generateClassRoster(className: string): StudentRecord[] {
  const prefix = className.replace(/Lớp\s*/i, '').toLowerCase();

  if (className === 'Lớp 5B') {
    const list5B = [
      'Hà Nhật An', 'Phạm Lê Khang An', 'Trần Gia An', 'Hoàng Thùy Anh', 'Lê Trần Huyền Anh',
      'Đồng Gia Bảo', 'Dương Thị Thùy Chi', 'Mai Thành Danh', 'Đoàn Đức Duy', 'Đồng Tiến Đạt',
      'Đồng Tuấn Đạt', 'Trần Minh Đức', 'Trần Minh Đức', 'Bùi Gia Hân', 'Hà Minh Hân',
      'Nguyễn Duy Hoan', 'Dương Đức Hùng', 'Đồng Gia Huy', 'Đặng Thanh Thanh Huyền', 'Nguyễn Thị Thu Hường',
      'Hoàng An Khang', 'Hoàng Nhật Khang', 'Phan Như Mai', 'Hà Thị Kim Ngân', 'Phạm Lê Khánh Ngân',
      'Đoàn Bảo Ngọc', 'Đồng Hải Nguyên'
    ];
    return list5B.map((name, idx) => ({
      id: `st-5b-${idx + 1}`,
      stt: idx + 1,
      code: `${prefix}${idx + 1}`,
      username: `${prefix}${idx + 1}`,
      pin: '123456',
      password: '123456',
      name,
      fullName: name,
      className: 'Lớp 5B',
      gender: (idx % 2 === 0 ? 'Nam' : 'Nữ') as 'Nam' | 'Nữ',
      dob: '22/01/2016',
      birthday: '22/01/2016'
    }));
  }

  // Generic roster generator for other classes (e.g. 3A, 3B, 4A, 5A, 1A, 2A...)
  const sampleNames = [
    'Hoàng Bảo An', 'Hà Việt Anh', 'Ngô Nhật Hưng', 'Nguyễn Minh Quân',
    'Hoàng Tuấn Kiệt', 'Đỗ Diệu Linh', 'Phan Tú Uyên', 'Hà Bảo Nam',
    'Trần Quỳnh Chi', 'Lê Gia Huy', 'Phạm Ngọc Diệp', 'Vũ Khánh Linh',
    'Bùi Đức Phúc', 'Đặng Mai Phương', 'Trịnh Quốc Bảo', 'Lương Thảo Nguyên',
    'Cao Tiến Đạt', 'Mai Bảo Châu', 'Nguyễn Phương Thảo', 'Dương Nhật Minh'
  ];

  return sampleNames.map((name, idx) => ({
    id: `st-${prefix}-${idx + 1}`,
    stt: idx + 1,
    code: `${prefix}${idx + 1}`,
    username: `${prefix}${idx + 1}`,
    pin: '123456',
    password: '123456',
    name,
    fullName: name,
    className,
    gender: (idx % 2 === 0 ? 'Nam' : 'Nữ') as 'Nam' | 'Nữ',
    dob: '15/05/2016',
    birthday: '15/05/2016'
  }));
}

export function PortalView({ onSelectPortal }: PortalViewProps) {
  // Navigation Modes:
  // 'gateway' -> Gateway selection (Student vs Teacher)
  // 'student_grades' -> Step 1 & 2: Select Grade & Class
  // 'student_roster' -> Step 3: Avatar Grid of Class Students
  // 'student_pin' -> Step 4: 6-digit Secret PIN Keypad
  // 'student_welcome' -> Step 5: Welcome Banner -> Click to Enter
  // 'teacher_login' -> Teacher auth portal
  const [portalMode, setPortalMode] = useState<
    'gateway' | 'student_grades' | 'student_roster' | 'student_pin' | 'student_welcome' | 'teacher_login'
  >('gateway');

  const { getClassesForGrade } = useClassesList();
  const [selectedGrade, setSelectedGrade] = useState<string>('Khối 3');
  const [selectedClass, setSelectedClass] = useState<string>('Lớp 3C');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Teacher form state
  const [teacherEmail, setTeacherEmail] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  const grades = useMemo(() => {
    const allGrades = ['Khối 3'];
    return allGrades.map(g => {
      const clsList = getClassesForGrade ? getClassesForGrade(g) : [];
      return {
        id: g,
        name: g,
        classes: Array.from(new Set((clsList || []).map(c => c?.name).filter(Boolean)))
      };
    });
  }, [getClassesForGrade]);

  const currentGradeObj = (grades && grades.length > 0)
    ? (grades.find((g) => g.id === selectedGrade) || grades[0])
    : { id: 'Khối 3', name: 'Khối 3', classes: [] };

  // Sorting Direction State (Defaults to Alphabetical A-Z by Student Name)
  const [sortDirection, setSortDirection] = useState<'name_asc' | 'name_desc' | 'desc' | 'asc'>('name_asc');

  // Get current class student list (with LocalStorage & Firestore persistence)
  const [currentClassStudents, setCurrentClassStudents] = useState<StudentRecord[]>(() => {
    const cached = getStudentsFromLocalStorage(selectedClass);
    if (cached && cached.length > 0) return cached;
    return [];
  });

  // Derived sorted student list based on current sort direction (Alphabetical A-Z by default)
  const displayedStudents = useMemo(() => {
    if (sortDirection === 'name_asc') {
      return sortStudentsByNameAZ(currentClassStudents, selectedClass);
    } else if (sortDirection === 'name_desc') {
      return sortStudentsByNameZA(currentClassStudents, selectedClass);
    } else if (sortDirection === 'desc') {
      return sortStudentsDescending(currentClassStudents, selectedClass);
    } else {
      return sortStudentsAscending(currentClassStudents, selectedClass);
    }
  }, [currentClassStudents, sortDirection, selectedClass]);

  // Re-fetch and sync when selectedClass changes or window update event occurs
  useEffect(() => {
    const loadClassRoster = () => {
      const cached = getStudentsFromLocalStorage(selectedClass);
      if (cached && cached.length > 0) {
        setCurrentClassStudents(cached);
      } else {
        fetchClassStudentsFromFirestore(selectedClass).then((cloudStudents) => {
          if (cloudStudents && cloudStudents.length > 0) {
            setCurrentClassStudents(cloudStudents);
          } else {
            setCurrentClassStudents([]);
          }
        }).catch(() => {
          setCurrentClassStudents([]);
        });
      }
    };

    loadClassRoster();

    // Background attempt to load latest roster from Firestore
    fetchClassStudentsFromFirestore(selectedClass).then((cloudStudents) => {
      if (cloudStudents && cloudStudents.length > 0) {
        setCurrentClassStudents(cloudStudents);
      }
    }).catch(() => {});

    // Listen to live update event from User Management Module
    const handleUpdate = () => {
      loadClassRoster();
    };
    window.addEventListener('eduplay_students_updated', handleUpdate);

    return () => {
      window.removeEventListener('eduplay_students_updated', handleUpdate);
    };
  }, [selectedClass]);

  // Helper to persist teacher info
  const saveTeacherSession = (email: string, name?: string) => {
    try {
      localStorage.setItem('eduplay_teacher_email', email);
      if (name) {
        localStorage.setItem('eduplay_teacher_name', name);
      }
    } catch (e) {
      console.warn('Cannot save teacher session to localStorage', e);
    }
  };

  // Helper to persist student info
  const saveStudentSession = (student: StudentRecord) => {
    try {
      localStorage.setItem('eduplay_student_session', JSON.stringify(student));
    } catch (e) {
      console.warn('Cannot save student session to localStorage', e);
    }
  };

  // Step 2 Click Class Handler: Switch directly to student_roster view inside Portal
  const handleSelectClass = (cls: string) => {
    setSelectedClass(cls);
    setSelectedStudent(null);
    setPinInput('');
    setPinError(null);
    setPortalMode('student_roster');
  };

  // Step 3 Click Student Card: Open PIN keypad
  const handleSelectStudentCard = (student: StudentRecord) => {
    setSelectedStudent(student);
    setPinInput('');
    setPinError(null);
    setPortalMode('student_pin');
  };

  // Keypad Handlers
  const handleKeypadPress = (num: string) => {
    if (pinInput.length < 6) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      setPinError(null);
      if (nextPin.length === 6) {
        validatePin(nextPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleKeypadClear = () => {
    setPinInput('');
    setPinError(null);
  };

  // Validate 6-digit PIN
  const validatePin = (pin: string) => {
    // Default PIN is 123456 or match student.pin
    const expectedPin = selectedStudent?.pin || '123456';
    if (pin === expectedPin || pin === '123456') {
      setTimeout(() => {
        setPortalMode('student_welcome');
      }, 250);
    } else {
      setPinError('Mã số bí mật chưa đúng! Bé hãy thử lại hoặc dùng 123456 nhé.');
    }
  };

  // Final Action: Enter Student Learning Room
  const handleEnterStudentRoom = () => {
    if (!selectedStudent) return;
    const studentEmail = selectedStudent.email || `hs.${selectedStudent.code}@quanghungpk1.edu.vn`;
    saveStudentSession(selectedStudent);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('eduplay_student_explicit_dashboard');
      } catch {}
    }
    onSelectPortal('student', selectedGrade, selectedClass, {
      name: selectedStudent.name,
      email: studentEmail,
      student: selectedStudent
    });
  };

  // Handle Physical Keyboard for PIN
  useEffect(() => {
    if (portalMode !== 'student_pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeypadBackspace();
      } else if (e.key === 'Escape') {
        handleKeypadClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [portalMode, pinInput, selectedStudent]);

  // Handle Teacher Login with Email/Password
  const handleTeacherLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      if (!teacherEmail || !teacherPassword) {
        throw new Error('Vui lòng nhập đầy đủ email và mật khẩu.');
      }

      const cleanEmail = teacherEmail.trim().toLowerCase();

      // Check whitelist before allowing access
      const authCheck = await verifyTeacherAuthorization(cleanEmail);
      if (!authCheck.authorized || !authCheck.profile) {
        throw new Error(
          authCheck.reason || 'Tài khoản này chưa được đăng ký trong hệ thống. Vui lòng liên hệ quản trị viên.'
        );
      }

      if (auth) {
        await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
      }

      const profile = authCheck.profile;
      const resolvedName = profile.name || resolveTeacherNameByEmail(cleanEmail, teacherName);
      saveTeacherSession(cleanEmail, resolvedName);
      onSelectPortal(profile.userRole, 'Khối 3', 'Lớp 3A', { email: cleanEmail, name: resolvedName });
    } catch (err: any) {
      console.error('Teacher login error:', err);
      // Ensure any authenticated session is invalidated on authorization failure
      if (auth && auth.currentUser) {
        try {
          await signOut(auth);
        } catch {}
      }
      let errMsg = err.message || 'Đăng nhập thất bại';
      if (errMsg.includes('wrong-password') || errMsg.includes('invalid-credential') || errMsg.includes('user-not-found')) {
        errMsg = 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
      }
      setAuthError(errMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (!auth) {
        throw new Error('Dịch vụ xác thực Firebase chưa sẵn sàng. Vui lòng thử lại sau.');
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      const gUser = res.user;
      const email = (gUser?.email || '').trim().toLowerCase();

      if (!email) {
        await signOut(auth);
        throw new Error('Không thể xác thực địa chỉ email từ tài khoản Google.');
      }

      // Step 1: Whitelist Verification query against Firestore collections & registered teachers
      const authCheck = await verifyTeacherAuthorization(email);
      if (!authCheck.authorized || !authCheck.profile) {
        // Step 2: Immediately sign out unauthorized user from Firebase Auth session
        await signOut(auth);
        // Step 3: Reject access & show clear localized error
        throw new Error(
          'Tài khoản Google này chưa được đăng ký trong hệ thống. Vui lòng liên hệ quản trị viên.'
        );
      }

      // Step 4: Proceed to appropriate dashboard ONLY when email matches registered teacher/admin record
      const profile = authCheck.profile;
      const resolvedName = profile.name || gUser.displayName || resolveTeacherNameByEmail(email, teacherName);
      saveTeacherSession(email, resolvedName);
      onSelectPortal(profile.userRole, 'Khối 3', 'Lớp 3A', { email, name: resolvedName });
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      // Safety guarantee: Ensure signOut on any authorization/login failure
      if (auth && auth.currentUser) {
        try {
          await signOut(auth);
        } catch {}
      }
      let errMsg = err.message || 'Đăng nhập Google thất bại';
      if (errMsg.includes('popup-closed-by-user')) {
        errMsg = 'Cửa sổ đăng nhập Google đã bị đóng. Vui lòng thử lại.';
      }
      setAuthError(errMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Back Navigation Resolver
  const handleBackNavigation = () => {
    if (portalMode === 'student_welcome') {
      setPortalMode('student_pin');
    } else if (portalMode === 'student_pin') {
      setPortalMode('student_roster');
    } else if (portalMode === 'student_roster') {
      setPortalMode('student_grades');
    } else if (portalMode === 'student_grades' || portalMode === 'teacher_login') {
      setPortalMode('gateway');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#064e3b] via-[#0f172a] to-[#022c22] flex items-center justify-center p-3 sm:p-6 font-sans">
      {/* Central Portal Container */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-5 sm:p-9 border border-slate-100 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Controls Bar */}
        <div className="flex items-center justify-between mb-3">
          {portalMode !== 'gateway' ? (
            <button
              onClick={handleBackNavigation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> ← QUAY LẠI BƯỚC TRƯỚC
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {portalMode === 'teacher_login' && (
              <span className="text-xl" title="Giáo viên">
                👩‍🏫
              </span>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                soundEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}
              title={soundEnabled ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                alert(`${APP_FULL_TITLE} - Nền tảng học tập tương tác & quản lý dạy học thông minh cho Tiểu học.`)
              }
              className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-full transition-colors cursor-pointer"
              title="Trợ giúp"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Portal Header - Positioned higher with elegant spacing */}
        <div className="text-center mb-6 sm:mb-8 pt-1">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 mb-2 shadow-xs text-3xl sm:text-4xl transition-transform hover:scale-105">
            🍀
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#4F46E5] tracking-tight font-heading mt-1 uppercase">
            {APP_NAME}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Cổng Đăng Nhập & Học Tập Số Chuẩn Sư Phạm Tiểu Học
          </p>
        </div>

        {/* =========================================================================
            1. GATEWAY MODE: 2 Big Cards
            ========================================================================= */}
        {portalMode === 'gateway' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-4">
            {/* Student Portal Card */}
            <div
              onClick={() => setPortalMode('student_grades')}
              className="group border-2 border-amber-200 hover:border-amber-400 bg-amber-50/30 hover:bg-amber-50/60 rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md flex flex-col items-center justify-between"
            >
              <div className="w-20 h-20 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-inner text-4xl">
                🎒
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                  CỔNG HỌC SINH
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed px-2">
                  Các bé nhấp vào đây để chọn lớp học và làm bài nhé!
                </p>
              </div>
              <div className="mt-5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold shadow-xs transition-colors">
                Vào Cổng Học Sinh →
              </div>
            </div>

            {/* Teacher Portal Card */}
            <div
              onClick={() => setPortalMode('teacher_login')}
              className="group border-2 border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md flex flex-col items-center justify-between"
            >
              <div className="w-20 h-20 rounded-2xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-inner text-4xl">
                👩‍🏫
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-800 transition-colors">
                  CỔNG GIÁO VIÊN
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed px-2">
                  Quản lý lớp học, ngân hàng câu hỏi & giao bài kiểm tra.
                </p>
              </div>
              <div className="mt-5 px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-full text-xs font-bold shadow-xs transition-colors">
                Vào Cổng Giáo Viên →
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            2. STUDENT GRADE & CLASS SELECTION (Step 1 & 2)
            ========================================================================= */}
        {portalMode === 'student_grades' && (
          <div className="space-y-5 mb-6 animate-in fade-in duration-200">
            {/* Step 1: Grade Selection */}
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 sm:p-5">
              <p className="text-xs font-bold text-amber-900 mb-2.5 flex items-center gap-1.5">
                👉 Bước 1: Bé hãy chọn Khối học của mình trước nhé:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {grades.map((grade) => (
                  <button
                    key={grade.id}
                    onClick={() => setSelectedGrade(grade.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedGrade === grade.id
                        ? 'bg-amber-500 text-white shadow-md scale-105 ring-2 ring-amber-300'
                        : 'bg-white hover:bg-amber-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {grade.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Class Selection */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
              <p className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
                🏫 BƯỚC 2: BÉ HÃY NHẤP CHỌN LỚP HỌC TƯƠNG ỨNG ({selectedGrade}):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(currentGradeObj?.classes || []).length === 0 ? (
                  <div className="col-span-full py-6 text-center text-xs text-slate-500 font-medium">
                    Chưa có lớp học nào được tạo cho {selectedGrade}. Vui lòng đăng nhập tài khoản Quản trị viên để thêm lớp.
                  </div>
                ) : (
                  (currentGradeObj?.classes || []).map((cls) => (
                    <div
                      key={cls}
                      onClick={() => handleSelectClass(cls)}
                      className="group border-2 border-indigo-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 rounded-2xl p-3.5 text-center cursor-pointer transition-all shadow-xs flex items-center gap-3.5 active:scale-98"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-2xl shadow-inner">
                        🏫
                      </div>
                      <div className="text-left flex-1">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">{cls}</h4>
                        <p className="text-[11px] text-slate-500">Học sinh {selectedGrade} • Sẵn sàng làm bài</p>
                      </div>
                      <div className="text-indigo-600 font-bold text-sm">→</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            3. STUDENT AVATAR GRID (Step 3: StudentListView / ClassStudentGrid)
            ========================================================================= */}
        {portalMode === 'student_roster' && (
          <div className="space-y-4 mb-6 animate-in fade-in duration-200">
            {/* Header / Info Badge & Sorting Controls */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                <span>⭐</span>
                <span>BÉ HÃY CHỌN ĐÚNG HÌNH/TÊN CỦA MÌNH DƯỚI ĐÂY:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-lg">
                  {selectedClass} ({currentClassStudents.length} học sinh)
                </span>
                <button
                  onClick={() => {
                    setSortDirection((prev) => {
                      if (prev === 'name_asc') return 'name_desc';
                      if (prev === 'name_desc') return 'desc';
                      if (prev === 'desc') return 'asc';
                      return 'name_asc';
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                  title="Bấm để chuyển đổi thứ tự: Tên A-Z, Tên Z-A, Mã HS"
                >
                  {sortDirection === 'name_asc' && (
                    <>
                      <ArrowUpZA className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-800">🔤 Tên A ➔ Z</span>
                    </>
                  )}
                  {sortDirection === 'name_desc' && (
                    <>
                      <ArrowDownAZ className="w-3.5 h-3.5 text-amber-700" />
                      <span>🔤 Tên Z ➔ A</span>
                    </>
                  )}
                  {sortDirection === 'desc' && (
                    <>
                      <ArrowDownAZ className="w-3.5 h-3.5 text-slate-700" />
                      <span>🔢 Mã HS Giảm dần</span>
                    </>
                  )}
                  {sortDirection === 'asc' && (
                    <>
                      <ArrowUpZA className="w-3.5 h-3.5 text-slate-700" />
                      <span>🔢 Mã HS Tăng dần</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Avatar Grid Container with smooth scroll */}
            {displayedStudents.length === 0 ? (
              <div className="py-14 text-center text-slate-500 bg-slate-50/80 rounded-3xl border-2 border-dashed border-slate-200 p-6 my-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-extrabold text-slate-700">Chưa có dữ liệu học sinh trong lớp {selectedClass}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Lớp học hiện chưa có danh sách học sinh. Thầy cô vui lòng cập nhật danh sách lớp trong phân hệ Quản Lý Người Dùng.
                </p>
              </div>
            ) : (
              <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-4 gap-3.5 custom-scrollbar">
                {displayedStudents.map((st, idx) => {
                  const numericIdx = extractStudentNumericIndex(st);
                  const avatar = getStudentAvatar(numericIdx > 0 ? numericIdx - 1 : 0);
                  const isSelected = selectedStudent?.id === st.id;
                  const displayCode = st.code || st.username || `${selectedClass.replace(/Lớp\s*/i, '').toLowerCase()}${numericIdx || 1}`;
                  const displayStt = st.stt || numericIdx;

                  return (
                    <div
                      key={st.id ? `${st.id}-${idx}` : `student-${idx}`}
                      onClick={() => handleSelectStudentCard(st)}
                      className={`group bg-white rounded-2xl sm:rounded-3xl p-3 sm:py-3.5 sm:px-3 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-start border shadow-2xs hover:shadow-md hover:scale-[1.03] active:scale-95 min-h-[148px] sm:min-h-[160px] ${
                        isSelected
                          ? 'border-2 border-amber-400 bg-amber-50/40 ring-2 ring-amber-200'
                          : 'border-slate-200/90 hover:border-amber-400'
                      }`}
                    >
                      {/* Animal or Uploaded Avatar Circle */}
                      <div
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-slate-200/60 flex items-center justify-center mb-1.5 group-hover:rotate-6 transition-transform shadow-inner shrink-0 overflow-hidden bg-white p-0.5"
                      >
                        <img
                          src={getStudentAvatarSource(st, st.name)}
                          alt={st.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>

                      {/* Student Code */}
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider mb-1 uppercase shrink-0">
                        {displayCode}
                      </span>

                      {/* Student Full Name with STT - Fully visible, wrapping naturally without truncation */}
                      <div className="w-full flex-1 flex items-center justify-center min-h-[2.5rem] sm:min-h-[2.85rem] px-0.5">
                        <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-800 group-hover:text-amber-700 transition-colors leading-snug text-center break-words w-full">
                          {displayStt ? `${displayStt}. ` : ''}{st.name}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            4. SECRET 6-DIGIT PIN KEYPAD (Step 4)
            ========================================================================= */}
        {portalMode === 'student_pin' && selectedStudent && (
          <div className="space-y-4 mb-6 animate-in fade-in duration-200 max-w-md mx-auto">
            {/* Selected Student Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white border border-rose-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                  <img
                    src={getStudentAvatarSource(selectedStudent, selectedStudent.name)}
                    alt={selectedStudent.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-slate-500 font-medium">Bé đang chọn:</p>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {selectedStudent.name} ({selectedClass})
                  </h4>
                </div>
              </div>

              <button
                onClick={() => setPortalMode('student_roster')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đổi bạn khác</span>
              </button>
            </div>

            {/* Secret PIN Instruction */}
            <div className="text-center pt-1">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                NHẬP MÃ SỐ BÍ MẬT (6 SỐ)
              </h3>

              {/* 6 Digit Display Circles */}
              <div className="flex justify-center items-center gap-2 sm:gap-2.5 mb-2">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const hasChar = pinInput.length > idx;
                  const isCurrent = pinInput.length === idx;
                  return (
                    <div
                      key={idx}
                      className={`w-10 h-12 sm:w-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'border-indigo-500 bg-white ring-2 ring-indigo-200 scale-105'
                          : hasChar
                          ? 'border-indigo-400 bg-indigo-50/50 shadow-inner'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      {hasChar ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 animate-in zoom-in-50 duration-150" />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Error Message */}
              {pinError && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200 animate-shake mb-2">
                  {pinError}
                </p>
              )}

              {/* Hint */}
              <div className="text-xs text-amber-700 bg-amber-50/80 border border-amber-200/80 rounded-xl py-1.5 px-3 inline-flex items-center gap-1 font-medium">
                <span>🔒 💡 Gợi ý khích lệ học tập: Thử mật mã</span>
                <span className="font-extrabold text-amber-800">123456</span>
                <span>nha các bé!</span>
              </div>
            </div>

            {/* Custom On-Screen Keypad */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(String(num))}
                  className="py-3 sm:py-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-lg sm:text-xl rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {num}
                </button>
              ))}

              {/* Bottom Row */}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="py-3 sm:py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              >
                Xóa hết
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-3 sm:py-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-lg sm:text-xl rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-3 sm:py-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                title="Xóa 1 số"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            5. STUDENT WELCOME BANNER (Step 5)
            ========================================================================= */}
        {portalMode === 'student_welcome' && selectedStudent && (
          <div className="space-y-5 mb-6 text-center animate-in zoom-in-95 duration-300 py-2">
            {/* Big Avatar */}
            <div className="inline-flex p-1.5 rounded-full bg-amber-50 border-4 border-amber-200 shadow-md">
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-full overflow-hidden bg-white">
                <img
                  src={getStudentAvatarSource(selectedStudent, selectedStudent.name)}
                  alt={selectedStudent.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            {/* Welcome Greeting */}
            <div className="space-y-1.5 px-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-800 tracking-tight flex items-center justify-center gap-2">
                <span>🎉</span>
                <span>Chào mừng {selectedStudent.name} quay trở lại trường học!</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Bé đã sẵn sàng khám phá thế giới tin học lí thú cùng lớp học{' '}
                <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {selectedClass}
                </span>{' '}
                chưa?
              </p>
            </div>

            {/* Coin Badge */}
            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 font-extrabold text-xs sm:text-sm rounded-full shadow-2xs">
              <span>🪙</span>
              <span>Đang sở hữu: 1000 xu thưởng học tập!</span>
            </div>

            {/* Energy / Progress Green Bar */}
            <div className="w-48 mx-auto h-2 bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-full rounded-full animate-pulse" />
            </div>

            {/* Enter Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleEnterStudentRoom}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 mx-auto"
              >
                <span>VÀO HỌC NGAY THÔI!</span>
                <span>🚀</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            6. TEACHER PORTAL LOGIN VIEW
            ========================================================================= */}
        {portalMode === 'teacher_login' && (
          <div className="space-y-4 mb-6 animate-in fade-in duration-200">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold text-left">
                {authError}
              </div>
            )}

            {/* Teacher Login Form */}
            <form onSubmit={handleTeacherLogin} autoComplete="off" className="space-y-3.5 text-left">
              {/* Hidden dummy inputs to trick browser password managers from autofilling real inputs */}
              <input type="text" name="fakeusernameremembered" style={{ display: 'none' }} autoComplete="username" />
              <input type="password" name="fakepasswordremembers" style={{ display: 'none' }} autoComplete="current-password" />

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  ĐỊA CHỈ THƯ ĐIỆN TỬ (EMAIL)
                </label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  name="random_email_xyz_9812"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  MẬT KHẨU (TỐI THIỂU 6 KÝ TỰ)
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  name="secure_password_field_xyz_7749"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm text-slate-800"
                />
              </div>

              {/* Buttons Stack */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" /> Bắt đầu làm việc ngay
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isAuthLoading}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-200 text-slate-700 rounded-xl font-bold text-sm shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Đăng nhập bằng Google</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <button
            onClick={() =>
              alert('Vui lòng liên hệ Quản trị viên nhà trường để cấp lại mật khẩu hoặc mã PIN truy cập.')
            }
            className="flex items-center gap-1.5 text-amber-700 hover:text-amber-800 font-bold transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" /> Quên mật mã / mã PIN?
          </button>
          <div className="text-slate-400 font-medium">
            {APP_NAME} • Thiết kế dành riêng cho Tiểu học 🎒
          </div>
        </div>

      </div>
    </div>
  );
}

