import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface ScoreExtractorResult {
  isSubmitted: boolean;
  score: number | null;
}

/**
 * Sắp xếp danh sách nộp bài theo điểm số:
 * - sortDirection === 'desc': Điểm cao -> thấp
 * - sortDirection === 'asc': Điểm thấp -> cao
 * - sortDirection === null: Giữ nguyên thứ tự mặc định
 * - Học sinh chưa nộp bài (waiting / chưa có điểm) LUÔN ở cuối danh sách
 */
export function sortSubmissionsByScore<T>(
  items: T[],
  sortDirection: SortDirection,
  getScoreInfo: (item: T) => ScoreExtractorResult
): T[] {
  if (!sortDirection) {
    return items;
  }

  const isSubmittedWithScore = (item: T) => {
    const info = getScoreInfo(item);
    return info.isSubmitted && info.score !== null && !isNaN(info.score);
  };

  const submitted = items.filter(isSubmittedWithScore);
  const waiting = items.filter(item => !isSubmittedWithScore(item));

  const sortedSubmitted = [...submitted].sort((a, b) => {
    const scoreA = getScoreInfo(a).score ?? 0;
    const scoreB = getScoreInfo(b).score ?? 0;
    if (sortDirection === 'desc') {
      return scoreB - scoreA;
    } else {
      return scoreA - scoreB;
    }
  });

  return [...sortedSubmitted, ...waiting];
}

/**
 * Hook dùng chung cho việc quản lý trạng thái sắp xếp theo điểm số (3 trạng thái: desc -> asc -> null)
 * Dùng cho cả ExamManagementModule (Bài kiểm tra) và AssignmentModule (Bài tập rèn luyện)
 */
export function useScoreSort<T>(
  items: T[],
  getScoreInfo: (item: T) => ScoreExtractorResult
) {
  const [sortScoreDirection, setSortScoreDirection] = useState<SortDirection>(null);

  const handleToggleSortScore = useCallback(() => {
    setSortScoreDirection(prev => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  }, []);

  const resetSortScore = useCallback(() => {
    setSortScoreDirection(null);
  }, []);

  const sortedItems = useMemo(() => {
    return sortSubmissionsByScore(items, sortScoreDirection, getScoreInfo);
  }, [items, sortScoreDirection, getScoreInfo]);

  return {
    sortScoreDirection,
    setSortScoreDirection,
    handleToggleSortScore,
    resetSortScore,
    sortedItems
  };
}
