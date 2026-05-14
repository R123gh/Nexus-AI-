import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, Shield, Zap, Search, 
  MessageSquare, Layers, Cpu, Globe, Rocket,
  Loader2, CheckCircle2, ChevronRight, AlertCircle
} from 'lucide-react';

const SwarmMode = ({ settings }) => {
  const [activePhase, setActivePhase] = useState(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [goal, setGoal] = useState('');
  const [swarmOutput, setSwarmOutput] = useState({
    research: "Initializing neural nodes for global data harvesting...",
    critique: "Awaiting primary research synthesis...",
    final: "Pending architectural validation..."
  });

  const phases = [
    { id: 0, label: 'Quantum Discovery', icon: Globe, detail: 'Multi-threaded research' },
    { id: 1, label: 'Adversarial Critique', icon: Shield, detail: 'Logic validation' },
    { id: 2, label: 'Neural Synthesis', icon: Layers, detail: 'Final optimization' }
  ];

  const simulateSwarm = (e) => {
    if (e) e.preventDefault();
    if (!goal.trim()) return;

    setIsSynthesizing(true);
    setActivePhase(0);
    setSwarmOutput({
      research: `Gathering intelligence on: "${goal}"...`,
      critique: "Awaiting primary research synthesis...",
      final: "Pending architectural validation..."
    });
    
    setTimeout(() => {
      setSwarmOutput(prev => ({ ...prev, research: `Research Complete: Identified optimal strategies for "${goal}". Analyzed 250+ data vectors across global networks.` }));
      setActivePhase(1);
    }, 3000);

    setTimeout(() => {
      setSwarmOutput(prev => ({ ...prev, critique: "Critique Complete: Pruned 4 redundant branches. Logic integrity verified at 99.8%." }));
      setActivePhase(2);
    }, 6000);

    setTimeout(() => {
      setSwarmOutput(prev => ({ ...prev, final: `Synthesis Complete: Final architectural model for "${goal}" generated. Ready for deployment.` }));
      setIsSynthesizing(false);
    }, 9000);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-0)] text-[var(--text-0)] overflow-y-auto custom-scrollbar p-6 md:p-10">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto w-full mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[var(--accent-gradient)] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-6 animate-in zoom-in duration-700">
              <Users size={32} color="white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-2">Swarm Intelligence</h1>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.3em]">Neural Hive Mind</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-150" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Input Section */}
      <div className="max-w-6xl mx-auto w-full mb-12">
        <div className="bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-[2.5rem] p-2 md:p-3 shadow-2xl shadow-indigo-500/5 focus-within:border-[var(--accent)] transition-all">
          <form onSubmit={simulateSwarm} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative flex items-center px-6">
              <Zap size={20} className="text-[var(--accent)] mr-4" />
              <input 
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="What is your ultimate objective? (e.g. Design a scalable SaaS architecture)"
                className="w-full bg-transparent border-none outline-none text-[var(--text-0)] font-bold text-sm md:text-base py-4 placeholder:text-[var(--text-2)]"
              />
            </div>
            <button 
              type="submit"
              disabled={isSynthesizing || !goal.trim()}
              className={`
                px-8 py-4 bg-[var(--accent)] text-white rounded-[1.8rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20
                hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50
              `}
            >
              {isSynthesizing ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />}
              {isSynthesizing ? 'Synthesizing...' : 'Initialize Swarm'}
            </button>
          </form>
        </div>
      </div>

      {/* Adaptive Phase Stepper */}
      <div className="max-w-6xl mx-auto w-full mb-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 bg-[var(--bg-1)] p-6 rounded-[2.5rem] border border-[var(--border-subtle)] shadow-xl">
          {phases.map((phase, i) => (
            <React.Fragment key={phase.id}>
              <div className={`flex items-center gap-4 flex-1 w-full p-4 rounded-2xl transition-all ${activePhase === phase.id ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/20' : 'opacity-40'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activePhase === phase.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'bg-[var(--bg-2)] text-[var(--text-2)]'}`}>
                  <phase.icon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-0.5">Phase 0{i+1}</p>
                  <p className="text-sm font-bold text-[var(--text-0)]">{phase.label}</p>
                </div>
                {activePhase > phase.id && <CheckCircle2 size={18} className="ml-auto text-emerald-500" />}
              </div>
              {i < phases.length - 1 && <ChevronRight size={20} className="hidden lg:block text-[var(--text-2)] opacity-20" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Swarm Intelligence Results */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="space-y-8">
          <div className="p-8 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-[2.5rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Search size={80} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent)] mb-6 flex items-center gap-3">
              <Search size={16} /> Research Node
            </h3>
            <p className="text-[var(--text-1)] text-base font-medium leading-relaxed italic">
              {swarmOutput.research}
            </p>
          </div>

          <div className="p-8 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-[2.5rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertCircle size={80} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-rose-500 mb-6 flex items-center gap-3">
              <AlertCircle size={16} /> Critique Node
            </h3>
            <p className="text-[var(--text-1)] text-base font-medium leading-relaxed italic">
              {swarmOutput.critique}
            </p>
          </div>
        </div>

        <div className="p-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3rem] shadow-2xl relative overflow-hidden text-white flex flex-col justify-center min-h-[400px]">
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <Layers size={160} />
          </div>
          <div className="relative z-10">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-200 mb-8 flex items-center gap-3">
              <Layers size={20} /> Synthesis Result
            </h3>
            <div className="space-y-6">
              <p className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                {swarmOutput.final}
              </p>
              <div className="flex items-center gap-4 pt-6">
                <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest">
                  Ready for Dev
                </div>
                <div className="px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                  99% Accuracy
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwarmMode;
