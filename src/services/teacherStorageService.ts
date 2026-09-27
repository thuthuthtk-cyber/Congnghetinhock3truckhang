import { TeacherRecord, initialTeachersList } from '../components/modules/UserManagementModule';
export type { TeacherRecord };
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, getDocs, collection, writeBatch, query, where } from 'firebase/firestore';
import { UserRole } from '../types';

export const EDUPLAY_TEACHERS_KEY = 'eduplay_teachers_database';
export const EDUPLAY_DEPARTMENTS_KEY = 'eduplay_departments_database';

export interface DepartmentInfo {
  id: string; // e.g. 'bgh', 'to-1', 'to-2-3', 'to-4-5', 'to-chuyen-biet'
  name: string; // e.g. 'Ban Giám Hiệu', 'Tổ 1', 'Tổ 2+3', 'Tổ 4+5', 'Tổ Chuyên biệt'
  title: string;
  leader?: string; // Leader name / ID
  memberIds: string[];
  totalMembers: number;
  description: string;
  subjects: string[];
  updatedAt?: string;
}

/**
 * Safely remove undefined values recursively from objects and arrays to prevent Firestore errors
 */
export function removeUndefined<T>(obj: T): T {
  if (obj === undefined) return '' as any;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => removeUndefined(item)) as any;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      } else {
        cleaned[key] = '';
      }
    }
    return cleaned;
  }
  return obj;
}

export const TEACHER_DEPARTMENTS = [
  'Tổ Ban Giám Hiệu',
  'Tổ 1',
  'Tổ 2',
  'Tổ 3',
  'Tổ 4',
  'Tổ 5'
] as const;

export type DepartmentName = typeof TEACHER_DEPARTMENTS[number];

/**
 * Normalizes old department names (e.g. 'Ban Giám Hiệu', 'Tổ 2+3', 'Tổ 4+5', 'Tổ Chuyên biệt')
 * to one of the 6 standard departments without breaking existing saved teacher data.
 */
export function normalizeDepartmentName(dept: string = '', teacher?: Partial<TeacherRecord>): string {
  const clean = (dept || '').trim();
  if (!clean) return 'Tổ 1';

  if (clean === 'Ban Giám Hiệu' || clean === 'Tổ Ban Giám Hiệu') return 'Tổ Ban Giám Hiệu';
  if (clean === 'Tổ 1') return 'Tổ 1';
  if (clean === 'Tổ 2') return 'Tổ 2';
  if (clean === 'Tổ 3') return 'Tổ 3';
  if (clean === 'Tổ 4') return 'Tổ 4';
  if (clean === 'Tổ 5') return 'Tổ 5';

  if (clean === 'Tổ 2+3') {
    const isGrade3 = teacher?.homeroomClasses?.some(c => c.includes('3')) || teacher?.subject?.includes('3');
    return isGrade3 ? 'Tổ 3' : 'Tổ 2';
  }

  if (clean === 'Tổ 4+5') {
    const isGrade5 = teacher?.homeroomClasses?.some(c => c.includes('5')) || teacher?.subject?.includes('5');
    return isGrade5 ? 'Tổ 5' : 'Tổ 4';
  }

  if (clean === 'Tổ Chuyên biệt') {
    return 'Tổ Ban Giám Hiệu';
  }

  return clean;
}

export const DEPARTMENTS_METADATA: Record<string, {
  slug: string;
  title: string;
  desc: string;
  defaultSubjects: string[];
  icon: string;
  badge: string;
  border: string;
  headerBg: string;
  statColor: string;
}> = {
  'Tổ Ban Giám Hiệu': {
    slug: 'to-bgh',
    title: 'Tổ Ban Giám Hiệu & Quản Trị Hệ Thống',
    desc: 'Cán bộ chỉ đạo chuyên môn toàn trường & Quản trị viên hệ thống RBAC',
    defaultSubjects: ['Quản lý giáo dục', 'Tin học & CNTT'],
    icon: '🏛️',
    badge: 'BGH & Admin',
    border: 'border-amber-200',
    headerBg: 'bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-orange-50/20 text-amber-950',
    statColor: 'bg-amber-50 border-amber-200 text-amber-900'
  },
  'Tổ 1': {
    slug: 'to-1',
    title: 'Tổ Chuyên Môn 1 (Khối Lớp 1)',
    desc: 'Giáo viên phụ trách khối 1: Toán, Tiếng Việt & Hoạt động trải nghiệm',
    defaultSubjects: ['Toán', 'Tiếng Việt', 'Hoạt động trải nghiệm', 'Đạo đức', 'Tự nhiên & Xã hội'],
    icon: '📚',
    badge: 'Tổ Chuyên Môn 1',
    border: 'border-blue-200',
    headerBg: 'bg-gradient-to-r from-blue-500/10 via-blue-100/30 to-indigo-50/20 text-blue-950',
    statColor: 'bg-blue-50 border-blue-200 text-blue-900'
  },
  'Tổ 2': {
    slug: 'to-2',
    title: 'Tổ Chuyên Môn 2 (Khối Lớp 2)',
    desc: 'Giáo viên phụ trách khối 2: Toán, Tiếng Việt, Tự nhiên & Xã hội',
    defaultSubjects: ['Toán', 'Tiếng Việt', 'Hoạt động trải nghiệm', 'Đạo đức', 'Tự nhiên & Xã hội'],
    icon: '📖',
    badge: 'Tổ Chuyên Môn 2',
    border: 'border-emerald-200',
    headerBg: 'bg-gradient-to-r from-emerald-500/10 via-emerald-100/30 to-teal-50/20 text-emerald-950',
    statColor: 'bg-emerald-50 border-emerald-200 text-emerald-900'
  },
  'Tổ 3': {
    slug: 'to-3',
    title: 'Tổ Chuyên Môn 3 (Khối Lớp 3)',
    desc: 'Giáo viên phụ trách khối 3: Toán, Tiếng Việt, Tin học, Công nghệ, Tiếng Anh',
    defaultSubjects: ['Toán', 'Tiếng Việt', 'Tin học', 'Công nghệ', 'Tự nhiên & Xã hội', 'Tiếng Anh'],
    icon: '✏️',
    badge: 'Tổ Chuyên Môn 3',
    border: 'border-teal-200',
    headerBg: 'bg-gradient-to-r from-teal-500/10 via-teal-100/30 to-cyan-50/20 text-teal-950',
    statColor: 'bg-teal-50 border-teal-200 text-teal-900'
  },
  'Tổ 4': {
    slug: 'to-4',
    title: 'Tổ Chuyên Môn 4 (Khối Lớp 4)',
    desc: 'Giáo viên phụ trách khối 4: Khoa học, Lịch sử & Địa lý, Tiếng Anh, Tin học',
    defaultSubjects: ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử & Địa lý', 'Tiếng Anh', 'Tin học'],
    icon: '🔬',
    badge: 'Tổ Chuyên Môn 4',
    border: 'border-indigo-200',
    headerBg: 'bg-gradient-to-r from-indigo-500/10 via-indigo-100/30 to-blue-50/20 text-indigo-950',
    statColor: 'bg-indigo-50 border-indigo-200 text-indigo-900'
  },
  'Tổ 5': {
    slug: 'to-5',
    title: 'Tổ Chuyên Môn 5 (Khối Lớp 5)',
    desc: 'Giáo viên phụ trách khối 5: Khoa học, Lịch sử & Địa lý, Tiếng Anh, Tin học',
    defaultSubjects: ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử & Địa lý', 'Tiếng Anh', 'Tin học'],
    icon: '🎓',
    badge: 'Tổ Chuyên Môn 5',
    border: 'border-purple-200',
    headerBg: 'bg-gradient-to-r from-purple-500/10 via-purple-100/30 to-violet-50/20 text-purple-950',
    statColor: 'bg-purple-50 border-purple-200 text-purple-900'
  }
};

/**
 * Clean and deduplicate teacher list based on ID, Email, and SĐDCN (CCCD)
 */
export function deduplicateTeachers(teachers: TeacherRecord[]): TeacherRecord[] {
  if (!Array.isArray(teachers)) return [];

  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const uniqueList: TeacherRecord[] = [];

  for (const t of teachers) {
    if (!t) continue;
    
    // Normalize fields
    const rawId = (t.id || '').trim();
    const rawEmail = (t.email || '').trim().toLowerCase();
    const rawName = (t.name || '').trim();

    if (!rawName && !rawEmail) continue;

    // Check duplicate by email first (strongest identity)
    if (rawEmail && seenEmails.has(rawEmail)) {
      continue;
    }

    // Check duplicate by ID
    let finalId = rawId;
    if (!finalId || seenIds.has(finalId)) {
      // Generate a unique ID if missing or colliding
      let counter = 1;
      while (seenIds.has(`gv-${String(counter).padStart(2, '0')}`)) {
        counter++;
      }
      finalId = `gv-${String(counter).padStart(2, '0')}`;
    }

    if (rawEmail) seenEmails.add(rawEmail);
    seenIds.add(finalId);

    uniqueList.push({
      ...t,
      id: finalId,
      name: rawName || 'Giáo Viên',
      email: rawEmail || `${finalId}@quanghungpk1.edu.vn`,
      role: t.role || 'Giáo viên bộ môn',
      subject: t.subject || 'Toán & Tiếng Việt',
      status: t.status === 'locked' ? 'locked' : 'active',
      toChuyenMon: normalizeDepartmentName(t.toChuyenMon, t),
      nhomGvCn: t.nhomGvCn || '',
      homeroomClasses: Array.isArray(t.homeroomClasses) ? t.homeroomClasses : [],
      teachingClasses: Array.isArray(t.teachingClasses) ? t.teachingClasses : [],
      dob: t.dob || '',
      phone: t.phone || '',
      sddcn: t.sddcn || '',
      avatar: t.avatar || '👩‍🏫'
    });
  }

  return uniqueList;
}

/**
 * Generate a guaranteed unique next teacher ID (e.g. gv-11)
 */
export function generateNextTeacherId(existingTeachers: TeacherRecord[]): string {
  const existingIds = new Set(existingTeachers.map(t => (t.id || '').trim()));
  let maxNum = 0;

  for (const t of existingTeachers) {
    const match = (t.id || '').match(/gv-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextCandidate = maxNum + 1;
  while (existingIds.has(`gv-${String(nextCandidate).padStart(2, '0')}`)) {
    nextCandidate++;
  }

  return `gv-${String(nextCandidate).padStart(2, '0')}`;
}

/**
 * Build Department breakdown from teacher list
 */
export function buildDepartmentBreakdown(teachers: TeacherRecord[]): Record<string, DepartmentInfo> {
  const deduped = deduplicateTeachers(teachers);
  const departments: Record<string, DepartmentInfo> = {};

  Object.entries(DEPARTMENTS_METADATA).forEach(([deptName, meta]) => {
    const deptTeachers = deduped.filter(t => normalizeDepartmentName(t.toChuyenMon, t) === deptName);
    const leaderTeacher = deptTeachers.find(t => 
      t.role?.toLowerCase().includes('tổ trưởng') || 
      t.role?.toLowerCase().includes('hiệu trưởng') ||
      t.role?.toLowerCase().includes('quản trị')
    );

    departments[meta.slug] = {
      id: meta.slug,
      name: deptName,
      title: meta.title,
      leader: leaderTeacher ? `${leaderTeacher.name} (${leaderTeacher.id})` : undefined,
      memberIds: deptTeachers.map(t => t.id),
      totalMembers: deptTeachers.length,
      description: meta.desc,
      subjects: meta.defaultSubjects,
      updatedAt: new Date().toISOString()
    };
  });

  return departments;
}

/**
 * Find a teacher record by email from LocalStorage or provided list
 */
export function resolveTeacherByEmail(email?: string | null, customTeachers?: TeacherRecord[]): TeacherRecord | undefined {
  if (!email || !email.includes('@')) return undefined;
  const cleanEmail = email.toLowerCase().trim();
  const teachersList = customTeachers && customTeachers.length > 0 
    ? customTeachers 
    : getTeachersFromLocalStorage();

  return teachersList.find(t => (t.email || '').toLowerCase().trim() === cleanEmail);
}

/**
 * Dynamically resolve display name for teacher by looking up teacher records first
 */
export function resolveTeacherNameByEmail(
  email?: string | null,
  fallbackDisplayName?: string | null,
  customTeachers?: TeacherRecord[],
  role: string = 'teacher'
): string {
  const cleanEmail = (email || '').toLowerCase().trim();

  // 1. Priority: Dò tìm trong danh sách giáo viên thực tế (LocalStorage hoặc CustomTeachers)
  if (cleanEmail) {
    const matchedTeacher = resolveTeacherByEmail(cleanEmail, customTeachers);
    if (matchedTeacher && matchedTeacher.name && matchedTeacher.name.trim()) {
      const rawName = matchedTeacher.name.trim();
      return (rawName === 'Nguyễn Thị Thủ' && cleanEmail === 'thuthuthtk@gmail.com') ? 'Nguyễn Thị Thu' : rawName;
    }
  }

  // 2. Tra cứu email đặc định (Known canonical accounts)
  if (cleanEmail === 'thuthuthtk@gmail.com' || cleanEmail.includes('thuthuthtk')) {
    return 'Nguyễn Thị Thu';
  }
  if (cleanEmail === 'vanquan18189@gmail.com' || cleanEmail.includes('vanquan')) {
    return role === 'admin' ? 'THƯ NGUYỄN (Admin)' : 'Thầy Văn Quân';
  }

  // 3. Nếu có fallbackDisplayName hợp lệ và KHÔNG phải là chuỗi mẫu bị dính/sai
  if (fallbackDisplayName && fallbackDisplayName.trim() && !fallbackDisplayName.includes('@')) {
    const trimmed = fallbackDisplayName.trim();
    if (
      trimmed !== 'Thầy Nguyễn Văn A' &&
      trimmed !== 'Thầy/Cô Giáo Viên' &&
      trimmed !== 'Thầy Thu' &&
      trimmed !== 'Lê Minh Anh' &&
      !(trimmed.includes('Văn Quân') && !cleanEmail.includes('vanquan'))
    ) {
      return trimmed;
    }
  }

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return role === 'admin' ? 'Quản trị viên' : 'Giáo viên';
  }

  // 4. Fallback to formatting email prefix
  const prefix = cleanEmail.split('@')[0];
  const formattedPrefix = prefix
    .split(/[._-]/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  if (role === 'admin') return `Admin ${formattedPrefix}`;
  return `Thầy/Cô ${formattedPrefix}`;
}

export interface TeacherProfileResult {
  id: string;
  name: string;
  email: string;
  role: string;
  userRole: UserRole;
  toChuyenMon?: string;
  subject?: string;
  phone?: string;
  avatar?: string;
  nhomGvCn?: string;
  homeroomClasses?: string[];
  teachingClasses?: string[];
}

/**
 * Single Source of Truth (SSOT) teacher profile lookup function.
 * Order of resolution:
 * a. Retrieve authenticated email from argument, Firebase Auth (auth.currentUser.email), or localStorage.
 * b. Search teacher in to_chuyen_mon / teachers collections and local sync.
 * c. Retrieve exact business id ('gv-XX') and canonical teacher name ('Nguyễn Thị Thu').
 * d. NEVER assign currentUser.uid (Auth UID) to teacherId!
 */
export function resolveCurrentTeacherProfile(email?: string | null): TeacherProfileResult {
  const effectiveEmail = (
    email ||
    (auth && auth.currentUser ? auth.currentUser.email : null) ||
    (typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_email') : null) ||
    ''
  ).toLowerCase().trim();

  // Known account: thuthuthtk@gmail.com -> gv-12, Nguyễn Thị Thu
  if (effectiveEmail === 'thuthuthtk@gmail.com' || effectiveEmail.includes('thuthuthtk')) {
    return {
      id: 'gv-12',
      name: 'Nguyễn Thị Thu',
      email: 'thuthuthtk@gmail.com',
      role: 'Quản trị viên (ADMIN)',
      userRole: 'admin',
      toChuyenMon: 'Tổ 3',
      subject: 'Tin học & Công nghệ & Tin học (tự chọn)',
      avatar: '👩‍🏫',
      teachingClasses: [
        'Lớp 1C', 'Lớp 1D', 'Lớp 2C', 'Lớp 2D', 'Lớp 3C',
        'Lớp 3D', 'Lớp 4C', 'Lớp 4D', 'Lớp 5C', 'Lớp 5D'
      ],
      homeroomClasses: []
    };
  }

  // Known account: vanquan18189@gmail.com -> gv-01, THƯ NGUYỄN (Admin)
  if (effectiveEmail === 'vanquan18189@gmail.com' || effectiveEmail.includes('vanquan')) {
    return {
      id: 'gv-01',
      name: 'THƯ NGUYỄN (Admin)',
      email: 'vanquan18189@gmail.com',
      role: 'Quản trị viên',
      userRole: 'admin',
      toChuyenMon: 'Tổ 3',
      subject: 'Tiếng Việt & Toán',
      avatar: '👨‍🏫',
      homeroomClasses: [],
      teachingClasses: []
    };
  }

  // Search in LocalStorage teachers list (synced from to_chuyen_mon / teachers)
  const teachersList = getTeachersFromLocalStorage();
  if (effectiveEmail && teachersList.length > 0) {
    const matched = teachersList.find(t => (t.email || '').toLowerCase().trim() === effectiveEmail);
    if (matched) {
      const isAdmin = (matched.role || '').toLowerCase().includes('quản trị') ||
                      (matched.role || '').toLowerCase().includes('admin') ||
                      (matched.role || '').toLowerCase().includes('hiệu trưởng');

      const resolvedName = (matched.name === 'Nguyễn Thị Thủ' && (matched.email === 'thuthuthtk@gmail.com' || matched.id === 'gv-12'))
        ? 'Nguyễn Thị Thu'
        : (matched.name || resolveTeacherNameByEmail(effectiveEmail));

      return {
        id: matched.id || 'gv-01',
        name: resolvedName,
        email: matched.email || effectiveEmail,
        role: matched.role || (isAdmin ? 'Quản trị viên (ADMIN)' : 'Giáo viên bộ môn'),
        userRole: isAdmin ? 'admin' : 'teacher',
        toChuyenMon: matched.toChuyenMon,
        subject: matched.subject,
        phone: matched.phone,
        avatar: matched.avatar || '👩‍🏫',
        homeroomClasses: matched.homeroomClasses,
        teachingClasses: matched.teachingClasses
      };
    }
  }

  // Check matching by displayName or stored name in teachers list
  const currentDisplayName = (auth && auth.currentUser ? auth.currentUser.displayName : null) || '';
  const storedTeacherName = (typeof window !== 'undefined' ? (localStorage.getItem('eduplay_teacher_name') || localStorage.getItem('user_name')) : null) || '';
  const candidateNames = [currentDisplayName, storedTeacherName].filter(Boolean).map(n => n.trim().toLowerCase());

  if (teachersList.length > 0 && candidateNames.length > 0) {
    const matchedByName = teachersList.find(t => {
      const tName = (t.name || '').trim().toLowerCase();
      return candidateNames.some(cn => cn === tName || cn.includes(tName) || tName.includes(cn));
    });
    if (matchedByName) {
      const isAdmin = (matchedByName.role || '').toLowerCase().includes('quản trị') ||
                      (matchedByName.role || '').toLowerCase().includes('admin') ||
                      (matchedByName.role || '').toLowerCase().includes('hiệu trưởng');
      return {
        id: matchedByName.id || 'gv-06',
        name: matchedByName.name,
        email: matchedByName.email || effectiveEmail,
        role: matchedByName.role || (isAdmin ? 'Quản trị viên (ADMIN)' : 'Giáo viên bộ môn'),
        userRole: isAdmin ? 'admin' : 'teacher',
        toChuyenMon: matchedByName.toChuyenMon,
        subject: matchedByName.subject,
        phone: matchedByName.phone,
        avatar: matchedByName.avatar || '👩‍🏫',
        homeroomClasses: matchedByName.homeroomClasses,
        teachingClasses: matchedByName.teachingClasses
      };
    }
  }

  // If no email available, check localStorage session cache
  if (typeof window !== 'undefined') {
    const storedName = localStorage.getItem('eduplay_teacher_name');
    const storedId = localStorage.getItem('eduplay_teacher_id');
    if (storedName && storedName !== 'Thầy Văn Quân' && storedName !== 'Lê Minh Anh') {
      const matched = teachersList.find(t => (t.name || '').trim().toLowerCase() === storedName.trim().toLowerCase());
      return {
        id: matched?.id || ((storedId && storedId.startsWith('gv-')) ? storedId : 'gv-12'),
        name: matched?.name || storedName,
        email: matched?.email || effectiveEmail,
        role: matched?.role || 'Giáo viên bộ môn',
        userRole: 'teacher',
        toChuyenMon: matched?.toChuyenMon,
        subject: matched?.subject,
        avatar: matched?.avatar || '👩‍🏫',
        homeroomClasses: matched?.homeroomClasses,
        teachingClasses: matched?.teachingClasses
      };
    }
  }

  const isAdmin = effectiveEmail.includes('admin');
  return {
    id: effectiveEmail ? 'gv-custom' : 'gv-12',
    name: effectiveEmail ? resolveTeacherNameByEmail(effectiveEmail) : 'Nguyễn Thị Thu',
    email: effectiveEmail,
    role: isAdmin ? 'Quản trị viên (ADMIN)' : 'Giáo viên bộ môn',
    userRole: isAdmin ? 'admin' : 'teacher',
    avatar: '👩‍🏫'
  };
}

export interface AuthorizationResult {
  authorized: boolean;
  profile?: TeacherProfileResult;
  reason?: string;
}

/**
 * Strict Whitelist Authorization check for Google Sign-In and Email/Password.
 * Queries Firestore `teachers`, `users`, `to_chuyen_mon` and local verified rosters.
 * Returns authorized = true ONLY if the email belongs to an active registered teacher/admin.
 */
export async function verifyTeacherAuthorization(email?: string | null): Promise<AuthorizationResult> {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) {
    return {
      authorized: false,
      reason: 'Địa chỉ email không hợp lệ.'
    };
  }

  // 1. Super Admin whitelist (known verified administrators)
  if (cleanEmail === 'thuthuthtk@gmail.com' || cleanEmail.includes('thuthuthtk')) {
    return {
      authorized: true,
      profile: {
        id: 'gv-12',
        name: 'Nguyễn Thị Thu',
        email: 'thuthuthtk@gmail.com',
        role: 'Quản trị viên (ADMIN)',
        userRole: 'admin',
        toChuyenMon: 'Tổ 3',
        subject: 'Tin học & Công nghệ & Tin học (tự chọn)',
        avatar: '👩‍🏫',
        teachingClasses: ['Lớp 1C', 'Lớp 1D', 'Lớp 2C', 'Lớp 2D', 'Lớp 3C', 'Lớp 3D', 'Lớp 4C', 'Lớp 4D', 'Lớp 5C', 'Lớp 5D'],
        homeroomClasses: []
      }
    };
  }

  if (cleanEmail === 'vanquan18189@gmail.com' || cleanEmail.includes('vanquan18189')) {
    return {
      authorized: true,
      profile: {
        id: 'gv-01',
        name: 'THƯ NGUYỄN (Admin)',
        email: 'vanquan18189@gmail.com',
        role: 'Quản trị viên (ADMIN)',
        userRole: 'admin',
        toChuyenMon: 'Tổ Ban Giám Hiệu',
        subject: 'Tin học & Khoa học',
        avatar: '👨‍🏫',
        teachingClasses: [],
        homeroomClasses: []
      }
    };
  }

  // 2. Query Firestore `teachers` collection
  if (db) {
    try {
      const qTeachers = query(collection(db, 'teachers'), where('email', '==', cleanEmail));
      const snapTeachers = await getDocs(qTeachers);
      if (!snapTeachers.empty) {
        const docSnap = snapTeachers.docs[0];
        const data = docSnap.data() as TeacherRecord;
        if (data.status === 'locked' || (data.status as string) === 'inactive') {
          return {
            authorized: false,
            reason: 'Tài khoản giáo viên này đang ở trạng thái tạm khóa. Vui lòng liên hệ quản trị viên.'
          };
        }
        const isAdmin = (data.role || '').toLowerCase().includes('quản trị') ||
                        (data.role || '').toLowerCase().includes('admin') ||
                        (data.role || '').toLowerCase().includes('hiệu trưởng');
        return {
          authorized: true,
          profile: {
            id: docSnap.id || data.id,
            name: data.name,
            email: data.email || cleanEmail,
            role: data.role || (isAdmin ? 'Quản trị viên (ADMIN)' : 'Giáo viên bộ môn'),
            userRole: isAdmin ? 'admin' : 'teacher',
            toChuyenMon: data.toChuyenMon,
            subject: data.subject,
            phone: data.phone,
            avatar: data.avatar || '👩‍🏫',
            homeroomClasses: data.homeroomClasses,
            teachingClasses: data.teachingClasses
          }
        };
      }
    } catch (err) {
      console.warn('Tra cứu collection teachers trong Firestore thất bại, tiếp tục kiểm tra các nguồn khác:', err);
    }

    // 3. Query Firestore `users` collection
    try {
      const qUsers = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snapUsers = await getDocs(qUsers);
      if (!snapUsers.empty) {
        const docSnap = snapUsers.docs[0];
        const data = docSnap.data() as any;
        if (data.status === 'inactive') {
          return {
            authorized: false,
            reason: 'Tài khoản này đang ở trạng thái tạm khóa. Vui lòng liên hệ quản trị viên.'
          };
        }
        const isAdmin = (data.role || '').toLowerCase().includes('quản trị') ||
                        (data.role || '').toLowerCase().includes('admin');
        return {
          authorized: true,
          profile: {
            id: docSnap.id || data.id,
            name: data.name,
            email: data.email || cleanEmail,
            role: data.role || (isAdmin ? 'Quản trị viên (ADMIN)' : 'Giáo viên bộ môn'),
            userRole: isAdmin ? 'admin' : 'teacher',
            toChuyenMon: data.toChuyenMon,
            subject: data.subject,
            phone: data.phone,
            avatar: data.avatar || '👩‍🏫',
            homeroomClasses: data.homeroomClasses,
            teachingClasses: data.teachingClasses
          }
        };
      }
    } catch (err) {
      console.warn('Tra cứu collection users trong Firestore thất bại:', err);
    }

    // 4. Query Firestore `to_chuyen_mon` collection
    try {
      const toSnap = await getDocs(collection(db, 'to_chuyen_mon'));
      for (const toDoc of toSnap.docs) {
        const toData = toDoc.data();
        if (Array.isArray(toData.teachers)) {
          const matched = toData.teachers.find(
            (t: any) => (t.email || '').toLowerCase().trim() === cleanEmail
          );
          if (matched) {
            if (matched.status === 'inactive') {
              return {
                authorized: false,
                reason: 'Tài khoản giáo viên này đang ở trạng thái tạm khóa. Vui lòng liên hệ quản trị viên.'
              };
            }
            const isAdmin = (matched.role || '').toLowerCase().includes('quản trị') ||
                            (matched.role || '').toLowerCase().includes('admin') ||
                            (matched.role || '').toLowerCase().includes('hiệu trưởng');
            return {
              authorized: true,
              profile: {
                id: matched.id || 'gv-whitelisted',
                name: matched.name,
                email: matched.email || cleanEmail,
                role: matched.role || (isAdmin ? 'Quản trị viên (ADMIN)' : 'Giáo viên bộ môn'),
                userRole: isAdmin ? 'admin' : 'teacher',
                toChuyenMon: matched.toChuyenMon || toData.name || toDoc.id,
                subject: matched.subject,
                phone: matched.phone,
                avatar: matched.avatar || '👩‍🏫',
                homeroomClasses: matched.homeroomClasses,
                teachingClasses: matched.teachingClasses
              }
            };
          }
        }
      }
    } catch (err) {
      console.warn('Tra cứu to_chuyen_mon thất bại:', err);
    }
  }

  // 5. Query LocalStorage / initialTeachersList
  const teachersList = getTeachersFromLocalStorage();
  const matchedLocal = teachersList.find(
    (t) => (t.email || '').toLowerCase().trim() === cleanEmail
  );
  if (matchedLocal) {
    if (matchedLocal.status === 'locked' || (matchedLocal.status as string) === 'inactive') {
      return {
        authorized: false,
        reason: 'Tài khoản giáo viên này đang ở trạng thái tạm khóa. Vui lòng liên hệ quản trị viên.'
      };
    }
    const isAdmin = (matchedLocal.role || '').toLowerCase().includes('quản trị') ||
                    (matchedLocal.role || '').toLowerCase().includes('admin') ||
                    (matchedLocal.role || '').toLowerCase().includes('hiệu trưởng');
    return {
      authorized: true,
      profile: {
        id: matchedLocal.id,
        name: matchedLocal.name,
        email: matchedLocal.email || cleanEmail,
        role: matchedLocal.role || (isAdmin ? 'Quản trị viên (ADMIN)' : 'Giáo viên bộ môn'),
        userRole: isAdmin ? 'admin' : 'teacher',
        toChuyenMon: matchedLocal.toChuyenMon,
        subject: matchedLocal.subject,
        phone: matchedLocal.phone,
        avatar: matchedLocal.avatar || '👩‍🏫',
        homeroomClasses: matchedLocal.homeroomClasses,
        teachingClasses: matchedLocal.teachingClasses
      }
    };
  }

  // Not in whitelist
  return {
    authorized: false,
    reason: 'Tài khoản Google này chưa được đăng ký trong hệ thống. Vui lòng liên hệ quản trị viên.'
  };
}

/**
 * Single Source of Truth (SSOT) teacher profile lookup by email.
 * Delegates to resolveCurrentTeacherProfile for unified SSOT enforcement.
 */
export function getCurrentTeacherProfile(email?: string | null): TeacherProfileResult {
  return resolveCurrentTeacherProfile(email);
}

/**
 * Asynchronously fetch teacher profile directly from Firestore `to_chuyen_mon` & `teachers` collections (SSOT).
 */
export async function fetchCurrentTeacherProfile(email?: string | null): Promise<TeacherProfileResult> {
  const effectiveEmail = (
    email ||
    (auth && auth.currentUser ? auth.currentUser.email : null) ||
    (typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_email') : null) ||
    ''
  ).toLowerCase().trim();

  // Known account: thuthuthtk@gmail.com
  if (effectiveEmail === 'thuthuthtk@gmail.com' || effectiveEmail.includes('thuthuthtk')) {
    return {
      id: 'gv-12',
      name: 'Nguyễn Thị Thu',
      email: 'thuthuthtk@gmail.com',
      role: 'Quản trị viên (ADMIN)',
      userRole: 'admin',
      toChuyenMon: 'Tổ 3',
      subject: 'Tin học & Công nghệ & Tin học (tự chọn)',
      avatar: '👩‍🏫'
    };
  }

  if (db && effectiveEmail) {
    try {
      // 1. Duyệt qua collection to_chuyen_mon (các document tổ, tìm phần tử trong mảng teachers có email khớp)
      const toSnap = await getDocs(collection(db, 'to_chuyen_mon'));
      for (const toDoc of toSnap.docs) {
        const toData = toDoc.data();
        if (Array.isArray(toData.teachers)) {
          const matched = toData.teachers.find(
            (t: any) => (t.email || '').toLowerCase().trim() === effectiveEmail
          );
          if (matched) {
            const isAdmin = (matched.role || '').toLowerCase().includes('quản trị') ||
                            (matched.role || '').toLowerCase().includes('admin') ||
                            (matched.role || '').toLowerCase().includes('hiệu trưởng');
            return {
              id: matched.id || 'gv-12',
              name: (matched.name === 'Nguyễn Thị Thủ' || matched.id === 'gv-12') ? 'Nguyễn Thị Thu' : matched.name,
              email: matched.email || effectiveEmail,
              role: matched.role || (isAdmin ? 'Quản trị viên (ADMIN)' : 'Giáo viên bộ môn'),
              userRole: isAdmin ? 'admin' : 'teacher',
              toChuyenMon: matched.toChuyenMon || toData.name || toDoc.id,
              subject: matched.subject,
              phone: matched.phone,
              avatar: matched.avatar || '👩‍🏫',
              homeroomClasses: matched.homeroomClasses,
              teachingClasses: matched.teachingClasses
            };
          }
        }
      }

      // 2. Tra cứu trong collection teachers (SSOT)
      const q = query(collection(db, 'teachers'), where('email', '==', effectiveEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data() as TeacherRecord;
        const isAdmin = (data.role || '').toLowerCase().includes('quản trị') ||
                        (data.role || '').toLowerCase().includes('admin') ||
                        (data.role || '').toLowerCase().includes('hiệu trưởng');
        return {
          id: docSnap.id || data.id,
          name: (data.name === 'Nguyễn Thị Thủ' || docSnap.id === 'gv-12') ? 'Nguyễn Thị Thu' : data.name,
          email: data.email,
          role: data.role,
          userRole: isAdmin ? 'admin' : 'teacher',
          toChuyenMon: data.toChuyenMon,
          subject: data.subject,
          phone: data.phone,
          avatar: data.avatar,
          homeroomClasses: data.homeroomClasses,
          teachingClasses: data.teachingClasses
        };
      }
    } catch (e) {
      console.warn('Lỗi khi truy vấn hồ sơ giáo viên từ Firestore:', e);
    }
  }

  return resolveCurrentTeacherProfile(effectiveEmail);
}

/**
 * Get all teachers from LocalStorage with deduplication fallback
 */
export function getTeachersFromLocalStorage(): TeacherRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(EDUPLAY_TEACHERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateTeachers(parsed);
      }
    }
  } catch (err) {
    console.error('Lỗi khi đọc danh sách giáo viên từ LocalStorage:', err);
  }

  return [];
}

/**
 * Save teachers to LocalStorage and dispatch global update events
 */
export function saveTeachersToLocalStorage(teachers: TeacherRecord[]): void {
  if (typeof window === 'undefined') return;

  try {
    const deduped = deduplicateTeachers(teachers);
    localStorage.setItem(EDUPLAY_TEACHERS_KEY, JSON.stringify(deduped));

    // Also update department breakdown cache
    const depts = buildDepartmentBreakdown(deduped);
    localStorage.setItem(EDUPLAY_DEPARTMENTS_KEY, JSON.stringify(depts));

    // Dispatch real-time events for live component synchronization
    window.dispatchEvent(new CustomEvent('teacher-data-updated', {
      detail: { teachers: deduped, departments: depts, count: deduped.length, action: 'saved', timestamp: Date.now() }
    }));
    window.dispatchEvent(new CustomEvent('eduplay_teachers_updated', {
      detail: { teachers: deduped, departments: depts }
    }));
  } catch (err) {
    console.error('Lỗi khi lưu danh sách giáo viên vào LocalStorage:', err);
  }
}

/**
 * Add or update a teacher record, updating cache and publishing real-time events
 */
export function addOrUpdateTeacher(teacher: TeacherRecord, currentTeachers?: TeacherRecord[]): TeacherRecord[] {
  const existingList = currentTeachers && currentTeachers.length > 0
    ? currentTeachers
    : getTeachersFromLocalStorage();

  const idx = existingList.findIndex(t => t.id === teacher.id || (t.email && t.email.toLowerCase() === teacher.email.toLowerCase()));

  let updated: TeacherRecord[];
  if (idx >= 0) {
    updated = [...existingList];
    updated[idx] = { ...updated[idx], ...teacher };
  } else {
    updated = [...existingList, teacher];
  }

  saveTeachersToLocalStorage(updated);
  syncTeachersToFirestore(updated).catch(() => {});

  window.dispatchEvent(new CustomEvent('teacher-data-updated', {
    detail: {
      action: idx >= 0 ? 'teacher-updated' : 'teacher-added',
      teacher,
      count: updated.length,
      timestamp: Date.now()
    }
  }));

  return updated;
}

/**
 * Sync teachers collection, user accounts, and departments to Firestore
 */
export async function syncTeachersToFirestore(teachers: TeacherRecord[]): Promise<{ success: boolean; error?: any }> {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    const deduped = deduplicateTeachers(teachers);
    const nowStr = new Date().toISOString();

    // 1. Persist master teachers registry doc
    const registryRef = doc(db, 'system_settings', 'teachers_registry');
    await setDoc(registryRef, removeUndefined({
      teachers: deduped,
      totalTeachers: deduped.length,
      updatedAt: nowStr
    }), { merge: true });

    // 2. Persist Department assignments breakdown to Firestore
    const depts = buildDepartmentBreakdown(deduped);
    const deptsRegistryRef = doc(db, 'system_settings', 'departments_registry');
    await setDoc(deptsRegistryRef, removeUndefined({
      departments: depts,
      updatedAt: nowStr
    }), { merge: true });

    // 3. Persist individual department documents in `departments` / `to_chuyen_mon` collection
    for (const [deptSlug, deptData] of Object.entries(depts)) {
      const deptDocRef = doc(db, 'departments', deptSlug);
      const toChuyenMonDocRef = doc(db, 'to_chuyen_mon', deptSlug);
      
      const deptPayload = removeUndefined({
        ...deptData,
        teachers: deduped.filter(t => normalizeDepartmentName(t.toChuyenMon, t) === deptData.name),
        updatedAt: nowStr
      });

      await Promise.allSettled([
        setDoc(deptDocRef, deptPayload, { merge: true }),
        setDoc(toChuyenMonDocRef, deptPayload, { merge: true })
      ]);
    }

    // 4. Persist individual teacher docs into `teachers` and `users` collections
    const syncPromises = deduped.map(async (teacher) => {
      const tRef = doc(db, 'teachers', teacher.id);
      const uRef = doc(db, 'users', teacher.id);

      const userRole = teacher.role?.toLowerCase().includes('hiệu trưởng') || teacher.role?.toLowerCase().includes('quản trị')
        ? 'admin'
        : 'teacher';

      const teacherPayload = removeUndefined({
        ...teacher,
        updatedAt: nowStr
      });

      const userAccountPayload = removeUndefined({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: userRole,
        toChuyenMon: teacher.toChuyenMon,
        subject: teacher.subject,
        phone: teacher.phone || '',
        sddcn: teacher.sddcn || '',
        dob: teacher.dob || '',
        status: teacher.status,
        avatar: teacher.avatar || '👩‍🏫',
        updatedAt: nowStr
      });

      return Promise.allSettled([
        setDoc(tRef, teacherPayload, { merge: true }),
        setDoc(uRef, userAccountPayload, { merge: true })
      ]);
    });

    await Promise.allSettled(syncPromises);

    return { success: true };
  } catch (err) {
    console.warn('Lưu giáo viên & tổ chuyên môn lên Firestore không thành công (đang dùng offline cache):', err);
    return { success: false, error: err };
  }
}

/**
 * Fetch teachers and department rosters from Firestore
 */
export async function fetchTeachersFromFirestore(): Promise<TeacherRecord[] | null> {
  if (!db) return null;

  try {
    const docRef = doc(db, 'system_settings', 'teachers_registry');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data?.teachers) && data.teachers.length > 0) {
        const deduped = deduplicateTeachers(data.teachers);
        saveTeachersToLocalStorage(deduped);
        return deduped;
      }
    }

    // Fallback: try fetching all documents from `teachers` collection directly
    const teachersCol = collection(db, 'teachers');
    const querySnap = await getDocs(teachersCol);
    if (!querySnap.empty) {
      const fetched: TeacherRecord[] = [];
      querySnap.forEach((d) => {
        const item = d.data() as TeacherRecord;
        if (item && (item.name || item.email)) {
          fetched.push(item);
        }
      });
      if (fetched.length > 0) {
        const deduped = deduplicateTeachers(fetched);
        saveTeachersToLocalStorage(deduped);
        return deduped;
      }
    }
  } catch (err) {
    console.warn('Không thể đọc dữ liệu giáo viên từ Firestore:', err);
  }

  return null;
}

/**
 * Delete a teacher permanently from LocalStorage and Firestore
 */
export async function deleteTeacherPermanently(teacherId: string, currentTeachers: TeacherRecord[]): Promise<TeacherRecord[]> {
  const filtered = currentTeachers.filter(t => t.id !== teacherId);
  const deduped = deduplicateTeachers(filtered);

  // 1. Update LocalStorage
  saveTeachersToLocalStorage(deduped);

  // 2. Sync to Firestore (Delete teacher doc & update registries)
  if (db) {
    try {
      const nowStr = new Date().toISOString();
      
      // Remove individual docs
      await Promise.allSettled([
        deleteDoc(doc(db, 'teachers', teacherId)),
        deleteDoc(doc(db, 'users', teacherId))
      ]);

      // Update the master registry doc
      const registryRef = doc(db, 'system_settings', 'teachers_registry');
      await setDoc(registryRef, {
        teachers: deduped,
        totalTeachers: deduped.length,
        updatedAt: nowStr
      });

      // Update department breakdown
      const depts = buildDepartmentBreakdown(deduped);
      const deptsRegistryRef = doc(db, 'system_settings', 'departments_registry');
      await setDoc(deptsRegistryRef, {
        departments: depts,
        updatedAt: nowStr
      });

      for (const [deptSlug, deptData] of Object.entries(depts)) {
        const deptDocRef = doc(db, 'departments', deptSlug);
        const toChuyenMonDocRef = doc(db, 'to_chuyen_mon', deptSlug);
        const deptPayload = {
          ...deptData,
          teachers: deduped.filter(t => normalizeDepartmentName(t.toChuyenMon, t) === deptData.name),
          updatedAt: nowStr
        };
        await Promise.allSettled([
          setDoc(deptDocRef, deptPayload, { merge: true }),
          setDoc(toChuyenMonDocRef, deptPayload, { merge: true })
        ]);
      }
    } catch (err) {
      console.warn('Không thể xóa giáo viên trên Firestore:', err);
    }
  }

  // Dispatch event for UI reactivity
  window.dispatchEvent(new CustomEvent('teacher-data-updated', {
    detail: {
      action: 'teacher-deleted',
      deletedTeacherId: teacherId,
      teachers: deduped,
      count: deduped.length,
      timestamp: Date.now()
    }
  }));

  return deduped;
}

export interface MigrationResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  logs: string[];
}

/**
 * Migration function to convert class name strings in teachers and teacher_groups to classId (Document ID in classes collection)
 */
export async function migrateTeacherClassNamesToIds(): Promise<MigrationResult> {
  const logs: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  if (!db) {
    return { success: false, successCount: 0, failedCount: 0, logs: ['Database not initialized'] };
  }

  try {
    // 1. Fetch all classes to build name -> classId map with flexible variations
    const classesSnap = await getDocs(collection(db, 'classes'));
    const classNameToIdMap = new Map<string, string>();

    classesSnap.forEach(docSnap => {
      const data = docSnap.data();
      const cId = docSnap.id;
      const cName = (data.name || data.className || '').trim();

      // Map doc ID directly
      classNameToIdMap.set(cId, cId);
      classNameToIdMap.set(cId.toLowerCase(), cId);
      
      const strippedDocId = cId.replace(/^(C-|c-)/, '');
      classNameToIdMap.set(strippedDocId, cId);
      classNameToIdMap.set(strippedDocId.toLowerCase(), cId);
      classNameToIdMap.set(`Lớp ${strippedDocId.toUpperCase()}`, cId);

      if (cName) {
        classNameToIdMap.set(cName, cId);
        classNameToIdMap.set(cName.toLowerCase(), cId);
        const strippedName = cName.replace(/^(Lớp|lop|Khối|khoi|Class|class)\s*/i, '').trim();
        if (strippedName) {
          classNameToIdMap.set(strippedName, cId);
          classNameToIdMap.set(strippedName.toLowerCase(), cId);
          classNameToIdMap.set(`C-${strippedName.toUpperCase()}`, cId);
        }
      }
    });

    logs.push(`✅ Đã tải ${classesSnap.size} lớp học từ collection 'classes'.`);

    // Helper resolver function
    const resolveClassId = (item: string): { id: string; converted: boolean; valid: boolean } => {
      if (!item || !item.trim()) return { id: item, converted: false, valid: false };
      const raw = item.trim();

      if (classNameToIdMap.has(raw)) {
        const mappedId = classNameToIdMap.get(raw)!;
        return { id: mappedId, converted: raw !== mappedId, valid: true };
      }
      if (classNameToIdMap.has(raw.toLowerCase())) {
        const mappedId = classNameToIdMap.get(raw.toLowerCase())!;
        return { id: mappedId, converted: true, valid: true };
      }

      const stripped = raw.replace(/^(Lớp|lop|Khối|khoi|Class|class)\s*/i, '').trim();
      if (classNameToIdMap.has(stripped)) {
        const mappedId = classNameToIdMap.get(stripped)!;
        return { id: mappedId, converted: true, valid: true };
      }
      if (classNameToIdMap.has(stripped.toLowerCase())) {
        const mappedId = classNameToIdMap.get(stripped.toLowerCase())!;
        return { id: mappedId, converted: true, valid: true };
      }

      if (raw.startsWith('C-') || raw.startsWith('c-')) {
        const withoutC = raw.substring(2).trim();
        if (classNameToIdMap.has(withoutC)) {
          return { id: classNameToIdMap.get(withoutC)!, converted: true, valid: true };
        }
        if (classNameToIdMap.has(withoutC.toLowerCase())) {
          return { id: classNameToIdMap.get(withoutC.toLowerCase())!, converted: true, valid: true };
        }
        return { id: raw, converted: false, valid: true };
      }

      if (/^\d+[A-Z0-9]*$/i.test(stripped)) {
        return { id: `C-${stripped.toUpperCase()}`, converted: true, valid: true };
      }

      return { id: raw, converted: false, valid: false };
    };

    // 2. Migrate teachers collection & registry
    const currentTeachers = getTeachersFromLocalStorage();
    const updatedTeachers: TeacherRecord[] = [];

    for (const t of currentTeachers) {
      let changed = false;
      let teacherLogs: string[] = [];

      // Migrate homeroomClasses
      const newHomeroom: string[] = [];
      if (Array.isArray(t.homeroomClasses)) {
        for (const item of t.homeroomClasses) {
          if (!item) continue;
          const res = resolveClassId(item);
          newHomeroom.push(res.id);
          if (res.converted) {
            changed = true;
            teacherLogs.push(`homeroom: '${item}' -> '${res.id}'`);
          }
          if (!res.valid) {
            failedCount++;
            teacherLogs.push(`⚠️ Không khớp định dạng lớp chủ nhiệm: '${item}'`);
          }
        }
      }

      // Migrate teachingClasses
      const newTeaching: string[] = [];
      if (Array.isArray(t.teachingClasses)) {
        for (const item of t.teachingClasses) {
          if (!item) continue;
          const res = resolveClassId(item);
          newTeaching.push(res.id);
          if (res.converted) {
            changed = true;
            teacherLogs.push(`teaching: '${item}' -> '${res.id}'`);
          }
          if (!res.valid) {
            failedCount++;
            teacherLogs.push(`⚠️ Không khớp định dạng lớp giảng dạy: '${item}'`);
          }
        }
      }

      const updatedT: TeacherRecord = {
        ...t,
        homeroomClasses: newHomeroom,
        teachingClasses: newTeaching
      };

      updatedTeachers.push(updatedT);
      if (changed) {
        successCount++;
        logs.push(`[Giáo viên ${t.name} (${t.id})] Đã chuyển đổi: ${teacherLogs.join(', ')}`);
      }
    }

    saveTeachersToLocalStorage(updatedTeachers);
    await syncTeachersToFirestore(updatedTeachers);

    // 3. Migrate teacher_groups collection
    const groupsSnap = await getDocs(collection(db, 'teacher_groups'));
    if (!groupsSnap.empty) {
      for (const groupDoc of groupsSnap.docs) {
        const groupData = groupDoc.data();
        const groupTeachers = groupData.teachers;
        let groupChanged = false;

        if (Array.isArray(groupTeachers)) {
          const updatedGroupTeachers = groupTeachers.map((gt: any) => {
            const assigned = gt.assignedClasses || gt.homeroomClasses || gt.teachingClasses;
            if (Array.isArray(assigned)) {
              const newAssigned = assigned.map((clsName: string) => {
                if (!clsName) return clsName;
                const res = resolveClassId(clsName);
                if (res.converted) groupChanged = true;
                return res.id;
              });
              return {
                ...gt,
                assignedClasses: newAssigned,
                homeroomClasses: gt.homeroomClasses ? gt.homeroomClasses.map((c: string) => resolveClassId(c).id) : undefined,
                teachingClasses: gt.teachingClasses ? gt.teachingClasses.map((c: string) => resolveClassId(c).id) : undefined
              };
            }
            return gt;
          });

          if (groupChanged) {
            await setDoc(doc(db, 'teacher_groups', groupDoc.id), {
              ...groupData,
              teachers: updatedGroupTeachers,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            logs.push(`✅ [Nhóm GV ${groupDoc.id}] Đã cập nhật assignedClasses thành classId.`);
            successCount++;
          }
        }
      }
    }

    logs.push(`🎉 Migration hoàn tất: ${successCount} bản ghi chuyển đổi thành công, ${failedCount} tên lớp không khớp.`);
    return { success: true, successCount, failedCount, logs };
  } catch (err) {
    console.error('Migration error:', err);
    return { success: false, successCount, failedCount, logs: [...logs, `❌ Lỗi migration: ${err}`] };
  }
}
