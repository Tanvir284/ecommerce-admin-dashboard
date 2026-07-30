import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Tag, Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';

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

  const fetchData = async () => {
    setIsLoading(true);
    setForbiddenError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
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
    fetchData();
  }, [search, statusFilter]);

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
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
        <AlertTriangle className="w-8 h-8 shrink-0" />
        <div>
          <h3 className="font-bold text-lg">403 Forbidden Access</h3>
          <p className="text-sm mt-1">{forbiddenError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Tag className="w-6 h-6 text-indigo-400" />
            Brands Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manufacturers and labels assigned to products.
          </p>
        </div>

        {hasPermission('brand:create') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Brand
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none w-full sm:w-44"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      {/* Brands Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading brands...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((b) => (
            <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4 border-b border-slate-800 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {b.logo ? (
                      <img src={b.logo.publicUrl} alt={b.name} className="w-full h-full object-contain" />
                    ) : (
                      <Tag className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-lg">{b.name}</h3>
                    <span className="text-xs font-mono text-slate-500">/{b.slug}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">{b.description || 'No description provided.'}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  {b._count ? b._count.products : 0} Product(s)
                </span>

                <div className="flex items-center gap-2">
                  {hasPermission('brand:update') && (
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Brand"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('brand:delete') && (
                    <button
                      onClick={() => handleDeleteBrand(b.id, b.name)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Brand"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brand Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              {editingId ? 'Edit Brand' : 'Create Brand'}
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nike"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Slug (Auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="nike"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Logo (Media Asset Reference)
                </label>
                <select
                  value={logoId}
                  onChange={(e) => setLogoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
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
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brand story or description"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
