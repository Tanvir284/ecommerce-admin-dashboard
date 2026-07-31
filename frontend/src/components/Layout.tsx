import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
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
  Command,
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
    <div className="min-h-screen bg-[#f7f9fc] text-gray-900 flex font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* Sidebar Navigation */}
      <motion.aside 
        initial={{ x: -250, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between flex-shrink-0 z-30 relative"
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <Link to="/" className="flex items-center space-x-2.5 group w-full">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shadow-sm">
                <Command className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="font-semibold text-sm tracking-tight text-gray-900">
                  TrendsBird
                </h1>
              </div>
            </Link>
          </div>

          {/* User Brief Info */}
          <div className="px-4 mt-6 mb-4">
            <div className="flex items-center space-x-3 px-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm border border-blue-100">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{role?.name || 'No Role'}</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 mt-2 mb-1">
              Menu
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
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Sign Out */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen z-10 relative">
        
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between flex-shrink-0 relative z-20">
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-900 font-medium">{currentNavItem?.label || 'Dashboard'}</span>
          </div>

          <div className="flex items-center space-x-5">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                className="w-64 bg-gray-50 border border-gray-200 rounded-md pl-9 pr-4 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="h-5 w-[1px] bg-gray-200 hidden sm:block" />

            {/* Notification Bell */}
            <button className="relative text-gray-500 hover:text-gray-900 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-0 right-0 ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Dynamic Page View */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="h-full max-w-7xl mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
