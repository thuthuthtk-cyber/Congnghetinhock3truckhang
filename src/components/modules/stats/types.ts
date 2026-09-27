export type ActivityStatus = 'completed' | 'in_progress' | 'not_started';

export interface ActivityDetail {
  status: ActivityStatus;
  label: string;
  completedAt?: string;
  timeSpentMinutes?: number;
  score?: string;
}

export interface Student5EProgress {
  studentId: string;
  stt: number;
  studentCode: string;
  studentName: string;
  className: string;
  avatar?: string;
  engage: ActivityDetail;
  explore: ActivityDetail;
  explain: ActivityDetail;
  elaborate: ActivityDetail;
  evaluate: ActivityDetail;
  progressPct: number;
  rating: 'good' | 'pass' | 'need_effort'; // 🎯 Tốt (≥80%), 👍 Đạt (50-79%), 💪 Cần cố gắng (<50%)
  lastActiveText: string;
  isAtRisk: boolean; // 0% progress and unstarted
}

export interface StatsOverview {
  totalStudents: number;
  completedCount: number;
  completedPct: number;
  inProgressCount: number;
  inProgressPct: number;
  notStartedCount: number;
  notStartedPct: number;
  avgProgressPct: number;
}

export interface Activity5EStats {
  key: 'engage' | 'explore' | 'explain' | 'elaborate' | 'evaluate';
  name: string;
  stepCode: string;
  completedCount: number;
  totalStudents: number;
  completedPct: number;
}
