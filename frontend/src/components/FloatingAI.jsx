import React, { useState } from 'react';
import { Sparkles, X, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import NexusBot from './NexusBot';

const FloatingAI = ({ settings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <div 
        className="floating-ai-btn"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '20px',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 10px 40px rgba(99, 102, 241, 0.4)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {isOpen ? <X size={28} color="white" /> : <Sparkles size={28} color="white" className={isHovered ? 'animate-pulse' : ''} />}
        
        {/* Tooltip */}
        {isHovered && !isOpen && (
          <div style={{
            position: 'absolute',
            right: '80px',
            background: 'var(--bg-2)',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-0)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            Summon NexusAI
          </div>
        )}
      </div>

      {/* The Actual Bot Panel */}
      <NexusBot 
        settings={settings} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
};

export default FloatingAI;
