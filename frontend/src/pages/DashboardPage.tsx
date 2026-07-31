import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/axios';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/products',
    },
    {
      title: 'Categories',
      count: stats.categories,
      icon: FolderTree,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      link: '/categories',
    },
    {
      title: 'Brands',
      count: stats.brands,
      icon: Tag,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      link: '/brands',
    },
    {
      title: 'Active Roles',
      count: stats.roles,
      icon: UserCog,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      link: '/roles',
    },
    {
      title: 'System Users',
      count: stats.users,
      icon: Users,
      color: 'text-gray-900',
      bg: 'bg-gray-100',
      link: '/users',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as any, stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Overview
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.name}. Here's what's happening with your store today.
          </p>
        </div>

        <div className="flex items-center">
          <Link
            to="/products/new"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-black hover:bg-gray-900 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.title} variants={item}>
              <Link
                to={card.link}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    {card.title}
                  </p>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {card.count}
                  </h3>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Access Control Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Access Control</h2>
                <p className="text-xs text-gray-500">Your current session details</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              Active Session
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-xs font-medium text-gray-500">Assigned Role</span>
              <p className="text-sm font-semibold text-gray-900 mt-1">{role?.name || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-xs font-medium text-gray-500">Permissions</span>
              <p className="text-sm font-semibold text-indigo-600 mt-1">{permissions.length} Granted</p>
            </div>
          </div>
        </div>

        {/* System Overview Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">System Environment</h2>
                <p className="text-xs text-gray-500">Backend API status</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Operational
            </span>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Database</span>
              <span className="font-medium text-gray-900">PostgreSQL (5433)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">API Port</span>
              <span className="font-medium text-gray-900">http://localhost:3000</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Token Strategy</span>
              <span className="font-medium text-gray-900">JWT (15m) + Refresh (7d)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
