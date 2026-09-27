import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  FileText,
  Check,
  Zap,
  RefreshCw,
  Plus,
  Trash2,
  Play,
  Eye,
  Info,
  Image as ImageIcon,
  Video,
  Gamepad2,
  Settings,
  ChevronDown,
  ChevronUp,
  Globe,
  Link2,
  ExternalLink,
  AlertCircle,
  Lock,
  RotateCw
} from 'lucide-react';
import { Lesson5EPlan, QuestionItem, FeedbackBlockConfig } from '../../types';
import { SUBJECTS, GRADES, CLASSES_BY_GRADE } from '../../lib/constants';
import { useClassesList } from '../../services/classStorageService';
import { TeacherVideoExploreEditor } from './TeacherVideoExploreEditor';
import { TeacherElaborateEditor } from './TeacherElaborateEditor';
import { TeacherEvaluateEditor } from './TeacherEvaluateEditor';
import { TeacherAssessmentEditor } from './TeacherAssessmentEditor';
import { TeacherFeedbackEditor } from './TeacherFeedbackEditor';
import { getLocalCachedQuestions } from '../../services/questionStorageService';
import { INITIAL_LESSONS } from '../../services/mockData';
import { isGenericTeacherLabel, formatTeacherWithTitle } from './StudentReviewView';

export interface Lesson5EModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lesson: Lesson5EPlan) => void;
  mode?: 'create' | 'edit';
  initialData?: Lesson5EPlan | null;
  initialLesson?: Lesson5EPlan | null;
}

// Bảng ánh xạ viết tắt Môn học chuẩn hóa cho hệ thống
export const SUBJECT_CODE_MAPPING: Record<string, string> = {
  'Tin học': 'TIN',
  'Tin học (tự chọn)': 'TIN',
  'Công nghệ': 'CN',
  'Toán': 'TOAN',
  'Tiếng Việt': 'TV',
  'Tiếng Anh': 'TA',
  'Ngoại ngữ 1 (Tiếng Anh)': 'TA',
  'Khoa học': 'KH',
  'Lịch sử và Địa lý': 'LSDL',
  'Lịch sử và Địa lí': 'LSDL',
  'Lịch sử': 'LS',
  'Địa lý': 'DL',
  'Địa lí': 'DL',
  'Đạo đức': 'DD',
  'Tự nhiên và Xã hội': 'TNXH',
  'Âm nhạc': 'AN',
  'Mỹ thuật': 'MT',
  'Mĩ thuật': 'MT',
  'Giáo dục thể chất': 'GDTC',
  'GDTC': 'GDTC',
  'Hoạt động trải nghiệm': 'HDTN',
  'HĐTN': 'HDTN',
};

/**
 * Lấy ký tự viết tắt Môn học (2-4 ký tự in hoa)
 */
export const getSubjectAbbr = (subj: string): string => {
  if (!subj) return 'MON';
  const trimmed = subj.trim();
  if (SUBJECT_CODE_MAPPING[trimmed]) {
    return SUBJECT_CODE_MAPPING[trimmed];
  }
  const found = Object.entries(SUBJECT_CODE_MAPPING).find(
    ([k]) => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (found) return found[1];

  const noAccent = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return noAccent.slice(0, 4) || 'MON';
};

/**
 * Lấy số khối lớp
 */
export const getGradeNumber = (gradeStr: string): string => {
  if (!gradeStr) return '3';
  const match = gradeStr.match(/\d+/);
  return match ? match[0] : '3';
};

/**
 * Lấy số tiết học (loại bỏ chữ thừa, mặc định là 1)
 */
export const getPeriodNumber = (periodStr: string): string => {
  if (!periodStr) return '1';
  const match = periodStr.match(/\d+/);
  return match ? match[0] : (periodStr.trim() || '1');
};

/**
 * Thu thập tất cả các mã bài giảng đang tồn tại trong hệ thống
 */
export const getAllExistingLessonCodes = (currentLessonId?: string): string[] => {
  const codes: string[] = [];
  try {
    // 1. Quét từ INITIAL_LESSONS
    INITIAL_LESSONS.forEach(item => {
      if (currentLessonId && item.id === currentLessonId) return;
      if ((item as any).code) codes.push(String((item as any).code).toUpperCase());
      if ((item as any).lessonCode) codes.push(String((item as any).lessonCode).toUpperCase());
    });

    // 2. Quét từ các bộ nhớ localStorage
    const storageKeys = [
      'eduplay_5e_lessons',
      'eduplay_lessons',
      'eduplay_assigned_elearning_lessons'
    ];
    for (const key of storageKeys) {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (currentLessonId && (item.id === currentLessonId || item.lessonId === currentLessonId)) {
              return;
            }
            if (item.code) codes.push(String(item.code).toUpperCase());
            if (item.lessonCode) codes.push(String(item.lessonCode).toUpperCase());
          });
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc mã bài giảng hiện có:', err);
  }
  return codes;
};

/**
 * Đếm tổng số bài giảng hiện có của cùng Môn học
 */
export const countExistingLessonsForSubject = (subj: string): number => {
  let count = 0;
  const cleanSubj = subj.toLowerCase().trim();
  try {
    // Đếm từ INITIAL_LESSONS
    INITIAL_LESSONS.forEach(item => {
      if (item.subject && item.subject.toLowerCase().trim() === cleanSubj) {
        count++;
      }
    });

    const storageKeys = ['eduplay_5e_lessons', 'eduplay_lessons', 'eduplay_assigned_elearning_lessons'];
    for (const key of storageKeys) {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item.subject && item.subject.toLowerCase().trim() === cleanSubj) {
              count++;
            }
          });
        }
      }
    }
  } catch (err) {
    // Không làm gián đoạn
  }
  return count;
};

/**
 * Hàm sinh mã bài giảng tự động theo quy tắc: [Môn][Khối]-B[Số thứ tự bài]-T[Tiết học]
 * Đồng thời tự động kiểm tra trùng lặp và tăng số thứ tự cho đến khi mã là duy nhất.
 */
export const generateLessonCode = (
  subj: string,
  gradeStr: string,
  periodStr: string,
  currentLessonId?: string
): string => {
  const subjAbbr = getSubjectAbbr(subj);
  const gradeNum = getGradeNumber(gradeStr);
  const periodNum = getPeriodNumber(periodStr);

  const existingCodes = getAllExistingLessonCodes(currentLessonId);
  const existingSubjCount = countExistingLessonsForSubject(subj);

  // Số thứ tự bắt đầu từ tổng số bài của môn này + 1 (tối thiểu là 1)
  let orderNum = Math.max(1, existingSubjCount + 1);
  let candidate = `${subjAbbr}${gradeNum}-B${orderNum}-T${periodNum}`;

  // Kiểm tra trùng lặp: Nếu trùng mã đã có, tự động tăng số thứ tự bài
  while (existingCodes.includes(candidate.toUpperCase())) {
    orderNum++;
    candidate = `${subjAbbr}${gradeNum}-B${orderNum}-T${periodNum}`;
  }

  return candidate;
};

const getDefaultFeedbackBlocks = (teacherName: string = 'Cô Trần Thị Diễm Hương'): FeedbackBlockConfig[] => [
  {
    id: 'block-1',
    levelTitle: 'HOÀN THÀNH XUẤT SẮC 🏆',
    useLaurelWreath: true,
    laurelWreathUrl: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop',
    sticker: '🏆',
    praiseTitle: 'TUYỆT VỜI! HOÀN THÀNH XUẤT SẮC 🌟',
    praiseContent: 'Thầy cô rất tự hào vì sự tập trung, tư duy sáng tạo và kết quả bài học xuất sắc của em. Hãy tiếp tục phát huy phong độ tuyệt vời này nhé!',
    teacherName: teacherName
  },
  {
    id: 'block-2',
    levelTitle: 'ĐẠT YÊU CẦU ✅',
    useLaurelWreath: false,
    laurelWreathUrl: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
    backgroundImageUrl: '',
    sticker: '👍',
    praiseTitle: 'LÀM TỐT LẮM! ĐÃ ĐẠT YÊU CẦU BÀI HỌC',
    praiseContent: 'Em đã nắm vững kiến thức cốt lõi và hoàn thành tốt các nhiệm vụ học tập được giao.',
    teacherName: teacherName
  },
  {
    id: 'block-3',
    levelTitle: 'CẦN CỐ GẮNG 💪',
    useLaurelWreath: false,
    laurelWreathUrl: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
    backgroundImageUrl: '',
    sticker: '💪',
    praiseTitle: 'CỐ GẮNG HƠN NỮA NHÉ EM!',
    praiseContent: 'Em đã có nhiều nỗ lực. Hãy ôn tập kỹ hơn phần lý thuyết và thực hành để đạt kết quả cao hơn ở các bài học tới.',
    teacherName: teacherName
  }
];

const DEFAULT_BLOCKS: FeedbackBlockConfig[] = getDefaultFeedbackBlocks('Cô Trần Thị Diễm Hương');

const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
  }
  return null;
};

const isImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('data:image/')) return true;
  return /\.(jpeg|jpg|gif|png|svg|webp|avif)(\?.*)?$/i.test(trimmed);
};

const isDirectVideoUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(trimmed);
};

const buildYouTubePreviewUrl = (
  rawUrl: string,
  autoplay: boolean,
  showControls: boolean
): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  if (!match || !match[1]) return null;
  const videoId = match[1];
  const params = new URLSearchParams();
  params.set('rel', '0');
  params.set('modestbranding', '1');
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  } else {
    params.set('autoplay', '0');
  }
  if (!showControls) {
    params.set('controls', '0');
  } else {
    params.set('controls', '1');
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

const extractIframeUrl = (raw: string): string => {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  const srcMatch = trimmed.match(/<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (srcMatch && srcMatch[1]) {
    return srcMatch[1].trim();
  }
  return trimmed;
};

const isValidHttpUrl = (urlStr: string): boolean => {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const url = new URL(urlStr.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const Lesson5EModal: React.FC<Lesson5EModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode = 'create',
  initialData,
  initialLesson
}) => {
  const { getClassesForGrade } = useClassesList();
  const targetLesson = initialData || initialLesson || null;
  const isEditMode = mode === 'edit' || !!targetLesson;

  const getAvailableClassesForGrade = (currentGrade: string): string[] => {
    const list = getClassesForGrade(currentGrade);
    return list.map(c => c.name);
  };

  // Extract initial / pre-filled values
  const getInitialValues = () => {
    if (isEditMode && targetLesson) {
      const lessonCodeVal =
        (targetLesson as any).code ||
        (targetLesson as any).lessonCode ||
        generateLessonCode(
          targetLesson.subject || 'Tin học',
          targetLesson.grade || 'Khối 3',
          (targetLesson as any).period || '1',
          targetLesson.id
        );
      
      const defaultClasses = getAvailableClassesForGrade(targetLesson.grade || 'Khối 3');
      const classesVal =
        (targetLesson as any).selectedClasses && (targetLesson as any).selectedClasses.length > 0
          ? (targetLesson as any).selectedClasses
          : defaultClasses;

      const objContentVal =
        targetLesson.objectivesContent ||
        (targetLesson as any).objectivesContent ||
        (targetLesson.id === 'lesson-cn-3-01'
          ? '1. Kiến thức: Học sinh nhận biết và phân biệt rõ sự khác biệt giữa đối tượng tự nhiên và sản phẩm công nghệ do con người sáng tạo ra.\n2. Năng lực: Rèn luyện năng lực quan sát, phân loại đồ vật xung quanh và liên hệ vận dụng vào đời sống hàng ngày.\n3. Phẩm chất: Yêu quý thiên nhiên, có ý thức giữ gìn, bảo quản và sử dụng đúng cách các sản phẩm công nghệ trong gia đình, trường học.'
          : targetLesson.id === 'lesson-th-3-02'
          ? '1. Kiến thức: Học sinh nhận biết được vai trò của thông tin trong đời sống và mối quan hệ giữa thông tin và quyết định.\n2. Năng lực: Biết tiếp nhận thông tin, xử lý và ra quyết định phù hợp trong các tình huống thường gặp.\n3. Phẩm chất: Rèn luyện tính cẩn thận, ý thức bảo vệ an toàn thông tin và chủ động trong học tập.'
          : '1. Kiến thức: Nắm vững kiến thức trọng tâm của bài học.\n2. Năng lực: Vận dụng giải quyết bài tập và tình huống thực tiễn.\n3. Phẩm chất: Chủ động, tích cực và hợp tác trong học tập.');

      const defaultQuestionsElaborate: QuestionItem[] =
        targetLesson.id === 'lesson-cn-3-01'
          ? [
              {
                id: 'q-el-cn-1',
                code: 'CH-CN3-01',
                subject: 'Công nghệ',
                grade: 'Khối 3',
                level: 'nhan_biet',
                type: 'multiple_choice',
                content: 'Vật nào sau đây là đối tượng tự nhiên?',
                options: [
                  'Cây bàng trong sân trường',
                  'Cái bàn học bằng gỗ',
                  'Chiếc quạt trần',
                  'Cuốn sách giáo khoa'
                ],
                correctAnswer: 'A',
                explanation: 'Cây bàng sinh trưởng tự nhiên trong thiên nhiên, không phải do con người chế tạo ra.'
              },
              {
                id: 'q-el-cn-2',
                code: 'CH-CN3-02',
                subject: 'Công nghệ',
                grade: 'Khối 3',
                level: 'thong_hieu',
                type: 'multiple_choice',
                content: 'Sản phẩm công nghệ nào giúp con người di chuyển nhanh hơn trên quãng đường dài?',
                options: [
                  'Xe máy, ô tô, máy bay',
                  'Chiếc đồng hồ đeo tay',
                  'Cái bút mực',
                  'Chiếc bảng viết'
                ],
                correctAnswer: 'A',
                explanation: 'Xe máy, ô tô, máy bay là phương tiện giao thông giúp con người di chuyển nhanh chóng.'
              }
            ]
          : [
              {
                id: 'q-el-1',
                code: 'CH-EL-01',
                subject: 'Tin học',
                grade: 'Khối 3',
                level: 'nhan_biet',
                type: 'multiple_choice',
                content: 'Câu hỏi luyện tập 1: Đâu là quyết định hợp lý khi nhận được thông tin dự báo thời tiết có mưa lớn?',
                options: [
                  'Mang theo áo mưa hoặc ô (dù)',
                  'Đi chơi sân trường không cần che chắn',
                  'Mặc quần áo mỏng nhẹ',
                  'Không cần quan tâm'
                ],
                correctAnswer: 'A',
                explanation: 'Mang theo áo mưa giúp tránh bị ướt khi trời mưa lớn.'
              }
            ];

      return {
        title: targetLesson.title || '',
        subject: targetLesson.subject || 'Tin học',
        grade: targetLesson.grade || 'Khối 3',
        lessonCode: lessonCodeVal,
        period: (targetLesson as any).period || '1',
        status: ((targetLesson as any).status as 'draft' | 'published') || 'published',
        selectedClasses: classesVal,
        shareWithColleagues: (targetLesson as any).shareWithColleagues ?? true,

        // Engage
        engageWarmupTab: ((targetLesson.stepEngage as any)?.warmupType as 'video' | 'game') || 'video',
        engageVideoLink:
          (targetLesson.stepEngage as any)?.videoLink ||
          (targetLesson.id === 'lesson-cn-3-01'
            ? 'https://www.youtube.com/watch?v=kYJvP4vB8aM'
            : 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        engageAutoplay: (targetLesson.stepEngage as any)?.videoSettings?.autoplay ?? true,
        engageRequireFullWatch: (targetLesson.stepEngage as any)?.videoSettings?.requireFullWatch ?? false,
        engageShowControls: (targetLesson.stepEngage as any)?.videoSettings?.showControls ?? true,
        engageGameSource: (targetLesson.stepEngage as any)?.gameSource || 'auto',
        engageGameUrl: (targetLesson.stepEngage as any)?.gameUrl || '',
        engageGuidance:
          (targetLesson.stepEngage as any)?.guidanceContent ||
          (targetLesson.stepEngage?.studentActivities &&
          targetLesson.stepEngage?.objectives &&
          targetLesson.stepEngage.studentActivities !== targetLesson.stepEngage.objectives
            ? `${targetLesson.stepEngage.objectives}\n\n${targetLesson.stepEngage.studentActivities}`
            : targetLesson.stepEngage?.studentActivities || targetLesson.stepEngage?.objectives || ''),
        engageObj: targetLesson.stepEngage?.objectives || '',
        engageTeacher: targetLesson.stepEngage?.teacherActivities || '',
        engageStudent: targetLesson.stepEngage?.studentActivities || '',
        engageMat: targetLesson.stepEngage?.materials || '',

        // Intro
        introContent:
          (targetLesson as any).introContent ||
          (targetLesson.stepEngage as any)?.videoLink ||
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        isIntroEnabled: (targetLesson as any).isIntroEnabled ?? true,

        // Objectives
        objectivesContent: objContentVal,
        isObjectivesEnabled: (targetLesson as any).isObjectivesEnabled ?? true,

        // Explore
        exploreObj: targetLesson.stepExplore?.objectives || '',
        exploreTeacher: targetLesson.stepExplore?.teacherActivities || '',
        exploreStudent: targetLesson.stepExplore?.studentActivities || '',
        exploreMat: targetLesson.stepExplore?.materials || '',
        exploreVideoUrl:
          (targetLesson.stepExplore as any)?.videoUrl ||
          'https://www.youtube.com/watch?v=UF8o89k1g8g',
        exploreCheckpoints:
          (targetLesson.stepExplore as any)?.checkpoints || [],

        // Elaborate
        elaborateObj: targetLesson.stepElaborate?.objectives || '',
        elaborateTransitionGuidance:
          (targetLesson.stepElaborate as any)?.transitionGuidance ||
          'Vừa rồi các em đã tìm hiểu qua video bài giảng và nắm vững các khái niệm trọng tâm. Bây giờ chúng ta cùng bước vào phần Luyện tập để củng cố và vận dụng kiến thức nhé!',
        elaborateMat: targetLesson.stepElaborate?.materials || '',
        elaborateQuestions:
          (targetLesson.stepElaborate as any)?.questions && (targetLesson.stepElaborate as any).questions.length > 0
            ? (targetLesson.stepElaborate as any).questions
            : defaultQuestionsElaborate,

        // Evaluate
        evaluateObj: targetLesson.stepEvaluate?.objectives || '',
        evaluateTeacher: targetLesson.stepEvaluate?.teacherActivities || '',
        evaluateStudent: targetLesson.stepEvaluate?.studentActivities || '',
        evaluateMat: targetLesson.stepEvaluate?.materials || '',
        evaluateQuestions: (targetLesson.stepEvaluate as any)?.questions || [],

        // Assessment
        assessmentNotes:
          (targetLesson as any).assessmentNotes || 'Rubric đánh giá năng lực học sinh qua sản phẩm thực hành.',
        assessmentQuestions: (targetLesson as any).assessmentQuestions || [],
        assessmentCriteria:
          (targetLesson as any).assessmentCriteria && (targetLesson as any).assessmentCriteria.length > 0
            ? (targetLesson as any).assessmentCriteria
            : [
                'Em đã hiểu và ghi nhớ đầy đủ nội dung cốt lõi của bài học',
                'Em biết cách vận dụng kiến thức vào thực tiễn và giải quyết bài tập',
                'Em tích cực tham gia thảo luận và hoàn thành tốt nhiệm vụ được giao'
              ],

        // Feedback
        feedbackNotes:
          (targetLesson as any).feedbackNotes || 'Ý kiến đóng góp từ tổ chuyên môn và giáo viên bộ môn.',
        feedbackBlocks: (() => {
          const effectiveAuthor = targetLesson?.authorName && !isGenericTeacherLabel(targetLesson.authorName)
            ? formatTeacherWithTitle(targetLesson.authorName)
            : 'Cô Trần Thị Diễm Hương';
          const rawBlocks = (targetLesson as any).feedbackConfig?.blocks && (targetLesson as any).feedbackConfig.blocks.length > 0
            ? (targetLesson as any).feedbackConfig.blocks
            : getDefaultFeedbackBlocks(effectiveAuthor);
          return rawBlocks.map((b: any) => ({
            ...b,
            teacherName: !b.teacherName || isGenericTeacherLabel(b.teacherName) ? effectiveAuthor : b.teacherName
          }));
        })(),

        // In edit mode, all sections are considered completed and saved
        savedSections: {
          info: true,
          engage: true,
          intro: true,
          objectives: true,
          explore: true,
          elaborate: true,
          evaluate: true,
          assessment: true,
          feedback: true
        }
      };
    }

    // Default values for Create Mode
    const defaultAvailable = getAvailableClassesForGrade('Khối 3');
    const autoGeneratedCode = generateLessonCode('Tin học', 'Khối 3', '1');
    return {
      title: '',
      subject: 'Tin học',
      grade: 'Khối 3',
      lessonCode: autoGeneratedCode,
      period: '1',
      status: 'draft' as const,
      selectedClasses: defaultAvailable,
      shareWithColleagues: true,

      engageWarmupTab: 'video' as const,
      engageVideoLink: '',
      engageAutoplay: true,
      engageRequireFullWatch: false,
      engageShowControls: true,
      engageGameSource: 'auto',
      engageGameUrl: '',
      engageGuidance: '',
      engageObj: '',
      engageTeacher: '',
      engageStudent: '',
      engageMat: '',

      introContent: '',
      isIntroEnabled: true,

      objectivesContent: '1. Kiến thức:...\n2. Năng lực:...\n3. Phẩm chất:...',
      isObjectivesEnabled: true,

      exploreObj: '',
      exploreTeacher: '',
      exploreStudent: '',
      exploreMat: '',
      exploreVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      exploreCheckpoints: [],

      elaborateObj: '',
      elaborateTransitionGuidance:
        'Vừa rồi các em đã tìm hiểu qua video bài giảng và nắm vững các khái niệm trọng tâm. Bây giờ chúng ta cùng bước vào phần Luyện tập để củng cố và vận dụng kiến thức nhé!',
      elaborateMat: '',
      elaborateQuestions: [],

      evaluateObj: '',
      evaluateTeacher: '',
      evaluateStudent: '',
      evaluateMat: '',
      evaluateQuestions: [],

      assessmentNotes: 'Rubric đánh giá năng lực học sinh qua sản phẩm thực hành.',
      assessmentQuestions: [],
      assessmentCriteria: [
        'Em đã hiểu và ghi nhớ đầy đủ nội dung cốt lõi của bài học',
        'Em biết cách vận dụng kiến thức vào thực tiễn và giải quyết bài tập',
        'Em tích cực tham gia thảo luận và hoàn thành tốt nhiệm vụ được giao'
      ],

      feedbackNotes: 'Ý kiến đóng góp từ tổ chuyên môn và giáo viên bộ môn.',
      feedbackBlocks: getDefaultFeedbackBlocks(
        targetLesson?.authorName && !isGenericTeacherLabel(targetLesson.authorName)
          ? formatTeacherWithTitle(targetLesson.authorName)
          : 'Cô Trần Thị Diễm Hương'
      ),

      savedSections: {
        info: isEditMode && !!targetLesson?.title,
        engage: false,
        intro: false,
        objectives: false,
        explore: false,
        elaborate: false,
        evaluate: false,
        assessment: false,
        feedback: false
      }
    };
  };

  const initialValues = getInitialValues();

  const [activeTab, setActiveTab] = useState<
    'info' | 'engage' | 'intro' | 'objectives' | 'explore' | 'elaborate' | 'evaluate' | 'assessment' | 'feedback'
  >('info');

  const [savedSections, setSavedSections] = useState<Record<string, boolean>>(initialValues.savedSections);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Form State variables
  const [title, setTitle] = useState(initialValues.title);
  const [titleError, setTitleError] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState(initialValues.subject);
  const [grade, setGrade] = useState(initialValues.grade);
  const [lessonCode, setLessonCode] = useState(initialValues.lessonCode);
  const [period, setPeriod] = useState(initialValues.period);
  const [status, setStatus] = useState<'draft' | 'published'>(initialValues.status);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(initialValues.selectedClasses);
  const [shareWithColleagues, setShareWithColleagues] = useState(initialValues.shareWithColleagues);

  // 5E content states
  const [warmupTab, setWarmupTab] = useState<'video' | 'game'>(initialValues.engageWarmupTab || 'video');
  const [engageGuidance, setEngageGuidance] = useState(initialValues.engageGuidance);
  const [engageObj, setEngageObj] = useState(initialValues.engageObj);
  const [engageTeacher, setEngageTeacher] = useState(initialValues.engageTeacher);
  const [engageStudent, setEngageStudent] = useState(initialValues.engageStudent);
  const [engageMat, setEngageMat] = useState(initialValues.engageMat);
  const [engageVideoLink, setEngageVideoLink] = useState(initialValues.engageVideoLink);
  const [showVideoSettings, setShowVideoSettings] = useState(true);
  const [engageAutoplay, setEngageAutoplay] = useState(initialValues.engageAutoplay ?? true);
  const [engageRequireFullWatch, setEngageRequireFullWatch] = useState(initialValues.engageRequireFullWatch ?? false);
  const [engageShowControls, setEngageShowControls] = useState(initialValues.engageShowControls ?? true);
  const [engageGameSource, setEngageGameSource] = useState(initialValues.engageGameSource || 'auto');
  const [engageGameUrl, setEngageGameUrl] = useState(initialValues.engageGameUrl || '');
  const [gameIframeError, setGameIframeError] = useState(false);

  const [introContent, setIntroContent] = useState(initialValues.introContent);
  const [isIntroEnabled, setIsIntroEnabled] = useState(initialValues.isIntroEnabled);
  const [objectivesContent, setObjectivesContent] = useState(initialValues.objectivesContent);
  const [isObjectivesEnabled, setIsObjectivesEnabled] = useState(initialValues.isObjectivesEnabled);

  const [exploreObj, setExploreObj] = useState(initialValues.exploreObj);
  const [exploreTeacher, setExploreTeacher] = useState(initialValues.exploreTeacher);
  const [exploreStudent, setExploreStudent] = useState(initialValues.exploreStudent);
  const [exploreMat, setExploreMat] = useState(initialValues.exploreMat);
  const [exploreVideoUrl, setExploreVideoUrl] = useState(initialValues.exploreVideoUrl);
  const [exploreCheckpoints, setExploreCheckpoints] = useState<any[]>(initialValues.exploreCheckpoints);

  const [elaborateObj, setElaborateObj] = useState(initialValues.elaborateObj);
  const [elaborateTransitionGuidance, setElaborateTransitionGuidance] = useState(initialValues.elaborateTransitionGuidance);
  const [elaborateMat, setElaborateMat] = useState(initialValues.elaborateMat);
  const [elaborateQuestions, setElaborateQuestions] = useState<QuestionItem[]>(initialValues.elaborateQuestions);
  const [questionsBank] = useState(() => getLocalCachedQuestions());

  const [evaluateObj, setEvaluateObj] = useState(initialValues.evaluateObj);
  const [evaluateTeacher, setEvaluateTeacher] = useState(initialValues.evaluateTeacher);
  const [evaluateStudent, setEvaluateStudent] = useState(initialValues.evaluateStudent);
  const [evaluateMat, setEvaluateMat] = useState(initialValues.evaluateMat);
  const [evaluateQuestions, setEvaluateQuestions] = useState<QuestionItem[]>(initialValues.evaluateQuestions);

  const [assessmentNotes, setAssessmentNotes] = useState(initialValues.assessmentNotes);
  const [assessmentQuestions, setAssessmentQuestions] = useState<QuestionItem[]>(initialValues.assessmentQuestions);
  const [assessmentCriteria, setAssessmentCriteria] = useState<string[]>(initialValues.assessmentCriteria);
  const [feedbackNotes, setFeedbackNotes] = useState(initialValues.feedbackNotes);
  const [feedbackBlocks, setFeedbackBlocks] = useState<any[]>(initialValues.feedbackBlocks);

  // Synchronize when targetLesson or mode changes
  useEffect(() => {
    if (isOpen) {
      const vals = getInitialValues();
      setTitle(vals.title);
      setSubject(vals.subject);
      setGrade(vals.grade);
      setLessonCode(vals.lessonCode);
      setPeriod(vals.period);
      setStatus(vals.status);
      setSelectedClasses(vals.selectedClasses);
      setShareWithColleagues(vals.shareWithColleagues);

      setEngageVideoLink(vals.engageVideoLink);
      setEngageObj(vals.engageObj);
      setEngageTeacher(vals.engageTeacher);
      setEngageStudent(vals.engageStudent);
      setEngageMat(vals.engageMat);

      setIntroContent(vals.introContent);
      setIsIntroEnabled(vals.isIntroEnabled);
      setObjectivesContent(vals.objectivesContent);
      setIsObjectivesEnabled(vals.isObjectivesEnabled);

      setExploreObj(vals.exploreObj);
      setExploreTeacher(vals.exploreTeacher);
      setExploreStudent(vals.exploreStudent);
      setExploreMat(vals.exploreMat);
      setExploreVideoUrl(vals.exploreVideoUrl);
      setExploreCheckpoints(vals.exploreCheckpoints);

      setElaborateObj(vals.elaborateObj);
      setElaborateTransitionGuidance(vals.elaborateTransitionGuidance);
      setElaborateMat(vals.elaborateMat);
      setElaborateQuestions(vals.elaborateQuestions);

      setEvaluateObj(vals.evaluateObj);
      setEvaluateTeacher(vals.evaluateTeacher);
      setEvaluateStudent(vals.evaluateStudent);
      setEvaluateMat(vals.evaluateMat);
      setEvaluateQuestions(vals.evaluateQuestions);

      setAssessmentNotes(vals.assessmentNotes);
      setAssessmentQuestions(vals.assessmentQuestions);
      setAssessmentCriteria(vals.assessmentCriteria);
      setFeedbackNotes(vals.feedbackNotes);
      setFeedbackBlocks(vals.feedbackBlocks);

      setSavedSections(vals.savedSections);
      setActiveTab('info');
    }
  }, [isOpen, mode, targetLesson?.id]);

  if (!isOpen) return null;

  const handleSubjectChange = (newSubject: string) => {
    setSubject(newSubject);
    if (!isEditMode) {
      const newCode = generateLessonCode(newSubject, grade, period, targetLesson?.id);
      setLessonCode(newCode);
    }
  };

  const handleGradeChange = (newGrade: string) => {
    setGrade(newGrade);
    const newAvailable = getAvailableClassesForGrade(newGrade);
    setSelectedClasses(newAvailable);
    if (!isEditMode) {
      const newCode = generateLessonCode(subject, newGrade, period, targetLesson?.id);
      setLessonCode(newCode);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (!isEditMode) {
      const newCode = generateLessonCode(subject, grade, newPeriod, targetLesson?.id);
      setLessonCode(newCode);
    }
  };

  const handleRegenerateCode = () => {
    const newCode = generateLessonCode(subject, grade, period, targetLesson?.id);
    setLessonCode(newCode);
  };

  const handleSaveCurrentSection = () => {
    if (activeTab === 'info') {
      if (!title.trim()) {
        setTitleError(true);
        if (titleInputRef.current) {
          titleInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          titleInputRef.current.focus();
        }
        showToast('Vui lòng nhập tên bài giảng trước khi lưu!', 'error');
        return;
      }
      setTitleError(false);
    }
    setSavedSections(prev => ({ ...prev, [activeTab]: true }));
    
    const tabLabels: Record<string, string> = {
      info: 'Thông tin chung',
      engage: 'Khởi động',
      intro: 'Giới thiệu bài',
      objectives: 'Mục tiêu',
      explore: 'Khám phá',
      elaborate: 'Luyện tập',
      evaluate: 'Vận dụng',
      assessment: 'Đánh giá',
      feedback: 'Nhận xét'
    };
    showToast(`Đã lưu thành công dữ liệu mục ${tabLabels[activeTab]}!`, 'success');
  };

  const completedCount = Object.values(savedSections).filter(Boolean).length;
  const totalSections = 9;
  const isAllCompleted = isEditMode || completedCount >= 7;

  const handleCompleteAndSave = () => {
    if (!title.trim()) {
      setActiveTab('info');
      setTitleError(true);
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          titleInputRef.current.focus();
        }
      }, 50);
      showToast('Vui lòng nhập tên bài giảng trước khi hoàn tất!', 'error');
      return;
    }

    const savedLesson: Lesson5EPlan = {
      id: isEditMode && targetLesson?.id ? targetLesson.id : `les-${Date.now()}`,
      title: title.trim() || (isEditMode ? targetLesson?.title || 'Bài Giảng 5E' : 'Bài Giảng 5E Mới'),
      subject: subject,
      grade: grade,
      duration: targetLesson?.duration || '45 phút',
      topic: targetLesson?.topic || title.trim() || 'Bài học tương tác chuẩn 5E',
      authorName: targetLesson?.authorName || 'ThS. Nguyễn Văn Hoài',
      createdAt: targetLesson?.createdAt || new Date().toLocaleDateString('vi-VN'),
      objectivesContent: objectivesContent,
      stepEngage: {
        title: targetLesson?.stepEngage?.title || 'Bước 1: Khởi động (Engage)',
        subtitle: targetLesson?.stepEngage?.subtitle || 'Thu hút chú ý & kích thích tư duy',
        objectives: engageGuidance || engageObj || 'Học sinh hình thành ấn tượng ban đầu.',
        teacherActivities: '',
        studentActivities: engageGuidance || engageStudent || 'Em hãy tham gia hoạt động khởi động theo yêu cầu.',
        guidanceContent: engageGuidance,
        materials: '',
        videoLink: engageVideoLink,
        warmupType: warmupTab,
        videoSettings: {
          autoplay: engageAutoplay,
          requireFullWatch: engageRequireFullWatch,
          showControls: engageShowControls
        },
        gameSource: engageGameSource,
        gameUrl: engageGameUrl
      } as any,
      stepExplore: {
        title: targetLesson?.stepExplore?.title || 'Bước 2: Khám phá & Hình thành kiến thức (Explore & Explain)',
        subtitle: targetLesson?.stepExplore?.subtitle || 'Khám phá quy luật & xây dựng kiến thức',
        objectives: exploreObj || 'Nắm vững lý thuyết cốt lõi.',
        teacherActivities: exploreTeacher || 'Hướng dẫn học sinh thảo luận.',
        studentActivities: exploreStudent || 'Làm phiếu học tập.',
        materials: exploreMat || 'Phiếu học tập số 1.',
        videoUrl: exploreVideoUrl,
        checkpoints: exploreCheckpoints
      } as any,
      stepElaborate: {
        title: targetLesson?.stepElaborate?.title || 'Bước 3: Luyện tập (Elaborate)',
        subtitle: targetLesson?.stepElaborate?.subtitle || 'Củng cố & mở rộng kỹ năng',
        objectives: elaborateObj || 'Rèn luyện kỹ năng giải bài tập.',
        transitionGuidance: elaborateTransitionGuidance,
        teacherActivities: targetLesson?.stepElaborate?.teacherActivities || '',
        studentActivities: targetLesson?.stepElaborate?.studentActivities || '',
        materials: elaborateMat || 'Ngân hàng câu hỏi.',
        questions: elaborateQuestions
      } as any,
      stepEvaluate: {
        title: targetLesson?.stepEvaluate?.title || 'Bước 4: Vận dụng (Evaluate)',
        subtitle: targetLesson?.stepEvaluate?.subtitle || 'Đánh giá năng lực & bài tập thực tế',
        objectives: evaluateObj || 'Đánh giá mức độ tiếp thu.',
        teacherActivities: evaluateTeacher || 'Tổ chức kiểm tra ngắn.',
        studentActivities: evaluateStudent || 'Làm bài kiểm tra.',
        materials: evaluateMat || 'Thang điểm Rubric.',
        questions: evaluateQuestions
      } as any,
      ...({
        code: lessonCode,
        period: period,
        status: status,
        selectedClasses,
        shareWithColleagues,
        introContent,
        isIntroEnabled,
        objectivesContent,
        isObjectivesEnabled,
        assessmentNotes,
        assessmentQuestions,
        assessmentCriteria,
        feedbackNotes,
        feedbackConfig: {
          blocks: feedbackBlocks
        }
      } as any)
    };

    try {
      onSave(savedLesson);
      onClose();
    } catch (e) {
      showToast('Lưu bài giảng thất bại, vui lòng kiểm tra lại!', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isEditMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">
                {isEditMode ? 'CHỈNH SỬA BÀI GIẢNG TRỰC TUYẾN (MODULAR 5E)' : 'THÊM MỚI BÀI GIẢNG TRỰC TUYẾN (MODULAR 5E)'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEditMode
                  ? 'Cập nhật nội dung các mục bài giảng theo cấu trúc chuẩn 5E & tương tác thông minh'
                  : 'Soạn riêng từng mục hoặc dán nội dung chủ động theo cấu trúc chuẩn'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer border border-slate-700"
              title="Đóng / Hủy bỏ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TABS BAR (Pill buttons) */}
        <div className="bg-slate-800/80 px-6 py-3 border-b border-slate-700 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'info', label: '📌 Thông tin chung' },
            { id: 'engage', label: '1️⃣ Khởi động' },
            { id: 'intro', label: '🎯 Giới thiệu bài' },
            { id: 'objectives', label: '2️⃣ Mục tiêu' },
            { id: 'explore', label: '3️⃣ Khám phá' },
            { id: 'elaborate', label: '4️⃣ Luyện tập' },
            { id: 'evaluate', label: '5️⃣ Vận dụng' },
            { id: 'assessment', label: '6️⃣ Đánh giá' },
            { id: 'feedback', label: '📝 Nhận xét' }
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            const isSaved = savedSections[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : isSaved
                    ? 'bg-slate-700 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                {isSaved && !isSelected && <Check className="w-3 h-3 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-900 text-slate-200">
          
          {/* TAB 1: THÔNG TIN CHUNG */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-blue-400 uppercase tracking-wide">
                    CẤU HÌNH THÔNG TIN CHUNG BÀI HỌC
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Nhập tiêu đề, môn học, khối lớp, chủ đề và thời lượng bài giảng trực tuyến.
                  </p>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  TÊN BÀI GIẢNG <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError && e.target.value.trim().length > 0) {
                      setTitleError(false);
                    }
                  }}
                  placeholder="Ví dụ: Bài 1: Tự nhiên và công nghệ (Môn Công nghệ lớp 3)..."
                  className={`w-full px-4 py-3 bg-slate-800 border transition-all rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none ${
                    titleError
                      ? 'border-rose-500 ring-2 ring-rose-500/30'
                      : 'border-slate-700 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {titleError && (
                  <p className="text-xs text-rose-400 font-semibold flex items-center gap-1.5 mt-1.5 animate-in fade-in duration-150">
                    <span>⚠️ Vui lòng nhập tên bài giảng trước khi lưu.</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="sm:col-span-1 space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase">MÔN HỌC</label>
                  <select
                    value={subject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-1 space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase">KHỐI LỚP HỌC</label>
                  <select
                    value={grade}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-400 uppercase">
                      MÃ BÀI GIẢNG <span className="text-[10px] text-blue-400 font-normal lowercase">(tự động)</span>
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={lessonCode}
                      placeholder="Tự động sinh mã..."
                      className="w-full px-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-400 focus:outline-none select-all cursor-default pr-24 shadow-inner"
                      title="Mã bài giảng được hệ thống tự động sinh và kiểm tra trùng lặp"
                    />
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      className="absolute right-1.5 px-2.5 py-1 bg-slate-700/80 hover:bg-slate-700 active:bg-slate-600 text-blue-300 hover:text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all border border-slate-600/50 shadow-sm cursor-pointer"
                      title="Tạo lại mã bài giảng mới tự động"
                    >
                      <RefreshCw className="w-3 h-3 text-blue-400 animate-spin-hover" />
                      <span>Tạo lại</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>✨ Mã tự động ghép: [Môn][Khối]-B[Số thứ tự]-T[Tiết]</span>
                  </p>
                </div>

                <div className="sm:col-span-1 space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase">TIẾT HỌC</label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: KHỞI ĐỘNG (ENGAGE) */}
          {activeTab === 'engage' && (() => {
            const rawYoutube = engageVideoLink.trim();
            const youtubePreviewUrl = buildYouTubePreviewUrl(rawYoutube, engageAutoplay, engageShowControls);
            const isInvalidYoutube = rawYoutube !== '' && !youtubePreviewUrl;

            // Game / Quiz preview logic
            const rawGameUrl = engageGameUrl.trim();
            const cleanGameUrl = extractIframeUrl(rawGameUrl);
            const hasValidGameHttp = isValidHttpUrl(cleanGameUrl);
            const isInvalidGameUrl = rawGameUrl !== '' && !hasValidGameHttp;

            // Detect platform for Game
            const detectedPlatform = (() => {
              if (engageGameSource && engageGameSource !== 'auto') {
                if (engageGameSource === 'wordwall') return 'Wordwall';
                if (engageGameSource === 'quizizz') return 'Quizizz';
                if (engageGameSource === 'kahoot') return 'Kahoot!';
                return 'Tùy chỉnh';
              }
              const low = cleanGameUrl.toLowerCase();
              if (low.includes('wordwall.net')) return 'Wordwall';
              if (low.includes('quizizz.com')) return 'Quizizz';
              if (low.includes('kahoot.it') || low.includes('kahoot.com')) return 'Kahoot!';
              return cleanGameUrl ? 'Iframe Web' : '';
            })();

            return (
              <div className="space-y-6">
                {/* TIÊU ĐỀ MỤC KHỞI ĐỘNG */}
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-blue-400 uppercase tracking-wide">
                      CẤU HÌNH MỤC KHỞI ĐỘNG (ENGAGE)
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Soạn video và trò chơi khởi động để kích thích tư duy, tạo hứng thú cho học sinh trước khi vào bài học.
                    </p>
                  </div>
                </div>

                {/* 2 SUB-TABS: TAB 1: VIDEO KHỞI ĐỘNG & TAB 2: TRÒ CHƠI / QUIZ */}
                <div className="flex items-center gap-8 border-b border-slate-700/80 pb-0">
                  <button
                    type="button"
                    onClick={() => setWarmupTab('video')}
                    className={`pb-3.5 px-1 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all relative cursor-pointer ${
                      warmupTab === 'video'
                        ? 'text-blue-400 font-extrabold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>TAB 1: VIDEO KHỞI ĐỘNG</span>
                    {warmupTab === 'video' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setWarmupTab('game')}
                    className={`pb-3.5 px-1 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all relative cursor-pointer ${
                      warmupTab === 'game'
                        ? 'text-blue-400 font-extrabold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>TAB 2: TRÒ CHƠI / QUIZ</span>
                    {warmupTab === 'game' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                </div>

                {/* ================= CONTENT TAB 1: VIDEO KHỞI ĐỘNG ================= */}
                {warmupTab === 'video' && (
                  <div className="space-y-5">
                    {/* Ô nhập LINK VIDEO KHỞI ĐỘNG (YOUTUBE) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                          <Video className="w-4 h-4 text-blue-400" />
                          LINK VIDEO KHỞI ĐỘNG (YOUTUBE)
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Hỗ trợ YouTube standard, watch?v=, youtu.be, shorts
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={engageVideoLink}
                          onChange={(e) => setEngageVideoLink(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full pl-4 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-colors"
                        />
                        {engageVideoLink && (
                          <button
                            type="button"
                            onClick={() => setEngageVideoLink('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                            title="Xóa link"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* KHUNG XEM TRƯỚC VIDEO (Chỉ hiện khi link không trống) */}
                    {rawYoutube !== '' && (
                      <>
                        {isInvalidYoutube ? (
                          /* Thông báo khi link không hợp lệ */
                          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium animate-in fade-in duration-150">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Link không hợp lệ, vui lòng kiểm tra lại đường dẫn YouTube.</span>
                          </div>
                        ) : (
                          /* Khung nhúng YouTube hợp lệ */
                          <div className="rounded-2xl border border-blue-500/30 bg-slate-900/90 overflow-hidden shadow-lg animate-in fade-in duration-200">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/70 border-b border-blue-500/20 text-xs font-bold text-blue-300">
                              <span className="flex items-center gap-2">
                                <Play className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
                                XEM TRƯỚC VIDEO
                              </span>
                              <div className="flex items-center gap-2 text-[11px]">
                                {engageAutoplay && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Tự động phát
                                  </span>
                                )}
                                {engageRequireFullWatch && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Bắt buộc xem hết
                                  </span>
                                )}
                                <span className="text-emerald-400 font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Link YouTube hợp lệ
                                </span>
                              </div>
                            </div>
                            <div className="p-3 sm:p-4 flex flex-col items-center bg-slate-950/50">
                              <div className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black shadow-inner">
                                <iframe
                                  key={youtubePreviewUrl}
                                  src={youtubePreviewUrl!}
                                  title="Xem trước video khởi động"
                                  className="w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                              {engageRequireFullWatch && (
                                <p className="text-[11px] text-amber-400/90 mt-2 font-medium">
                                  🔒 Chế độ bắt buộc xem hết: Học sinh cần xem trọn vẹn video mới được chuyển sang bước tiếp theo.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* KHỐI THIẾT LẬP HIỂN THỊ VIDEO */}
                    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowVideoSettings(!showVideoSettings)}
                        className="w-full flex items-center justify-between p-4 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-slate-400" />
                          THIẾT LẬP HIỂN THỊ VIDEO
                        </span>
                        {showVideoSettings ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      {showVideoSettings && (
                        <div className="p-4 pt-0 border-t border-slate-700/60 space-y-3.5 divide-y divide-slate-700/40">
                          <label className="flex items-start gap-3 cursor-pointer pt-3.5">
                            <input
                              type="checkbox"
                              checked={engageAutoplay}
                              onChange={(e) => setEngageAutoplay(e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700 cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-200">Tự động phát video</div>
                              <div className="text-[11px] text-slate-400">
                                Bắt đầu phát ngay khi học sinh truy cập bước học này
                              </div>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 cursor-pointer pt-3">
                            <input
                              type="checkbox"
                              checked={engageRequireFullWatch}
                              onChange={(e) => setEngageRequireFullWatch(e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700 cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-200">Bắt buộc xem hết video</div>
                              <div className="text-[11px] text-slate-400">
                                Học sinh không thể bấm nút tiếp theo khi chưa xem hết thời lượng video
                              </div>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 cursor-pointer pt-3">
                            <input
                              type="checkbox"
                              checked={engageShowControls}
                              onChange={(e) => setEngageShowControls(e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700 cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-200">Hiển thị thanh điều khiển phát</div>
                              <div className="text-[11px] text-slate-400">
                                Cho phép học sinh dừng, phát và tua lại video khởi động
                              </div>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ================= CONTENT TAB 2: TRÒ CHƠI / QUIZ ================= */}
                {warmupTab === 'game' && (
                  <div className="space-y-5">
                    {/* NGUỒN TRÒ CHƠI KHỞI ĐỘNG (DROPDOWN) */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        NGUỒN TRÒ CHƠI KHỞI ĐỘNG
                      </label>
                      <div className="relative">
                        <select
                          value={engageGameSource}
                          onChange={(e) => setEngageGameSource(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white appearance-none outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="auto">Tự động nhận diện theo link (Wordwall / Quizizz / Kahoot...)</option>
                          <option value="wordwall">Wordwall (Trò chơi tương tác đa dạng)</option>
                          <option value="quizizz">Quizizz (Trắc nghiệm tương tác & game hóa)</option>
                          <option value="kahoot">Kahoot! (Thử thách học tập trực tuyến)</option>
                          <option value="other">Trang web học tập / Mã nhúng iframe khác</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* LINK TRÒ CHƠI (IFRAME/URL) */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                        <Link2 className="w-4 h-4 text-blue-400" />
                        LINK TRÒ CHƠI (IFRAME/URL)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={engageGameUrl}
                          onChange={(e) => {
                            setEngageGameUrl(e.target.value);
                            setGameIframeError(false);
                          }}
                          placeholder="Nhập link nhúng game từ Wordwall, Quizizz, Kahoot hoặc Iframe..."
                          className="w-full pl-4 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono transition-colors"
                        />
                        {engageGameUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setEngageGameUrl('');
                              setGameIframeError(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                            title="Xóa link"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed flex gap-1.5 items-start">
                        <span className="shrink-0">💡</span>
                        <span>
                          Thầy/Cô có thể nhúng các trò chơi giáo dục hấp dẫn như Wordwall, Kahoot hay các trang web học tập bên ngoài.
                        </span>
                      </p>
                    </div>

                    {/* KHUNG XEM TRƯỚC TRÒ CHƠI (Chỉ hiện khi link không trống) */}
                    {rawGameUrl !== '' && (
                      <>
                        {isInvalidGameUrl ? (
                          /* Báo link không hợp lệ */
                          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium animate-in fade-in duration-150">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Link không hợp lệ, vui lòng kiểm tra lại URL hoặc mã iframe đã dán.</span>
                          </div>
                        ) : (
                          /* Khung xem trước trò chơi */
                          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 overflow-hidden shadow-lg animate-in fade-in duration-200">
                            {/* Header preview */}
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/80 border-b border-emerald-500/20 text-xs font-bold text-emerald-300">
                              <span className="flex items-center gap-2">
                                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                                XEM TRƯỚC TRÒ CHƠI
                                {detectedPlatform && (
                                  <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                                    {detectedPlatform}
                                  </span>
                                )}
                              </span>
                              <a
                                href={cleanGameUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[11px] font-medium transition-colors border border-slate-700"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Mở link trong tab mới
                              </a>
                            </div>

                            {/* Lưu ý hỗ trợ nhúng iframe */}
                            <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>
                                Nếu trò chơi không hiển thị (do trang web đích chặn iframe), Thầy/Cô bấm{' '}
                                <strong className="text-emerald-400">"Mở link trong tab mới"</strong> để xác nhận.
                              </span>
                            </div>

                            {/* Iframe preview container */}
                            <div className="relative w-full h-[420px] bg-slate-950 flex items-center justify-center overflow-hidden">
                              {gameIframeError ? (
                                <div className="p-6 text-center space-y-3 max-w-md">
                                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                                  <div className="text-xs text-amber-300 font-medium leading-relaxed">
                                    Không thể xem trước — link có thể không hỗ trợ nhúng, vui lòng kiểm tra lại hoặc thử mở link trong tab mới để xác nhận.
                                  </div>
                                  <a
                                    href={cleanGameUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Mở link trong tab mới
                                  </a>
                                </div>
                              ) : (
                                <iframe
                                  key={cleanGameUrl}
                                  src={cleanGameUrl}
                                  title="Xem trước trò chơi khởi động"
                                  className="w-full h-full border-0 bg-white"
                                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                                  onError={() => setGameIframeError(true)}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 3: GIỚI THIỆU BÀI */}
          {activeTab === 'intro' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-rose-400 uppercase tracking-wide">
                    CẤU HÌNH MỤC GIỚI THIỆU BÀI (INTRO)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Giới thiệu tổng quan và dẫn dắt học sinh vào bài học (bật hoặc tắt mục này trong luồng học sinh).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                    isIntroEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'
                  }`}>
                    {isIntroEnabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {isIntroEnabled ? 'Đang Bật' : 'Đang Tắt'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsIntroEnabled(!isIntroEnabled)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                      isIntroEnabled ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isIntroEnabled ? 'Tắt Mục Này' : 'Bật Mục Này'}
                  </button>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  LINK VIDEO YOUTUBE / MP4 GIỚI THIỆU BÀI
                </label>
                <input
                  type="text"
                  value={introContent}
                  onChange={(e) => setIntroContent(e.target.value)}
                  placeholder="Nhập đường dẫn Video (Youtube hoặc .mp4)..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 4: MỤC TIÊU */}
          {activeTab === 'objectives' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-indigo-400 uppercase tracking-wide">
                    CẤU HÌNH MỤC MỤC TIÊU BÀI HỌC (OBJECTIVES)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Thiết lập chi tiết mục tiêu kiến thức, năng lực và phẩm chất học sinh cần đạt được (bật hoặc tắt mục này trong luồng học sinh).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                    isObjectivesEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'
                  }`}>
                    {isObjectivesEnabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {isObjectivesEnabled ? 'Đang Bật' : 'Đang Tắt'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsObjectivesEnabled(!isObjectivesEnabled)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                      isObjectivesEnabled ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isObjectivesEnabled ? 'Tắt Mục Này' : 'Bật Mục Này'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Chi tiết mục tiêu giáo dục (mỗi dòng 1 mục tiêu):</label>
                <textarea
                  rows={6}
                  value={objectivesContent}
                  onChange={(e) => setObjectivesContent(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* LIVE PREVIEW SECTION */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>👀 Xem trước (Live Preview):</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-2.5">
                  {objectivesContent.split('\n').filter(line => line.trim() !== '').length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-2">Chưa có mục tiêu nào được nhập...</p>
                  ) : (
                    objectivesContent.split('\n').filter(line => line.trim() !== '').map((line, idx) => {
                      const trimmed = line.trim();
                      const lower = trimmed.toLowerCase();
                      
                      let badgeBg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                      let iconLabel = '📖';
                      let groupName = 'Mục tiêu';
                      
                      if (lower.includes('kiến thức') || lower.includes('hiểu') || lower.includes('nắm') || lower.includes('nhận biết')) {
                        badgeBg = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                        iconLabel = '📚';
                        groupName = 'Kiến thức';
                      } else if (lower.includes('kỹ năng') || lower.includes('năng lực') || lower.includes('vận dụng') || lower.includes('thực hành') || lower.includes('giải')) {
                        badgeBg = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                        iconLabel = '🛠️';
                        groupName = 'Kỹ năng / Năng lực';
                      } else if (lower.includes('phẩm chất') || lower.includes('thái độ') || lower.includes('yêu') || lower.includes('giúp') || lower.includes('cẩn thận')) {
                        badgeBg = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                        iconLabel = '💖';
                        groupName = 'Phẩm chất / Thái độ';
                      }

                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/40 transition-all shadow-xs group">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-extrabold text-xs shrink-0">
                              {idx + 1}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${badgeBg}`}>
                                  {iconLabel} {groupName}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 font-medium leading-relaxed">
                                {trimmed}
                              </p>
                            </div>
                          </div>
                          <div className="w-6 h-6 rounded-lg bg-slate-700/40 text-slate-400 flex items-center justify-center shrink-0 opacity-60 group-hover:opacity-100 transition-all" title="Mục tiêu cần đạt">
                            ✓
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KHÁM PHÁ */}
          {activeTab === 'explore' && (
            <div className="space-y-6">
              {/* Video Explore Editor */}
              <TeacherVideoExploreEditor
                initialVideoUrl={exploreVideoUrl}
                initialCheckpoints={exploreCheckpoints}
                initialCoreSummary={exploreObj}
                lessonTitle={title}
                lessonSubject={subject}
                lessonGrade={grade}
                onSave={(vUrl, cps, summary) => {
                  setExploreVideoUrl(vUrl);
                  setExploreCheckpoints(cps);
                  if (summary !== undefined) {
                    setExploreObj(summary);
                  }
                }}
                onCoreSummaryChange={(summary) => {
                  setExploreObj(summary);
                }}
              />
            </div>
          )}

          {/* TAB 6: LUYỆN TẬP */}
          {activeTab === 'elaborate' && (
            <div className="space-y-4">
              <TeacherElaborateEditor
                initialObjective={elaborateObj}
                initialTransitionGuidance={elaborateTransitionGuidance}
                initialQuestions={elaborateQuestions}
                questionsBank={questionsBank}
                defaultSubject={subject}
                defaultGrade={grade}
                onObjectiveChange={setElaborateObj}
                onTransitionGuidanceChange={setElaborateTransitionGuidance}
                onQuestionsChange={setElaborateQuestions}
              />
            </div>
          )}

          {/* TAB 7: VẬN DỤNG */}
          {activeTab === 'evaluate' && (
            <div className="space-y-4">
              <TeacherEvaluateEditor
                initialObjective={evaluateObj}
                initialTeacherActivities={evaluateTeacher}
                initialMaterials={evaluateMat}
                initialQuestions={evaluateQuestions}
                initialStudentActivities={evaluateStudent}
                questionsBank={questionsBank}
                defaultSubject={subject}
                defaultGrade={grade}
                onObjectiveChange={setEvaluateObj}
                onTeacherActivitiesChange={setEvaluateTeacher}
                onMaterialsChange={setEvaluateMat}
                onQuestionsChange={setEvaluateQuestions}
                onStudentActivitiesChange={setEvaluateStudent}
                onRequireAttachmentChange={() => {}}
                onCongratMessageChange={() => {}}
              />
            </div>
          )}

          {/* TAB 8: ĐÁNH GIÁ */}
          {activeTab === 'assessment' && (
            <div className="space-y-4">
              <TeacherAssessmentEditor
                initialQuestions={assessmentQuestions}
                initialCriteria={assessmentCriteria}
                questionsBank={questionsBank}
                defaultSubject={subject}
                defaultGrade={grade}
                onQuestionsChange={setAssessmentQuestions}
                onCriteriaChange={setAssessmentCriteria}
              />
            </div>
          )}

          {/* TAB 9: NHẬN XÉT */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <TeacherFeedbackEditor
                initialBlocks={feedbackBlocks}
                defaultTeacherName={targetLesson?.authorName && !isGenericTeacherLabel(targetLesson.authorName) ? formatTeacherWithTitle(targetLesson.authorName) : 'Cô Trần Thị Diễm Hương'}
                onFeedbackChange={setFeedbackBlocks}
              />
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-800 px-6 py-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
            <span>Đã lưu: <strong className="text-emerald-400">{completedCount}</strong>/{totalSections} mục</span>
            <button
              onClick={handleSaveCurrentSection}
              className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer border border-purple-500/30"
            >
              <Check className="w-4 h-4 text-white" /> XÁC NHẬN LƯU MỤC {activeTab === 'intro' ? 'INTRO' : activeTab.toUpperCase()}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all cursor-pointer"
            >
              HỦY BỎ
            </button>

            {isAllCompleted ? (
              <button
                onClick={handleCompleteAndSave}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isEditMode ? 'CẬP NHẬT BÀI GIẢNG' : 'LƯU BÀI GIẢNG HOÀN TẤT'}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Hoàn thành lưu tất cả 7+ mục để hiện nút Lưu bài giảng</span>
              </div>
            )}
          </div>
        </div>

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
    </div>
  );
};
