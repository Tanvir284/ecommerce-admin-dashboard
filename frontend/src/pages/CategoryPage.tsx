import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FolderTree, Plus, Edit2, Trash2, AlertTriangle, ChevronRight, Folder, Image as ImageIcon } from 'lucide-react';

interface Media {
  id: string;
  publicUrl: string;
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageId?: string;
  image?: Media;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  children?: CategoryNode[];
  _count?: { products: number; children: number };
}

export const CategoryPage: React.FC = () => {
  const { hasPermission } = useAuth();

  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [flatCategories, setFlatCategories] = useState<CategoryNode[]>([]);
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [imageId, setImageId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setForbiddenError(null);
    try {
      const [treeRes, flatRes, mediaRes]: any = await Promise.all([
        api.get('/category/tree'),
        api.get('/category?limit=100'),
        api.get('/media?limit=50'),
      ]);
      setTree(treeRes || []);
      setFlatCategories(flatRes.categories || []);
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
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setParentId('');
    setImageId('');
    setIsActive(true);
    setSortOrder(0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryNode) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setParentId(cat.parentId || '');
    setImageId(cat.imageId || '');
    setIsActive(cat.isActive);
    setSortOrder(cat.sortOrder);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        name,
        slug: slug.trim() || undefined,
        description,
        parentId: parentId || undefined,
        imageId: imageId || undefined,
        isActive,
        sortOrder: Number(sortOrder),
      };

      if (editingId) {
        await api.put(`/category/${editingId}`, payload);
      } else {
        await api.post('/category', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!window.confirm(`Are you sure you want to delete category '${catName}'?`)) return;
    try {
      await api.delete(`/category/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const renderTreeNode = (node: CategoryNode, depth = 0) => (
    <div key={node.id} className="space-y-2">
      <div
        className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-3">
          {depth > 0 && <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
          <Folder className="w-4 h-4 text-teal-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">{node.name}</span>
              <span className="text-xs text-slate-500 font-mono">/{node.slug}</span>
              {!node.isActive && (
                <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">
                  Inactive
                </span>
              )}
            </div>
            {node.description && <p className="text-xs text-slate-400 mt-0.5">{node.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('category:update') && (
            <button
              onClick={() => openEditModal(node)}
              className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800"
              title="Edit Category"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {hasPermission('category:delete') && (
            <button
              onClick={() => handleDeleteCategory(node.id, node.name)}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10"
              title="Delete Category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {node.children && node.children.map((child) => renderTreeNode(child, depth + 1))}
    </div>
  );

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
            <FolderTree className="w-6 h-6 text-teal-400" />
            Nested Category Tree
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Unlimited depth hierarchical category tree for organizing products.
          </p>
        </div>

        {hasPermission('category:create') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Category
          </button>
        )}
      </div>

      {/* Category Tree Display */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading category tree...</div>
      ) : tree.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          No categories found. Click 'Create Category' to add one.
        </div>
      ) : (
        <div className="space-y-3">{tree.map((node) => renderTreeNode(node, 0))}</div>
      )}

      {/* Modal for Creating / Editing Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              {editingId ? 'Edit Category' : 'Create Category'}
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Android Phones"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Slug (Auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="android-phones"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Parent Category
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                  >
                    <option value="">None (Top Level Root)</option>
                    {flatCategories
                      .filter((c) => c.id !== editingId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Category description"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Image (Media Reference)
                  </label>
                  <select
                    value={imageId}
                    onChange={(e) => setImageId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                  >
                    <option value="">No Image</option>
                    {mediaList.map((m) => (
                      <option key={m.id} value={m.id}>
                        Asset #{m.id.substring(0, 6)} ({m.publicUrl})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                  />
                </div>
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
                  {isSaving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
