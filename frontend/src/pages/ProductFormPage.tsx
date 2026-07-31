import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Package, ArrowLeft, Image as ImageIcon, Layers, CheckCircle2, AlertTriangle, Plus, Trash2, Tag, FolderTree } from 'lucide-react';
import { motion } from 'framer-motion';

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
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm animate-pulse space-y-4 max-w-5xl mx-auto">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? `Edit Product: ${name}` : 'Create New Product'}
        </h1>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3 shadow-sm font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Tabs */}
      <div className="flex items-center border-b border-gray-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'details'
              ? 'border-black text-gray-900'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          1. General Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'categories'
              ? 'border-black text-gray-900'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          2. Brand & Categories ({selectedCategoryIds.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'media'
              ? 'border-black text-gray-900'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          3. Media Library ({selectedMediaIds.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('variants')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'variants'
              ? 'border-black text-gray-900'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          4. Variants Builder ({hasVariants ? variants.length : 'Simple'})
        </button>
      </div>

      <form onSubmit={handleSaveProduct} className="space-y-6">
        {/* TAB 1: General Details */}
        {activeTab === 'details' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Classic Cotton T-Shirt"
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
                  placeholder="classic-cotton-t-shirt"
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Product Type
                </label>
                <div className="flex items-center gap-6 py-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="radio"
                      name="hasVariants"
                      checked={!hasVariants}
                      onChange={() => setHasVariants(false)}
                      className="text-black focus:ring-black"
                    />
                    <span>Simple Product</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="radio"
                      name="hasVariants"
                      checked={hasVariants}
                      onChange={() => setHasVariants(true)}
                      className="text-black focus:ring-black"
                    />
                    <span>Variable Product (Has Variants)</span>
                  </label>
                </div>
              </div>
            </div>

            {!hasVariants && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SKU-1001"
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none font-mono shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="99.99"
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="79.99"
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="50"
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none shadow-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Short Summary Text
              </label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="Brief summary text"
                className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Description (HTML / Text)
              </label>
              <textarea
                rows={4}
                value={longDesc}
                onChange={(e) => setLongDesc(e.target.value)}
                placeholder="Full product detailed specifications"
                className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg p-3 text-sm text-gray-900 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Brand & Categories */}
        {activeTab === 'categories' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-700" />
                Select Brand (At most 1 brand per product)
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none shadow-sm max-w-md"
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
              <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-gray-700" />
                Attach Categories (Product can belong to many categories)
              </label>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-xl">
                {categories.map((c) => {
                  const isChecked = selectedCategoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{c.name}</span>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Media Library Picker & Thumbnail Selector */}
        {activeTab === 'media' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Product Gallery & Thumbnail Selector</h3>
              <p className="text-xs text-gray-500 mb-4">
                Click media assets from the shared library to attach them. Exactly one media asset will serve as main thumbnail.
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-80 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-xl">
              {mediaList.map((m) => {
                const isAttached = selectedMediaIds.includes(m.id);
                const isThumb = thumbnailMediaId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMedia(m.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      isThumb
                        ? 'border-amber-500 ring-2 ring-amber-500/20'
                        : isAttached
                        ? 'border-blue-600'
                        : 'border-gray-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={m.publicUrl} alt={m.fileName} className="w-full h-full object-cover" />

                    {isAttached && (
                      <div className="absolute top-1 right-1 bg-black text-white p-1 rounded-full shadow">
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
                          isThumb ? 'bg-amber-500 text-white' : 'bg-gray-900/80 text-white hover:bg-amber-500'
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
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-sm">
            {!hasVariants ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                This is marked as a <strong>Simple Product</strong>. Switch to <strong>Variable Product</strong> in General Details tab to build variants matrix.
              </div>
            ) : (
              <>
                {/* Attribute Matrix Combination Generator */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Select Participating Attributes & Values</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attributes.map((attr) => (
                      <div key={attr.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <span className="font-semibold text-gray-800 text-xs block mb-2">{attr.name}</span>
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
                                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
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
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-medium text-xs rounded-xl transition-all shadow-sm"
                  >
                    Produce Variant Matrix Combinations
                  </button>
                </div>

                {/* Variants List Table */}
                {variants.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Generated Product Variants ({variants.length})</h3>

                    <div className="space-y-2">
                      {variants.map((v, i) => (
                        <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-4 gap-3 items-center">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-mono">Variant #{i + 1}</span>
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
                              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono text-gray-900 shadow-sm"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-500 block">Price ($) *</span>
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
                              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 shadow-sm"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-500 block">Stock *</span>
                            <input
                              type="number"
                              required
                              value={v.stock}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[i].stock = Number(e.target.value);
                                setVariants(updated);
                              }}
                              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 shadow-sm"
                            />
                          </div>

                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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

        <div className="flex items-center justify-end gap-4 pt-5 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl text-sm transition-all shadow-sm"
          >
            {isSaving ? 'Saving Product...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

