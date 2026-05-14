import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Send, Sparkles, Code, Cpu, ShieldCheck, 
  Copy, Save, ArrowRight, Loader2, X, Activity, 
  Bug, Zap, Layers, RefreshCcw, User
} from 'lucide-react';
import { apiChatStream } from '../utils/api';
import { marked } from 'marked';

const CodeBot = ({ settings, user }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello. I am the **Nexus Neural Architect**. I am specialized in structural engineering, logic optimization, and multi-language debugging. Share your code or describe your architectural goals."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // chat, debugging, architecture
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `You are the Nexus Senior Software Architect. 
      Guidelines:
      1. Provide production-ready, high-performance code.
      2. Use markdown blocks for code snippets.
      3. Explain complex logic using bullet points.
      4. Prioritize clean code principles and architectural scalability.`;

      const streamSettings = { ...settings, system_prompt: systemPrompt };
      let streamingMsgs = [...messages, userMsg, { role: 'assistant', content: '' }];
      setMessages(streamingMsgs);

      const result = await apiChatStream(
        [...messages, userMsg],
        streamSettings,
        null,
        null,
        (chunkText) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = { ...updated[lastIdx], content: chunkText };
            }
            return updated;
          });
        }
      );

      const finalResponse = result?.response || streamingMsgs[streamingMsgs.length - 1]?.content || '';
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = { ...updated[lastIdx], content: finalResponse };
        return updated;
      });

    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Architectural Sync Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const MessageContent = ({ content }) => {
    const parts = content.split(/```/);
    return (
      <div className="flex flex-col gap-3 w-full">
        {parts.map((part, i) => {
          if (i % 2 === 1) { 
            const lines = part.split('\n');
            const lang = lines[0].trim();
            const code = lines.slice(1).join('\n').trim();
            return (
              <div key={i} className="bg-slate-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl my-3">
                <div className="px-4 py-2.5 bg-white/5 border-b border-white/5 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{lang || 'logic'}</span>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(code)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                    <Copy size={14} className="text-slate-500" />
                  </button>
                </div>
                <pre className="p-5 m-0 text-xs md:text-sm font-mono overflow-x-auto text-slate-300 custom-scrollbar leading-relaxed">{code}</pre>
              </div>
            );
          }
          return (
            <div key={i} className="markdown-content text-[var(--text-1)] text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium" 
                 dangerouslySetInnerHTML={{ __html: marked.parse(part) }} />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-0)] text-[var(--text-0)] overflow-hidden">
      {/* Header */}
      <header className="p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--border-subtle)] bg-[var(--bg-1)]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[var(--accent-gradient)] rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3">
            <Cpu size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter mb-1 text-[var(--text-0)]">Code Bot AI</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.25em]">Architect Intelligence</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[var(--bg-input)] p-1.5 rounded-2xl border border-[var(--border-subtle)]">
          {['chat', 'debugging', 'architecture'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-2)] hover:text-[var(--text-0)]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-12 py-10" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-10">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-5 duration-700`}>
              <div className={`
                max-w-[95%] md:max-w-[85%] p-6 md:p-8 rounded-3xl border shadow-2xl transition-all
                ${msg.role === 'user' ? 'bg-[var(--accent)] border-transparent text-white rounded-br-none shadow-indigo-500/20' : 'bg-[var(--bg-2)] border-[var(--border-subtle)] text-[var(--text-1)] rounded-bl-none'}
              `}>
                <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2 ${msg.role === 'user' ? 'text-indigo-100' : 'text-[var(--accent)]'}`}>
                  {msg.role === 'user' ? <User size={12} /> : <Zap size={12} />}
                  {msg.role}
                </div>
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-4 p-6 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-3xl w-fit animate-pulse shadow-inner">
              <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
              <span className="text-xs font-black text-[var(--text-2)] uppercase tracking-widest italic">Synthesizing Neural Logic...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 md:p-10 bg-[var(--bg-glass)] backdrop-blur-3xl border-t border-[var(--border-subtle)] sticky bottom-0 z-50">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSend} className="group relative">
            <div className="absolute -inset-1 bg-[var(--accent)] rounded-3xl blur opacity-10 group-focus-within:opacity-25 transition-opacity" />
            <div className="relative flex items-center gap-4 p-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-3xl focus-within:border-[var(--accent)] transition-all shadow-2xl">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Share your architectural challenge..."
                className="flex-1 bg-transparent border-none text-[var(--text-0)] text-sm md:text-base font-bold px-6 py-4 placeholder:text-[var(--text-2)] outline-none"
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-14 h-14 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50"
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-4 opacity-80">
            {[
              { label: 'Fix Bugs', icon: Bug, prompt: 'Find and fix potential bugs in this code:' },
              { label: 'Optimize', icon: Activity, prompt: 'Optimize this code for performance:' },
              { label: 'Architect', icon: Layers, prompt: 'Design a scalable architecture for:' },
              { label: 'Review', icon: ShieldCheck, prompt: 'Security review for this implementation:' }
            ].map(hint => (
              <button 
                key={hint.label}
                onClick={() => setInput(hint.prompt)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-hover)] rounded-full text-[9px] font-black uppercase tracking-widest text-[var(--text-1)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-all border border-[var(--border-subtle)] shadow-sm"
              >
                <hint.icon size={12} />
                {hint.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeBot;
