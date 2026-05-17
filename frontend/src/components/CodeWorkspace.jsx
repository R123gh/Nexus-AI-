import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode, Play, Save, Folder, ChevronRight, Terminal, Plus, Trash2, 
  Download, Settings, Cpu, Package, Activity, User, MoreVertical, Loader2,
  X, Code, Clock, Users, Search, Copy, Check, ArrowRight, ChevronLeft, Layout,
  Sparkles, ShieldCheck, History, BookOpen
} from 'lucide-react';
import { 
  apiGetFiles, apiGetFileContent, apiSaveFile, apiRunCode, 
  apiGetPackages, apiInstallPackage, apiChatStream, apiTerminalCommand,
  apiGetConversations, apiGetSessionHistory, apiDeleteSession
} from '../utils/api';
import { marked } from 'marked';

const SNIPPETS = [
  { name: 'Bubble Sort (Python)', code: 'def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr\n' },
  { name: 'Fetch API (JS)', code: 'fetch("https://api.example.com/data")\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error(error));\n' },
  { name: 'Express Server (JS)', code: 'const express = require("express");\nconst app = express();\n\napp.get("/", (req, res) => {\n  res.send("Hello World!");\n});\n\napp.listen(3000, () => {\n  console.log("Server running on port 3000");\n});\n' },
  { name: 'Pandas Read (Py)', code: 'import pandas as pd\n\ndf = pd.read_csv("data.csv")\nprint(df.head())\nprint(df.describe())\n' },
  { name: 'React Component', code: 'import React from "react";\n\nconst MyComponent = () => {\n  return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  );\n};\n\nexport default MyComponent;\n' },
  { name: 'SQL Connection', code: 'import sqlite3\n\nconn = sqlite3.connect("database.db")\ncursor = conn.cursor()\ncursor.execute("SELECT * FROM users")\nrows = cursor.fetchall()\nconn.close()\n' }
];

const CodeWorkspace = ({ user, settings }) => {
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContents, setFileContents] = useState({});
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('explorer'); 
  const [showExplorer, setShowExplorer] = useState(window.innerWidth > 1024);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLoading, setTerminalLoading] = useState(false);
  
  const [showSnippets, setShowSnippets] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [collabMode, setCollabMode] = useState(false);
  const [showLiveDetails, setShowLiveDetails] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  
  const [showAi, setShowAi] = useState(false);
  const [aiChat, setAiChat] = useState([{ 
    role: 'assistant', 
    content: 'Welcome to the Nexus Intelligence Lab. I am your Senior Code Engineer. Share your logic or terminal errors, and I will help you build and debug faster.' 
  }]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [architectMode, setArchitectMode] = useState(true);
  
  const [sessionId, setSessionId] = useState(localStorage.getItem('nexusai_workspace_session_id') || Math.random().toString(36).substring(7));
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const aiChatEndRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChat]);

  const fetchFiles = async () => {
    try {
      const data = await apiGetFiles();
      setFiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPackages = async () => {
    try {
      const data = await apiGetPackages();
      setPackages(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchPackages();
    
    const handleResize = () => {
      if (window.innerWidth < 1024) setShowExplorer(false);
      else setShowExplorer(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchChatHistory = async () => {
    if (!user?.id) return;
    setHistoryLoading(true);
    try {
      const data = await apiGetConversations(user.id);
      setChatHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadHistorySession = async (sessId) => {
    try {
      setHistoryLoading(true);
      const historyMsgs = await apiGetSessionHistory(sessId);
      if (historyMsgs && historyMsgs.length > 0) {
        setAiChat(historyMsgs);
        setSessionId(sessId);
        localStorage.setItem('nexusai_workspace_session_id', sessId);
        setSidebarTab('codebot');
      } else {
        alert('This session has no saved message history.');
      }
    } catch (err) {
      console.error("Failed to load session history:", err);
      alert('Failed to retrieve chat details.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteHistorySession = async (e, sessId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      await apiDeleteSession(sessId);
      fetchChatHistory();
      if (sessionId === sessId) {
        setSessionId(Math.random().toString(36).substring(7));
        setAiChat([{ 
          role: 'assistant', 
          content: 'Welcome to the Nexus Intelligence Lab. I am your Senior Code Engineer. Share your logic or terminal errors, and I will help you build and debug faster.' 
        }]);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert('Failed to delete history session.');
    }
  };

  useEffect(() => {
    if (sidebarTab === 'history') {
      fetchChatHistory();
    }
  }, [sidebarTab]);

  const openFile = async (path, defaultName = null) => {
    const name = defaultName || path.split('/').pop();
    if (!openFiles.find(f => f.path === path)) {
      setOpenFiles(prev => [...prev, { path, name }]);
    }
    setActiveFile(path);
    if (window.innerWidth < 1024) setShowExplorer(false);
    
    if (fileContents[path] === undefined) {
      try {
        const res = await apiGetFileContent(path);
        setFileContents(prev => ({ ...prev, [path]: res.content }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const closeFile = (e, path) => {
    e.stopPropagation();
    const newOpen = openFiles.filter(f => f.path !== path);
    setOpenFiles(newOpen);
    if (activeFile === path) {
      setActiveFile(newOpen.length > 0 ? newOpen[newOpen.length - 1].path : null);
    }
  };

  const handleContentChange = (val) => {
    if (!activeFile) return;
    setFileContents(prev => ({ ...prev, [activeFile]: val }));
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setLoading(true);
    try {
      await apiSaveFile(activeFile, fileContents[activeFile]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    if (!activeFile) return;
    setLoading(true);
    setShowTerminal(true);
    setOutput(`[SYSTEM] Initializing execution for ${activeFile.split('/').pop()}...\n`);
    try {
      await apiSaveFile(activeFile, fileContents[activeFile]); 
      const res = await apiRunCode(activeFile);
      setOutput(res.output || res.error || 'Execution finished with no output.');
    } catch (err) {
      setOutput(`[FATAL ERROR]: ${err.message}`);
      setAiInput(`I just ran ${activeFile.split('/').pop()} and got this error:\n\n${err.message}\n\nCan you analyze and fix this?`);
      setShowAi(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallPkg = async () => {
    if (!newPkgName.trim()) return;
    setLoading(true);
    try {
      await apiInstallPackage(newPkgName);
      setNewPkgName('');
      fetchPackages();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const insertToEditor = (code, replace = false) => {
    if (!activeFile) return;
    if (replace) {
      handleContentChange(code);
      return;
    }
    const current = fileContents[activeFile] || '';
    handleContentChange(current + (current ? '\n' : '') + code);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const MessageContent = ({ content }) => {
    const parts = content.split(/```/);
    return (
      <div className="flex flex-col gap-2 w-full">
        {parts.map((part, i) => {
          if (i % 2 === 1) { 
            const lines = part.split('\n');
            const lang = lines[0].trim();
            const code = lines.slice(1).join('\n').trim();
            return (
              <div key={i} className="bg-slate-950 rounded-xl border border-white/10 overflow-hidden shadow-2xl w-full my-2">
                <div className="px-3 py-2 bg-white/5 border-b border-white/5 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{lang || 'code'}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => copyToClipboard(code)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all" title="Copy"><Copy size={12} /></button>
                    <button onClick={() => insertToEditor(code, true)} className="px-2 py-1 bg-indigo-600 text-white text-[9px] font-black rounded-md hover:bg-indigo-500 transition-all">OVERWRITE</button>
                    <button onClick={() => insertToEditor(code, false)} className="px-2 py-1 bg-white/5 text-slate-300 text-[9px] font-black rounded-md hover:bg-white/10 transition-all">APPEND</button>
                  </div>
                </div>
                <pre className="p-4 m-0 text-xs font-mono overflow-x-auto text-slate-300 custom-scrollbar">{code}</pre>
              </div>
            );
          }
          return <p key={i} className="m-0 text-[var(--text-1)] text-sm leading-relaxed whitespace-pre-wrap">{part}</p>;
        })}
      </div>
    );
  };

  const handleCreateFile = async (e) => {
    if (e.key === 'Enter' && newFileName.trim()) {
      const name = newFileName.trim();
      setLoading(true);
      try {
        const res = await apiSaveFile(name, '');
        await fetchFiles();
        openFile(res.path || name, name);
        setIsCreatingFile(false);
        setNewFileName('');
      } catch (err) {
        console.error("Failed to create file", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTerminalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (terminalInput.trim()) {
      const cmd = terminalInput.trim();
      setTerminalInput('');
      setTerminalLoading(true);
      setOutput(prev => prev + `\n$ ${cmd}\n`);
      try {
        const res = await apiTerminalCommand(cmd);
        if (res.error) {
          setOutput(prev => prev + `⚠️ Error: ${res.error}\n`);
        } else {
          setOutput(prev => prev + (res.output || '') + '\n');
        }
      } catch (err) {
        setOutput(prev => prev + `⚠️ Sync Error: ${err.message}\n`);
      } finally {
        setTerminalLoading(false);
      }
    }
  };

  const handleAiChat = async (e) => {
    if (e.key === 'Enter' && aiInput.trim()) {
      const userMsg = aiInput.trim();
      setAiInput('');
      const newMsgs = [...aiChat, { role: 'user', content: userMsg }];
      setAiChat(newMsgs);
      setAiLoading(true);
      try {
        const codingSystemPrompt = architectMode ? `You are the Nexus Senior Software Architect. 
        Guidelines: Use markdown blocks for code. If asked to fix, provide full corrected file content.` : `Helpful coding assistant.`;
        
        const streamSettings = { ...settings, system_prompt: codingSystemPrompt };
        let streamingMsgs = [...newMsgs, { role: 'assistant', content: '' }];
        setAiChat(streamingMsgs);

        const result = await apiChatStream(
          [...aiChat, { role: 'user', content: userMsg }],
          streamSettings,
          user?.id,
          sessionId,
          (chunkText) => {
            streamingMsgs = [...newMsgs, { role: 'assistant', content: chunkText }];
            setAiChat(streamingMsgs);
          }
        );

        const finalResponse = result?.response || streamingMsgs[streamingMsgs.length - 1]?.content || '';
        setAiChat([...newMsgs, { role: 'assistant', content: finalResponse }]);

        if (autoApply && finalResponse.includes('```')) {
          const codeMatch = finalResponse.match(/```[\w]*\n([\s\S]*?)```/);
          if (codeMatch && codeMatch[1]) {
            insertToEditor(codeMatch[1].trim(), true);
          }
        }
      } catch (err) {
        setAiChat([...newMsgs, { role: 'assistant', content: `⚠️ Error: ${err.message}` }]);
      } finally {
        setAiLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[var(--bg-0)] relative overflow-hidden text-[var(--text-0)]">
      
      {/* File Explorer - Sidebar */}
      <div className={`
        fixed lg:relative z-[100] h-full lg:h-auto w-[280px] bg-[var(--bg-1)] backdrop-blur-3xl border-r border-[var(--border-subtle)] flex flex-col transition-all duration-500
        ${showExplorer ? 'translate-x-0' : '-translate-x-full lg:-ml-[280px]'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-[var(--border-subtle)]">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-2)] flex items-center gap-2">
            <Folder size={14} className="text-[var(--accent)]" /> Workspace
          </span>
          <div className="flex gap-1">
            <button className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg text-[var(--text-2)]" onClick={() => { setSidebarTab('explorer'); setIsCreatingFile(true); }}>
              <Plus size={16} />
            </button>
            <button className="lg:hidden p-1.5 hover:bg-[var(--bg-hover)] rounded-lg text-[var(--text-2)]" onClick={() => setShowExplorer(false)}>
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex border-b border-[var(--border-subtle)] overflow-x-auto no-scrollbar">
          {[
            { id: 'explorer', label: 'Files', icon: Folder },
            { id: 'codebot', label: 'CodeBot', icon: Sparkles },
            { id: 'packages', label: 'Deps', icon: Package },
            { id: 'snippets', label: 'Snips', icon: Code },
            { id: 'history', label: 'History', icon: Clock }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={`flex-1 min-w-[56px] py-3 flex flex-col items-center gap-1 text-[8px] font-black uppercase tracking-widest transition-all ${sidebarTab === tab.id ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent)]/5' : 'text-[var(--text-2)] hover:text-[var(--text-0)]'}`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col">
          {sidebarTab === 'codebot' && (
            <div className="flex flex-col flex-1 h-full space-y-4">
              <div className="px-2 pb-2 border-b border-[var(--border-subtle)]/30 flex items-center justify-between">
                <span className="text-[10px] font-black text-[var(--text-2)] uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[var(--accent)] animate-pulse" /> CodeBot AI
                </span>
                <span className="text-[8px] font-black text-[var(--accent)] uppercase bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">Synced</span>
              </div>
              
              {/* Mini chat feed */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px] custom-scrollbar flex flex-col">
                {aiChat.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-xl border text-xs max-w-[95%] ${m.role === 'user' ? 'bg-[var(--accent)] border-transparent text-white' : 'bg-[var(--bg-2)] border-[var(--border-subtle)] text-[var(--text-1)]'}`}>
                      <div className="text-[8px] font-black uppercase opacity-60 mb-2 flex items-center justify-between gap-2">
                        <span>{m.role}</span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(m.content)}
                          className="p-1 hover:bg-white/10 rounded text-[8px] transition-all opacity-60 hover:opacity-100"
                          title="Copy message"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex items-center gap-2 p-2.5 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-xl w-fit animate-pulse">
                    <Loader2 size={12} className="animate-spin text-[var(--accent)]" />
                    <span className="text-[9px] font-black text-[var(--text-2)] uppercase tracking-widest italic">Thinking...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="pt-2 border-t border-[var(--border-subtle)]/30">
                <div className="flex gap-1.5 p-1 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl focus-within:border-[var(--accent)] transition-all items-center">
                  {activeFile && (
                    <button 
                      onClick={() => {
                        const fileName = activeFile.split(/[/\\]/).pop();
                        const fileContent = fileContents[activeFile] || '';
                        const extension = fileName.split('.').pop() || 'txt';
                        setAiInput(prev => {
                          const separator = prev ? '\n\n' : '';
                          return prev + separator + `Existing code in [${fileName}]:\n\`\`\`${extension}\n${fileContent}\n\`\`\``;
                        });
                      }}
                      type="button"
                      className="p-1.5 bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--accent)] rounded-lg transition-all flex items-center justify-center shrink-0"
                      title="Include active file code"
                    >
                      <FileCode size={12} />
                    </button>
                  )}
                  <input 
                    type="text" 
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiChat(e)}
                    placeholder="Ask CodeBot..."
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold px-2 py-1.5 text-[var(--text-0)]"
                  />
                  <button 
                    onClick={() => handleAiChat({ key: 'Enter' })}
                    disabled={aiLoading || !aiInput.trim()}
                    className="p-2 bg-[var(--accent)] text-white rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 shrink-0"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {sidebarTab === 'explorer' && (
            <div className="space-y-1">
              {isCreatingFile && (
                <div className="flex items-center gap-3 p-3 bg-[var(--accent)]/5 rounded-xl border border-[var(--accent)]/20 animate-in zoom-in-95 duration-300">
                  <FileCode size={16} className="text-[var(--accent)]" />
                  <input 
                    autoFocus
                    type="text" 
                    value={newFileName}
                    onChange={e => setNewFileName(e.target.value)}
                    onKeyDown={handleCreateFile}
                    onBlur={() => setIsCreatingFile(false)}
                    placeholder="app.py"
                    className="flex-1 bg-transparent border-none outline-none text-[var(--text-0)] text-sm font-bold placeholder:text-[var(--text-2)]"
                  />
                </div>
              )}
              {files.map(file => (
                <button 
                  key={file.path}
                  onClick={() => openFile(file.path, file.name)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${activeFile === file.path ? 'bg-[var(--bg-2)] text-[var(--text-0)] border border-[var(--border-subtle)] shadow-sm' : 'text-[var(--text-1)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-0)]'}`}
                >
                  <FileCode size={16} className={activeFile === file.path ? 'text-[var(--accent)]' : 'text-[var(--text-2)] group-hover:text-[var(--text-1)]'} />
                  <span className="text-sm font-bold truncate">{file.name}</span>
                </button>
              ))}
            </div>
          )}

          {sidebarTab === 'packages' && (
            <div className="space-y-6">
              <div className="space-y-3 px-2">
                <label className="text-[10px] font-black text-[var(--text-2)] uppercase tracking-widest">Install Dependency</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newPkgName}
                    onChange={e => setNewPkgName(e.target.value)}
                    placeholder="e.g. numpy"
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-sm text-[var(--text-0)] outline-none focus:border-[var(--accent)]"
                  />
                  <button onClick={handleInstallPkg} disabled={loading} className="p-2.5 bg-[var(--accent)] text-white rounded-xl shadow-lg">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-[var(--text-2)] uppercase tracking-widest px-2">Environment</h4>
                {packages.map(pkg => (
                  <div key={pkg.name} className="flex items-center justify-between p-3 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-xl">
                    <span className="text-xs font-bold text-[var(--text-1)]">{pkg.name}</span>
                    <span className="text-[10px] font-black text-[var(--accent)] opacity-60">{pkg.version}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sidebarTab === 'snippets' && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-[var(--text-2)] uppercase tracking-widest px-2">Quantum Snippets</h4>
              {SNIPPETS.map(s => (
                <div key={s.name} className="group p-4 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--accent)] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-[var(--text-1)]">{s.name}</span>
                    <button onClick={() => insertToEditor(s.code)} className="text-[9px] font-black text-[var(--accent)] uppercase tracking-tighter bg-[var(--accent)]/10 px-2 py-1 rounded hover:bg-[var(--accent)] hover:text-white transition-all">Inject</button>
                  </div>
                  <pre className="text-[10px] font-mono text-[var(--text-2)] truncate opacity-60">{s.code.slice(0, 50)}...</pre>
                </div>
              ))}
            </div>
          )}

          {sidebarTab === 'history' && (
            <div className="flex flex-col flex-1 h-full space-y-4">
              <div className="px-2 pb-2 border-b border-[var(--border-subtle)]/30 flex items-center justify-between">
                <span className="text-[10px] font-black text-[var(--text-2)] uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={12} className="text-[var(--accent)] animate-pulse" /> Chat History
                </span>
                <span className="text-[8px] font-black text-[var(--text-2)] uppercase bg-[var(--bg-hover)] px-1.5 py-0.5 rounded">Cloud Saved</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] custom-scrollbar pr-1">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-10 gap-2">
                    <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
                    <span className="text-[9px] text-[var(--text-2)] uppercase tracking-widest font-black">Syncing...</span>
                  </div>
                ) : chatHistory.map(session => (
                  <div 
                    key={session.id} 
                    onClick={() => loadHistorySession(session.id)}
                    className={`p-3 bg-[var(--bg-2)] border rounded-xl transition-all cursor-pointer text-left relative group/session ${
                      sessionId === session.id 
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm' 
                        : 'border-[var(--border-subtle)] hover:border-[var(--text-2)]/30'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5 pr-6">
                      <span className="text-[10px] font-bold text-[var(--text-0)] truncate">{session.title || 'Untitled Session'}</span>
                      <span className="text-[8px] font-mono text-[var(--text-2)] whitespace-nowrap">{new Date(session.updatedAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[9px] text-[var(--text-2)] truncate font-semibold">{session.lastMessage || 'No messages'}</p>
                    
                    <button 
                      onClick={(e) => deleteHistorySession(e, session.id)}
                      className="absolute right-2 top-2 p-1 hover:bg-rose-500/10 rounded-lg text-rose-500 transition-all opacity-0 group-hover/session:opacity-100"
                      title="Delete Session"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                {!historyLoading && chatHistory.length === 0 && (
                  <div className="text-[10px] font-bold text-center text-slate-500 py-6 uppercase tracking-widest">No history sessions found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-0)] relative">
        
        {/* Navigation Toolbar */}
        <div className="h-14 bg-[var(--bg-glass)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 sticky top-0 z-[50] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-[var(--bg-hover)] rounded-xl text-[var(--text-2)] transition-all" onClick={() => setShowExplorer(!showExplorer)}>
              <Layout size={18} className={showExplorer ? 'text-[var(--accent)]' : ''} />
            </button>
            <div className="hidden lg:flex overflow-x-auto no-scrollbar gap-1 max-w-[500px]">
              {openFiles.map(f => (
                <div key={f.path} onClick={() => setActiveFile(f.path)} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all border ${activeFile === f.path ? 'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]' : 'bg-transparent border-transparent text-[var(--text-2)] hover:text-[var(--text-0)]'}`}>
                  <span className="text-xs font-black uppercase tracking-tighter truncate max-w-[80px]">{f.name}</span>
                  <X size={12} className="hover:text-rose-500" onClick={(e) => closeFile(e, f.path)} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCollabMode(!collabMode)}
              className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${collabMode ? 'bg-[var(--accent)] text-white shadow-lg shadow-indigo-500/20' : 'bg-[var(--bg-hover)] text-[var(--text-2)] border border-[var(--border-subtle)] hover:text-[var(--text-0)]'}`}
            >
              <Users size={14} /> <span>{collabMode ? 'Collab Active' : 'Go Live'}</span>
            </button>
            
            {collabMode && (
              <div 
                onClick={() => setShowLiveDetails(!showLiveDetails)}
                className="relative flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-mono text-[9px] font-black tracking-widest uppercase cursor-pointer hover:bg-emerald-500/20 transition-all select-none animate-pulse"
              >
                <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-[9px]">
                  {(user?.username || 'R')[0].toUpperCase()}
                </div>
                <span>{user?.username || 'raghav'} (LIVE)</span>
                
                {showLiveDetails && (
                  <div className="absolute top-10 right-0 w-72 bg-[var(--bg-2)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-4 z-50 text-[var(--text-0)] font-sans uppercase-none tracking-normal normal-case animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]/20 mb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Live Status Panel</h4>
                      <X size={12} className="cursor-pointer hover:text-rose-500" onClick={(e) => { e.stopPropagation(); setShowLiveDetails(false); }} />
                    </div>
                    <div className="space-y-2.5 text-[11px] font-medium text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--text-2)]">Broadcaster:</span>
                        <span className="font-bold">{user?.username || 'raghav'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--text-2)]">Email:</span>
                        <span className="font-bold lowercase truncate max-w-[150px]">{user?.email || 'raghav@gmail.com'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--text-2)]">Port Status:</span>
                        <span className="font-bold font-mono text-emerald-400">5173 (Broadcasting)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--text-2)]">Active Connection:</span>
                        <span className="font-bold text-emerald-400">1 Client Connected</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]/20 flex flex-col gap-2">
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${window.location.origin}/?session=${Math.random().toString(36).substring(7)}`);
                            alert('Nexus Broadcast Link copied to clipboard!');
                          }}
                          className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all active:scale-95 text-center flex items-center justify-center gap-1"
                        >
                          <Copy size={10} /> Copy Invite Link
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button 
              onClick={() => setShowAi(!showAi)} 
              className={`flex items-center gap-2 px-3.5 py-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-2)] rounded-xl hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all ${showAi ? 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/20' : ''}`}
              title="Toggle AI CodeBot Split Pane"
            >
              <Sparkles size={14} className={showAi ? 'animate-pulse text-[var(--accent)]' : ''} />
              <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">CodeBot AI</span>
            </button>
            <button onClick={handleRun} disabled={loading || !activeFile} className={`flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl shadow-lg active:scale-95 transition-all text-xs font-black uppercase tracking-widest ${loading ? 'opacity-50' : ''}`}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="white" />}
              <span className="hidden sm:inline">Execute</span>
            </button>
            <button className="p-2.5 bg-[var(--bg-hover)] text-[var(--text-2)] rounded-xl hover:text-[var(--text-0)]" onClick={handleSave} disabled={!activeFile}>
              <Save size={18} />
            </button>
          </div>
        </div>

        {/* Main Split-Screen Layout Container */}
        <div className="flex-1 flex flex-row relative overflow-hidden">
          
          {/* Editor & Terminal Section */}
          <div className="flex-1 flex flex-col relative overflow-hidden min-w-0">
            {/* Editor & Terminal Wrapper */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
          {activeFile ? (
            <div className="flex-1 flex flex-col relative overflow-hidden">
              {collabMode && (
                <div className="absolute top-6 right-6 z-50 flex items-center gap-3 bg-[var(--bg-2)]/95 backdrop-blur-2xl px-4 py-2.5 rounded-2xl border border-emerald-500/30 shadow-2xl shadow-indigo-500/20">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[var(--text-0)] uppercase tracking-widest">
                      Live Collab Session
                    </span>
                    <span className="text-[8px] font-bold text-emerald-400 uppercase mt-0.5">
                      Host: {user?.username || 'raghav'} (Active)
                    </span>
                  </div>
                </div>
              )}
              <textarea 
                ref={editorRef}
                value={fileContents[activeFile] || ''}
                onChange={(e) => handleContentChange(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-[var(--bg-0)] text-[var(--text-1)] font-mono text-sm md:text-base p-6 outline-none resize-none custom-scrollbar leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = e.target.selectionStart;
                    const end = e.target.selectionEnd;
                    handleContentChange((fileContents[activeFile] || '').substring(0, start) + "    " + (fileContents[activeFile] || '').substring(end));
                    setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 4; }, 0);
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-2)] p-10 text-center animate-in fade-in duration-700">
              <div className="w-20 h-20 bg-[var(--bg-hover)] rounded-3xl flex items-center justify-center mb-6 border border-[var(--border-subtle)] shadow-sm">
                <Code size={40} className="opacity-20" />
              </div>
              <h2 className="text-xl font-black text-[var(--text-0)] mb-2 tracking-tight">Neural Workspace</h2>
              <p className="text-sm font-medium max-w-xs opacity-60">Architect high-performance systems. Select a file to begin synthesis.</p>
            </div>
          )}

          {/* Terminal Drawer */}
          <div className={`
            absolute bottom-0 left-0 right-0 z-40 bg-[var(--bg-1)] backdrop-blur-3xl border-t border-[var(--border-subtle)] transition-all duration-500
            ${showTerminal ? 'h-[40%] md:h-[280px]' : 'h-10'}
          `}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-hover)] cursor-pointer" onClick={() => setShowTerminal(!showTerminal)}>
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[var(--accent)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-1)]">Virtual Shell</span>
              </div>
              <div className="flex items-center gap-3">
                {output && output !== 'Ready.' && (
                  <button onClick={(e) => { e.stopPropagation(); setShowAi(true); setAiInput(`Analyze and fix this terminal output:\n${output}`); }} className="text-[9px] font-black text-rose-500 uppercase tracking-tighter bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">AI FIX</button>
                )}
                <ChevronRight size={16} className={`text-[var(--text-2)] transition-transform ${showTerminal ? 'rotate-90' : ''}`} />
              </div>
            </div>
            {showTerminal && (
              <div className="p-4 md:p-6 h-[calc(100%-40px)] flex flex-col justify-between overflow-hidden">
                <pre className="flex-1 overflow-y-auto text-xs md:text-sm font-mono text-[var(--text-1)] leading-relaxed custom-scrollbar whitespace-pre-wrap mb-3 pr-2">
                  <span className="text-[var(--accent)] opacity-50 font-bold">$ </span>{output || 'Nexus Core ready for execution...'}
                </pre>
                
                {/* Shell Command Input */}
                <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]/20 w-full">
                  <span className="text-[var(--accent)] font-black text-xs">$</span>
                  <input 
                    type="text" 
                    value={terminalInput}
                    onChange={e => setTerminalInput(e.target.value)}
                    placeholder="Type shell command (e.g., dir, pip list, python file.py)..."
                    className="flex-1 bg-transparent border-none outline-none text-[var(--text-0)] placeholder:text-[var(--text-2)] font-mono text-xs font-bold"
                  />
                  {terminalLoading && <Loader2 size={12} className="animate-spin text-[var(--accent)]" />}
                </form>
              </div>
            )}
          </div>
        </div>
        </div> {/* Closes Editor & Terminal Section */}

        {/* AI Architect Panel */}
        {showAi && (
          <div className={`
            fixed inset-0 lg:relative lg:w-[420px] xl:w-[480px] z-[200] bg-[var(--bg-2)] backdrop-blur-3xl flex flex-col shadow-2xl lg:border-l border-[var(--border-subtle)] animate-in slide-in-from-right-10 duration-500
          `}>
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-1)]">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-[var(--accent-gradient)] rounded-xl flex items-center justify-center shadow-xl shadow-indigo-500/20">
                  <Cpu size={22} color="white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--text-0)] leading-none">Senior Architect</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest">Neural Sync</span>
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setAutoApply(!autoApply)}
                  className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all ${autoApply ? 'bg-[var(--accent)] border-transparent text-white' : 'bg-[var(--bg-hover)] border-[var(--border-subtle)] text-[var(--text-2)]'}`}
                >
                  Auto-Sync {autoApply ? 'ON' : 'OFF'}
                </button>
                <button className="p-2 hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-2)] transition-all" onClick={() => setShowAi(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* AI Action Quick-Row */}
            <div className="flex gap-2 p-4 bg-[var(--bg-0)] border-b border-[var(--border-subtle)] overflow-x-auto no-scrollbar">
              {[
                { label: 'Optimize', icon: Cpu, color: 'text-indigo-500', prompt: 'Optimize this code for performance and memory efficiency.' },
                { label: 'Refactor', icon: ShieldCheck, color: 'text-emerald-500', prompt: 'Refactor this code to follow Senior Architect best practices.' },
                { label: 'Document', icon: FileCode, color: 'text-blue-500', prompt: 'Add comprehensive documentation to this file.' },
                { label: 'Unit Tests', icon: Activity, color: 'text-rose-500', prompt: 'Generate robust unit tests for all functions.' }
              ].map(action => (
                <button 
                  key={action.label}
                  onClick={() => { setAiInput(action.prompt); handleAiChat({ key: 'Enter' }); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-xl whitespace-nowrap hover:bg-[var(--bg-hover)] transition-all shadow-sm"
                >
                  <action.icon size={14} className={action.color} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-1)]">{action.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-[var(--bg-0)]">
              {aiChat.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[92%] p-5 rounded-2xl border ${m.role === 'user' ? 'bg-[var(--accent)] border-transparent text-white rounded-br-none shadow-xl shadow-indigo-500/10' : 'bg-[var(--bg-2)] border-[var(--border-subtle)] text-[var(--text-1)] rounded-bl-none shadow-sm'}`}>
                    <div className={`text-[8px] font-black uppercase tracking-widest mb-3 flex items-center justify-between gap-2 ${m.role === 'user' ? 'text-indigo-100' : 'text-[var(--accent)]'}`}>
                      <span>{m.role}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(m.content)}
                        className="p-1 hover:bg-white/10 rounded text-[8px] transition-all opacity-60 hover:opacity-100"
                        title="Copy message"
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                    <MessageContent content={m.content} />
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex items-center gap-3 p-4 bg-[var(--bg-hover)] rounded-2xl border border-[var(--border-subtle)] w-fit animate-pulse">
                  <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
                  <span className="text-[10px] font-black text-[var(--text-2)] uppercase tracking-widest italic">Architect Thinking...</span>
                </div>
              )}
              <div ref={aiChatEndRef} />
            </div>

            <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-1)] backdrop-blur-xl">
              <div className="flex gap-2 p-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl focus-within:border-[var(--accent)] transition-all shadow-sm items-center">
                {activeFile && (
                  <button 
                    onClick={() => {
                      const fileName = activeFile.split(/[/\\]/).pop();
                      const fileContent = fileContents[activeFile] || '';
                      const extension = fileName.split('.').pop() || 'txt';
                      setAiInput(prev => {
                        const separator = prev ? '\n\n' : '';
                        return prev + separator + `Existing code in [${fileName}]:\n\`\`\`${extension}\n${fileContent}\n\`\`\``;
                      });
                    }}
                    type="button"
                    className="p-2.5 bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--accent)] rounded-xl transition-all flex items-center justify-center shrink-0"
                    title="Include active file code"
                  >
                    <FileCode size={16} />
                  </button>
                )}
                <input 
                  type="text" 
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiChat(e)}
                  placeholder="Query Architect Intelligence..."
                  className="flex-1 bg-transparent border-none outline-none text-[var(--text-0)] text-sm font-bold px-4 py-2 placeholder:text-[var(--text-2)]"
                />
                <button 
                  onClick={() => handleAiChat({ key: 'Enter' })}
                  disabled={aiLoading || !aiInput.trim()}
                  className="w-11 h-11 bg-[var(--accent)] text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
        </div> {/* Closes Main Split-Screen Layout Container */}
      </div>
    </div>
  );
};

export default CodeWorkspace;
