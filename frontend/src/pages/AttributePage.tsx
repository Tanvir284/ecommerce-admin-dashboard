import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Sliders, Plus, Search, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';

interface AttributeValue {
  id?: string;
  value: string;
  slug?: string;
  hexCode?: string;
}

interface Attribute {
  id: string;
  name: string;
  slug: string;
  type: string;
  values: AttributeValue[];
}

export const AttributePage: React.FC = () => {
  const { hasPermission } = useAuth();

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('DROPDOWN');
  const [values, setValues] = useState<AttributeValue[]>([
    { value: '', hexCode: '#000000' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const attributeTypes = [
    'DROPDOWN',
    'RADIO',
    'CHECKBOX',
    'COLOUR_SWATCH',
    'IMAGE_SWATCH',
  ];

  const fetchData = async () => {
    setIsLoading(true);
    setForbiddenError(null);
    try {
      const data: any = await api.get(`/attribute?search=${search}`);
      setAttributes(data.attributes || []);
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
  }, [search]);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setType('DROPDOWN');
    setValues([{ value: '' }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (attr: Attribute) => {
    setEditingId(attr.id);
    setName(attr.name);
    setSlug(attr.slug);
    setType(attr.type);
    setValues(attr.values.length > 0 ? attr.values : [{ value: '' }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const addValueField = () => {
    setValues([...values, { value: '', hexCode: '#10b981' }]);
  };

  const removeValueField = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const handleValueChange = (index: number, key: keyof AttributeValue, val: string) => {
    const updated = [...values];
    updated[index] = { ...updated[index], [key]: val };
    setValues(updated);
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const validValues = values.filter((v) => v.value.trim() !== '');

      const payload = {
        name,
        slug: slug.trim() || undefined,
        type: type as any,
        values: validValues,
      };

      if (editingId) {
        await api.put(`/attribute/${editingId}`, payload);
      } else {
        await api.post('/attribute', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save attribute');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAttribute = async (id: string, attrName: string) => {
    if (!window.confirm(`Are you sure you want to delete attribute '${attrName}'?`)) return;
    try {
      await api.delete(`/attribute/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete attribute');
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
            <Sliders className="w-6 h-6 text-purple-400" />
            Product Attributes
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dimensions products vary along (Size, Color, Storage) and their allowable values.
          </p>
        </div>

        {hasPermission('attribute:create') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Attribute
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search attributes or values..."
          className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
      </div>

      {/* Attributes Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading attributes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attributes.map((attr) => (
            <div key={attr.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-100 text-lg">{attr.name}</h3>
                    <span className="text-xs font-mono text-slate-500">/{attr.slug}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                    {attr.type}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block mb-2">Attribute Values ({attr.values.length})</span>
                  <div className="flex flex-wrap gap-1.5">
                    {attr.values.map((v) => (
                      <span
                        key={v.id || v.value}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-950 border border-slate-800 text-slate-300"
                      >
                        {v.hexCode && (
                          <span
                            className="w-3 h-3 rounded-full border border-slate-700"
                            style={{ backgroundColor: v.hexCode }}
                          />
                        )}
                        <span>{v.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                {hasPermission('attribute:update') && (
                  <button
                    onClick={() => openEditModal(attr)}
                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Edit Attribute"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {hasPermission('attribute:delete') && (
                  <button
                    onClick={() => handleDeleteAttribute(attr.id, attr.name)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Attribute"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attribute Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-8">
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              {editingId ? 'Edit Attribute' : 'Create Attribute'}
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveAttribute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Attribute Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Size, Color, Storage"
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
                    placeholder="size"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Attribute Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                  >
                    {attributeTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attribute Values List Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Values
                  </label>
                  <button
                    type="button"
                    onClick={addValueField}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Value
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {values.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={v.value}
                        onChange={(e) => handleValueChange(i, 'value', e.target.value)}
                        placeholder="Value name (e.g. Red, XL, 256GB)"
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                      />

                      {type === 'COLOUR_SWATCH' && (
                        <input
                          type="color"
                          value={v.hexCode || '#10b981'}
                          onChange={(e) => handleValueChange(i, 'hexCode', e.target.value)}
                          className="w-10 h-9 p-1 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                          title="Color Swatch"
                        />
                      )}

                      {values.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeValueField(i)}
                          className="p-2 text-slate-500 hover:text-red-400 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
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
                  {isSaving ? 'Saving...' : 'Save Attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
