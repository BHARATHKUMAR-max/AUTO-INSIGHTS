import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Database, History, LogOut, PlusCircle, User, Settings, Key, UserCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-app-bg text-app-text">
      <header className="bg-[#141414] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 flex items-center">
            <img 
              src="/LOGO.png" 
              alt="AUTO INSIGHTS" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tighter uppercase">Auto Insights</span>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6 mr-2">
            <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
              <PlusCircle className="w-5 h-5" />
              <span className="font-medium">New Analysis</span>
            </Link>
            <Link to="/history" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
              <History className="w-5 h-5" />
              <span className="font-medium">History</span>
            </Link>
          </nav>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-white/10 transition-all text-gray-300 hover:text-white"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 hover:bg-white/10 p-2 rounded-xl transition-all"
            >
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium hidden sm:inline-block">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Profile'}
              </span>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-app-card rounded-2xl shadow-2xl border border-app-border py-2 text-app-text z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-bottom border-app-border mb-1">
                  <p className="text-xs font-bold text-app-secondary uppercase tracking-widest">Account</p>
                  <p className="text-sm font-medium truncate text-app-text opacity-80">{user?.email}</p>
                </div>

                <Link 
                  to="/settings?tab=profile" 
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-app-bg transition-colors"
                >
                  <User className="w-4 h-4 text-app-secondary" />
                  <span className="font-medium">My Profile</span>
                </Link>

                <Link 
                  to="/settings?tab=name" 
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-app-bg transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-app-secondary" />
                  <span className="font-medium">Change Name</span>
                </Link>

                <Link 
                  to="/settings?tab=password" 
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-app-bg transition-colors"
                >
                  <Key className="w-4 h-4 text-app-secondary" />
                  <span className="font-medium">Change Password</span>
                </Link>

                <Link 
                  to="/history" 
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-app-bg transition-colors"
                >
                  <History className="w-4 h-4 text-app-secondary" />
                  <span className="font-medium">Analysis History</span>
                </Link>

                <div className="h-px bg-app-border my-1 mx-2" />

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
