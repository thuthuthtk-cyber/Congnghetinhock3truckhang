import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import mammoth from 'mammoth';

const firebaseConfig = {
  apiKey: "AIzaSyD2f35Mnf18fKe6SSfKx5YvSiV_UtMzrd0",
  authDomain: "weblmsquanlydayvagoc.firebaseapp.com",
  projectId: "weblmsquanlydayvagoc",
  storageBucket: "weblmsquanlydayvagoc.firebasestorage.app",
  messagingSenderId: "964862755342",
  appId: "1:964862755342:web:fd94c82dd50bd5aae8725f",
  measurementId: ""
};

const appFb = initializeApp(firebaseConfig);
const db = getFirestore(appFb, "ai-studio-eduplayprohthngq-71ccd90c-504d-46b7-a2bb-043f46702509");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Helper to initialize Gemini Client with fallback to Firestore global API key
  const getGeminiClient = async (customKey?: string) => {
    let apiKey = customKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      try {
        const configDocRef = doc(db, 'settings', 'ai_config');
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
          const data = configSnap.data() as any;
          apiKey = data.apiKey || data.globalApiKey;
        }
      } catch (e) {
        console.error('Error fetching global API key from Firestore:', e);
      }
    }
    if (!apiKey) {
      throw new Error('Chưa cấu hình Gemini API Key cá nhân hoặc Global API Key trên hệ thống.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Health Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'EduPlay Pro Backend' });
  });

  // API Gemini Live Latency Test
  app.post('/api/gemini/latency', async (req, res) => {
    const { customKey } = req.body;
    const startTime = Date.now();
    try {
      const ai = await getGeminiClient(customKey);
      const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let lastError: any = null;
      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: 'Xin chào, trả lời "OK" để kiểm tra độ trễ.',
          });
          const durationMs = Date.now() - startTime;
          return res.json({
            latencyMs: durationMs,
            status: 'online',
            modelName,
            message: response.text ? 'Kết nối thành công!' : 'Không có phản hồi.',
          });
        } catch (err: any) {
          lastError = err;
          console.warn(`Latency check with ${modelName} failed, trying next model...`);
        }
      }
      throw lastError || new Error('Không thể kết nối với các model Gemini.');
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      let errMsg = error.message || 'Lỗi kết nối Gemini API';
      if (errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        errMsg = 'Hạn mức API Gemini đã hết (Quota Exceeded). Vui lòng nạp thêm hạn mức hoặc dùng API Key cá nhân khác.';
      }
      res.status(500).json({
        latencyMs: durationMs,
        status: 'error',
        modelName: 'gemini-3.7-flash',
        message: errMsg,
      });
    }
  });

  // API Gemini General Generation
  app.post('/api/gemini/generate', async (req, res) => {
    const { prompt, systemInstruction, customKey, responseJson, fileData } = req.body;
    try {
      const ai = await getGeminiClient(customKey);
      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (responseJson) {
        config.responseMimeType = 'application/json';
      }

      // Build multimodal contents or text contents
      let contents: any = prompt;
      if (fileData && (fileData.base64 || fileData.text)) {
        const fileName = (fileData.name || '').toLowerCase();
        const mimeType = (fileData.mimeType || '').toLowerCase();
        const rawBase64 = fileData.base64 ? fileData.base64.replace(/^data:[^;]+;base64,/, '') : '';

        if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
          contents = [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: rawBase64,
              },
            },
            {
              text: prompt,
            },
          ];
        } else if (mimeType.includes('word') || mimeType.includes('docx') || fileName.endsWith('.docx')) {
          try {
            const buffer = Buffer.from(rawBase64, 'base64');
            const extracted = await mammoth.extractRawText({ buffer });
            const docxText = extracted.value || '';
            contents = `[NỘI DUNG TÀI LIỆU WORD GỐC ĐÍNH KÈM]:\n"""\n${docxText}\n"""\n\n${prompt}`;
          } catch (mErr) {
            console.warn('Docx parsing error:', mErr);
            contents = prompt;
          }
        } else if (fileData.text) {
          contents = `[NỘI DUNG TÀI LIỆU VĂN BẢN ĐÍNH KÈM]:\n"""\n${fileData.text}\n"""\n\n${prompt}`;
        }
      }

      const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let response: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents,
            config,
          });
          if (response && response.text) {
            break;
          }
        } catch (modelErr: any) {
          lastError = modelErr;
          console.warn(`Model ${modelName} encountered error, trying next available model...`, modelErr.message);
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error('Không nhận được phản hồi từ mô hình AI.');
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Gemini Generate Error:', error);
      let rawMsg = error.message || '';
      let errMsg = 'Hệ thống AI đang quá tải tạm thời. Thầy/Cô vui lòng bấm "Thử lại ngay" hoặc thử lại sau ít phút nhé!';
      
      if (rawMsg.includes('429') || rawMsg.includes('Quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        errMsg = 'Hạn mức API Gemini đã hết (Quota Exceeded). Vui lòng kiểm tra lại API Key trong cài đặt.';
      } else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand') || rawMsg.includes('overloaded')) {
        errMsg = 'Hệ thống AI đang quá tải tạm thời. Thầy/Cô vui lòng bấm "Thử lại ngay" hoặc thử lại sau ít phút nhé!';
      } else if (rawMsg.includes('API key not valid') || rawMsg.includes('API_KEY_INVALID')) {
        errMsg = 'Khóa Gemini API không hợp lệ. Vui lòng kiểm tra lại cấu hình API Key.';
      } else if (rawMsg) {
        try {
          const parsed = JSON.parse(rawMsg);
          if (parsed?.error?.code === 503 || parsed?.error?.status === 'UNAVAILABLE') {
            errMsg = 'Hệ thống AI đang quá tải tạm thời. Thầy/Cô vui lòng bấm "Thử lại ngay" hoặc thử lại sau ít phút nhé!';
          } else if (parsed?.error?.message) {
            errMsg = parsed.error.message;
          }
        } catch {
          // not JSON format, keep default user-friendly message
        }
      }
      res.status(500).json({ error: errMsg });
    }
  });

  // Vite Middleware setup for dev vs prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduPlay Pro Server running on http://localhost:${PORT}`);
  });
}

startServer();
