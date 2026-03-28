import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { User, Key, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user?.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
    });
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Name updated successfully!' });
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-16 px-6">
        <div className="bg-app-card rounded-[40px] shadow-2xl shadow-emerald-900/5 border border-app-border overflow-hidden">
          <div className="bg-app-text p-8 text-app-bg">
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-app-secondary opacity-80 mt-2">Manage your profile and security</p>
          </div>

          <div className="p-8">
            {message && (
              <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 ${
                message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="font-medium">{message.text}</p>
              </div>
            )}

            {activeTab === 'profile' ? (
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-500/20">
                    {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-app-text">{user?.user_metadata?.full_name || 'User'}</h2>
                    <p className="text-app-secondary font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-app-bg rounded-2xl border border-app-border">
                    <p className="text-xs font-bold text-app-secondary uppercase tracking-widest mb-1">Account ID</p>
                    <p className="text-sm font-mono text-app-text truncate">{user?.id}</p>
                  </div>
                  <div className="p-6 bg-app-bg rounded-2xl border border-app-border">
                    <p className="text-xs font-bold text-app-secondary uppercase tracking-widest mb-1">Member Since</p>
                    <p className="text-sm font-bold text-app-text">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ) : activeTab === 'name' ? (
              <form onSubmit={handleUpdateName} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-app-secondary uppercase tracking-widest flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-6 py-4 bg-app-bg border border-app-border text-app-text rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/10"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Saving...' : 'Update Name'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-app-secondary uppercase tracking-widest flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-6 py-4 bg-app-bg border border-app-border text-app-text rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-app-secondary uppercase tracking-widest flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-6 py-4 bg-app-bg border border-app-border text-app-text rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/10"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
