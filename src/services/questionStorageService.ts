import { QuestionItem } from '../types';
import { normalizeQuestionType } from '../lib/constants';
import { db, auth } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { INITIAL_QUESTIONS } from './mockData';

export const QUESTIONS_CACHE_KEY = 'eduplay_questions_database_cache';
export const QUESTIONS_COLLECTION = 'questions';

export enum FirestoreOpType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: FirestoreOpType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: FirestoreOpType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function fixMisTypedTrueFalseQuestions(questions: QuestionItem[]): { fixedQuestions: QuestionItem[]; fixedCount: number; fixedIds: string[] } {
  let fixedCount = 0;
  const fixedIds: string[] = [];
  const fixedQuestions = (questions || []).map(q => {
    if (!q) return q;
    const normalized = normalizeQuestionType(q.type);
    if (normalized !== q.type) {
      fixedCount++;
      fixedIds.push(q.id);
      return {
        ...q,
        type: normalized
      };
    }
    return q;
  });
  return { fixedQuestions, fixedCount, fixedIds };
}

export function getSubjectCodePrefix(subject: string): string {
  const norm = (subject || '').trim().toLowerCase();
  if (norm.includes('tin') || norm.includes('thông tin') || norm.includes('it') || norm.includes('máy tính') || norm.includes('cpu')) return 'TIN';
  if (norm.includes('công nghệ') || norm.includes('cong nghe') || norm.includes('tech')) return 'CONG';
  if (norm.includes('tiếng việt')) return 'TV';
  if (norm.includes('tiếng anh') || norm.includes('english')) return 'TA';
  if (norm.includes('toán') || norm.includes('math')) return 'TOAN';
  if (norm.includes('tự nhiên') || norm.includes('xã hội')) return 'TNXH';
  if (norm.includes('lịch sử') || norm.includes('địa lý')) return 'LSDL';
  if (norm.includes('đạo đức')) return 'DD';
  if (norm.includes('âm nhạc')) return 'AN';
  if (norm.includes('mĩ thuật') || norm.includes('mỹ thuật')) return 'MT';
  if (norm.includes('thể dục') || norm.includes('giáo dục thể chất')) return 'GDTC';

  const clean = norm.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();
  const res = clean.replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return res || 'TIN';
}

export function isGradeMatching(qGrade: string | undefined, filterGrade: string | undefined): boolean {
  if (!filterGrade || filterGrade === 'Tất cả các khối' || filterGrade === 'all') return true;
  if (!qGrade) return false;

  const normQ = String(qGrade).trim().toLowerCase().replace(/\s+/g, '');
  const normF = String(filterGrade).trim().toLowerCase().replace(/\s+/g, '');

  if (normQ === normF) return true;

  const numQ = normQ.match(/[345]/)?.[0];
  const numF = normF.match(/[345]/)?.[0];

  if (numQ && numF && numQ === numF) return true;

  return normQ.includes(normF) || normF.includes(normQ);
}

export function isSubjectMatching(qSubject: string | undefined, filterSubject: string | undefined): boolean {
  if (!filterSubject || filterSubject === 'Tất cả các môn' || filterSubject === 'all') return true;
  if (!qSubject) return false;

  const normQ = String(qSubject).trim().toLowerCase().replace(/\s+/g, '');
  const normF = String(filterSubject).trim().toLowerCase().replace(/\s+/g, '');

  return normQ === normF || normQ.includes(normF) || normF.includes(normQ);
}

export function isOrderingQuestionType(q: any): boolean {
  if (!q) return false;
  const t = String(q.type || '').trim().toLowerCase();
  return (
    t === 'ordering' ||
    t === 'sap_xep' ||
    t === 'sắp xếp' ||
    t === 'sắp xếp thứ tự' ||
    t === 'thứ tự'
  );
}

/**
 * Strips leading step prefixes like "1. ", "2) ", "Bước 1: " from an ordering step text
 */
export function stripOrderingPrefix(text: string): string {
  return String(text || '')
    .trim()
    .replace(/^(?:bước\s*\d+|thao\s*tác\s*\d+|\(\d+\)|\d+[\.\)\:])\s*/i, '')
    .trim();
}

/**
 * Resolves the true canonical (correct) sequence of steps for an ordering question.
 * Handles cases where `q.options` was stored in scrambled order while `q.correctAnswer`
 * (e.g. "2 -> 3 -> 1" or "3 -> 1 -> 2 -> 4") or `q.explanation` (e.g. "Phát hiện sự cố -> Ngắt điện ngay (tắt quạt) -> Báo người lớn...")
 * holds the true logical sequence.
 */
export function resolveCanonicalOrderingSteps(q: any): string[] {
  if (!q) return [];

  // 0. If the teacher explicitly edited/reordered the steps in the Question Editor,
  // strictly respect the saved step indices/order without heuristic overrides.
  if (q.teacherEditedOrder) {
    if (Array.isArray(q.orderingSteps) && q.orderingSteps.length > 0) {
      const sorted = [...q.orderingSteps]
        .sort((a: any, b: any) => (a.order ?? a.index ?? 0) - (b.order ?? b.index ?? 0))
        .map((s: any) => stripOrderingPrefix(String(s?.text ?? '')))
        .filter(Boolean);
      if (sorted.length > 0) return sorted;
    }
    if (Array.isArray(q.options) && q.options.length > 0) {
      return q.options.map((s: any) => stripOrderingPrefix(String(s ?? ''))).filter(Boolean);
    }
    if (Array.isArray(q.canonicalOptions) && q.canonicalOptions.length > 0) {
      return q.canonicalOptions.map((s: any) => stripOrderingPrefix(String(s ?? ''))).filter(Boolean);
    }
  }

  const orderedFromSteps: string[] =
    Array.isArray(q.orderingSteps) && q.orderingSteps.length > 0
      ? [...q.orderingSteps]
          .sort((a: any, b: any) => (a.order ?? a.index ?? 0) - (b.order ?? b.index ?? 0))
          .map((s: any) => String(s?.text ?? '').trim())
          .filter(Boolean)
      : [];

  const rawOptions: string[] =
    orderedFromSteps.length > 0
      ? orderedFromSteps
      : Array.isArray(q.canonicalOptions) && q.canonicalOptions.length > 0
      ? q.canonicalOptions.map(String)
      : Array.isArray(q.correctOrder) && q.correctOrder.length > 0
      ? q.correctOrder.map(String)
      : Array.isArray(q.options) && q.options.length > 0
      ? q.options.map(String)
      : Array.isArray(q.phuongAn) && q.phuongAn.length > 0
      ? q.phuongAn.map(String)
      : [];

  if (rawOptions.length === 0) return [];
  const n = rawOptions.length;
  const cleanOpts = rawOptions.map(stripOrderingPrefix);

  // 1. Domain/semantic rules for known elementary school ordering questions
  // Rule 1A: Xử lý sự cố quạt điện / thiết bị điện (Phát hiện sự cố -> Tắt quạt/Ngắt điện -> Thông báo người lớn)
  const hasDetect = cleanOpts.some(o => /phát hiện|nhận thấy|ngửi thấy|thấy quạt/i.test(o));
  const hasTurnOff = cleanOpts.some(o => /tắt quạt|bấm nút tắt|ngắt điện|rút phích/i.test(o));
  const hasInformAdult = cleanOpts.some(o => /thông báo|báo cho người lớn|người lớn/i.test(o));
  if (n === 3 && hasDetect && hasTurnOff && hasInformAdult) {
    const getPriority = (s: string) => {
      if (/phát hiện|nhận thấy|ngửi thấy|thấy quạt/i.test(s)) return 1;
      if (/tắt quạt|bấm nút tắt|ngắt điện|rút phích/i.test(s)) return 2;
      if (/thông báo|báo cho người lớn|người lớn/i.test(s)) return 3;
      return 4;
    };
    return [...cleanOpts].sort((a, b) => getPriority(a) - getPriority(b));
  }

  // Rule 1B: Quy trình xử lý thông tin và ra quyết định (Thu nhận -> Xử lý/suy nghĩ -> Đưa ra quyết định -> Thực hiện hành động)
  const hasReceiveInfo = cleanOpts.some(o => /thu nhận thông tin|tiếp nhận thông tin/i.test(o));
  const hasProcessInfo = cleanOpts.some(o => /xử lý.*suy nghĩ|suy nghĩ.*thông tin|xử lý thông tin/i.test(o));
  const hasMakeDecision = cleanOpts.some(o => /đưa ra quyết định|ra quyết định/i.test(o));
  if (hasReceiveInfo && hasProcessInfo && hasMakeDecision) {
    const getInfoPriority = (s: string) => {
      if (/thu nhận thông tin|tiếp nhận thông tin/i.test(s)) return 1;
      if (/xử lý.*suy nghĩ|suy nghĩ.*thông tin|xử lý thông tin/i.test(s)) return 2;
      if (/đưa ra quyết định|ra quyết định/i.test(s)) return 3;
      if (/thực hiện hành động|hành động theo quyết định/i.test(s)) return 4;
      return 5;
    };
    return [...cleanOpts].sort((a, b) => getInfoPriority(a) - getInfoPriority(b));
  }

  // Rule 1C: Sử dụng quạt điện / đèn học cơ bản (Đặt quạt/đèn -> Cắm phích điện -> Bật và điều chỉnh -> Tắt khi không dùng)
  const hasPlaceFan = cleanOpts.some(o => /đặt quạt|đặt đèn/i.test(o));
  const hasPlugIn = cleanOpts.some(o => /cắm phích|cắm điện/i.test(o));
  const hasTurnOnAdjust = cleanOpts.some(o => /bật quạt|bật đèn|bấm nút bật|chọn tốc độ|điều chỉnh/i.test(o));
  if (hasPlaceFan && hasPlugIn && hasTurnOnAdjust) {
    const getUsePriority = (s: string) => {
      if (/đặt quạt|đặt đèn/i.test(s)) return 1;
      if (/cắm phích|cắm điện/i.test(s)) return 2;
      if (/bật quạt|bật đèn|bấm nút bật|chọn tốc độ|điều chỉnh/i.test(s) && !/tắt/i.test(s)) return 3;
      if (/tắt/i.test(s)) return 4;
      return 5;
    };
    return [...cleanOpts].sort((a, b) => getUsePriority(a) - getUsePriority(b));
  }

  // Rule 1D: Vòng đời cây đậu (Hạt già rơi xuống đất -> Hút nước nảy mầm -> Cây con -> Ra hoa kết quả)
  const hasSeedFall = cleanOpts.some(o => /hạt.*rơi xuống đất/i.test(o));
  const hasSprout = cleanOpts.some(o => /nứt vỏ.*nảy mầm|hút nước.*nảy mầm/i.test(o));
  const hasFlower = cleanOpts.some(o => /ra hoa.*kết quả/i.test(o));
  if (hasSeedFall && hasSprout && hasFlower) {
    const getBeanPriority = (s: string) => {
      if (/hạt.*rơi xuống đất/i.test(s)) return 1;
      if (/nứt vỏ.*nảy mầm|hút nước.*nảy mầm/i.test(s)) return 2;
      if (/phát triển thành cây con/i.test(s)) return 3;
      if (/ra hoa.*kết quả/i.test(s)) return 4;
      return 5;
    };
    return [...cleanOpts].sort((a, b) => getBeanPriority(a) - getBeanPriority(b));
  }

  // 2. If correctAnswer is already an array of step strings
  if (Array.isArray(q.correctAnswer) && q.correctAnswer.length === n) {
    return q.correctAnswer.map(stripOrderingPrefix);
  }

  const rawAns = String(q.correctAnswer || q.answer || q.dapAn || '').trim();
  const rawExp = String(q.explanation || q.giaiThich || '').trim();

  // Helper to reorder options by 1-based permutation array [p1, p2, ..., pn]
  const reorderByIndices = (indices: number[]): string[] | null => {
    if (indices.length !== n) return null;
    const valid = indices.every(k => Number.isInteger(k) && k >= 1 && k <= n);
    if (!valid || new Set(indices).size !== n) return null;
    // Check if rawOptions had explicit prefix numbers "1.", "2.", etc.
    const byPrefix: string[] = [];
    for (const k of indices) {
      const found = rawOptions.find(opt => {
        const m = String(opt).trim().match(/^(?:bước\s*)?(\d+)[\.\)\:]/i);
        return m && Number(m[1]) === k;
      });
      if (found) byPrefix.push(stripOrderingPrefix(found));
    }
    if (byPrefix.length === n && new Set(byPrefix).size === n) {
      return byPrefix;
    }
    return indices.map(k => cleanOpts[k - 1]);
  };

  // 3. Check if `rawAns` is a numeric index permutation (e.g. "3 -> 1 -> 2 -> 4" or "2, 3, 1" or "2 - 3 - 1")
  if (rawAns && /^[\d\s,\-;>→=bước]+$/i.test(rawAns)) {
    const nums = (rawAns.match(/\d+/g) || []).map(Number);
    const isIdentity = nums.every((v, idx) => v === idx + 1);
    if (nums.length === n && !isIdentity) {
      const reordered = reorderByIndices(nums);
      if (reordered) return reordered;
    }
  }

  // 4. Check if `rawAns` or `rawExp` contains an arrow sequence (`->` or `→`)
  const arrowSources = [rawAns, rawExp].filter(s => s.includes('->') || s.includes('→'));
  for (const src of arrowSources) {
    const segments = src
      .split(/\s*(?:->|→)\s*/)
      .map(s => s.trim())
      .filter(Boolean);

    if (segments.length === n) {
      // 4A: Check if each segment starts with or contains a step index like "3 (Thu nhận...)"
      const segNums = segments.map((seg, idx) => {
        const cleanedSeg = idx === 0 && seg.includes(':') ? seg.split(':').pop()!.trim() : seg;
        const m = cleanedSeg.match(/^(\d+)\b/);
        return m ? Number(m[1]) : NaN;
      });
      if (segNums.every(k => !Number.isNaN(k))) {
        const isIdentity = segNums.every((v, idx) => v === idx + 1);
        if (!isIdentity) {
          const reordered = reorderByIndices(segNums);
          if (reordered) return reordered;
        }
      }

      // 4B: Check if segments are exact text matches with cleanOpts
      const exactMatches = segments.map(seg => {
        const cleanSeg = stripOrderingPrefix(seg).toLowerCase();
        return cleanOpts.find(opt => opt.toLowerCase() === cleanSeg);
      });
      if (exactMatches.every(Boolean) && new Set(exactMatches).size === n) {
        return exactMatches as string[];
      }

      // 4C: Keyword/semantic overlap matching between segments and cleanOpts
      const tokenize = (s: string): string[] =>
        s
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 2);

      const scorePair = (seg: string, opt: string): number => {
        const segWords = tokenize(seg);
        const optWords = new Set(tokenize(opt));
        let score = 0;
        for (const w of segWords) {
          if (optWords.has(w)) score += 2;
        }
        // Synonym boosts
        if (/ngắt điện|tắt/.test(seg.toLowerCase()) && /tắt|ngắt điện/.test(opt.toLowerCase())) score += 3;
        if (/báo|người lớn/.test(seg.toLowerCase()) && /thông báo|người lớn|báo/.test(opt.toLowerCase())) score += 3;
        if (/phát hiện|sự cố/.test(seg.toLowerCase()) && /phát hiện|rung lắc|sự cố/.test(opt.toLowerCase())) score += 3;
        return score;
      };

      // Find best permutation of 0..n-1 (for n <= 6)
      if (n <= 6) {
        const used = new Array(n).fill(false);
        const currentPerm: number[] = [];
        let bestPerm: number[] | null = null;
        let bestScore = -1;

        const backtrack = (stepIdx: number, totalScore: number) => {
          if (stepIdx === n) {
            if (totalScore > bestScore) {
              bestScore = totalScore;
              bestPerm = [...currentPerm];
            }
            return;
          }
          for (let i = 0; i < n; i++) {
            if (!used[i]) {
              const s = scorePair(segments[stepIdx], cleanOpts[i]);
              if (s > 0) {
                used[i] = true;
                currentPerm.push(i);
                backtrack(stepIdx + 1, totalScore + s);
                currentPerm.pop();
                used[i] = false;
              }
            }
          }
        };
        backtrack(0, 0);

        if (bestPerm && bestScore > 0) {
          return (bestPerm as number[]).map(idx => cleanOpts[idx]);
        }
      }
    }
  }

  return cleanOpts;
}

/**
 * Creates a shuffled copy of `canonicalSteps` for student display,
 * guaranteeing that the initial display order is NEVER identical to `canonicalSteps` (when length >= 2).
 */
export function createShuffledOrderingSteps(canonicalSteps: string[]): string[] {
  const clean = (canonicalSteps || []).map(stripOrderingPrefix);
  if (clean.length <= 1) return [...clean];

  const shuffled = [...clean];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  // Ensure shuffled order is never identical to the canonical answer key
  const isIdentical = shuffled.every((item, idx) => item === clean[idx]);
  if (isIdentical) {
    const first = shuffled[0];
    shuffled[0] = shuffled[1];
    shuffled[1] = first;
  }

  return shuffled;
}

/**
 * Clean & sanitize question data before saving to Firestore to prevent undefined or missing fields
 */
export function sanitizeQuestionForFirestore(q: any): QuestionItem & Record<string, any> {
  const safeId = q.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Normalize Grade string ("3" -> "Khối 3", "khối 3" -> "Khối 3")
  let rawGrade = String(q.grade || q.khoiLop || q.khoi || 'Khối 3').trim();
  if (/^[345]$/.test(rawGrade)) {
    rawGrade = `Khối ${rawGrade}`;
  } else if (rawGrade.toLowerCase().includes('khối')) {
    const num = rawGrade.match(/[345]/);
    if (num) rawGrade = `Khối ${num[0]}`;
  }

  // Normalize Subject
  let rawSubject = String(q.subject || q.monHoc || q.mon || 'Tin học').trim();

  // Normalize Content / Title / Question text
  let rawContent = String(q.content || q.title || q.question || q.questionText || q.noiDung || 'Nội dung câu hỏi').trim();

  // Auto-correct subject to "Tin học" if erroneously saved as "Toán" or if content is IT related
  const isITContent = /máy tính|cpu|thông tin|quyết định|chuột|bàn phím|phần mềm|mạng|internet|dữ liệu|biển báo|xử lý/i.test(rawContent);
  if (rawSubject === 'Toán' || rawSubject === 'TOÁN' || rawSubject === 'Toán học' || (isITContent && rawSubject.toLowerCase().includes('toán'))) {
    rawSubject = 'Tin học';
  }

  // Normalize Code
  const prefix = getSubjectCodePrefix(rawSubject);
  let rawCode = String(q.code || '').trim();
  if (!rawCode || rawCode.startsWith('CH-TOÁ') || rawCode.startsWith('CH-TOAN') || rawCode.startsWith('CH-TOA')) {
    const numMatch = rawCode.match(/\d+$/);
    const num = numMatch ? numMatch[0] : '01';
    rawCode = `CH-${prefix}-${num}`;
  }

  // Normalize Correct Answer
  let rawCorrectAnswer = String(q.correctAnswer || q.answer || q.dapAn || (q.type === 'essay' ? 'Gợi ý chấm tự luận' : 'A')).trim();

  // Normalize Level
  let rawLevel = String(q.level || q.mucDo || 'nhan_biet').trim();

  const qType = normalizeQuestionType(q.type);

  const cleanQ: QuestionItem & Record<string, any> = {
    id: String(safeId),
    code: rawCode,
    subject: rawSubject,
    monHoc: rawSubject,
    grade: rawGrade,
    khoiLop: rawGrade,
    level: (rawLevel as any) || 'nhan_biet',
    mucDo: rawLevel,
    type: qType,
    content: rawContent,
    title: rawContent,
    question: rawContent,
    lessonName: q.lessonName || q.baiHoc || 'Bài học',
    correctAnswer: rawCorrectAnswer,
    answer: rawCorrectAnswer,
    explanation: q.explanation || q.giaiThich || 'Hướng dẫn sư phạm cho câu hỏi.',
  };

  switch (qType) {
    case 'multiple_choice':
    case 'multiple_response': {
      if (Array.isArray(q.options) && q.options.length > 0) {
        cleanQ.options = q.options.filter(Boolean);
      } else if (Array.isArray(q.phuongAn) && q.phuongAn.length > 0) {
        cleanQ.options = q.phuongAn.filter(Boolean);
      } else {
        cleanQ.options = ['', '', '', ''];
      }
      break;
    }
    case 'ordering': {
      const rawOpts = Array.isArray(q.orderingSteps) && q.orderingSteps.length > 0
        ? [...q.orderingSteps]
            .sort((a: any, b: any) => (a.order ?? a.index ?? 0) - (b.order ?? b.index ?? 0))
            .map((s: any) => String(s?.text ?? '').trim())
            .filter(Boolean)
        : Array.isArray(q.options) && q.options.length > 0
        ? q.options.map((s: any) => String(s ?? '').trim()).filter(Boolean)
        : Array.isArray(q.canonicalOptions) && q.canonicalOptions.length > 0
        ? q.canonicalOptions.map((s: any) => String(s ?? '').trim()).filter(Boolean)
        : Array.isArray(q.phuongAn) && q.phuongAn.length > 0
        ? q.phuongAn.map((s: any) => String(s ?? '').trim()).filter(Boolean)
        : [];
      cleanQ.options = rawOpts;
      if (cleanQ.options.length > 0) {
        const canonicalSteps = q.teacherEditedOrder
          ? rawOpts.map(stripOrderingPrefix)
          : resolveCanonicalOrderingSteps({
              ...q,
              options: cleanQ.options,
              canonicalOptions: cleanQ.options,
              correctAnswer: rawCorrectAnswer,
              explanation: cleanQ.explanation
            });
        const finalSteps = canonicalSteps.length > 0 ? canonicalSteps : rawOpts;
        cleanQ.options = finalSteps;
        cleanQ.canonicalOptions = finalSteps;
        cleanQ.correctOrder = finalSteps;
        cleanQ.orderingSteps = finalSteps.map((text, idx) => ({
          text,
          index: idx,
          order: idx + 1,
        }));
        cleanQ.correctAnswer = finalSteps.join(' -> ');
        cleanQ.answer = cleanQ.correctAnswer;
        if (q.teacherEditedOrder) {
          cleanQ.teacherEditedOrder = true;
        }
      }
      break;
    }
    case 'true_false': {
      if (Array.isArray(q.statements) && q.statements.length > 0) {
        cleanQ.statements = q.statements.map((st: any) => ({
          statement: st.statement || st.content || '',
          isCorrect: Boolean(st.isCorrect),
          explanation: st.explanation || ''
        }));
      }
      break;
    }
    case 'matching': {
      if (Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0) {
        cleanQ.matchingPairs = q.matchingPairs.map((p: any) => ({
          left: p.left || '',
          right: p.right || '',
          match: p.match || ''
        }));
      }
      break;
    }
    case 'classification': {
      if (Array.isArray(q.classificationGroups) && q.classificationGroups.length > 0) {
        cleanQ.classificationGroups = q.classificationGroups.filter(Boolean);
      }
      if (Array.isArray(q.classificationItems) && q.classificationItems.length > 0) {
        cleanQ.classificationItems = q.classificationItems.map((item: any) => ({
          name: item.name || '',
          group: item.group || ''
        }));
      }
      break;
    }
    case 'fill_blank':
    case 'essay':
    default:
      break;
  }

  if (q.authorName) cleanQ.authorName = q.authorName;
  if (q.authorType) cleanQ.authorType = q.authorType;
  if (q.teacherId) cleanQ.teacherId = q.teacherId;
  if (q.teacherName) cleanQ.teacherName = q.teacherName;
  if (q.createdBy) cleanQ.createdBy = q.createdBy;
  if (q.createdAt) cleanQ.createdAt = q.createdAt;

  return cleanQ;
}

/**
 * Normalizes Firestore document data into standard QuestionItem
 */
export function normalizeQuestionFromFirestore(raw: any, docId: string): QuestionItem {
  if (!raw) raw = {};
  const safeId = docId || raw.id || `q-${Date.now()}`;
  return sanitizeQuestionForFirestore({ ...raw, id: safeId });
}

/**
 * Retrieve cached questions from localStorage
 */
export function getLocalCachedQuestions(): QuestionItem[] {
  let questions: QuestionItem[] = [];
  try {
    const raw = localStorage.getItem(QUESTIONS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        questions = parsed.map(item => normalizeQuestionFromFirestore(item, item.id));
      }
    }
  } catch (e) {
    console.warn('Could not read cached questions from localStorage', e);
  }
  const { fixedQuestions, fixedCount } = fixMisTypedTrueFalseQuestions(questions);
  if (fixedCount > 0) {
    saveLocalCachedQuestions(fixedQuestions);
  }
  return fixedQuestions;
}

/**
 * Save questions to local cache
 */
export function saveLocalCachedQuestions(questions: QuestionItem[]): void {
  try {
    localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(questions));
  } catch (e) {
    console.warn('Could not write questions to localStorage', e);
  }
}

/**
 * Dispatch notification toast
 */
export function notifyQuestionSaved(count: number = 1, title?: string) {
  const message = title || `Đã lưu thành công ${count} câu hỏi vào cơ sở dữ liệu!`;
  window.dispatchEvent(
    new CustomEvent('eduplay_toast', {
      detail: {
        type: 'success',
        title: 'Cơ sở dữ liệu đám mây',
        message
      }
    })
  );
}

/**
 * Propagate updated questions to any existing Exams or Assignments in Firestore
 * so snapshots inside exams/assignments always match the Question Bank.
 */
async function syncUpdatedQuestionsToExamsAndAssignments(updatedQuestions: QuestionItem[]): Promise<void> {
  if (!updatedQuestions || updatedQuestions.length === 0) return;
  const normalizeText = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const findMatch = (targetQ: any): QuestionItem | undefined => {
    if (!targetQ) return undefined;
    const tContent = normalizeText(targetQ.content || targetQ.question || targetQ.title);
    return updatedQuestions.find(uq => {
      if (uq.id && targetQ.id && uq.id === targetQ.id) return true;
      if (uq.code && targetQ.code && uq.code === targetQ.code && tContent && normalizeText(uq.content) === tContent) return true;
      if (tContent && normalizeText(uq.content) === tContent) return true;
      return false;
    });
  };

  try {
    const examsSnap = await getDocs(collection(db, 'exams'));
    for (const examDoc of examsSnap.docs) {
      const examData = examDoc.data();
      if (Array.isArray(examData.questions) && examData.questions.length > 0) {
        let changed = false;
        const nextQuestions = examData.questions.map((eq: any) => {
          const matched = findMatch(eq);
          if (matched) {
            changed = true;
            return {
              ...eq,
              type: matched.type,
              options: matched.options,
              canonicalOptions: matched.canonicalOptions || matched.options,
              correctOrder: matched.correctOrder || matched.options,
              orderingSteps: matched.orderingSteps,
              correctAnswer: matched.correctAnswer,
              explanation: matched.explanation || eq.explanation,
              teacherEditedOrder: matched.teacherEditedOrder,
            };
          }
          return eq;
        });
        if (changed) {
          await setDoc(doc(db, 'exams', examDoc.id), { ...examData, questions: nextQuestions }, { merge: true });
        }
      }
    }
  } catch (e) {
    console.warn('Could not sync updated questions to exams:', e);
  }

  try {
    const assignSnap = await getDocs(collection(db, 'assignments'));
    for (const assignDoc of assignSnap.docs) {
      const assignData = assignDoc.data();
      if (Array.isArray(assignData.questions) && assignData.questions.length > 0) {
        let changed = false;
        const nextQuestions = assignData.questions.map((aq: any) => {
          const matched = findMatch(aq);
          if (matched) {
            changed = true;
            return {
              ...aq,
              type: matched.type,
              options: matched.options,
              canonicalOptions: matched.canonicalOptions || matched.options,
              correctOrder: matched.correctOrder || matched.options,
              orderingSteps: matched.orderingSteps,
              correctAnswer: matched.correctAnswer,
              explanation: matched.explanation || aq.explanation,
              teacherEditedOrder: matched.teacherEditedOrder,
            };
          }
          return aq;
        });
        if (changed) {
          await setDoc(doc(db, 'assignments', assignDoc.id), { ...assignData, questions: nextQuestions }, { merge: true });
        }
      }
    }
  } catch (e) {
    console.warn('Could not sync updated questions to assignments:', e);
  }
}

/**
 * Save a single question to Firestore & cache
 */
export async function saveQuestionToFirestore(question: QuestionItem): Promise<void> {
  const sanitized = sanitizeQuestionForFirestore(question);
  if (sanitized.type === 'ordering') {
    console.log('[saveQuestionToFirestore - Ordering Question]', {
      id: sanitized.id,
      code: sanitized.code,
      content: sanitized.content,
      orderingSteps: sanitized.orderingSteps,
      canonicalOptions: sanitized.canonicalOptions,
      correctAnswer: sanitized.correctAnswer,
    });
  }
  const path = `${QUESTIONS_COLLECTION}/${sanitized.id}`;

  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, sanitized.id);
    await setDoc(docRef, sanitized);
    await syncUpdatedQuestionsToExamsAndAssignments([sanitized]);

    // Update local cache
    const current = getLocalCachedQuestions();
    const updated = current.some(q => q.id === sanitized.id)
      ? current.map(q => (q.id === sanitized.id ? sanitized : q))
      : [sanitized, ...current];
    saveLocalCachedQuestions(updated);
  } catch (error) {
    console.error('Error saving single question to Firestore:', error);
    // Even if firestore errors, update cache
    const current = getLocalCachedQuestions();
    const updated = current.some(q => q.id === sanitized.id)
      ? current.map(q => (q.id === sanitized.id ? sanitized : q))
      : [sanitized, ...current];
    saveLocalCachedQuestions(updated);

    handleFirestoreError(error, FirestoreOpType.WRITE, path);
  }
}

/**
 * Save a batch of questions to Firestore (e.g. from AI Generation)
 */
export async function saveQuestionsBatchToFirestore(
  questions: QuestionItem[]
): Promise<{ success: boolean; count: number }> {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { success: true, count: 0 };
  }

  const sanitizedList = questions.map(q => sanitizeQuestionForFirestore(q));
  sanitizedList.forEach(s => {
    if (s.type === 'ordering') {
      console.log('[saveQuestionsBatchToFirestore - Ordering Question]', {
        id: s.id,
        code: s.code,
        content: s.content,
        orderingSteps: s.orderingSteps,
        canonicalOptions: s.canonicalOptions,
        correctAnswer: s.correctAnswer,
      });
    }
  });

  try {
    const batch = writeBatch(db);
    sanitizedList.forEach(q => {
      const docRef = doc(db, QUESTIONS_COLLECTION, q.id);
      batch.set(docRef, q);
    });

    await batch.commit();
    await syncUpdatedQuestionsToExamsAndAssignments(sanitizedList);

    // Update local cache
    const current = getLocalCachedQuestions();
    const idMap = new Map(sanitizedList.map(q => [q.id, q]));
    const updatedExisting = current.map(q => (idMap.has(q.id) ? idMap.get(q.id)! : q));
    const newItems = sanitizedList.filter(q => !current.some(c => c.id === q.id));
    const finalCache = [...newItems, ...updatedExisting];
    saveLocalCachedQuestions(finalCache);

    notifyQuestionSaved(sanitizedList.length);
    return { success: true, count: sanitizedList.length };
  } catch (error) {
    console.warn('Batch write failed or fallback needed, trying individual writes:', error);

    // Fallback: Individual writes
    let savedCount = 0;
    for (const q of sanitizedList) {
      try {
        const docRef = doc(db, QUESTIONS_COLLECTION, q.id);
        await setDoc(docRef, q);
        savedCount++;
      } catch (e) {
        console.error(`Error saving individual question ${q.id}:`, e);
      }
    }

    // Always update local cache
    const current = getLocalCachedQuestions();
    const idMap = new Map(sanitizedList.map(q => [q.id, q]));
    const updatedExisting = current.map(q => (idMap.has(q.id) ? idMap.get(q.id)! : q));
    const newItems = sanitizedList.filter(q => !current.some(c => c.id === q.id));
    const finalCache = [...newItems, ...updatedExisting];
    saveLocalCachedQuestions(finalCache);

    notifyQuestionSaved(sanitizedList.length);
    return { success: savedCount > 0, count: savedCount };
  }
}

/**
 * Delete a question from Firestore & cache
 */
export async function deleteQuestionFromFirestore(id: string): Promise<void> {
  const path = `${QUESTIONS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
    const current = getLocalCachedQuestions();
    saveLocalCachedQuestions(current.filter(q => q.id !== id));
  } catch (error) {
    console.error('Error deleting question from Firestore:', error);
    const current = getLocalCachedQuestions();
    saveLocalCachedQuestions(current.filter(q => q.id !== id));
    handleFirestoreError(error, FirestoreOpType.DELETE, path);
  }
}

/**
 * Delete multiple questions from Firestore & cache
 */
export async function deleteQuestionsBatchFromFirestore(ids: string[]): Promise<{ success: boolean; count: number }> {
  if (!ids || ids.length === 0) return { success: true, count: 0 };

  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const docRef = doc(db, QUESTIONS_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();

    const current = getLocalCachedQuestions();
    const idSet = new Set(ids);
    saveLocalCachedQuestions(current.filter(q => !idSet.has(q.id)));

    return { success: true, count: ids.length };
  } catch (error) {
    console.warn('Batch delete failed, deleting individually:', error);
    let deletedCount = 0;
    for (const id of ids) {
      try {
        await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
        deletedCount++;
      } catch (e) {
        console.error(`Error deleting question ${id}:`, e);
      }
    }
    const current = getLocalCachedQuestions();
    const idSet = new Set(ids);
    saveLocalCachedQuestions(current.filter(q => !idSet.has(q.id)));

    return { success: true, count: deletedCount };
  }
}

/**
 * Fetch all questions from Firestore directly (one-time fetch) with optional filtering by subject and grade
 */
export async function getQuestions(subjectFilter?: string, gradeFilter?: string): Promise<QuestionItem[]> {
  return fetchQuestionsFromFirestore(subjectFilter, gradeFilter);
}

export async function fetchQuestionsFromFirestore(subjectFilter?: string, gradeFilter?: string): Promise<QuestionItem[]> {
  try {
    const snap = await getDocs(collection(db, QUESTIONS_COLLECTION));
    if (!snap.empty) {
      let items: QuestionItem[] = snap.docs.map(docSnap => 
        normalizeQuestionFromFirestore(docSnap.data(), docSnap.id)
      );

      if (subjectFilter && subjectFilter !== 'all' && subjectFilter !== 'Tất cả các môn') {
        items = items.filter(q => isSubjectMatching(q.subject, subjectFilter));
      }
      if (gradeFilter && gradeFilter !== 'all' && gradeFilter !== 'Tất cả các khối') {
        items = items.filter(q => isGradeMatching(q.grade, gradeFilter));
      }

      saveLocalCachedQuestions(items);
      return items;
    } else {
      saveLocalCachedQuestions([]);
      return [];
    }
  } catch (error) {
    console.warn('Error fetching questions from Firestore, returning local cache:', error);
    let cached = getLocalCachedQuestions();
    if (subjectFilter && subjectFilter !== 'all' && subjectFilter !== 'Tất cả các môn') {
      cached = cached.filter(q => isSubjectMatching(q.subject, subjectFilter));
    }
    if (gradeFilter && gradeFilter !== 'all' && gradeFilter !== 'Tất cả các khối') {
      cached = cached.filter(q => isGradeMatching(q.grade, gradeFilter));
    }
    return cached;
  }
}

/**
 * Live subscription to questions in Firestore
 */
export function subscribeToQuestionsFromFirestore(
  onData: (questions: QuestionItem[]) => void,
  onError?: (error: any) => void
): () => void {
  const qRef = collection(db, QUESTIONS_COLLECTION);
  return onSnapshot(
    qRef,
    snapshot => {
      if (!snapshot.empty) {
        const loaded: QuestionItem[] = snapshot.docs.map(d => {
          const rawData = d.data();
          const normalized = normalizeQuestionFromFirestore(rawData, d.id);
          if (isOrderingQuestionType(normalized) && Array.isArray(normalized.options)) {
            const rawOpts = Array.isArray(rawData.options) ? rawData.options : [];
            if (JSON.stringify(rawOpts) !== JSON.stringify(normalized.options) || rawData.correctAnswer !== normalized.correctAnswer) {
              setDoc(doc(db, QUESTIONS_COLLECTION, d.id), normalized, { merge: true }).catch(() => {});
            }
          }
          return normalized;
        });
        saveLocalCachedQuestions(loaded);
        onData(loaded);
      } else {
        saveLocalCachedQuestions([]);
        onData([]);
      }
    },
    error => {
      console.warn('Firestore questions listener error, fallback to cache:', error);
      if (onError) onError(error);
      const cached = getLocalCachedQuestions();
      onData(cached);
    }
  );
}
