import React, { useState } from 'react';
import { X, Moon, Sun, Monitor, Cpu, Shield, Globe, Database, Sliders, Save, RefreshCw, User } from 'lucide-react';
import { MODELS, API_BASE } from '../utils/helpers';
import { motion } from 'framer-motion';

const SettingsModal = ({ settings, setSettings, user, setUser, onClose }) => {
  const [profileData, setProfileData] = useState({
    avatar_url: user?.avatar_url || '',
    bio: user?.bio || '',
    email: user?.email || ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/auth/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...profileData })
      });
      if (res.ok) {
        const newUser = { ...user, ...profileData };
        setUser(newUser);
        localStorage.setItem('nexusai_user', JSON.stringify(newUser));
        setProfileMessage('Profile updated successfully!');
        setTimeout(() => setProfileMessage(''), 3000);
      } else {
        setProfileMessage('Failed to update profile.');
      }
    } catch (err) {
      setProfileMessage('Error connecting to server.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('nexusai_settings', JSON.stringify(newSettings));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center" style={{ perspective: 1200 }}>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9, rotateX: -15 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-2xl bg-[var(--bg-1)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-glass)]">
          <h3 className="text-xl font-extrabold text-[var(--text-0)] bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">System Settings</h3>
          <button className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-1)] hover:text-[var(--text-0)] transition-all active:scale-95" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          {user && (
            <section className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-2)] flex items-center gap-2">
                <User size={14} className="text-indigo-400" /> User Profile
              </h4>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-2)]">Avatar URL</label>
                  <input 
                    type="text"
                    className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="https://..."
                    value={profileData.avatar_url}
                    onChange={e => setProfileData({...profileData, avatar_url: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-2)]">Email Address</label>
                  <input 
                    type="email"
                    className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="user@example.com"
                    value={profileData.email}
                    onChange={e => setProfileData({...profileData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-2)]">Bio</label>
                  <textarea 
                    className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[80px] resize-y"
                    placeholder="Tell us about yourself..."
                    value={profileData.bio}
                    onChange={e => setProfileData({...profileData, bio: e.target.value})}
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={isUpdatingProfile}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:active:scale-100"
                  >
                    <Save size={16} /> {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                  {profileMessage && <span className={`text-sm font-medium ${profileMessage.includes('success') ? 'text-green-500' : 'text-red-500'} animate-in fade-in`}>{profileMessage}</span>}
                </div>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-2)] flex items-center gap-2">
              <Monitor size={14} className="text-indigo-400" /> Appearance
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {['dark', 'light', 'system'].map(theme => (
                <button
                  key={theme}
                  onClick={() => updateSetting('theme', theme)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-300 active:scale-95 ${
                    settings.theme === theme 
                      ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/25' 
                      : 'bg-[var(--bg-0)] text-[var(--text-1)] border-[var(--border-subtle)] hover:border-indigo-500/50 hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {theme === 'dark' ? <Moon size={20} /> : theme === 'light' ? <Sun size={20} /> : <Monitor size={20} />}
                  <span className="text-xs font-bold capitalize tracking-wide">{theme}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-2)] flex items-center gap-2">
              <Shield size={14} className="text-indigo-400" /> API Keys
            </h4>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-2)]">Groq API Key</label>
              <input 
                type="password"
                className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                placeholder="gsk_..."
                value={settings.groq_api_key || ''}
                onChange={e => updateSetting('groq_api_key', e.target.value)}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-2)] flex items-center gap-2">
              <Cpu size={14} className="text-indigo-400" /> Model Configuration
            </h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-2)]">Inference Engine</label>
                <select
                  className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium appearance-none cursor-pointer"
                  value={settings.model}
                  onChange={e => updateSetting('model', e.target.value)}
                >
                  {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-[var(--text-2)]">Creativity (Temperature)</label>
                  <span className="text-xs font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">{settings.temperature}</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[var(--border-subtle)] rounded-full appearance-none outline-none"
                  value={settings.temperature}
                  onChange={e => updateSetting('temperature', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-[var(--text-2)]">System Prompt Instructions</label>
                <textarea 
                  className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[80px] resize-y"
                  placeholder="e.g. Act as a senior Python developer. Be concise."
                  value={settings.systemPrompt || ''}
                  onChange={e => updateSetting('systemPrompt', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-2)] flex items-center gap-2">
              <Sliders size={14} className="text-indigo-400" /> Privacy & Context
            </h4>
            <div className="flex items-center justify-between p-4 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl hover:border-indigo-500/30 transition-colors">
              <div className="space-y-1">
                <span className="text-sm font-bold text-[var(--text-0)]">Simple Chat Mode</span>
                <p className="text-xs text-[var(--text-2)]">Disabling simple chat enables deeper reasoning and autonomous planning capabilities.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.simple_chat} 
                  onChange={e => updateSetting('simple_chat', e.target.checked)}
                />
                <div className="w-11 h-6 bg-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>
          </section>
        </div>

        <div className="p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-glass)] flex justify-end">
          <button 
            className="px-6 py-2.5 bg-[var(--text-0)] text-[var(--bg-0)] rounded-xl text-sm font-bold transition-all active:scale-95 hover:shadow-lg"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;
