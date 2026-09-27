import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

export interface LiveQuizParticipant {
  id: string; // doc ID: targetId_studentId
  targetId: string; // assignmentId or examId
  targetTitle: string;
  subject?: string;
  grade?: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  studentAvatar?: string;
  status: 'in_progress' | 'completed' | 'left';
  answeredCount: number;
  totalQuestions: number;
  score?: number; // scale 0-10
  scoreStr?: string; // e.g. "10.0 / 10"
  percentage?: number; // 0 - 100
  timeSpentSeconds?: number;
  startedAt?: number;
  updatedAt?: number;
  completedAt?: number;
}

const COLLECTION_NAME = 'quiz_live_sessions';
const LOCAL_STORAGE_KEY_PREFIX = 'eduplay_live_quiz_';

// Helper to sanitize doc ID for Firestore
function getDocId(targetId: string, studentId: string): string {
  const cleanTarget = String(targetId || 'target').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStudent = String(studentId || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanTarget}_${cleanStudent}`;
}

// Clean up any legacy seed records & old cached quiz sessions from localStorage
function cleanupLegacySeedStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Remove all old live quiz local cache and any legacy mock seed keys
      if (
        k.startsWith(LOCAL_STORAGE_KEY_PREFIX) ||
        k.includes('seed_st_') ||
        k.includes('eduplay_mock')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {}
}

// Run cleanup immediately on load to purge all old mock entries from client browser
cleanupLegacySeedStorage();

/**
 * Join live quiz session (student starts answering)
 */
export async function joinQuizLiveSession(params: {
  targetId: string;
  targetTitle: string;
  subject?: string;
  grade?: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  studentAvatar?: string;
  totalQuestions: number;
}): Promise<void> {
  const {
    targetId,
    targetTitle,
    subject = 'Tin học',
    grade = 'Khối 5',
    studentId,
    studentName,
    studentClass,
    studentAvatar = '🌟',
    totalQuestions
  } = params;

  if (!targetId || !studentId) return;

  const docId = getDocId(targetId, studentId);
  const now = Date.now();

  const data: LiveQuizParticipant = {
    id: docId,
    targetId,
    targetTitle,
    subject,
    grade,
    studentId,
    studentName,
    studentClass,
    studentAvatar,
    status: 'in_progress',
    answeredCount: 0,
    totalQuestions: totalQuestions || 10,
    startedAt: now,
    updatedAt: now
  };

  // 1. Save local backup
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${targetId}_${studentId}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('eduplay_live_quiz_update', { detail: { targetId } }));
  } catch {}

  // 2. Sync to Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    console.warn('Firestore joinQuizLiveSession error:', err);
  }
}

/**
 * Update quiz progress (when student answers questions or switches question)
 */
let updateDebounceTimers: Record<string, any> = {};

export async function updateQuizLiveProgress(params: {
  targetId: string;
  studentId: string;
  answeredCount: number;
  totalQuestions?: number;
}): Promise<void> {
  const { targetId, studentId, answeredCount, totalQuestions } = params;
  if (!targetId || !studentId) return;

  const docId = getDocId(targetId, studentId);
  const now = Date.now();
  const safeAnsweredCount = Math.max(0, Math.floor(Number(answeredCount) || 0));

  // Debounce Firestore writes to prevent spamming
  const debounceKey = `${targetId}_${studentId}`;
  if (updateDebounceTimers[debounceKey]) {
    clearTimeout(updateDebounceTimers[debounceKey]);
  }

  updateDebounceTimers[debounceKey] = setTimeout(async () => {
    try {
      const docRef = doc(db, COLLECTION_NAME, docId);
      await setDoc(
        docRef,
        {
          answeredCount: safeAnsweredCount,
          ...(totalQuestions ? { totalQuestions } : {}),
          updatedAt: now,
          status: 'in_progress'
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore updateQuizLiveProgress error:', err);
    }
  }, 500);
}

/**
 * Complete quiz live session (when student submits)
 */
export async function completeQuizLiveSession(params: {
  targetId: string;
  studentId: string;
  studentName?: string;
  studentClass?: string;
  studentAvatar?: string;
  score: number;
  scoreStr?: string;
  percentage?: number;
  totalQuestions: number;
  answeredCount?: number;
  timeSpentSeconds?: number;
}): Promise<void> {
  const {
    targetId,
    studentId,
    studentName,
    studentClass,
    studentAvatar,
    score,
    scoreStr,
    percentage,
    totalQuestions,
    answeredCount,
    timeSpentSeconds
  } = params;

  if (!targetId || !studentId) return;

  const docId = getDocId(targetId, studentId);
  const now = Date.now();

  const patch: Partial<LiveQuizParticipant> = {
    status: 'completed',
    score: typeof score === 'number' ? score : parseFloat(String(score)) || 0,
    scoreStr: scoreStr || `${score.toFixed(1)} / 10`,
    percentage: percentage !== undefined ? percentage : Math.round(((score || 0) / 10) * 100),
    answeredCount: answeredCount || totalQuestions,
    totalQuestions,
    timeSpentSeconds: timeSpentSeconds || 300,
    completedAt: now,
    updatedAt: now
  };

  if (studentName) patch.studentName = studentName;
  if (studentClass) patch.studentClass = studentClass;
  if (studentAvatar) patch.studentAvatar = studentAvatar;

  // 1. Update local storage
  try {
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${targetId}_${studentId}`;
    const raw = localStorage.getItem(localKey);
    let parsed: any = {};
    if (raw) parsed = JSON.parse(raw);
    Object.assign(parsed, patch);
    localStorage.setItem(localKey, JSON.stringify(parsed));
    window.dispatchEvent(new CustomEvent('eduplay_live_quiz_update', { detail: { targetId } }));
  } catch {}

  // 2. Update Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, patch, { merge: true });
  } catch (err) {
    console.warn('Firestore completeQuizLiveSession error:', err);
  }
}

/**
 * Leave quiz session without completing
 */
export async function leaveQuizLiveSession(params: {
  targetId: string;
  studentId: string;
}): Promise<void> {
  const { targetId, studentId } = params;
  if (!targetId || !studentId) return;

  const docId = getDocId(targetId, studentId);
  const now = Date.now();

  try {
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${targetId}_${studentId}`;
    localStorage.removeItem(localKey);
    window.dispatchEvent(new CustomEvent('eduplay_live_quiz_update', { detail: { targetId } }));
  } catch {}

  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, { status: 'left', updatedAt: now }, { merge: true });
  } catch (err) {
    console.warn('Firestore leaveQuizLiveSession error:', err);
  }
}

/**
 * Subscribe to real-time participants for a specific targetId (Exam / Assignment)
 */
export function subscribeQuizLiveParticipants(
  targetId: string,
  targetTitle: string,
  totalQuestions: number,
  onUpdate: (data: {
    completedList: LiveQuizParticipant[];
    inProgressList: LiveQuizParticipant[];
    totalCompleted: number;
    totalInProgress: number;
  }) => void
): () => void {
  if (!targetId) {
    onUpdate({ completedList: [], inProgressList: [], totalCompleted: 0, totalInProgress: 0 });
    return () => {};
  }

  const processAndNotify = (firestoreDocs: LiveQuizParticipant[]) => {
    // 100% Real Firestore data source - no localStorage mock scanning
    const map = new Map<string, LiveQuizParticipant>();

    firestoreDocs.forEach(docData => {
      if (docData && docData.studentId && !docData.studentId.startsWith('seed_st_')) {
        // Enforce non-negative answeredCount
        const safeAnsweredCount = Math.max(0, Math.floor(Number(docData.answeredCount) || 0));
        map.set(docData.studentId, {
          ...docData,
          answeredCount: safeAnsweredCount
        });
      }
    });

    const all = Array.from(map.values()).filter(p => !p.studentId?.startsWith('seed_st_'));

    // 1. Completed list (Leaderboard) - strictly from docs with status === 'completed'
    // Sort: score DESC, then completedAt ASC / timeSpentSeconds ASC
    const completedList = all
      .filter(p => p.status === 'completed' && p.score !== undefined && !isNaN(Number(p.score)))
      .sort((a, b) => {
        const scoreA = Number(a.score) || 0;
        const scoreB = Number(b.score) || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        const timeA = a.timeSpentSeconds || 9999;
        const timeB = b.timeSpentSeconds || 9999;
        if (timeA !== timeB) return timeA - timeB;
        return (a.completedAt || 0) - (b.completedAt || 0);
      });

    // 2. In progress list - strictly from docs with status === 'in_progress'
    // Exclude stale sessions older than 15 minutes
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    const inProgressList = all
      .filter(p => p.status === 'in_progress' && p.updatedAt && p.updatedAt > fifteenMinutesAgo)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    onUpdate({
      completedList,
      inProgressList,
      totalCompleted: completedList.length,
      totalInProgress: inProgressList.length
    });
  };

  // Firestore query onSnapshot - single source of real-time truth
  let unsubFirestore: (() => void) | null = null;
  try {
    const q = query(collection(db, COLLECTION_NAME), where('targetId', '==', targetId));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const docs: LiveQuizParticipant[] = [];
        snapshot.forEach(docSnap => {
          docs.push({ id: docSnap.id, ...docSnap.data() } as LiveQuizParticipant);
        });
        processAndNotify(docs);
      },
      (error) => {
        console.warn('Firestore onSnapshot live quiz warning:', error);
        processAndNotify([]);
      }
    );
  } catch (err) {
    console.warn('Error creating Firestore live quiz snapshot query:', err);
    processAndNotify([]);
  }

  // Cleanup
  return () => {
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}
