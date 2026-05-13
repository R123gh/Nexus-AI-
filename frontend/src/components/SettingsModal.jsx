import React, { useState } from 'react';
import { X, Moon, Sun, Monitor, Cpu, Shield, Globe, Database, Sliders, Save, RefreshCw, User } from 'lucide-react';
import { MODELS, API_BASE } from '../utils/helpers';

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
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="modal-content" style={{
        width: '100%', maxWidth: '500px', background: 'var(--bg-1)', borderRadius: '8px',
        border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>System Settings</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: '32px', maxHeight: '70vh', overflowY: 'auto' }}>
          {user && (
            <section style={{ marginBottom: '32px' }}>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-2)', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} /> User Profile
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px' }}>Avatar URL</label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-0)', outline: 'none' }}
                    placeholder="https://..."
                    value={profileData.avatar_url}
                    onChange={e => setProfileData({...profileData, avatar_url: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px' }}>Email Address</label>
                  <input 
                    type="email"
                    style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-0)', outline: 'none' }}
                    placeholder="user@example.com"
                    value={profileData.email}
                    onChange={e => setProfileData({...profileData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px' }}>Bio</label>
                  <textarea 
                    style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-0)', outline: 'none', resize: 'vertical', minHeight: '80px' }}
                    placeholder="Tell us about yourself..."
                    value={profileData.bio}
                    onChange={e => setProfileData({...profileData, bio: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={isUpdatingProfile}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: isUpdatingProfile ? 'wait' : 'pointer' }}
                  >
                    <Save size={16} /> {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                  {profileMessage && <span style={{ fontSize: '0.85rem', color: profileMessage.includes('success') ? '#4ade80' : '#f87171' }}>{profileMessage}</span>}
                </div>
              </div>
            </section>
          )}

          <section style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-2)', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Monitor size={14} /> Appearance
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {['dark', 'light', 'system'].map(theme => (
                <button
                  key={theme}
                  onClick={() => updateSetting('theme', theme)}
                  style={{
                    padding: '12px', background: settings.theme === theme ? 'var(--text-0)' : 'var(--bg-0)',
                    color: settings.theme === theme ? 'var(--bg-0)' : 'var(--text-1)',
                    border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600',
                    cursor: 'pointer', transition: 'var(--transition)', textTransform: 'capitalize'
                  }}
                >
                  {theme}
                </button>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-2)', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={14} /> API Keys
            </h4>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px' }}>Groq API Key</label>
            <input 
              type="password"
              style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-0)', outline: 'none', marginBottom: '16px' }}
              placeholder="gsk_..."
              value={settings.groq_api_key || ''}
              onChange={e => updateSetting('groq_api_key', e.target.value)}
            />
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-2)', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={14} /> Model Configuration
            </h4>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px' }}>Inference Engine</label>
            <select
              style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-0)', outline: 'none', marginBottom: '16px' }}
              value={settings.model}
              onChange={e => updateSetting('model', e.target.value)}
            >
              {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Creativity (Temperature)</label>
              <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{settings.temperature}</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.1" 
              style={{ width: '100%', accentColor: 'var(--text-0)' }}
              value={settings.temperature}
              onChange={e => updateSetting('temperature', parseFloat(e.target.value))}
            />
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '16px', marginBottom: '8px' }}>System Prompt Instructions</label>
            <textarea 
              style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-0)', outline: 'none', resize: 'vertical', minHeight: '80px' }}
              placeholder="e.g. Act as a senior Python developer. Be concise."
              value={settings.systemPrompt || ''}
              onChange={e => updateSetting('systemPrompt', e.target.value)}
            />
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-2)', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={14} /> Privacy & Context
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.9rem' }}>Simple Chat Mode</span>
              <input 
                type="checkbox" 
                checked={settings.simple_chat} 
                onChange={e => updateSetting('simple_chat', e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: '1.4' }}>
              Disabling simple chat enables deeper reasoning and autonomous planning capabilities.
            </p>
          </section>
        </div>

        <div style={{ padding: '24px', background: 'var(--bg-0)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            className="icon-btn" 
            onClick={onClose}
            style={{ background: 'var(--text-0)', color: 'var(--bg-0)', padding: '10px 24px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '700' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
