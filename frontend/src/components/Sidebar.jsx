import React from 'react';
import { 
  MessageSquare, 
  Zap, 
  Grid, 
  Mic, 
  Image as ImageIcon, 
  Database, 
  Brain, 
  Code, 
  Settings, 
  LogOut, 
  Plus,
  Bell,
  Activity,
  User,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { formatTime } from '../utils/helpers';

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
  onClose 
}) => {
  const modes = [
    { id: 'chat', icon: MessageSquare, label: 'Neural Chat' },
    { id: 'swarm', icon: Layers, label: 'Swarm Core' },
    { id: 'services', icon: Grid, label: 'Services Hub' },
    { id: 'voice', icon: Mic, label: 'Voice Link' },
    { id: 'rag', icon: Database, label: 'RAG Engine' },
    { id: 'data-science', icon: Brain, label: 'ML Analytics' },
    { id: 'code-editor', icon: Code, label: 'Workspace' },
    { id: 'vault', icon: Shield, label: 'Secure Vault' },
  ];

  return (
    <aside className={`fixed md:relative top-0 left-0 h-screen bg-[var(--bg-1)] border-r border-[var(--border-subtle)] z-[1000] flex flex-col transition-all duration-500 ${
      isOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 w-0 md:w-72'
    } overflow-hidden`}>
      
      {/* Logo Section */}
      <div className="p-6 border-b border-[var(--border-subtle)] bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-lg shadow-indigo-500/20">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-[var(--text-0)]">NexusAI</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="p-2 rounded-xl bg-[var(--bg-2)] text-[var(--text-2)] hover:text-indigo-400 transition-all relative"
              onClick={onShowNotifications}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg-1)]" />
              )}
            </button>
            <button 
              className="p-2 rounded-xl bg-[var(--bg-2)] text-[var(--text-2)] md:hidden hover:text-rose-500 transition-all"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* Actions */}
        <button 
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-[var(--text-0)] text-[var(--bg-0)] rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10"
        >
          <Plus size={18} strokeWidth={3} />
          New Neural Session
        </button>

        {/* Navigation */}
        <nav className="space-y-1">
          <div className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-3)]">Intelligence Modules</div>
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 group ${
                activeMode === m.id 
                  ? 'bg-indigo-500/10 text-[var(--accent)] border border-indigo-500/20' 
                  : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]'
              }`}
            >
              <m.icon size={18} className={`transition-transform duration-500 ${activeMode === m.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className={`text-sm font-bold tracking-tight ${activeMode === m.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                {m.label}
              </span>
              {activeMode === m.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              )}
            </button>
          ))}
        </nav>

        {/* Recent Conversations */}
        {conversations.length > 0 && (
          <div className="space-y-1 pt-4">
            <div className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-3)]">Chronicle Hub</div>
            <div className="space-y-1">
              {conversations.slice(0, 5).map((c, i) => (
                <button 
                  key={i} 
                  onClick={() => onSelectConversation(c.session_id)}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)] transition-all group"
                >
                  <MessageSquare size={16} className="opacity-50 group-hover:opacity-100" />
                  <div className="flex flex-col items-start overflow-hidden text-left">
                    <span className="text-xs font-bold truncate w-full tracking-tight">
                      {c.title || 'Untitled Session'}
                    </span>
                    <span className="text-[10px] opacity-50 mt-0.5">
                      {formatTime ? formatTime(c.updated_at) : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User & Global Actions */}
      <div className="p-4 mt-auto border-t border-[var(--border-subtle)] bg-white/[0.01] space-y-1">
        <button 
          onClick={() => setShowAnalytics(true)}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)] transition-all"
        >
          <Activity size={18} />
          <span className="text-sm font-bold tracking-tight">Core Analytics</span>
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)] transition-all"
        >
          <Settings size={18} />
          <span className="text-sm font-bold tracking-tight">Neural Config</span>
        </button>
        
        {user && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center gap-4 px-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-2)] border border-[var(--border-subtle)] flex items-center justify-center text-indigo-400 shadow-inner">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="User" className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-black text-[var(--text-0)] truncate leading-none mb-1">
                  {user.username || 'Agent'}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  Nexus Premium
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all font-bold text-sm"
            >
              <LogOut size={18} />
              <span>Terminate Link</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
