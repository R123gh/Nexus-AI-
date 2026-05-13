import React, { useState, useEffect } from 'react';
import { BarChart3, MessageSquare, Clock, TrendingUp, X, Download, Calendar } from 'lucide-react';
import { formatDate } from '../utils/helpers';

const AnalyticsPanel = ({ isOpen, onClose, conversations }) => {
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  const totalMessages = conversations.reduce((acc, conv) => acc + (conv.message_count || 0), 0);
  const avgResponseTime = 1.2;
  const activeConversations = conversations.filter(c => {
    const ts = typeof c.updated_at === 'number' ? (c.updated_at < 10000000000 ? c.updated_at * 1000 : c.updated_at) : c.updated_at;
    const lastActivity = new Date(ts);
    const daysSinceActive = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);
    return daysSinceActive < 7;
  }).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-1)', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '85vh', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={22} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-0)' }}>Chat Analytics</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', cursor: 'pointer', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {['7d', '30d', '90d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '8px 16px',
                  background: timeRange === range ? 'var(--accent-gradient)' : 'var(--bg-0)',
                  border: timeRange === range ? 'none' : '1px solid var(--border-subtle)',
                  color: timeRange === range ? 'white' : 'var(--text-1)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-0)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <MessageSquare size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 500 }}>Total Messages</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-0)' }}>{totalMessages}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} /> +12% from last period
              </div>
            </div>

            <div style={{ background: 'var(--bg-0)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Clock size={18} style={{ color: 'var(--accent-secondary)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 500 }}>Avg Response Time</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-0)' }}>{avgResponseTime}s</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '4px' }}>
                Across all conversations
              </div>
            </div>

            <div style={{ background: 'var(--bg-0)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Calendar size={18} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 500 }}>Active Conversations</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-0)' }}>{activeConversations}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '4px' }}>
                Last 7 days
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-0)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-0)' }}>Recent Activity</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {conversations.slice(0, 5).map((conv, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-1)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-0)', marginBottom: '4px' }}>
                      {conv.title || 'Untitled Conversation'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                      {formatDate(conv.updated_at)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-1)', fontWeight: 500 }}>
                    {conv.message_count || 0} messages
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--accent-gradient)', border: 'none', color: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => {
              const data = JSON.stringify({ totalMessages, avgResponseTime, activeConversations, conversations }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'analytics.json';
              a.click();
            }}
          >
            <Download size={16} />
            Export Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
