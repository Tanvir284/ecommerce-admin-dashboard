import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Package, ArrowLeft, Image as ImageIcon, Layers, CheckCircle2, AlertTriangle, Plus, Trash2, Tag, FolderTree } from 'lucide-react';

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }
interface Media { id: string; publicUrl: string; fileName: string; }
interface AttributeValue { id: string; value: string; }
interface Attribute { id: string; name: string; values: AttributeValue[]; }

interface VariantState {
  sku: string;
  price: number;
  salePrice?: number;
  stock: number;
  attributeValueIds: string[];
  mediaIds: string[];
}

export const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<'details' | 'categories' | 'media' | 'variants'>('details');

  // Master Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);

  // Product Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [longDesc, setLongDesc] = useState('');
  const [hasVariants, setHasVariants] = useState(false);
  const [price, setPrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [brandId, setBrandId] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [thumbnailMediaId, setThumbnailMediaId] = useState('');

  // Variants Generator State
  const [selectedAttrValueIds, setSelectedAttrValueIds] = useState<Record<string, string[]>>({});
  const [variants, setVariants] = useState<VariantState[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoading(true);
      try {
        const [catRes, brandRes, mediaRes, attrRes]: any = await Promise.all([
          api.get('/category?limit=100'),
          api.get('/brand?limit=100'),
          api.get('/media?limit=100'),
          api.get('/attribute?limit=100'),
        ]);

        setCategories(catRes.categories || []);
        setBrands(brandRes.brands || []);
        setMediaList(mediaRes.media || []);
        setAttributes(attrRes.attributes || []);

        if (id) {
          const product: any = await api.get(`/product/${id}`);
          setName(product.name);
          setSlug(product.slug);
          setSku(product.sku || '');
          setShortDesc(product.shortDescription || '');
          setLongDesc(product.longDescription || '');
          setHasVariants(product.hasVariants);
          setPrice(product.price !== null ? product.price : '');
          setSalePrice(product.salePrice !== null ? product.salePrice : '');
          setStock(product.stock !== null ? product.stock : '');
          setBrandId(product.brandId || '');
          setSelectedCategoryIds(product.categories ? product.categories.map((c: any) => c.categoryId) : []);

          if (product.mediaAttachments) {
            const mIds = product.mediaAttachments.map((m: any) => m.mediaId);
            setSelectedMediaIds(mIds);
            const thumb = product.mediaAttachments.find((m: any) => m.isThumbnail);
            if (thumb) setThumbnailMediaId(thumb.mediaId);
          }

          if (product.hasVariants && product.variants) {
            setVariants(
              product.variants.map((v: any) => ({
                sku: v.sku,
                price: v.price,
                salePrice: v.salePrice || undefined,
                stock: v.stock,
                attributeValueIds: v.attributeValues ? v.attributeValues.map((av: any) => av.attributeValueId) : [],
                mediaIds: v.mediaAttachments ? v.mediaAttachments.map((m: any) => m.mediaId) : [],
              })),
            );
          }
        }
      } catch (err: any) {
        setFormError(err.message || 'Failed to load master data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasterData();
  }, [id]);

  const toggleCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((c) => c !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const toggleMedia = (mId: string) => {
    if (selectedMediaIds.includes(mId)) {
      setSelectedMediaIds(selectedMediaIds.filter((m) => m !== mId));
      if (thumbnailMediaId === mId) setThumbnailMediaId('');
    } else {
      setSelectedMediaIds([...selectedMediaIds, mId]);
      if (!thumbnailMediaId) setThumbnailMediaId(mId);
    }
  };

  const toggleAttrValueSelection = (attrId: string, valId: string) => {
    const current = selectedAttrValueIds[attrId] || [];
    if (current.includes(valId)) {
      setSelectedAttrValueIds({
        ...selectedAttrValueIds,
        [attrId]: current.filter((v) => v !== valId),
      });
    } else {
      setSelectedAttrValueIds({
        ...selectedAttrValueIds,
        [attrId]: [...current, valId],
      });
    }
  };

  const generateCombinations = () => {
    const activeAttrs = Object.keys(selectedAttrValueIds).filter(
      (k) => selectedAttrValueIds[k].length > 0,
    );

    if (activeAttrs.length === 0) {
      alert('Please select at least one value under an attribute to generate matrix combinations');
      return;
    }

    const arraysToCombine = activeAttrs.map((k) => selectedAttrValueIds[k]);

    const combine = (acc: string[][], curr: string[]): string[][] => {
      if (acc.length === 0) return curr.map((item) => [item]);
      return acc.flatMap((accItem) => curr.map((currItem) => [...accItem, currItem]));
    };

    const combinations = arraysToCombine.reduce(combine, [] as string[][]);

    const generatedVariants: VariantState[] = combinations.map((combo, idx) => ({
      sku: `${name.substring(0, 3).toUpperCase()}-VAR-${idx + 1}`,
      price: price !== '' ? Number(price) : 100,
      stock: 10,
      attributeValueIds: combo,
      mediaIds: [],
    }));

    setVariants(generatedVariants);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const mediaAttachments = selectedMediaIds.map((mId) => ({
        mediaId: mId,
        isThumbnail: mId === thumbnailMediaId,
        isGallery: true,
      }));

      const payload: any = {
        name,
        slug: slug.trim() || undefined,
        sku: !hasVariants ? sku.trim() || undefined : undefined,
        shortDescription: shortDesc,
        longDescription: longDesc,
        hasVariants,
        price: !hasVariants && price !== '' ? Number(price) : undefined,
        salePrice: !hasVariants && salePrice !== '' ? Number(salePrice) : undefined,
        stock: !hasVariants && stock !== '' ? Number(stock) : undefined,
        brandId: brandId || undefined,
        categoryIds: selectedCategoryIds,
        mediaAttachments,
        variants: hasVariants ? variants : undefined,
      };

      if (id) {
        await api.put(`/product/${id}`, payload);
      } else {
        await api.post('/product', payload);
      }

      navigate('/products');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-400">Loading product editor...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>
        <h1 className="text-2xl font-bold text-slate-100">
          {id ? `Edit Product: ${name}` : 'Create New Product'}
        </h1>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Tabs */}
      <div className="flex items-center border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'details'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          1. General Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'categories'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          2. Brand & Categories ({selectedCategoryIds.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'media'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          3. Media Library ({selectedMediaIds.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('variants')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'variants'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          4. Variants Builder ({hasVariants ? variants.length : 'Simple'})
        </button>
      </div>

      <form onSubmit={handleSaveProduct} className="space-y-6">
        {/* TAB 1: General Details */}
        {activeTab === 'details' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Classic Cotton T-Shirt"
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
                  placeholder="classic-cotton-t-shirt"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Product Type
                </label>
                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="hasVariants"
                      checked={!hasVariants}
                      onChange={() => setHasVariants(false)}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Simple Product</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="hasVariants"
                      checked={hasVariants}
                      onChange={() => setHasVariants(true)}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Variable Product (Has Variants)</span>
                  </label>
                </div>
              </div>
            </div>

            {!hasVariants && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SKU-1001"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="99.99"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="79.99"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="50"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Short Summary Text
              </label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="Brief summary text"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Description (HTML / Text)
              </label>
              <textarea
                rows={4}
                value={longDesc}
                onChange={(e) => setLongDesc(e.target.value)}
                placeholder="Full product detailed specifications"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-4 text-sm text-slate-100 outline-none"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Brand & Categories */}
        {activeTab === 'categories' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-400" />
                Select Brand (At most 1 brand per product)
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none max-w-md"
              >
                <option value="">No Brand Assigned</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-teal-400" />
                Attach Categories (Product can belong to many categories)
              </label>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 bg-slate-950 border border-slate-800 rounded-xl">
                {categories.map((c) => {
                  const isChecked = selectedCategoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span>{c.name}</span>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Media Library Picker & Thumbnail Selector */}
        {activeTab === 'media' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Product Gallery & Thumbnail Selector</h3>
              <p className="text-xs text-slate-400 mb-4">
                Click media assets from the shared library to attach them. Exactly one media asset will serve as main thumbnail.
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-80 overflow-y-auto p-4 bg-slate-950 border border-slate-800 rounded-xl">
              {mediaList.map((m) => {
                const isAttached = selectedMediaIds.includes(m.id);
                const isThumb = thumbnailMediaId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMedia(m.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      isThumb
                        ? 'border-amber-400 ring-2 ring-amber-400/20'
                        : isAttached
                        ? 'border-emerald-500'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={m.publicUrl} alt={m.fileName} className="w-full h-full object-cover" />

                    {isAttached && (
                      <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 p-1 rounded-full shadow">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {isAttached && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThumbnailMediaId(m.id);
                        }}
                        className={`absolute bottom-1 left-1 right-1 py-0.5 text-[9px] font-bold rounded text-center ${
                          isThumb ? 'bg-amber-400 text-slate-950' : 'bg-slate-950/80 text-slate-300 hover:bg-amber-400 hover:text-slate-950'
                        }`}
                      >
                        {isThumb ? '★ Thumbnail' : 'Set Thumb'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: Variants Builder */}
        {activeTab === 'variants' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            {!hasVariants ? (
              <div className="text-center py-8 text-slate-400">
                This is marked as a <strong>Simple Product</strong>. Switch to <strong>Variable Product</strong> in General Details tab to build variants matrix.
              </div>
            ) : (
              <>
                {/* Attribute Matrix Combination Generator */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200">Select Participating Attributes & Values</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attributes.map((attr) => (
                      <div key={attr.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                        <span className="font-semibold text-slate-200 text-xs block mb-2">{attr.name}</span>
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((v) => {
                            const isSelected = (selectedAttrValueIds[attr.id] || []).includes(v.id);
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => toggleAttrValueSelection(attr.id, v.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                  isSelected
                                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}
                              >
                                {v.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={generateCombinations}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-slate-100 font-semibold text-xs rounded-xl transition-all"
                  >
                    ⚡ Produce Variant Matrix Combinations
                  </button>
                </div>

                {/* Variants List Table */}
                {variants.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-200">Generated Product Variants ({variants.length})</h3>

                    <div className="space-y-2">
                      {variants.map((v, i) => (
                        <div key={i} className="p-4 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-4 gap-3 items-center">
                          <div>
                            <span className="text-[10px] text-slate-500 block font-mono">Variant #{i + 1}</span>
                            <input
                              type="text"
                              required
                              value={v.sku}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[i].sku = e.target.value;
                                setVariants(updated);
                              }}
                              placeholder="SKU"
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block">Price ($) *</span>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={v.price}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[i].price = Number(e.target.value);
                                setVariants(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block">Stock *</span>
                            <input
                              type="number"
                              required
                              value={v.stock}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[i].stock = Number(e.target.value);
                                setVariants(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>

                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-5 py-2.5 text-sm text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            {isSaving ? 'Saving Product...' : 'Save Product (Atomic Transaction)'}
          </button>
        </div>
      </form>
    </div>
  );
};
