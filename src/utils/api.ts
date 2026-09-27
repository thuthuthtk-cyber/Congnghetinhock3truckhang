/**
 * Client-side API client calling server-side Express routes proxying Gemini API
 */

export interface AiGradeResponse {
  score: number;
  maxScore: number;
  gradeRating: string;
  summaryComment: string;
  strengths: string[];
  weaknesses: string[];
  rubricBreakdown: {
    criteria: string;
    score: number;
    maxScore: number;
    feedback: string;
  }[];
  suggestedImprovement: string;
  idealAnswerHighlight?: string;
}

export interface AiClassificationResponse {
  level: "nhan_biet" | "thong_hieu" | "van_dung" | "van_dung_cao";
  levelName: string;
  confidence: number;
  reasoning: string;
  suggestedTopic: string;
  difficultyScore: number;
}

export interface AiStudentEvaluationResponse {
  academicRanking: string;
  conductRanking: string;
  generalEvaluation: string;
  strengthsSummary: string;
  growthAreas: string;
  encouragementMessage: string;
}

export async function checkAiHealth(): Promise<{ status: string; aiConfigured: boolean }> {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (error) {
    return { status: "offline", aiConfigured: false };
  }
}

export async function requestAiGrading(params: {
  assignmentTitle: string;
  subject: string;
  gradeLevel?: string;
  maxScore?: number;
  questionPrompt: string;
  sampleAnswer?: string;
  rubricCriteria?: string;
  studentAnswer: string;
}): Promise<AiGradeResponse> {
  const response = await fetch("/api/ai/grade-assignment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Không thể hoàn thành chấm điểm AI");
  }
  return json.data;
}

export async function requestAiQuestions(params: {
  subject: string;
  grade: string;
  topic: string;
  count?: number;
  targetLevels?: string[];
  questionType?: string;
}): Promise<any[]> {
  const response = await fetch("/api/ai/generate-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Không thể sinh câu hỏi bằng AI");
  }
  return json.questions;
}

export async function requestAiClassifyQuestion(params: {
  questionContent: string;
  subject?: string;
  grade?: string;
}): Promise<AiClassificationResponse> {
  const response = await fetch("/api/ai/classify-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Không thể phân loại câu hỏi");
  }
  return json.classification;
}

export async function requestAiGameGeneration(params: {
  gameType: "golden_bell" | "flashcard" | "rung_chuong_vang";
  topic: string;
  subject?: string;
  grade?: string;
  count?: number;
}): Promise<any> {
  const response = await fetch("/api/ai/generate-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gameType: params.gameType === "rung_chuong_vang" ? "golden_bell" : params.gameType,
      topic: params.topic,
      subject: params.subject || "Toán học",
      grade: params.grade || "10",
      count: params.count || 5,
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Không thể tạo bộ câu hỏi game bằng AI");
  }
  return json.gameData?.questions || json.gameData?.flashcards || json.gameData || [];
}

export const requestAiGameQuestions = requestAiGameGeneration;

export async function requestAiStudentEvaluation(params: {
  studentName: string;
  gradeLevel?: string;
  gradeClass?: string;
  scores: any;
  overallAverage?: number;
  conduct?: string;
  attendanceRate?: number;
  behaviorRating?: string;
  teacherNotes?: string;
}): Promise<{
  academicRanking: string;
  conductRanking: string;
  overallSummary: string;
  reportCardComment: string;
  growthAreas?: string;
}> {
  const response = await fetch("/api/ai/evaluate-student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Không thể đánh giá học bạ bằng AI");
  }
  const evalData = json.evaluation || {};
  return {
    academicRanking: evalData.academicRanking || "Giỏi",
    conductRanking: evalData.conductRanking || "Tốt",
    overallSummary: evalData.generalEvaluation || evalData.strengthsSummary || "Học sinh có ý thức học tập tốt.",
    reportCardComment: evalData.encouragementMessage || evalData.generalEvaluation || "Tiếp tục phát huy trong học kỳ tới.",
    growthAreas: evalData.growthAreas,
  };
}

export async function requestAiChat(params: {
  message: string;
  chatHistory?: { role: string; content: string }[];
  systemInstruction?: string;
}): Promise<string> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Lỗi khi kết nối với AI Assistant");
  }
  return json.reply;
}

