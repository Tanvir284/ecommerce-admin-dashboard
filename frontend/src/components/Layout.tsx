import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShieldCheck,
  UserCog,
  Users,
  Image as ImageIcon,
  FolderTree,
  Tag,
  SlidersHorizontal,
  Package,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Bell,
  Search,
  Sparkles,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, role, permissions, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard:watch' },
    { label: 'Permission', path: '/permissions', icon: ShieldCheck, permission: 'permission:watch' },
    { label: 'Role', path: '/roles', icon: UserCog, permission: 'role:watch' },
    { label: 'User', path: '/users', icon: Users, permission: 'user:watch' },
    { label: 'Media Library', path: '/media', icon: ImageIcon, permission: 'media:watch' },
    { label: 'Category', path: '/categories', icon: FolderTree, permission: 'category:watch' },
    { label: 'Brand', path: '/brands', icon: Tag, permission: 'brand:watch' },
    { label: 'Attribute', path: '/attributes', icon: SlidersHorizontal, permission: 'attribute:watch' },
    { label: 'Product', path: '/products', icon: Package, permission: 'product:watch' },
  ];

  const visibleNav = navItems.filter((item) => hasPermission(item.permission));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentNavItem = navItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between flex-shrink-0 z-30 transition-all duration-300">
        <div>
          {/* Brand Header */}
          <div className="h-20 flex items-center px-6 border-b border-slate-800/80 justify-between">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent leading-none">
                  Trends Bird
                </h1>
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">
                  Admin Dashboard
                </span>
              </div>
            </Link>
          </div>

          {/* User Brief Info */}
          <div className="p-4 mx-3 my-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {role?.name || 'No Role'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation Menu
            </div>
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white opacity-80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Sign Out */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition-all duration-200 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-20 bg-slate-900/50 backdrop-blur-md border-b border-slate-800/80 px-8 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-xs text-slate-400 space-x-2">
              <span>Admin</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white font-medium">{currentNavItem?.label || 'Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-64 bg-slate-800/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Notification Bell */}
            <button className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700/60 transition-all">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1.5 right-1.5 ring-2 ring-slate-900" />
            </button>

            {/* Granted permissions pill */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>
                <strong className="text-white">{permissions.length}</strong> Granted Permissions
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page View */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
