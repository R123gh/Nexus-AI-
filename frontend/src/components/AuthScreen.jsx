import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, Loader2, Sparkles, CheckCircle2, Eye, EyeOff, Zap, ShieldCheck } from 'lucide-react';
import { apiLogin, apiRegister } from '../utils/api';

const AuthScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await apiLogin(username, password);
      } else {
        data = await apiRegister(username, password);
      }
      
      const userObj = data.user || { username, id: data.user_id };
      localStorage.setItem('nexusai_user', JSON.stringify(userObj));
      onLoginSuccess(userObj);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[var(--bg-0)] overflow-hidden selection:bg-indigo-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute w-[800px] h-[800px] bg-[var(--accent)]/5 blur-[150px] rounded-full transition-all duration-1000"
          style={{ 
            top: mousePos.y * 0.5 - 400, 
            left: mousePos.x * 0.5 - 400 
          }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-200" />
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[480px] px-4 py-8 sm:px-6 sm:py-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        <div className="bg-[var(--bg-1)] backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-[var(--shadow-xl)] relative overflow-hidden group">
          
          {/* Subtle Inner Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--accent)]/10 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-700" />
          
          {/* Brand Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--accent-gradient)] rounded-3xl mb-8 shadow-2xl shadow-indigo-500/40 relative">
              <Zap size={36} className="text-white fill-white animate-pulse" />
              <div className="absolute -inset-1 bg-white/20 rounded-3xl blur-sm -z-10" />
            </div>
            <h1 className="text-4xl font-black text-[var(--text-0)] mb-3 tracking-tighter leading-none">
              Nexus<span className="text-transparent bg-clip-text bg-[var(--accent-gradient)]">AI</span>
            </h1>
            <p className="text-[var(--text-2)] text-sm font-bold uppercase tracking-[0.2em]">
              {isLogin ? 'Neural Gateway' : 'Identity Synthesis'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-2)] group-focus-within:text-[var(--accent)] transition-colors">
                  <User size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="Username / Alias" 
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-0)] placeholder:text-[var(--text-2)] outline-none focus:border-[var(--accent)] transition-all font-bold text-base sm:text-sm"
                />
              </div>

              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-2)] group-focus-within:text-[var(--accent)] transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Access Code" 
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-12 pr-12 text-[var(--text-0)] placeholder:text-[var(--text-2)] outline-none focus:border-[var(--accent)] transition-all font-bold text-base sm:text-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs text-center font-black uppercase tracking-widest animate-in zoom-in-95">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 bg-[var(--accent)] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Initiate Link' : 'Forge Account'}</span>
                  <ArrowRight size={20} strokeWidth={3} />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-10 pt-8 border-t border-[var(--border-subtle)] text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-[var(--text-2)] text-xs font-bold uppercase tracking-widest hover:text-[var(--text-0)] transition-all group"
            >
              {isLogin ? "New to the network? " : "Existing operator? "}
              <span className="text-[var(--accent)] group-hover:brightness-110 transition-all font-black">
                {isLogin ? 'Register Hub' : 'Enter Gateway'}
              </span>
            </button>
          </div>

          {/* Trust */}
          <div className="mt-8 flex items-center justify-center gap-2 text-[var(--text-2)] text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
            <ShieldCheck size={14} className="text-emerald-500" />
            Quantum Secured Link
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
