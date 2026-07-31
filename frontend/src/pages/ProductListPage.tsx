import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, Tag, Layers, Image as ImageIcon } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  hasVariants: boolean;
  price?: number;
  salePrice?: number;
  stock?: number;
  stockStatus?: string;
  priceRange?: string;
  isActive: boolean;
  thumbnail?: { publicUrl: string };
  brand?: Brand;
  categories?: Array<{ category: Category }>;
  variants?: any[];
}

export const ProductListPage: React.FC = () => {
  const { hasPermission } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setForbiddenError(null);
    try {
      const queryParams = new URLSearchParams();
      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (categoryFilter) queryParams.append('categoryId', categoryFilter);
      if (brandFilter) queryParams.append('brandId', brandFilter);
      if (statusFilter) queryParams.append('status', statusFilter);
      queryParams.append('page', page.toString());
      queryParams.append('limit', '10');

      const [prodRes, catRes, brandRes]: any = await Promise.all([
        api.get(`/product?${queryParams.toString()}`),
        api.get('/category?limit=100'),
        api.get('/brand?limit=100'),
      ]);

      setProducts(prodRes.products || []);
      setTotalPages(prodRes.meta?.totalPages || 1);
      setCategories(catRes.categories || []);
      setBrands(brandRes.brands || []);
    } catch (err: any) {
      if (err.status === 403) {
        setForbiddenError(err.message || 'Access Forbidden: 403.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, categoryFilter, brandFilter, statusFilter, page]);

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete product '${name}'?`)) return;
    try {
      await api.delete(`/product/${id}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
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
            <Package className="w-6 h-6 text-emerald-400" />
            Product Catalog
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, filter, and manage simple and variable products.
          </p>
        </div>

        {hasPermission('product:create') && (
          <Link
            to="/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </Link>
        )}
      </div>

      {/* Search and Filters Served by API */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      {/* Paginated Product Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading products from API...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Thumbnail & Product</th>
                  <th className="px-6 py-4 font-semibold">Brand</th>
                  <th className="px-6 py-4 font-semibold">Categories</th>
                  <th className="px-6 py-4 font-semibold">Price / Range</th>
                  <th className="px-6 py-4 font-semibold">Type & Stock</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                          {p.thumbnail ? (
                            <img src={p.thumbnail.publicUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-100">{p.name}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            SKU: {p.sku || (p.hasVariants ? 'Variants SKU' : 'N/A')}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {p.brand ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-950 text-indigo-400 border border-slate-800 font-medium">
                          <Tag className="w-3 h-3" /> {p.brand.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-xs">No brand</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {p.categories && p.categories.length > 0 ? (
                          p.categories.map((c) => (
                            <span key={c.category.id} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              {c.category.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic text-xs">Uncategorized</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-emerald-400 font-mono">
                      {p.priceRange}
                    </td>

                    <td className="px-6 py-4">
                      {p.hasVariants ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                          <Layers className="w-3 h-3" /> Variable ({p.variants?.length || 0} variants)
                        </span>
                      ) : (
                        <div className="text-xs">
                          <span className="text-slate-300 font-medium">Simple Product</span>
                          <p className="text-slate-500">Stock: {p.stock || 0}</p>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission('product:update') && (
                          <Link
                            to={`/products/edit/${p.id}`}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                        )}
                        {hasPermission('product:delete') && (
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
