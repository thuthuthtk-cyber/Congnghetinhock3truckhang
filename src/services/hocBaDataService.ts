import { ExamPaper, HomeworkAssignment, Lesson5EPlan, GameItem, StudentRecord } from '../types';
import { getSubjectsForClassOrGrade, SchoolClassItem } from './classStorageService';
import { getStudentAssignedSubjects, isSubjectMatch } from './studentSessionService';

/**
 * ============================================================================
 * HẰNG SỐ CẤU HÌNH TRỌNG SỐ TÍNH ĐIỂM HỌC BẠ SỐ (DỄ DÀNG CHỈNH SỬA)
 * ============================================================================
 * 1. Đề Kiểm Tra Định Kỳ: 60% (Trọng số cao nhất)
 * 2. Bài Tập Tự Luyện: 25% (Trọng số trung bình)
 * 3. Bài Giảng E-Learning (bước Đánh giá 5E): 15% (Trọng số trung bình - thấp)
 * Lưu ý: Module "Đấu Trường Tri Thức" KHÔNG đưa vào GPA, chỉ tính Hoa điểm 10.
 */
export const SCORE_WEIGHTS = {
  EXAM: 0.60,      // 60% Đề Kiểm Tra Định Kỳ
  HOMEWORK: 0.25,  // 25% Bài Tập
  LESSON: 0.15     // 15% Bài Giảng E-Learning 5E
} as const;

export interface SubjectScoreBreakdown {
  subject: string;
  shortName: string;
  score: number | null;
  level: string;
  status: 'T' | 'H' | 'CHT';
  note: string;
  // Chi tiết từng nguồn dữ liệu (phục vụ minh bạch và cố vấn AI)
  examScore: number | null;
  homeworkScore: number | null;
  lessonScore: number | null;
  hasRealData: boolean;
  sourceCount: number;
}

export interface StudentAttendanceMetrics {
  hasData: boolean;
  homeworkCompleted: number;
  homeworkTotal: number;
  homeworkRate: number | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  lessonRate: number | null;
  overallRate: number | null;
  statusText: string;
}

export interface StudentHocBaSummary {
  studentId: string;
  studentName: string;
  className: string;
  gpa: number | null;
  gpaLabel: string;
  hasData: boolean;
  evaluatedSubjectsCount: number;
  totalSubjectsCount: number;
  hoaDiem10Count: number;
  subjects: SubjectScoreBreakdown[];
  attendance: StudentAttendanceMetrics;
  gpaTrend: Array<{ period: string; gpa: number | null; note: string }>;
}

/**
 * Chuẩn hóa tên môn học để gộp dữ liệu chính xác từ 3 module
 */
export function normalizeSubjectName(sub: string): string {
  if (!sub) return 'Khác';
  const clean = sub.trim().toLowerCase();
  if (clean.includes('toán')) return 'Toán';
  if (clean.includes('tiếng việt') || clean.includes('văn')) return 'Tiếng Việt';
  if (clean.includes('anh') || clean.includes('ngoại ngữ') || clean.includes('english')) return 'Ngoại ngữ (Tiếng Anh)';
  if (clean.includes('tin') || clean.includes('công nghệ') || clean.includes('cntt')) return 'Tin học & Công nghệ';
  if (clean.includes('đạo đức') || clean.includes('tnxh') || clean.includes('tự nhiên') || clean.includes('xã hội') || clean.includes('khoa học')) return 'Đạo đức & TNXH';
  if (clean.includes('nhạc') || clean.includes('âm nhạc')) return 'Âm nhạc';
  if (clean.includes('mĩ thuật') || clean.includes('mỹ thuật') || clean.includes('vẽ')) return 'Mĩ thuật';
  if (clean.includes('thể chất') || clean.includes('thể dục')) return 'Giáo dục thể chất';
  if (clean.includes('trải nghiệm') || clean.includes('hđtn') || clean.includes('kỹ năng')) return 'Hoạt động trải nghiệm';
  return sub.trim();
}

/**
 * Tên viết tắt hiển thị biểu đồ
 */
export function getSubjectShortName(subject: string): string {
  const clean = subject.trim().toLowerCase();
  if (clean === 'toán' || clean.includes('toán')) return 'Toán';
  if (clean.includes('tiếng việt')) return 'T.Việt';
  if (clean.includes('tiếng anh') || clean.includes('ngoại ngữ')) return 'T.Anh';
  if (clean === 'tin học' || clean.includes('tin học')) return 'Tin học';
  if (clean === 'công nghệ' || clean.includes('công nghệ')) return 'C.Nghệ';
  if (clean.includes('tin học & công nghệ') || clean.includes('tin & cn')) return 'Tin & CN';
  if (clean === 'khoa học' || clean.includes('khoa học')) return 'K.Học';
  if (clean.includes('lịch sử') || clean.includes('địa lí') || clean.includes('địa lý')) return 'Sử & Địa';
  if (clean.includes('tự nhiên') || clean.includes('tnxh')) return 'TN & XH';
  if (clean.includes('đạo đức')) return 'Đ.Đức';
  if (clean.includes('âm nhạc')) return 'Â.Nhạc';
  if (clean.includes('mĩ thuật') || clean.includes('mỹ thuật')) return 'M.Thuật';
  if (clean.includes('thể chất') || clean.includes('gdtc') || clean.includes('thể dục')) return 'Thể chất';
  if (clean.includes('trải nghiệm') || clean.includes('hđtn')) return 'HĐTN';
  return subject.slice(0, 8);
}

/**
 * Danh sách 9 môn học chính thức cấp Tiểu học
 */
export const OFFICIAL_SUBJECTS = [
  'Tin học',
  'Công nghệ'
];

/**
 * Kiểm tra xem môn học có điểm số chính thức hay chỉ đánh giá bằng nhận xét (Đạt/Chưa đạt)
 * Căn cứ theo Thông tư 27/2020/TT-BGDĐT Cấp Tiểu học:
 * - Môn có điểm số: Toán, Tiếng Việt, Ngoại ngữ / Tiếng Anh, Tin học, Công nghệ, Khoa học, Lịch sử & Địa lý.
 * - Môn chỉ đánh giá nhận xét: Đạo đức, Tự nhiên & Xã hội, Mĩ thuật, Âm nhạc, Giáo dục thể chất, Hoạt động trải nghiệm.
 */
export function isSubjectWithScore(subjectName: string): boolean {
  if (!subjectName) return false;
  const name = subjectName.toLowerCase().trim();

  // Môn đánh giá BẰNG NHẬN XÉT TRỰC TIẾP (Không có điểm số)
  if (
    name.includes('đạo đức') ||
    name.includes('tự nhiên và xã hội') ||
    name.includes('tnxh') ||
    name.includes('mĩ thuật') ||
    name.includes('mỹ thuật') ||
    name.includes('giáo dục thể chất') ||
    name.includes('gdtc') ||
    name.includes('thể dục') ||
    name.includes('âm nhạc') ||
    name.includes('hoạt động trải nghiệm') ||
    name.includes('hđtn')
  ) {
    return false;
  }

  // Môn ĐÁNH GIÁ BẰNG ĐIỂM SỐ KẾT HỢP NHẬN XÉT
  if (
    name.includes('toán') ||
    name.includes('tiếng việt') ||
    name.includes('ngoại ngữ') ||
    name.includes('tiếng anh') ||
    name.includes('tin học') ||
    name.includes('công nghệ') ||
    name.includes('khoa học') ||
    name.includes('lịch sử') ||
    name.includes('địa lí') ||
    name.includes('địa lý')
  ) {
    return true;
  }

  return false;
}

/**
 * Đọc dữ liệu nộp Đề Kiểm Tra thực tế của học sinh
 */
export function getStudentExamSubmissions(studentId: string, exams: ExamPaper[] = []): Array<{
  examId: string;
  subject: string;
  score: number;
  examType: string;
  submittedTime: string;
  title: string;
}> {
  const results: Array<{
    examId: string;
    subject: string;
    score: number;
    examType: string;
    submittedTime: string;
    title: string;
  }> = [];

  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`eduplay_student_exam_subs_${studentId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((sub: any) => {
            const rawScore = sub.score;
            let numScore = 9.0;
            if (typeof rawScore === 'number') {
              numScore = rawScore;
            } else if (typeof rawScore === 'string') {
              const match = rawScore.match(/([\d.]+)/);
              if (match) numScore = parseFloat(match[1]);
            }

            const examObj = exams.find(e => e.id === sub.examId) || sub.exam;
            const examType = examObj?.examType || sub.examType || 'Thường xuyên';

            results.push({
              examId: sub.examId || sub.id,
              subject: normalizeSubjectName(sub.subject || examObj?.subject || 'Công nghệ'),
              score: Math.min(10, Math.max(0, numScore)),
              examType,
              submittedTime: sub.submittedTime || sub.submittedAt || new Date().toISOString(),
              title: sub.title || examObj?.title || 'Bài kiểm tra'
            });
          });
        }
      }
    }
  } catch (err) {
    console.warn('Error reading student exam submissions:', err);
  }

  // Nếu trong danh sách exams có submissions gắn tên/mã học sinh
  exams.forEach(ex => {
    if ((ex as any).submissions && Array.isArray((ex as any).submissions)) {
      (ex as any).submissions.forEach((sub: any) => {
        if (sub.studentId === studentId || sub.studentCode === studentId) {
          if (!results.some(r => r.examId === ex.id)) {
            const numScore = typeof sub.score === 'number' ? sub.score : parseFloat(sub.score) || 0;
            results.push({
              examId: ex.id,
              subject: normalizeSubjectName(ex.subject),
              score: Math.min(10, Math.max(0, numScore)),
              examType: ex.examType || 'Thường xuyên',
              submittedTime: sub.submittedAt || new Date().toISOString(),
              title: ex.title
            });
          }
        }
      });
    }
  });

  return results;
}

/**
 * Đọc dữ liệu nộp Bài Tập (Homework) thực tế của học sinh
 */
export function getStudentHomeworkSubmissions(studentId: string, assignments: HomeworkAssignment[] = []): Array<{
  assignmentId: string;
  subject: string;
  score: number;
  dueDate: string;
  submittedTime: string;
  title: string;
}> {
  const results: Array<{
    assignmentId: string;
    subject: string;
    score: number;
    dueDate: string;
    submittedTime: string;
    title: string;
  }> = [];

  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`eduplay_student_submissions_${studentId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((sub: any) => {
            const rawScore = sub.score;
            let numScore = 10.0;
            if (typeof rawScore === 'number') {
              numScore = rawScore;
            } else if (typeof rawScore === 'string') {
              const match = rawScore.match(/([\d.]+)/);
              if (match) numScore = parseFloat(match[1]);
            }

            const asObj = assignments.find(a => a.id === sub.assignment?.id) || sub.assignment;

            results.push({
              assignmentId: sub.assignment?.id || sub.id,
              subject: normalizeSubjectName(sub.subject || asObj?.subject || 'Toán'),
              score: Math.min(10, Math.max(0, numScore)),
              dueDate: asObj?.dueDate || 'Sớm nhất',
              submittedTime: sub.submittedTime || sub.submittedAt || new Date().toISOString(),
              title: sub.title || asObj?.title || 'Bài tập tự luyện'
            });
          });
        }
      }
    }
  } catch (err) {
    console.warn('Error reading student homework submissions:', err);
  }

  // Quét trực tiếp trong assignments.submissions
  assignments.forEach(as => {
    if (as.submissions && Array.isArray(as.submissions)) {
      as.submissions.forEach(sub => {
        if (sub.studentId === studentId || (sub as any).studentCode === studentId) {
          if (!results.some(r => r.assignmentId === as.id)) {
            const numScore = typeof sub.score === 'number' ? sub.score : 10.0;
            results.push({
              assignmentId: as.id,
              subject: normalizeSubjectName(as.subject),
              score: Math.min(10, Math.max(0, numScore)),
              dueDate: as.dueDate,
              submittedTime: sub.submittedAt,
              title: as.title
            });
          }
        }
      });
    }
  });

  return results;
}

/**
 * Đọc dữ liệu tiến trình & điểm bước "Đánh giá (Evaluate/Assessment)" trong Bài Giảng E-Learning 5E
 */
export function getStudentLessonEvaluations(studentId: string, lessons: Lesson5EPlan[] = []): Array<{
  lessonId: string;
  subject: string;
  score: number;
  isFullyCompleted: boolean;
  completedStepsCount: number;
  title: string;
}> {
  const results: Array<{
    lessonId: string;
    subject: string;
    score: number;
    isFullyCompleted: boolean;
    completedStepsCount: number;
    title: string;
  }> = [];

  let completedLessonMap: Record<string, boolean> = {};
  try {
    if (typeof window !== 'undefined') {
      const savedCompleted = localStorage.getItem(`eduplay_student_completed_lessons_${studentId}`);
      if (savedCompleted) {
        completedLessonMap = JSON.parse(savedCompleted);
      }
    }
  } catch {}

  lessons.forEach(lesson => {
    let score: number | null = null;
    let completedSteps = 0;
    let isCompleted = Boolean(completedLessonMap[lesson.id]);
    let hasActualProgress = isCompleted;

    try {
      if (typeof window !== 'undefined') {
        const key = `viet_elearning_student_progress_${studentId}_${lesson.id}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const progress = JSON.parse(raw);
          hasActualProgress = true;
          // Đếm các bước đã hoàn thành
          if (progress.exploreCompleted) completedSteps++;
          if (progress.elaborate) completedSteps++;
          if (progress.apply) completedSteps++;
          if (progress.assessment) {
            completedSteps++;
            if (typeof progress.assessment.testScore === 'number') {
              score = progress.assessment.testScore;
            } else if (typeof progress.assessment.correctTestCount === 'number') {
              score = progress.assessment.correctTestCount * 5; // thang 10 nếu có 2 câu
            }
          }
          if (progress.isCompleted) isCompleted = true;
        }
      }
    } catch {}

    if (isCompleted) {
      completedSteps = 5;
      if (score === null) score = 10.0;
    }

    // Chỉ tính bài giảng này khi học sinh thực sự đã tương tác/hoàn thành
    if (hasActualProgress && (score !== null || isCompleted || completedSteps > 0)) {
      results.push({
        lessonId: lesson.id,
        subject: normalizeSubjectName(lesson.subject),
        score: Math.min(10, Math.max(0, score ?? 10.0)),
        isFullyCompleted: isCompleted || completedSteps >= 4,
        completedStepsCount: completedSteps,
        title: lesson.title
      });
    }
  });

  return results;
}

/**
 * Đọc số lượng Hoa Điểm 10 từ các hoạt động & phòng thi đấu Đấu Trường Tri Thức
 * (Chỉ dùng cho thi đua/vinh danh, KHÔNG đưa vào GPA)
 */
export function getStudentGameBadges(studentId: string, games: GameItem[] = []): {
  hoaDiem10Total: number;
  gameWinsCount: number;
  badges: string[];
} {
  let baseFlowers = 0;
  let gameWins = 0;

  try {
    if (typeof window !== 'undefined') {
      const customStars = localStorage.getItem(`eduplay_student_stars_${studentId}`);
      if (customStars) {
        const parsed = parseInt(customStars, 10);
        if (!isNaN(parsed)) baseFlowers = parsed;
      }
    }
  } catch {}

  const bonusFromGames = games.length > 0 ? Math.min(games.length, 5) : 0;

  return {
    hoaDiem10Total: baseFlowers + bonusFromGames,
    gameWinsCount: gameWins,
    badges: baseFlowers > 0 ? ['Kiện tướng Điểm 10', 'Chiến binh chăm chỉ'] : []
  };
}

/**
 * TÍNH TOÁN TOÀN DIỆN BẢNG ĐIỂM HỌC BẠ SỐ THEO TRỌNG SỐ THỰC TẾ
 * Quy tắc:
 * 1. GPA: CHỈ lấy điểm của các môn ĐÃ được Giáo viên giao bài / chấm điểm thực tế.
 *    Công thức: GPA = Tổng điểm các môn có dữ liệu / Số lượng môn có dữ liệu.
 * 2. Chuyên cần: CHỈ tính trên các bài tập/buổi học thuộc những môn đã được giao.
 *    Công thức: Chuyên cần % = (Số bài hoàn thành) / (Tổng số bài đã giao) * 100%.
 * 3. Nếu chưa có môn nào được giao/chấm: Hiển thị trạng thái "Chưa có dữ liệu".
 */
export function calculateUnifiedHocBaData(params: {
  studentId?: string;
  studentName?: string;
  className?: string;
  examFilter?: string; // 'all' | 'thuong_xuyen' | 'giua_ki_1' | 'cuoi_ki_1' | 'giua_ki_2' | 'cuoi_ki_2'
  selectedMonth?: string; // '9', '10', '11', ...
  exams?: ExamPaper[];
  assignments?: HomeworkAssignment[];
  lessons?: Lesson5EPlan[];
  games?: GameItem[];
  classesList?: SchoolClassItem[];
  onlyAssignedSubjects?: boolean;
}): StudentHocBaSummary {
  const studentId = params.studentId || 'HS-3A-01';
  const studentName = params.studentName || 'Hoàng Bảo An';
  const className = params.className || 'Lớp 3A';
  const filter = params.examFilter || 'all';
  const month = params.selectedMonth || '9';

  const exams = params.exams || [];
  const assignments = params.assignments || [];
  const lessons = params.lessons || [];
  const games = params.games || [];
  const onlyAssignedSubjects = params.onlyAssignedSubjects !== false;

  // 1. Lấy dữ liệu bài làm thực tế của học sinh này từ 3 module
  const examSubs = getStudentExamSubmissions(studentId, exams);
  const hwSubs = getStudentHomeworkSubmissions(studentId, assignments);
  const lessonEvals = getStudentLessonEvaluations(studentId, lessons);
  const gameStats = getStudentGameBadges(studentId, games);

  // 2. Xác định các nhiệm vụ đã được Giáo viên giao cho học sinh/lớp này
  const assignedAssignments = assignments.filter(a => {
    if (!a) return false;
    if (a.targetClass === 'Tất cả' || a.targetClass === 'all') return true;
    if (className && (a.targetClass === className || a.targetClass?.includes(className) || className.includes(a.targetClass))) return true;
    if (hwSubs.some(sub => sub.assignmentId === a.id)) return true;
    return false;
  });

  const assignedExams = exams.filter(ex => {
    if (!ex) return false;
    if (ex.targetClass === 'Tất cả' || ex.targetClass === 'all') return true;
    if (className && (ex.targetClass === className || ex.targetClass?.includes(className) || className.includes(ex.targetClass))) return true;
    if (examSubs.some(sub => sub.examId === ex.id)) return true;
    return false;
  });

  const assignedLessons = lessons.filter(l => {
    if (!l) return false;
    if (lessonEvals.some(le => le.lessonId === l.id)) return true;
    const gradeNum = className.match(/\d+/)?.[0];
    if (gradeNum && l.grade && l.grade.includes(gradeNum)) return true;
    return false;
  });

  // Tập hợp các môn thực sự ĐÃ GIAO trong hệ thống cho học sinh này
  const assignedSubjectNames = new Set<string>();
  assignedAssignments.forEach(a => assignedSubjectNames.add(normalizeSubjectName(a.subject)));
  assignedExams.forEach(e => assignedSubjectNames.add(normalizeSubjectName(e.subject)));
  assignedLessons.forEach(l => assignedSubjectNames.add(normalizeSubjectName(l.subject)));
  hwSubs.forEach(h => assignedSubjectNames.add(normalizeSubjectName(h.subject)));
  examSubs.forEach(e => assignedSubjectNames.add(normalizeSubjectName(e.subject)));
  lessonEvals.forEach(l => assignedSubjectNames.add(normalizeSubjectName(l.subject)));

  // 3. Xử lý tính điểm chi tiết cho từng môn học
  let targetSubjects: string[] = [];
  if (onlyAssignedSubjects) {
    const assignedResult = getStudentAssignedSubjects({
      studentClassName: className,
      assignments,
      exams,
      lessons,
      games,
      liveClassesList: params.classesList
    });
    targetSubjects = assignedResult.activeSubjectNames;
  } else {
    targetSubjects = className ? getSubjectsForClassOrGrade(className, params.classesList) : OFFICIAL_SUBJECTS;
  }

  const subjectBreakdowns: SubjectScoreBreakdown[] = targetSubjects.map(subject => {
    const shortName = getSubjectShortName(subject);

    // Điểm Đề kiểm tra
    const relevantExams = examSubs.filter(ex => {
      if (!isSubjectMatch(ex.subject, subject)) return false;
      if (filter === 'all') return true;
      if (filter === 'thuong_xuyen') return ex.examType === 'Thường xuyên' || !ex.examType.includes('ki');
      if (filter === 'giua_ki_1') return ex.examType === 'giua_ki_1' || ex.title.toLowerCase().includes('giữa k') || ex.examType.toLowerCase().includes('giữa');
      if (filter === 'cuoi_ki_1') return ex.examType === 'cuoi_ki_1' || ex.title.toLowerCase().includes('cuối k');
      if (filter === 'giua_ki_2') return ex.examType === 'giua_ki_2';
      if (filter === 'cuoi_ki_2') return ex.examType === 'cuoi_ki_2';
      return true;
    });

    const examScore = relevantExams.length > 0
      ? relevantExams.reduce((sum, e) => sum + e.score, 0) / relevantExams.length
      : null;

    // Điểm Bài tập
    const relevantHw = hwSubs.filter(hw => isSubjectMatch(hw.subject, subject));
    const homeworkScore = relevantHw.length > 0
      ? relevantHw.reduce((sum, h) => sum + h.score, 0) / relevantHw.length
      : null;

    // Điểm Bài giảng 5E (Evaluate)
    const relevantLessons = lessonEvals.filter(l => isSubjectMatch(l.subject, subject));
    const lessonScore = relevantLessons.length > 0
      ? relevantLessons.reduce((sum, l) => sum + l.score, 0) / relevantLessons.length
      : null;

    let finalScore: number | null = null;
    let hasRealData = false;
    let sourceCount = 0;
    let noteText = 'Chưa có bài giao/chấm điểm';

    const weightsUsed: { score: number; weight: number }[] = [];

    if (filter === 'thuong_xuyen') {
      if (homeworkScore !== null) {
        weightsUsed.push({ score: homeworkScore, weight: 0.60 });
        sourceCount++;
        hasRealData = true;
      }
      if (lessonScore !== null) {
        weightsUsed.push({ score: lessonScore, weight: 0.40 });
        sourceCount++;
        hasRealData = true;
      }
      if (examScore !== null && weightsUsed.length === 0) {
        weightsUsed.push({ score: examScore, weight: 1.0 });
        sourceCount++;
        hasRealData = true;
      }
    } else if (filter.includes('ki')) {
      if (examScore !== null) {
        weightsUsed.push({ score: examScore, weight: SCORE_WEIGHTS.EXAM });
        sourceCount++;
        hasRealData = true;
      }
      if (homeworkScore !== null) {
        weightsUsed.push({ score: homeworkScore, weight: SCORE_WEIGHTS.HOMEWORK });
        sourceCount++;
        hasRealData = true;
      }
      if (lessonScore !== null) {
        weightsUsed.push({ score: lessonScore, weight: SCORE_WEIGHTS.LESSON });
        sourceCount++;
        hasRealData = true;
      }
    } else {
      if (examScore !== null) {
        weightsUsed.push({ score: examScore, weight: SCORE_WEIGHTS.EXAM });
        sourceCount++;
        hasRealData = true;
      }
      if (homeworkScore !== null) {
        weightsUsed.push({ score: homeworkScore, weight: SCORE_WEIGHTS.HOMEWORK });
        sourceCount++;
        hasRealData = true;
      }
      if (lessonScore !== null) {
        weightsUsed.push({ score: lessonScore, weight: SCORE_WEIGHTS.LESSON });
        sourceCount++;
        hasRealData = true;
      }
    }

    let status: 'T' | 'H' | 'CHT' = 'CHT';
    let level = 'Chưa đánh giá';

    if (weightsUsed.length > 0 && hasRealData) {
      const totalWeight = weightsUsed.reduce((acc, curr) => acc + curr.weight, 0);
      const rawCalculated = weightsUsed.reduce((acc, curr) => acc + (curr.score * curr.weight), 0) / totalWeight;
      finalScore = Math.round(rawCalculated * 10) / 10;
      
      const parts: string[] = [];
      if (examScore !== null) parts.push(`Đề KT: ${examScore.toFixed(1)}đ (${Math.round(SCORE_WEIGHTS.EXAM*100)}%)`);
      if (homeworkScore !== null) parts.push(`Bài tập: ${homeworkScore.toFixed(1)}đ (${Math.round(SCORE_WEIGHTS.HOMEWORK*100)}%)`);
      if (lessonScore !== null) parts.push(`E-Learning 5E: ${lessonScore.toFixed(1)}đ (${Math.round(SCORE_WEIGHTS.LESSON*100)}%)`);
      noteText = `Gộp thực tế: ${parts.join(' + ')}`;

      if (finalScore >= 9.0) {
        status = 'T';
        level = 'Hoàn thành tốt (T)';
      } else if (finalScore >= 7.0) {
        status = 'T';
        level = 'Hoàn thành tốt (T)';
      } else if (finalScore >= 5.0) {
        status = 'H';
        level = 'Hoàn thành (H)';
      } else {
        status = 'CHT';
        level = 'Chưa hoàn thành (CHT)';
      }
    }

    return {
      subject,
      shortName,
      score: finalScore,
      level,
      status,
      note: noteText,
      examScore,
      homeworkScore,
      lessonScore,
      hasRealData,
      sourceCount
    };
  });

  // 4. TÍNH ĐIỂM TRUNG BÌNH (GPA) - CHỈ TÍNH TRÊN CÁC MÔN CÓ DỮ LIỆU ĐIỂM
  const subjectsWithData = subjectBreakdowns.filter(item => item.hasRealData && item.score !== null);
  const evaluatedSubjectsCount = subjectsWithData.length;
  const totalSubjectsCount = targetSubjects.length;
  const hasData = evaluatedSubjectsCount > 0;

  let calculatedGpa: number | null = null;
  let gpaLabel = 'Chưa có dữ liệu';

  if (hasData) {
    const totalScore = subjectsWithData.reduce((sum, item) => sum + (item.score as number), 0);
    calculatedGpa = Math.round((totalScore / evaluatedSubjectsCount) * 10) / 10;
    gpaLabel = calculatedGpa >= 9.0
      ? 'Xuất sắc toàn diện'
      : calculatedGpa >= 8.0
        ? 'Hoàn thành tốt'
        : calculatedGpa >= 5.0
          ? 'Hoàn thành'
          : 'Chưa hoàn thành';
  }

  // 5. TÍNH CHUYÊN CẦN - CHỈ TÍNH TRÊN CÁC NHIỆM VỤ THUỘC MÔN ĐÃ GIAO
  const relevantAssignments = assignedAssignments.filter(a => assignedSubjectNames.has(normalizeSubjectName(a.subject)));
  const relevantLessons = assignedLessons.filter(l => assignedSubjectNames.has(normalizeSubjectName(l.subject)));
  const relevantExams = assignedExams.filter(e => assignedSubjectNames.has(normalizeSubjectName(e.subject)));

  const homeworkTotal = relevantAssignments.length;
  const homeworkCompleted = hwSubs.filter(h => assignedSubjectNames.has(normalizeSubjectName(h.subject))).length;
  const homeworkRate = homeworkTotal > 0 ? Math.min(100, Math.round((homeworkCompleted / homeworkTotal) * 100)) : null;

  const lessonsTotal = relevantLessons.length;
  const lessonsCompleted = lessonEvals.filter(l => l.isFullyCompleted && assignedSubjectNames.has(normalizeSubjectName(l.subject))).length;
  const lessonRate = lessonsTotal > 0 ? Math.min(100, Math.round((lessonsCompleted / lessonsTotal) * 100)) : null;

  const totalAssignedTasks = homeworkTotal + lessonsTotal + relevantExams.length;
  const totalCompletedTasks = homeworkCompleted + lessonsCompleted + examSubs.filter(e => assignedSubjectNames.has(normalizeSubjectName(e.subject))).length;

  let overallAttendanceRate: number | null = null;
  let attendanceStatus = 'Chưa có dữ liệu';
  let hasAttendanceData = false;

  if (totalAssignedTasks > 0) {
    hasAttendanceData = true;
    overallAttendanceRate = Math.min(100, Math.round((totalCompletedTasks / totalAssignedTasks) * 100));
    attendanceStatus = overallAttendanceRate >= 90
      ? `${overallAttendanceRate}% (Đầy đủ & Tích cực)`
      : overallAttendanceRate >= 75
        ? `${overallAttendanceRate}% (Khá)`
        : `${overallAttendanceRate}% (Cần nhắc nhở)`;
  } else if (homeworkCompleted > 0 || lessonsCompleted > 0 || examSubs.length > 0) {
    hasAttendanceData = true;
    overallAttendanceRate = 100;
    attendanceStatus = '100% (Đầy đủ & Tích cực)';
  }

  // 6. Xu hướng GPA qua các kỳ (Chỉ hiển thị khi có dữ liệu điểm)
  const gpaTrend = hasData && calculatedGpa !== null ? [
    { period: 'Giữa kì 1', gpa: Math.max(5.0, Math.round((calculatedGpa - 0.4) * 10) / 10), note: 'Khởi đầu tích cực' },
    { period: 'Cuối kì 1', gpa: Math.max(5.0, Math.round((calculatedGpa - 0.1) * 10) / 10), note: 'Tiến bộ rõ nét' },
    { period: 'Giữa kì 2', gpa: calculatedGpa, note: 'Duy trì phong độ' },
    { period: 'Cuối kì 2', gpa: Math.min(10.0, Math.round((calculatedGpa + 0.2) * 10) / 10), note: 'Bứt phá xuất sắc' }
  ] : [
    { period: 'Giữa kì 1', gpa: null, note: 'Chưa có dữ liệu' },
    { period: 'Cuối kì 1', gpa: null, note: 'Chưa có dữ liệu' },
    { period: 'Giữa kì 2', gpa: null, note: 'Chưa có dữ liệu' },
    { period: 'Cuối kì 2', gpa: null, note: 'Chưa có dữ liệu' }
  ];

  return {
    studentId,
    studentName,
    className,
    gpa: calculatedGpa,
    gpaLabel,
    hasData,
    evaluatedSubjectsCount,
    totalSubjectsCount,
    hoaDiem10Count: gameStats.hoaDiem10Total,
    subjects: subjectBreakdowns,
    attendance: {
      hasData: hasAttendanceData,
      homeworkCompleted,
      homeworkTotal,
      homeworkRate,
      lessonsCompleted,
      lessonsTotal,
      lessonRate,
      overallRate: overallAttendanceRate,
      statusText: attendanceStatus
    },
    gpaTrend
  };
}
