import React, { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import Background3D from './components/Background3D';
import CodeEditorModal from './components/CodeEditorModal';
import { 
  API_BASE, 
  DEFAULT_SETTINGS, 
  MODELS, 
  formatTime 
} from './utils/helpers';
import { apiChatStream, apiChat, apiLogin, apiRegister, apiGetConversations, apiGetSessionHistory } from './utils/api';
import { Search, Send, Paperclip, Mic, Globe, Moon, Sun, Trash2, Download, Menu, Sparkles, Settings, Volume2, VolumeX, Loader2 } from 'lucide-react';
import ServicesHub from './components/ServicesHub';
import ToolPanel from './components/ToolPanel';
import KnowledgeBases from './components/KnowledgeBases';
import DataScience from './components/DataScience';
import CodeWorkspace from './components/CodeWorkspace';
import VoiceMode from './components/VoiceMode';
import ImageGenerator from './components/ImageGenerator';
import SettingsModal from './components/SettingsModal';
import AnalyticsPanel from './components/AnalyticsPanel';
import NotificationPanel from './components/NotificationPanel';
import AuthScreen from './components/AuthScreen';
import SwarmMode from './components/SwarmMode';
import VaultMode from './components/VaultMode';
import RagChat from './components/RagChat';
import { createNotification } from './utils/notifications';
import CodeBot from './components/CodeBot';
import { MessageSquareText } from 'lucide-react';



const App = () => {
  const [activeMode, setActiveMode] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [toast, setToast] = useState(null);
  
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('nexusai_user')) || null);
  const [settings, setSettings] = useState(JSON.parse(localStorage.getItem('nexusai_settings')) || DEFAULT_SETTINGS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [sessionId, setSessionId] = useState(localStorage.getItem('nexusai_session_id') || Math.random().toString(36).substring(7));
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedKB, setSelectedKB] = useState(null);
  const [isMuted, setIsMuted] = useState(localStorage.getItem('nexusai_muted') === 'true');

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(true);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [sidebarOverlay, setSidebarOverlay] = useState(false);

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(Math.random().toString(36).substring(7));
    setSelectedKB(null);
    setActiveMode('chat');
    setSidebarOpen(false);
  };

  const handleSetMode = (mode) => {
    if (mode !== 'rag-chat' && mode !== 'rag') {
      setSelectedKB(null);
    }
    setActiveMode(mode);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexusai_user');
    localStorage.removeItem('nexusai_settings');
    localStorage.removeItem('nexusai_session_id');
    setUser(null);
    setMessages([]);
  };

  const handleLoadConversation = async (conversationId) => {
    try {
      setIsLoading(true);
      const history = await apiGetSessionHistory(conversationId, settings);
      setMessages(history);
      setSessionId(conversationId);
      // Conversations loaded from history always use general chat mode
      setSelectedKB(null);
      setActiveMode('chat');
      setSidebarOpen(false);
    } catch (err) {
      console.error("Failed to load conversation:", err);
      showToast('Failed to load conversation', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    setSidebarOverlay(!sidebarOpen);
  };

  const startVoiceDictation = async () => {
    if (isRecordingVoice) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsRecordingVoice(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        
        try {
          const { apiVoice } = await import('./utils/api');
          const data = await apiVoice(audioBlob, settings, user?.id);
          if (data.transcript) {
            setInput(prev => prev + (prev ? ' ' : '') + data.transcript);
            showToast('Voice transcribed!', 'success');
          }
        } catch (err) {
          console.error("Dictation error:", err);
          showToast('Voice processing failed.', 'error');
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      // Don't show toast to avoid screen overlay issues
    } catch (err) {
      console.error('Error accessing microphone:', err);
      showToast('Microphone access denied', 'error');
    }
  };

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll logic using ResizeObserver for bulletproof scrolling with dynamic content
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const scroll = (behavior = 'smooth') => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
    };

    const observer = new ResizeObserver(() => {
      // Auto-scroll if near bottom or if we are actively loading/streaming
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
      if (isNearBottom || isLoading) {
        scroll(isLoading ? 'auto' : 'smooth');
      }
    });

    // Also trigger scroll on messages change directly
    scroll(isLoading ? 'auto' : 'smooth');

    // Observe children for height changes (typewriter, images, etc.)
    Array.from(container.children).forEach(child => observer.observe(child));
    observer.observe(container);

    return () => observer.disconnect();
  }, [messages, isLoading]);

  useEffect(() => {
    if (settings && settings.theme) {
      let activeTheme = settings.theme;
      if (activeTheme === 'system') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', activeTheme);
    }
  }, [settings?.theme]);

  useEffect(() => {
    localStorage.setItem('nexusai_muted', isMuted);
  }, [isMuted]);

  const loadConversations = useCallback(async () => {
    if (user?.id) {
      try {
        const historyData = await apiGetConversations(user.id);
        setConversations(historyData);
      } catch (err) {
        console.error("Failed to load conversations", err);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + Enter to send message
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isLoading) {
        e.preventDefault();
        handleSend();
      }
      // Cmd/Ctrl + K to clear input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setInput('');
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowAnalytics(false);
        setShowNotifications(false);
        setSelectedTool(null);
        setShowCodeEditor(false);
      }
      // Cmd/Ctrl + E to open code editor
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setShowCodeEditor(true);
      }
      // Cmd/Ctrl + F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('chat-search');
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, input]);

  const handleSelectConversation = async (sid) => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const sessionHistory = await apiGetSessionHistory(sid);
      setMessages(sessionHistory);
      setSessionId(sid);
      setActiveMode('chat');
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to load session history", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      const { apiDeleteSession } = await import('./utils/api');
      await apiDeleteSession(conversationId);
      showToast('Conversation history deleted.', 'warning');
      
      // If the currently open session was deleted, reset chat screen
      if (sessionId === conversationId) {
        handleNewChat();
      }
      
      loadConversations();
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      showToast('Purge failed.', 'error');
    }
  };

  const handleBranch = (msg) => {
    const idx = messages.indexOf(msg);
    if (idx !== -1) {
      setMessages(messages.slice(0, idx + 1));
      setSessionId(Math.random().toString(36).substring(7));
      showToast('Conversation branched successfully!', 'success');
    }
  };

  const handlePinMessage = (msg) => {
    if (pinnedMessages.includes(msg)) {
      setPinnedMessages(pinnedMessages.filter(m => m !== msg));
      showToast('Message unpinned', 'info');
    } else {
      setPinnedMessages([...pinnedMessages, msg]);
      showToast('Message pinned', 'success');
    }
  };

  const handleEditMessage = (msg) => {
    setEditingMessage(msg);
    setEditContent(msg.content);
  };

  const saveEditedMessage = () => {
    if (editingMessage) {
      const updatedMessages = messages.map(m => 
        m === editingMessage ? { ...m, content: editContent } : m
      );
      setMessages(updatedMessages);
      setEditingMessage(null);
      setEditContent('');
      showToast('Message updated', 'success');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = messages.filter(msg => 
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const exportConversation = (format) => {
    const content = messages.map(m => 
      `${m.role.toUpperCase()}: ${m.content}`
    ).join('\n\n');
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${sessionId}.json`;
      a.click();
    } else if (format === 'markdown') {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${sessionId}.md`;
      a.click();
    }
    showToast(`Exported as ${format.toUpperCase()}`, 'success');
  };

  const handleSend = async (overrideMessage = null) => {
    const msgContent = overrideMessage || input;
    if ((!msgContent.trim() && !selectedFile) || isLoading) return;

    if (!settings.groq_api_key) {
      alert("Please add your Groq API key in Settings first.");
      setShowSettings(true);
      return;
    }

    const userMsg = {
      role: 'user',
      content: selectedFile ? `[Uploaded File: ${selectedFile.name}]\n${msgContent}` : msgContent,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (selectedFile) {
        const { apiDocumentUpload } = await import('./utils/api');
        const data = await apiDocumentUpload(selectedFile, msgContent, settings, sessionId, user?.id);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        }]);
        // Add notification for file upload
        createNotification(user?.id, 'File Uploaded', `Successfully processed ${selectedFile.name}`, 'success');
        
        setSelectedFile(null);
      } else {
        const chatSettings = { ...settings };

        const result = await apiChatStream(
          [...messages, userMsg],
          chatSettings,
          user?.id,
          sessionId,
          (chunkText, metaData) => {
            // Skip no-op calls (empty chunk with no metadata)
            if (!chunkText && !metaData) return;

            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];

              // If no streaming bubble yet, create one (only when we have actual content)
              if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.isStreaming) {
                if (!chunkText && !metaData?.intent) return prev; // nothing to show yet
                return [...prev, {
                  role: 'assistant',
                  content: chunkText || '',
                  timestamp: new Date().toISOString(),
                  intent: metaData?.intent || 'chat',
                  actionResult: metaData?.action_result,
                  isStreaming: true
                }];
              }

              // Update the existing streaming bubble
              const updated = [...prev];
              const updatedMsg = { ...updated[updated.length - 1] };
              if (chunkText) updatedMsg.content = chunkText;
              if (metaData) {
                if (metaData.intent) updatedMsg.intent = metaData.intent;
                if (metaData.action_result) updatedMsg.actionResult = metaData.action_result;
              }
              updated[updated.length - 1] = updatedMsg;
              return updated;
            });
          }
        );

        // Finalize: always guarantee an assistant message is shown
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          const finalContent = result?.response || (lastMsg?.role === 'assistant' ? lastMsg.content : '') || '';

          if (lastMsg?.role === 'assistant') {
            // Seal the streaming bubble
            updated[updated.length - 1] = {
              ...lastMsg,
              content: finalContent,
              intent: result?.intent || lastMsg.intent,
              actionResult: result?.actionResult || lastMsg.actionResult,
              isStreaming: false
            };
          } else if (finalContent) {
            // No streaming bubble was created — push the full reply now
            updated.push({
              role: 'assistant',
              content: finalContent,
              timestamp: new Date().toISOString(),
              intent: result?.intent || 'chat',
              isStreaming: false
            });
          } else {
            // Truly empty — show a user-visible fallback (never leave user hanging)
            updated.push({
              role: 'assistant',
              content: '_(No response received. Please verify your Groq API key in Settings.)_',
              timestamp: new Date().toISOString(),
              intent: 'chat',
              isStreaming: false
            });
          }
          return updated;
        });
      }

      loadConversations(); // refresh history list
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeMode) {
      case 'chat':
      case 'autonomous-planner':
        return (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-10 sm:py-10 scroll-smooth" ref={chatContainerRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-16 animate-in fade-in zoom-in-95 duration-1000">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase mb-8 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                    <Sparkles size={14} className="animate-pulse text-indigo-400" /> 
                    {selectedKB ? `RAG: ${selectedKB.name}` : (activeMode === 'autonomous-planner' ? 'Strategic Planner' : 'Nexus Premium')}
                  </div>
                  <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-[var(--text-0)] mb-6 tracking-tighter leading-tight sm:leading-none">
                    {selectedKB ? selectedKB.name : (activeMode === 'chat' ? 'NexusAI' : 'Strategic Planner')}
                  </h1>
                  <p className="text-[var(--text-2)] text-base sm:text-lg max-w-lg font-medium leading-relaxed opacity-80 px-4">
                    {selectedKB 
                      ? 'Ask questions about your uploaded documents. I will search through your knowledge base to provide accurate answers.'
                      : (activeMode === 'chat' 
                        ? 'Your minimalist multi-modal assistant. Start a conversation below.'
                        : 'Describe a complex goal, and I will break it down into a multi-step execution plan.')}
                  </p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto w-full space-y-6 sm:space-y-8">
                  {messages.map((msg, i) => (
                    <MessageBubble 
                      key={i} 
                      message={msg} 
                      onCopy={(text) => navigator.clipboard.writeText(text)} 
                      onBranch={handleBranch}
                      onPin={handlePinMessage}
                      onEdit={handleEditMessage}
                      isMuted={isMuted}
                      isPinned={pinnedMessages.includes(msg)}
                    />
                  ))}
                </div>
              )}
              {isLoading && !messages[messages.length - 1]?.isStreaming && (
                <div className="max-w-4xl mx-auto w-full flex items-center gap-3 px-6 py-4 text-[var(--text-2)] text-[11px] font-black uppercase tracking-widest italic animate-pulse">
                  <Sparkles size={14} className="text-indigo-400" />
                  <span>Neural Link processing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="input-area px-4 py-4 sm:px-10 sm:py-8 border-t border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-3xl z-40">
              <div className="max-w-4xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 px-2 sm:px-0">
                  <div className="w-full sm:w-auto">
                    <select 
                      value={settings.model} 
                      onChange={e => {
                        const newSettings = { ...settings, model: e.target.value };
                        setSettings(newSettings);
                        localStorage.setItem('nexusai_settings', JSON.stringify(newSettings));
                      }}
                      className="w-full sm:w-auto bg-[var(--bg-1)] border border-[var(--border-default)] text-[var(--text-0)] text-[10px] sm:text-[11px] px-3 py-2.5 rounded-xl outline-none focus:border-[var(--accent)] transition-all font-black uppercase tracking-widest shadow-sm"
                    >
                      {MODELS.map(m => <option key={m.id} value={m.id} className="bg-[var(--bg-2)] text-[var(--text-0)]">{m.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <label className="flex items-center gap-2.5 text-[10px] sm:text-[11px] text-[var(--text-2)] cursor-pointer hover:text-[var(--accent)] transition-colors font-black uppercase tracking-widest group">
                      <input 
                        type="checkbox" 
                        checked={!settings.simple_chat} 
                        onChange={e => {
                          const newSettings = { ...settings, simple_chat: !e.target.checked };
                          setSettings(newSettings);
                          localStorage.setItem('nexusai_settings', JSON.stringify(newSettings));
                        }}
                        className="w-3.5 h-3.5 rounded border-[var(--border-default)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent)]/20 transition-all cursor-pointer"
                      />
                      <span>Agent Mode</span>
                    </label>
                  </div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className={`flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-[var(--bg-input)] border rounded-2xl sm:rounded-[2.5rem] transition-all duration-500 focus-within:ring-8 focus-within:ring-indigo-500/5 ${
                  isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-[var(--border-default)] focus-within:border-[var(--accent)]/40'
                }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Mobile Action Group (Left) */}
                  <div className="flex sm:hidden items-center gap-0.5 ml-1">
                    <button type="button" className="p-2 rounded-xl text-[var(--text-2)] hover:text-[var(--accent)] active:scale-90 transition-all" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                      <Paperclip size={16} />
                    </button>
                    <button type="button" className={`p-2 rounded-xl transition-all active:scale-90 ${isRecordingVoice ? 'bg-rose-500 text-white animate-pulse' : 'text-[var(--text-2)] hover:text-[var(--accent)]'}`} onClick={startVoiceDictation} disabled={isLoading}>
                      <Mic size={16} />
                    </button>
                  </div>

                  {/* Desktop Attachment (Left) */}
                  <button type="button" className="hidden sm:flex p-3 rounded-2xl bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--accent)] transition-all active:scale-90" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    <Paperclip size={20} />
                  </button>

                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedKB ? `Query ${selectedKB.name}...` : "Neural Link Active..."}
                    className="flex-1 bg-transparent border-none text-[var(--text-0)] text-xs sm:text-sm font-bold placeholder:text-[var(--text-2)] outline-none px-2 py-2"
                    disabled={isLoading}
                  />

                  <div className="flex items-center gap-1 sm:gap-2 pr-1">
                    {/* Desktop Voice (Right) */}
                    <button type="button" className={`hidden sm:flex p-3 rounded-2xl transition-all active:scale-90 ${isRecordingVoice ? 'bg-rose-500 text-white animate-pulse' : 'bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--accent)]'}`} onClick={startVoiceDictation} disabled={isLoading}>
                      <Mic size={20} className={isRecordingVoice ? 'animate-bounce' : ''} />
                    </button>
                    
                    <button 
                      type="submit"
                      className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all ${isLoading || !input.trim() ? 'opacity-50 grayscale' : ''}`}
                      disabled={isLoading || !input.trim()}
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </form>
                
                {input && (
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar animate-in fade-in slide-in-from-top-2 duration-500">
                    {['Summarize', 'Fix Logic', 'Explain', 'Improve'].map((s, i) => (
                      <button 
                        key={i}
                        onClick={() => setInput(s)}
                        className="whitespace-nowrap px-4 py-2 bg-[var(--bg-hover)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border-subtle)] rounded-full text-[10px] font-black uppercase tracking-widest text-[var(--text-1)] transition-all active:scale-95 shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={e => {
                    if (e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          </>
        );

      case 'data-science':
        return (
          <div className="data-science-wrapper">
            <DataScience user={user} settings={settings} />
          </div>
        );

      case 'code-editor':
        return (
          <div className="code-editor-wrapper">
            <CodeWorkspace user={user} settings={settings} />
          </div>
        );

      case 'voice':
        return (
          <div className="voice-wrapper">
            <VoiceMode settings={settings} user={user} isMuted={isMuted} setIsMuted={setIsMuted} />
          </div>
        );

      case 'image':
        return (
          <div className="image-wrapper">
            <ImageGenerator />
          </div>
        );

      case 'swarm':
        return (
          <div className="swarm-wrapper">
            <SwarmMode settings={settings} />
          </div>
        );

      case 'vault':
        return (
          <div className="vault-wrapper">
            <VaultMode user={user} settings={settings} />
          </div>
        );

      case 'code-bot':
        return (
          <div className="code-bot-wrapper h-full">
            <CodeBot settings={settings} user={user} />
          </div>
        );

      case 'rag-chat':
        return (
          <div className="rag-chat-wrapper" style={{ height: '100%' }}>
            <RagChat 
              kb={selectedKB} 
              settings={settings}
              onBack={() => setActiveMode('rag')} 
            />
          </div>
        );

      case 'services':
        return (
          <div className="services-wrapper">
            <ServicesHub onSelectTool={(tool, cat) => setSelectedTool({ tool, cat })} />
          </div>
        );

      case 'rag':
        return (
          <div className="knowledge-wrapper">
            <KnowledgeBases 
              onSelectKB={(kb) => {
                setSelectedKB(kb);
                setActiveMode('rag-chat');
              }} 
            />
          </div>
        );

      default:
        return (
          <div className="placeholder-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-2)' }}>
            <div style={{ textAlign: 'center' }}>
              <Settings size={48} style={{ marginBottom: '24px' }} />
              <h2>{activeMode}</h2>
              <p>This module is currently being optimized for the new engine.</p>
            </div>
          </div>
        );
    }
  };

  if (!user) {
    return <AuthScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="flex h-screen bg-[var(--bg-0)] text-[var(--text-0)] overflow-hidden font-sans selection:bg-indigo-500/30" data-theme={settings.theme}>
      <Background3D />
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] md:hidden animate-in fade-in duration-300" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <Sidebar 
        activeMode={activeMode} 
        setActiveMode={handleSetMode}
        setShowSettings={setShowSettings}
        conversations={conversations}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        user={user}
        onLogout={handleLogout}
        onSelectConversation={handleLoadConversation}
        onShowNotifications={() => setShowNotifications(true)}
        unreadCount={unreadCount}
        setShowAnalytics={() => setShowAnalytics(true)}
        onClose={() => setSidebarOpen(false)}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900] md:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main-content flex-1 relative overflow-hidden flex flex-col min-w-0">
        <header className="h-16 sm:h-20 border-b border-[var(--border-subtle)] bg-[var(--bg-1)] backdrop-blur-3xl z-50 px-4 sm:px-10 flex items-center shrink-0">
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                className="p-2.5 rounded-xl bg-[var(--bg-input)] text-[var(--text-1)] md:hidden hover:text-[var(--accent)] transition-all active:scale-90" 
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="flex flex-col">
                <h2 className="text-sm sm:text-lg font-black tracking-tighter leading-none text-[var(--text-0)] whitespace-nowrap">
                  Hello, <span className="text-[var(--accent)]">{user?.username || 'Nexus Agent'}</span>
                </h2>
                <span className="hidden sm:block text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-2)] mt-1.5">
                  Quantum Core Synchronized
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4">
              <div className="hidden lg:flex items-center bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl px-4 py-2 focus-within:border-[var(--accent)] transition-all group">
                <Search size={14} className="text-[var(--text-2)] mr-3 group-focus-within:text-[var(--accent)]" />
                <input 
                  id="chat-search"
                  type="text" 
                  placeholder="Memory Search..." 
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="bg-transparent text-[var(--text-1)] text-xs outline-none w-32 focus:w-48 transition-all font-bold placeholder:text-[var(--text-2)]"
                />
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2.5 rounded-xl transition-all active:scale-90 ${isMuted ? 'bg-rose-500/20 text-rose-500' : 'bg-[var(--bg-input)] text-[var(--text-2)] hover:text-[var(--accent)]'}`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2.5 rounded-xl bg-[var(--bg-input)] text-[var(--text-2)] hover:text-[var(--accent)] transition-all active:scale-90"
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 relative min-h-0 flex flex-col overflow-hidden">
          {renderContent()}
        </div>
      </main>


        {editingMessage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-[2rem] w-full max-w-2xl p-6 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl sm:text-2xl font-black text-[var(--text-0)] mb-6 tracking-tight uppercase tracking-[0.1em]">Edit Memory</h3>
            <textarea 
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full h-48 sm:h-64 bg-[var(--bg-0)] border border-[var(--border-subtle)] text-[var(--text-0)] p-5 rounded-2xl text-sm sm:text-base outline-none focus:border-indigo-500/50 transition-all font-bold resize-none mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setEditingMessage(null); setEditContent(''); }} className="px-6 py-3 bg-white/5 text-[var(--text-1)] border border-[var(--border-subtle)] rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={saveEditedMessage} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <CodeEditorModal 
        isOpen={showCodeEditor}
        onClose={() => setShowCodeEditor(false)}
        initialCode={codeContent}
        language={codeLanguage}
      />

        {selectedTool && (
          <ToolPanel 
            tool={selectedTool.tool} 
            category={selectedTool.cat} 
            onClose={() => setSelectedTool(null)}
            settings={settings}
          />
        )}

        {showSettings && (
          <SettingsModal 
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            settings={settings}
            setSettings={setSettings}
          />
        )}

        {/* Analytics Modal */}
        {showAnalytics && (
          <AnalyticsPanel 
            isOpen={showAnalytics}
            onClose={() => setShowAnalytics(false)}
            conversations={conversations}
          />
        )}

        {showNotifications && (
          <NotificationPanel 
            user={user} 
            onClose={() => setShowNotifications(false)} 
          />
        )}

      {/* Global Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : 
          toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
          'bg-slate-800/90 border-slate-700 text-white'
        }`}>
          <Sparkles size={16} />
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Persistent Assistant Panel */}
    </div>

  );
};

export default App;
