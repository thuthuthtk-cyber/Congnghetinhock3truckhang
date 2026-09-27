import { getSubjectsForClassOrGrade, SchoolClassItem } from './classStorageService';

export interface ActiveStudentInfo {
  studentId: string;
  studentName: string;
  studentClass: string;
  studentGrade: string;
}

/**
 * Lấy thông tin hồ sơ học sinh đang đăng nhập từ Single Source of Truth (`eduplay_student_session`)
 */
export function getCurrentStudentSession(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const sessionStr = localStorage.getItem('eduplay_student_session');
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading student session from localStorage:', e);
  }
  return null;
}

/**
 * Lấy Lớp học và Khối học chính xác của học sinh hiện tại.
 * Ưu tiên:
 * 1. session lưu trữ của học sinh đang đăng nhập (`eduplay_student_session`)
 * 2. props truyền vào nếu hợp lệ
 * 3. `eduplay_current_class` / `eduplay_active_class`
 * 4. Fallback an toàn: 'Lớp 3A' (Khối 3)
 */
export function getEffectiveStudentClassAndGrade(propClass?: string): {
  studentClass: string;
  studentGrade: string;
  studentName: string;
  studentId: string;
} {
  const session = getCurrentStudentSession();
  
  let cls = '';
  let name = '';
  let id = '';

  if (session) {
    if (session.className) cls = session.className.trim();
    if (session.name || session.fullName) name = (session.name || session.fullName).trim();
    if (session.id || session.code) id = (session.id || session.code).trim();
  }

  if (!cls && propClass && propClass.trim() !== '') {
    cls = propClass.trim();
  }

  if (!cls && typeof window !== 'undefined') {
    try {
      cls = (localStorage.getItem('eduplay_current_class') || localStorage.getItem('eduplay_active_class') || '').trim();
    } catch {}
  }

  if (!cls) {
    cls = 'Lớp 3A';
  }

  // Đảm bảo có tiền tố "Lớp " nếu chỉ là "5C"
  if (!cls.toLowerCase().startsWith('lớp') && !cls.toLowerCase().startsWith('khối')) {
    cls = `Lớp ${cls}`;
  }

  // Trích xuất số khối từ lớp (vd: "Lớp 5C" -> "5", "Khối 5" -> "5")
  const gradeMatch = cls.match(/\b([1-5])\b|lớp\s*([1-5])|khối\s*([1-5])/i);
  const grNum = gradeMatch ? (gradeMatch[1] || gradeMatch[2] || gradeMatch[3]) : '';
  const studentGrade = grNum ? `Khối ${grNum}` : 'Khối 3';

  return {
    studentClass: cls,
    studentGrade,
    studentName: name || 'Học sinh',
    studentId: id || 'u-4'
  };
}

/**
 * Kiểm tra xem một đối tượng (Bài tập / Đề thi / Phòng đấu game / Bài giảng) có được giao cho học sinh hay không
 */
export function isTargetingStudent(
  targetClass?: string,
  targetGrade?: string,
  currentCls?: string,
  currentGrd?: string
): boolean {
  // Nếu không chỉ định lớp hoặc chỉ định là "Tất cả các lớp"
  if (
    !targetClass ||
    targetClass.trim() === '' ||
    targetClass.toLowerCase() === 'all' ||
    targetClass.toLowerCase().includes('tất cả') ||
    targetClass.toLowerCase().includes('tat ca')
  ) {
    if (!targetGrade || !currentGrd) return true;
    return targetGrade.trim().toLowerCase() === currentGrd.trim().toLowerCase();
  }

  const rawTarget = targetClass.trim().toLowerCase().replace(/\s+/g, '');
  const rawCurrent = (currentCls || '').trim().toLowerCase().replace(/\s+/g, '');

  // 1. Trùng khớp trực tiếp tên lớp (ví dụ: "lớp5c" === "lớp5c", "5c" in "lớp5c")
  if (rawTarget === rawCurrent || rawTarget.includes(rawCurrent) || rawCurrent.includes(rawTarget)) {
    return true;
  }

  // 2. Danh sách nhiều lớp ngăn cách bằng dấu phẩy (vd: "Lớp 5A, Lớp 5B, Lớp 5C")
  if (targetClass.includes(',')) {
    const classList = targetClass.split(',').map((c) => c.trim().toLowerCase().replace(/\s+/g, ''));
    if (classList.some((c) => c === rawCurrent || rawCurrent.includes(c) || c.includes(rawCurrent))) {
      return true;
    }
  }

  // 3. Giao cho toàn khối (vd: targetClass là "Khối 5", "Toàn khối 5", "K5", hoặc targetGrade khớp với khối của học sinh)
  if (currentGrd) {
    const rawGrade = currentGrd.trim().toLowerCase().replace(/\s+/g, ''); // "khối5"
    const gradeNum = currentGrd.replace(/\D/g, ''); // "5"
    if (
      rawTarget.includes(rawGrade) ||
      rawTarget === `khối${gradeNum}` ||
      rawTarget === `k${gradeNum}` ||
      rawTarget === `toànkhối${gradeNum}` ||
      rawTarget === gradeNum
    ) {
      return true;
    }
  }

  if (targetGrade && currentGrd && targetGrade.trim().toLowerCase() === currentGrd.trim().toLowerCase()) {
    if (rawTarget.includes('khối') || rawTarget.includes('k') || rawTarget === '') {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra tính tương đồng giữa 2 tên môn học (chuẩn hóa tiếng Việt, viết tắt, v.v.)
 */
export function isSubjectMatch(itemSubject: string | undefined | null, trackName: string | undefined | null): boolean {
  if (!itemSubject || !trackName) return false;
  const cleanItem = itemSubject.trim().toLowerCase();
  const cleanTrack = trackName.trim().toLowerCase();

  if (cleanTrack === 'tin học' || cleanTrack === 'tin hoc') {
    return cleanItem.includes('tin học') || cleanItem.includes('tin hoc') || (cleanItem.includes('tin') && !cleanItem.includes('tiếng'));
  }
  if (cleanTrack === 'công nghệ' || cleanTrack === 'cong nghe') {
    return cleanItem.includes('công nghệ') || cleanItem.includes('cong nghe');
  }
  if (cleanTrack === 'toán' || cleanTrack === 'toan') {
    return cleanItem.includes('toán') || cleanItem.includes('toan');
  }
  if (cleanTrack === 'tiếng việt' || cleanTrack === 'tieng viet') {
    return cleanItem.includes('tiếng việt') || cleanItem.includes('tieng viet');
  }
  if (cleanTrack.includes('tiếng anh') || cleanTrack.includes('ngoại ngữ') || cleanTrack.includes('english')) {
    return cleanItem.includes('tiếng anh') || cleanItem.includes('tieng anh') || cleanItem.includes('ngoại ngữ') || cleanItem.includes('english');
  }
  if (cleanTrack.includes('khoa học') && !cleanTrack.includes('xã hội')) {
    return cleanItem.includes('khoa học') || cleanItem.includes('khoa hoc');
  }
  if (cleanTrack.includes('lịch sử') || cleanTrack.includes('địa lí') || cleanTrack.includes('địa lý')) {
    return cleanItem.includes('lịch sử') || cleanItem.includes('địa lí') || cleanItem.includes('địa lý') || cleanItem.includes('ls&đl') || cleanItem.includes('lich su') || cleanItem.includes('dia li') || cleanItem.includes('dia ly');
  }
  if (cleanTrack.includes('tự nhiên') || cleanTrack.includes('tnxh')) {
    return cleanItem.includes('tự nhiên') || cleanItem.includes('tu nhien') || cleanItem.includes('tnxh');
  }
  if (cleanTrack.includes('đạo đức')) {
    return cleanItem.includes('đạo đức') || cleanItem.includes('dao duc');
  }
  if (cleanTrack.includes('âm nhạc')) {
    return cleanItem.includes('âm nhạc') || cleanItem.includes('am nhac');
  }
  if (cleanTrack.includes('mĩ thuật') || cleanTrack.includes('mỹ thuật')) {
    return cleanItem.includes('mĩ thuật') || cleanItem.includes('mỹ thuật') || cleanItem.includes('mi thuat') || cleanItem.includes('my thuat');
  }
  if (cleanTrack.includes('thể chất') || cleanTrack.includes('thể dục') || cleanTrack.includes('gdtc')) {
    return cleanItem.includes('thể chất') || cleanItem.includes('thể dục') || cleanItem.includes('gdtc');
  }
  if (cleanTrack.includes('trải nghiệm') || cleanTrack.includes('hđtn')) {
    return cleanItem.includes('trải nghiệm') || cleanItem.includes('trai nghiem') || cleanItem.includes('hdtn');
  }

  return cleanItem.includes(cleanTrack) || cleanTrack.includes(cleanItem);
}

/**
 * TÍNH TOÁN DANH SÁCH MÔN HỌC THỰC SỰ ĐƯỢC GIAO BÀI CHO LỚP CỦA HỌC SINH
 * Tiêu chí chuẩn xác:
 * - Môn học ĐƯỢC HIỂN THỊ nếu có ít nhất 1 trong: bài tập (assignments), đề kiểm tra (exams),
 *   bài giảng 5E (elearning_lessons / lessons), hoặc trò chơi thi đua (games/rooms/quizzi)
 *   thuộc môn đó, được giao cho ĐÚNG LỚP/KHỐI của học sinh.
 * - Môn học BỊ ẨN nếu không có bất kỳ bài nào (0 bài tập + 0 đề + 0 bài giảng + 0 trò chơi).
 */
export function getStudentAssignedSubjects(params: {
  studentClassName: string;
  studentGrade?: string;
  assignments?: any[];
  exams?: any[];
  lessons?: any[];
  assignedLessonsList?: any[];
  games?: any[];
  quizziGames?: any[];
  roomGames?: any[];
  liveClassesList?: SchoolClassItem[];
}): {
  activeSubjectNames: string[];
  hasAnyAssignedContent: boolean;
  subjectItemCounts: Record<string, number>;
} {
  const {
    studentClassName,
    assignments = [],
    exams = [],
    lessons = [],
    assignedLessonsList = [],
    games = [],
    quizziGames = [],
    roomGames = [],
    liveClassesList
  } = params;

  const effectiveGrade = params.studentGrade || getEffectiveStudentClassAndGrade(studentClassName).studentGrade;

  // 1. Lọc các bài tập giao cho đúng lớp/khối của học sinh
  const targetedAssignments = assignments.filter(as => {
    if (!as || !as.id) return false;
    return isTargetingStudent(as.targetClass, as.grade, studentClassName, effectiveGrade);
  });

  // 2. Lọc các đề kiểm tra giao cho đúng lớp/khối của học sinh
  const targetedExams = exams.filter(ex => {
    if (!ex || !ex.id) return false;
    return isTargetingStudent(ex.targetClass, ex.grade, studentClassName, effectiveGrade);
  });

  // 3. Lọc các bài giảng E-Learning / 5E giao cho đúng lớp/khối của học sinh
  const targetedLessons: Array<{ id: string; subject: string; title?: string }> = [];
  assignedLessonsList.forEach(item => {
    if (isTargetingStudent(item.targetClass, (item as any).grade, studentClassName, effectiveGrade)) {
      targetedLessons.push({
        id: item.id,
        subject: item.subject || '',
        title: item.title || (item as any).lessonTitle || ''
      });
    }
  });
  lessons.forEach(l => {
    if (isTargetingStudent((l as any).targetClass || (l as any).classInfo, l.grade, studentClassName, effectiveGrade)) {
      if (!targetedLessons.some(existing => existing.id === l.id || (existing.title && existing.title === l.title))) {
        targetedLessons.push({
          id: l.id,
          subject: l.subject,
          title: l.title
        });
      }
    }
  });

  // 4. Lọc các game thi đua / Quizzi giao cho đúng lớp/khối của học sinh
  const targetedGames: Array<{ id: string | number; subject: string; title?: string }> = [];
  games.forEach(g => {
    if (isTargetingStudent(g.classInfo || (g as any).targetClass, g.grade, studentClassName, effectiveGrade)) {
      targetedGames.push({
        id: g.id,
        subject: g.subject || (g as any).subjectLabel || '',
        title: g.title
      });
    }
  });
  quizziGames.forEach(g => {
    if (isTargetingStudent(g.classInfo, g.grade, studentClassName, effectiveGrade)) {
      if (!targetedGames.some(existing => existing.id === g.id)) {
        targetedGames.push({
          id: g.id,
          subject: g.subject || g.subjectLabel || '',
          title: g.title
        });
      }
    }
  });
  roomGames.forEach(g => {
    if (isTargetingStudent(g.classInfo, g.grade, studentClassName, effectiveGrade)) {
      if (!targetedGames.some(existing => existing.id === g.id)) {
        targetedGames.push({
          id: g.id,
          subject: g.subject || '',
          title: g.title
        });
      }
    }
  });

  // 5. Danh sách môn học ứng viên từ cấu hình Khối/Lớp + môn từ các bài đã giao
  const candidateSubjects = [...getSubjectsForClassOrGrade(studentClassName, liveClassesList)];
  [...targetedAssignments, ...targetedExams, ...targetedLessons, ...targetedGames].forEach(item => {
    if (item.subject && !candidateSubjects.some(s => isSubjectMatch(item.subject, s))) {
      candidateSubjects.push(item.subject);
    }
  });

  // 6. Kiểm tra từng môn xem có ít nhất 1 bài giao hay không
  const activeSubjectNames: string[] = [];
  const subjectItemCounts: Record<string, number> = {};

  candidateSubjects.forEach(subjName => {
    const matchingAssignments = targetedAssignments.filter(a => isSubjectMatch(a.subject, subjName));
    const matchingExams = targetedExams.filter(e => isSubjectMatch(e.subject, subjName));
    const matchingLessons = targetedLessons.filter(l => isSubjectMatch(l.subject, subjName));
    const matchingGames = targetedGames.filter(g => isSubjectMatch(g.subject, subjName));

    const totalCount = matchingAssignments.length + matchingExams.length + matchingLessons.length + matchingGames.length;

    if (totalCount > 0) {
      activeSubjectNames.push(subjName);
      subjectItemCounts[subjName] = totalCount;
    }
  });

  return {
    activeSubjectNames,
    hasAnyAssignedContent: activeSubjectNames.length > 0,
    subjectItemCounts
  };
}

/**
 * Xóa sạch toàn bộ session đăng nhập và dữ liệu lớp học cũ khi đăng xuất
 */
export function clearAllSessionData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('eduplay_student_session');
    localStorage.removeItem('eduplay_teacher_email');
    localStorage.removeItem('eduplay_teacher_name');
    localStorage.removeItem('eduplay_teacher_profile');
    localStorage.removeItem('eduplay_current_class');
    localStorage.removeItem('eduplay_active_class');
    sessionStorage.clear();
  } catch (e) {
    console.warn('Error clearing session data:', e);
  }
}

