import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, X, Send, Bot, User, RefreshCw, Lightbulb, Zap } from 'lucide-react';
import { askPedagogicalAssistant } from '../services/geminiService';
import { UserRole } from '../types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface FloatingAssistantProps {
  userRole?: UserRole;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({ userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialPulsing, setIsInitialPulsing] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showMobileTooltip, setShowMobileTooltip] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: 'Xin chào thầy/cô! Tôi là Trợ lý AI Sư Phạm Dạy & Học Số PK Trực Khang. Tôi có thể giúp gì cho thầy/cô hôm nay? (Thiết lập ma trận đề thi, tạo câu hỏi trắc nghiệm, cách động viên học sinh...)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Turn off initial pulse & mobile intro tooltip after a few seconds
  useEffect(() => {
    const pulseTimer = setTimeout(() => {
      setIsInitialPulsing(false);
    }, 4500);

    const mobileTooltipTimer = setTimeout(() => {
      setShowMobileTooltip(false);
    }, 3500);

    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(mobileTooltipTimer);
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    '✨ Gợi ý trò chơi học tập khởi động môn Toán',
    '📝 Cách thiết lập ma trận đề thi 4 mức độ',
    '💡 Mẹo động viên học sinh tích cực học tập',
    '🎯 Gợi ý bài tập rèn luyện năng lực môn Tin học'
  ];

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

    const responseText = await askPedagogicalAssistant(query, historyForAi);

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text: responseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const isTooltipVisible = isHovered || showMobileTooltip;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      
      {/* Floating Circular Action Button with Slide-in Tooltip */}
      {!isOpen && (
        <div 
          className="relative flex items-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Tooltip to the left of the circular bubble */}
          <div 
            onClick={() => setIsOpen(true)}
            className={`absolute right-full mr-3.5 top-1/2 -translate-y-1/2 whitespace-nowrap transition-all duration-300 cursor-pointer ${
              isTooltipVisible 
                ? 'opacity-100 translate-x-0 pointer-events-auto' 
                : 'opacity-0 translate-x-2 pointer-events-none'
            }`}
          >
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-slate-700/80 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 animate-pulse" />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-white">Trợ Lý AI Sư Phạm</span>
                  <span className="text-[9px] bg-purple-500/80 text-purple-100 font-bold px-1.5 py-0.2 rounded-md">
                    24/7
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 font-medium">Hỏi bài &amp; Soạn bài ngay!</span>
              </div>
              
              {/* Right pointing caret triangle */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-slate-900/95 rotate-45 border-t border-r border-slate-700/80" />
            </div>
          </div>

          {/* Compact Circular Button (56px) */}
          <button
            onClick={() => setIsOpen(true)}
            id="floating-assistant-toggle"
            title="Trợ lý AI Sư Phạm"
            aria-label="Trợ lý AI Sư Phạm"
            className={`relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-full shadow-xl shadow-purple-600/35 hover:shadow-2xl hover:shadow-purple-600/50 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer border-2 border-white ring-4 ring-purple-300/40 ${
              isInitialPulsing ? 'animate-bounce' : ''
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 text-white stroke-[2.3] transition-transform duration-300 group-hover:scale-110" />
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 absolute -top-1.5 -right-1.5 drop-shadow-sm animate-pulse" />
              
              {/* Online Green Status Dot */}
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Expanded Chat Box Modal */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-[#7C3AED] px-4 py-3 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-xs font-heading">TRỢ LÝ AI SƯ PHẠM</h3>
                <p className="text-[10px] text-purple-100 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-300 fill-emerald-300" /> Gemini 3.7 Flash Trực Tuyến
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-gray-400 font-medium shrink-0">Gợi ý:</span>
            {quickPrompts.map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(promptText)}
                className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 border border-gray-200 rounded-full font-medium transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F9FAFB]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#4F46E5] text-white rounded-br-none shadow-xs'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#7C3AED] font-medium bg-[#F5F3FF] p-2.5 rounded-xl border border-[#DDD6FE] w-fit">
                <RefreshCw className="w-4 h-4 animate-spin text-[#7C3AED]" />
                Trợ lý AI đang soạn câu trả lời sư phạm...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-gray-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Hỏi trợ lý AI sư phạm..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900"
              />
              <button
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                className="p-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};
