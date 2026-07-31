import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/axios';
import { Link } from 'react-router-dom';
import {
  Package,
  FolderTree,
  Tag,
  Users,
  UserCog,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, role, permissions } = useAuth();
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    brands: 0,
    roles: 0,
    users: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [prodRes, catRes, brandRes, roleRes, userRes] = await Promise.allSettled([
          api.get('/product?limit=1'),
          api.get('/category'),
          api.get('/brand?limit=1'),
          api.get('/role?limit=1'),
          api.get('/user?limit=1'),
        ]);

        setStats({
          products: prodRes.status === 'fulfilled' ? prodRes.value.data.data?.meta?.total || 0 : 0,
          categories: catRes.status === 'fulfilled' ? catRes.value.data.data?.categories?.length || 0 : 0,
          brands: brandRes.status === 'fulfilled' ? brandRes.value.data.data?.meta?.total || 0 : 0,
          roles: roleRes.status === 'fulfilled' ? roleRes.value.data.data?.meta?.total || 0 : 0,
          users: userRes.status === 'fulfilled' ? userRes.value.data.data?.meta?.total || 0 : 0,
        });
      } catch (e) {
        // Fallback
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: 'Total Products',
      count: stats.products,
      icon: Package,
      gradient: 'from-indigo-500 to-indigo-700',
      shadow: 'shadow-indigo-500/20',
      link: '/products',
    },
    {
      title: 'Categories',
      count: stats.categories,
      icon: FolderTree,
      gradient: 'from-purple-500 to-purple-700',
      shadow: 'shadow-purple-500/20',
      link: '/categories',
    },
    {
      title: 'Brands',
      count: stats.brands,
      icon: Tag,
      gradient: 'from-emerald-500 to-emerald-700',
      shadow: 'shadow-emerald-500/20',
      link: '/brands',
    },
    {
      title: 'Active Roles',
      count: stats.roles,
      icon: UserCog,
      gradient: 'from-amber-500 to-amber-700',
      shadow: 'shadow-amber-500/20',
      link: '/roles',
    },
    {
      title: 'System Users',
      count: stats.users,
      icon: Users,
      gradient: 'from-cyan-500 to-blue-700',
      shadow: 'shadow-cyan-500/20',
      link: '/users',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 p-8 border border-slate-800 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trends Bird Admin Engine v1.0</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Admin'}! 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              You are signed in as{' '}
              <strong className="text-indigo-400 font-semibold">{role?.name}</strong> with{' '}
              <strong className="text-emerald-400 font-semibold">{permissions.length}</strong> active system capabilities.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/products/new"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className={`bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 group hover:-translate-y-1 ${card.shadow}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="p-1 rounded-lg bg-slate-800/60 group-hover:bg-indigo-500/20 text-slate-400 group-hover:text-indigo-400 transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {card.title}
              </p>
              <h3 className="text-3xl font-extrabold text-white mt-1 group-hover:text-indigo-300 transition-colors">
                {card.count}
              </h3>
            </Link>
          );
        })}
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Access Control Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">RBAC Access Control Status</h2>
                <p className="text-xs text-slate-400">Role-based capabilities for current user</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active Session
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Assigned Role</span>
              <p className="text-sm font-bold text-white mt-0.5">{role?.name || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Total Permissions</span>
              <p className="text-sm font-bold text-indigo-400 mt-0.5">{permissions.length} Granted</p>
            </div>
          </div>
        </div>

        {/* System Overview Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">System Environment</h2>
                <p className="text-xs text-slate-400">PostgreSQL + Prisma ORM + NestJS</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Operational
            </span>
          </div>

          <div className="space-y-2 pt-1 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Database Connection</span>
              <span className="font-semibold text-emerald-400">PostgreSQL (Localhost:5433)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">API Port</span>
              <span className="font-semibold text-indigo-400">http://localhost:3000</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Token Strategy</span>
              <span className="font-semibold text-purple-400">JWT (15m) + Refresh Rotation (7d)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
