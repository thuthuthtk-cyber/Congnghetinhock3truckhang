import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { prompt, systemInstruction, customKey, responseJson, fileData } = req.body || {};
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Chưa cấu hình API Key.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: 'v1beta',
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const config: any = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (responseJson) config.responseMimeType = 'application/json';

    let contents: any = prompt;
    if (fileData && (fileData.base64 || fileData.text)) {
      const mimeType = (fileData.mimeType || '').toLowerCase();
      const rawBase64 = fileData.base64 ? fileData.base64.replace(/^data:[^;]+;base64,/, '') : '';
      if (mimeType.includes('pdf')) {
        contents = [
          { inlineData: { mimeType: 'application/pdf', data: rawBase64 } },
          { text: prompt },
        ];
      } else if (fileData.text) {
        contents = `[NỘI DUNG TÀI LIỆU VĂN BẢN ĐÍNH KÈM]:\n"""\n${fileData.text}\n"""\n\n${prompt}`;
      }
    }

    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Không nhận được phản hồi từ AI.');
    }

    return res.status(200).json({ text: response?.text || '' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Lỗi xử lý Gemini AI' });
  }
}
