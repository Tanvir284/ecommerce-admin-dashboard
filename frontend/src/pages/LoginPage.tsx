import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Command, ArrowRight } from 'lucide-react';

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
      if (err.message && err.message.includes('Network Error')) {
        setError('Network error: Backend server is unreachable');
      } else {
        setError(err.message || 'Invalid email or password');
      }
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
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-6 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full max-w-[400px]">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center shadow-sm mb-4">
            <Command className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Log in to TrendsBird
          </h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Please enter your details.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
        >
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-start space-x-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-black hover:bg-gray-900 text-white font-medium py-2.5 rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm">{isLoading ? 'Signing in...' : 'Sign in'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-4">
              Test Accounts
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={setSuperAdmin}
                className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700 transition-colors"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={setCatalogManager}
                className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700 transition-colors"
              >
                Catalog Manager
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
