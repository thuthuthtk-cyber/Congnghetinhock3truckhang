import React from 'react';
import { 
  Sparkles, 
  Award, 
  CheckCircle2, 
  RotateCcw, 
  Home, 
  Printer, 
  Star, 
  Share2, 
  BookOpen, 
  Check, 
  Trophy,
  Heart
} from 'lucide-react';
import { Lesson5EPlan } from '../../types';
import { getStudentAvatarSource } from '../common/AnimalAvatars';
import { getCurrentStudentSession } from '../../services/studentSessionService';
import { getTeachersFromLocalStorage } from '../../services/teacherStorageService';

/**
 * Checks if a name is a generic placeholder rather than an actual teacher's name.
 */
export const isGenericTeacherLabel = (name?: string | null): boolean => {
  if (!name) return true;
  const clean = name.trim().toLowerCase();
  return (
    clean === '' ||
    clean === 'thầy/cô giáo bộ môn' ||
    clean === 'thay/co giao bo mon' ||
    clean === 'thầy/cô giáo' ||
    clean === 'thầy cô giáo' ||
    clean === 'giáo viên bộ môn' ||
    clean === 'giao vien bo mon' ||
    clean === 'giáo viên' ||
    clean === 'giao vien' ||
    clean === 'thầy/cô' ||
    clean === 'thầy cô' ||
    clean === 'thay/co' ||
    clean === 'thầy/cô giáo viên' ||
    clean === 'giáo viên phụ trách' ||
    clean === 'giáo viên đánh giá' ||
    clean === 'gvbm' ||
    clean === 'gv'
  );
};

/**
 * Format teacher display name with appropriate respectful title (Cô / Thầy / ThS.).
 */
export const formatTeacherWithTitle = (name: string): string => {
  if (!name || isGenericTeacherLabel(name)) return 'Thầy/Cô Phụ trách';
  const clean = name.trim();
  if (
    clean.startsWith('Cô ') || 
    clean.startsWith('Thầy ') || 
    clean.startsWith('ThS. ') || 
    clean.startsWith('TS. ') || 
    clean.startsWith('Thầy/Cô ')
  ) {
    return clean;
  }
  const lower = clean.toLowerCase();
  const isFemale = /\b(thị|cô|mai|lan|hoa|ngọc|thu|hương|hà|trang|phương|linh|thủ|diễm|dung|vân|thủy|yến|nhung|hạnh|oanh|loan|hằng|cúc|đào|mơ|xuyên|liên|tuyết|nguyệt|hồng|bích|hiền|quỳnh|trâm|thi|nhi|mi|thảo|ngân)\b/i.test(lower);
  return isFemale ? `Cô ${clean}` : `Thầy ${clean}`;
};

/**
 * Resolve real subject/homeroom teacher for a student class and subject from school teachers database.
 */
export const resolveTeacherForClassAndSubject = (studentClass?: string, subject?: string): string => {
  try {
    const teachers = getTeachersFromLocalStorage();
    const cleanClass = (studentClass || '').replace(/^lớp\s*/i, '').trim().toLowerCase();

    // 1. Try to find teacher assigned to this class and subject
    if (cleanClass && subject) {
      const cleanSubj = subject.toLowerCase();
      const matched = teachers.find(t => {
        const hasClass = (t.teachingClasses || []).some(c => c.toLowerCase().includes(cleanClass)) ||
                         (t.homeroomClasses || []).some(c => c.toLowerCase().includes(cleanClass)) ||
                         (t.nhomGvCn || '').toLowerCase().includes(cleanClass);
        const hasSubj = (t.subject || '').toLowerCase().includes(cleanSubj);
        return hasClass && hasSubj;
      });
      if (matched && matched.name && !isGenericTeacherLabel(matched.name)) {
        return matched.name;
      }
    }

    // 2. Try to find homeroom teacher (GVCN) of this class
    if (cleanClass) {
      const homeroom = teachers.find(t => 
        (t.homeroomClasses || []).some(c => c.toLowerCase().includes(cleanClass)) ||
        (t.nhomGvCn || '').toLowerCase().includes(cleanClass)
      );
      if (homeroom && homeroom.name && !isGenericTeacherLabel(homeroom.name)) {
        return homeroom.name;
      }
    }

    // 3. Try to find teacher teaching this subject in the school
    if (subject) {
      const cleanSubj = subject.toLowerCase();
      const subjTeacher = teachers.find(t => (t.subject || '').toLowerCase().includes(cleanSubj));
      if (subjTeacher && subjTeacher.name && !isGenericTeacherLabel(subjTeacher.name)) {
        return subjTeacher.name;
      }
    }

    // 4. Default to first active teacher in staff directory
    const activeTeacher = teachers.find(t => t.name && !isGenericTeacherLabel(t.name));
    if (activeTeacher && activeTeacher.name) {
      return activeTeacher.name;
    }
  } catch (e) {
    console.warn('Error resolving teacher from storage:', e);
  }
  return '';
};

export interface Overall5EResults {
  engageViewed?: boolean;
  exploreAccuracy?: number | null;
  exploreCompleted?: boolean;
  elaborateScore?: number | null;
  applySubmitted?: boolean;
  assessmentScore?: number | null;
  overallScore?: number | null;
}

interface StudentReviewViewProps {
  lesson: Lesson5EPlan;
  currentUserName: string;
  currentClass: string;
  studentAvatar?: string;
  teacherName?: string;
  overallResults?: Overall5EResults;
  onRestartLesson: () => void;
  onBackToList: () => void;
}

export const StudentReviewView: React.FC<StudentReviewViewProps> = ({
  lesson,
  currentUserName,
  currentClass,
  studentAvatar,
  teacherName,
  overallResults = {},
  onRestartLesson,
  onBackToList
}) => {
  const studentSession = getCurrentStudentSession();
  const avatarSource = getStudentAvatarSource(
    studentAvatar || studentSession?.avatarUrl || studentSession?.avatar,
    currentUserName
  );
  const feedbackConfig = (lesson as any)?.feedbackConfig || {};
  const blocks = feedbackConfig.blocks || [];

  // Determine true completion state for each of the 5 steps without mock fallbacks
  const isEngageCompleted = Boolean(overallResults.engageViewed);

  const hasExploreScore = typeof overallResults.exploreAccuracy === 'number' && !isNaN(overallResults.exploreAccuracy);
  const isExploreCompleted = Boolean(overallResults.exploreCompleted || hasExploreScore);
  const exploreAccuracyVal = hasExploreScore ? overallResults.exploreAccuracy : null;

  const hasElaborateScore = typeof overallResults.elaborateScore === 'number' && !isNaN(overallResults.elaborateScore);
  const isElaborateCompleted = hasElaborateScore;
  const elaborateScoreVal = hasElaborateScore ? overallResults.elaborateScore : null;

  const isApplySubmitted = Boolean(overallResults.applySubmitted);

  const hasAssessmentScore = typeof overallResults.assessmentScore === 'number' && !isNaN(overallResults.assessmentScore);
  const isAssessmentCompleted = hasAssessmentScore;
  const assessmentScoreVal = hasAssessmentScore ? overallResults.assessmentScore : null;

  // Count steps that were genuinely completed
  const completedStepsCount = [
    isEngageCompleted,
    isExploreCompleted,
    isElaborateCompleted,
    isApplySubmitted,
    isAssessmentCompleted
  ].filter(Boolean).length;

  // Calculate real total score strictly based on completed steps with actual score data
  let realCalculatedScore: number | null = null;
  if (typeof overallResults.overallScore === 'number' && !isNaN(overallResults.overallScore)) {
    realCalculatedScore = overallResults.overallScore;
  } else {
    const scoredParts: number[] = [];
    if (typeof exploreAccuracyVal === 'number') scoredParts.push(exploreAccuracyVal);
    if (typeof elaborateScoreVal === 'number') scoredParts.push(elaborateScoreVal * 10);
    if (typeof assessmentScoreVal === 'number') scoredParts.push(assessmentScoreVal * 10);

    if (scoredParts.length > 0) {
      realCalculatedScore = Math.round(scoredParts.reduce((a, b) => a + b, 0) / scoredParts.length);
    }
  }

  const hasEnoughScoreData = realCalculatedScore !== null;
  const calcScore = realCalculatedScore ?? 0;
  
  let activeBlockIndex = 0;
  let tierBadge = 'HOÀN THÀNH XUẤT SẮC 🏆';
  let isExcellent = false;

  if (completedStepsCount === 5 && hasEnoughScoreData && calcScore >= 85) {
    activeBlockIndex = 0;
    tierBadge = 'HOÀN THÀNH XUẤT SẮC 🏆';
    isExcellent = true;
  } else if (completedStepsCount >= 3 && hasEnoughScoreData && calcScore >= 60) {
    activeBlockIndex = blocks.length > 1 ? 1 : 0;
    tierBadge = 'HOÀN THÀNH TỐT - ĐẠT YÊU CẦU 👍';
    isExcellent = false;
  } else if (completedStepsCount > 0) {
    activeBlockIndex = blocks.length > 2 ? 2 : (blocks.length > 1 ? 1 : 0);
    tierBadge = `TIẾN TRÌNH: ${completedStepsCount}/5 BƯỚC ✍️`;
    isExcellent = false;
  } else {
    activeBlockIndex = blocks.length > 2 ? 2 : (blocks.length > 1 ? 1 : 0);
    tierBadge = 'CHƯA BẮT ĐẦU BÀI HỌC 📖';
    isExcellent = false;
  }

  // Resolve actual teacher name (eliminating generic placeholder "Thầy/Cô giáo bộ môn")
  const resolvedTeacherName = React.useMemo(() => {
    // 1. Direct teacherName prop passed from caller
    if (teacherName && !isGenericTeacherLabel(teacherName)) {
      return formatTeacherWithTitle(teacherName);
    }

    // 2. Teacher name saved inside the block (only if customized by teacher, not generic default)
    const blockTeacher = blocks[activeBlockIndex]?.teacherName;
    if (blockTeacher && !isGenericTeacherLabel(blockTeacher)) {
      return formatTeacherWithTitle(blockTeacher);
    }

    // 3. Author name of lesson
    if (lesson?.authorName && !isGenericTeacherLabel(lesson.authorName)) {
      return formatTeacherWithTitle(lesson.authorName);
    }

    // 4. Any assignedBy or teacherName in lesson object
    const extraTeacher = (lesson as any)?.assignedBy || (lesson as any)?.teacherName;
    if (extraTeacher && !isGenericTeacherLabel(extraTeacher)) {
      return formatTeacherWithTitle(extraTeacher);
    }

    // 5. Look up in localStorage cached assignments
    try {
      const assignedRaw = localStorage.getItem('eduplay_assigned_elearning_lessons');
      if (assignedRaw) {
        const assignedList = JSON.parse(assignedRaw);
        if (Array.isArray(assignedList)) {
          const match = assignedList.find((a: any) => 
            (a.lessonId && a.lessonId === lesson?.id) || 
            (a.id && a.id === lesson?.id) ||
            (a.title && lesson?.title && a.title.toLowerCase().trim() === lesson.title.toLowerCase().trim())
          );
          if (match && match.assignedBy && !isGenericTeacherLabel(match.assignedBy)) {
            return formatTeacherWithTitle(match.assignedBy);
          }
        }
      }
    } catch {
      // ignore
    }

    // 6. Look up matching teacher in school staff database
    const staffTeacher = resolveTeacherForClassAndSubject(currentClass, lesson?.subject);
    if (staffTeacher) {
      return formatTeacherWithTitle(staffTeacher);
    }

    // 7. Fallback to known homeroom teacher for Lớp 5C / TH Quang Hưng
    return 'Cô Trần Thị Diễm Hương';
  }, [teacherName, blocks, activeBlockIndex, lesson, currentClass]);

  const selectedBlock = blocks[activeBlockIndex] || {
    id: 'block-default',
    levelTitle: tierBadge,
    sticker: isExcellent ? '🏆' : (completedStepsCount > 0 ? '👍' : '📖'),
    praiseTitle: isExcellent 
      ? 'Chúc mừng em đã hoàn thành xuất sắc toàn bộ bài học!' 
      : (completedStepsCount > 0 
          ? `Em đã hoàn thành ${completedStepsCount}/5 bước học tập!` 
          : 'Bắt đầu bài giảng 5E ngay hôm nay!'),
    praiseContent: isExcellent
      ? 'Em có tinh thần tự giác rất cao, trả lời chuẩn xác các câu hỏi tương tác trong video, thực hành luyện tập xuất sắc và vận dụng bài học vào thực tế rất tốt. Thầy/Cô rất tự hào về sự cố gắng của em!'
      : (completedStepsCount > 0 
          ? 'Em đang tích cực thực hiện bài giảng. Hãy tiếp tục hoàn thành các bước học tập còn lại để ghi nhận đầy đủ điểm số nhé!'
          : 'Hãy nhấp vào các bước bài giảng để bắt đầu trải nghiệm nội dung và hoạt động tương tác.'),
    teacherName: resolvedTeacherName,
    useLaurelWreath: isExcellent,
    laurelWreathUrl: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
    backgroundImageUrl: ''
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* 1. VINH DANH & PHẢN HỒI GIÁO VIÊN BANNER */}
      <div className="rounded-3xl overflow-hidden border border-amber-300/80 shadow-2xl relative bg-slate-950 text-white p-6 sm:p-10 flex flex-col items-center text-center">
        
        {/* Background Image / Texture Layer */}
        {selectedBlock.backgroundImageUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
            style={{ backgroundImage: `url(${selectedBlock.backgroundImageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/60 via-slate-950 to-indigo-950 opacity-95 pointer-events-none" />
        )}

        {/* Ambient top light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/20 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 w-full space-y-6">
          
          {/* Level Badge Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/25 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-wider shadow-sm">
            <span>{selectedBlock.sticker || '🏆'}</span>
            <span>{selectedBlock.levelTitle || tierBadge}</span>
          </div>

          {/* AVATAR WITH OPTIONAL GOLDEN LAUREL WREATH */}
          <div className="relative w-40 h-40 mx-auto flex items-center justify-center my-2">
            
            {/* Pulsating golden aura glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-70 blur-xl animate-pulse" />

            {/* Laurel Wreath Overlay */}
            {selectedBlock.useLaurelWreath !== false && (
              <div className="absolute -inset-6 z-20 pointer-events-none flex items-center justify-center">
                <img 
                  src={selectedBlock.laurelWreathUrl || 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png'} 
                  alt="Vòng nguyệt quế" 
                  className="w-full h-full object-contain drop-shadow-[0_0_18px_rgba(252,211,77,0.9)] scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Student Avatar (Circular) */}
            <div className="relative z-10 w-28 h-28 rounded-full border-4 border-amber-300 shadow-2xl overflow-hidden bg-white flex items-center justify-center">
              <img 
                src={avatarSource} 
                alt={currentUserName || 'Avatar học sinh'} 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Sticker badge on avatar */}
            <div className="absolute bottom-0 right-2 z-30 w-10 h-10 rounded-full bg-amber-400 text-slate-950 border-2 border-white flex items-center justify-center text-base font-black shadow-lg">
              {selectedBlock.sticker || '🏆'}
            </div>
          </div>

          {/* PRAISE TITLE */}
          <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight font-heading max-w-xl mx-auto">
            {selectedBlock.praiseTitle}
          </h2>

          {/* PRAISE CONTENT */}
          <div className="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-white/15 max-w-2xl mx-auto text-left space-y-2 shadow-inner">
            <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider block">
              💬 Lời nhắn từ Giáo viên:
            </span>
            <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium italic">
              "{selectedBlock.praiseContent}"
            </p>
          </div>

          {/* FOOTER INFO */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 max-w-2xl mx-auto gap-2">
            <span>Học sinh: <strong className="text-white font-bold">{currentUserName} ({currentClass})</strong></span>
            <span>Giáo viên đánh giá: <strong className="text-amber-300 font-bold">{resolvedTeacherName}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. CHỨNG NHẬN HOÀN THÀNH TOÀN DIỆN BÀI GIẢNG 5E */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Tổng Kết Tiến Trình Học Tập 5E
              </h3>
              <p className="text-xs text-slate-500">
                {completedStepsCount === 5 
                  ? 'Toàn bộ 5 bước học tập của bài giảng đã được hoàn tất 100%' 
                  : (completedStepsCount > 0 
                      ? `Đã hoàn thành ${completedStepsCount}/5 bước học tập (${Math.round((completedStepsCount / 5) * 100)}%)` 
                      : 'Chưa có bước nào trong bài giảng được hoàn thành')}
              </p>
            </div>
          </div>

          <div className={`hidden sm:flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-black ${
            completedStepsCount === 5 
              ? 'bg-emerald-100 text-emerald-800' 
              : (completedStepsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')
          }`}>
            <Check className="w-4 h-4" />
            <span>{completedStepsCount === 5 ? '100% Hoàn Thành' : `${completedStepsCount}/5 Bước`}</span>
          </div>
        </div>

        {/* 5 STEPS RECAP GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          
          {/* 1. KHỞI ĐỘNG (ENGAGE) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-700">1. Khởi động (Engage)</span>
              {isEngageCompleted ? (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">✓ Đã xem</span>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">Chưa bắt đầu</span>
              )}
            </div>
            <p className="text-xs text-slate-600">Hoàn thành tạo tâm thế hứng thú đầu giờ học.</p>
          </div>

          {/* 2. KHÁM PHÁ (EXPLORE) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-700">2. Khám phá (Explore)</span>
              {typeof exploreAccuracyVal === 'number' ? (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">✓ {exploreAccuracyVal}% Đúng</span>
              ) : isExploreCompleted ? (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">✓ Đã xem</span>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">Chưa bắt đầu</span>
              )}
            </div>
            <p className="text-xs text-slate-600">Xem video tương tác và vượt qua các mốc câu hỏi.</p>
          </div>

          {/* 3. LUYỆN TẬP (ELABORATE) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-teal-700">3. Luyện tập (Elaborate)</span>
              {hasElaborateScore ? (
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">★ {elaborateScoreVal}/10 Điểm</span>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">Chưa bắt đầu</span>
              )}
            </div>
            <p className="text-xs text-slate-600">Thực hành giải bài tập củng cố kiến thức sâu sắc.</p>
          </div>

          {/* 4. VẬN DỤNG (APPLY) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-pink-700">4. Vận dụng (Apply)</span>
              {isApplySubmitted ? (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">✓ Đã nộp báo cáo</span>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">Chưa bắt đầu</span>
              )}
            </div>
            <p className="text-xs text-slate-600">Giải quyết tình huống thực tế và đính kèm sản phẩm.</p>
          </div>

          {/* 5. ĐÁNH GIÁ (ASSESSMENT) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-700">5. Đánh giá (Assessment)</span>
              {hasAssessmentScore ? (
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">★ {assessmentScoreVal}/10 Điểm</span>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">Chưa bắt đầu</span>
              )}
            </div>
            <p className="text-xs text-slate-600">Hoàn thành bài kiểm tra năng lực và tự đánh giá.</p>
          </div>

          {/* TỔNG ĐIỂM TÍCH LŨY */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-800">Tổng điểm tích lũy</span>
              {hasEnoughScoreData ? (
                <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  {calcScore} / 100
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-500 bg-slate-200/80 px-2.5 py-0.5 rounded-full">
                  Chưa đủ dữ liệu để tổng kết
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900 font-medium">
              {hasEnoughScoreData 
                ? (completedStepsCount === 5 
                    ? 'Huy hiệu xuất sắc 5E đã được trao vào tài khoản.' 
                    : `Điểm trung bình các bước có đánh giá (${completedStepsCount}/5 bước).`)
                : 'Chưa có dữ liệu'}
            </p>
          </div>

        </div>

        {/* ACTION BUTTONS BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>In phiếu kết quả</span>
            </button>

            <button
              onClick={onRestartLesson}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Học lại bài này</span>
            </button>
          </div>

          <button
            onClick={onBackToList}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Home className="w-4 h-4" />
            <span>Quay về danh sách bài giảng</span>
          </button>
        </div>

      </div>

    </div>
  );
};
