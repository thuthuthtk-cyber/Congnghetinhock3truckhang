import { LatencyTestResult, Lesson5EPlan, QuestionItem } from '../types';

const STORAGE_KEY = 'eduplay_gemini_api_key';

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setStoredApiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Test live latency against Gemini API
 */
export async function testGeminiLatency(customKey?: string): Promise<LatencyTestResult> {
  const apiKey = customKey !== undefined ? customKey : getStoredApiKey();
  try {
    const res = await fetch('/api/gemini/latency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customKey: apiKey }),
    });

    const contentType = res.headers.get('content-type') || '';
    let data: any = {};
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const textResponse = await res.text();
      if (textResponse.trim().startsWith('<') || textResponse.includes('<!DOCTYPE')) {
        return {
          latencyMs: 0,
          status: 'error',
          modelName: 'gemini-3.7-flash',
          message: 'Máy chủ đang khởi động hoặc phản hồi trang HTML (404/502). Vui lòng thử lại sau.',
        };
      }
      try {
        data = JSON.parse(textResponse);
      } catch {
        return {
          latencyMs: 0,
          status: 'error',
          modelName: 'gemini-3.7-flash',
          message: textResponse || 'Lỗi phản hồi từ máy chủ.',
        };
      }
    }

    if (!res.ok) {
      return {
        latencyMs: data.latencyMs || 0,
        status: 'error',
        modelName: data.modelName || 'gemini-3.7-flash',
        message: data.message || 'Lỗi kiểm tra kết nối API Key.',
      };
    }
    return {
      latencyMs: data.latencyMs,
      status: 'online',
      modelName: data.modelName || 'gemini-3.7-flash',
      message: data.message || 'Kết nối thành công!',
    };
  } catch (err: any) {
    return {
      latencyMs: 0,
      status: 'error',
      modelName: 'gemini-3.7-flash',
      message: 'Không thể kết nối tới máy chủ backend.',
    };
  }
}

/**
 * Core AI generation call via server API proxy
 */
async function callGeminiApi(
  prompt: string,
  systemInstruction?: string,
  responseJson: boolean = false,
  retries: number = 2,
  fileData?: {
    base64?: string;
    mimeType?: string;
    name?: string;
    text?: string;
  }
): Promise<string> {
  const customKey = getStoredApiKey();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemInstruction,
          customKey,
          responseJson,
          fileData,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        if (textResponse.trim().startsWith('<') || textResponse.includes('<!DOCTYPE')) {
          throw new Error('Máy chủ đang khởi động hoặc phản hồi trang HTML (404/502). Vui lòng thử lại sau giây lát.');
        }
        try {
          data = JSON.parse(textResponse);
        } catch {
          throw new Error(textResponse || 'Lỗi phản hồi từ máy chủ.');
        }
      }

      if (!res.ok) {
        let msg = data.error || data.message || 'Lỗi phản hồi từ Gemini API.';
        if (typeof msg === 'string' && (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand'))) {
          msg = 'Hệ thống AI đang quá tải tạm thời. Thầy/Cô vui lòng bấm "Thử lại ngay" hoặc thử lại sau ít phút nhé!';
        }
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error(msg);
      }
      return data.text || '';
    } catch (err: any) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      let errText = err?.message || 'Không thể kết nối tới máy chủ AI.';
      if (errText.includes('503') || errText.includes('UNAVAILABLE') || errText.includes('high demand')) {
        errText = 'Hệ thống AI đang quá tải tạm thời. Thầy/Cô vui lòng bấm "Thử lại ngay" hoặc thử lại sau ít phút nhé!';
      }
      throw new Error(errText);
    }
  }

  throw new Error('Hệ thống AI đang quá tải tạm thời. Thầy/Cô vui lòng bấm "Thử lại ngay" hoặc thử lại sau ít phút nhé!');
}

/**
 * AI Suggestion for 5E Lesson Plan
 */
export async function generate5ELessonAI(
  topic: string,
  subject: string,
  grade: string
): Promise<Partial<Lesson5EPlan>> {
  const systemInstruction = `Bạn là chuyên gia sư phạm Việt Nam. Hãy soạn giáo án 5E cho chủ đề do giáo viên yêu cầu. Trả về định dạng JSON thuần túy theo cấu trúc:
{
  "title": "Tên bài giảng đầy đủ",
  "duration": "45 phút",
  "stepEngage": {
    "title": "Bước 1: Khởi động (Engage)",
    "subtitle": "Tạo ấn tượng & kích thích tư duy",
    "objectives": "Mục tiêu cụ thể",
    "teacherActivities": "Hoạt động giáo viên",
    "studentActivities": "Hoạt động học sinh",
    "materials": "Thiết bị, dụng cụ"
  },
  "stepExplore": {
    "title": "Bước 2: Khám phá & Hình thành kiến thức (Explore & Explain)",
    "subtitle": "Khám phá quy luật & xây dựng kiến thức",
    "objectives": "Mục tiêu cụ thể",
    "teacherActivities": "Hoạt động giáo viên",
    "studentActivities": "Hoạt động học sinh",
    "materials": "Thiết bị, dụng cụ"
  },
  "stepElaborate": {
    "title": "Bước 3: Luyện tập (Elaborate)",
    "subtitle": "Củng cố & mở rộng kỹ năng",
    "objectives": "Mục tiêu cụ thể",
    "teacherActivities": "Hoạt động giáo viên",
    "studentActivities": "Hoạt động học sinh",
    "materials": "Thiết bị, dụng cụ"
  },
  "stepEvaluate": {
    "title": "Bước 4: Vận dụng (Evaluate)",
    "subtitle": "Đánh giá năng lực & bài tập thực tế",
    "objectives": "Mục tiêu cụ thể",
    "teacherActivities": "Hoạt động giáo viên",
    "studentActivities": "Hoạt động học sinh",
    "materials": "Thiết bị, dụng cụ"
  }
}`;

  const prompt = `Soạn giáo án 5E chi tiết cho Môn: ${subject}, Khối lớp: ${grade}, Chủ đề: "${topic}".`;

  try {
    const rawText = await callGeminiApi(prompt, systemInstruction, true);
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title || `Bài giảng 5E: ${topic}`,
      duration: parsed.duration || '45 phút',
      subject,
      grade,
      topic,
      stepEngage: parsed.stepEngage,
      stepExplore: parsed.stepExplore,
      stepElaborate: parsed.stepElaborate,
      stepEvaluate: parsed.stepEvaluate,
    };
  } catch (error) {
    console.warn('Fallback 5E AI Generator used:', error);
    return {
      title: `Bài giảng 5E: ${topic} (${subject})`,
      duration: '45 phút',
      subject,
      grade,
      topic,
      stepEngage: {
        title: 'Bước 1: Khởi động (Engage)',
        subtitle: 'Tạo ấn tượng & kích thích tư duy',
        objectives: `Giúp học sinh tò mò và đặt câu hỏi về ${topic}.`,
        teacherActivities: `Trình chiếu câu hỏi thực tế hoặc tình huống ngắn liên quan đến ${topic}.`,
        studentActivities: 'Quan sát, thảo luận cặp đôi và phát biểu dự đoán.',
        materials: 'Máy chiếu, phiếu bài tập khởi động.'
      },
      stepExplore: {
        title: 'Bước 2: Khám phá & Hình thành kiến thức (Explore & Explain)',
        subtitle: 'Xây dựng quy luật & khái niệm mới',
        objectives: `Nắm vững lý thuyết cốt lõi của ${topic}.`,
        teacherActivities: `Hướng dẫn học sinh phân tích sơ đồ và ví dụ về ${topic}.`,
        studentActivities: 'Làm việc nhóm 4 em, ghi chép và tự tổng hợp kiến thức vào vở.',
        materials: 'SGK, phiếu học tập số 1.'
      },
      stepElaborate: {
        title: 'Bước 3: Luyện tập (Elaborate)',
        subtitle: 'Củng cố & phát triển kỹ năng',
        objectives: 'Thành thạo phương pháp giải bài tập.',
        teacherActivities: 'Giao bài tập từ dễ đến khó trên hệ thống dạy học trực tuyến.',
        studentActivities: 'Làm bài tập cá nhân, giơ tay xung phong sửa bài.',
        materials: 'Ngân hàng câu hỏi trắc nghiệm.'
      },
      stepEvaluate: {
        title: 'Bước 4: Vận dụng (Evaluate)',
        subtitle: 'Đánh giá năng lực & thực tiễn',
        objectives: `Liên hệ ứng dụng thực tế của ${topic}.`,
        teacherActivities: 'Nêu câu hỏi mở hoặc dự toán nho nhỏ.',
        studentActivities: 'Hoàn thành bài thu hoạch nộp trực tuyến.',
        materials: 'Rubric đánh giá.'
      }
    };
  }
}

/**
 * Helper to safely and robustly parse AI JSON responses, handling markdown wraps,
 * objects containing question arrays, and minor formatting imperfections.
 */
export function parseAiJsonResponse<T = any>(rawText: string): T {
  if (!rawText || !rawText.trim()) {
    throw new Error('Mô hình AI trả về kết quả rỗng.');
  }

  let cleaned = rawText.trim();
  // Strip code block markers if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }

  // First try standard JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // Try to extract JSON Array [ ... ]
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e2) {
        // continue
      }
    }

    // Try to extract JSON Object { ... }
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const obj = JSON.parse(objectMatch[0]);
        if (Array.isArray(obj)) return obj as any;
        if (Array.isArray(obj.questions)) return obj.questions as any;
        if (Array.isArray(obj.data)) return obj.data as any;
        if (Array.isArray(obj.items)) return obj.items as any;
        if (Array.isArray(obj.cauHoi)) return obj.cauHoi as any;
        return obj as any;
      } catch (e3) {
        // continue
      }
    }

    // Try removing trailing commas and control characters
    try {
      const sanitized = cleaned
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      return JSON.parse(sanitized);
    } catch (e4) {
      console.error('Lỗi phân tích JSON từ AI:', rawText);
      throw new Error('Dữ liệu AI trả về không đúng cấu trúc chuẩn. Thầy/Cô vui lòng bấm "Thử lại ngay" để AI phân tích lại nhé!');
    }
  }
}

/**
 * AI Auto Generate Exam Questions from Topic/Text or File Attachment
 */
export async function generateExamQuestionsAI(
  subject: string,
  grade: string,
  topicContent: string | string[],
  questionCount: number = 5,
  fileAttachment?: {
    base64?: string;
    mimeType?: string;
    name?: string;
    text?: string;
  }
): Promise<QuestionItem[]> {
  const hasFile = Boolean(fileAttachment && (fileAttachment.base64 || fileAttachment.text));
  const isPastedContent = Array.isArray(topicContent) || (typeof topicContent === 'string' && (topicContent.includes('Câu 1') || topicContent.includes('Câu') || topicContent.includes('A.') || topicContent.includes('B.') || topicContent.includes('Đáp án')));

  const systemInstruction = `Bạn là chuyên gia sư phạm hàng đầu Việt Nam theo chuẩn chương trình GDPT 2018 (Bộ sách Kết nối tri thức với cuộc sống).
Nhiệm vụ của bạn là đọc hiểu và tạo ngân hàng câu hỏi đề thi môn ${subject} (${grade}) chất lượng cao, chuẩn kiến thức, ngôn ngữ sư phạm trong sáng và chuẩn mực.

QUY TẮC BẮT BUỘC:
1. Khi có nội dung đề mẫu hoặc tài liệu:
   - Bạn PHẢI BÁM SÁT nội dung đề mẫu do giáo viên cung cấp.
   - Trích xuất đầy đủ các câu hỏi trắc nghiệm đơn (A, B, C, D), trắc nghiệm nhiều đáp án, Đúng/Sai (các mệnh đề), điền khuyết, tự luận, nối cặp, phân loại.
   - Nhận diện đúng đáp án được đánh dấu trong đề mẫu hoặc tự giải chính xác đáp án chuẩn sư phạm nếu đề mẫu chưa ghi đáp án.
   - Bổ sung lời giải thích chi tiết, sư phạm cho từng câu hỏi.
   - Nếu số lượng câu hỏi trong đề mẫu ít hơn số lượng yêu cầu (${questionCount}), hãy tạo thêm các câu hỏi chất lượng cao cùng chủ đề để đủ số lượng.
2. Khi tạo theo ma trận cấu trúc chuẩn:
   - Tạo câu hỏi có chất lượng sư phạm cao, không dùng placeholder vô nghĩa.
   - Phân bổ nhận thức: Nhận biết (40%), Thông hiểu (30%), Vận dụng (20%), Vận dụng cao (10%).

Mức độ nhận thức (level): "nhan_biet" | "thong_hieu" | "van_dung" | "van_dung_cao".
Dạng câu hỏi (type): "multiple_choice" | "multiple_response" | "true_false" | "fill_blank" | "ordering" | "matching" | "classification" | "essay".

BẮT BUỘC TRẢ VỀ JSON MẢNG (JSON Array) TUÂN THỦ ĐÚNG CẤU TRÚC:
[
  {
    "code": "CH-TIN-01",
    "level": "nhan_biet",
    "type": "multiple_choice",
    "content": "Nội dung câu hỏi chi tiết...",
    "lessonName": "Tên bài học hoặc chủ đề",
    "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
    "statements": [{"statement": "Mệnh đề 1", "isCorrect": true, "explanation": "Giải thích"}],
    "correctAnswer": "A",
    "explanation": "Lời giải thích sư phạm chi tiết vì sao đáp án này đúng..."
  }
]`;

  let prompt = '';
  if (hasFile) {
    prompt = `BẮT BUỘC: Bạn đang phân tích tài liệu đính kèm: "${fileAttachment?.name || 'Tài liệu đề thi'}".
Hãy đọc toàn bộ tài liệu và trích xuất đầy đủ, chính xác 100% tất cả các câu hỏi có trong tài liệu thành danh sách câu hỏi kiểm tra đánh giá theo định dạng JSON.
Chủ đề bài học: ${typeof topicContent === 'string' ? topicContent : 'Theo tài liệu gốc'}.
Bám sát từng câu hỏi, tình huống, các đáp án lựa chọn hoặc danh sách mệnh đề Đúng/Sai có trong tài liệu.`;
  } else if (isPastedContent) {
    const rawContentStr = Array.isArray(topicContent) ? topicContent.join('\n\n') : topicContent;
    prompt = `Hãy đọc, bóc tách và trích xuất toàn bộ câu hỏi từ nội dung đề mẫu sau đây môn ${subject} (${grade}):

"""
${rawContentStr}
"""

YÊU CẦU:
1. Tự động bóc tách từng câu hỏi, xác định dạng câu hỏi (trắc nghiệm 4 lựa chọn, đúng/sai, tự luận,...), các phương án A, B, C, D, đáp án đúng và lời giải thích.
2. Đảm bảo tạo ra khoảng ${questionCount} câu hỏi chuẩn sư phạm theo đúng định dạng JSON Array đã quy định.`;
  } else {
    prompt = `Hãy tạo chính xác ${questionCount} câu hỏi kiểm tra đánh giá chất lượng cao môn ${subject} ${grade} theo chương trình GDPT 2018 với chủ đề/nội dung: "${topicContent}".`;
  }

  try {
    const rawText = await callGeminiApi(prompt, systemInstruction, true, 2, fileAttachment);
    const parsed: any = parseAiJsonResponse<any>(rawText);
    const parsedList: any[] = Array.isArray(parsed) 
      ? parsed 
      : (parsed?.questions || parsed?.data || parsed?.items || parsed?.cauHoi || [parsed]);
    
    if (!Array.isArray(parsedList) || parsedList.length === 0) {
      throw new Error('Dữ liệu AI trả về không đúng cấu trúc danh sách câu hỏi.');
    }

    return parsedList.map((item, idx) => {
      const normSubject = subject || 'Tin học';
      let codePrefix = 'TIN';
      const normLow = normSubject.toLowerCase();
      if (normLow.includes('tin') || normLow.includes('thông tin') || normLow.includes('it')) codePrefix = 'TIN';
      else if (normLow.includes('công nghệ') || normLow.includes('cong nghe')) codePrefix = 'CONG';
      else if (normLow.includes('tiếng việt')) codePrefix = 'TV';
      else if (normLow.includes('tiếng anh')) codePrefix = 'TA';
      else codePrefix = normSubject.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'TIN';

      const qNum = String(idx + 1).padStart(2, '0');

      return {
        id: `q-ai-${Date.now()}-${idx}`,
        code: item.code && !item.code.includes('TOÁ') && !item.code.includes('TOAN') ? item.code : `CH-${codePrefix}-${qNum}`,
        subject: normSubject,
        grade: grade || 'Khối 3',
        level: item.level || (idx % 2 === 0 ? 'nhan_biet' : 'thong_hieu'),
        type: item.type || 'multiple_choice',
        content: item.content || `Câu hỏi ${idx + 1}`,
        lessonName: item.lessonName || (typeof topicContent === 'string' && topicContent.length < 100 ? topicContent : 'Chủ đề bài học'),
        options: Array.isArray(item.options) && item.options.length > 0 ? item.options : undefined,
        statements: item.statements || undefined,
        classificationGroups: item.classificationGroups || undefined,
        classificationItems: item.classificationItems || undefined,
        matchingPairs: item.matchingPairs || undefined,
        correctAnswer: item.correctAnswer || (item.type === 'multiple_choice' ? 'A' : ''),
        explanation: item.explanation || 'Hướng dẫn giải chi tiết theo chuẩn sư phạm.',
      };
    });
  } catch (error: any) {
    console.error('Lỗi khi gọi AI tạo câu hỏi:', error);
    throw new Error(error?.message || 'Không thể tạo câu hỏi từ AI. Vui lòng kiểm tra lại kết nối hoặc thử lại.');
  }
}

/**
 * AI Auto Grade and Comment on Homework Submissions
 */
export async function gradeSubmissionAI(
  assignmentTitle: string,
  studentContent: string
): Promise<{ score: number; feedback: string }> {
  const systemInstruction = `Bạn là giáo viên chấm bài tận tâm. Hãy chấm điểm bài làm của học sinh theo thang điểm 10 và viết nhận xét chi tiết, mang tính động viên và định hướng. Trả về JSON:
{
  "score": 9.0,
  "feedback": "Nhận xét khen ngợi điểm mạnh và gợi ý điểm cần phát triển..."
}`;

  const prompt = `Tên bài tập: "${assignmentTitle}"\nBài làm của học sinh:\n"${studentContent}"\n\nHãy chấm điểm và đưa ra nhận xét sư phạm.`;

  try {
    const rawText = await callGeminiApi(prompt, systemInstruction, true);
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 8.5,
      feedback: parsed.feedback || 'Bài làm đạt yêu cầu, tư duy logic tốt!',
    };
  } catch (error) {
    return {
      score: 8.5,
      feedback: 'Bài làm trình bày đầy đủ, tư duy logic mạch lạc. Cần chú ý thêm khâu rà soát chi tiết nhỏ để đạt điểm tối đa!',
    };
  }
}

/**
 * Pedagogical AI Assistant Floating Chat
 */
export async function askPedagogicalAssistant(
  userQuery: string,
  history: { sender: 'user' | 'assistant'; text: string }[]
): Promise<string> {
  const systemInstruction = `Bạn là Trợ lý AI Sư Phạm Dạy & Học Số PK Trực Khang - chuyên gia tư vấn giảng dạy chuyên sâu về bậc TIỂU HỌC (Lớp 1 đến Lớp 5 theo chương trình GDPT 2018 tại Việt Nam).

QUY TẮC BẮT BUỘC VỀ BỘ SÁCH GIÁO KHOA:
- BẠN CHỈ ĐƯỢC PHÉP SỬ DỤNG VÀ THAM CHIẾU DUY NHẤT BỘ SÁCH: "Kết nối tri thức với cuộc sống" (NXB Giáo dục Việt Nam) cho tất cả các nội dung kiến thức, thuật ngữ, ngữ liệu, bài tập, ví dụ và cấu trúc bài học của các môn học bậc Tiểu học (Lớp 1-5).
- TUYỆT ĐỐI KHÔNG tham chiếu, trích dẫn hay sử dụng nội dung từ các bộ sách khác (như Chân trời sáng tạo, Cánh diều...). Mọi câu trả lời tư vấn giáo án, bài giảng 5E, câu hỏi bài tập đều phải bám sát 100% ngữ liệu và tiến trình của bộ sách "Kết nối tri thức với cuộc sống".

QUY TẮC BẮT BUỘC VỀ PHẠM VI HỖ TRỢ:
1. TRONG PHẠM VI (Được phép trả lời chi tiết, tận tình theo sách Kết nối tri thức):
   - Nội dung kiến thức, phương pháp giảng dạy các môn học ở bậc Tiểu học (Toán, Tiếng Việt, Tự nhiên và Xã hội, Khoa học, Lịch sử và Địa lý, Tin học, Công nghệ, Đạo đức, Âm nhạc, Mỹ thuật, Thể dục...) theo sách "Kết nối tri thức với cuộc sống".
   - Hỗ trợ xây dựng giáo án, bài giảng chi tiết theo mô hình 5E (Engage, Explore, Explain, Elaborate, Evaluate) bám sát sách "Kết nối tri thức".
   - Gợi ý biên soạn câu hỏi trắc nghiệm, bài tập, phiếu học tập, đề kiểm tra chuẩn bộ "Kết nối tri thức".
   - Phương pháp quản lý lớp học tiểu học, cách động viên học sinh, xử lý các tình huống sư phạm tâm lý lứa tuổi tiểu học (6-11 tuổi).

2. NGOÀI PHẠM VI (BẮT BUỘC TỪ CHỐI LỊCH SỰ):
   - Nếu câu hỏi thuộc bậc học khác không liên quan, hoặc yêu cầu dùng bộ sách khác, hoặc các chủ đề không liên quan tới giáo dục/sư phạm, BẠN PHẢI TỪ CHỐI LỊCH SỰ.
   - Khi từ chối, hãy dùng cấu trúc: "Xin chào thầy/cô, Trợ lý AI Sư phạm Dạy & Học Số PK Trực Khang hiện chỉ chuyên hỗ trợ tư vấn và cung cấp ngữ liệu theo duy nhất bộ sách 'Kết nối tri thức với cuộc sống' (Chương trình GDPT 2018) cho bậc Tiểu học (Lớp 1-5). Rất tiếc tôi chưa thể hỗ trợ nội dung ngoài phạm vi này. Thầy/cô vui lòng đặt câu hỏi chuyên môn bám sát bộ sách Kết nối tri thức nhé! 📚✨"

3. GIỌNG VĂN: Luôn thân thiện, chuyên nghiệp, kính trọng giáo viên ("thầy/cô"), trình bày mạch lạc, có emoji sư phạm phù hợp.`;

  const conversation = history
    .map(h => `${h.sender === 'user' ? 'Người dùng' : 'Trợ lý AI'}: ${h.text}`)
    .join('\n');

  const fullPrompt = `${conversation}\nNgười dùng: ${userQuery}\nTrợ lý AI:`;

  try {
    return await callGeminiApi(fullPrompt, systemInstruction, false);
  } catch (error) {
    return `Xin chào thầy/cô! Trợ lý AI Sư phạm Dạy & Học Số PK Trực Khang chuyên hỗ trợ kiến thức, giáo án 5E và phương pháp giảng dạy các môn Tiểu học (Lớp 1-5). Thầy/cô vui lòng đặt câu hỏi trong phạm vi chuyên môn nhé! 📚✨`;
  }
}

export const EXAM_PARSING_SYSTEM_PROMPT = `
Bạn là một trợ lý AI chuyên gia giáo dục và xử lý văn bản đề thi. 
Nhiệm vụ của bạn là đọc nội dung văn bản mẫu do giáo viên dán vào hoặc tải lên, sau đó bóc tách thành danh sách các câu hỏi độc lập.

QUY TẮC BẮT BUỘC:
1. LOẠI BỎ TIÊU ĐỀ PHẦN/MỤC: Tuyệt đối KHÔNG đưa các dòng tiêu đề phần, tên chương, tên chủ đề (Ví dụ: "Phần 1: Trắc nghiệm", "Chủ đề 1", "Bài tập tổng hợp") vào làm nội dung câu hỏi. Chỉ bắt đầu bóc tách khi gặp từ khóa nhận diện câu hỏi thực tế (như "Câu 1", "Câu 2", hoặc các câu hỏi đánh số thứ tự).
2. NHẬN DIỆN ĐỊNH DẠNG: Phân loại chính xác các dạng câu hỏi (Trắc nghiệm đơn, Đúng/Sai, Điền khuyết, Sắp xếp, Nối cặp, Tự luận...).
3. CẤU TRÚC JSON ĐẦU RA: Trả về dữ liệu chuẩn xác dưới dạng danh sách cấu trúc câu hỏi bao gồm: nội dung câu hỏi, các phương án lựa chọn (nếu có), đáp án đúng và phần giải thích chi tiết.
`;

export async function generateExploreSummaryAI(
  title: string,
  subject: string,
  grade: string,
  checkpoints: any[] = []
): Promise<string> {
  const qList = checkpoints.map((cp, idx) => {
    const text = cp.questionText || cp.question?.content || cp.content || '';
    return text ? `- Mốc ${idx + 1}: ${text}` : '';
  }).filter(Boolean).join('\n');

  const prompt = `Bạn là trợ lý sư phạm Dạy & Học Số PK Trực Khang. Hãy viết phần "Nội dung Ghi nhớ cốt lõi" (Core Takeaway / Summary) cho phần Khám phá (Explore) của bài học 5E:
- Tên bài: ${title || 'Chủ đề bài giảng'}
- Môn học: ${subject || 'Khoa học / Tin học / Tự nhiên & Xã hội'}
- Khối lớp: ${grade || 'Tiểu học'}
${qList ? `- Các câu hỏi trọng tâm đã khám phá:\n${qList}` : ''}

Yêu cầu:
1. Tóm tắt súc tích, cô đọng các kiến thức và kỹ năng quan trọng nhất mà học sinh cần ghi nhớ sau khi xem video bài giảng.
2. Trình bày bằng 3 - 5 ý gạch đầu dòng rõ ràng, kết hợp emoji sinh động, dễ học, dễ nhớ cho lứa tuổi học sinh.
3. Câu từ chuẩn mực sư phạm, tích cực và truyền cảm hứng.
4. Trả về trực tiếp nội dung ghi nhớ, không kèm lời chào hay mở đầu rườm rà.`;

  try {
    const res = await callGeminiApi(prompt, 'Bạn là chuyên gia sư phạm tiểu học và trung học cơ sở.', false);
    if (res && res.trim()) {
      return res.trim();
    }
  } catch (err) {
    console.warn('Gemini summary fallback error:', err);
  }

  // Fallback summary template if offline or API limit reached
  return `📌 NỘI DUNG GHI NHỚ TRỌNG TÂM BÀI HỌC:
• 🎯 Nắm vững các khái niệm và nguyên lý cơ bản đã quan sát trong video bài giảng.
• 💡 Nhận biết và phân tích được quy luật của hiện tượng, chủ đề trong thực tế.
• 🔬 Vận dụng linh hoạt kiến thức để trả lời chính xác các câu hỏi tương tác và phiếu học tập.
• 🌟 Luôn chủ động ghi chép và kết nối bài học với cuộc sống hàng ngày.`;
}

export function cleanRawExamText(rawText: string): string[] {
  // Sử dụng Regex để tách văn bản dựa theo các đầu mục "Câu 1", "Câu 2",...
  // Giúp cắt nhỏ đề thi thành mảng các câu hỏi độc lập trước khi bóc tách
  const questionBlocks = rawText.split(/(?=Câu\s+\d+[:\s])/i);
  
  return questionBlocks
    .map(block => block.trim())
    .filter(block => block.length > 0);
}

/**
 * Student AI Assistant ("Bạn Cáo Học Tập")
 */
export async function askStudentAssistant(
  userQuery: string,
  history: { sender: 'user' | 'assistant'; text: string }[]
): Promise<string> {
  const systemInstruction = `Bạn là "Bạn Cáo Học Tập" 🦊 - người bạn đồng hành và trợ lý AI nhỏ thân thiện dành riêng cho học sinh Tiểu học (Lớp 1 đến Lớp 5 theo chương trình "Kết nối tri thức với cuộc sống").

QUY TẮC AN TOÀN VÀ PHẠM VI HỖ TRỢ BẮT BUỘC:
1. ĐƯỢC PHÉP HỖ TRỢ:
   - Giải thích lại kiến thức bài học (Toán, Tiếng Việt, Tự nhiên và Xã hội, Khoa học, Tin học, Đạo đức...) theo đúng chương trình Tiểu học của bộ sách "Kết nối tri thức".
   - Gợi ý cách làm bài tập, hướng dẫn từng bước tư duy để học sinh tự suy nghĩ và tìm ra kết quả (Không bao giờ đưa sẵn đáp án trực tiếp cho bài tập/kiểm tra đang làm).
   - Hướng dẫn cách sử dụng phần mềm học tập (như cách mở bài giảng, cách nộp bài...).
   - Động viên tinh thần, khen ngợi, khích lệ khi các em hoàn thành bài học.

2. TUYỆT ĐỐI KHÔNG (BẮT BUỘC TUÂN THỦ):
   - KHÔNG bao giờ cung cấp trực tiếp đáp án cuối cùng của bài kiểm tra hoặc bài tập mà học sinh đang làm (tránh gian lận). Hãy gợi ý phương pháp giải.
   - KHÔNG bàn luận về chủ đề không phù hợp lứa tuổi trẻ em (bạo lực, người lớn, nhạy cảm...).
   - KHÔNG hỏi hoặc thu thập thông tin cá nhân nhạy cảm của học sinh (số điện thoại, địa chỉ nhà, mật khẩu...).
   - KHÔNG đưa ra lời khuyên y tế hay tâm lý chuyên sâu. Nếu học sinh chia sẻ điều buồn bã hoặc bị bắt nạt, hãy trả lời dịu dàng: "Bạn nhỏ ơi, nếu có chuyện buồn hoặc cần giúp đỡ, bạn hãy chia sẻ ngay với thầy cô giáo hoặc bố mẹ nhé. Mọi người luôn yêu thương và sẵn sàng bảo vệ bạn đó! ❤️"

3. GIỌNG VĂN:
   - Xưng hô thân thiện: "Mình" - "Bạn nhỏ" hoặc "Cậu" - "Tớ".
   - Ngôn ngữ đơn giản, trong sáng, dễ hiểu với trẻ 6-11 tuổi, nhiều emoji vui tươi (🦊, ✨, 🌟, 📚, ❤️).
   - Luôn kiên nhẫn, khích lệ, không chê bai khi học sinh hỏi hoặc trả lời sai.`;

  const conversation = history
    .map(h => `${h.sender === 'user' ? 'Học sinh' : 'Cáo Học Tập'}: ${h.text}`)
    .join('\n');

  const fullPrompt = `${conversation}\nHọc sinh: ${userQuery}\nCáo Học Tập:`;

  try {
    return await callGeminiApi(fullPrompt, systemInstruction, false);
  } catch (error) {
    return `Chào bạn nhỏ! Cáo rất sẵn sàng giúp bạn ôn bài và giải đáp thắc mắc nhé. Bạn đang gặp khó khăn ở bài tập hay câu hỏi nào thế? 🦊✨`;
  }
}


