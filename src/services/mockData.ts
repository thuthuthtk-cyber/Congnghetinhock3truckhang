import {
  UserAccount,
  Lesson5EPlan,
  QuestionItem,
  ExamPaper,
  HomeworkAssignment,
  GameItem,
  ActivityLog
} from '../types';

export interface TeacherRecord {
  id: string;
  name: string;            // Họ và tên giáo viên
  email: string;           // Thư điện tử liên hệ
  role: string;            // Vai trò (Tổ trưởng, Giáo viên, Hiệu trưởng, Admin...)
  subject: string;         // Môn học phụ trách
  status: 'active' | 'locked'; // Trạng thái hoạt động
  dob?: string;            // Ngày sinh (dd/mm/yyyy)
  phone?: string;          // Số điện thoại (SĐT)
  sddcn?: string;          // Số định danh cá nhân (SĐDCN / CCCD)
  toChuyenMon: string;     // Tổ chuyên môn
  nhomGvCn?: string;       // Nhóm GVCN / Phụ trách khối
  homeroomClasses?: string[]; // Danh sách lớp chủ nhiệm
  teachingClasses?: string[]; // Danh sách lớp giảng dạy bộ môn
  avatar?: string;         // Icon/Avatar
}

export const PRIMARY_SCHOOL_SUBJECTS = [
  'Tin học',
  'Công nghệ'
];

export const INITIAL_TEACHERS: TeacherRecord[] = [];

export const INITIAL_LESSONS: Lesson5EPlan[] = [];

export const INITIAL_ASSIGNMENTS: HomeworkAssignment[] = [];

export const INITIAL_QUESTIONS: QuestionItem[] = [];

export const INITIAL_EXAMS: ExamPaper[] = [];

export const INITIAL_GAMES: GameItem[] = [];

export const INITIAL_USERS: UserAccount[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];

export const INITIAL_DASHBOARD_STATS = {
  totalQuestions: 0,
  totalExams: 0,
  totalLessons: 0,
  totalClasses: 0,
  totalStudents: 0,
  activeTeachers: 0,
  pendingAssignments: 0
};
