import { StudentRecord } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';

const PRIMARY_SCHOOL_SUBJECTS = [
  'Tin học', 'Công nghệ'
];

export const EDUPLAY_STUDENTS_DB_KEY = 'eduplay_students_database';
export const EDUPLAY_CLASSES_DATA_KEY = 'eduplay_classes_data';

/**
 * Standardize class identifier to uppercase (e.g. "Lớp 5B" -> "5B", "5b" -> "5B")
 */
export function normalizeClassKey(className: string): string {
  if (!className) return '5B';
  return className.trim().replace(/^Lớp\s*/i, '').toUpperCase();
}

/**
 * Convert normalized key back to standard display format (e.g. "5b" -> "Lớp 5B")
 */
export function getStandardClassName(classKeyOrName: string): string {
  if (!classKeyOrName) return 'Lớp 5B';
  const clean = classKeyOrName.trim();
  if (clean.toLowerCase().startsWith('lớp ')) {
    return clean;
  }
  return `Lớp ${clean.toUpperCase()}`;
}

/**
 * Extract numerical sequence or index from student ID/Code/STT (e.g. "st-5a-37" -> 37, "5b12" -> 12, stt -> 12)
 */
export function extractStudentNumericIndex(student: StudentRecord): number {
  if (!student) return 0;
  if (typeof student.stt === 'number' && !isNaN(student.stt) && student.stt > 0) {
    return student.stt;
  }
  // Try extracting number from id e.g. "st-5a-37" or "st-5b-5"
  const idMatch = (student.id || '').match(/(\d+)(?!.*\d)/);
  if (idMatch && idMatch[1]) {
    const num = parseInt(idMatch[1], 10);
    if (!isNaN(num)) return num;
  }
  // Try extracting from code e.g. "5a37"
  const codeMatch = (student.code || '').match(/(\d+)(?!.*\d)/);
  if (codeMatch && codeMatch[1]) {
    const num = parseInt(codeMatch[1], 10);
    if (!isNaN(num)) return num;
  }
  return 0;
}

/**
 * Sanitize student object to strictly retain ONLY allowed fields for Firebase Firestore:
 * - id: Mã học sinh
 * - code: Mã học sinh
 * - fullName: Họ và tên học sinh
 * - dob: Ngày sinh
 * - gender: Giới tính
 * - password: Mật khẩu
 * - className: Tên lớp
 */
export function sanitizeStudentForFirestore(
  st: Partial<StudentRecord>,
  targetClassName?: string
): {
  id: string;
  code: string;
  fullName: string;
  dob: string;
  gender: 'Nam' | 'Nữ';
  password: string;
  className: string;
} {
  const code = (st.code || st.username || st.id || '').trim();
  const id = (st.id || code || `st-${Date.now()}`).trim();
  const fullName = (st.fullName || st.name || '').trim();
  const dob = (st.dob || st.birthday || '').trim();
  const gender: 'Nam' | 'Nữ' = st.gender === 'Nữ' ? 'Nữ' : 'Nam';
  const password = (st.password || st.pin || '123456').trim();
  const className = (st.className || targetClassName || '').trim();

  return {
    id,
    code,
    fullName,
    dob,
    gender,
    password,
    className
  };
}

/**
 * Deduplicate student records and guarantee clean, strictly unique IDs and consistent indexing
 */
export function deduplicateAndNormalizeStudents(
  students: StudentRecord[],
  className?: string
): StudentRecord[] {
  if (!Array.isArray(students) || students.length === 0) return [];

  const inferredClass = (className && className.trim() !== '')
    ? className.trim()
    : (students.find((s) => s && s.className && s.className.trim() !== '')?.className || 'Lớp 5B');
  const stdName = getStandardClassName(inferredClass);
  const key = normalizeClassKey(stdName);
  const lowerKey = key.toLowerCase();
  const seenIds = new Set<string>();
  const seenCodes = new Set<string>();
  const seenSddcn = new Set<string>();
  const seenNameDob = new Set<string>();
  const seenNames = new Set<string>();
  const uniqueStudents: StudentRecord[] = [];

  students.forEach((st) => {
    if (!st || typeof st !== 'object') return;

    // 1. Strictly filter out students belonging to a different class
    if (st.className && typeof st.className === 'string' && st.className.trim() !== '') {
      const stClassKey = normalizeClassKey(st.className);
      if (stClassKey && stClassKey !== key) {
        return;
      }
    }

    const rawId = (st.id || '').trim();
    const rawCode = (st.code || st.username || '').trim().toLowerCase();

    // Check if code or id explicitly encodes a different class (e.g. "3a1" or "st-5b-2" when class is "3C")
    const codeClassMatch = rawCode.match(/^([1-5][a-z])\d+$/i);
    if (codeClassMatch && codeClassMatch[1].toLowerCase() !== lowerKey) {
      return;
    }
    const idClassMatch = rawId.match(/^st(?:d)?-([1-5][a-z])-\d+/i);
    if (idClassMatch && idClassMatch[1].toLowerCase() !== lowerKey) {
      return;
    }

    const fullName = (st.fullName || st.name || '').trim().replace(/\s+/g, ' ');
    if (!fullName) return;

    const normName = fullName.toLowerCase();
    const cleanDob = (st.dob || st.birthday || '').trim();
    const rawSddcn = (st.sddcn || '').trim();
    const cleanSddcn = /^\d{8,15}$/.test(rawSddcn) ? rawSddcn : '';
    const nameDobKey = `${normName}__${cleanDob}`;

    // 2. Skip duplicate ID, Code, SDDCN, or duplicate Student Name in the same class
    if (rawId && seenIds.has(rawId.toLowerCase())) {
      return;
    }
    if (rawCode && seenCodes.has(rawCode)) {
      return;
    }
    if (cleanSddcn && seenSddcn.has(cleanSddcn)) {
      return;
    }
    if (seenNameDob.has(nameDobKey)) {
      return;
    }
    // Also guard against re-indexed duplicate student records with the same full name in the same class
    if (seenNames.has(normName) && !cleanSddcn) {
      return;
    }

    if (rawId) seenIds.add(rawId.toLowerCase());
    if (rawCode) seenCodes.add(rawCode);
    if (cleanSddcn) seenSddcn.add(cleanSddcn);
    seenNameDob.add(nameDobKey);
    seenNames.add(normName);
    uniqueStudents.push(st);
  });

  const finalSeenIds = new Set<string>();
  const finalSeenCodes = new Set<string>();
  return uniqueStudents.map((st, idx) => {
    const stt = idx + 1;
    const rawCode = (st.code || st.username || '').trim().toLowerCase();
    let code = (rawCode && rawCode.startsWith(lowerKey) && !finalSeenCodes.has(rawCode))
      ? rawCode
      : `${lowerKey}${stt}`;
    if (finalSeenCodes.has(code)) {
      code = `${lowerKey}${stt}`;
    }
    finalSeenCodes.add(code);

    // Ensure every record has a canonical, deterministic ID for its class position
    let id = (st.id && !finalSeenIds.has(st.id)) ? st.id : `st-${lowerKey}-${stt}`;
    if (finalSeenIds.has(id)) {
      id = `st-${lowerKey}-${stt}-${idx + 1}`;
    }
    finalSeenIds.add(id);

    const fullName = (st.fullName || st.name || '').trim().replace(/\s+/g, ' ');
    const dob = (st.dob || st.birthday || '01/01/2016').trim();
    const gender: 'Nam' | 'Nữ' = st.gender === 'Nữ' ? 'Nữ' : 'Nam';
    const password = (st.password || st.pin || '123456').trim();

    return {
      ...st,
      id,
      stt,
      code,
      username: code,
      name: fullName,
      fullName,
      dob,
      birthday: dob,
      gender,
      password,
      pin: password,
      className: stdName
    };
  });
}

/**
 * Extract Vietnamese name sorting key (Tên main given name first, then Họ & tên đệm)
 * E.g., "Hà Phương Vy" -> "Vy Hà Phương", "Nguyễn Văn An" -> "An Nguyễn Văn", "Bùi Hà Kim Nhung" -> "Nhung Bùi Hà Kim"
 */
export function getVietnameseNameSortKey(fullName: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return trimmed;
  const firstName = parts[parts.length - 1]; // Tên chính
  const middleAndLast = parts.slice(0, parts.length - 1).join(' '); // Họ & tên đệm
  return `${firstName} ${middleAndLast}`;
}

/**
 * Sort students array in ALPHABETICAL order A-Z by Vietnamese Name
 * (Tên từ A đến Z, học sinh vần A xếp trên cùng, vần V/Z ở cuối)
 */
export function sortStudentsByNameAZ(students: StudentRecord[], className?: string): StudentRecord[] {
  if (!Array.isArray(students)) return [];
  const deduped = deduplicateAndNormalizeStudents(students, className);
  return deduped.sort((a, b) => {
    const nameA = (a.fullName || a.name || '').trim();
    const nameB = (b.fullName || b.name || '').trim();

    // 1. So sánh theo Tên (từ cuối cùng) theo chuẩn Tiếng Việt (A -> Z)
    const keyA = getVietnameseNameSortKey(nameA);
    const keyB = getVietnameseNameSortKey(nameB);
    const cmpName = keyA.localeCompare(keyB, 'vi', { sensitivity: 'base' });
    if (cmpName !== 0) return cmpName;

    // 2. Nếu cùng Tên, so sánh Họ và Tên đệm
    const cmpFull = nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
    if (cmpFull !== 0) return cmpFull;

    return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
  });
}

/**
 * Sort students array in REVERSE ALPHABETICAL order Z-A by Vietnamese Name
 */
export function sortStudentsByNameZA(students: StudentRecord[], className?: string): StudentRecord[] {
  if (!Array.isArray(students)) return [];
  const deduped = deduplicateAndNormalizeStudents(students, className);
  return deduped.sort((a, b) => {
    const nameA = (a.fullName || a.name || '').trim();
    const nameB = (b.fullName || b.name || '').trim();

    const keyA = getVietnameseNameSortKey(nameA);
    const keyB = getVietnameseNameSortKey(nameB);
    const cmpName = keyB.localeCompare(keyA, 'vi', { sensitivity: 'base' });
    if (cmpName !== 0) return cmpName;

    const cmpFull = nameB.localeCompare(nameA, 'vi', { sensitivity: 'base' });
    if (cmpFull !== 0) return cmpFull;

    return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
  });
}

/**
 * Sort students array in DESCENDING order by Student ID / STT (e.g. 37, 36, ... 12, 11, ... 1)
 */
export function sortStudentsDescending(students: StudentRecord[], className?: string): StudentRecord[] {
  if (!Array.isArray(students)) return [];
  const deduped = deduplicateAndNormalizeStudents(students, className);
  return deduped.sort((a, b) => {
    const numA = extractStudentNumericIndex(a);
    const numB = extractStudentNumericIndex(b);
    if (numA !== numB) {
      return numB - numA; // Descending: Largest to Smallest
    }
    return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Sort students array in ASCENDING order by Student ID / STT (e.g. 1, 2, ... 37)
 */
export function sortStudentsAscending(students: StudentRecord[], className?: string): StudentRecord[] {
  if (!Array.isArray(students)) return [];
  const deduped = deduplicateAndNormalizeStudents(students, className);
  return deduped.sort((a, b) => {
    const numA = extractStudentNumericIndex(a);
    const numB = extractStudentNumericIndex(b);
    if (numA !== numB) {
      return numA - numB; // Ascending: Smallest to Largest
    }
    return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Generate default roster for class 5B with 27 students (matching Excel template)
 */
export function getDefault5BRoster(): StudentRecord[] {
  const list5B = [
    'Hà Nhật An', 'Phạm Lê Khang An', 'Trần Gia An', 'Hoàng Thùy Anh', 'Lê Trần Huyền Anh',
    'Đồng Gia Bảo', 'Dương Thị Thùy Chi', 'Mai Thành Danh', 'Đoàn Đức Duy', 'Đồng Tiến Đạt',
    'Đồng Tuấn Đạt', 'Trần Minh Đức', 'Bùi Gia Hân', 'Hà Minh Hân',
    'Nguyễn Duy Hoan', 'Dương Đức Hùng', 'Đồng Gia Huy', 'Đặng Thanh Thanh Huyền', 'Nguyễn Thị Thu Hường',
    'Hoàng An Khang', 'Hoàng Nhật Khang', 'Phan Như Mai', 'Hà Thị Kim Ngân', 'Phạm Lê Khánh Ngân',
    'Đoàn Bảo Ngọc', 'Đồng Hải Nguyên'
  ];

  return list5B.map((name, idx) => {
    const isFemale = ['Thùy Anh', 'Huyền Anh', 'Thùy Chi', 'Gia Hân', 'Minh Hân', 'Thanh Huyền', 'Thu Hường', 'Như Mai', 'Kim Ngân', 'Khánh Ngân', 'Bảo Ngọc'].some(n => name.includes(n));
    return {
      id: `st-5b-${idx + 1}`,
      stt: idx + 1,
      code: `5b${idx + 1}`,
      username: `5b${idx + 1}`,
      pin: '123456',
      password: '123456',
      name,
      fullName: name,
      className: 'Lớp 5B',
      gender: (isFemale ? 'Nữ' : 'Nam') as 'Nam' | 'Nữ',
      dob: '22/01/2016',
      birthday: '22/01/2016'
    };
  });
}

/**
 * Return roster for any class (returns empty array when no real roster has been created or uploaded)
 */
export function generateDefaultClassRoster(_className: string, _count: number = 30): StudentRecord[] {
  return [];
}

/**
 * Initial full database of all classes
 */
export function getInitialStudentDatabase(): Record<string, StudentRecord[]> {
  return {};
}

/**
 * Get students for a specific class from LocalStorage with fallback
 */
export function getStudentsFromLocalStorage(className: string): StudentRecord[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const stdName = getStandardClassName(className);
    const key = normalizeClassKey(className);

    // 1. Check direct per-class key (e.g. eduplay_students_5b)
    const directData = localStorage.getItem(`eduplay_students_${key}`);
    if (directData) {
      const parsed = JSON.parse(directData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateAndNormalizeStudents(parsed, stdName);
      }
    }

    // 2. Check full database key (eduplay_students_database)
    const fullDbData = localStorage.getItem(EDUPLAY_STUDENTS_DB_KEY);
    if (fullDbData) {
      const parsedDb = JSON.parse(fullDbData);
      if (parsedDb && typeof parsedDb === 'object') {
        if (Array.isArray(parsedDb[stdName]) && parsedDb[stdName].length > 0) {
          return deduplicateAndNormalizeStudents(parsedDb[stdName], stdName);
        }
        if (Array.isArray(parsedDb[key]) && parsedDb[key].length > 0) {
          return deduplicateAndNormalizeStudents(parsedDb[key], stdName);
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc LocalStorage học sinh:', err);
  }

  return null;
}

/**
 * Get all students for all classes from LocalStorage with dual key resolution
 */
export function getAllStudentsFromLocalStorage(): Record<string, StudentRecord[]> {
  if (typeof window === 'undefined') return getInitialStudentDatabase();

  const cleanedDb: Record<string, StudentRecord[]> = {};

  try {
    // 1. Read master database object
    const fullDbData = localStorage.getItem(EDUPLAY_STUDENTS_DB_KEY);
    if (fullDbData) {
      const parsedDb = JSON.parse(fullDbData);
      if (parsedDb && typeof parsedDb === 'object') {
        Object.entries(parsedDb).forEach(([cls, list]) => {
          if (Array.isArray(list) && list.length > 0) {
            const stdName = getStandardClassName(cls);
            const key = normalizeClassKey(cls);
            const deduped = deduplicateAndNormalizeStudents(list as StudentRecord[], stdName);
            cleanedDb[stdName] = deduped;
            cleanedDb[key] = deduped;
          }
        });
      }
    }

    // 2. Scan all individual per-class storage keys (e.g. eduplay_students_5D, eduplay_students_5C, etc.)
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith('eduplay_students_') && storageKey !== EDUPLAY_STUDENTS_DB_KEY) {
        const classKey = storageKey.replace('eduplay_students_', '').trim();
        const stdName = getStandardClassName(classKey);
        const normKey = normalizeClassKey(classKey);
        if (!cleanedDb[stdName] || cleanedDb[stdName].length === 0) {
          const itemData = localStorage.getItem(storageKey);
          if (itemData) {
            try {
              const parsed = JSON.parse(itemData);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const deduped = deduplicateAndNormalizeStudents(parsed, stdName);
                cleanedDb[stdName] = deduped;
                cleanedDb[normKey] = deduped;
              }
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc toàn bộ LocalStorage học sinh:', err);
  }

  return cleanedDb;
}

/**
 * Save all students database to LocalStorage & per-class keys (guaranteeing both standard and short key entries)
 */
export function saveAllStudentsToLocalStorage(dbData: Record<string, StudentRecord[]>) {
  if (typeof window === 'undefined') return;

  try {
    const cleanedDb: Record<string, StudentRecord[]> = {};
    Object.entries(dbData).forEach(([clsName, students]) => {
      if (!Array.isArray(students) || students.length === 0) return;
      const stdName = getStandardClassName(clsName);
      const key = normalizeClassKey(clsName);
      const cleaned = deduplicateAndNormalizeStudents(students, stdName);
      cleanedDb[stdName] = cleaned;
      cleanedDb[key] = cleaned;
      localStorage.setItem(`eduplay_students_${key}`, JSON.stringify(cleaned));
      if (key !== key.toLowerCase()) {
        localStorage.setItem(`eduplay_students_${key.toLowerCase()}`, JSON.stringify(cleaned));
      }
    });

    localStorage.setItem(EDUPLAY_STUDENTS_DB_KEY, JSON.stringify(cleanedDb));

    // Dispatch real-time events for instant UI synchronization
    window.dispatchEvent(
      new CustomEvent('student-data-updated', {
        detail: { action: 'all-updated', dbData: cleanedDb, timestamp: Date.now() }
      })
    );
    window.dispatchEvent(
      new CustomEvent('eduplay_students_updated', {
        detail: { action: 'all-updated' }
      })
    );
  } catch (err) {
    console.error('Lỗi lưu toàn bộ học sinh vào LocalStorage:', err);
  }
}

/**
 * Save students for a specific class to LocalStorage & dispatch window events
 */
export function saveStudentsToLocalStorage(className: string, students: StudentRecord[]) {
  if (typeof window === 'undefined') return;

  try {
    const stdName = getStandardClassName(className);
    const key = normalizeClassKey(className);
    const cleaned = deduplicateAndNormalizeStudents(students, stdName);

    // 1. Save to direct per-class key (e.g. eduplay_students_5b)
    localStorage.setItem(`eduplay_students_${key}`, JSON.stringify(cleaned));

    // 2. Update the full database object
    let fullDb: Record<string, StudentRecord[]> = {};
    const fullDbData = localStorage.getItem(EDUPLAY_STUDENTS_DB_KEY);
    if (fullDbData) {
      try {
        fullDb = JSON.parse(fullDbData) || {};
      } catch {
        fullDb = {};
      }
    }
    fullDb[stdName] = cleaned;
    localStorage.setItem(EDUPLAY_STUDENTS_DB_KEY, JSON.stringify(fullDb));

    // 3. Dispatch real-time events for instant UI reactivity across components
    window.dispatchEvent(
      new CustomEvent('student-data-updated', {
        detail: {
          className: stdName,
          classKey: key,
          count: cleaned.length,
          students: cleaned,
          action: 'saved',
          timestamp: Date.now()
        }
      })
    );
    window.dispatchEvent(
      new CustomEvent('eduplay_students_updated', {
        detail: { className: stdName, classKey: key, count: cleaned.length }
      })
    );
  } catch (err) {
    console.error('Lỗi lưu học sinh vào LocalStorage:', err);
  }
}

/**
 * Add or update a single student in a class, updating cache and publishing events
 */
export function addOrUpdateStudentInClass(className: string, student: StudentRecord): StudentRecord[] {
  const stdName = getStandardClassName(className);
  const currentList = getStudentsFromLocalStorage(stdName) || [];
  const existingIdx = currentList.findIndex(s => s.id === student.id || (s.code && s.code === student.code));

  let updatedList: StudentRecord[];
  if (existingIdx >= 0) {
    updatedList = [...currentList];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...student, className: stdName };
  } else {
    updatedList = [...currentList, { ...student, className: stdName }];
  }

  saveStudentsToLocalStorage(stdName, updatedList);
  syncClassStudentsToFirestore(stdName, updatedList).catch(() => {});

  window.dispatchEvent(
    new CustomEvent('student-data-updated', {
      detail: {
        className: stdName,
        action: existingIdx >= 0 ? 'student-updated' : 'student-added',
        student,
        timestamp: Date.now()
      }
    })
  );

  return updatedList;
}

/**
 * Delete a single student from a class, updating cache and publishing events
 */
export function deleteStudentFromClass(className: string, studentId: string): StudentRecord[] {
  const stdName = getStandardClassName(className);
  const currentList = getStudentsFromLocalStorage(stdName) || [];
  const target = currentList.find(s => s.id === studentId || s.code === studentId);
  const updatedList = currentList.filter(s => s.id !== studentId && s.code !== studentId);

  saveStudentsToLocalStorage(stdName, updatedList);
  syncClassStudentsToFirestore(stdName, updatedList).catch(() => {});
  if (target) {
    deleteStudentPermanently(stdName, target).catch(() => {});
  }

  window.dispatchEvent(
    new CustomEvent('student-data-updated', {
      detail: {
        className: stdName,
        action: 'student-deleted',
        deletedStudentId: studentId,
        count: updatedList.length,
        timestamp: Date.now()
      }
    })
  );

  return updatedList;
}

/**
 * Completely delete a student from a class across:
 * 1. Class roster in local cache & LocalStorage
 * 2. Firestore 'class_rosters' collection (both normalized uppercase and lowercase documents)
 * 3. Firestore 'students' collection (individual documents by ID/Code/query)
 * 4. Real-time window sync events
 */
export async function deleteStudentPermanently(
  className: string,
  student: StudentRecord
): Promise<{ success: boolean; error?: string; remainingStudents: StudentRecord[] }> {
  try {
    const stdName = getStandardClassName(className);
    const classKey = normalizeClassKey(className);

    // 1. Get current list from LocalStorage / memory
    const currentList = getStudentsFromLocalStorage(stdName) || [];
    
    // Robust filter checking ID, Code, SDDCN, or exact name + DOB
    const filtered = currentList.filter(s => {
      if (student.id && s.id && s.id === student.id) return false;
      if (student.code && s.code && s.code.toLowerCase() === student.code.toLowerCase()) return false;
      if (student.sddcn && s.sddcn && s.sddcn === student.sddcn) return false;
      if (s.name === student.name && s.dob === student.dob && s.dob) return false;
      return true;
    });

    const updated = deduplicateAndNormalizeStudents(filtered, stdName);

    // 2. Save updated list to LocalStorage immediately
    saveStudentsToLocalStorage(stdName, updated);
    saveStudentsToLocalStorage(classKey, updated);

    // 3. Sync to Firestore
    if (db) {
      const maleCount = updated.filter((s) => s.gender === 'Nam').length;
      const femaleCount = updated.filter((s) => s.gender === 'Nữ').length;

      const sanitizedUpdated = updated.map((st) => sanitizeStudentForFirestore(st, stdName));

      // 3a. Update 'class_rosters' document (uppercase key)
      const rosterRefUpper = doc(db, 'class_rosters', classKey);
      await setDoc(
        rosterRefUpper,
        {
          className: stdName,
          classKey,
          totalStudents: sanitizedUpdated.length,
          male: maleCount,
          female: femaleCount,
          students: sanitizedUpdated,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      // Also update lowercase key if present
      if (classKey !== classKey.toLowerCase()) {
        try {
          const lowerRef = doc(db, 'class_rosters', classKey.toLowerCase());
          const lowerSnap = await getDoc(lowerRef);
          if (lowerSnap.exists()) {
            await setDoc(
              lowerRef,
              {
                className: stdName,
                classKey: classKey.toLowerCase(),
                totalStudents: sanitizedUpdated.length,
                male: maleCount,
                female: femaleCount,
                students: sanitizedUpdated,
                updatedAt: new Date().toISOString()
              },
              { merge: true }
            );
          }
        } catch (err) {
          console.warn('Lower roster sync warning:', err);
        }
      }

      // 3b. Delete individual student document from 'students' collection if exists
      if (student.id) {
        try {
          await deleteDoc(doc(db, 'students', student.id));
        } catch (err) {
          console.warn(`Could not delete doc students/${student.id}:`, err);
        }
      }
      if (student.code) {
        try {
          await deleteDoc(doc(db, 'students', student.code));
        } catch (err) {
          console.warn(`Could not delete doc students/${student.code}:`, err);
        }
      }

      // Delete by query if any matching document exists in 'students'
      try {
        if (student.code) {
          const qCode = query(collection(db, 'students'), where('code', '==', student.code));
          const qSnap = await getDocs(qCode);
          if (!qSnap.empty) {
            const batch = writeBatch(db);
            qSnap.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      } catch (err) {
        console.warn('Query delete student warning:', err);
      }
    }

    // 4. Dispatch live sync events
    window.dispatchEvent(
      new CustomEvent('student-data-updated', {
        detail: {
          className: stdName,
          classKey,
          deletedStudent: student,
          count: updated.length,
          students: updated,
          action: 'student-deleted',
          timestamp: Date.now()
        }
      })
    );
    window.dispatchEvent(
      new CustomEvent('eduplay_students_updated', {
        detail: {
          className: stdName,
          classKey,
          count: updated.length,
          action: 'student-deleted'
        }
      })
    );

    return { success: true, remainingStudents: updated };
  } catch (err: any) {
    console.error('Lỗi khi xóa học sinh:', err);
    return { success: false, error: err?.message || String(err), remainingStudents: [] };
  }
}

/**
 * Completely delete all students from a class across:
 * 1. Class roster in local cache & LocalStorage
 * 2. Firestore 'class_rosters' collection (sets students: [], totalStudents: 0, male: 0, female: 0)
 * 3. Firestore 'students' collection (individual documents belonging to the class)
 * 4. Real-time window sync events
 */
export async function deleteAllStudentsInClassPermanently(
  className: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const stdName = getStandardClassName(className);
    const classKey = normalizeClassKey(className);

    // 1. Save empty array to LocalStorage immediately
    saveStudentsToLocalStorage(stdName, []);
    saveStudentsToLocalStorage(classKey, []);

    // 2. Sync to Firestore
    if (db) {
      // 2a. Update 'class_rosters' document with empty array
      const rosterRefUpper = doc(db, 'class_rosters', classKey);
      await setDoc(
        rosterRefUpper,
        {
          className: stdName,
          classKey,
          totalStudents: 0,
          male: 0,
          female: 0,
          students: [],
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      // Also update lowercase key if present
      if (classKey !== classKey.toLowerCase()) {
        try {
          const lowerRef = doc(db, 'class_rosters', classKey.toLowerCase());
          await setDoc(
            lowerRef,
            {
              className: stdName,
              classKey: classKey.toLowerCase(),
              totalStudents: 0,
              male: 0,
              female: 0,
              students: [],
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Lower roster clear warning:', err);
        }
      }

      // 2b. Delete any individual student docs from 'students' collection matching class
      try {
        const qClass = query(collection(db, 'students'), where('className', 'in', [stdName, classKey, className]));
        const qSnap = await getDocs(qClass);
        if (!qSnap.empty) {
          const batch = writeBatch(db);
          qSnap.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Delete students batch error:', err);
      }
    }

    // 3. Dispatch live sync events
    window.dispatchEvent(
      new CustomEvent('student-data-updated', {
        detail: {
          className: stdName,
          classKey,
          count: 0,
          students: [],
          action: 'all-students-deleted',
          timestamp: Date.now()
        }
      })
    );
    window.dispatchEvent(
      new CustomEvent('eduplay_students_updated', {
        detail: {
          className: stdName,
          classKey,
          count: 0,
          action: 'all-students-deleted'
        }
      })
    );

    return { success: true };
  } catch (err: any) {
    console.error('Lỗi khi xóa toàn bộ học sinh lớp:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Sync / Save students of a class to Firestore
 */
export async function syncClassStudentsToFirestore(
  className: string,
  students: StudentRecord[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!db) {
      return { success: false, error: 'Chưa khởi tạo Firestore' };
    }

    const stdName = getStandardClassName(className);
    const classKey = normalizeClassKey(className);
    const cleaned = deduplicateAndNormalizeStudents(students, stdName);

    const maleCount = cleaned.filter((s) => s.gender === 'Nam').length;
    const femaleCount = cleaned.filter((s) => s.gender === 'Nữ').length;

    const sanitizedStudents = cleaned.map((st) => sanitizeStudentForFirestore(st, stdName));

    // 1. Save full roster document in 'class_rosters' collection
    const rosterRef = doc(db, 'class_rosters', classKey);
    await setDoc(
      rosterRef,
      {
        className: stdName,
        classKey,
        totalStudents: sanitizedStudents.length,
        male: maleCount,
        female: femaleCount,
        students: sanitizedStudents,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    // Also update lowercase key if present
    if (classKey !== classKey.toLowerCase()) {
      try {
        const lowerRef = doc(db, 'class_rosters', classKey.toLowerCase());
        await setDoc(
          lowerRef,
          {
            className: stdName,
            classKey: classKey.toLowerCase(),
            totalStudents: sanitizedStudents.length,
            male: maleCount,
            female: femaleCount,
            students: sanitizedStudents,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Lower roster sync warning:', err);
      }
    }

    // 2. Also update 'classes' collection summary document with correct schema fields
    const classSummaryRef = doc(db, 'classes', classKey);
    await setDoc(
      classSummaryRef,
      {
        id: classKey,
        name: stdName,
        grade: `Khối ${stdName.replace(/[^0-9]/g, '')}`,
        room: 'Phòng học',
        subjects: PRIMARY_SCHOOL_SUBJECTS.map(s => ({ isVisible: true, subjectName: s }))
      },
      { merge: true }
    );

    return { success: true };
  } catch (err: any) {
    console.warn('Lỗi đồng bộ học sinh lên Firestore:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Fetch students of a class from Firestore
 */
export async function fetchClassStudentsFromFirestore(className: string): Promise<StudentRecord[] | null> {
  try {
    if (!db) return null;

    const classKey = normalizeClassKey(className);
    let rosterRef = doc(db, 'class_rosters', classKey);
    let docSnap = await getDoc(rosterRef);

    if (!docSnap.exists() && classKey !== classKey.toLowerCase()) {
      rosterRef = doc(db, 'class_rosters', classKey.toLowerCase());
      docSnap = await getDoc(rosterRef);
    }

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data?.students) && data.students.length > 0) {
        const cleaned = deduplicateAndNormalizeStudents(data.students as StudentRecord[], className);
        // Cache to LocalStorage immediately
        saveStudentsToLocalStorage(className, cleaned);
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('Không thể đọc dữ liệu học sinh từ Firestore (sử dụng offline cache):', err);
  }

  return null;
}

/**
 * Fetch all classes student rosters from Firestore with parallel promise handling and key normalization
 */
export async function fetchAllStudentsFromFirestore(): Promise<Record<string, StudentRecord[]>> {
  if (!db) return {};

  const allRosters: Record<string, StudentRecord[]> = {};

  try {
    // 1. Fetch all documents from 'class_rosters' collection in parallel
    const rostersSnap = await getDocs(collection(db, 'class_rosters'));
    const rosterUpdatedAtMap: Record<string, string> = {};
    if (!rostersSnap.empty) {
      rostersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const rawName = (data.className || data.name || data.classKey || data.id || docSnap.id || '').trim();
        if (rawName) {
          const stdName = getStandardClassName(rawName);
          const upperKey = normalizeClassKey(rawName);
          const studentList = Array.isArray(data.students)
            ? data.students
            : (Array.isArray(data.studentList) ? data.studentList : (Array.isArray(data.roster) ? data.roster : []));

          if (Array.isArray(studentList) && studentList.length > 0) {
            const docUpdatedAt = String(data.updatedAt || '');
            const prevUpdatedAt = rosterUpdatedAtMap[upperKey] || '';
            const isCanonicalId = docSnap.id === upperKey;
            // Only overwrite if this doc is newer, or if no doc was stored yet, or if this is the canonical uppercase doc and timestamps are equal
            if (!allRosters[stdName] || (docUpdatedAt && docUpdatedAt > prevUpdatedAt) || (isCanonicalId && docUpdatedAt >= prevUpdatedAt)) {
              const cleaned = deduplicateAndNormalizeStudents(studentList as StudentRecord[], stdName);
              allRosters[stdName] = cleaned;
              allRosters[upperKey] = cleaned;
              rosterUpdatedAtMap[upperKey] = docUpdatedAt;
              try {
                localStorage.setItem(`eduplay_students_${upperKey}`, JSON.stringify(cleaned));
              } catch {}
            }
          }
        }
      });
    }

    // 2. If 'students' collection exists with individual docs, ONLY use for classes that do NOT have a class_rosters entry
    try {
      const studentsSnap = await getDocs(collection(db, 'students'));
      if (!studentsSnap.empty) {
        const individualByClass: Record<string, StudentRecord[]> = {};
        studentsSnap.forEach((d) => {
          const sData = d.data() as StudentRecord;
          const cls = sData.className || (sData as any).class || (sData as any).classId || (sData as any).lop;
          if (cls) {
            const stdName = getStandardClassName(cls);
            if (!individualByClass[stdName]) individualByClass[stdName] = [];
            individualByClass[stdName].push({ ...sData, id: sData.id || d.id });
          }
        });

        Object.entries(individualByClass).forEach(([stdName, stList]) => {
          const upperKey = normalizeClassKey(stdName);
          // Do not pollute authoritative class_rosters with stale individual student docs
          if (allRosters[stdName] && allRosters[stdName].length > 0) {
            return;
          }
          const cleaned = deduplicateAndNormalizeStudents(stList, stdName);
          allRosters[stdName] = cleaned;
          allRosters[upperKey] = cleaned;
        });
      }
    } catch {}

    // Save aggregated result to LocalStorage
    if (Object.keys(allRosters).length > 0) {
      saveAllStudentsToLocalStorage(allRosters);
    }
  } catch (err) {
    console.warn('Lỗi tải toàn bộ học sinh từ Firestore:', err);
  }

  return allRosters;
}

/**
 * Real-time listener for a class's student roster from Firestore
 */
export function subscribeToFirestoreClassStudents(
  className: string,
  onUpdate: (students: StudentRecord[]) => void
): () => void {
  if (!db) return () => {};

  const classKey = normalizeClassKey(className);
  const rosterRef = doc(db, 'class_rosters', classKey);

  const unsubscribe = onSnapshot(
    rosterRef,
    async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.students)) {
          saveStudentsToLocalStorage(className, data.students);
          onUpdate(data.students as StudentRecord[]);
        }
      } else if (classKey !== classKey.toLowerCase()) {
        // Fallback to lowercase document if uppercase is not created yet
        try {
          const lowerSnap = await getDoc(doc(db, 'class_rosters', classKey.toLowerCase()));
          if (lowerSnap.exists()) {
            const data = lowerSnap.data();
            if (Array.isArray(data?.students)) {
              saveStudentsToLocalStorage(className, data.students);
              onUpdate(data.students as StudentRecord[]);
            }
          }
        } catch {}
      }
    },
    (error) => {
      console.warn(`Firestore onSnapshot warning for class ${className}:`, error);
    }
  );

  return unsubscribe;
}

/**
 * Load students with guaranteed persistence (LocalStorage -> Firestore -> Default)
 */
export async function loadStudentsWithPersistence(className: string): Promise<StudentRecord[]> {
  const stdName = getStandardClassName(className);

  // 1. Try local storage first (instant synchronous)
  const localData = getStudentsFromLocalStorage(stdName);
  if (localData && localData.length > 0) {
    // Attempt background Firestore sync
    fetchClassStudentsFromFirestore(stdName).catch(() => {});
    return localData;
  }

  // 2. Try Firestore fetch
  const firestoreData = await fetchClassStudentsFromFirestore(stdName);
  if (firestoreData && firestoreData.length > 0) {
    return firestoreData;
  }

  // 3. If no student records exist in LocalStorage or Firestore, return empty list (no mock fallback)
  return [];
}
