import { QuestionItem } from '../types';

export const SUBJECTS = ["Tin học", "Công nghệ"];
export const GRADES = ["Khối 3"];
export const CLASSES_BY_GRADE: Record<string, string[]> = {
  "Khối 3": ["Lớp 3C", "Lớp 3D"]
};
export const ALL_CLASSES = Object.values(CLASSES_BY_GRADE).flat();
export const EXAM_TYPES = ["Thường xuyên", "Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"];

export interface QuestionTypeDefinition {
  id: string;
  label: string;
  aliases: string[];
}

export const QUESTION_TYPES: QuestionTypeDefinition[] = [
  { id: 'multiple_choice', label: 'Trắc nghiệm đơn', aliases: ['trắc nghiệm', 'multiple_choice', 'single_choice', 'trắc nghiệm đơn', 'chọn một đáp án đúng (a/b/c/d)'] },
  { id: 'multiple_response', label: 'Chọn nhiều đáp án đúng', aliases: ['chọn nhiều đáp án đúng', 'multiple_response', 'multi_choice', 'chọn nhiều đáp án', 'nhiều đáp án', 'multiple_choice_multi'] },
  { id: 'true_false', label: 'Câu hỏi Đúng/Sai', aliases: ['câu hỏi đúng/sai', 'true_false', 'đúng / sai', 'đúng/sai', 'dung_sai'] },
  { id: 'fill_blank', label: 'Điền khuyết / Ngắn', aliases: ['điền khuyết / ngắn', 'fill_blank', 'điền khuyết', 'dien_khuyet', 'ngắn', 'short_answer'] },
  { id: 'ordering', label: 'Sắp xếp thứ tự', aliases: ['sắp xếp thứ tự', 'ordering', 'sắp xếp', 'sap_xep', 'thứ tự'] },
  { id: 'matching', label: 'Nối cặp / Kéo thả', aliases: ['nối cặp / kéo thả', 'matching', 'nối cặp', 'kéo thả', 'noi_cap', 'ghép nối', 'ghep_noi'] },
  { id: 'classification', label: 'Phân loại', aliases: ['phân loại', 'classification', 'phan_loai', 'nhóm'] },
  { id: 'essay', label: 'Tự luận tự do', aliases: ['tự luận tự do', 'essay', 'tự luận', 'tu_luan'] }
];

export const normalizeQuestionType = (type?: string): QuestionItem['type'] => {
  if (!type) return 'multiple_choice';
  const clean = String(type).toLowerCase().trim();

  if (
    clean === 'multiple_choice' ||
    clean === 'single_choice' ||
    clean === 'trắc nghiệm đơn' ||
    clean === 'trắc nghiệm' ||
    clean.includes('một đáp án')
  ) {
    return 'multiple_choice';
  }
  if (
    clean === 'multiple_response' ||
    clean === 'multi_choice' ||
    clean === 'multiple_choice_multi' ||
    clean.includes('nhiều đáp án')
  ) {
    return 'multiple_response';
  }
  if (
    clean === 'true_false' ||
    clean.includes('đúng/sai') ||
    clean.includes('đúng / sai') ||
    clean === 'dung_sai'
  ) {
    return 'true_false';
  }
  if (
    clean === 'fill_blank' ||
    clean === 'short_answer' ||
    clean.includes('điền khuyết') ||
    clean === 'dien_khuyet' ||
    clean === 'ngắn'
  ) {
    return 'fill_blank';
  }
  if (
    clean === 'ordering' ||
    clean.includes('sắp xếp') ||
    clean === 'sap_xep' ||
    clean === 'thứ tự'
  ) {
    return 'ordering';
  }
  if (
    clean === 'matching' ||
    clean.includes('nối cặp') ||
    clean.includes('kéo thả') ||
    clean === 'noi_cap' ||
    clean.includes('ghép')
  ) {
    return 'matching';
  }
  if (
    clean === 'classification' ||
    clean.includes('phân loại') ||
    clean === 'phan_loai'
  ) {
    return 'classification';
  }
  if (
    clean === 'essay' ||
    clean.includes('tự luận') ||
    clean === 'tu_luan'
  ) {
    return 'essay';
  }

  const found = QUESTION_TYPES.find(
    qt => qt.id === clean || qt.label.toLowerCase() === clean || qt.aliases.some(a => a.toLowerCase() === clean)
  );
  return (found ? found.id : 'multiple_choice') as QuestionItem['type'];
};

export const synchronizeOrderingSteps = (rawSteps: string[]): Partial<QuestionItem> => {
  const cleanSteps = (rawSteps || []).map(s => String(s ?? ''));
  const orderingSteps = cleanSteps.map((text, idx) => ({
    text,
    index: idx,
    order: idx + 1,
  }));
  const nonEmptySteps = cleanSteps.map(s => s.trim()).filter(Boolean);
  return {
    type: 'ordering',
    options: cleanSteps,
    canonicalOptions: cleanSteps,
    correctOrder: cleanSteps,
    orderingSteps,
    correctAnswer: nonEmptySteps.join(' -> '),
    teacherEditedOrder: true,
    statements: undefined,
    matchingPairs: undefined,
    classificationGroups: undefined,
    classificationItems: undefined,
  };
};

export const getDefaultAnswerSchemaByType = (rawType?: string): Partial<QuestionItem> => {
  const normalized = normalizeQuestionType(rawType);
  switch (normalized) {
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correctAnswer: 'A',
        canonicalOptions: undefined,
        correctOrder: undefined,
        orderingSteps: undefined,
        statements: undefined,
        matchingPairs: undefined,
        classificationGroups: undefined,
        classificationItems: undefined,
      };
    case 'multiple_response':
      return {
        type: 'multiple_response',
        options: ['', '', '', ''],
        correctAnswer: 'A',
        canonicalOptions: undefined,
        correctOrder: undefined,
        orderingSteps: undefined,
        statements: undefined,
        matchingPairs: undefined,
        classificationGroups: undefined,
        classificationItems: undefined,
      };
    case 'true_false':
      return {
        type: 'true_false',
        options: undefined,
        correctAnswer: '',
        canonicalOptions: undefined,
        correctOrder: undefined,
        orderingSteps: undefined,
        statements: [
          { statement: '', isCorrect: true },
          { statement: '', isCorrect: false },
        ],
        matchingPairs: undefined,
        classificationGroups: undefined,
        classificationItems: undefined,
      };
    case 'fill_blank':
      return {
        type: 'fill_blank',
        options: undefined,
        correctAnswer: '',
        canonicalOptions: undefined,
        correctOrder: undefined,
        orderingSteps: undefined,
        statements: undefined,
        matchingPairs: undefined,
        classificationGroups: undefined,
        classificationItems: undefined,
      };
    case 'ordering':
      return {
        type: 'ordering',
        options: ['', '', ''],
        canonicalOptions: ['', '', ''],
        correctOrder: ['', '', ''],
        orderingSteps: [
          { text: '', index: 0, order: 1 },
          { text: '', index: 1, order: 2 },
          { text: '', index: 2, order: 3 },
        ],
        correctAnswer: '',
        statements: undefined,
        matchingPairs: undefined,
        classificationGroups: undefined,
        classificationItems: undefined,
      };
    case 'matching':
      return {
        type: 'matching',
        options: undefined,
        correctAnswer: '',
        canonicalOptions: undefined,
        correctOrder: undefined,
        orderingSteps: undefined,
        statements: undefined,
        matchingPairs: [
          { left: '', right: '' },
          { left: '', right: '' },
        ],
        classificationGroups: undefined,
        classificationItems: undefined,
      };
    case 'classification':
      return {
        type: 'classification',
        options: undefined,
        correctAnswer: '',
        canonicalOptions: undefined,
        correctOrder: undefined,
        orderingSteps: undefined,
        statements: undefined,
        matchingPairs: undefined,
        classificationGroups: ['Nhóm 1', 'Nhóm 2'],
        classificationItems: [
          { name: '', group: 'Nhóm 1' },
          { name: '', group: 'Nhóm 2' },
        ],
      };
    case 'essay':
      return {
        type: 'essay',
        options: undefined,
        correctAnswer: '',
        canonicalOptions: undefined,
        correctOrder: undefined,
        orderingSteps: undefined,
        statements: undefined,
        matchingPairs: undefined,
        classificationGroups: undefined,
        classificationItems: undefined,
      };
    default:
      return {
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correctAnswer: 'A',
        canonicalOptions: undefined,
        correctOrder: undefined,
        orderingSteps: undefined,
        statements: undefined,
        matchingPairs: undefined,
        classificationGroups: undefined,
        classificationItems: undefined,
      };
  }
};

export const getQuestionTypeLabel = (type?: string): string => {
  if (!type) return 'Trắc nghiệm đơn';
  const clean = type.toLowerCase().trim();
  const found = QUESTION_TYPES.find(qt => 
    qt.id === clean || qt.label.toLowerCase() === clean || qt.aliases.some(a => a.toLowerCase() === clean)
  );
  return found ? found.label : type;
};

export const matchesQuestionType = (questionType: string | undefined, filterType: string): boolean => {
  if (!filterType || filterType === 'all') return true;
  if (!questionType) return false;
  
  const cleanQType = questionType.toLowerCase().trim();
  const cleanFilter = filterType.toLowerCase().trim();
  
  const targetDef = QUESTION_TYPES.find(qt => qt.id === cleanFilter || qt.label.toLowerCase() === cleanFilter);
  if (!targetDef) return cleanQType === cleanFilter;
  
  return (
    cleanQType === targetDef.id ||
    cleanQType === targetDef.label.toLowerCase() ||
    targetDef.aliases.some(a => a.toLowerCase() === cleanQType)
  );
};

export const isMultipleResponse = (type?: string): boolean => {
  if (!type) return false;
  const clean = type.toLowerCase().trim();
  return clean === 'multiple_response' || clean.includes('nhiều') || clean === 'multi_choice' || clean === 'multiple_select';
};

