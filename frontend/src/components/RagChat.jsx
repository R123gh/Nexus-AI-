import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, ArrowLeft, Loader2, BookOpen, 
  Globe, Info, ChevronDown, ChevronUp, Layers, Zap, Search, ShieldCheck, AlertCircle
} from 'lucide-react';
import { apiChatKB } from '../utils/api';
import { marked } from 'marked';
import { createNotification } from '../utils/notifications';

const RagChat = ({ kb, onBack, settings, user }) => {
  if (!kb) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center bg-[var(--bg-0)]">
        <div className="space-y-4">
          <AlertCircle size={48} className="mx-auto text-rose-500 opacity-50" />
          <h2 className="text-xl font-black text-[var(--text-0)]">Context Error</h2>
          <p className="text-[var(--text-2)] max-w-xs mx-auto font-medium">The selected knowledge base context was lost. Please re-select it from the RAG engine.</p>
          <button onClick={onBack} className="px-6 py-2 bg-[var(--accent)] text-white rounded-xl font-bold">Return to Engine</button>
        </div>
      </div>
    );
  }

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [augmentWeb, setAugmentWeb] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    createNotification(user?.id, 'Session Started', `Active context: ${kb.name}`, 'info');
  }, [kb.id]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-6);
      const data = await apiChatKB(kb.id, input, history, settings, augmentWeb);
      
      const botMsg = { 
        role: 'assistant', 
        content: data.response,
        chunks: data.chunks || [],
        web_augmented: data.web_augmented,
        usage: data.usage
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message || 'Failed to get response'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-0)] relative animate-in fade-in duration-500">
      {/* Chat Header */}
      <header className="px-4 py-3 md:px-6 md:py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-1)] backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <button className="p-2 bg-[var(--bg-2)] rounded-lg hover:bg-[var(--bg-hover)] transition-all" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-lg font-black tracking-tight text-[var(--text-0)] truncate max-w-[120px] sm:max-w-none">{kb.name}</h2>
              <div className="hidden xs:flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[8px] font-black tracking-widest uppercase border border-indigo-500/10">
                <ShieldCheck size={10} /> RAG
              </div>
            </div>
            <p className="text-[9px] md:text-xs text-[var(--text-2)] font-bold uppercase tracking-widest mt-0.5 opacity-70">
              Nexus Retrieval Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className={`flex items-center gap-2 cursor-pointer text-[9px] font-black uppercase tracking-widest transition-colors ${augmentWeb ? 'text-indigo-400' : 'text-[var(--text-2)]'}`}>
            <Globe size={14} className="hidden sm:block" />
            <span className="hidden xs:inline">Search</span>
            <input 
              type="checkbox" 
              checked={augmentWeb} 
              onChange={e => setAugmentWeb(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-2)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
            />
          </label>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {messages.length === 0 && (
            <div className="text-center py-16 px-8 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-700">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto mb-8 shadow-inner shadow-indigo-500/5">
                <Zap size={36} fill="currentColor" />
              </div>
              <h3 className="text-2xl font-black text-[var(--text-0)] mb-4 tracking-tighter">Contextual Knowledge Ready</h3>
              <p className="text-[var(--text-2)] max-w-sm mx-auto font-medium leading-relaxed">
                I've indexed <strong>{kb.name}</strong>. Ask any question and I'll retrieve the most relevant facts from your documentation.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 duration-500`}>
              <div className={`flex gap-4 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg ${
                  msg.role === 'user' ? 'bg-[var(--text-0)] text-[var(--bg-0)]' : 'bg-[var(--bg-2)] text-indigo-500 border border-[var(--border-subtle)]'
                }`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                
                <div className="space-y-3">
                  <div className={`p-6 rounded-3xl text-sm md:text-base leading-relaxed font-medium shadow-xl ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-[var(--bg-1)] text-[var(--text-0)] border border-[var(--border-subtle)] rounded-tl-none'
                  }`}>
                    <div 
                      className={`markdown-content prose prose-sm max-w-none ${document.documentElement.getAttribute('data-theme') !== 'light' ? 'prose-invert' : ''}`}
                      dangerouslySetInnerHTML={{ __html: marked(msg.content) }}
                    />
                  </div>

                  {msg.role === 'assistant' && msg.chunks && msg.chunks.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                      <details className="group bg-[var(--bg-2)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden transition-all">
                        <summary className="p-3 cursor-pointer text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] flex items-center gap-2 list-none group-hover:text-[var(--text-1)]">
                          <BookOpen size={12} className="text-indigo-400" /> 
                          Verified Sources ({msg.chunks.length})
                          <ChevronDown size={12} className="ml-auto transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="p-4 pt-0 space-y-3">
                          {msg.chunks.map((c, ci) => (
                            <div key={ci} className="p-4 bg-[var(--bg-0)] rounded-xl border-l-4 border-indigo-500 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest truncate max-w-[150px]">{c.source}</span>
                                <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-black">
                                  MATCH: {(c.score * 100).toFixed(0)}%
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-1)] italic leading-relaxed">"{c.text}"</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  {msg.web_augmented && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black tracking-widest uppercase w-fit">
                      <Globe size={10} /> Web-Augmented Response
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-2)] flex items-center justify-center text-indigo-500 border border-[var(--border-subtle)]">
                <Loader2 size={20} className="animate-spin" />
              </div>
              <div className="p-5 bg-[var(--bg-1)] rounded-3xl rounded-tl-none border border-[var(--border-subtle)] text-[var(--text-2)] text-xs font-bold italic">
                Scanning knowledge vectors and generating neural response...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-1)] backdrop-blur-2xl sticky bottom-0">
        <form 
          onSubmit={handleSend}
          className="max-w-4xl mx-auto flex gap-3 bg-[var(--bg-0)] p-2 rounded-2xl border border-[var(--border-subtle)] shadow-2xl focus-within:border-indigo-500/50 transition-all"
        >
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Query ${kb.name}...`}
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-0)] font-bold text-sm md:text-base px-4 py-3"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center transition-all shadow-lg ${
              input.trim() 
                ? 'bg-[var(--text-0)] text-[var(--bg-0)] hover:scale-105 active:scale-95' 
                : 'bg-[var(--bg-2)] text-[var(--text-3)] cursor-not-allowed'
            }`}
          >
            <Send size={20} strokeWidth={2.5} />
          </button>
        </form>
        <div className="mt-4 flex justify-center gap-6">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-3)]">
            Powered by Nexus RAG Engine
          </span>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">
            {augmentWeb ? 'Hybrid Context Active' : 'Semantic Index Active'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RagChat;
