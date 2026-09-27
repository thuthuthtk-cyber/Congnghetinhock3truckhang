import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useState, useEffect, useMemo } from 'react';

export interface ClassSubjectConfig {
  isVisible: boolean;
  subjectName: string;
}

export interface SchoolClassItem {
  id: string;
  name: string;      // e.g. "Lớp 1C", "Lớp 5D"
  grade: string;     // e.g. "Khối 1", "Khối 5"
  room?: string;     // e.g. "Phòng 101"
  homeroomTeacher?: string;
  subjects?: ClassSubjectConfig[];
}

/**
 * Danh sách môn học tiêu chuẩn theo từng Khối lớp Tiểu học (Chương trình GDPT 2018)
 */
export const STANDARD_GRADE_SUBJECTS: Record<string, string[]> = {
  'Khối 3': ['Tin học', 'Công nghệ']
};

// Default real primary school classes (TH Trực Khang - Khối 3)
export const REAL_SCHOOL_CLASSES_FALLBACK: SchoolClassItem[] = [
  { id: '3C', name: 'Lớp 3C', grade: 'Khối 3', room: 'Phòng 301', subjects: STANDARD_GRADE_SUBJECTS['Khối 3'].map(s => ({ isVisible: true, subjectName: s })) },
  { id: '3D', name: 'Lớp 3D', grade: 'Khối 3', room: 'Phòng 302', subjects: STANDARD_GRADE_SUBJECTS['Khối 3'].map(s => ({ isVisible: true, subjectName: s })) }
];

/**
 * Format class name string to "Lớp X"
 */
export function formatClassName(rawName?: string): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();
  if (trimmed.startsWith('Lớp ')) return trimmed;
  return `Lớp ${trimmed}`;
}

/**
 * Extract grade digit (e.g. "Khối 5" -> "5", "5C" -> "5")
 */
export function extractGradeDigit(str?: string): string {
  if (!str) return '';
  const match = str.match(/\d+/);
  return match ? match[0] : '';
}

/**
 * Subscribe to real-time classes from Firestore 'classes' collection
 */
export function subscribeRealtimeClasses(callback: (classes: SchoolClassItem[]) => void): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'classes'), (snapshot) => {
      if (!snapshot.empty) {
        const classMap = new Map<string, SchoolClassItem>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const rawId = (docSnap.id || data.id || data.classId || '').trim();
          const rawName = (data.name || data.className || rawId || '').trim();
          const name = formatClassName(rawName);
          const rawGrade = (data.grade || '').trim();
          const digit = extractGradeDigit(rawGrade) || extractGradeDigit(name);
          const grade = rawGrade || (digit ? `Khối ${digit}` : 'Khối 1');
          
          // Normalized key for deduplication (e.g. "3C", "5D")
          const cleanSuffix = name.replace(/^Lớp\s*/i, '').trim().toUpperCase();
          const normalizedKey = cleanSuffix || rawId.toUpperCase();
          const standardId = normalizedKey;

          const newItem: SchoolClassItem = {
            id: standardId,
            name,
            grade,
            room: data.room || '',
            homeroomTeacher: data.homeroomTeacher || '',
            subjects: Array.isArray(data.subjects) && data.subjects.length > 0
              ? data.subjects
              : (STANDARD_GRADE_SUBJECTS[grade] || STANDARD_GRADE_SUBJECTS['Khối 5']).map(s => ({ isVisible: true, subjectName: s }))
          };

          // If item already exists, merge fields favoring non-empty ones
          if (classMap.has(normalizedKey)) {
            const existing = classMap.get(normalizedKey)!;
            classMap.set(normalizedKey, {
              ...existing,
              name: existing.name || newItem.name,
              grade: existing.grade || newItem.grade,
              room: existing.room || newItem.room,
              homeroomTeacher: existing.homeroomTeacher || newItem.homeroomTeacher,
              subjects: (existing.subjects && existing.subjects.length > 0) ? existing.subjects : newItem.subjects
            });
          } else {
            classMap.set(normalizedKey, newItem);
          }
        });

        const list = Array.from(classMap.values()).filter(c => c.grade === 'Khối 3' || (c.grade || '').replace(/[^0-9]/g, '') === '3');
        if (list.length > 0) {
          list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
          callback(list);
          return;
        }
      }
      callback(REAL_SCHOOL_CLASSES_FALLBACK);
    }, (err) => {
      console.warn('Firestore classes subscription warning:', err);
      callback(REAL_SCHOOL_CLASSES_FALLBACK);
    });
    return unsub;
  } catch (err) {
    console.warn('Error subscribing to Firestore classes:', err);
    callback(REAL_SCHOOL_CLASSES_FALLBACK);
    return () => {};
  }
}

/**
 * Lấy danh sách môn học cấu hình thực tế cho một Lớp/Khối (Truy vấn từ Firestore, LocalStorage hoặc chuẩn GDPT 2018)
 */
export function getSubjectsForClassOrGrade(
  classNameOrGrade?: string,
  classesList?: SchoolClassItem[]
): string[] {
  if (!classNameOrGrade) {
    return STANDARD_GRADE_SUBJECTS['Khối 3'];
  }

  const cleanName = classNameOrGrade.trim();
  const digit = extractGradeDigit(cleanName) || '5';
  const gradeKey = `Khối ${digit}`;

  // 1. Kiểm tra cấu hình cụ thể của lớp từ danh sách classes (Firestore)
  if (classesList && classesList.length > 0) {
    const matchedClass = classesList.find(c => {
      const cNameClean = c.name.replace(/^Lớp\s+/i, '').trim().toLowerCase();
      const targetClean = cleanName.replace(/^Lớp\s+/i, '').trim().toLowerCase();
      return (
        c.id.toLowerCase() === targetClean ||
        cNameClean === targetClean ||
        c.name.toLowerCase() === cleanName.toLowerCase()
      );
    });

    if (matchedClass && Array.isArray(matchedClass.subjects) && matchedClass.subjects.length > 0) {
      const activeSubjects = matchedClass.subjects
        .filter(s => s.isVisible !== false)
        .map(s => s.subjectName.trim())
        .filter(Boolean);
      if (activeSubjects.length > 0) {
        return activeSubjects;
      }
    }
  }

  // 2. Thử lấy từ localStorage 'eduplay_classes_config'
  try {
    const localConfigStr = typeof window !== 'undefined' ? localStorage.getItem('eduplay_classes_config') : null;
    if (localConfigStr) {
      const localClasses = JSON.parse(localConfigStr);
      if (Array.isArray(localClasses)) {
        const matchedLocal = localClasses.find((c: any) => {
          const cNameClean = (c.name || '').replace(/^Lớp\s+/i, '').trim().toLowerCase();
          const targetClean = cleanName.replace(/^Lớp\s+/i, '').trim().toLowerCase();
          return (c.id || '').toLowerCase() === targetClean || cNameClean === targetClean;
        });
        if (matchedLocal && Array.isArray(matchedLocal.subjects) && matchedLocal.subjects.length > 0) {
          const activeSubjects = matchedLocal.subjects
            .filter((s: any) => s.isVisible !== false)
            .map((s: any) => (s.subjectName || '').trim())
            .filter(Boolean);
          if (activeSubjects.length > 0) {
            return activeSubjects;
          }
        }
      }
    }
  } catch {}

  // 3. Chuẩn hóa theo Khối học GDPT 2018 tương ứng
  return STANDARD_GRADE_SUBJECTS[gradeKey] || STANDARD_GRADE_SUBJECTS['Khối 5'];
}

import { getSubjectColorStyles, SubjectColorStyle, SUBJECT_COLOR_MAP } from '../utils/subjectColors';
export { getSubjectColorStyles, SUBJECT_COLOR_MAP };
export type { SubjectColorStyle };

/**
 * Cung cấp metadata hiển thị (chủ đề mặc định, màu gradient, styles) cho từng môn học
 */
export function getSubjectDisplayConfig(subjectName: string) {
  const styles = getSubjectColorStyles(subjectName);
  return {
    name: styles.name,
    defaultTopic: styles.defaultTopic,
    gradient: styles.gradient,
    styles
  };
}

/**
 * Custom React Hook: SINGLE SOURCE OF TRUTH for class list
 */
export function useClassesList() {
  const [classes, setClasses] = useState<SchoolClassItem[]>(REAL_SCHOOL_CLASSES_FALLBACK);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsub = subscribeRealtimeClasses((fetched) => {
      setClasses(fetched);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /**
   * Filter class list by a specific grade (e.g. "Khối 5", "5", "Lớp 5")
   * If grade is null/undefined/empty or "Tất cả các khối", returns all classes.
   */
  const getClassesForGrade = useMemo(() => {
    return (gradeFilter?: string): SchoolClassItem[] => {
      if (!gradeFilter || gradeFilter === 'Tất cả' || gradeFilter === 'Tất cả các khối' || gradeFilter === 'Tất cả Lớp') {
        return classes;
      }

      const targetDigit = extractGradeDigit(gradeFilter);
      if (!targetDigit) return classes;

      const filtered = classes.filter(c => {
        const classDigit = extractGradeDigit(c.grade) || extractGradeDigit(c.name);
        return classDigit === targetDigit;
      });

      return filtered.length > 0 ? filtered : classes;
    };
  }, [classes]);

  return {
    classes,
    loading,
    getClassesForGrade
  };
}
