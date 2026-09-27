/**
 * BẢNG MÀU ĐẶC TRƯNG TỪNG MÔN HỌC (GDPT 2018 TIỂU HỌC)
 * Đồng bộ hóa màu sắc badge, top border accent, card glow, icon và gradient theo môn học
 */

export interface SubjectColorStyle {
  name: string;
  key: string;
  // Badge styling
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  badgeClass: string;
  
  // Card accent & borders
  topBarBg: string;
  cardBorder: string;
  cardBorderHover: string;
  cardBgLight: string;
  
  // Text & Icon
  text: string;
  iconBg: string;
  
  // Gradients
  gradient: string;
  gradientLight: string;
  
  // Metadata
  defaultTopic: string;
  emoji: string;
}

export const SUBJECT_COLOR_MAP: Record<string, SubjectColorStyle> = {
  tinhoc: {
    name: 'Tin Học',
    key: 'tinhoc',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-300',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-300',
    topBarBg: 'bg-blue-600',
    cardBorder: 'border-blue-200/90',
    cardBorderHover: 'hover:border-blue-400',
    cardBgLight: 'bg-blue-50/30',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100 text-blue-700',
    gradient: 'from-blue-600 to-indigo-600',
    gradientLight: 'from-blue-500/10 to-indigo-500/10',
    defaultTopic: 'Làm quen máy tính & Cây thư mục',
    emoji: '💻'
  },
  toan: {
    name: 'Toán',
    key: 'toan',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    topBarBg: 'bg-amber-500',
    cardBorder: 'border-amber-200/90',
    cardBorderHover: 'hover:border-amber-400',
    cardBgLight: 'bg-amber-50/30',
    text: 'text-amber-800',
    iconBg: 'bg-amber-100 text-amber-800',
    gradient: 'from-amber-500 to-orange-600',
    gradientLight: 'from-amber-500/10 to-orange-500/10',
    defaultTopic: 'Bảng nhân chia & Số học',
    emoji: '📐'
  },
  tiengviet: {
    name: 'Tiếng Việt',
    key: 'tiengviet',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-300',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
    topBarBg: 'bg-rose-600',
    cardBorder: 'border-rose-200/90',
    cardBorderHover: 'hover:border-rose-400',
    cardBgLight: 'bg-rose-50/30',
    text: 'text-rose-700',
    iconBg: 'bg-rose-100 text-rose-700',
    gradient: 'from-rose-500 to-red-600',
    gradientLight: 'from-rose-500/10 to-red-500/10',
    defaultTopic: 'Tập đọc & Luyện từ và câu',
    emoji: '📖'
  },
  tienganh: {
    name: 'Tiếng Anh',
    key: 'tienganh',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-300',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-300',
    topBarBg: 'bg-purple-600',
    cardBorder: 'border-purple-200/90',
    cardBorderHover: 'hover:border-purple-400',
    cardBgLight: 'bg-purple-50/30',
    text: 'text-purple-700',
    iconBg: 'bg-purple-100 text-purple-700',
    gradient: 'from-purple-600 to-violet-600',
    gradientLight: 'from-purple-500/10 to-violet-500/10',
    defaultTopic: 'Từ vựng & Giao tiếp',
    emoji: '🌍'
  },
  khoahoc: {
    name: 'Khoa Học',
    key: 'khoahoc',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    topBarBg: 'bg-emerald-600',
    cardBorder: 'border-emerald-200/90',
    cardBorderHover: 'hover:border-emerald-400',
    cardBgLight: 'bg-emerald-50/30',
    text: 'text-emerald-800',
    iconBg: 'bg-emerald-100 text-emerald-800',
    gradient: 'from-emerald-500 to-teal-600',
    gradientLight: 'from-emerald-500/10 to-teal-500/10',
    defaultTopic: 'Năng lượng & Thế giới tự nhiên',
    emoji: '🔬'
  },
  lichsudiali: {
    name: 'Lịch Sử & Địa Lí',
    key: 'lichsudiali',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-900',
    badgeBorder: 'border-yellow-300',
    badgeClass: 'bg-yellow-50 text-yellow-900 border-yellow-300',
    topBarBg: 'bg-yellow-600',
    cardBorder: 'border-yellow-200/90',
    cardBorderHover: 'hover:border-yellow-400',
    cardBgLight: 'bg-yellow-50/30',
    text: 'text-yellow-900',
    iconBg: 'bg-yellow-100 text-yellow-900',
    gradient: 'from-yellow-500 to-amber-600',
    gradientLight: 'from-yellow-500/10 to-amber-500/10',
    defaultTopic: 'Đất nước & Con người Việt Nam',
    emoji: '🗺️'
  },
  congnghe: {
    name: 'Công Nghệ',
    key: 'congnghe',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    badgeBorder: 'border-cyan-300',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-300',
    topBarBg: 'bg-cyan-600',
    cardBorder: 'border-cyan-200/90',
    cardBorderHover: 'hover:border-cyan-400',
    cardBgLight: 'bg-cyan-50/30',
    text: 'text-cyan-800',
    iconBg: 'bg-cyan-100 text-cyan-800',
    gradient: 'from-cyan-500 to-blue-600',
    gradientLight: 'from-cyan-500/10 to-blue-500/10',
    defaultTopic: 'Đồ dùng học tập & Thủ công kỹ thuật',
    emoji: '⚙️'
  },
  tunhienxahoi: {
    name: 'Tự Nhiên & Xã Hội',
    key: 'tunhienxahoi',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-300',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
    topBarBg: 'bg-teal-600',
    cardBorder: 'border-teal-200/90',
    cardBorderHover: 'hover:border-teal-400',
    cardBgLight: 'bg-teal-50/30',
    text: 'text-teal-800',
    iconBg: 'bg-teal-100 text-teal-800',
    gradient: 'from-teal-500 to-emerald-600',
    gradientLight: 'from-teal-500/10 to-emerald-500/10',
    defaultTopic: 'Khám phá thế giới tự nhiên và xã hội',
    emoji: '🌱'
  },
  daoduc: {
    name: 'Đạo Đức',
    key: 'daoduc',
    badgeBg: 'bg-lime-50',
    badgeText: 'text-lime-800',
    badgeBorder: 'border-lime-300',
    badgeClass: 'bg-lime-50 text-lime-800 border-lime-300',
    topBarBg: 'bg-lime-600',
    cardBorder: 'border-lime-200/90',
    cardBorderHover: 'hover:border-lime-400',
    cardBgLight: 'bg-lime-50/30',
    text: 'text-lime-800',
    iconBg: 'bg-lime-100 text-lime-800',
    gradient: 'from-lime-600 to-emerald-600',
    gradientLight: 'from-lime-500/10 to-emerald-500/10',
    defaultTopic: 'Nề nếp & Kỹ năng sống chuẩn mực',
    emoji: '🤝'
  },
  amnhac: {
    name: 'Âm Nhạc',
    key: 'amnhac',
    badgeBg: 'bg-fuchsia-50',
    badgeText: 'text-fuchsia-800',
    badgeBorder: 'border-fuchsia-300',
    badgeClass: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300',
    topBarBg: 'bg-fuchsia-600',
    cardBorder: 'border-fuchsia-200/90',
    cardBorderHover: 'hover:border-fuchsia-400',
    cardBgLight: 'bg-fuchsia-50/30',
    text: 'text-fuchsia-800',
    iconBg: 'bg-fuchsia-100 text-fuchsia-800',
    gradient: 'from-fuchsia-500 to-purple-600',
    gradientLight: 'from-fuchsia-500/10 to-purple-500/10',
    defaultTopic: 'Hát nhạc & Đọc nhạc tiết tấu',
    emoji: '🎵'
  },
  mithuat: {
    name: 'Mĩ Thuật',
    key: 'mithuat',
    badgeBg: 'bg-pink-50',
    badgeText: 'text-pink-800',
    badgeBorder: 'border-pink-300',
    badgeClass: 'bg-pink-50 text-pink-800 border-pink-300',
    topBarBg: 'bg-pink-600',
    cardBorder: 'border-pink-200/90',
    cardBorderHover: 'hover:border-pink-400',
    cardBgLight: 'bg-pink-50/30',
    text: 'text-pink-800',
    iconBg: 'bg-pink-100 text-pink-800',
    gradient: 'from-pink-500 to-rose-600',
    gradientLight: 'from-pink-500/10 to-rose-500/10',
    defaultTopic: 'Vẽ tranh & Sáng tạo tạo hình',
    emoji: '🎨'
  },
  thechat: {
    name: 'Giáo Dục Thể Chất',
    key: 'thechat',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-300',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300',
    topBarBg: 'bg-orange-600',
    cardBorder: 'border-orange-200/90',
    cardBorderHover: 'hover:border-orange-400',
    cardBgLight: 'bg-orange-50/30',
    text: 'text-orange-800',
    iconBg: 'bg-orange-100 text-orange-800',
    gradient: 'from-orange-500 to-amber-600',
    gradientLight: 'from-orange-500/10 to-amber-500/10',
    defaultTopic: 'Đội hình đội ngũ & Vận động cơ bản',
    emoji: '⚽'
  },
  trainghiem: {
    name: 'Hoạt Động Trải Nghiệm',
    key: 'trainghiem',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-300',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    topBarBg: 'bg-indigo-600',
    cardBorder: 'border-indigo-200/90',
    cardBorderHover: 'hover:border-indigo-400',
    cardBgLight: 'bg-indigo-50/30',
    text: 'text-indigo-800',
    iconBg: 'bg-indigo-100 text-indigo-800',
    gradient: 'from-indigo-500 to-purple-600',
    gradientLight: 'from-indigo-500/10 to-purple-500/10',
    defaultTopic: 'Rèn luyện bản thân & Hoạt động tập thể',
    emoji: '🌟'
  },
  default: {
    name: 'Môn Học',
    key: 'default',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    topBarBg: 'bg-indigo-600',
    cardBorder: 'border-slate-200/90',
    cardBorderHover: 'hover:border-indigo-300',
    cardBgLight: 'bg-slate-50/50',
    text: 'text-indigo-700',
    iconBg: 'bg-indigo-100 text-indigo-700',
    gradient: 'from-indigo-500 to-purple-600',
    gradientLight: 'from-indigo-500/10 to-purple-500/10',
    defaultTopic: 'Chủ đề bài học & Luyện tập',
    emoji: '📚'
  }
};

/**
 * Trả về toàn bộ cấu hình màu sắc động và metadata theo tên môn học
 */
export function getSubjectColorStyles(subjectName?: string): SubjectColorStyle {
  if (!subjectName) return SUBJECT_COLOR_MAP.default;

  const clean = subjectName.trim().toLowerCase();

  if (clean === 'toán' || clean.includes('toán') || clean.includes('toan')) {
    return SUBJECT_COLOR_MAP.toan;
  }
  if (clean === 'tiếng việt' || clean.includes('tiếng việt') || clean.includes('tieng viet') || clean === 'văn') {
    return SUBJECT_COLOR_MAP.tiengviet;
  }
  if (clean.includes('tiếng anh') || clean.includes('ngoại ngữ') || clean.includes('english')) {
    return SUBJECT_COLOR_MAP.tienganh;
  }
  if (clean === 'tin học' || clean.includes('tin học') || (clean.includes('tin') && !clean.includes('tiếng'))) {
    return SUBJECT_COLOR_MAP.tinhoc;
  }
  if (clean === 'khoa học' || clean.includes('khoa học') || clean.includes('khoa hoc') || clean.includes('khtn')) {
    return SUBJECT_COLOR_MAP.khoahoc;
  }
  if (clean.includes('lịch sử') || clean.includes('địa lí') || clean.includes('địa lý') || clean.includes('ls&đl') || clean.includes('sử')) {
    return SUBJECT_COLOR_MAP.lichsudiali;
  }
  if (clean === 'công nghệ' || clean.includes('công nghệ') || clean.includes('cong nghe')) {
    return SUBJECT_COLOR_MAP.congnghe;
  }
  if (clean.includes('tự nhiên') || clean.includes('tnxh')) {
    return SUBJECT_COLOR_MAP.tunhienxahoi;
  }
  if (clean.includes('đạo đức')) {
    return SUBJECT_COLOR_MAP.daoduc;
  }
  if (clean.includes('âm nhạc') || clean.includes('nhạc')) {
    return SUBJECT_COLOR_MAP.amnhac;
  }
  if (clean.includes('mĩ thuật') || clean.includes('mỹ thuật') || clean.includes('vẽ')) {
    return SUBJECT_COLOR_MAP.mithuat;
  }
  if (clean.includes('thể chất') || clean.includes('thể dục') || clean.includes('gdtc')) {
    return SUBJECT_COLOR_MAP.thechat;
  }
  if (clean.includes('trải nghiệm') || clean.includes('hđtn')) {
    return SUBJECT_COLOR_MAP.trainghiem;
  }

  return {
    ...SUBJECT_COLOR_MAP.default,
    name: subjectName
  };
}
