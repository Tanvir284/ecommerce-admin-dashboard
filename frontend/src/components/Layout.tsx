import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  KeyRound,
  ShieldCheck,
  Users,
  FolderTree,
  Tag,
  Sliders,
  Package,
  Image as ImageIcon,
  LogOut,
  User as UserIcon,
  ShoppingBag,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, role, logout, hasPermission } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, perm: 'dashboard:watch' },
    { label: 'Permission', path: '/permissions', icon: KeyRound, perm: 'permission:watch' },
    { label: 'Role', path: '/roles', icon: ShieldCheck, perm: 'role:watch' },
    { label: 'User', path: '/users', icon: Users, perm: 'user:watch' },
    { label: 'Media Library', path: '/media', icon: ImageIcon, perm: 'media:watch' },
    { label: 'Category', path: '/categories', icon: FolderTree, perm: 'category:watch' },
    { label: 'Brand', path: '/brands', icon: Tag, perm: 'brand:watch' },
    { label: 'Attribute', path: '/attributes', icon: Sliders, perm: 'attribute:watch' },
    { label: 'Product', path: '/products', icon: Package, perm: 'product:watch' },
  ];

  const visibleNavItems = navItems.filter((item) => hasPermission(item.perm));

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Brand Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-900/50">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShoppingBag className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="font-bold text-slate-100 leading-tight">Trends Bird</h1>
              <p className="text-xs text-slate-400">Admin Dashboard</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
              <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 truncate max-w-full">
                {role?.name}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 px-8 flex items-center justify-between sticky top-0 backdrop-blur z-10">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-200 font-medium capitalize">
              {location.pathname.split('/')[1] || 'Dashboard'}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Session: <span className="text-emerald-400">{user?.email}</span>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
