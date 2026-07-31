import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { Tag, Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Media {
  id: string;
  publicUrl: string;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  status: string;
  description?: string;
  logoId?: string;
  logo?: Media;
  _count?: { products: number };
}

export const BrandPage: React.FC = () => {
  const { hasPermission } = useAuth();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [description, setDescription] = useState('');
  const [logoId, setLogoId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async (isInitial = false) => {
    if (isInitial && brands.length === 0) setIsLoading(true);
    setForbiddenError(null);
    try {
      const queryParams = new URLSearchParams();
      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (statusFilter) queryParams.append('status', statusFilter);

      const [brandsRes, mediaRes]: any = await Promise.all([
        api.get(`/brand?${queryParams.toString()}`),
        api.get('/media?limit=50'),
      ]);
      setBrands(brandsRes.brands || []);
      setMediaList(mediaRes.media || []);
    } catch (err: any) {
      if (err.status === 403) {
        setForbiddenError(err.message || 'Access Forbidden: 403.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(brands.length === 0);
  }, [debouncedSearch, statusFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setStatus('ACTIVE');
    setDescription('');
    setLogoId('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: Brand) => {
    setEditingId(b.id);
    setName(b.name);
    setSlug(b.slug);
    setStatus(b.status);
    setDescription(b.description || '');
    setLogoId(b.logoId || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        name,
        slug: slug.trim() || undefined,
        status,
        description,
        logoId: logoId || undefined,
      };

      if (editingId) {
        await api.put(`/brand/${editingId}`, payload);
      } else {
        await api.post('/brand', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save brand');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBrand = async (id: string, brandName: string) => {
    if (!window.confirm(`Are you sure you want to delete brand '${brandName}'?`)) return;
    try {
      await api.delete(`/brand/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete brand');
    }
  };

  if (forbiddenError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 text-red-700 shadow-sm">
        <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-base">403 Forbidden Access</h3>
          <p className="text-sm mt-1">{forbiddenError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-gray-900" />
            Brands Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manufacturers and labels assigned to products.
          </p>
        </div>

        {hasPermission('brand:create') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Brand
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands..."
            className="w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none shadow-sm transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none shadow-sm w-full sm:w-44"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      {/* Brands Grid */}
      {isLoading && brands.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-500 shadow-sm text-sm">
          No brands found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((b) => (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              key={b.id} 
              className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center gap-4 mb-4 border-b border-gray-100 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                    {b.logo ? (
                      <img src={b.logo.publicUrl} alt={b.name} className="w-full h-full object-contain" />
                    ) : (
                      <Tag className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{b.name}</h3>
                    <span className="text-xs font-mono text-gray-400">/{b.slug}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2">{b.description || 'No description provided.'}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                  {b._count ? b._count.products : 0} Product(s)
                </span>

                <div className="flex items-center gap-1.5">
                  {hasPermission('brand:update') && (
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit Brand"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('brand:delete') && (
                    <button
                      onClick={() => handleDeleteBrand(b.id, b.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Brand"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Brand Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Brand' : 'Create Brand'}
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nike"
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Slug (Auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="nike"
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Logo (Media Asset Reference)
                </label>
                <select
                  value={logoId}
                  onChange={(e) => setLogoId(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                >
                  <option value="">No Logo</option>
                  {mediaList.map((m) => (
                    <option key={m.id} value={m.id}>
                      Media Asset #{m.id.substring(0, 6)} ({m.publicUrl})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brand story or description"
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm transition-all shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

