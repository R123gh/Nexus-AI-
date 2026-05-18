import React, { useState, useEffect, useRef } from 'react';
import { User, Sparkles, Copy, Volume2, VolumeX, CheckCircle, GitFork, Pin, Edit2, Download, ExternalLink, ThumbsUp, MoreVertical } from 'lucide-react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { formatTime } from '../utils/helpers';
import { motion } from 'framer-motion';

const MessageBubble = ({ message, onCopy, onBranch, onPin, onEdit, isMuted, isPinned }) => {
  const isUser = message.role === 'user';
  const [displayedText, setDisplayedText] = useState(isUser ? message.content : '');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  const handleSpeak = () => {
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }
    
    if (isMuted) return;

    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.text = message.content.replace(/[*#`_]/g, '');
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.cancel();
    synthRef.current.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) synthRef.current.cancel();
    };
  }, [isSpeaking]);

  useEffect(() => {
    if (isUser || message.isStreaming) {
      setDisplayedText(message.content);
      return;
    }

    if (displayedText.length < message.content.length) {
      const timer = setTimeout(() => {
        const chunkSize = Math.max(2, Math.ceil(message.content.length / 25));
        setDisplayedText(message.content.slice(0, displayedText.length + chunkSize));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [displayedText, message.content, isUser, message.isStreaming]);

  const renderContent = (text) => {
    if (!text) return null;
    
    const html = marked.parse(text, {
      breaks: true,
      highlight: (code, lang) => {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    });

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    return (
      <div 
        className={`markdown-content prose prose-sm max-w-none text-[var(--text-0)] ${isDark ? 'prose-invert' : ''}`} 
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.95, rotateX: 15 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 250, damping: 22 }}
      style={{ perspective: 1000 }}
      className={`group w-full max-w-5xl mx-auto px-2 py-2 sm:px-6 sm:py-4 flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all duration-300`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse mr-2' : 'flex-row ml-2'}`}>
        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
          isUser 
            ? 'bg-[var(--bg-hover)] text-[var(--text-1)] border border-[var(--border-subtle)]' 
            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
        }`}>
          {isUser ? <User size={10} className="sm:size-3" /> : <Sparkles size={10} className="sm:size-3" />}
        </div>
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-2)]">
          {isUser ? 'Neural Link' : 'Nexus Engine'}
        </span>
      </div>

      <div className="relative max-w-[95%] sm:max-w-[85%] group/bubble">
        {isPinned && (
          <div className="absolute -top-2 -right-2 bg-indigo-500 text-white p-1 rounded-full shadow-lg z-10 animate-bounce">
            <Pin size={10} fill="currentColor" />
          </div>
        )}

        <div className={`relative px-4 py-3 sm:px-6 sm:py-5 rounded-2xl sm:rounded-[2rem] border transition-all duration-300 ${
          isUser 
            ? 'bg-[var(--bg-hover)] border-[var(--border-default)] rounded-tr-none text-[var(--text-0)] hover:border-[var(--accent)]/30 shadow-sm hover:shadow-md hover:-translate-y-0.5' 
            : 'bg-[var(--bg-1)] backdrop-blur-3xl border-[var(--border-subtle)] rounded-tl-none text-[var(--text-0)] shadow-xl hover:shadow-2xl hover:-translate-y-0.5'
        }`}>
          {message.image && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-2xl">
              <img src={message.image} alt="Nexus Generated" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          )}
          
          <div className="prose prose-sm sm:prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-[var(--bg-2)] prose-pre:border prose-pre:border-[var(--border-subtle)] prose-pre:rounded-2xl text-[var(--text-0)] text-base sm:text-sm">
            {renderContent(displayedText)}
          </div>
          
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse align-middle" />
          )}

          {message.actionResult && (
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              <CheckCircle size={12} className="text-indigo-400" />
              <span>{message.actionResult}</span>
            </div>
          )}
        </div>

        <div className={`absolute top-0 ${isUser ? '-left-14' : '-right-14'} hidden lg:flex flex-col gap-2 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300 translate-y-2 group-hover/bubble:translate-y-0`}>
          <button onClick={() => onCopy(message.content)} className="p-2 rounded-xl bg-slate-900/50 border border-white/10 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all shadow-xl" title="Copy Memory">
            <Copy size={14} />
          </button>
          {!isUser && (
            <button onClick={handleSpeak} className={`p-2 rounded-xl bg-slate-900/50 border border-white/10 transition-all shadow-xl ${isSpeaking ? 'text-indigo-400 border-indigo-500/30' : 'text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30'}`} title="Neural Output">
              {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          )}
          <button onClick={() => onPin && onPin(message)} className={`p-2 rounded-xl bg-slate-900/50 border border-white/10 transition-all shadow-xl ${isPinned ? 'text-indigo-400 border-indigo-500/30' : 'text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30'}`} title="Anchor Message">
            <Pin size={14} fill={isPinned ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="lg:hidden mt-2.5 flex items-center justify-between px-2 opacity-40">
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
             {formatTime(message.timestamp)}
           </span>
           <div className="flex gap-4">
             <button onClick={() => onCopy(message.content)} className="text-slate-400 active:text-indigo-400"><Copy size={13} /></button>
             <button onClick={() => onPin && onPin(message)} className={`${isPinned ? 'text-indigo-400' : 'text-slate-400'}`}><Pin size={13} /></button>
             {onBranch && <button onClick={() => onBranch(message)} className="text-slate-400"><GitFork size={13} /></button>}
           </div>
        </div>
      </div>
      {!isUser && (
        <div className="hidden lg:block mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 ml-4">
          {formatTime(message.timestamp)}
        </div>
      )}
    </motion.div>
  );
};

export default MessageBubble;
