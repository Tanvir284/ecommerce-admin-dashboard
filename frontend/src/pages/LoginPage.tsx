import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const setSuperAdmin = () => {
    setEmail('admin@admin.com');
    setPassword('Admin123!');
  };

  const setCatalogManager = () => {
    setEmail('catalog@admin.com');
    setPassword('Catalog123!');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/30 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Trends Bird</h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise Ecommerce Admin Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-slate-950/80">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center space-x-2">
              <span>⚠️ {error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@admin.com"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Credential Fill Section for Reviewers */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
              ⚡ Quick Fill Test Credentials
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={setSuperAdmin}
                className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-600/20 border border-slate-700/60 hover:border-indigo-500/40 text-xs font-medium text-slate-300 hover:text-white transition-all group"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                onClick={setCatalogManager}
                className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-slate-800/60 hover:bg-purple-600/20 border border-slate-700/60 hover:border-purple-500/40 text-xs font-medium text-slate-300 hover:text-white transition-all group"
              >
                <UserCheck className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Catalog (403 Test)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
