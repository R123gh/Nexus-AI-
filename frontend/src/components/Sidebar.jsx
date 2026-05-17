import React, { useState } from 'react';
import { 
  MessageSquare, 
  Zap, 
  Grid, 
  Mic, 
  Database, 
  Brain, 
  Code, 
  Settings, 
  LogOut, 
  Plus,
  Bell,
  Activity,
  User,
  Shield,
  Layers,
  X,
  ChevronRight,
  Sparkles,
  Search,
  Trash2
} from 'lucide-react';

const Sidebar = ({ 
  activeMode, 
  setActiveMode, 
  setShowSettings, 
  conversations, 
  onNewChat, 
  isOpen, 
  user, 
  onLogout, 
  onSelectConversation, 
  onShowNotifications, 
  unreadCount,
  setShowAnalytics,
  onClose,
  onDeleteConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const modes = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'code-bot', icon: Sparkles, label: 'Code Bot' },
    { id: 'swarm', icon: Layers, label: 'Swarm' },
    { id: 'services', icon: Grid, label: 'Services' },
    { id: 'voice', icon: Mic, label: 'Voice' },
    { id: 'rag', icon: Database, label: 'RAG' },
    { id: 'data-science', icon: Brain, label: 'Data Science' },
    { id: 'code-editor', icon: Code, label: 'Workspace' },
    { id: 'vault', icon: Shield, label: 'Vault' },
  ];

  const filteredConversations = conversations.filter(c => 
    (c.title || 'Nexus Query').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-[1000] w-[280px] bg-[var(--bg-2)] border-r border-[var(--border-subtle)] 
      flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      md:relative md:translate-x-0 shadow-2xl md:shadow-none
    `}>
      {/* Header Section */}
      <div className="p-6 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--accent-gradient)] rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap size={16} color="white" fill="white" />
          </div>
          <span className="font-black text-lg tracking-tight text-[var(--text-0)]">NexusAI</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            className="relative p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-all group"
            onClick={onShowNotifications}
          >
            <Bell size={18} className="text-[var(--text-2)] group-hover:text-[var(--accent)]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-[var(--bg-2)]">
                {unreadCount}
              </span>
            )}
          </button>

          <button 
            onClick={onClose}
            className="md:hidden p-2 hover:bg-[var(--bg-hover)] rounded-xl text-[var(--text-2)] hover:text-[var(--text-0)] active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-5 py-6">
        <button 
          className="w-full py-4 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-0)] rounded-[1.25rem] font-bold text-sm flex items-center justify-center gap-3 transition-all group shadow-sm hover:shadow-md"
          onClick={() => { onNewChat(); if(window.innerWidth < 768) onClose(); }}
        >
          <div className="w-6 h-6 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-all">
            <Plus size={16} />
          </div>
          <span className="tracking-wide">New Intelligence</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="px-4 mb-3 text-[10px] font-black text-[var(--text-2)] uppercase tracking-[0.25em] opacity-80 flex items-center gap-2">
          <div className="w-1 h-1 bg-[var(--accent)] rounded-full" />
          Neural Modules
        </div>
        <div className="space-y-1">
          {modes.map(m => (
            <button
              key={m.id}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-[1.1rem] transition-all duration-300 group relative
                ${activeMode === m.id 
                  ? 'bg-gradient-to-r from-indigo-500/10 to-transparent text-[var(--accent)]' 
                  : 'text-[var(--text-1)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-0)]'}
              `}
              onClick={() => { setActiveMode(m.id); if(window.innerWidth < 768) onClose(); }}
            >
              {activeMode === m.id && (
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-[var(--accent)] rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.3)]" />
              )}
              <m.icon size={18} className={activeMode === m.id ? 'text-[var(--accent)]' : 'text-[var(--text-2)] group-hover:text-[var(--text-1)]'} />
              <span className={`text-sm font-bold tracking-tight ${activeMode === m.id ? 'translate-x-1' : ''} transition-transform`}>{m.label}</span>
            </button>
          ))}
        </div>

        {true && (
          <div className="mt-6 flex flex-col flex-1 min-h-[250px]">
            <div className="px-4 mb-2 text-[10px] font-black text-[var(--text-2)] uppercase tracking-[0.25em] opacity-80 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)]/30 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Chats History (MongoDB)
              </div>
              <span className="text-[8px] bg-[var(--accent)]/10 text-[var(--accent)] px-1.5 py-0.5 rounded font-black">
                {conversations.length}
              </span>
            </div>

            {/* Sync & Security Badges */}
            <div className="px-4 mb-3 flex flex-wrap gap-2">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded-md text-[8px] font-black text-emerald-400 uppercase tracking-tighter">
                <Database size={8} className="text-emerald-500" />
                <span>Atlas Synced</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/5 border border-indigo-500/10 rounded-md text-[8px] font-black text-indigo-400 uppercase tracking-tighter">
                <Shield size={8} className="text-indigo-400" />
                <span>Secured</span>
              </div>
            </div>

            {/* Search Synapses */}
            <div className="px-3 mb-3 relative">
              <input 
                type="text"
                placeholder="Search synapses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-0)] outline-none focus:border-[var(--accent)] transition-all font-semibold"
              />
              <Search size={12} className="absolute left-6 top-3 text-[var(--text-2)]" />
            </div>

            {/* Scrollable history list */}
            <div className="flex-1 overflow-y-auto max-h-[220px] custom-scrollbar space-y-1 pr-1">
              {filteredConversations.length === 0 ? (
                <div className="px-4 py-6 bg-[var(--bg-1)]/50 border border-[var(--border-subtle)]/30 rounded-2xl text-center shadow-inner">
                  <p className="text-[10px] text-[var(--text-2)] font-semibold italic mb-1.5">
                    {searchQuery ? 'No matching synapses' : 'No synapses stored yet'}
                  </p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                    {searchQuery ? 'Refine search' : 'Chats auto-saved to MongoDB Atlas'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((c, i) => (
                  <div 
                    key={c.session_id || i}
                    className="group flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-[var(--bg-hover)] transition-all"
                  >
                    <button 
                      className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
                      onClick={() => { onSelectConversation(c.session_id); if(window.innerWidth < 768) onClose(); }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all" />
                      <span className="text-xs truncate font-semibold text-[var(--text-1)] group-hover:text-[var(--text-0)] transition-colors">
                        {c.title || 'Nexus Query'}
                      </span>
                    </button>
                    {onDeleteConversation && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this chat log?')) {
                            onDeleteConversation(c.session_id);
                          }
                        }}
                        className="p-1 text-[var(--text-2)] hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-rose-500/10"
                        title="Purge synapse"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 mt-auto">
        <div className="bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-[2rem] p-3 shadow-inner">
          <div className="grid grid-cols-2 gap-1 mb-3">
            <button 
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl text-[var(--text-1)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-0)] transition-all group"
              onClick={() => { setShowAnalytics(true); if(window.innerWidth < 768) onClose(); }}
            >
              <Activity size={18} className="group-hover:text-emerald-500 transition-colors" />
              <span className="text-[9px] font-black uppercase tracking-widest">Stats</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl text-[var(--text-1)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-0)] transition-all group"
              onClick={() => { setShowSettings(true); if(window.innerWidth < 768) onClose(); }}
            >
              <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[9px] font-black uppercase tracking-widest">Config</span>
            </button>
          </div>

          {user && (
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20 overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-[var(--accent)]" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[var(--bg-2)] rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-[var(--text-0)] truncate">{user.username || 'Nexus User'}</p>
                  <p className="text-[8px] font-black text-[var(--accent)] uppercase tracking-tighter">Pro Sync</p>
                </div>
              </div>
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/10 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest"
                onClick={onLogout}
              >
                <LogOut size={12} />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
