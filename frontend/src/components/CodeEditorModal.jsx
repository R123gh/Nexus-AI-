import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Copy, CheckCircle2, Code2 } from 'lucide-react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

const CodeEditorModal = ({ isOpen, onClose, initialCode = '', language = 'javascript' }) => {
  const [code, setCode] = useState(initialCode);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const languages = [
    'javascript', 'python', 'typescript', 'java', 'cpp', 'go', 'rust', 'sql', 'html', 'css'
  ];

  const runCode = () => {
    setIsRunning(true);
    setOutput('');
    
    try {
      if (selectedLanguage === 'javascript') {
        const result = eval(code);
        setOutput(String(result));
      } else if (selectedLanguage === 'python') {
        setOutput('Python execution requires backend support');
      } else {
        setOutput(`Execution for ${selectedLanguage} requires backend support`);
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
    
    setIsRunning(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (text) => {
    try {
      return hljs.highlight(text, { language: selectedLanguage }).value;
    } catch {
      return text;
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-1)', borderRadius: '16px', width: '90%', maxWidth: '900px', maxHeight: '85vh', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Code2 size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-0)' }}>Code Editor</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px', fontWeight: 500 }}>Language</label>
            <select 
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border-subtle)', color: 'var(--text-1)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
            >
              {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px', fontWeight: 500 }}>Code</label>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              style={{ 
                width: '100%', 
                height: '250px', 
                background: '#0d1117', 
                border: '1px solid var(--border-subtle)', 
                color: '#e6edf3', 
                padding: '16px', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                fontFamily: 'JetBrains Mono, monospace', 
                outline: 'none',
                resize: 'vertical'
              }}
              placeholder="Write your code here..."
              spellCheck={false}
            />
          </div>

          {output && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px', fontWeight: 500 }}>Output</label>
              <div style={{ 
                background: '#0d1117', 
                border: '1px solid var(--border-subtle)', 
                color: '#e6edf3', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                fontFamily: 'JetBrains Mono, monospace',
                minHeight: '60px'
              }}>
                {output}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={copyCode}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--bg-0)', border: '1px solid var(--border-subtle)', color: 'var(--text-1)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.target.style.borderColor = 'var(--border-default)'}
            onMouseLeave={e => e.target.style.borderColor = 'var(--border-subtle)'}
          >
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button 
            onClick={runCode}
            disabled={isRunning}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--accent-gradient)', border: 'none', color: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', opacity: isRunning ? 0.7 : 1 }}
            onMouseEnter={e => !isRunning && (e.target.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
          >
            <Play size={16} fill="currentColor" />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeEditorModal;
