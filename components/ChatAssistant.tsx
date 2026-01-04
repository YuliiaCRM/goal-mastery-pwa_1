
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Goal } from '../types';

interface ChatAssistantProps {
  goals: Goal[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const BUTTON_STYLE = "rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center";

const ChatAssistant: React.FC<ChatAssistantProps> = ({ goals, isOpen, setIsOpen }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const cleanText = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/#{1,6}\s?/g, '');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const goalsContext = goals.map(g => ({
        title: g.title, area: g.area, progress: g.subTasks.length > 0 ? `${Math.round((g.subTasks.filter(t => t.completed).length / g.subTasks.length) * 100)}%` : '0%'
      }));
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are the Vision 2026 Strategist. Help the user achieve their goals. Current Goals: ${JSON.stringify(goalsContext)}. User: ${input}. Instructions: Be warm, concise, structure with bullets, plain text only.`,
      });
      const assistantMessage: Message = { id: crypto.randomUUID(), role: 'assistant', content: cleanText(response.text || "I'm having a little trouble thinking right now."), timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: "I disconnected for a second. Try again?", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[190] bg-black/5 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />}
      <div className={`fixed top-20 right-6 w-[90vw] max-w-[400px] h-[75vh] max-h-[650px] bg-white rounded-[2.5rem] shadow-2xl z-[200] border border-slate-100 flex flex-col overflow-hidden transition-all duration-500 origin-top-right ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="p-6 border-b border-slate-50 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-xl shadow-lg">✨</div><div><h4 className="font-bold text-sm tracking-tight">2026 strategist</h4><p className="text-[10px] text-orange-300 font-bold tracking-tight opacity-80">AI strategy guide</p></div></div>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-white">
          {messages.length === 0 && (
            <div className="text-center py-10 space-y-6">
              <div className="text-4xl animate-bounce">👋</div>
              <div className="space-y-2"><p className="text-xs font-bold text-slate-400 tracking-tight px-8">Hi there!</p><p className="text-[13px] font-medium text-slate-500 px-8 leading-relaxed tracking-tight">How can I guide your progress today?</p></div>
              <div className="flex flex-col gap-2 px-6">
                <button onClick={() => setInput("What is my best next win?")} className={`p-4 bg-slate-50 border border-slate-100 ${BUTTON_STYLE} text-slate-500 hover:text-orange-600 hover:bg-orange-50`}>Next big win?</button>
                <button onClick={() => setInput("How is my balance across categories?")} className={`p-4 bg-slate-50 border border-slate-100 ${BUTTON_STYLE} text-slate-500 hover:text-orange-600 hover:bg-orange-50`}>Check my balance</button>
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-5 rounded-3xl text-[13px] leading-relaxed whitespace-pre-wrap tracking-tight ${msg.role === 'user' ? 'bg-orange-600 text-white font-bold rounded-tr-none shadow-lg' : 'bg-slate-50 text-slate-700 font-medium rounded-tl-none border border-slate-100'}`}>{msg.content}</div>
            </div>
          ))}
          {isTyping && <div className="flex justify-start"><div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl rounded-tl-none flex gap-1.5"><div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div><div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div></div></div>}
        </div>
        <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-50">
          <div className="relative">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message your guide..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-5 pr-14 text-sm font-bold tracking-tight focus:outline-none focus:ring-4 focus:ring-orange-500/5 transition-all placeholder:font-normal" />
            <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatAssistant;
