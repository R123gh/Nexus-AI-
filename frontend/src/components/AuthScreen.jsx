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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#050508] overflow-hidden selection:bg-indigo-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute w-[800px] h-[800px] bg-indigo-600/10 blur-[150px] rounded-full transition-all duration-1000"
          style={{ 
            top: mousePos.y * 0.5 - 400, 
            left: mousePos.x * 0.5 - 400 
          }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-200" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,5,8,1)_100%)]" />
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[480px] px-4 py-8 sm:px-6 sm:py-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        <div className="bg-white/[0.01] backdrop-blur-3xl border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-[0_32px_128px_rgba(0,0,0,0.8)] relative overflow-hidden group">
          
          {/* Subtle Inner Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-700" />
          
          {/* Brand Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-3xl mb-8 shadow-2xl shadow-indigo-500/40 relative">
              <Zap size={36} className="text-white fill-white animate-pulse" />
              <div className="absolute -inset-1 bg-white/20 rounded-3xl blur-sm -z-10" />
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tighter leading-none">
              Nexus<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em]">
              {isLogin ? 'Neural Gateway' : 'Identity Synthesis'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <User size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="Username / Alias" 
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all font-bold text-base sm:text-sm"
                />
              </div>

              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Access Code" 
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all font-bold text-base sm:text-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
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
              className="w-full h-14 bg-[var(--text-0)] text-[var(--bg-0)] rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-3 disabled:opacity-50"
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
          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-white transition-all group"
            >
              {isLogin ? "New to the network? " : "Existing operator? "}
              <span className="text-indigo-400 group-hover:text-indigo-300 transition-colors">
                {isLogin ? 'Register Hub' : 'Enter Gateway'}
              </span>
            </button>
          </div>

          {/* Trust */}
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
            <ShieldCheck size={14} className="text-emerald-500/50" />
            Quantum Secured Link
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
