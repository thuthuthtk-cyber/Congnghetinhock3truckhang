export type UserRole = 'admin' | 'teacher' | 'student';

export type ActiveModule = 
  | 'dashboard'
  | 'lesson_5e'
  | 'exam_management'
  | 'assignment'
  | 'question_bank'
  | 'interactive_games'
  | 'user_management'
  | 'hoc_ba_so';

export type ModuleType = ActiveModule;

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  classGroup?: string;
  gradeClass?: string;
  subject?: string;
  status: 'active' | 'inactive';
  joinedDate?: string;
}

export interface Lesson5EStep {
  title: string;
  subtitle: string;
  objectives: string;
  teacherActivities: string;
  studentActivities: string;
  materials: string;
}

export interface FeedbackBlockConfig {
  id: string;
  levelTitle: string; // e.g. "HOÀN THÀNH XUẤT SẮC 🏆"
  useLaurelWreath: boolean;
  laurelWreathUrl?: string;
  backgroundImageUrl?: string;
  sticker: string;
  praiseTitle: string;
  praiseContent: string;
  teacherName: string;
}

export interface Lesson5EPlan {
  id: string;
  title: string;
  subject: string;
  grade: string;
  duration: string; // e.g. "45 phút"
  topic: string;
  authorName: string;
  teacherId?: string;
  teacherEmail?: string;
  createdBy?: string;
  createdAt: string;
  objectivesContent?: string;
  isObjectivesEnabled?: boolean;
  introContent?: string;
  isIntroEnabled?: boolean;
  stepEngage: Lesson5EStep;
  stepExplore: Lesson5EStep;
  stepElaborate: Lesson5EStep;
  stepEvaluate: Lesson5EStep;
  feedbackConfig?: {
    blocks: FeedbackBlockConfig[];
  };
}

export type CognitiveLevel = 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';
export type QuestionLevel = CognitiveLevel;
export type QuestionType = 'multiple_choice' | 'essay' | 'true_false' | string;

export interface TrueFalseStatement {
  statement: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface ClassificationItem {
  name: string;
  group: string; // group name or index
}

export interface OrderingStepItem {
  text: string;
  index: number; // 0-based index
  order: number; // 1-based step order
}

export interface QuestionItem {
  id: string;
  code: string;
  subject: string;
  grade: string;
  level: CognitiveLevel;
  type: QuestionType;
  content: string;
  lessonName?: string; // Topic / Lesson Name
  options?: string[]; // 4 choices for multiple choice: [A, B, C, D]
  statements?: TrueFalseStatement[]; // For True/False statement table questions
  classificationGroups?: string[]; // For classification questions (e.g. ['Đối tượng tự nhiên', 'Sản phẩm công nghệ'])
  classificationItems?: ClassificationItem[]; // For classification questions
  canonicalOptions?: string[]; // Canonical ordered steps for ordering questions
  correctOrder?: string[]; // Canonical ordered steps for ordering questions
  orderingSteps?: OrderingStepItem[]; // Structured steps with updated index/order
  teacherEditedOrder?: boolean; // Flag indicating explicit teacher ordering
  correctAnswer?: string; // "A" | "B" | "C" | "D" or text for essay
  explanation?: string;
  imageUrl?: string;
  imagePrompt?: string;
  matchingPairs?: { left: string; right: string; match?: string }[]; // For matching questions
  authorName?: string;
  authorType?: 'my' | 'colleague' | 'all';
  teacherId?: string;
  teacherName?: string;
  teacherEmail?: string;
  createdBy?: string;
  createdAt?: string | number;
}

export interface ExamMatrix {
  nhanBiet: number;
  thongHieu: number;
  vanDung: number;
  vanDungCao: number;
}

export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  duration?: number;
  matrix: ExamMatrix;
  questions: QuestionItem[];
  createdBy: string;
  authorName?: string;
  teacherId?: string;
  teacherName?: string;
  teacherEmail?: string;
  createdAt: string;
  isShuffled?: boolean;
  status?: 'draft' | 'published' | 'completed';
  targetClass?: string;
  examType?: string;
  testType?: string;
  startTime?: string;
  endTime?: string;
  submissionsCount?: number;
  totalStudents?: number;
  authorType?: 'my' | 'colleague' | 'all';
  originalExamId?: string;
  assignmentDate?: string;
  submissions?: any[];
}

export interface AssignmentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  attachmentUrl?: string;
  content: string;
  score?: number; // 0 - 10
  feedback?: string;
  status: 'pending' | 'graded';
}

export interface HomeworkAssignment {
  id: string;
  title: string;
  subject: string;
  grade?: string; // e.g. "Khối 3"
  targetClass: string; // e.g., "Lớp 3A" or "Tất cả"
  teacherName?: string; // e.g., "Nguyễn Thị Thu"
  teacherId?: string; // e.g., "gv-12"
  teacherEmail?: string;
  createdBy?: string;
  dueDate: string;
  assignedDate?: string; // e.g., "18/8/2026"
  description: string;
  totalStudents: number;
  completedCount?: number;
  isApproved?: boolean;
  authorType?: 'my' | 'colleague' | 'all';
  type?: 'assignment' | 'elearning' | string;
  category?: 'assignment' | 'elearning' | string;
  contentType?: 'assignment' | 'elearning' | string;
  lessonId?: string;
  lessonData?: any;
  questions?: QuestionItem[];
  submissions: AssignmentSubmission[];
  createdAt: string;
  originalAssignmentId?: string;
}

export type GameType = 'golden_bell' | 'speed_quiz' | 'lucky_wheel' | 'flashcards';

export interface GameItem {
  id: string;
  title: string;
  type: GameType;
  subject: string;
  grade: string;
  description: string;
  questions: {
    id: string;
    question: string;
    content?: string;
    options?: string[];
    answer: string;
    explanation?: string;
    type?: string;
    matchingPairs?: { left: string; right: string }[];
    statements?: { statement: string; isCorrect: boolean }[];
    classificationItems?: { name: string; group: string }[];
    classificationGroups?: string[];
  }[];
  playersCount?: number;
  maxPlayers?: number;
  classInfo?: string;
  status?: 'open' | 'closed';
  timePerQuestion?: string;
  isTimeLimited?: boolean;
  originalGameId?: string;
  teacherId?: string;
  teacherName?: string;
  teacherEmail?: string;
  createdBy?: string;
  authorName?: string;
  authorType?: 'my' | 'colleague' | 'all';
}

export interface ActivityLog {
  id: string;
  user: string;
  role: UserRole;
  action: string;
  module: string;
  timestamp: string;
  time?: string;
}

export interface LatencyTestResult {
  latencyMs: number;
  status: 'online' | 'error' | 'testing';
  modelName: string;
  message?: string;
}

export interface TeacherRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  subject: string;
  status: 'active' | 'locked';
  dob?: string;
  phone?: string;
  sddcn?: string;
  toChuyenMon: string;
  nhomGvCn?: string;
  avatar?: string;
  teachingAssignments?: Array<{ subject: string; classes: string[] }>;
}

export interface StudentRecord {
  id: string;
  stt: number;
  code: string;
  name: string;
  dob: string;
  gender: 'Nam' | 'Nữ';
  pin?: string;
  className?: string;
  avatar?: string;
  avatarUrl?: string;
  status?: 'active' | 'inactive';
  conduct?: 'Tốt' | 'Khá';
  avgScore?: number;
  notes?: string;
  coins?: number;
  sddcn?: string;
  parentName?: string;
  phone?: string;
  email?: string;
  address?: string;
  // Aliases for Excel column mapping compatibility
  username?: string;
  password?: string;
  fullName?: string;
  idCard?: string;
  birthday?: string;
}

export interface QuizziGameItem {
  id: number | string;
  originalGameId?: string;
  subject: string;
  subjectLabel: string;
  title: string;
  desc: string;
  grade: string;
  classInfo: string;
  icon?: string;
  color?: string;
  type?: string;
  embedUrl?: string;
  teacherId?: string;
  teacherName?: string;
  teacherEmail?: string;
  createdBy?: string;
  authorName?: string;
  authorType?: 'my' | 'colleague' | 'all';
  createdAt?: string;
  updatedAt?: string;
}

