import React, { useState, useEffect } from 'react';
import { X, Bell, Trash2, Check, Clock, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { API_BASE } from '../utils/helpers';

const NotificationPanel = ({ user, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${user.id}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_BASE}/notifications/read/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all/${user.id}`, { method: 'POST' });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await fetch(`${API_BASE}/notifications/delete/${id}?user_id=${user.id}`, { method: 'DELETE' });
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full sm:w-[450px] h-full bg-[var(--bg-1)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header */}
        <div className="p-8 border-b border-[var(--border-subtle)] bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-black tracking-tighter flex items-center gap-3 text-[var(--text-0)]">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Bell size={24} />
              </div>
              Inbox
            </h3>
            <div className="flex gap-2">
              {notifications.some(n => !n.is_read) && (
                <button 
                  onClick={markAllAsRead}
                  className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                  title="Mark all as read"
                >
                  <CheckCircle2 size={20} />
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2.5 rounded-xl bg-[var(--bg-2)] text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-hover)] transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-2)] mt-4">
            System Events & Activity
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--text-2)] gap-4">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <span className="text-xs font-black uppercase tracking-widest">Synchronizing...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-30">
              <div className="w-24 h-24 rounded-full bg-[var(--bg-2)] flex items-center justify-center">
                <Sparkles size={48} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-[var(--text-0)]">All Clear</h4>
                <p className="text-xs font-bold uppercase tracking-widest">No pending notifications</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-12">
              {notifications.map((n, i) => (
                <div 
                  key={n.id} 
                  className={`group relative p-6 rounded-[1.5rem] border transition-all duration-300 animate-in slide-in-from-bottom-4 duration-500 ${
                    n.is_read 
                      ? 'bg-[var(--bg-0)]/50 border-[var(--border-subtle)]' 
                      : 'bg-indigo-500/5 border-indigo-500/20 shadow-lg shadow-indigo-500/5'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {!n.is_read && (
                    <div className="absolute -left-1 top-8 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  )}
                  
                  <div className="flex justify-between items-start mb-3">
                    <h4 className={`text-sm md:text-base font-black tracking-tight ${n.is_read ? 'text-[var(--text-1)]' : 'text-[var(--text-0)]'}`}>
                      {n.title}
                    </h4>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {!n.is_read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(n.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs md:text-sm text-[var(--text-2)] font-medium leading-relaxed mb-4">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">
                    <Clock size={12} />
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-6 border-t border-[var(--border-subtle)] bg-white/[0.01]">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-3)]">
              Nexus Intelligence Center
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
