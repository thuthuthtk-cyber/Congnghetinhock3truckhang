import { addGameReward } from '../services/studentGameStoreService';

/**
 * CẤU HÌNH HỆ THỐNG PHẦN THƯỞNG XU & EXP TẬP TRUNG CHO TOÀN BỘ ỨNG DỤNG
 * Dễ dàng điều chỉnh cân bằng game tại một nơi duy nhất.
 */
export const REWARD_CONFIG = {
  // 1. Bài Tập Tự Luyện (Homework Assignment)
  ASSIGNMENT: {
    FIRST_SUBMIT_COINS: 10,
    FIRST_SUBMIT_EXP: 5,
    BONUS_HIGH_SCORE_COINS: 5, // Thưởng thêm nếu đạt >= 80% câu đúng
    BONUS_HIGH_SCORE_THRESHOLD: 0.8 // 80%
  },

  // 2. Đề Kiểm Tra Đánh Giá (Exam Papers)
  EXAM: {
    EXP_FIXED: 10, // Cố định mọi mức điểm
    TIERS: [
      { minScore: 0, maxScore: 5.0, coins: 10, label: 'Dưới 5 điểm' },
      { minScore: 5.0, maxScore: 7.0, coins: 20, label: '5.0 - 6.9 điểm' },
      { minScore: 7.0, maxScore: 9.0, coins: 35, label: '7.0 - 8.9 điểm' },
      { minScore: 9.0, maxScore: 10.0, coins: 50, label: '9.0 - 10 điểm' }
    ]
  },

  // 3. Đấu Trường Tri Thức (Interactive Game Arena)
  ARENA: {
    RANK_1: { coins: 100, exp: 20, label: 'Hạng 1' },
    RANK_2: { coins: 70, exp: 20, label: 'Hạng 2' },
    RANK_3: { coins: 50, exp: 20, label: 'Hạng 3' },
    PARTICIPATION: { coins: 20, exp: 10, label: 'Tham gia thi đấu' }
  },

  // 4. Bài Giảng E-Learning Chuẩn 5E
  ELEARNING_5E: {
    FIRST_COMPLETE_COINS: 30,
    FIRST_COMPLETE_EXP: 15,
    BONUS_EVALUATE_COINS: 10, // Thưởng thêm nếu bước Đánh giá (Evaluate) >= 8/10
    BONUS_EVALUATE_THRESHOLD: 8.0 // 8/10 điểm
  }
} as const;

// -------------------------------------------------------------
// HELPER METHODS: LƯU TRỮ VÀ KIỂM TRA TRẠNG THÁI "CHỈ THƯỞNG LẦN ĐẦU"
// -------------------------------------------------------------

export const getClaimedRewardsMap = (studentId: string = 'default'): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`eduplay_claimed_rewards_${studentId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const hasClaimedReward = (
  studentId: string = 'default',
  category: 'assignment' | 'exam' | 'arena' | 'lesson',
  itemId: string
): boolean => {
  if (!itemId) return false;
  const map = getClaimedRewardsMap(studentId);
  return Boolean(map[`${category}:${itemId}`]);
};

export const markRewardClaimed = (
  studentId: string = 'default',
  category: 'assignment' | 'exam' | 'arena' | 'lesson',
  itemId: string
): void => {
  if (typeof window === 'undefined' || !itemId) return;
  try {
    const map = getClaimedRewardsMap(studentId);
    map[`${category}:${itemId}`] = true;
    localStorage.setItem(`eduplay_claimed_rewards_${studentId}`, JSON.stringify(map));
  } catch {}
};

// -------------------------------------------------------------
// CALCULATION & AWARDING ENGINES
// -------------------------------------------------------------

/**
 * 1. BÀI TẬP
 * +10 Xu / +5 EXP khi nộp bài lần đầu tiên.
 * Bonus +5 Xu nếu đạt >= 80% số câu đúng.
 * Không thưởng thêm nếu làm lại bài đã nộp.
 */
export const calculateAssignmentReward = (correctCount: number, totalQuestions: number) => {
  const isBonus = totalQuestions > 0 && (correctCount / totalQuestions) >= REWARD_CONFIG.ASSIGNMENT.BONUS_HIGH_SCORE_THRESHOLD;
  const coins = isBonus 
    ? REWARD_CONFIG.ASSIGNMENT.FIRST_SUBMIT_COINS + REWARD_CONFIG.ASSIGNMENT.BONUS_HIGH_SCORE_COINS 
    : REWARD_CONFIG.ASSIGNMENT.FIRST_SUBMIT_COINS;
  const exp = REWARD_CONFIG.ASSIGNMENT.FIRST_SUBMIT_EXP;

  return { coins, exp, isBonus };
};

export const awardAssignmentReward = (
  studentId: string,
  assignmentId: string,
  assignmentTitle: string,
  correctCount: number,
  totalQuestions: number
): { awarded: boolean; coins: number; exp: number; isBonus: boolean } | null => {
  if (hasClaimedReward(studentId, 'assignment', assignmentId)) {
    return null;
  }

  const { coins, exp, isBonus } = calculateAssignmentReward(correctCount, totalQuestions);
  addGameReward(exp, coins, `Bài tập: ${assignmentTitle}`);
  markRewardClaimed(studentId, 'assignment', assignmentId);

  return { awarded: true, coins, exp, isBonus };
};

/**
 * 2. ĐỀ KIỂM TRA
 * Dưới 5đ: +10 Xu
 * 5-7đ: +20 Xu
 * 7-9đ: +35 Xu
 * 9-10đ: +50 Xu
 * Cố định +10 EXP mọi mức điểm.
 */
export const calculateExamReward = (scoreOutOf10: number) => {
  const exp = REWARD_CONFIG.EXAM.EXP_FIXED;
  let coins = 10;

  if (scoreOutOf10 < 5.0) {
    coins = 10;
  } else if (scoreOutOf10 < 7.0) {
    coins = 20;
  } else if (scoreOutOf10 < 9.0) {
    coins = 35;
  } else {
    coins = 50;
  }

  return { coins, exp };
};

export const awardExamReward = (
  studentId: string,
  examId: string,
  examTitle: string,
  scoreOutOf10: number
): { awarded: boolean; coins: number; exp: number } | null => {
  if (hasClaimedReward(studentId, 'exam', examId)) {
    return null;
  }

  const { coins, exp } = calculateExamReward(scoreOutOf10);
  addGameReward(exp, coins, `Đề kiểm tra: ${examTitle}`);
  markRewardClaimed(studentId, 'exam', examId);

  return { awarded: true, coins, exp };
};

/**
 * 3. ĐẤU TRƯỜNG TRI THỨC
 * Hạng 1: +100 Xu / +20 EXP
 * Hạng 2: +70 Xu / +20 EXP
 * Hạng 3: +50 Xu / +20 EXP
 * Tham gia không đạt hạng: +20 Xu / +10 EXP
 * Mỗi phòng thi đấu chỉ tính thưởng 1 lần cho mỗi học sinh.
 */
export const calculateArenaReward = (rank: number | 'unranked' | string) => {
  if (rank === 1 || rank === '1') {
    return { coins: REWARD_CONFIG.ARENA.RANK_1.coins, exp: REWARD_CONFIG.ARENA.RANK_1.exp };
  } else if (rank === 2 || rank === '2') {
    return { coins: REWARD_CONFIG.ARENA.RANK_2.coins, exp: REWARD_CONFIG.ARENA.RANK_2.exp };
  } else if (rank === 3 || rank === '3') {
    return { coins: REWARD_CONFIG.ARENA.RANK_3.coins, exp: REWARD_CONFIG.ARENA.RANK_3.exp };
  }
  return { coins: REWARD_CONFIG.ARENA.PARTICIPATION.coins, exp: REWARD_CONFIG.ARENA.PARTICIPATION.exp };
};

export const awardArenaReward = (
  studentId: string,
  gameId: string,
  gameTitle: string,
  rank: number | 'unranked' | string
): { awarded: boolean; coins: number; exp: number } | null => {
  if (hasClaimedReward(studentId, 'arena', gameId)) {
    return null;
  }

  const { coins, exp } = calculateArenaReward(rank);
  addGameReward(exp, coins, `Đấu trường: ${gameTitle}`);
  markRewardClaimed(studentId, 'arena', gameId);

  return { awarded: true, coins, exp };
};

/**
 * 4. BÀI GIẢNG E-LEARNING (CHUẨN 5E)
 * +30 Xu / +15 EXP khi hoàn thành đủ 5 bước lần đầu tiên.
 * Bonus +10 Xu nếu điểm bước Evaluate >= 8/10.
 * Học lại không nhận thêm thưởng.
 */
export const calculateELearningReward = (evaluateScoreOutOf10?: number) => {
  const isBonus = evaluateScoreOutOf10 !== undefined && evaluateScoreOutOf10 >= REWARD_CONFIG.ELEARNING_5E.BONUS_EVALUATE_THRESHOLD;
  const coins = isBonus 
    ? REWARD_CONFIG.ELEARNING_5E.FIRST_COMPLETE_COINS + REWARD_CONFIG.ELEARNING_5E.BONUS_EVALUATE_COINS 
    : REWARD_CONFIG.ELEARNING_5E.FIRST_COMPLETE_COINS;
  const exp = REWARD_CONFIG.ELEARNING_5E.FIRST_COMPLETE_EXP;

  return { coins, exp, isBonus };
};

export const awardELearningReward = (
  studentId: string,
  lessonId: string,
  lessonTitle: string,
  evaluateScoreOutOf10?: number
): { awarded: boolean; coins: number; exp: number; isBonus: boolean } | null => {
  if (hasClaimedReward(studentId, 'lesson', lessonId)) {
    return null;
  }

  const { coins, exp, isBonus } = calculateELearningReward(evaluateScoreOutOf10);
  addGameReward(exp, coins, `Bài giảng E-Learning: ${lessonTitle}`);
  markRewardClaimed(studentId, 'lesson', lessonId);

  return { awarded: true, coins, exp, isBonus };
};
