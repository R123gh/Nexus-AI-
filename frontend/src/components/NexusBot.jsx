import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, User, MessageSquare, Maximize2, Minimize2, Trash2, Loader2 } from 'lucide-react';
import { apiChatStream } from '../utils/api';
import { formatTime } from '../utils/helpers';
import MessageBubble from './MessageBubble';

const NexusBot = ({ settings, isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your persistent NexusAI assistant. I am here to help you across all modules. How can I assist you today?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Improved scrolling logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    if (!settings.groq_api_key) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Groq API Key missing. Please go to Settings and enter your key to enable the AI assistant.',
        timestamp: new Date().toISOString(),
        isError: true
      }]);
      setIsLoading(false);
      return;
    }

    try {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      }]);

      const result = await apiChatStream(
        [...messages, userMsg],
        settings,
        null,
        null,
        (chunkText) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: chunkText
              };
            }
            return updated;
          });
        }
      );

      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: result?.response || updated[lastIdx].content,
            isStreaming: false
          };
        }
        return updated;
      });
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Clear all messages?')) {
      setMessages([{
        role: 'assistant',
        content: 'Chat cleared. How can I help you now?',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-screen bg-[var(--bg-1)] backdrop-blur-2xl border-l border-[var(--border-subtle)] z-[2000] flex flex-col transition-all duration-500 shadow-2xl ${
        isOpen ? 'translate-x-0 w-full sm:w-[400px]' : 'translate-x-full w-0'
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tighter text-[var(--text-0)]">NexusAI Bot</h3>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-emerald-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Neural Link Active
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={clearChat} className="p-2.5 rounded-xl bg-[var(--bg-2)] text-[var(--text-2)] hover:text-rose-500 hover:bg-rose-500/10 transition-all">
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="p-2.5 rounded-xl bg-[var(--bg-2)] text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-hover)] transition-all">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed font-medium shadow-xl ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20' 
                : 'bg-[var(--bg-2)] text-[var(--text-0)] border border-[var(--border-subtle)] rounded-tl-none'
            }`}>
              {msg.isStreaming ? (
                <div className="flex flex-col gap-2">
                  <div className="markdown-content text-inherit">
                    {msg.content || '...'}
                  </div>
                </div>
              ) : (
                <div className="markdown-content text-inherit">
                  {msg.content}
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-widest mt-2 px-1">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 p-4 bg-[var(--bg-2)]/50 rounded-2xl border border-[var(--border-subtle)] text-[var(--text-2)] text-xs font-bold italic animate-pulse">
            <Loader2 size={14} className="animate-spin text-indigo-500" />
            NexusAI is generating a response...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-[var(--border-subtle)] bg-white/[0.01]">
        <form onSubmit={handleSend} className="flex gap-3 bg-[var(--bg-2)] p-2 rounded-2xl border border-[var(--border-subtle)] focus-within:border-indigo-500/50 transition-all">
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none text-[var(--text-0)] text-sm font-bold placeholder:text-[var(--text-3)] outline-none px-4 py-2"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 text-white p-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:scale-100"
          >
            <Send size={18} strokeWidth={2.5} />
          </button>
        </form>
        <div className="mt-3 text-center">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-3)]">
            Powered by Groq • Llama-3-70B-Versatile
          </span>
        </div>
      </div>
    </div>
  );
};

export default NexusBot;
