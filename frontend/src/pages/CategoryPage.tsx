import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FolderTree, Plus, Edit2, Trash2, AlertTriangle, ChevronRight, Folder, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

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

  const fetchData = async (isInitial = false) => {
    if (isInitial && tree.length === 0) setIsLoading(true);
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
    fetchData(tree.length === 0);
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
        className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 shadow-sm transition-all"
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-3">
          {depth > 0 && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
          <Folder className="w-4 h-4 text-gray-700 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">{node.name}</span>
              <span className="text-xs text-gray-400 font-mono">/{node.slug}</span>
              {!node.isActive && (
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200 font-medium">
                  Inactive
                </span>
              )}
            </div>
            {node.description && <p className="text-xs text-gray-500 mt-0.5">{node.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasPermission('category:update') && (
            <button
              onClick={() => openEditModal(node)}
              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit Category"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {hasPermission('category:delete') && (
            <button
              onClick={() => handleDeleteCategory(node.id, node.name)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            <FolderTree className="w-6 h-6 text-gray-900" />
            Nested Category Tree
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Unlimited depth hierarchical category tree for organizing products.
          </p>
        </div>

        {hasPermission('category:create') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Category
          </button>
        )}
      </div>

      {/* Category Tree Display */}
      {isLoading && tree.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-3">
          <div className="h-10 bg-gray-100 rounded-xl"></div>
          <div className="h-10 bg-gray-100 rounded-xl ml-6"></div>
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-500 shadow-sm text-sm">
          No categories found. Click 'Create Category' to add one.
        </div>
      ) : (
        <div className="space-y-2.5">{tree.map((node) => renderTreeNode(node, 0))}</div>
      )}

      {/* Modal for Creating / Editing Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-xl"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Category' : 'Create Category'}
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Android Phones"
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Slug (Auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="android-phones"
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Parent Category
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
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
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Category description"
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Image (Media Reference)
                  </label>
                  <select
                    value={imageId}
                    onChange={(e) => setImageId(e.target.value)}
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                  />
                </div>
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
                  {isSaving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

