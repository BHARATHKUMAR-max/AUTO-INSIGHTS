import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Database, Mail, Lock, ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-app-bg">
      {/* Theme Toggle for Auth Pages */}
      <button
        onClick={toggleTheme}
        className="absolute top-8 right-8 z-20 p-3 rounded-2xl bg-app-card border border-app-border text-app-text shadow-lg hover:scale-110 transition-all"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Full Page Background Logo with Blur and Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="w-full h-full bg-cover bg-center opacity-30 blur-2xl scale-110"
          style={{ 
            backgroundImage: `linear-gradient(rgba(0,0,0,${theme === 'dark' ? '0.8' : '0.4'}), rgba(0,0,0,${theme === 'dark' ? '0.8' : '0.4'})), url('/LOGO.png')` 
          }}
        />
      </div>

      {/* Glassmorphism Login Card */}
      <div className="w-full max-w-md bg-app-card/80 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-app-border overflow-hidden relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="p-10 flex flex-col items-center">
          {/* Logo Section with Glow */}
          <div className="mb-8 relative group">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full group-hover:bg-emerald-500/40 transition-all duration-500" />
            <img 
              src="/LOGO.png" 
              alt="AUTO INSIGHTS" 
              className="h-24 w-auto object-contain relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            />
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-app-text uppercase tracking-tighter">Auto Insights</h1>
            <p className="text-emerald-500 text-sm font-medium mt-2 tracking-wide">Expert insights from your data.</p>
          </div>
          
          <form onSubmit={handleAuth} className="w-full space-y-6">
            {error && (
              <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-sm border border-red-500/20 backdrop-blur-md animate-shake">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-app-secondary group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full pl-14 pr-6 py-4 bg-app-bg border border-app-border rounded-2xl text-app-text placeholder:text-app-secondary focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-app-secondary group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full pl-14 pr-6 py-4 bg-app-bg border border-app-border rounded-2xl text-app-text placeholder:text-app-secondary focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="tracking-wide">
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-app-secondary hover:text-app-text transition-all group"
              >
                {isSignUp ? (
                  <>Already have an account? <span className="text-emerald-500 font-bold group-hover:underline decoration-2 underline-offset-4">Sign In</span></>
                ) : (
                  <>New to Auto Insights? <span className="text-emerald-500 font-bold group-hover:underline decoration-2 underline-offset-4">Create an account</span></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
