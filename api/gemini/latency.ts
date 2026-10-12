import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { customKey } = req.body || {};
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({
      latencyMs: 0,
      status: 'error',
      modelName: 'gemini-1.5-flash',
      message: 'Chưa cấu hình API Key cá nhân hoặc GEMINI_API_KEY trên môi trường.',
    });
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: 'v1beta',
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const candidateModels = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    let lastError: any = null;
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: 'Xin chào, trả lời "OK" để kiểm tra độ trễ.',
        });
        const durationMs = Date.now() - startTime;
        return res.status(200).json({
          latencyMs: durationMs,
          status: 'online',
          modelName,
          message: response.text ? 'Kết nối thành công!' : 'Không có phản hồi.',
        });
      } catch (err: any) {
        lastError = err;
      }
    }
    throw lastError || new Error('Không thể kết nối với các model Gemini.');
  } catch (error: any) {
    return res.status(500).json({
      latencyMs: Date.now() - startTime,
      status: 'error',
      modelName: 'gemini-1.5-flash',
      message: error?.message || 'Lỗi kết nối Gemini API',
    });
  }
}
