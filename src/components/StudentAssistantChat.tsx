import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageCircle, X, Send, Bot, User, RefreshCw, Lightbulb, Zap, HelpCircle, BookOpen, Calculator, Laptop, Smile, RotateCcw } from 'lucide-react';
import { askStudentAssistant } from '../services/geminiService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

type SubjectCategory = 'all' | 'exercise' | 'math' | 'vietnamese' | 'it' | 'cheer';

export const StudentAssistantChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategory>('all');
  const [isInitialPulsing, setIsInitialPulsing] = useState(true);

  const initialGreeting: ChatMessage = {
    id: 'msg-welcome',
    sender: 'assistant',
    text: 'Chào bạn nhỏ! Mình là Bạn Cáo Học Tập AI 🦊✨. Mình sẵn sàng hướng dẫn bạn phương pháp giải bài, gợi ý cách tư duy và giải thích kiến thức bài học. Bạn đang cần Cáo hỗ trợ bài nào thế?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Turn off initial pulse wave after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialPulsing(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Listen for global student trigger events (e.g. from quiz or homework views)
  useEffect(() => {
    const handleOpenWithPrompt = (event: Event) => {
      const customEvent = event as CustomEvent<{ prompt?: string; category?: SubjectCategory }>;
      setIsOpen(true);
      if (customEvent.detail?.category) {
        setSelectedCategory(customEvent.detail.category);
      }
      if (customEvent.detail?.prompt) {
        handleSendMessage(customEvent.detail.prompt);
      }
    };

    window.addEventListener('open-student-assistant-chat', handleOpenWithPrompt);
    return () => {
      window.removeEventListener('open-student-assistant-chat', handleOpenWithPrompt);
    };
  }, [messages]);

  // Scroll to bottom when messages update or chat is opened
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  const categoryChips: Array<{ id: SubjectCategory; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'Tất cả', icon: <Sparkles className="w-3 h-3 text-amber-500" /> },
    { id: 'exercise', label: 'Gợi ý bài tập', icon: <Lightbulb className="w-3 h-3 text-yellow-500" /> },
    { id: 'math', label: 'Môn Toán', icon: <Calculator className="w-3 h-3 text-blue-500" /> },
    { id: 'vietnamese', label: 'Tiếng Việt', icon: <BookOpen className="w-3 h-3 text-emerald-500" /> },
    { id: 'it', label: 'Tin & Công nghệ', icon: <Laptop className="w-3 h-3 text-purple-500" /> },
    { id: 'cheer', label: 'Cổ vũ học tập', icon: <Smile className="w-3 h-3 text-pink-500" /> },
  ];

  const quickPromptsByCategory: Record<SubjectCategory, string[]> = {
    all: [
      '💡 Gợi ý cho em phương pháp giải bài toán này',
      '📐 Hướng dẫn em cách ghi nhớ bảng cửu chương',
      '📖 Giúp em tìm từ đồng nghĩa trong câu văn',
      '🌟 Động viên em làm bài tập thật tự tin nhé'
    ],
    exercise: [
      '💡 Gợi ý cho em các bước suy nghĩ bài này',
      '🔍 Có quy tắc hay công thức nào áp dụng được không?',
      '📝 Cho em một ví dụ tương tự để em tự làm',
      '❓ Em chưa hiểu đề bài, giải thích giúp em với'
    ],
    math: [
      '➕ Ôn tập bảng nhân & chia từ 2 đến 9',
      '📐 Cách tính chu vi và diện tích hình chữ nhật, hình vuông',
      '🔢 Mẹo tính nhẩm cộng trừ nhanh',
      '⏱️ Cách đổi đơn vị đo độ dài và thời gian'
    ],
    vietnamese: [
      '✏️ Cách nhận biết Danh từ, Động từ, Tính từ',
      '📖 Gợi ý cách viết đoạn văn nêu cảm nghĩ',
      '📝 Phân biệt từ láy và từ ghép tiếng Việt',
      '🌺 Đặt câu với từ ngữ chỉ sự vật và hoạt động'
    ],
    it: [
      '💻 Các bộ phận chính của máy tính để bàn',
      '⌨️ Cách đặt tay chuẩn trên bàn phím gõ 10 ngón',
      '🌐 Những quy tắc an toàn khi học trên Internet',
      '📂 Cách tạo và quản lý thư mục học tập'
    ],
    cheer: [
      '🌟 Cổ vũ em hoàn thành tốt bài tập hôm nay nhé',
      '🏆 Làm sao để em rèn luyện tính cẩn thận khi làm bài?',
      '🌈 Kể cho em một câu đố vui học tập thư giãn',
      '🎯 Lời chúc em đạt điểm 10 rực rỡ'
    ]
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputPrompt('');
    setIsLoading(true);

    const historyForAi = messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    const responseText = await askStudentAssistant(query, historyForAi);

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text: responseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'Cáo Học Tập sẵn sàng bắt đầu câu hỏi mới cùng bạn nhỏ! Bạn muốn hỏi về môn học hay bài tập nào tiếp theo? 🦊🎒',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      
      {/* Floating Circular Action Button (Bubble Icon with Smooth Hover Tooltip) */}
      {!isOpen && (
        <div className="relative group flex items-center justify-center">
          
          {/* Smooth Tooltip on Hover */}
          <div className="absolute bottom-full right-0 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-20 whitespace-nowrap">
            <div className="bg-slate-900/95 backdrop-blur-xs text-white text-xs font-black px-3.5 py-1.5 rounded-2xl shadow-2xl flex items-center gap-1.5 border border-slate-700/80">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-spin-slow" />
              <span>Hỏi AI Trợ Lý</span>
              {/* Tooltip Caret */}
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-slate-700/80" />
            </div>
          </div>

          {/* Circular Button */}
          <button
            onClick={() => setIsOpen(true)}
            id="student-assistant-toggle"
            title="Hỏi AI Trợ Lý"
            aria-label="Hỏi AI Trợ Lý"
            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white flex items-center justify-center shadow-xl shadow-orange-500/35 hover:shadow-2xl hover:shadow-orange-500/50 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer border-2 border-white ring-4 ring-orange-300/40 ${
              isInitialPulsing ? 'animate-bounce' : ''
            }`}
          >
            {/* Visual Bot / Sparkles Icon */}
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-md" />
              <Sparkles className="w-4 h-4 text-yellow-200 fill-yellow-200 absolute -top-1.5 -right-1.5 animate-spin-slow drop-shadow-sm" />
              
              {/* Pulsing indicator */}
              {isInitialPulsing && (
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-300"></span>
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Expanded Student AI Assistant Chat Modal */}
      {isOpen && (
        <div className="w-[calc(100vw-32px)] sm:w-[440px] h-[80vh] sm:h-[570px] max-h-[640px] bg-white rounded-3xl shadow-2xl border-2 border-orange-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-3 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shadow-xs relative">
                <span className="text-xl">🦊</span>
                <Sparkles className="w-3 h-3 text-yellow-200 fill-yellow-200 absolute -top-1 -right-1" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wide flex items-center gap-1.5 text-white">
                  CÁO HỌC TẬP AI
                  <span className="px-1.5 py-0.2 bg-white/25 rounded-md text-[9px] font-black uppercase text-amber-100">
                    Trợ lý tiểu học
                  </span>
                </h3>
                <p className="text-[11px] text-orange-100 flex items-center gap-1 font-medium mt-0.5">
                  <Zap className="w-3 h-3 text-yellow-200 fill-yellow-200" /> Sẵn sàng hướng dẫn &amp; gợi ý phương pháp học 24/7
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-all cursor-pointer"
                title="Bắt đầu câu hỏi mới"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/90 hover:text-white rounded-xl hover:bg-white/20 transition-all cursor-pointer font-bold"
                title="Đóng cửa sổ chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subject Category Filter Tabs */}
          <div className="bg-orange-50/90 px-3 py-2 border-b border-orange-100 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
            {categoryChips.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-orange-100/70 border border-orange-200/70'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Prompts Carousel */}
          <div className="bg-white px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
            <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Gợi ý:
            </span>
            {quickPromptsByCategory[selectedCategory].map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(promptText)}
                className="whitespace-nowrap px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-950 border border-orange-200/80 rounded-full font-semibold text-[11px] transition-all shrink-0 cursor-pointer hover:border-orange-300"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#FFFDF9]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-xs shrink-0 mt-0.5 border border-white text-base">
                    🦊
                  </div>
                )}
                
                <div className="space-y-1 max-w-[82%]">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-orange-100 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  
                  <span
                    className={`block text-[9px] px-1 ${
                      msg.sender === 'user' ? 'text-right text-slate-400' : 'text-left text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>

                  {/* Follow-up suggestion chip for assistant messages */}
                  {msg.sender === 'assistant' && msg.id !== 'msg-welcome' && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        onClick={() => handleSendMessage('Gợi ý thêm cho em một bước tư duy tiếp theo 💡')}
                        className="text-[10px] bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-md border border-orange-200/60 transition-all cursor-pointer"
                      >
                        💡 Gợi ý thêm bước nữa
                      </button>
                      <button
                        onClick={() => handleSendMessage('Cho em một ví dụ tương tự để em tự làm ✨')}
                        className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200/60 transition-all cursor-pointer"
                      >
                        🔍 Ví dụ tương tự
                      </button>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0 mt-0.5 border border-white">
                    🎒
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-xs border border-white text-base">
                  🦊
                </div>
                <div className="bg-white text-slate-600 border border-orange-100 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2 shadow-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                  <span className="font-medium">Cáo Học Tập đang suy nghĩ gợi ý dễ hiểu nhất cho em...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Footer */}
          <div className="p-3 bg-white border-t border-orange-100 shrink-0 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Nhập câu hỏi hoặc bài tập cần hướng dẫn..."
                className="flex-1 bg-orange-50/50 border border-orange-200 rounded-2xl px-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isLoading}
                className="p-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition-all shadow-sm cursor-pointer shrink-0 hover:scale-105 active:scale-95"
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-[10px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
              <span>🌟 Trợ lý hướng dẫn phương pháp &amp; đồng hành cùng học sinh Tiểu học</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
