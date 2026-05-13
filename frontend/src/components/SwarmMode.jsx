import React, { useState } from 'react';
import { Layers, Send, Search, PenTool, ShieldCheck, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { apiSwarm } from '../utils/api';
import { marked } from 'marked';

const SwarmMode = ({ settings }) => {
  const [task, setTask] = useState('');
  const [status, setStatus] = useState('idle'); // idle, researching, writing, checking, synthesizing, completed
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!task.trim()) return;
    setStatus('researching');
    setResults(null);
    setError(null);
    try {
      const res = await apiSwarm(task, settings);
      setResults(res.results);
      setStatus('completed');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const phases = [
    { id: 'researching', label: 'Deep Research', icon: Search, color: '#3b82f6' },
    { id: 'writing', label: 'Agent Composition', icon: PenTool, color: '#8b5cf6' },
    { id: 'checking', label: 'Fact Verification', icon: ShieldCheck, color: '#10b981' },
    { id: 'synthesizing', label: 'Final Synthesis', icon: Sparkles, color: '#7c3aed' }
  ];

  const currentPhaseIndex = phases.findIndex(p => p.id === status);

  return (
    <div className="swarm-mode" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>
      <header style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--accent-gradient)', borderRadius: '12px', color: 'white' }}>
            <Layers size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Swarm Intelligence</h1>
            <p style={{ color: 'var(--text-1)' }}>Multi-agent collaborative workflows for complex tasks.</p>
          </div>
        </div>

        <div className="input-container" style={{ marginTop: '32px' }}>
          <input 
            type="text" 
            placeholder="Describe a complex project (e.g. Write a 500-word report on Quantum Computing with statistics)..."
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={status !== 'idle' && status !== 'completed'}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-0)', outline: 'none' }}
          />
          <button 
            className="icon-btn" 
            onClick={handleSubmit} 
            disabled={status !== 'idle' && status !== 'completed'}
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {status !== 'idle' && status !== 'completed' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {status !== 'idle' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '48px', position: 'relative', padding: '0 20px' }}>
              <div style={{ position: 'absolute', top: '24px', left: '40px', right: '40px', height: '2px', background: 'var(--border-subtle)', zIndex: 0 }} />
              <div style={{ 
                position: 'absolute', top: '24px', left: '40px', height: '2px', 
                background: 'var(--accent)', zIndex: 1, transition: 'width 0.5s ease',
                width: status === 'completed' ? 'calc(100% - 80px)' : `${(currentPhaseIndex / (phases.length - 1)) * 100}%`
              }} />
              
              {phases.map((p, i) => {
                const isCompleted = status === 'completed' || phases.findIndex(ph => ph.id === status) > i;
                const isActive = status === p.id;
                return (
                  <div key={p.id} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '48px', height: '48px', borderRadius: '50%', 
                      background: isCompleted ? 'var(--accent)' : isActive ? 'var(--bg-1)' : 'var(--bg-0)',
                      border: `2px solid ${isCompleted ? 'var(--accent)' : isActive ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCompleted ? 'white' : isActive ? 'var(--accent)' : 'var(--text-2)',
                      boxShadow: isActive ? '0 0 20px rgba(124, 58, 237, 0.2)' : 'none',
                      transition: 'all 0.3s'
                    }}>
                      {isCompleted ? <CheckCircle2 size={24} /> : <p.icon size={24} />}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: isActive ? 'var(--text-0)' : 'var(--text-2)' }}>{p.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {results && (
            <div style={{ display: 'grid', gap: '32px', animation: 'fadeIn 0.5s ease' }}>
              <section style={{ background: 'var(--bg-1)', borderRadius: '16px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border-subtle)', fontWeight: '700' }}>
                  Final Polished Output
                </div>
                <div className="markdown-content" style={{ padding: '32px' }} dangerouslySetInnerHTML={{ __html: marked.parse(results.final_output) }} />
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <section style={{ background: 'var(--bg-1)', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '24px' }}>
                  <h4 style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginBottom: '16px', textTransform: 'uppercase' }}>Researcher Notes</h4>
                  <div className="markdown-content" style={{ fontSize: '0.9rem', color: 'var(--text-1)', maxHeight: '200px', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: marked.parse(results.research || '') }} />
                </section>
                <section style={{ background: 'var(--bg-1)', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '24px' }}>
                  <h4 style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginBottom: '16px', textTransform: 'uppercase' }}>Critique & Review</h4>
                  <div className="markdown-content" style={{ fontSize: '0.9rem', color: 'var(--text-1)', maxHeight: '200px', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: marked.parse(results.critique || '') }} />
                </section>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', borderRadius: '12px', color: 'var(--error)' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwarmMode;
