import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode, Play, Save, Folder, ChevronRight, Terminal, Plus, Trash2, 
  Download, Settings, Cpu, Package, Activity, User, MoreVertical, Loader2,
  X, Code, Clock, Users, Search, Copy, Check, ArrowRight
} from 'lucide-react';
import { 
  apiGetFiles, apiGetFileContent, apiSaveFile, apiRunCode, 
  apiGetPackages, apiInstallPackage, apiChatStream
} from '../utils/api';

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
  const [sidebarTab, setSidebarTab] = useState('explorer'); // 'explorer' or 'packages'
  
  const [showSnippets, setShowSnippets] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [collabMode, setCollabMode] = useState(false);
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


  const aiChatEndRef = useRef(null);

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
  }, []);

  const openFile = async (path, defaultName = null) => {
    const name = defaultName || path.split('/').pop();
    if (!openFiles.find(f => f.path === path)) {
      setOpenFiles(prev => [...prev, { path, name }]);
    }
    setActiveFile(path);
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
    setOutput(`Running ${activeFile.split('/').pop()}...\n`);
    try {
      await apiSaveFile(activeFile, fileContents[activeFile]); // Auto save before run
      const res = await apiRunCode(activeFile);
      setOutput(res.output || res.error || 'Execution finished with no output.');
    } catch (err) {
      setOutput(`System Error: ${err.message}`);
      // Show AI fix button automatically on error
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

  const insertSnippet = (code) => {
    if (!activeFile) return;
    handleContentChange((fileContents[activeFile] || '') + '\n' + code);
    setShowSnippets(false);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        {parts.map((part, i) => {
          if (i % 2 === 1) { // Code block
            const lines = part.split('\n');
            const lang = lines[0].trim();
            const code = lines.slice(1).join('\n').trim();
            return (
              <div key={i} style={{ 
                background: '#0f172a', 
                borderRadius: '12px', 
                border: '1px solid rgba(99, 102, 241, 0.3)', 
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                width: '100%'
              }}>
                <div style={{ 
                  padding: '10px 14px', 
                  background: 'rgba(255,255,255,0.03)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {lang || 'code'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => copyToClipboard(code)} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} 
                      title="Copy to Clipboard"
                    >
                      <Copy size={12} />
                    </button>
                    <button 
                      onClick={() => insertToEditor(code, true)} 
                      style={{ 
                        background: 'var(--accent)', 
                        border: 'none', 
                        color: 'white', 
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.65rem', 
                        fontWeight: '700' 
                      }}
                    >
                      <Save size={12} /> OVERWRITE
                    </button>
                    <button 
                      onClick={() => insertToEditor(code, false)} 
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--border-subtle)', 
                        color: 'var(--text-1)', 
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.65rem', 
                        fontWeight: '700' 
                      }}
                    >
                      <ArrowRight size={12} /> APPEND
                    </button>
                  </div>
                </div>
                <pre className="custom-scrollbar" style={{ padding: '16px', margin: 0, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', overflowX: 'auto', color: '#cbd5e1', lineHeight: '1.5' }}>{code}</pre>
              </div>
            );
          }
          return <p key={i} style={{ margin: 0, color: 'var(--text-1)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{part}</p>;
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

  const handleAiChat = async (e) => {
    if (e.key === 'Enter' && aiInput.trim()) {
      const userMsg = aiInput.trim();
      setAiInput('');
      const newMsgs = [...aiChat, { role: 'user', content: userMsg }];
      setAiChat(newMsgs);
      setAiLoading(true);
      if (!settings.groq_api_key) {
        setAiChat([...newMsgs, { role: 'assistant', content: '⚠️ Groq API Key missing. Please set your key in the main Settings panel.' }]);
        setAiLoading(false);
        return;
      }
      try {
        const codingSystemPrompt = architectMode ? `You are the Nexus Senior Software Architect. 
        Your goal is to provide high-quality, production-ready code. 
        Current Context:
        - Active File: ${activeFile || 'None'}
        - Language: ${activeFile ? activeFile.split('.').pop() : 'Plain Text'}
        - File Content: \`\`\`${activeFile ? (fileContents[activeFile] || 'Empty') : 'N/A'}\`\`\`
        
        Guidelines:
        1. When providing code, use markdown blocks with the correct language tag.
        2. If asked to fix a file, provide the full corrected file content in one block.
        3. Explain your logic briefly before or after the code.
        4. Focus on performance, security, and best practices.
        5. In Architect Mode, prioritize scalability and clean code principles.` 
        : `You are a helpful coding assistant. Help the user write and debug code.`;

        const streamSettings = { ...settings, system_prompt: codingSystemPrompt };
        let streamingMsgs = [...newMsgs, { role: 'assistant', content: '' }];
        setAiChat(streamingMsgs);

        const result = await apiChatStream(
          [...aiChat, { role: 'user', content: userMsg }],
          streamSettings,
          null,
          null,
          (chunkText) => {
            streamingMsgs = [...newMsgs, { role: 'assistant', content: chunkText }];
            setAiChat(streamingMsgs);
          }
        );

        const finalResponse = result?.response || streamingMsgs[streamingMsgs.length - 1]?.content || '';
        setAiChat([...newMsgs, { role: 'assistant', content: finalResponse }]);

        // Auto-Apply logic if enabled
        if (autoApply && finalResponse.includes('```')) {
          const codeMatch = finalResponse.match(/```[\w]*\n([\s\S]*?)```/);
          if (codeMatch && codeMatch[1]) {
            insertToEditor(codeMatch[1].trim(), true);
          }
        }

      } catch (err) {
        console.error(err);
        setAiChat([...newMsgs, { role: 'assistant', content: `⚠️ Error: ${err.message}` }]);
      } finally {

        setAiLoading(false);
      }
    }
  };

  const handleFixError = () => {
    if (!output || output === 'Ready.') return;
    setShowAi(true);
    setAiInput(`I encountered an error while running my code. Here is the terminal output:\n\n${output}\n\nPlease analyze and provide a fix.`);
  };


  return (
    <div className="code-workspace" style={{ height: '100%', display: 'flex', background: 'var(--bg-0)', position: 'relative' }}>
      
      {/* Left Sidebar */}
      <div className="file-explorer" style={{ width: '260px', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'var(--bg-1)' }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explorer</span>
          <button className="icon-btn" style={{ padding: '4px' }} onClick={() => { setSidebarTab('explorer'); setIsCreatingFile(true); }}>
            <Plus size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          <button 
            onClick={() => setSidebarTab('explorer')}
            style={{ flex: 1, padding: '12px 0', background: sidebarTab === 'explorer' ? 'transparent' : 'var(--bg-2)', border: 'none', borderBottom: sidebarTab === 'explorer' ? '2px solid var(--text-0)' : '2px solid transparent', color: sidebarTab === 'explorer' ? 'var(--text-0)' : 'var(--text-2)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
          >
            FILES
          </button>
          <button 
            onClick={() => setSidebarTab('packages')}
            style={{ flex: 1, padding: '12px 0', background: sidebarTab === 'packages' ? 'transparent' : 'var(--bg-2)', border: 'none', borderBottom: sidebarTab === 'packages' ? '2px solid var(--text-0)' : '2px solid transparent', color: sidebarTab === 'packages' ? 'var(--text-0)' : 'var(--text-2)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
          >
            PACKAGES
          </button>
        </div>

        {sidebarTab === 'explorer' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {isCreatingFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', marginBottom: '8px', background: 'var(--bg-0)', borderRadius: '4px', border: '1px solid var(--accent)' }}>
                <FileCode size={14} color="var(--accent)" />
                <input 
                  autoFocus
                  type="text" 
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={handleCreateFile}
                  onBlur={() => setIsCreatingFile(false)}
                  placeholder="filename.py"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-0)', fontSize: '0.85rem' }}
                />
              </div>
            )}
            {files.map(file => (
              <div 
                key={file.path}
                onClick={() => openFile(file.path, file.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '4px', cursor: 'pointer',
                  background: activeFile === file.path ? 'var(--bg-2)' : 'transparent',
                  color: activeFile === file.path ? 'var(--text-0)' : 'var(--text-1)',
                  fontSize: '0.85rem', marginBottom: '2px'
                }}
              >
                <FileCode size={14} strokeWidth={1.5} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              </div>
            ))}
          </div>
        )}

        {sidebarTab === 'packages' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-2)', marginBottom: '8px' }}>Install Package</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={newPkgName}
                  onChange={e => setNewPkgName(e.target.value)}
                  placeholder="e.g. requests, numpy"
                  style={{ flex: 1, padding: '8px', background: 'var(--bg-0)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-0)', outline: 'none', fontSize: '0.8rem' }}
                />
                <button onClick={handleInstallPkg} disabled={loading} style={{ padding: '8px', background: 'var(--text-0)', color: 'var(--bg-0)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-2)', marginBottom: '12px' }}>Installed Packages</h4>
              {packages.map(pkg => (
                <div key={pkg.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-0)', border: '1px solid var(--border-subtle)', borderRadius: '4px', marginBottom: '8px', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: '600' }}>{pkg.name}</span>
                  <span style={{ color: 'var(--text-2)' }}>{pkg.version}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editor Area */}
      <div className="editor-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Editor Toolbar (Tabs & Actions) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-1)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="file-tabs" style={{ display: 'flex', overflowX: 'auto', flex: 1 }}>
            {openFiles.map(f => (
              <div 
                key={f.path}
                onClick={() => setActiveFile(f.path)}
                style={{
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  background: activeFile === f.path ? 'var(--bg-0)' : 'transparent',
                  borderRight: '1px solid var(--border-subtle)',
                  borderTop: activeFile === f.path ? '2px solid var(--accent)' : '2px solid transparent',
                  color: activeFile === f.path ? 'var(--text-0)' : 'var(--text-2)',
                  fontSize: '0.8rem', fontWeight: '600', minWidth: '120px'
                }}
              >
                {f.name}
                <button 
                  onClick={(e) => closeFile(e, f.path)} 
                  style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto', padding: '2px' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
            <button 
              onClick={() => setCollabMode(!collabMode)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: collabMode ? 'var(--accent)' : 'transparent', color: collabMode ? '#fff' : 'var(--text-1)', border: collabMode ? 'none' : '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}
            >
              <Users size={14} /> Collab {collabMode && 'Active'}
            </button>
            <button className="icon-btn" onClick={() => { setShowAi(!showAi); setShowSnippets(false); setShowHistory(false); }} title="AI Assistant">
              <Activity size={16} color={showAi ? 'var(--accent)' : 'currentColor'} />
            </button>
            <button className="icon-btn" onClick={() => { setShowSnippets(!showSnippets); setShowAi(false); setShowHistory(false); }} title="Snippets">
              <Code size={16} />
            </button>
            <button className="icon-btn" onClick={() => { setShowHistory(!showHistory); setShowAi(false); setShowSnippets(false); }} title="Version History">
              <Clock size={16} />
            </button>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />
            <button className="icon-btn" onClick={handleSave} disabled={loading || !activeFile} title="Save (Ctrl+S)">
              <Save size={16} />
            </button>
            <button 
              onClick={handleRun} 
              disabled={loading || !activeFile}
              style={{ padding: '6px 16px', background: 'var(--text-0)', color: 'var(--bg-0)', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
              Run
            </button>
          </div>
        </div>

        {/* Main Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeFile ? (
            <textarea 
              value={fileContents[activeFile] || ''}
              onChange={(e) => handleContentChange(e.target.value)}
              style={{
                flex: 1, background: 'var(--bg-0)', color: 'var(--text-0)', fontFamily: 'var(--font-mono)',
                fontSize: '14px', lineHeight: '1.6', padding: '24px', border: 'none', outline: 'none',
                resize: 'none', tabSize: 4
              }}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.target.selectionStart;
                  const end = e.target.selectionEnd;
                  handleContentChange((fileContents[activeFile] || '').substring(0, start) + "    " + (fileContents[activeFile] || '').substring(end));
                  setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 4; }, 0);
                }
                const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
                if (pairs[e.key]) {
                  e.preventDefault();
                  const start = e.target.selectionStart;
                  const end = e.target.selectionEnd;
                  const val = fileContents[activeFile] || '';
                  const newVal = val.substring(0, start) + e.key + pairs[e.key] + val.substring(end);
                  handleContentChange(newVal);
                  setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 1; }, 0);
                }
              }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
              <FileCode size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Select or create a file to start coding</p>
            </div>
          )}

          {/* Terminal / Output */}
          <div className="terminal-panel" style={{ height: '220px', borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', background: 'var(--bg-1)' }}>
            <div style={{ padding: '8px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={14} />
                <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Terminal Output</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => { setShowAi(true); setAiInput(`I encountered this error in ${activeFile || 'the console'}:\n\n${output}\n\nCan you fix it?`); }}
                  style={{ 
                    padding: '4px 12px', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    color: '#ef4444', 
                    borderRadius: '6px', 
                    fontSize: '0.65rem', 
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Activity size={10} /> AI DEBUG FIX
                </button>
              </div>
            </div>

            <pre style={{ flex: 1, padding: '16px', margin: 0, fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-1)', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {output || 'Ready.'}
            </pre>

          </div>
        </div>

        {/* Snippets Panel */}
        {showSnippets && (
          <div style={{ position: 'absolute', top: '48px', right: '0', width: '300px', bottom: '220px', background: 'var(--bg-1)', borderLeft: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '700' }}>Code Snippets</h3>
              <button className="icon-btn" onClick={() => setShowSnippets(false)}><X size={14}/></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {SNIPPETS.map(s => (
                <div key={s.name} style={{ marginBottom: '16px', background: 'var(--bg-0)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-2)', fontSize: '0.75rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                    {s.name}
                    <button onClick={() => insertSnippet(s.code)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '700' }}>Insert</button>
                  </div>
                  <pre style={{ padding: '12px', margin: 0, fontSize: '0.7rem', color: 'var(--text-1)', overflowX: 'auto', fontFamily: 'var(--font-mono)' }}>
                    {s.code}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div style={{ position: 'absolute', top: '48px', right: '0', width: '300px', bottom: '220px', background: 'var(--bg-1)', borderLeft: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '700' }}>Version Control</h3>
              <button className="icon-btn" onClick={() => setShowHistory(false)}><X size={14}/></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {activeFile ? (
                <>
                  <div style={{ padding: '12px', borderLeft: '2px solid var(--accent)', background: 'var(--bg-2)', marginBottom: '8px', borderRadius: '0 6px 6px 0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Current Version</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginBottom: '10px' }}>Just now • Unsaved</div>
                    <button 
                      onClick={() => { setShowAi(true); setAiInput(`Can you explain the changes in ${activeFile.split('/').pop()}?`); }}
                      style={{ padding: '4px 8px', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent)', border: 'none', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Activity size={10} /> Analyze with AI
                    </button>
                  </div>
                  <div style={{ padding: '12px', borderLeft: '2px solid var(--border-subtle)', background: 'var(--bg-0)', marginBottom: '8px', cursor: 'pointer', borderRadius: '0 6px 6px 0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>v1.0.2</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>2 hours ago • By You</div>
                  </div>
                  <div style={{ padding: '12px', borderLeft: '2px solid var(--border-subtle)', background: 'var(--bg-0)', marginBottom: '8px', cursor: 'pointer', borderRadius: '0 6px 6px 0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Initial Commit</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>Yesterday • By You</div>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', textAlign: 'center', marginTop: '24px' }}>Select a file to view history</div>
              )}
            </div>
          </div>
        )}
        {/* AI Assistant Panel */}
        {showAi && (
          <div style={{ position: 'absolute', top: '48px', right: '12px', width: '380px', bottom: '232px', background: 'var(--bg-1)', border: '1px solid var(--border-subtle)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', background: 'var(--accent-gradient)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cpu size={18} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0 }}>Nexus CodeBot</h3>
                  <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: '700' }}>SENIOR ARCHITECT</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => setAutoApply(!autoApply)}>
                  <div style={{ width: '32px', height: '16px', background: autoApply ? 'var(--accent)' : 'var(--bg-0)', borderRadius: '10px', position: 'relative', border: '1px solid var(--border-subtle)', transition: '0.2s' }}>
                    <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', position: 'absolute', top: '1px', left: autoApply ? '17px' : '1px', transition: '0.2s' }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-2)' }}>AUTO-SYNC</span>
                </div>
                <button className="icon-btn" onClick={() => setShowAi(false)} style={{ borderRadius: '50%', width: '28px', height: '28px' }}><X size={14}/></button>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '8px', padding: '8px 20px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border-subtle)' }}>
              <button 
                onClick={() => { setAiInput(`Can you optimize the following code in ${activeFile || 'the current file'} for better performance?\n\n\`\`\`\n${fileContents[activeFile] || ''}\n\`\`\``); setShowAi(true); }}
                style={{ padding: '6px 12px', background: 'var(--bg-1)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Cpu size={12} color="var(--accent)" /> Optimize
              </button>
              <button 
                onClick={() => { setAiInput(`Can you add comprehensive documentation and docstrings to ${activeFile || 'the current file'}?`); setShowAi(true); }}
                style={{ padding: '6px 12px', background: 'var(--bg-1)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileCode size={12} color="#10b981" /> Document
              </button>
              <button 
                onClick={() => { setAiInput(`Can you generate unit tests for the functions in ${activeFile || 'the current file'}?`); setShowAi(true); }}
                style={{ padding: '6px 12px', background: 'var(--bg-1)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Activity size={12} color="#f59e0b" /> Test
              </button>
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, position: 'relative', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-0)', padding: '20px' }}>
              {aiChat.map((m, i) => (
                <div key={i} style={{ 
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', 
                  maxWidth: '85%', 
                  padding: '12px 16px', 
                  borderRadius: m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px', 
                  background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-1)', 
                  color: m.role === 'user' ? '#fff' : 'var(--text-1)', 
                  fontSize: '0.85rem', 
                  border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  lineHeight: '1.5',
                  transition: 'all 0.2s ease',
                  cursor: 'default'
                }}
                className="codebot-message"
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                >
                  <div style={{ fontSize: '0.65rem', fontWeight: '800', marginBottom: '6px', opacity: 0.7, textTransform: 'uppercase', color: m.role === 'user' ? 'rgba(255,255,255,0.8)' : 'var(--accent)' }}>{m.role}</div>
                  <MessageContent content={m.content} />
                </div>
              ))}
              {aiLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--bg-1)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <Loader2 size={16} className="animate-spin" color="var(--accent)" />
                </div>
              )}
              <div ref={aiChatEndRef} />
            </div>
            <div style={{ padding: '20px', background: 'var(--bg-1)', borderTop: '1px solid var(--border-subtle)' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  background: 'var(--bg-2)', 
                  padding: '6px', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease'
                }}
                onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                <input 
                  type="text" 
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiChat(e)}
                  placeholder="Ask about your code..."
                  style={{ flex: 1, padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--text-0)', outline: 'none', fontSize: '0.85rem' }}
                />
                <button 
                  onClick={() => handleAiChat({ key: 'Enter' })}
                  disabled={aiLoading || !aiInput.trim()}
                  style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: aiInput.trim() ? 1 : 0.5 }}
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeWorkspace;
