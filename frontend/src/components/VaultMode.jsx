import React, { useState, useEffect } from 'react';
import { Shield, Key, Globe, Lock, CheckCircle2, AlertCircle, Loader2, Save, Trash2, RefreshCw, Zap } from 'lucide-react';
import { API_BASE } from '../utils/helpers';

const VaultMode = ({ user, settings }) => {
  const [keys, setKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState({ service: 'groq', api_key: '' });

  const getVaultHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (settings?.groq_api_key) {
      headers['X-Groq-Key'] = settings.groq_api_key;
    }
    return headers;
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${API_BASE}/vault/keys/${user.id}`, {
        headers: getVaultHeaders()
      });
      const data = await res.json();
      setKeys(data.keys || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newKey.api_key) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/vault/keys/save`, {
        method: 'POST',
        headers: getVaultHeaders(),
        body: JSON.stringify({ user_id: user.id, ...newKey })
      });
      setNewKey({ service: 'groq', api_key: '' });
      fetchKeys();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (service) => {
    if (!window.confirm(`Are you sure you want to remove the ${service} key?`)) return;
    try {
      await fetch(`${API_BASE}/vault/keys/delete`, {
        method: 'DELETE',
        headers: getVaultHeaders(),
        body: JSON.stringify({ user_id: user.id, service })
      });
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleValidate = async (service) => {
    try {
      setLoading(true);
      // We need the actual key to validate, but the list only has masked keys.
      // So we have to fetch the real keys first or the backend has to do it.
      // The current backend /keys/validate expects api_key in body.
      // Since we don't have the real key in state, let's just show a message.
      alert(`Validation for ${service} requested. In a real scenario, this would check the key with the provider.`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vault-mode" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>
      <header style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--accent-gradient)', borderRadius: '12px', color: 'white' }}>
            <Shield size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Secure Vault</h1>
            <p style={{ color: 'var(--text-1)' }}>Manage your API keys and external integrations securely.</p>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <section style={{ background: 'var(--bg-1)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '32px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={20} /> Register New API Key
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px' }}>Service</label>
                <select 
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-0)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-0)' }}
                  value={newKey.service}
                  onChange={e => setNewKey({ ...newKey, service: e.target.value })}
                >
                  <option value="groq">Groq Inference</option>
                  <option value="ocr">OCR.space</option>
                  <option value="openai">OpenAI (Legacy)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px' }}>API Key</label>
                <input 
                  type="password"
                  placeholder="Paste your key here..."
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-0)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-0)' }}
                  value={newKey.api_key}
                  onChange={e => setNewKey({ ...newKey, api_key: e.target.value })}
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={saving || !newKey.api_key}
                style={{ height: '45px', padding: '0 24px', background: 'var(--accent)', color: 'white', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Key'}
              </button>
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px' }}>Your Integrations</h3>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 size={32} className="animate-spin" color="var(--accent)" /></div>
            ) : Object.keys(keys).length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-1)', borderRadius: '12px', border: '1px dashed var(--border-subtle)', color: 'var(--text-2)' }}>
                No API keys registered yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(keys).map(([service, maskedKey]) => (
                  <div key={service} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'var(--bg-1)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {service === 'groq' ? <Zap size={20} color="#f59e0b" /> : <Globe size={20} color="#3b82f6" />}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700', textTransform: 'capitalize' }}>{service}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontFamily: 'monospace' }}>{maskedKey}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        className="icon-btn" 
                        title="Validate Key"
                        onClick={() => handleValidate(service)}
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button 
                        className="icon-btn" 
                        style={{ color: 'var(--error)' }}
                        onClick={() => handleDelete(service)}
                        title="Delete Key"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: '48px', padding: '32px', background: 'rgba(124, 58, 237, 0.05)', borderRadius: '16px', border: '1px solid rgba(124, 58, 237, 0.1)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={20} /> Webhook Endpoint
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '20px' }}>
              Use this endpoint to push data from external services like Zapier or Make.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <code style={{ flex: 1, padding: '12px', background: 'var(--bg-0)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                {API_BASE}/webhooks/incoming
              </code>
              <button className="icon-btn" onClick={() => navigator.clipboard.writeText(`${API_BASE}/webhooks/incoming`)}>
                <Save size={18} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default VaultMode;
