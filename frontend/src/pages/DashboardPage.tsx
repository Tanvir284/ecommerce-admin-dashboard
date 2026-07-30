import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Package, Users, FolderTree, Tag, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, role, permissions } = useAuth();
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    brands: 0,
    users: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [prodRes, catRes, brandRes, userRes]: any = await Promise.allSettled([
          api.get('/product?limit=1'),
          api.get('/category?limit=1'),
          api.get('/brand?limit=1'),
          api.get('/user?limit=1'),
        ]);

        setStats({
          products: prodRes.status === 'fulfilled' ? prodRes.value?.meta?.total || 0 : 0,
          categories: catRes.status === 'fulfilled' ? catRes.value?.meta?.total || 0 : 0,
          brands: brandRes.status === 'fulfilled' ? brandRes.value?.meta?.total || 0 : 0,
          users: userRes.status === 'fulfilled' ? userRes.value?.meta?.total || 0 : 0,
        });
      } catch (e) {
        // Stats fallback
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Welcome back, {user?.name}!</h1>
        <p className="text-sm text-slate-400 mt-1">
          Logged in as <span className="text-emerald-400 font-semibold">{role?.name}</span> with {permissions.length} granted permission(s).
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Products</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats.products}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Categories</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats.categories}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Brands</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats.brands}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Dashboard Accounts</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats.users}</p>
          </div>
        </div>
      </div>

      {/* Permissions Breakdown Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-slate-100">Granted Permissions Grid</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            'dashboard',
            'permission',
            'role',
            'user',
            'media',
            'category',
            'brand',
            'attribute',
            'product',
          ].map((module) => {
            const modulePerms = permissions.filter((p) => p.startsWith(`${module}:`));
            const hasWatch = permissions.includes(`${module}:watch`);

            return (
              <div key={module} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <span className="font-semibold text-slate-200 capitalize">{module}</span>
                  {hasWatch ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Watch Enabled
                    </span>
                  ) : (
                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Restricted
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {modulePerms.length > 0 ? (
                    modulePerms.map((p) => (
                      <span key={p} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {p.split(':')[1]}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No actions granted</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
