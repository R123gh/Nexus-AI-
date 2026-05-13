import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Download, Share2, Trash2, Loader2, ArrowRight, Layers, Maximize2 } from 'lucide-react';

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    // Simulate generation
    setTimeout(() => {
      const newImage = {
        id: Date.now(),
        url: `https://picsum.photos/seed/${Math.random()}/1024/1024`,
        prompt: prompt,
        aspectRatio: aspectRatio
      };
      setImages([newImage, ...images]);
      setGenerating(false);
      setPrompt('');
    }, 3000);
  };

  return (
    <div className="image-gen-workspace" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>
      <div className="image-gen-content" style={{ flex: 1, overflowY: 'auto', padding: '48px 32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="gen-input-section" style={{ marginBottom: '48px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '24px' }}>Creative Studio</h1>
            <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-1)', padding: '8px', border: '1px solid var(--border-default)', borderRadius: '8px' }}>
              <input 
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-0)', padding: '12px 16px', fontSize: '1rem', outline: 'none' }}
                placeholder="Describe the image you want to create..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              />
              <button 
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                style={{
                  padding: '12px 24px', background: 'var(--text-0)', color: 'var(--bg-0)', border: 'none', borderRadius: '4px',
                  fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'var(--transition)'
                }}
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {generating ? 'Imagining...' : 'Generate'}
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', padding: '0 8px' }}>
              {['1:1', '16:9', '9:16', '4:3'].map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  style={{
                    fontSize: '0.75rem', fontWeight: '700', background: 'transparent',
                    color: aspectRatio === ratio ? 'var(--text-0)' : 'var(--text-2)',
                    border: 'none', cursor: 'pointer', padding: '4px 0', borderBottom: aspectRatio === ratio ? '2px solid var(--text-0)' : '2px solid transparent'
                  }}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <div className="images-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '32px' }}>
            {generating && (
              <div style={{ aspectRatio: aspectRatio === '1:1' ? '1/1' : aspectRatio === '16:9' ? '16/9' : '9/16', background: 'var(--bg-1)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-default)' }}>
                <Loader2 size={32} className="animate-spin" color="var(--text-2)" style={{ marginBottom: '16px' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Synthesizing...</span>
              </div>
            )}
            
            {images.map(img => (
              <div key={img.id} className="image-card" style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-1)' }}>
                <img src={img.url} alt={img.prompt} style={{ width: '100%', display: 'block' }} />
                <div className="image-overlay" style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#ffffff',
                  opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer'
                }}>
                  <p style={{ fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.4' }}>{img.prompt}</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="icon-btn" style={{ color: '#fff' }}><Download size={16} /></button>
                    <button className="icon-btn" style={{ color: '#fff' }}><Share2 size={16} /></button>
                    <button className="icon-btn" style={{ color: '#fff' }}><Maximize2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}

            {images.length === 0 && !generating && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', color: 'var(--text-2)' }}>
                <ImageIcon size={64} strokeWidth={1} style={{ marginBottom: '24px' }} />
                <p style={{ fontSize: '1.1rem' }}>Your generated images will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
